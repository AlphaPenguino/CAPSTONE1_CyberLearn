import express from "express";
import CyberQuest from "../models/CyberQuest.js";
import Section from "../models/Section.js";
import UserLevel from "../models/UserLevel.js";
import { protectRoute, authorizeRole } from "../middleware/auth.middleware.js";
import {
  logActivity,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  extractRequestInfo,
} from "../lib/auditLogger.js";
import mongoose from "mongoose";
// Ensure game completion tracking is available for cyber quests
import { trackGameCompletion } from "../middleware/analytics.middleware.js";

const router = express.Router();

const DEFAULT_QUEST_COUNTDOWN_SECONDS = 300;
const MIN_QUEST_COUNTDOWN_SECONDS = 30;
const MAX_QUEST_COUNTDOWN_SECONDS = 3600;

const normalizeCountdownSeconds = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_QUEST_COUNTDOWN_SECONDS;
  }
  return Math.max(
    MIN_QUEST_COUNTDOWN_SECONDS,
    Math.min(MAX_QUEST_COUNTDOWN_SECONDS, Math.round(parsed))
  );
};

/**
 * @route   GET /api/all-cyber-quests
 * @desc    Get all cyber quests from all sections (for instructors/admins)
 * @access  Private (Instructor/Admin only)
 */
