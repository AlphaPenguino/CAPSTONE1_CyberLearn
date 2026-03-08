import express from "express";
import {
  DigitalDefendersQuestion,
  DigitalDefendersAnswer,
  DigitalDefendersStats,
  TOOL_CARDS,
} from "../models/DigitalDefenders.js";
import {
  digitalDefendersGames,
  digitalDefendersPlayers,
} from "../controllers/digitalDefendersController.js";
import { protectRoute, authorizeRole } from "../middleware/auth.middleware.js";
import { trackGameCompletion } from "../middleware/analytics.middleware.js";
import Section from "../models/Section.js";
import mongoose from "mongoose";

const router = express.Router();

/**
 * @route   GET /api/digital-defenders/debug/rooms
 * @desc    Debug endpoint to list active rooms
 * @access  Public (for debugging)
 */
router.get("/debug/rooms", (req, res) => {
  try {
    const rooms = Array.from(digitalDefendersGames.entries()).map(
      ([roomCode, game]) => ({
        roomCode,
        playerCount: game.players.size,
        gameState: game.gameState,
        maxPlayers: game.maxPlayers,
        players: Array.from(game.players.values()).map((p) => ({
          name: p.name,
          isCreator: p.isCreator,
        })),
      })
    );

    const players = Array.from(digitalDefendersPlayers.entries()).map(
      ([socketId, player]) => ({
        socketId,
        gameId: player.gameId,
        playerName: player.playerName,
        isCreator: player.isCreator,
      })
    );

    res.json({
      success: true,
      activeRooms: rooms,
      totalRooms: digitalDefendersGames.size,
      activePlayers: players,
      totalPlayers: digitalDefendersPlayers.size,
    });
  } catch (error) {
    console.error("Error in debug/rooms:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching room data",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/digital-defenders/questions/global
 * @desc    Get global/default Digital Defenders questions (no section required)
 * @access  Public
 */
router.get("/questions/global", async (req, res) => {
  try {
    console.log("🎮 Digital Defenders: Fetching global questions");

    // First, check if we have any global questions
    let globalQuestions = await DigitalDefendersQuestion.find({
      section: null,
      isActive: true,
    })
      .populate("createdBy", "username fullName")
      .sort({ wave: 1, createdAt: 1 });

    // If no global questions exist, seed them automatically
    if (globalQuestions.length === 0) {
      console.log("🌱 No global questions found, auto-seeding...");
      try {
        const { seedGlobalQuestions } = await import(
          "../scripts/seed-global-questions.js"
        );
        await seedGlobalQuestions();

        // Fetch the newly created questions
        globalQuestions = await DigitalDefendersQuestion.find({
          section: null,
          isActive: true,
        })
          .populate("createdBy", "username fullName")
          .sort({ wave: 1, createdAt: 1 });

        console.log(
          `✅ Auto-seeded ${globalQuestions.length} global questions`
        );
      } catch (seedError) {
        console.error("❌ Error auto-seeding global questions:", seedError);
        // Continue with empty array if seeding fails
      }
    }

    console.log(
      `🎮 Digital Defenders: Returning ${globalQuestions.length} global questions`
    );

    res.json({
      success: true,
      questions: globalQuestions,
      totalQuestions: globalQuestions.length,
      message:
        globalQuestions.length === 0
          ? "No questions available"
          : "Questions retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching global Digital Defenders questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch global questions",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/digital-defenders/answers/global
 * @desc    Get global/default Digital Defenders answer cards (no section required)
 * @access  Private
 */
router.get("/answers/global", protectRoute, async (req, res) => {
  try {
    console.log("🎮 Digital Defenders: Fetching global answers");

    // Fetch user-created global answers from database (section = null)
    const userGlobalAnswers = await DigitalDefendersAnswer.find({
      section: null,
      isActive: true,
    })
      .populate("createdBy", "username fullName")
      .sort({ createdAt: 1 });

    // Import default answers from the setup script
    const { defaultAnswers } = await import(
      "../scripts/setup-digital-defenders.js"
    );

    // Transform default answers to match the expected format
    const defaultAnswersFormatted = defaultAnswers.map((a, index) => ({
      _id: `default_${index}`,
      name: a.name,
      text: a.text,
      description: a.description || "",
      image: a.image || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: true, // Mark as default answer
    }));

    // Combine user-created and default answers
    const allAnswers = [
      ...userGlobalAnswers.map((a) => ({ ...a.toObject(), isDefault: false })),
      ...defaultAnswersFormatted,
    ];

    console.log(
      `🎮 Digital Defenders: Returning ${allAnswers.length} global answers (${userGlobalAnswers.length} user-created, ${defaultAnswersFormatted.length} default)`
    );

    res.json({
      success: true,
      answers: allAnswers,
      totalAnswers: allAnswers.length,
      userCreated: userGlobalAnswers.length,
      defaultAnswers: defaultAnswersFormatted.length,
    });
  } catch (error) {
    console.error("Error fetching global Digital Defenders answers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch global answers",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/digital-defenders/questions/global
 * @desc    Create a new global Digital Defenders question (no section required)
 * @access  Private (Instructor/Admin)
 */
router.post(
  "/questions/global",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { text, correctAnswer, image, description, difficulty, wave } =
        req.body;

      // Validate required fields
      if (!text || !correctAnswer) {
        return res.status(400).json({
          success: false,
          message: "Question text and correct answer are required",
        });
      }

      // Validate wave number (1-10)
      const waveNumber = wave || 1;
      if (waveNumber < 1 || waveNumber > 10) {
        return res.status(400).json({
          success: false,
          message: "Wave must be between 1 and 10",
        });
      }

      // Check wave limit: maximum 5 questions per wave for global questions
      const existingQuestionsInWave =
        await DigitalDefendersQuestion.countDocuments({
          section: null, // Global questions have no section
          wave: waveNumber,
          isActive: true, // Only count active questions
        });

      if (existingQuestionsInWave >= 5) {
        return res.status(400).json({
          success: false,
          message: `Wave ${waveNumber} already has the maximum of 5 global questions`,
        });
      }

      const newQuestion = new DigitalDefendersQuestion({
        text: text.trim(),
        correctAnswer: correctAnswer.trim(),
        image: image || null,
        description: description || "",
        difficulty: difficulty || 1,
        wave: waveNumber,
        createdBy: req.user.id,
        section: null, // Global question - no section
      });

      const savedQuestion = await newQuestion.save();
      await savedQuestion.populate("createdBy", "username fullName");

      console.log(
        `🎮 Digital Defenders: Created global question for wave ${waveNumber}`
      );

      res.status(201).json({
        success: true,
        message: "Global question created successfully",
        question: savedQuestion,
      });
    } catch (error) {
      console.error("Error creating global Digital Defenders question:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create global question",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/digital-defenders/answers/global
 * @desc    Create a new global Digital Defenders answer card (no section required)
 * @access  Private (Instructor/Admin)
 */
router.post(
  "/answers/global",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { text, name, description, image, questionId } = req.body;

      // Validate required fields
      if (!text || !name) {
        return res.status(400).json({
          success: false,
          message: "Answer text and name are required",
        });
      }

      const newAnswer = new DigitalDefendersAnswer({
        text: text.trim(),
        name: name.trim(),
        description: description || "",
        image: image || null,
        questionId: questionId || null,
        createdBy: req.user.id,
        section: null, // Global answer - no section
      });

      const savedAnswer = await newAnswer.save();
      await savedAnswer.populate("createdBy", "username fullName");

      console.log("🎮 Digital Defenders: Created global answer card");

      res.status(201).json({
        success: true,
        message: "Global answer card created successfully",
        answer: savedAnswer,
      });
    } catch (error) {
      console.error("Error creating global Digital Defenders answer:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create global answer card",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/digital-defenders/questions/:sectionId
 * @desc    Get all Digital Defenders questions for a section
 * @access  Private (Student/Instructor/Admin)
 */
router.get("/questions/:sectionId", protectRoute, async (req, res) => {
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

    // Check access permissions
    let hasAccess = false;
    if (req.user.privilege === "instructor" || req.user.privilege === "admin") {
      hasAccess = true;
    } else {
      // Students can access sections they're assigned to
      const User = await import("../models/Users.js").then(
        (module) => module.default
      );
      const user = await User.findById(req.user.id).select("section");

      if (
        user &&
        user.section &&
        user.section !== "no_section" &&
        (section.sectionCode === user.section || section.name === user.section)
      ) {
        hasAccess = true;
      }

      // Also check if user is in the section's students array
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

    // Get questions for this section
    const questions = await DigitalDefendersQuestion.find({
      section: sectionId,
      isActive: true,
    })
      .populate("createdBy", "username fullName")
      .sort({ wave: 1, createdAt: 1 });

    res.json({
      success: true,
      questions,
      totalQuestions: questions.length,
    });
  } catch (error) {
    console.error("Error fetching Digital Defenders questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch questions",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/digital-defenders/answers/:sectionId
 * @desc    Get all Digital Defenders answer cards for a section
 * @access  Private (Student/Instructor/Admin)
 */
router.get("/answers/:sectionId", protectRoute, async (req, res) => {
  try {
    const { sectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section ID",
      });
    }

    // Verify section exists and user has access (same logic as questions)
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    // Check access permissions (same as questions route)
    let hasAccess = false;
    if (req.user.privilege === "instructor" || req.user.privilege === "admin") {
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
        (section.sectionCode === user.section || section.name === user.section)
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

    // Get answer cards for this section
    const answers = await DigitalDefendersAnswer.find({
      section: sectionId,
      isActive: true,
    })
      .populate("createdBy", "username fullName")
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      answers,
      totalAnswers: answers.length,
    });
  } catch (error) {
    console.error("Error fetching Digital Defenders answers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch answer cards",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/digital-defenders/tool-cards
 * @desc    Get all predefined tool cards
 * @access  Private
 */
router.get("/tool-cards", protectRoute, async (req, res) => {
  try {
    res.json({
      success: true,
      toolCards: TOOL_CARDS,
      totalToolCards: TOOL_CARDS.length,
    });
  } catch (error) {
    console.error("Error fetching tool cards:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tool cards",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/digital-defenders/questions/:sectionId
 * @desc    Create a new Digital Defenders question
 * @access  Private (Instructor/Admin)
 */
router.post(
  "/questions/:sectionId",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { sectionId } = req.params;
      const { text, correctAnswer, image, description, difficulty, wave } =
        req.body;

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

      // Validate required fields
      if (!text || !correctAnswer) {
        return res.status(400).json({
          success: false,
          message: "Question text and correct answer are required",
        });
      }

      // Validate wave number (1-10)
      const waveNumber = wave || 1;
      if (waveNumber < 1 || waveNumber > 10) {
        return res.status(400).json({
          success: false,
          message: "Wave must be between 1 and 10",
        });
      }

      // Check wave limit: maximum 5 questions per wave
      const existingQuestionsInWave =
        await DigitalDefendersQuestion.countDocuments({
          section: sectionId,
          wave: waveNumber,
          isActive: true,
        });

      if (existingQuestionsInWave >= 5) {
        return res.status(400).json({
          success: false,
          message: `Wave ${waveNumber} already has the maximum of 5 questions. Please choose a different wave or delete an existing question.`,
        });
      }

      // Create new question
      const newQuestion = new DigitalDefendersQuestion({
        text: text.trim(),
        correctAnswer: correctAnswer.trim(),
        image: image || null,
        description: description || "",
        difficulty: difficulty || 1,
        wave: wave || 1,
        createdBy: req.user.id,
        section: sectionId,
      });

      const savedQuestion = await newQuestion.save();
      await savedQuestion.populate("createdBy", "username fullName");

      res.status(201).json({
        success: true,
        message: "Question created successfully",
        question: savedQuestion,
      });
    } catch (error) {
      console.error("Error creating Digital Defenders question:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create question",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/digital-defenders/answers/:sectionId
 * @desc    Create a new Digital Defenders answer card
 * @access  Private (Instructor/Admin)
 */
router.post(
  "/answers/:sectionId",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { sectionId } = req.params;
      const { name, text, description, image } = req.body;

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

      // Validate required fields
      if (!name || !text) {
        return res.status(400).json({
          success: false,
          message: "Card name and text are required",
        });
      }

      // Create new answer card
      const newAnswer = new DigitalDefendersAnswer({
        name: name.trim(),
        text: text.trim(),
        description: description || "",
        image: image || null,
        createdBy: req.user.id,
        section: sectionId,
      });

      const savedAnswer = await newAnswer.save();
      await savedAnswer.populate("createdBy", "username fullName");

      res.status(201).json({
        success: true,
        message: "Answer card created successfully",
        answer: savedAnswer,
      });
    } catch (error) {
      console.error("Error creating Digital Defenders answer:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create answer card",
        error: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/digital-defenders/questions/:questionId
 * @desc    Update a Digital Defenders question
 * @access  Private (Instructor/Admin - Creator or Admin only)
 */
router.put(
  "/questions/:questionId",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { questionId } = req.params;
      const { text, correctAnswer, image, description, difficulty, wave } =
        req.body;

      if (!mongoose.Types.ObjectId.isValid(questionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid question ID",
        });
      }

      const question = await DigitalDefendersQuestion.findById(questionId);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      // Check authorization for updating the question
      // For global questions (section: null), any admin/instructor can edit
      // For section-specific questions, only creator or admin can edit
      const isGlobalQuestion = question.section === null;
      const isCreator =
        question.createdBy.toString() === req.user.id.toString();
      const isAdmin = req.user.privilege === "admin";
      const isInstructor = req.user.privilege === "instructor";

      if (!isGlobalQuestion && !isCreator && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this section-specific question",
        });
      }

      if (isGlobalQuestion && !isAdmin && !isInstructor) {
        return res.status(403).json({
          success: false,
          message: "Only admins and instructors can update global questions",
        });
      }

      // Update fields if provided
      if (text) question.text = text.trim();
      if (correctAnswer) question.correctAnswer = correctAnswer.trim();
      if (image !== undefined) question.image = image;
      if (description !== undefined) question.description = description;
      if (difficulty !== undefined) question.difficulty = difficulty;

      // Wave is no longer editable via the edit form
      // Wave assignment is determined by the wave section where the question is created

      const updatedQuestion = await question.save();
      await updatedQuestion.populate("createdBy", "username fullName");

      res.json({
        success: true,
        message: "Question updated successfully",
        question: updatedQuestion,
      });
    } catch (error) {
      console.error("Error updating Digital Defenders question:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update question",
        error: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/digital-defenders/answers/:answerId
 * @desc    Update a Digital Defenders answer card
 * @access  Private (Instructor/Admin - Creator or Admin only)
 */
router.put(
  "/answers/:answerId",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { answerId } = req.params;
      const { name, text, description, image } = req.body;

      if (!mongoose.Types.ObjectId.isValid(answerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid answer ID",
        });
      }

      const answer = await DigitalDefendersAnswer.findById(answerId);
      if (!answer) {
        return res.status(404).json({
          success: false,
          message: "Answer card not found",
        });
      }

      // Check if user owns this answer or is admin
      if (
        answer.createdBy.toString() !== req.user.id.toString() &&
        req.user.privilege !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this answer card",
        });
      }

      // Update fields if provided
      if (name) answer.name = name.trim();
      if (text) answer.text = text.trim();
      if (description !== undefined) answer.description = description;
      if (image !== undefined) answer.image = image;

      const updatedAnswer = await answer.save();
      await updatedAnswer.populate("createdBy", "username fullName");

      res.json({
        success: true,
        message: "Answer card updated successfully",
        answer: updatedAnswer,
      });
    } catch (error) {
      console.error("Error updating Digital Defenders answer:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update answer card",
        error: error.message,
      });
    }
  }
);

/**
 * @route   DELETE /api/digital-defenders/questions/:questionId
 * @desc    Delete (deactivate) a Digital Defenders question
 * @access  Private (Instructor/Admin - Creator or Admin only)
 */
router.delete(
  "/questions/:questionId",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { questionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(questionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid question ID",
        });
      }

      const question = await DigitalDefendersQuestion.findById(questionId);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      // Check if user owns this question, is admin, or is instructor deleting global question
      const isOwner = question.createdBy.toString() === req.user.id.toString();
      const isAdmin = req.user.privilege === "admin";
      const isInstructorDeletingGlobal =
        req.user.privilege === "instructor" && question.section === null;

      if (!isOwner && !isAdmin && !isInstructorDeletingGlobal) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete this question",
        });
      }

      // Soft delete - set isActive to false
      question.isActive = false;
      await question.save();

      res.json({
        success: true,
        message: "Question deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting Digital Defenders question:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete question",
        error: error.message,
      });
    }
  }
);

/**
 * @route   DELETE /api/digital-defenders/answers/:answerId
 * @desc    Delete (deactivate) a Digital Defenders answer card
 * @access  Private (Instructor/Admin - Creator or Admin only)
 */
router.delete(
  "/answers/:answerId",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { answerId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(answerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid answer ID",
        });
      }

      const answer = await DigitalDefendersAnswer.findById(answerId);
      if (!answer) {
        return res.status(404).json({
          success: false,
          message: "Answer card not found",
        });
      }

      // Check if user owns this answer, is admin, or is instructor deleting global answer
      const isOwner = answer.createdBy.toString() === req.user.id.toString();
      const isAdmin = req.user.privilege === "admin";
      const isInstructorDeletingGlobal =
        req.user.privilege === "instructor" && answer.section === null;

      if (!isOwner && !isAdmin && !isInstructorDeletingGlobal) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete this answer card",
        });
      }

      // Soft delete - set isActive to false
      answer.isActive = false;
      await answer.save();

      res.json({
        success: true,
        message: "Answer card deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting Digital Defenders answer:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete answer card",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/digital-defenders/stats/:sectionId
 * @desc    Get Digital Defenders statistics for current user in a section
 * @access  Private
 */
router.get("/stats/:sectionId", protectRoute, async (req, res) => {
  try {
    const { sectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section ID",
      });
    }

    // Get or create stats for user
    let stats = await DigitalDefendersStats.findOne({
      userId: req.user.id,
      section: sectionId,
    });

    if (!stats) {
      // Create initial stats record
      stats = new DigitalDefendersStats({
        userId: req.user.id,
        section: sectionId,
      });
      await stats.save();
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching Digital Defenders stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/digital-defenders/stats/:sectionId/update
 * @desc    Update Digital Defenders statistics after a game
 * @access  Private
 */
router.post(
  "/stats/:sectionId/update",
  protectRoute,
  trackGameCompletion("digitalDefenders"),
  async (req, res) => {
    try {
      const { sectionId } = req.params;
      const {
        gameWon,
        wavesCompleted,
        cardsPlayed,
        correctAnswers,
        completionTime,
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(sectionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid section ID",
        });
      }

      // Get or create stats for user
      let stats = await DigitalDefendersStats.findOne({
        userId: req.user.id,
        section: sectionId,
      });

      if (!stats) {
        stats = new DigitalDefendersStats({
          userId: req.user.id,
          section: sectionId,
        });
      }

      // Update statistics
      stats.gamesPlayed += 1;
      if (gameWon) stats.gamesWon += 1;
      if (wavesCompleted) stats.totalWavesCompleted += wavesCompleted;
      if (wavesCompleted > stats.highestWaveReached) {
        stats.highestWaveReached = wavesCompleted;
      }
      if (cardsPlayed) stats.totalCardsPlayed += cardsPlayed;
      if (correctAnswers) stats.totalCorrectAnswers += correctAnswers;
      if (
        completionTime &&
        (!stats.bestCompletionTime || completionTime < stats.bestCompletionTime)
      ) {
        stats.bestCompletionTime = completionTime;
      }
      stats.lastPlayed = new Date();

      await stats.save();

      res.json({
        success: true,
        message: "Statistics updated successfully",
        stats,
      });
    } catch (error) {
      console.error("Error updating Digital Defenders stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update statistics",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/digital-defenders/leaderboard/:sectionId
 * @desc    Get Digital Defenders leaderboard for a section
 * @access  Private
 */
router.get("/leaderboard/:sectionId", protectRoute, async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { sortBy = "gamesWon" } = req.query;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section ID",
      });
    }

    // Valid sort options
    const validSortOptions = [
      "gamesWon",
      "highestWaveReached",
      "totalCorrectAnswers",
      "bestCompletionTime",
    ];

    const sortField = validSortOptions.includes(sortBy) ? sortBy : "gamesWon";
    const sortOrder = sortField === "bestCompletionTime" ? 1 : -1; // Ascending for time, descending for others

    // Get leaderboard data
    const leaderboard = await DigitalDefendersStats.find({
      section: sectionId,
      gamesPlayed: { $gt: 0 }, // Only include users who have played
    })
      .populate("userId", "username fullName")
      .sort({ [sortField]: sortOrder })
      .limit(50); // Top 50 players

    res.json({
      success: true,
      leaderboard,
      sortBy: sortField,
      totalPlayers: leaderboard.length,
    });
  } catch (error) {
    console.error("Error fetching Digital Defenders leaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboard",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/digital-defenders/upload-questions
 * @desc    Upload questions from JSON file (for instructor mode)
 * @access  Private (Instructor/Admin)
 */
router.post(
  "/upload-questions",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { questions } = req.body;

      if (!Array.isArray(questions)) {
        return res.status(400).json({
          success: false,
          message: "Questions must be an array",
        });
      }

      if (questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one question is required",
        });
      }

      // Validate questions format
      const errors = [];
      const validQuestions = [];

      questions.forEach((question, index) => {
        // Check required fields
        if (!question.question || typeof question.question !== "string") {
          errors.push(
            `Question ${index + 1}: Missing or invalid question text`
          );
          return;
        }

        if (
          !question.correctAnswer ||
          typeof question.correctAnswer !== "string"
        ) {
          errors.push(
            `Question ${index + 1}: Missing or invalid correct answer`
          );
          return;
        }

        // Validate difficulty (should be string: Easy, Medium, Hard)
        const difficulty = question.difficulty || "Medium";
        if (!["Easy", "Medium", "Hard"].includes(difficulty)) {
          errors.push(
            `Question ${index + 1}: Difficulty must be Easy, Medium, or Hard`
          );
          return;
        }

        // Convert difficulty to number (1-3)
        const difficultyNumber =
          difficulty === "Easy" ? 1 : difficulty === "Medium" ? 2 : 3;

        // Validate wave (1-10)
        const wave = question.wave || 1;
        if (typeof wave !== "number" || wave < 1 || wave > 10) {
          errors.push(`Question ${index + 1}: Wave must be between 1 and 10`);
          return;
        }

        // Create standardized question object
        const standardQuestion = {
          text: question.question.trim(),
          correctAnswer: question.correctAnswer.trim(),
          description: question.description || "",
          difficulty: difficultyNumber,
          wave: wave,
          image: question.image || null,
        };

        validQuestions.push(standardQuestion);
      });

      // If there are validation errors but also some valid questions, return partial success
      if (errors.length > 0 && validQuestions.length === 0) {
        return res.status(400).json({
          success: false,
          message: "All questions failed validation",
          errors,
          validCount: 0,
        });
      }

      // Check wave limits for valid questions
      const waveCounts = {};
      for (const question of validQuestions) {
        const existingCount = await DigitalDefendersQuestion.countDocuments({
          section: null, // Global questions
          wave: question.wave,
          isActive: true,
        });

        waveCounts[question.wave] = (waveCounts[question.wave] || 0) + 1;

        if (existingCount + waveCounts[question.wave] > 5) {
          errors.push(
            `Question for Wave ${question.wave}: Wave already has maximum of 5 questions (including uploaded ones)`
          );
        }
      }

      // If wave limits are exceeded, return error
      if (errors.length > 0 && waveCounts) {
        return res.status(400).json({
          success: false,
          message: "Some questions exceed wave limits",
          errors,
          validCount: validQuestions.length,
        });
      }

      // Save valid questions to database as global questions
      const questionsToSave = validQuestions.map((q) => ({
        text: q.text,
        correctAnswer: q.correctAnswer,
        description: q.description,
        difficulty: q.difficulty,
        wave: q.wave,
        image: q.image,
        createdBy: req.user.id,
        section: null, // Global questions
        isActive: true,
      }));

      const savedQuestions = await DigitalDefendersQuestion.insertMany(
        questionsToSave
      );

      // Create corresponding answer cards for each question
      const answersToSave = savedQuestions.map((question) => ({
        name: `Answer for ${question.text.substring(0, 30)}...`,
        text: question.correctAnswer,
        description: `Correct answer for: ${question.text}`,
        questionId: question._id,
        createdBy: req.user.id,
        section: null, // Global answers
      }));

      const savedAnswers = await DigitalDefendersAnswer.insertMany(
        answersToSave
      );

      // Return response with results
      if (errors.length > 0) {
        res.status(207).json({
          success: true,
          message: `${validQuestions.length} questions uploaded successfully with ${errors.length} warnings`,
          count: validQuestions.length,
          questions: savedQuestions,
          answers: savedAnswers,
          errors,
          validCount: validQuestions.length,
        });
      } else {
        res.json({
          success: true,
          message: `Successfully uploaded ${validQuestions.length} questions and created corresponding answer cards`,
          count: validQuestions.length,
          questions: savedQuestions,
          answers: savedAnswers,
          errors: [],
          validCount: validQuestions.length,
        });
      }
    } catch (error) {
      console.error("Error uploading Digital Defenders questions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload questions",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/digital-defenders/validate-questions
 * @desc    Validate questions format (for preview before upload)
 * @access  Public
 */
router.post("/validate-questions", async (req, res) => {
  try {
    const { questions } = req.body;

    if (!Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: "Questions must be an array",
      });
    }

    const errors = [];

    questions.forEach((question, index) => {
      // Check required fields
      if (!question.question || typeof question.question !== "string") {
        errors.push(`Question ${index + 1}: Missing or invalid question text`);
      }

      if (
        !question.correctAnswer ||
        typeof question.correctAnswer !== "string"
      ) {
        errors.push(`Question ${index + 1}: Missing or invalid correct answer`);
      }

      // Validate difficulty
      const difficulty = question.difficulty || "Medium";
      if (!["Easy", "Medium", "Hard"].includes(difficulty)) {
        errors.push(
          `Question ${index + 1}: Difficulty must be Easy, Medium, or Hard`
        );
      }

      // Validate wave
      const wave = question.wave || 1;
      if (typeof wave !== "number" || wave < 1 || wave > 10) {
        errors.push(`Question ${index + 1}: Wave must be between 1 and 10`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    res.json({
      success: true,
      message: "Questions are valid",
      count: questions.length,
    });
  } catch (error) {
    console.error("Error validating Digital Defenders questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate questions",
    });
  }
});

export default router;