router.get(
  "/all-cyber-quests",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      // Get all active sections with their cyber quests
      const sections = await Section.find({ isActive: true })
        .select("_id name description sectionCode")
        .sort({ name: 1 });

      const allCyberQuests = [];

      for (const section of sections) {
        const cyberQuests = await CyberQuest.findBySection(section._id);

        // Add section info to each cyber quest
        const questsWithSection = cyberQuests.map((quest) => ({
          ...quest.toObject(),
          section: {
            _id: section._id,
            name: section.name,
            sectionCode: section.sectionCode,
          },
        }));

        allCyberQuests.push(...questsWithSection);
      }

      res.json({
        success: true,
        cyberQuests: allCyberQuests,
        totalSections: sections.length,
        totalCyberQuests: allCyberQuests.length,
      });
    } catch (error) {
      console.error("Error fetching all cyber quests:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch cyber quests from all sections",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/all-cyber-quests-progress
 * @desc    Get cyber quest progress from all sections (for instructors/admins)
 * @access  Private (Instructor/Admin only)
 */
router.get(
  "/all-cyber-quests-progress",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      // Get all active sections
      const sections = await Section.find({ isActive: true })
        .select("_id name description sectionCode")
        .sort({ name: 1 });

      const allSectionProgress = [];

      // Get user's progress
      const Progress = await import("../models/Progress.js").then(
        (module) => module.default
      );
      const progress = await Progress.findOne({ user: req.user.id });

      if (progress) {
        for (const section of sections) {
          const sectionProgress =
            await progress.getCyberQuestProgressForSection(section._id);

          allSectionProgress.push({
            section: {
              _id: section._id,
              name: section.name,
              sectionCode: section.sectionCode,
            },
            progress: sectionProgress,
          });
        }
      }

      res.json({
        success: true,
        sectionsProgress: allSectionProgress,
        totalSections: sections.length,
      });

      // Log CyberQuest map access
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.privilege,
        action: AUDIT_ACTIONS.CYBERQUEST_ACCESS,
        resource: AUDIT_RESOURCES.CYBERQUEST,
        details: {
          accessType: "cyberquest_map",
          sectionsCount: sections.length,
          hasProgress: !!progress,
          userRole: req.user.privilege,
        },
        ...requestInfo,
      });
    } catch (error) {
      console.error("Error fetching all sections progress:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch progress from all sections",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/quickplay/questions
 * @desc    Get randomized questions from active Cyber Quests the user can access.
 *          - students: enrolled subjects
 *          - instructors: handled subjects
 *          - admins: all active subjects
 * @query   limit (optional) number of questions to return (default 10, max 25)
 * @access  Private (any authenticated user)
 */
router.get("/quickplay/questions", protectRoute, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 25);
    const userId = req.user.id;
    const userRole = req.user.privilege;

    const baseSubjectFilter = {
      isActive: { $ne: false },
      archived: { $ne: true },
    };

    let subjectAccessFilter = baseSubjectFilter;
    if (userRole === "student") {
      subjectAccessFilter = {
        ...baseSubjectFilter,
        students: userId,
      };
    } else if (userRole === "instructor") {
      subjectAccessFilter = {
        ...baseSubjectFilter,
        $or: [{ instructor: userId }, { instructors: userId }],
      };
    }

    const accessibleSubjects = await Section.find(subjectAccessFilter).select("_id");
    const accessibleSubjectIds = accessibleSubjects.map((subject) => subject._id);

    if (accessibleSubjectIds.length === 0) {
      return res.json({
        success: true,
        questions: [],
        meta: {
          totalAvailable: 0,
          provided: 0,
          accessibleSubjects: 0,
        },
      });
    }

    // Fetch only required fields to minimize payload
    const quests = await CyberQuest.find({
      isActive: true,
      subject: { $in: accessibleSubjectIds },
      questType: { $ne: "lesson" },
    })
      .select("questions difficulty title")
      .lean();

    const aggregated = [];
    let runningId = 1;

    const isPlaceholderQuestionText = (text = "") => {
      const normalized = String(text).trim().toLowerCase();
      if (!normalized) {
        return true;
      }
      return (
        normalized.includes("lorem ipsum") ||
        normalized.includes("sample question") ||
        normalized.includes("dummy question")
      );
    };

    for (const quest of quests) {
      const questDifficulty = quest.difficulty || "medium";
      (quest.questions || []).forEach((q) => {
        if (isPlaceholderQuestionText(q.text)) {
          return;
        }

        // Each embedded question has no _id (schema _id:false), so assign ephemeral id
        const base = {
          id: runningId++,
          type: q.type || "multipleChoice",
          difficulty: questDifficulty,
          category: quest.title || "Cyber Quest",
        };

        switch (q.type) {
          case "multipleChoice":
            aggregated.push({
              ...base,
              question: q.text,
              options: q.choices || [],
              correctAnswer: q.correct_index, // index (number)
            });
            break;
          case "codeMissing":
            aggregated.push({
              ...base,
              question: q.text,
              codeTemplate: q.codeTemplate,
              correctAnswer: q.correctAnswer,
            });
            break;
          case "fillInBlanks":
            aggregated.push({
              ...base,
              question: q.text,
              blanks: q.blanks || [],
            });
            break;
          case "codeOrdering":
            aggregated.push({
              ...base,
              question: q.text,
              codeBlocks: q.codeBlocks || [],
            });
            break;

          case "sorting":
            aggregated.push({
              ...base,
              question: q.text,
              categories: q.categories || [],
              items: q.items || [],
            });
            break;

          case "cipher":
            aggregated.push({
              ...base,
              question: q.text,
              scrambledHint: q.scrambledHint,
              // Don't include the actual answer in the response
            });
            break;
          default:
            // Skip unknown types gracefully
            break;
        }
      });
    }

    const totalAvailable = aggregated.length;

    // Shuffle
    const shuffled = aggregated.sort(() => Math.random() - 0.5).slice(0, limit);

    res.json({
      success: true,
      questions: shuffled,
      meta: {
        totalAvailable,
        provided: shuffled.length,
        accessibleSubjects: accessibleSubjectIds.length,
      },
    });
  } catch (error) {
    console.error("Error generating quickplay questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load quick play questions",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/cyber-quests/:id
 * @desc    Get a specific cyber quest by ID
 * @access  Private
 */
router.get("/cyber-quests/:id", protectRoute, async (req, res) => {
  try {
    const { id: questId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(questId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cyber quest ID",
      });
    }

    const cyberQuest = await CyberQuest.findById(questId);
    if (!cyberQuest) {
      return res.status(404).json({
        success: false,
        message: "Cyber quest not found",
      });
    }

    res.json({
      success: true,
      cyberQuest,
    });


    const requestInfo = extractRequestInfo(req);
    await logActivity({
      userId: req.user.id,
      username: req.user.username,
      userRole: req.user.privilege,
      action: AUDIT_ACTIONS.CYBERQUEST_ACCESS,
      resource: AUDIT_RESOURCES.CYBERQUEST,
      resourceId: cyberQuest._id,
      details: {
        accessType: "cyberquest_open",
        questTitle: cyberQuest.title,
        questLevel: cyberQuest.level,
        difficulty: cyberQuest.difficulty,
      },
      ...requestInfo,
    });
  } catch (error) {
    console.error("Error fetching cyber quest:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * @route   GET /api/sections/:id/cyber-quests
 * @desc    Get all cyber quests for a specific subject (legacy route path uses sections)
 * @access  Private (Students can access their section's cyber quests, Instructors can access their created sections)
 */
router.get("/sections/:id/cyber-quests", protectRoute, async (req, res) => {
  try {
    const { id: sectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section ID",
      });
    }

    // Verify section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    // Check if user has access to this section
    let hasAccess = false;

    let accessReason = null;

    if (req.user.privilege === "instructor" || req.user.privilege === "admin") {
      // Instructors and admins can access all sections
      hasAccess = true;
      accessReason = "role:instructor/admin";
    } else {
      // Students can access sections they're assigned to
      const User = await import("../models/Users.js").then(
        (module) => module.default
      );
      const user = await User.findById(req.user.id).select("section");

      // Check access by user.section field matching either section.sectionCode or section.name
      // This handles both old data (where users have section.name) and new data (where users have section.sectionCode)
      if (
        user &&
        user.section &&
        user.section !== "no_section" &&
        (section.sectionCode === user.section || section.name === user.section)
      ) {
        hasAccess = true;
        accessReason = "legacy:single-section-match";
      }

      // Also check if user is in the section's students array (fallback)
      if (
        !hasAccess &&
        section.students.some(
          (studentId) => studentId.toString() === req.user.id
        )
      ) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this section",
      });
    }

    // Get cyber quests for this section
    const cyberQuests = await CyberQuest.findBySection(sectionId);

    res.json({
      success: true,
      cyberQuests,
      section: {
        _id: section._id,
        name: section.name,
        sectionCode: section.sectionCode,
      },
    });
  } catch (error) {
    console.error("Error fetching cyber quests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cyber quests",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/sections/:id/cyber-quests
 * @desc    Create a new cyber quest for a subject (legacy route path uses sections)
 * @access  Private (Instructor/Admin)
 */
router.post(
  "/sections/:id/cyber-quests",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { id: sectionId } = req.params;
      const {
        title,
        description,
        questions,
        lessons,
        questType,
        countdownSeconds,
        level,
        subject,
      } = req.body;

      // Resolve subjectId from either legacy path param (sectionId) or body.subject
      const subjectId = subject || sectionId;

      // Debug: trace incoming values
      console.log("[CQ Create] Params sectionId:", sectionId);
      console.log("[CQ Create] Body subject:", subject);
      console.log("[CQ Create] Using subjectId:", subjectId);

      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid subject/section ID",
        });
      }

      // Verify section exists
      const section = await Section.findById(subjectId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: "Section not found",
        });
      }

      const normalizedQuestType = questType === "lesson" ? "lesson" : "quiz";

      // Validate required fields
      if (!title) {
        return res.status(400).json({
          success: false,
          message: "Title is required",
        });
      }

      // Validate level
      const questLevel = level || 1;
      if (
        typeof questLevel !== "number" ||
        questLevel < 1 ||
        questLevel > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Level must be a number between 1 and 100",
        });
      }

      const questCountdownSeconds = normalizeCountdownSeconds(countdownSeconds);

      const normalizedQuestions = Array.isArray(questions) ? questions : [];
      const normalizedLessons = Array.isArray(lessons) ? lessons : [];

      if (normalizedQuestType === "quiz") {
        // Validate questions count
        if (normalizedQuestions.length < 1 || normalizedQuestions.length > 50) {
          return res.status(400).json({
            success: false,
            message: "Must provide between 1 and 50 questions",
          });
        }

        // Validate each question
        for (let i = 0; i < normalizedQuestions.length; i++) {
          const question = normalizedQuestions[i];

        if (!question.text || question.text.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: `Question ${i + 1}: Text is required`,
          });
        }

        // Type-specific validation
        if (!question.type) {
          question.type = "multipleChoice"; // Default to multiple choice
        }

        switch (question.type) {
          case "multipleChoice":
            if (
              !Array.isArray(question.choices) ||
              question.choices.length < 1 ||
              question.choices.length > 10
            ) {
              return res.status(400).json({
                success: false,
                message: `Question ${
                  i + 1
                }: Multiple choice must have between 1 and 10 answer choices`,
              });
            }

            if (
              typeof question.correct_index !== "number" ||
              question.correct_index < 0 ||
              question.correct_index >= question.choices.length
            ) {
              return res.status(400).json({
                success: false,
                message: `Question ${i + 1}: Invalid correct answer index`,
              });
            }

            // Validate each choice is not empty
            for (let j = 0; j < question.choices.length; j++) {
              if (
                !question.choices[j] ||
                question.choices[j].trim().length === 0
              ) {
                return res.status(400).json({
                  success: false,
                  message: `Question ${i + 1}, Choice ${
                    j + 1
                  }: Cannot be empty`,
                });
              }
            }
            break;

          case "codeMissing":
            if (
              !question.codeTemplate ||
              question.codeTemplate.trim().length === 0
            ) {
              return res.status(400).json({
                success: false,
                message: `Question ${i + 1}: Code template is required`,
              });
            }
            if (
              !question.correctAnswer ||
              question.correctAnswer.trim().length === 0
            ) {
              return res.status(400).json({
                success: false,
                message: `Question ${i + 1}: Correct answer is required`,
              });
            }
            break;

          case "fillInBlanks":
            if (!Array.isArray(question.blanks) || question.blanks.length < 1) {
              return res.status(400).json({
                success: false,
                message: `Question ${i + 1}: At least one blank is required`,
              });
            }
            for (let j = 0; j < question.blanks.length; j++) {
              if (
                !question.blanks[j] ||
                question.blanks[j].trim().length === 0
              ) {
                return res.status(400).json({
                  success: false,
                  message: `Question ${i + 1}, Blank ${j + 1}: Cannot be empty`,
                });
              }
            }
            break;

          case "codeOrdering":
            if (
              !Array.isArray(question.codeBlocks) ||
              question.codeBlocks.length < 3
            ) {
              return res.status(400).json({
                success: false,
                message: `Question ${
                  i + 1
                }: At least 3 code blocks are required`,
              });
            }
            for (let j = 0; j < question.codeBlocks.length; j++) {
              const block = question.codeBlocks[j];
              if (!block.code || block.code.trim().length === 0) {
                return res.status(400).json({
                  success: false,
                  message: `Question ${i + 1}, Code block ${
                    j + 1
                  }: Cannot be empty`,
                });
              }
            }
            break;

          case "sorting":
            if (
              !Array.isArray(question.categories) ||
              question.categories.length < 2
            ) {
              return res.status(400).json({
                success: false,
                message: `Question ${
                  i + 1
                }: At least 2 categories are required`,
              });
            }

            for (let j = 0; j < question.categories.length; j++) {
              if (
                !question.categories[j] ||
                question.categories[j].trim().length === 0
              ) {
                return res.status(400).json({
                  success: false,
                  message: `Question ${i + 1}, Category ${
                    j + 1
                  }: Cannot be empty`,
                });
              }
            }

            if (!Array.isArray(question.items) || question.items.length < 2) {
              return res.status(400).json({
                success: false,
                message: `Question ${i + 1}: At least 2 items are required`,
              });
            }

            for (let j = 0; j < question.items.length; j++) {
              const item = question.items[j];
              if (!item.text || item.text.trim().length === 0) {
                return res.status(400).json({
                  success: false,
                  message: `Question ${i + 1}, Item ${j + 1}: Cannot be empty`,
                });
              }

              if (
                item.categoryId < 0 ||
                item.categoryId >= question.categories.length
              ) {
                return res.status(400).json({
                  success: false,
                  message: `Question ${i + 1}, Item ${
                    j + 1
                  }: Invalid category ID`,
                });
              }
            }
            break;

          case "cipher":
            if (!question.answer || question.answer.trim().length === 0) {
              return res.status(400).json({
                success: false,
                message: `Question ${i + 1}: Answer is required`,
              });
            }

            if (
              !question.scrambledHint ||
              question.scrambledHint.trim().length === 0
            ) {
              return res.status(400).json({
                success: false,
                message: `Question ${i + 1}: Scrambled hint is required`,
              });
            }
            break;

          default:
            return res.status(400).json({
              success: false,
              message: `Question ${i + 1}: Unknown question type "${
                question.type
              }"`,
            });
        }

        // Generic hint: ensure it is a string and not too long if provided
        if (question.hint !== undefined && question.hint !== null) {
          if (typeof question.hint !== "string") {
            return res.status(400).json({
              success: false,
              message: `Question ${i + 1}: Hint must be a string`,
            });
          }
          if (question.hint.length > 200) {
            return res.status(400).json({
              success: false,
              message: `Question ${i + 1}: Hint cannot exceed 200 characters`,
            });
          }
          // Normalize trimming
          question.hint = question.hint.trim();
        } else {
          // Ensure field exists for consistency
          question.hint = "";
        }
        }
      } else {
        if (normalizedLessons.length < 1 || normalizedLessons.length > 100) {
          return res.status(400).json({
            success: false,
            message: "Lesson quests must have between 1 and 100 lessons",
          });
        }

        for (let i = 0; i < normalizedLessons.length; i++) {
          const lesson = normalizedLessons[i];
          if (!lesson?.title || !lesson.title.trim()) {
            return res.status(400).json({
              success: false,
              message: `Lesson ${i + 1}: Title is required`,
            });
          }
          if (!lesson?.body || !lesson.body.trim()) {
            return res.status(400).json({
              success: false,
              message: `Lesson ${i + 1}: Body is required`,
            });
          }

          const mediaType = lesson.mediaType || "none";
          if (
            (mediaType === "image" || mediaType === "video") &&
            (!lesson.mediaUrl || !lesson.mediaUrl.trim())
          ) {
            return res.status(400).json({
              success: false,
              message: `Lesson ${i + 1}: Media URL is required for ${mediaType}`,
            });
          }
        }
      }

      // Create the cyber quest
      const cyberQuest = new CyberQuest({
        title: title.trim(),
        description: description ? description.trim() : "",
        subject: subjectId,
        questType: normalizedQuestType,
        questions: normalizedQuestType === "quiz" ? normalizedQuestions : [],
        lessons:
          normalizedQuestType === "lesson"
            ? normalizedLessons.map((lesson) => ({
                title: lesson.title.trim(),
                subheading: lesson.subheading ? lesson.subheading.trim() : "",
                body: lesson.body.trim(),
                mediaType: lesson.mediaType || "none",
                mediaUrl: lesson.mediaUrl ? lesson.mediaUrl.trim() : "",
              }))
            : [],
        created_by: req.user.id,
        countdownSeconds: questCountdownSeconds,
        level: questLevel,
      });

      // Debug: ensure subject is set before save
      console.log("[CQ Create] New CQ subject field:", cyberQuest.subject);

      // Additional validation using the model's method
      const validationErrors =
        normalizedQuestType === "lesson"
          ? cyberQuest.validateLessons()
          : cyberQuest.validateQuestions();
      if (validationErrors) {
        return res.status(400).json({
          success: false,
          message:
            normalizedQuestType === "lesson"
              ? "Lesson validation failed"
              : "Question validation failed",
          errors: validationErrors,
        });
      }

      await cyberQuest.save();

      // Populate the saved quest
      await cyberQuest.populate("created_by", "username fullName");
      await cyberQuest.populate("subject", "name sectionCode");

      res.status(201).json({
        success: true,
        message: "Cyber Quest created successfully",
        cyberQuest,
      });
    } catch (error) {
      console.error("Error creating cyber quest:", error);

      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: Object.values(error.errors).map((err) => err.message),
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create cyber quest",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/cyber-quests/:id
 * @desc    Get a single cyber quest by ID
 * @access  Private (Instructor/Admin)
 */
router.get(
  "/cyber-quests/:id",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid cyber quest ID",
        });
      }

      const cyberQuest = await CyberQuest.findById(id)
        .populate("created_by", "username fullName")
        .populate("subject", "name sectionCode");

      if (!cyberQuest) {
        return res.status(404).json({
          success: false,
          message: "Cyber Quest not found",
        });
      }

      res.json({
        success: true,
        cyberQuest,
      });
    } catch (error) {
      console.error("Error fetching cyber quest:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch cyber quest",
        error: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/cyber-quests/:id
 * @desc    Update a cyber quest
 * @access  Private (Instructor/Admin)
 */
router.put(
  "/cyber-quests/:id",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        questions,
        lessons,
        questType,
        countdownSeconds,
        level,
        subject,
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid cyber quest ID",
        });
      }

      const cyberQuest = await CyberQuest.findById(id);
      if (!cyberQuest) {
        return res.status(404).json({
          success: false,
          message: "Cyber Quest not found",
        }); 
      }

      // Check if user owns this quest or is admin
      console.log("Auth Debug:", {
        questCreatedBy: cyberQuest.created_by.toString(),
        userId: req.user.id.toString(),
        userPrivilege: req.user.privilege,
        match: cyberQuest.created_by.toString() === req.user.id.toString(),
      });

      if (
        cyberQuest.created_by.toString() !== req.user.id.toString() &&
        req.user.privilege !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this cyber quest",
        });
      }

      // Validate and update fields if provided
      if (title) {
        cyberQuest.title = title.trim();
      }

      if (description !== undefined) {
        cyberQuest.description = description.trim();
      }

      if (questType !== undefined) {
        if (questType !== "quiz" && questType !== "lesson") {
          return res.status(400).json({
            success: false,
            message: "questType must be either 'quiz' or 'lesson'",
          });
        }
        cyberQuest.questType = questType;
      }

      if (level !== undefined) {
        if (typeof level !== "number" || level < 1 || level > 100) {
          return res.status(400).json({
            success: false,
            message: "Level must be a number between 1 and 100",
          });
        }
        cyberQuest.level = level;
      }

      if (countdownSeconds !== undefined) {
        const parsedCountdown = Number(countdownSeconds);
        if (
          !Number.isFinite(parsedCountdown) ||
          parsedCountdown < MIN_QUEST_COUNTDOWN_SECONDS ||
          parsedCountdown > MAX_QUEST_COUNTDOWN_SECONDS
        ) {
          return res.status(400).json({
            success: false,
            message: "Countdown timer must be between 30 and 3600 seconds",
          });
        }
        cyberQuest.countdownSeconds = Math.round(parsedCountdown);
      }

      if (cyberQuest.questType === "quiz" && questions) {
        // Validate questions count
        if (
          !Array.isArray(questions) ||
          questions.length < 1 ||
          questions.length > 50
        ) {
          return res.status(400).json({
            success: false,
            message: "Must provide between 1 and 50 questions",
          });
        }

        // Validate each question (same validation as create)
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];

          if (!question.text || question.text.trim().length === 0) {
            return res.status(400).json({
              success: false,
              message: `Question ${i + 1}: Text is required`,
            });
          }

          // Type-specific validation
          if (!question.type) {
            question.type = "multipleChoice"; // Default to multiple choice
          }

          switch (question.type) {
            case "multipleChoice":
              if (
                !Array.isArray(question.choices) ||
                question.choices.length < 1 ||
                question.choices.length > 10
              ) {
                return res.status(400).json({
                  success: false,
                  message: `Question ${
                    i + 1
                  }: Multiple choice must have between 1 and 10 answer choices`,
                });
              }

              if (
                typeof question.correct_index !== "number" ||
                question.correct_index < 0 ||
                question.correct_index >= question.choices.length
              ) {
                return res.status(400).json({
                  success: false,
                  message: `Question ${i + 1}: Invalid correct answer index`,
                });
              }

              // Validate each choice is not empty
              for (let j = 0; j < question.choices.length; j++) {
                if (
                  !question.choices[j] ||
                  question.choices[j].trim().length === 0
                ) {
                  return res.status(400).json({
                    success: false,
                    message: `Question ${i + 1}, Choice ${
                      j + 1
                    }: Cannot be empty`,
                  });
                }
              }
              break;

            case "codeMissing":
              if (
                !question.codeTemplate ||
                question.codeTemplate.trim().length === 0
              ) {
                return res.status(400).json({
                  success: false,
                  message: `Question ${i + 1}: Code template is required`,
                });
              }
              if (
                !question.correctAnswer ||
                question.correctAnswer.trim().length === 0
              ) {
                return res.status(400).json({
                  success: false,
                  message: `Question ${i + 1}: Correct answer is required`,
                });
              }
              break;

            case "fillInBlanks":
              if (
                !Array.isArray(question.blanks) ||
                question.blanks.length < 1
              ) {
                return res.status(400).json({
                  success: false,
                  message: `Question ${i + 1}: At least one blank is required`,
                });
              }
              for (let j = 0; j < question.blanks.length; j++) {
                if (
                  !question.blanks[j] ||
                  question.blanks[j].trim().length === 0
                ) {
                  return res.status(400).json({
                    success: false,
                    message: `Question ${i + 1}, Blank ${
                      j + 1
                    }: Cannot be empty`,
                  });
                }
              }
              break;

            case "codeOrdering":
              if (
                !Array.isArray(question.codeBlocks) ||
                question.codeBlocks.length < 3
              ) {
                return res.status(400).json({
                  success: false,
                  message: `Question ${
                    i + 1
                  }: At least 3 code blocks are required`,
                });
              }
              for (let j = 0; j < question.codeBlocks.length; j++) {
                const block = question.codeBlocks[j];
                if (!block.code || block.code.trim().length === 0) {
                  return res.status(400).json({
                    success: false,
                    message: `Question ${i + 1}, Code block ${
                      j + 1
                    }: Cannot be empty`,
                  });
                }
              }
              break;

            case "sorting":
              if (
                !Array.isArray(question.categories) ||
                question.categories.length < 2
              ) {
                return res.status(400).json({
                  success: false,
                  message: `Question ${
                    i + 1
                  }: At least 2 categories are required`,
                });
              }

              for (let j = 0; j < question.categories.length; j++) {
                if (
                  !question.categories[j] ||
                  question.categories[j].trim().length === 0
                ) {
                  return res.status(400).json({
                    success: false,
                    message: `Question ${i + 1}, Category ${
                      j + 1
                    }: Cannot be empty`,
                  });
                }
              }

              if (!Array.isArray(question.items) || question.items.length < 2) {
                return res.status(400).json({
                  success: false,
                  message: `Question ${i + 1}: At least 2 items are required`,
                });
              }

              for (let j = 0; j < question.items.length; j++) {
                const item = question.items[j];
                if (!item.text || item.text.trim().length === 0) {
                  return res.status(400).json({
                    success: false,
                    message: `Question ${i + 1}, Item ${
                      j + 1
                    }: Cannot be empty`,
                  });
                }

                if (
                  item.categoryId < 0 ||
                  item.categoryId >= question.categories.length
                ) {
                  return res.status(400).json({
                    success: false,
                    message: `Question ${i + 1}, Item ${
                      j + 1
                    }: Invalid category ID`,
                  });
                }
              }
              break;

            case "cipher":
              if (!question.answer || question.answer.trim().length === 0) {
                return res.status(400).json({
                  success: false,
                  message: `Question ${i + 1}: Answer is required`,
                });
              }

              if (
                !question.scrambledHint ||
                question.scrambledHint.trim().length === 0
              ) {
                return res.status(400).json({
                  success: false,
                  message: `Question ${i + 1}: Scrambled hint is required`,
                });
              }
              break;

            default:
              return res.status(400).json({
                success: false,
                message: `Question ${i + 1}: Unknown question type "${
                  question.type
                }"`,
              });
          }
        }

        cyberQuest.questions = questions;
      }

      if (cyberQuest.questType === "lesson") {
        const normalizedLessons = Array.isArray(lessons) ? lessons : cyberQuest.lessons;

        if (!Array.isArray(normalizedLessons) || normalizedLessons.length < 1 || normalizedLessons.length > 100) {
          return res.status(400).json({
            success: false,
            message: "Lesson quests must have between 1 and 100 lessons",
          });
        }

        for (let i = 0; i < normalizedLessons.length; i++) {
          const lesson = normalizedLessons[i];
          if (!lesson?.title || !lesson.title.trim()) {
            return res.status(400).json({
              success: false,
              message: `Lesson ${i + 1}: Title is required`,
            });
          }
          if (!lesson?.body || !lesson.body.trim()) {
            return res.status(400).json({
              success: false,
              message: `Lesson ${i + 1}: Body is required`,
            });
          }

          const mediaType = lesson.mediaType || "none";
          if (
            (mediaType === "image" || mediaType === "video") &&
            (!lesson.mediaUrl || !lesson.mediaUrl.trim())
          ) {
            return res.status(400).json({
              success: false,
              message: `Lesson ${i + 1}: Media URL is required for ${mediaType}`,
            });
          }
        }

        cyberQuest.lessons = normalizedLessons.map((lesson) => ({
          title: lesson.title.trim(),
          subheading: lesson.subheading ? lesson.subheading.trim() : "",
          body: lesson.body.trim(),
          mediaType: lesson.mediaType || "none",
          mediaUrl: lesson.mediaUrl ? lesson.mediaUrl.trim() : "",
        }));
        cyberQuest.questions = [];
      } else if (questions !== undefined) {
        cyberQuest.lessons = [];
      }

      // Handle legacy docs missing subject: allow updating subject from body
      if (!cyberQuest.subject && subject) {
        if (!mongoose.Types.ObjectId.isValid(subject)) {
          return res.status(400).json({
            success: false,
            message: "Invalid subject ID",
          });
        }
        // Verify subject exists
        const exists = await Section.findById(subject).select("_id");
        if (!exists) {
          return res.status(404).json({
            success: false,
            message: "Subject not found",
          });
        }
        cyberQuest.subject = subject;
      }

      if (!cyberQuest.subject) {
        return res.status(400).json({
          success: false,
          message:
            "Subject is required on the cyber quest. Provide 'subject' in the request body to set it.",
        });
      }

      // Additional validation using the model's method
      const validationErrors =
        cyberQuest.questType === "lesson"
          ? cyberQuest.validateLessons()
          : cyberQuest.validateQuestions();
      if (validationErrors) {
        return res.status(400).json({
          success: false,
          message:
            cyberQuest.questType === "lesson"
              ? "Lesson validation failed"
              : "Question validation failed",
          errors: validationErrors,
        });
      }

      await cyberQuest.save();

      // Populate and return updated quest
      await cyberQuest.populate("created_by", "username fullName");
      await cyberQuest.populate("subject", "name sectionCode");

      res.json({
        success: true,
        message: "Cyber Quest updated successfully",
        cyberQuest,
      });
    } catch (error) {
      console.error("Error updating cyber quest:", error);

      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: Object.values(error.errors).map((err) => err.message),
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to update cyber quest",
        error: error.message,
      });
    }
  }
);

/**
 * @route   DELETE /api/cyber-quests/:id
 * @desc    Delete a cyber quest
 * @access  Private (Instructor/Admin)
 */
router.delete(
  "/cyber-quests/:id",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid cyber quest ID",
        });
      }

      const cyberQuest = await CyberQuest.findById(id);
      if (!cyberQuest) {
        return res.status(404).json({
          success: false,
          message: "Cyber Quest not found",
        });
      }

      // Check if user owns this quest or is admin
      console.log("Delete Auth Debug:", {
        questCreatedBy: cyberQuest.created_by.toString(),
        userId: req.user.id.toString(),
        userPrivilege: req.user.privilege,
        match: cyberQuest.created_by.toString() === req.user.id.toString(),
      });

      if (
        cyberQuest.created_by.toString() !== req.user.id.toString() &&
        req.user.privilege !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete this cyber quest",
        });
      }

      await CyberQuest.findByIdAndDelete(id);

      res.json({
        success: true,
        message: "Cyber Quest deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting cyber quest:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete cyber quest",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/cyber-quests/instructor/my-quests
 * @desc    Get all cyber quests created by the current instructor
 * @access  Private (Instructor/Admin)
 */
router.get(
  "/cyber-quests/instructor/my-quests",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const cyberQuests = await CyberQuest.findByInstructor(req.user.id);

      res.json({
        success: true,
        cyberQuests,
      });
    } catch (error) {
      console.error("Error fetching instructor's cyber quests:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch your cyber quests",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/cyber-quests/:id/submit
 * @desc    Submit a cyber quest attempt
 * @access  Private (Students)
 */
router.post(
  "/cyber-quests/:id/submit",
  protectRoute,
  trackGameCompletion("cyberQuest"),
  async (req, res) => {
    console.log("=== Cyber Quest Submit Debug ===");
    console.log("Quest ID:", req.params.id);
    console.log("User ID:", req.user?.id);
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    try {
      const { id: questId } = req.params;
      const { answers = [], timeLeftSeconds } = req.body;

      console.log("Step 1: Validating quest ID");
      if (!mongoose.Types.ObjectId.isValid(questId)) {
        console.log("Invalid quest ID");
        return res.status(400).json({
          success: false,
          message: "Invalid cyber quest ID",
        });
      }

      console.log("Step 2: Fetching cyber quest from database");
      // Get the cyber quest
      const cyberQuest = await CyberQuest.findById(questId);
      console.log("CyberQuest found:", cyberQuest ? "YES" : "NO");
      if (cyberQuest) {
        console.log("CyberQuest details:", {
          id: cyberQuest._id,
          title: cyberQuest.title,
          questionCount: cyberQuest.questions?.length,
          subjectId: cyberQuest.subject,
        });
      }

      if (!cyberQuest) {
        console.log("Cyber quest not found in database");
        return res.status(404).json({
          success: false,
          message: "Cyber quest not found",
        });
      }

      // Verify user has access to this cyber quest's section
      const section = await Section.findById(cyberQuest.subject);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: "Section not found",
        });
      }

      // Check if user has access to this cyber quest's section/subject
      let hasAccess = false;
      let accessReason = null;
      let user = null; // Declare user variable in outer scope

      console.log("Step 3: Checking user access to cyber quest");
      console.log("Section/Subject details:", {
        id: section._id?.toString(),
        name: section.name,
        sectionCode: section.sectionCode,
        subjectCode: section.subjectCode,
        studentsCount: section.students ? section.students.length : 0,
      });

      if (
        req.user.privilege === "instructor" ||
        req.user.privilege === "admin"
      ) {
        // Instructors and admins can access all sections
        hasAccess = true;
        accessReason = "role:instructor/admin";
        console.log("Access granted: User is instructor/admin");
      } else {
        // Students can access sections they're assigned to
        const User = await import("../models/Users.js").then(
          (module) => module.default
        );
        user = await User.findById(req.user.id).select(
          "section sections currentSection privilege"
        );

        console.log("User assignment details:", {
          userId: req.user.id,
          section: user?.section,
          sections: user?.sections,
          currentSection: user?.currentSection,
        });

        // 1) Legacy single-section string match (either name or sectionCode)
        if (
          user &&
          user.section &&
          user.section !== "no_section" &&
          (section.sectionCode === user.section ||
            section.name === user.section)
        ) {
          hasAccess = true;
          accessReason = "legacy:single-section-match";
          console.log("Access granted: Legacy single section match");
        }

        // 2) New multi-subject assignment via `sections` array (stores sectionCode)
        if (
          !hasAccess &&
          user &&
          Array.isArray(user.sections) &&
          user.sections.includes(section.sectionCode)
        ) {
          hasAccess = true;
          accessReason = "multi:sections-array";
          console.log("Access granted: Multi-sections array match");
        }

        // 3) Check against subjectCode as well (for migrated subjects)
        if (
          !hasAccess &&
          user &&
          section.subjectCode &&
          Array.isArray(user.sections) &&
          user.sections.includes(section.subjectCode)
        ) {
          hasAccess = true;
          accessReason = "multi:sections-array-subject-code";
          console.log(
            "Access granted: Multi-sections array subject code match"
          );
        }

        // 4) Respect user's explicitly selected/current section when present
        if (
          !hasAccess &&
          user &&
          user.currentSection &&
          (user.currentSection === section.sectionCode ||
            user.currentSection === section.name ||
            (section.subjectCode &&
              user.currentSection === section.subjectCode))
        ) {
          hasAccess = true;
          accessReason = "currentSection:match";
          console.log("Access granted: Current section match");
        }

        // 5) Fallback: ensure membership in section's students array
        if (
          !hasAccess &&
          Array.isArray(section.students) &&
          section.students.some(
            (studentId) => studentId.toString() === req.user.id
          )
        ) {
          hasAccess = true;
          accessReason = "membership:students-array";
          console.log("Access granted: Direct membership in students array");
        }

        // 6) Additional fallback: Check if user.section matches any identifier for this section
        if (
          !hasAccess &&
          user &&
          user.section &&
          user.section !== "no_section" &&
          section.subjectCode &&
          user.section === section.subjectCode
        ) {
          hasAccess = true;
          accessReason = "legacy:subject-code-match";
          console.log("Access granted: Legacy subject code match");
        }

        // 7) Auto-assignment fallback: If user has no section assignments, check for a default section
        if (
          !hasAccess &&
          user &&
          (!user.section || user.section === "no_section") &&
          (!user.sections || user.sections.length === 0) &&
          !user.currentSection
        ) {
          console.log(
            "User has no section assignments, checking for auto-assignment..."
          );

          // Try to find any section where this user might belong or a default section
          const defaultSection = await Section.findOne({
            isActive: true,
            $or: [
              { name: { $regex: /default|general|main/i } },
              { sectionCode: { $regex: /default|general|main/i } },
            ],
          });

          if (
            defaultSection &&
            defaultSection._id.toString() === section._id.toString()
          ) {
            hasAccess = true;
            accessReason = "auto:default-section-assignment";
            console.log("Access granted: Auto-assigned to default section");

            // Auto-assign user to this section
            if (!defaultSection.students.includes(req.user.id)) {
              defaultSection.students.push(req.user.id);
              await defaultSection.save();
            }

            // Update user's section assignments
            user.currentSection = defaultSection.sectionCode;
            if (!user.sections) user.sections = [];
            if (!user.sections.includes(defaultSection.sectionCode)) {
              user.sections.push(defaultSection.sectionCode);
            }
            await user.save();

            console.log(
              `Auto-assigned user ${req.user.id} to default section ${defaultSection.name}`
            );
          }
        }

        // 8) Final fallback: If still no access but user is a student, allow access to the first available cyber quest
        // This handles cases where the migration didn't properly assign users to subjects
        if (
          !hasAccess &&
          user &&
          req.user.privilege === "student" &&
          cyberQuest.level === 1 // Only allow access to level 1 quests as fallback
        ) {
          hasAccess = true;
          accessReason = "fallback:level-1-student-access";
          console.log("Access granted: Level 1 fallback access for student");

          // Auto-assign user to this section for future access
          if (!section.students.includes(req.user.id)) {
            section.students.push(req.user.id);
            await section.save();
          }

          // Update user's section assignments
          if (!user.currentSection) {
            user.currentSection = section.sectionCode;
          }
          if (!user.sections) user.sections = [];
          if (!user.sections.includes(section.sectionCode)) {
            user.sections.push(section.sectionCode);
          }
          await user.save();

          console.log(
            `Auto-assigned user ${req.user.id} to section ${section.name} via fallback`
          );
        }
      }

      if (!hasAccess) {
        console.error("=== ACCESS DENIED DEBUG ===");
        console.error("Submit access denied debug:", {
          userId: req.user?.id,
          userPrivilege: req.user?.privilege,
          questId: questId,
          sectionId: section._id?.toString(),
          sectionCode: section.sectionCode,
          sectionName: section.name,
          subjectCode: section.subjectCode,
          userSection: (user && user.section) || null,
          userSections: (user && user.sections) || null,
          currentSection: (user && user.currentSection) || null,
          studentsInSection: section.students
            ? section.students.map((id) => id.toString())
            : [],
          isUserInStudentsArray: section.students
            ? section.students.some((id) => id.toString() === req.user.id)
            : false,
          reason: accessReason,
        });
        console.error("=== END ACCESS DENIED DEBUG ===");
        return res.status(403).json({
          success: false,
          message: "Access denied to this cyber quest",
        });
      }

      console.log("✅ Access granted:", accessReason);

      const isLessonQuest = cyberQuest.questType === "lesson";
      const questCountdownSeconds = normalizeCountdownSeconds(
        cyberQuest.countdownSeconds
      );
      const parsedTimeLeftSeconds = Number(timeLeftSeconds);
      const normalizedTimeLeftSeconds = Number.isFinite(parsedTimeLeftSeconds)
        ? Math.max(0, Math.min(questCountdownSeconds, Math.round(parsedTimeLeftSeconds)))
        : 0;
      const processedAnswers = [];
      let correctCount = 0;

      if (!isLessonQuest) {
        // Validate answers format
        if (!Array.isArray(answers) || answers.length !== cyberQuest.questions.length) {
          return res.status(400).json({
            success: false,
            message: "Invalid answers format",
          });
        }

        // Calculate score and validate answers
        for (let i = 0; i < cyberQuest.questions.length; i++) {
          const question = cyberQuest.questions[i];
          const userAnswer = answers[i];

        let isCorrect = false;
        let processedAnswer = {};

        switch (question.type) {
          case "multipleChoice":
            if (typeof userAnswer.selectedChoiceIndex !== "number") {
              return res.status(400).json({
                success: false,
                message: `Invalid answer format for multiple choice question ${
                  i + 1
                }`,
              });
            }
            isCorrect =
              userAnswer.selectedChoiceIndex === question.correct_index;
            processedAnswer = {
              questionIndex: i,
              type: "multipleChoice",
              selectedChoiceIndex: userAnswer.selectedChoiceIndex,
              isCorrect,
            };
            break;

          case "fillInBlanks":
            if (!userAnswer.answers || typeof userAnswer.answers !== "object") {
              return res.status(400).json({
                success: false,
                message: `Invalid answer format for fill in blanks question ${
                  i + 1
                }`,
              });
            }

            // Check if all blanks are correctly filled
            isCorrect = question.blanks.every((correctAnswer, blankIndex) => {
              const userBlankAnswer = userAnswer.answers[blankIndex];
              return (
                userBlankAnswer &&
                userBlankAnswer.trim().toLowerCase() ===
                  correctAnswer.trim().toLowerCase()
              );
            });

            processedAnswer = {
              questionIndex: i,
              type: "fillInBlanks",
              answers: userAnswer.answers,
              isCorrect,
            };
            break;

          case "codeMissing":
            if (typeof userAnswer.answer !== "string") {
              return res.status(400).json({
                success: false,
                message: `Invalid answer format for code missing question ${
                  i + 1
                }`,
              });
            }

            // Compare the answer with the correct answer (case-insensitive, trim whitespace)
            isCorrect =
              userAnswer.answer.trim().toLowerCase() ===
              question.correctAnswer.trim().toLowerCase();

            processedAnswer = {
              questionIndex: i,
              type: "codeMissing",
              answer: userAnswer.answer,
              isCorrect,
            };
            break;

          case "codeOrdering":
            if (!Array.isArray(userAnswer.orderedBlocks)) {
              return res.status(400).json({
                success: false,
                message: `Invalid answer format for code ordering question ${
                  i + 1
                }`,
              });
            }

            // Check if the order matches the correct sequence
            if (
              userAnswer.orderedBlocks.length === question.codeBlocks.length
            ) {
              // Create the correct order by sorting blocks by position
              const correctOrder = question.codeBlocks
                .sort((a, b) => a.position - b.position)
                .map((block) => block.id);

              // Compare user order with correct order
              isCorrect =
                userAnswer.orderedBlocks.length === correctOrder.length &&
                userAnswer.orderedBlocks.every(
                  (blockId, index) => blockId === correctOrder[index]
                );
            }

            processedAnswer = {
              questionIndex: i,
              type: "codeOrdering",
              orderedBlocks: userAnswer.orderedBlocks,
              isCorrect,
            };
            break;

          case "sorting":
            if (
              !userAnswer.itemPlacements ||
              typeof userAnswer.itemPlacements !== "object"
            ) {
              return res.status(400).json({
                success: false,
                message: `Invalid answer format for sorting question ${i + 1}`,
              });
            }

            // Check if all items are placed in the correct categories
            isCorrect = question.items.every((item) => {
              const userPlacement = userAnswer.itemPlacements[item.id];
              return userPlacement === item.categoryId;
            });

            processedAnswer = {
              questionIndex: i,
              type: "sorting",
              itemPlacements: userAnswer.itemPlacements,
              isCorrect,
            };
            break;

          case "cipher":
            if (typeof userAnswer.answer !== "string") {
              return res.status(400).json({
                success: false,
                message: `Invalid answer format for cipher question ${i + 1}`,
              });
            }

            // Compare the answer with the correct answer (case-insensitive, trim whitespace)
            isCorrect =
              userAnswer.answer.trim().toLowerCase() ===
              question.answer.trim().toLowerCase();

            processedAnswer = {
              questionIndex: i,
              type: "cipher",
              answer: userAnswer.answer,
              isCorrect,
            };
            break;

          default:
            return res.status(400).json({
              success: false,
              message: `Unknown question type for question ${i + 1}`,
            });
        }

          if (isCorrect) correctCount++;
          processedAnswers.push(processedAnswer);
        }
      } else {
        const lessonCount = Array.isArray(cyberQuest.lessons)
          ? cyberQuest.lessons.length
          : 0;
        correctCount = Math.max(lessonCount, 1);
      }

      const totalQuestionUnits = isLessonQuest
        ? Math.max(Array.isArray(cyberQuest.lessons) ? cyberQuest.lessons.length : 0, 1)
        : cyberQuest.questions.length;

      const score = isLessonQuest
        ? 100
        : Math.round((correctCount / cyberQuest.questions.length) * 100);

      // Get or create progress record for quest attempts
      const Progress = await import("../models/Progress.js").then(
        (module) => module.default
      );
      let progress = await Progress.findOne({ user: req.user.id });

      if (!progress) {
        progress = new Progress({
          user: req.user.id,
          globalProgress: {
            unlockedModules: [],
            completedModules: [],
          },
          moduleProgress: [],
          cyberQuestProgress: [],
          quizAttempts: [],
        });
      }

      // Get or create user level record (new dedicated table)
      let userLevel;
      try {
        userLevel = await UserLevel.getOrCreate(
          req.user.id,
          cyberQuest.subject
        );
      } catch (error) {
        console.error("Error getting/creating UserLevel:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to access user level data",
        });
      }

      // Check level prerequisites
      console.log("Checking level prerequisites");
      console.log("Quest level:", cyberQuest.level);
      console.log("Quest prerequisite level:", cyberQuest.prerequisiteLevel);
      console.log("User level info:", {
        currentLevel: userLevel.currentLevel,
        maxLevelReached: userLevel.maxLevelReached,
      });

      // Check if user meets the prerequisite level requirement
      if (
        cyberQuest.prerequisiteLevel &&
        cyberQuest.prerequisiteLevel > userLevel.maxLevelReached
      ) {
        console.warn("Access denied: Prerequisite level not met", {
          questLevel: cyberQuest.level,
          prerequisiteLevel: cyberQuest.prerequisiteLevel,
          userMaxLevel: userLevel.maxLevelReached,
        });
        return res.status(403).json({
          success: false,
          message: `This quest requires completing level ${cyberQuest.prerequisiteLevel} first. Your current max level is ${userLevel.maxLevelReached}.`,
        });
      }

      // For quests above level 1, ensure user has completed previous levels
      if (
        cyberQuest.level > 1 &&
        cyberQuest.level > userLevel.maxLevelReached
      ) {
        console.warn("Access denied: Quest level too high", {
          questLevel: cyberQuest.level,
          userMaxLevel: userLevel.maxLevelReached,
        });
        return res.status(403).json({
          success: false,
          message: `This is a level ${cyberQuest.level} quest. Complete level ${userLevel.maxLevelReached} first to unlock it.`,
        });
      }

      console.log("✅ Prerequisite check passed");

      // Record the attempt in progress
      const questProgress = await progress.recordCyberQuestAttempt(
        questId,
        cyberQuest.subject,
        processedAnswers,
        score,
        {
          correctAnswers: correctCount,
          incorrectAnswers: Math.max(totalQuestionUnits - correctCount, 0),
          totalQuestions: totalQuestionUnits,
          questLevel: cyberQuest.level,
        }
      );

      // Handle XP and level progression
      let levelProgressed = false;
      let newLevel = null;
      let xpEarned = 0;

      console.log("Level Progression Debug:", {
        userId: req.user.id,
        questId: questId,
        questLevel: cyberQuest.level,
        userCurrentLevel: userLevel.currentLevel,
        userMaxLevel: userLevel.maxLevelReached,
        score: score,
        passingScore: score >= 34,
        levelCondition: cyberQuest.level === userLevel.maxLevelReached,
      });

      // XP now comes from answer accuracy plus remaining time bonus.
      const baseAttemptXP = 40;
      const correctAnswerXP = correctCount * 35;
      const completionBonus = score >= 34 ? 80 : 0;
      const timeLeftRatio = questCountdownSeconds
        ? normalizedTimeLeftSeconds / questCountdownSeconds
        : 0;
      const timeLeftBonusXP = Math.floor(timeLeftRatio * 120);

      xpEarned = baseAttemptXP + correctAnswerXP + completionBonus + timeLeftBonusXP;

      // Update the main User model's gamification for leaderboards
      const User = await import("../models/Users.js").then(
        (module) => module.default
      );
      const gamificationUser = await User.findById(req.user.id);
      let updatedUser = null;
      if (gamificationUser) {
        const oldXP = gamificationUser.gamification.totalXP || 0;
        const oldLevel = gamificationUser.gamification.level || 1;

        const newTotalXP = oldXP + xpEarned;
        const newLevel = Math.floor(newTotalXP / 500) + 1;

        console.log(`XP Earned: ${xpEarned} (Total: ${oldXP} → ${newTotalXP})`);
        console.log(`Level: ${oldLevel} → ${newLevel}`);

        // Use findByIdAndUpdate to avoid validation issues with other required fields
        updatedUser = await User.findByIdAndUpdate(
          req.user.id,
          {
            $set: {
              "gamification.totalXP": newTotalXP,
              "gamification.level": newLevel,
            },
          },
          { new: true }
        );
      }

      if (score >= 34) {
        // Passing score (34% = 1 star minimum) - handle level progression in cyber quest system
        // Allow progression if user completes a level at or equal to their max reached level
        if (cyberQuest.level >= userLevel.maxLevelReached) {
          // Check if there's a next level quest before unlocking
          const nextLevel = userLevel.maxLevelReached + 1;
          const nextQuest = await CyberQuest.findOne({
            subject: cyberQuest.subject,
            level: nextLevel,
          });

          if (nextQuest) {
            // Unlock next level only if it exists
            console.log(
              `Before level progression: maxLevelReached = ${userLevel.maxLevelReached}`
            );
            newLevel = userLevel.unlockNextLevel();
            levelProgressed = true;
            console.log(
              `User ${req.user.id} progressed to level ${newLevel} in section ${cyberQuest.subject}`
            );
            console.log(
              `After level progression: maxLevelReached = ${userLevel.maxLevelReached}`
            );
          } else {
            console.log(
              `No next level quest found for level ${nextLevel} in section ${cyberQuest.subject}, not progressing`
            );
          }
        } else {
          console.log(
            `Level progression not triggered: quest level ${cyberQuest.level} < user max level ${userLevel.maxLevelReached}`
          );
        }

        // Update stats
        userLevel.incrementStats(10); // 10 XP per completed quest
        await userLevel.save();
        console.log(`UserLevel saved successfully for user ${req.user.id}`);
      } else {
        console.log(
          `Quest not passed: score ${score} < 60, but XP still awarded: ${xpEarned}`
        );
      }

      // Log cyber quest completion regardless of pass/fail for analytics
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.privilege,
        action: AUDIT_ACTIONS.CYBERQUEST_COMPLETE,
        resource: AUDIT_RESOURCES.CYBERQUEST,
        resourceId: cyberQuest._id,
        details: {
          questTitle: cyberQuest.title,
          questLevel: cyberQuest.level,
          score: score,
          passed: score >= 34,
          correctAnswers: correctCount,
          totalQuestions: cyberQuest.questions.length,
          attempts: questProgress.totalAttempts,
          xpEarned: xpEarned,
          timeLeftSeconds: normalizedTimeLeftSeconds,
          completionType: score >= 34 ? "successful" : "attempted",
        },
        success: true,
        ...requestInfo,
      });

      // Provide stable metadata so analytics middleware can persist quest title/level in gameLog.
      res.locals.gameMeta = {
        title: cyberQuest.title,
        cyberQuestTitle: cyberQuest.title,
        questTitle: cyberQuest.title,
        questLevel: cyberQuest.level,
        level: cyberQuest.level,
        score,
        passed: score >= 34,
        correctAnswers: correctCount,
        totalQuestions: cyberQuest.questions.length,
        incorrectAnswers: Math.max(cyberQuest.questions.length - correctCount, 0),
        timeLeftSeconds: normalizedTimeLeftSeconds,
      };

      res.json({
        success: true,
        result: {
          score,
          correctAnswers: correctCount,
          totalQuestions: cyberQuest.questions.length,
          passed: score >= 34, // Match the completion threshold (34% = 1 star minimum)
          xpEarned: xpEarned,
          timeLeftSeconds: normalizedTimeLeftSeconds,
          totalXP: updatedUser ? updatedUser.gamification.totalXP : 0,
          currentLevel: updatedUser ? updatedUser.gamification.level : 1,
          questProgress: {
            bestScore: questProgress.bestScore,
            totalAttempts: questProgress.totalAttempts,
            status: questProgress.status,
          },
          levelProgression: {
            levelProgressed,
            newLevel,
            currentLevel: userLevel.currentLevel,
            maxLevelReached: userLevel.maxLevelReached,
          },
        },
      });
    } catch (error) {
      console.error("Error submitting cyber quest attempt:", error);
      console.error("Error stack:", error.stack);
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        questId: req.params.id,
        userId: req.user?.id,
        answers: req.body?.answers,
      });
      res.status(500).json({
        success: false,
        message: "Internal server error",
        ...(process.env.NODE_ENV === "development" && {
          error: error.message,
          stack: error.stack,
        }),
      });
    }
  }
);

/**
 * @route   GET /api/sections/:sectionId/cyber-quest-progress
 * @desc    Get user's cyber quest progress for a section
 * @access  Private (Students)
 */
router.get(
  "/sections/:sectionId/cyber-quest-progress",
  protectRoute,
  async (req, res) => {
    try {
      const { sectionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(sectionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid section ID",
        });
      }

      // Verify user has access to this section
      const section = await Section.findById(sectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: "Section not found",
        });
      }

      // Check if user has access to this section
      let hasAccess = false;
      let accessReason = null;
      let user = null; // Declare user variable in outer scope

      if (
        req.user.privilege === "instructor" ||
        req.user.privilege === "admin"
      ) {
        // Instructors and admins can access all sections
        hasAccess = true;
        accessReason = "role:instructor/admin";
      } else {
        // Students can access sections they're assigned to
        const User = await import("../models/Users.js").then(
          (module) => module.default
        );
        user = await User.findById(req.user.id).select(
          "section sections currentSection privilege"
        );

        // 1) Legacy single-section string match (either name or sectionCode)
        if (
          user &&
          user.section &&
          user.section !== "no_section" &&
          (section.sectionCode === user.section ||
            section.name === user.section)
        ) {
          hasAccess = true;
          accessReason = "legacy:single-section-match";
        }

        // 2) New multi-subject assignment via `sections` array (stores sectionCode)
        if (
          !hasAccess &&
          user &&
          Array.isArray(user.sections) &&
          user.sections.includes(section.sectionCode)
        ) {
          hasAccess = true;
          accessReason = "multi:sections-array";
        }

        // 3) Respect user's explicitly selected/current section when present
        if (
          !hasAccess &&
          user &&
          user.currentSection &&
          (user.currentSection === section.sectionCode ||
            user.currentSection === section.name)
        ) {
          hasAccess = true;
          accessReason = "currentSection:match";
        }

        // 4) Fallback: ensure membership in section's students array
        if (
          !hasAccess &&
          Array.isArray(section.students) &&
          section.students.some(
            (studentId) => studentId.toString() === req.user.id
          )
        ) {
          hasAccess = true;
          accessReason = "membership:students-array";
        }
      }

      if (!hasAccess) {
        console.warn("Progress access denied debug:", {
          userId: req.user?.id,
          sectionId: sectionId,
          sectionCode: section.sectionCode,
          userSection: (user && user.section) || null,
          userSections: (user && user.sections) || null,
          currentSection: (user && user.currentSection) || null,
          reason: accessReason,
        });
        return res.status(403).json({
          success: false,
          message: "Access denied to this section",
        });
      }

      // Get user's progress
      const Progress = await import("../models/Progress.js").then(
        (module) => module.default
      );
      let progress = await Progress.findOne({ user: req.user.id });

      if (!progress) {
        // Create initial progress document for new users
        progress = new Progress({
          user: req.user.id,
          globalProgress: {
            unlockedModules: [],
            completedModules: [],
          },
          moduleProgress: [],
          cyberQuestProgress: [],
          quizAttempts: [],
        });
        await progress.save();
      }

      // Get section's cyber quest progress
      let sectionProgress = await progress.getCyberQuestProgressForSection(
        sectionId
      );

      console.log("=== PROGRESS DEBUG ===");
      console.log("Section ID:", sectionId);
      console.log("User ID:", req.user.id);
      console.log("Initial section progress count:", sectionProgress.length);

      // Check if we need to initialize missing levels
      const UserLevel = await import("../models/UserLevel.js").then(
        (module) => module.default
      );
      const userLevel = await UserLevel.findOne({
        user: req.user.id,
        section: sectionId,
      });

      console.log(
        "UserLevel found:",
        userLevel
          ? {
              currentLevel: userLevel.currentLevel,
              maxLevelReached: userLevel.maxLevelReached,
            }
          : null
      );

      if (userLevel && userLevel.maxLevelReached >= 1) {
        // Get all cyber quests for this section
        const cyberQuests = await CyberQuest.findBySection(sectionId);
        console.log(
          "All cyber quests for section:",
          cyberQuests.map((q) => ({
            id: q._id,
            level: q.level,
            title: q.title,
          }))
        );

        // Check for missing levels
        const existingLevels = sectionProgress
          .map((sp) => {
            const quest = cyberQuests.find(
              (q) => q._id.toString() === sp.cyberQuest.toString()
            );
            return quest ? quest.level : null;
          })
          .filter((level) => level !== null);

        console.log("Existing levels in progress:", existingLevels);
        console.log("User max level reached:", userLevel.maxLevelReached);

        let progressUpdated = false;

        // Create progress entries for missing unlocked levels
        for (const quest of cyberQuests) {
          console.log(
            `Checking quest level ${quest.level}, maxReached: ${
              userLevel.maxLevelReached
            }, exists: ${existingLevels.includes(quest.level)}`
          );

          if (
            quest.level <= userLevel.maxLevelReached &&
            !existingLevels.includes(quest.level)
          ) {
            console.log(
              `Creating progress entry for quest level ${quest.level}`
            );
            const status =
              quest.level < userLevel.currentLevel ? "completed" : "unlocked";

            const questProgress = {
              cyberQuest: quest._id,
              section: sectionId,
              status: status,
              attempts: [],
              bestScore: status === "completed" ? 100 : 0,
              totalAttempts: status === "completed" ? 1 : 0,
              firstCompletedAt: status === "completed" ? new Date() : null,
              lastAttemptAt: status === "completed" ? new Date() : null,
            };

            // Add fake attempt for completed quests
            if (status === "completed") {
              questProgress.attempts.push({
                attemptNumber: 1,
                score: 100,
                totalQuestions: quest.questions.length,
                correctAnswers: quest.questions.length,
                answers: quest.questions.map((q, index) => ({
                  questionIndex: index,
                  selectedChoiceIndex: q.correct_index,
                  isCorrect: true,
                })),
                startedAt: new Date(),
                completedAt: new Date(),
              });
            }

            progress.cyberQuestProgress.push(questProgress);
            progressUpdated = true;
          }
        }

        if (progressUpdated) {
          await progress.save();
          console.log("Progress updated and saved");

          // Refresh section progress after updates
          sectionProgress = await progress.getCyberQuestProgressForSection(
            sectionId
          );
          console.log("Final section progress count:", sectionProgress.length);
        }
      } else {
        console.log("No UserLevel found or maxLevelReached < 1");

        if (sectionProgress.length === 0) {
          // New user - initialize with first level unlocked
          const cyberQuests = await CyberQuest.findBySection(sectionId);
          const firstQuest = cyberQuests.find((q) => q.level === 1);

          if (firstQuest) {
            const questProgress = {
              cyberQuest: firstQuest._id,
              section: sectionId,
              status: "unlocked",
              attempts: [],
              bestScore: 0,
              totalAttempts: 0,
              firstCompletedAt: null,
              lastAttemptAt: null,
            };

            progress.cyberQuestProgress.push(questProgress);
            await progress.save();

            // Also initialize UserLevel
            await UserLevel.getOrCreate(req.user.id, sectionId);

            sectionProgress = await progress.getCyberQuestProgressForSection(
              sectionId
            );
          }
        }
      }

      console.log("=== END PROGRESS DEBUG ===");

      res.json({
        success: true,
        progress: sectionProgress,
      });
    } catch (error) {
      console.error("Error fetching cyber quest progress:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * @route   GET /api/sections/:sectionId/cyber-quest-level
 * @desc    Get user's current cyber quest level for a section
 * @access  Private (Students/Instructors/Admins)
 */
router.get(
  "/sections/:sectionId/cyber-quest-level",
  protectRoute,
  async (req, res) => {
    try {
      const { sectionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(sectionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid section ID",
        });
      }

      // Verify section exists and user has access
      const section = await Section.findById(sectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: "Section not found",
        });
      }

      // Check access (same logic as existing routes)
      let hasAccess = false;

      if (
        req.user.privilege === "instructor" ||
        req.user.privilege === "admin"
      ) {
        hasAccess = true;
      } else {
        const User = await import("../models/Users.js").then(
          (module) => module.default
        );
        const user = await User.findById(req.user.id).select("section");

        if (
          user &&
          user.section &&
          user.section !== "no_section" &&
          (section.sectionCode === user.section ||
            section.name === user.section)
        ) {
          hasAccess = true;
        }

        if (
          !hasAccess &&
          section.students.some(
            (studentId) => studentId.toString() === req.user.id
          )
        ) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this section",
        });
      }

      // Get or create user level record using the new UserLevel model
      const UserLevel = await import("../models/UserLevel.js").then(
        (module) => module.default
      );
      const userLevel = await UserLevel.getOrCreate(req.user.id, sectionId);

      res.json({
        success: true,
        level: {
          currentLevel: userLevel.currentLevel,
          maxLevelReached: userLevel.maxLevelReached,
          totalQuestsCompleted: userLevel.totalQuestsCompleted,
          totalXPEarned: userLevel.totalXPEarned,
          lastLevelCompletedAt: userLevel.lastLevelCompletedAt,
          section: {
            _id: section._id,
            name: section.name,
            sectionCode: section.sectionCode,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching cyber quest level:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * @route   GET /api/sections/:id/cyber-quests-by-level
 * @desc    Get cyber quests for a specific section filtered by user's accessible levels
 * @access  Private (Students can access their section's cyber quests, Instructors can access their created sections)
 */
router.get(
  "/sections/:id/cyber-quests-by-level",
  protectRoute,
  async (req, res) => {
    try {
      const { id: sectionId } = req.params;
      const { level } = req.query; // Optional level filter

      if (!mongoose.Types.ObjectId.isValid(sectionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid section ID",
        });
      }

      // Verify section exists
      const section = await Section.findById(sectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: "Section not found",
        });
      }

      // Check if user has access to this section (same logic as existing route)
      let hasAccess = false;

      if (
        req.user.privilege === "instructor" ||
        req.user.privilege === "admin"
      ) {
        hasAccess = true;
      } else {
        const User = await import("../models/Users.js").then(
          (module) => module.default
        );
        const user = await User.findById(req.user.id).select("section");

        if (
          user &&
          user.section &&
          user.section !== "no_section" &&
          (section.sectionCode === user.section ||
            section.name === user.section)
        ) {
          hasAccess = true;
        }

        if (
          !hasAccess &&
          section.students.some(
            (studentId) => studentId.toString() === req.user.id
          )
        ) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this section",
        });
      }

      // Get user's level to determine accessible levels using UserLevel model
      const UserLevel = await import("../models/UserLevel.js").then(
        (module) => module.default
      );
      const userLevel = await UserLevel.getOrCreate(req.user.id, sectionId);
      const maxAccessibleLevel = userLevel.maxLevelReached;

      // Build query for cyber quests
      let questQuery = {
        subject: sectionId,
        isActive: true,
      };

      // For students, filter by accessible levels
      if (req.user.privilege === "student") {
        questQuery.level = { $lte: maxAccessibleLevel };
      }

      // If specific level requested, filter by that level
      if (level && !isNaN(parseInt(level))) {
        const requestedLevel = parseInt(level);

        // Check if student can access this level
        if (
          req.user.privilege === "student" &&
          requestedLevel > maxAccessibleLevel
        ) {
          return res.status(403).json({
            success: false,
            message: `Access denied. You can only access levels up to ${maxAccessibleLevel}`,
          });
        }

        questQuery.level = requestedLevel;
      }

      // Get cyber quests
      const cyberQuests = await CyberQuest.find(questQuery)
        .populate("created_by", "username fullName")
        .populate("subject", "name sectionCode")
        .sort({ level: 1, createdAt: -1 });

      res.json({
        success: true,
        cyberQuests,
        levelInfo: {
          currentLevel: userLevel.currentLevel,
          maxAccessibleLevel,
          requestedLevel: level ? parseInt(level) : null,
        },
        section: {
          _id: section._id,
          name: section.name,
          sectionCode: section.sectionCode,
        },
      });
    } catch (error) {
      console.error("Error fetching cyber quests by level:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch cyber quests",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/debug/set-user-level
 * @desc    Debug endpoint to manually set user level (for testing)
 * @access  Private
 */
router.post("/debug/set-user-level", protectRoute, async (req, res) => {
  try {
    const { sectionId, level } = req.body;

    if (!sectionId || !level) {
      return res.status(400).json({
        success: false,
        message: "sectionId and level are required",
      });
    }

    const UserLevel = await import("../models/UserLevel.js").then(
      (module) => module.default
    );

    const userLevel = await UserLevel.getOrCreate(req.user.id, sectionId);
    userLevel.maxLevelReached = level;
    userLevel.currentLevel = level;
    await userLevel.save();

    res.json({
      success: true,
      message: `User level set to ${level}`,
      userLevel: {
        currentLevel: userLevel.currentLevel,
        maxLevelReached: userLevel.maxLevelReached,
      },
    });
  } catch (error) {
    console.error("Error setting user level:", error);
    res.status(500).json({
      success: false,
      message: "Failed to set user level",
      error: error.message,
    });
  }
});

export default router;
