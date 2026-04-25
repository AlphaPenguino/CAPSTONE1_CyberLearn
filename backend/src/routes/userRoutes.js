import express from "express";
import User from "../models/Users.js";
import { protectRoute, authorizeRole } from "../middleware/auth.middleware.js";
import bcrypt from "bcrypt";
import localStorage from "../lib/localStorage.js";
import Progress from "../models/Progress.js";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import Module from "../models/Module.js";
import Quiz from "../models/Quiz.js";
import Section from "../models/Section.js";
import {
  generateTemporaryPassword,
  isTruthyFlag,
  sendNewAccountEmail,
} from "../utils/accountProvisioning.js";

const router = express.Router();

// Helper function to construct profile image URL dynamically
const constructProfileImageUrl = (filename) => {
  if (!filename) return null;

  // If it's already a full URL (external services like Dicebear), return as is
  if (filename.startsWith("http://") || filename.startsWith("https://")) {
    return filename;
  }

  // Construct URL for local uploads
  const baseUrl = process.env.API_URL || "http://localhost:3000";
  return `${baseUrl}/uploads/user-profiles/${filename}`;
};

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(
      process.cwd(),
      "src",
      "uploads",
      "user-profiles"
    );
    // Ensure the directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: userId_timestamp.extension
    const extension = path.extname(file.originalname);
    const filename = `${req.user.id}_${Date.now()}${extension}`;
    cb(null, filename);
  },
});

// File filter for profile pictures
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error("Multer error:", error);
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 5MB.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`,
    });
  } else if (error) {
    console.error("Upload error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Upload failed",
    });
  }
  next();
};

// Reuse the same token generation function from authRoutes.js
const generateToken = (userId, privilege) => {
  return jwt.sign({ userId, privilege }, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });
};

/**
 * @route   POST /api/users/test-upload
 * @desc    Test upload endpoint
 * @access  Private
 */
router.post(
  "/test-upload",
  protectRoute,
  upload.single("testFile"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      res.json({
        success: true,
        message: "File uploaded successfully",
        file: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size,
          path: req.file.path,
        },
      });
    } catch (error) {
      console.error("Test upload error:", error);
      res.status(500).json({
        success: false,
        message: "Upload test failed",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/users/upload-profile-picture
 * @desc    Upload user profile picture
 * @access  Private
 */
router.post(
  "/upload-profile-picture",
  protectRoute,
  (req, res, next) => {
    // Only log in development
    if (process.env.NODE_ENV !== "production") {
      console.log("Upload request headers:", {
        "content-type": req.headers["content-type"],
        "content-length": req.headers["content-length"],
        authorization: req.headers.authorization ? "Bearer [REDACTED]" : "None",
      });
    }
    next();
  },
  upload.single("profilePicture"),
  handleMulterError,
  async (req, res) => {
    try {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "File received:",
          req.file
            ? {
                fieldname: req.file.fieldname,
                originalname: req.file.originalname,
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype,
              }
            : "No file"
        );
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        // Clean up uploaded file if user not found
        fs.unlinkSync(req.file.path);
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Delete old profile picture if it exists and is stored locally
      if (
        user.profileImage &&
        user.profileImage.includes("/uploads/user-profiles/")
      ) {
        const oldImagePath = path.join(
          process.cwd(),
          "src",
          user.profileImage.replace(
            `${process.env.API_URL || "http://localhost:3000"}`,
            ""
          )
        );
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
          } catch (error) {
            console.error("Error deleting old profile picture:", error);
          }
        }
      }

      // Store only the filename, not the full URL
      // The URL will be constructed dynamically when needed
      user.profileImage = req.file.filename;
      await user.save();

      // Construct the full URL dynamically for the response
      const profileImageUrl = constructProfileImageUrl(user.profileImage);

      // Return updated user without password
      const userResponse = {
        id: user._id,
        username: user.username,
        fullName: user.fullName, // ensure frontend retains full name
        email: user.email,
        privilege: user.privilege,
        section: user.section,
        sections: user.sections, // include multi-section data if used in UI
        currentSection: user.currentSection,
        profileImage: profileImageUrl,
        profileImageTimestamp: Date.now(), // Add timestamp for cache busting
        privacyPolicyAccepted: user.privacyPolicyAccepted,
        gamification: user.gamification, // keep gamification data
        analytics: user.analytics, // keep analytics data
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res.json({
        success: true,
        message: "Profile picture uploaded successfully",
        user: userResponse,
        profileImageUrl: profileImageUrl,
      });
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      console.error("Error uploading profile picture:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload profile picture",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/users
 * @desc    Get all users with filtering, sorting and pagination
 * @access  Private/instructor
 */
router.get(
  "/",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      // Pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Sorting options
      const sortField = req.query.sort || "createdAt";
      const sortDirection = req.query.direction === "desc" ? -1 : 1;
      const sortOptions = {};
      sortOptions[sortField] = sortDirection;

      // Filtering options (support both legacy 'role' and stored 'privilege')
      // By default exclude archived users unless explicitly requested
      const filter = {};

      let archivedFilterApplied = false;
      if (req.query.archived === "true") {
        filter.isArchived = true;
        archivedFilterApplied = true;
      } else if (req.query.archived === "false") {
        filter.isArchived = { $ne: true };
        archivedFilterApplied = true;
      } else {
        // default exclude archived
        filter.isArchived = { $ne: true };
      }

      let roleCondition = null;
      if (req.query.role) {
        roleCondition = {
          $or: [
            { role: req.query.role },
            { privilege: req.query.role }, // actual stored field
          ],
        };
      }

      let searchCondition = null;
      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, "i");
        searchCondition = {
          $or: [
            { username: searchRegex },
            { email: searchRegex },
            { fullName: searchRegex },
          ],
        };
      }

      if (roleCondition && searchCondition) {
        filter.$and = [roleCondition, searchCondition];
      } else if (roleCondition) {
        Object.assign(filter, roleCondition);
      } else if (searchCondition) {
        Object.assign(filter, searchCondition);
      }

      // Get total count for pagination
      const total = await User.countDocuments(filter);

      // Select fields excluding password
      const users = await User.find(filter)
        .select("-password -__v")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit);

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers: total,
          hasMore: page < totalPages,
          limit,
        },
        filters: {
          roles: await User.distinct("role"),
          archivedFilterApplied,
        },
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch users",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/users/students
 * @desc    Get all students (for section assignment)
 * @access  Private/instructor/admin
 */
router.get(
  "/students",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      // Get all users with student privilege
      const students = await User.find({
        privilege: "student",
      }).select("-password -__v");

      res.json({
        success: true,
        students,
      });
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch students",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/users/leaderboard
 * @desc    Get leaderboard data with role-scoped subject filtering
 * @access  Private
 */
router.get("/leaderboard", protectRoute, async (req, res) => {
  try {
    const { subject, sectionCode } = req.query;
    const userId = req.user.id;
    const userRole = req.user.privilege;

    const subjectBaseFilter = {
      isActive: { $ne: false },
      archived: { $ne: true },
    };

    let accessibleSubjects = [];
    if (userRole === "admin") {
      accessibleSubjects = await Section.find(subjectBaseFilter).select(
        "_id name sectionCode subjectCode students"
      );
    } else if (userRole === "instructor") {
      accessibleSubjects = await Section.find({
        ...subjectBaseFilter,
        $or: [{ instructor: userId }, { instructors: userId }],
      }).select("_id name sectionCode subjectCode students");
    } else {
      accessibleSubjects = await Section.find({
        ...subjectBaseFilter,
        students: userId,
      }).select("_id name sectionCode subjectCode students");
    }

    const availableSubjects = accessibleSubjects.map((subjectDoc) => ({
      _id: String(subjectDoc._id),
      name: subjectDoc.name,
    }));

    // For instructors/students, default to the first accessible subject when none is selected.
    let selectedSubjectId = null;
    const subjectSelector =
      typeof sectionCode === "string" && sectionCode.trim().length > 0
        ? sectionCode.trim()
        : subject;

    if (subjectSelector && subjectSelector !== "all") {
      const requestedSubject = accessibleSubjects.find(
        (subjectDoc) =>
          String(subjectDoc._id) === String(subjectSelector) ||
          String(subjectDoc.sectionCode || "").toUpperCase() ===
            String(subjectSelector).toUpperCase() ||
          String(subjectDoc.subjectCode || "").toUpperCase() ===
            String(subjectSelector).toUpperCase()
      );

      if (!requestedSubject) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this subject leaderboard",
        });
      }

      selectedSubjectId = String(requestedSubject._id);
    } else if (userRole !== "admin" && availableSubjects.length > 0) {
      selectedSubjectId = availableSubjects[0]._id;
    }

    // Non-admins without subjects should receive an empty, valid response.
    if (userRole !== "admin" && availableSubjects.length === 0) {
      return res.json({
        success: true,
        data: {
          rankings: [],
          availableSubjects,
          selectedSubject: null,
        },
      });
    }

    // Import UserLevel model for cyber quest level data
    const UserLevel = await import("../models/UserLevel.js").then(
      (module) => module.default
    );

    // Build ranking filter (only students appear in leaderboard)
    const filter = { privilege: "student" };
    if (selectedSubjectId) {
      const selectedSubjectDoc = accessibleSubjects.find(
        (subjectDoc) => String(subjectDoc._id) === selectedSubjectId
      );
      const selectedStudentIds = (selectedSubjectDoc?.students || []).map(
        (studentId) => String(studentId)
      );
      filter._id = { $in: selectedStudentIds };
    }

    // Get users sorted by totalXP descending.
    // For a selected subject, return the full enrolled roster (not capped at top 100).
    let usersQuery = User.find(filter)
      .select("username fullName section profileImage gamification")
      .sort({ "gamification.totalXP": -1 });

    if (!selectedSubjectId) {
      usersQuery = usersQuery.limit(100);
    }

    const users = await usersQuery;

    // Enhance leaderboard data with cyber quest level points
    const enhancedLeaderboard = await Promise.all(
      users.map(async (user, index) => {
        // Get all UserLevel records for this user
        const userLevels = await UserLevel.find({ user: user._id });

        // Calculate total level-based points
        // Level bonus removed: keep fields for backward compatibility
        let levelPoints = 0; // always 0 now
        let totalCyberQuestXP = 0;
        let maxLevelReached = 0;
        let completedLevels = 0;

        userLevels.forEach((userLevel) => {
          totalCyberQuestXP += userLevel.totalXPEarned || 0;
          maxLevelReached = Math.max(
            maxLevelReached,
            userLevel.maxLevelReached
          );
          // completedLevels previously excluded level 1; retain same semantic
          completedLevels += Math.max(0, (userLevel.maxLevelReached || 1) - 1);
        });

        const globalXP = user.gamification?.totalXP || 0;
        const combinedScore = globalXP; // no additive level points

        return {
          _id: user._id,
          username: user.username,
          fullName: user.fullName,
          section: user.section,
          profileImage: constructProfileImageUrl(user.profileImage),
          totalXP: globalXP,
          level: user.gamification?.level || 1,
          // Enhanced fields for level-based progression
          cyberQuestXP: totalCyberQuestXP,
          levelPoints: levelPoints,
          combinedScore: combinedScore,
          maxLevelReached: maxLevelReached,
          completedLevels: completedLevels,
          totalSections: userLevels.length,
          rank: index + 1, // Will be recalculated after sorting
          badges: user.gamification?.badges || [],
          achievements: user.gamification?.achievements || [],
        };
      })
    );

    // Ensure rankings are highest-to-lowest XP for the selected subject roster.
    enhancedLeaderboard.sort(
      (a, b) => b.totalXP - a.totalXP || a.username.localeCompare(b.username)
    );
    enhancedLeaderboard.forEach((user, index) => {
      user.rank = index + 1;
    });

    res.json({
      success: true,
      data: {
        rankings: enhancedLeaderboard,
        availableSubjects,
        selectedSubject: selectedSubjectId || "all",
      },
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboard",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/users/level-progress
 * @desc    Get current user's level progression details
 * @access  Private
 */
router.get("/level-progress", protectRoute, async (req, res) => {
  try {
    // Import UserLevel model for cyber quest level data
    const UserLevel = await import("../models/UserLevel.js").then(
      (module) => module.default
    );

    // Get user basic info
    const user = await User.findById(req.user.id).select(
      "username fullName section profileImage gamification"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get all UserLevel records for this user
    const userLevels = await UserLevel.find({ user: req.user.id }).populate(
      "section",
      "name sectionCode"
    );

    // Calculate total level-based points
    let levelPoints = 0;
    let totalCyberQuestXP = 0;
    let maxLevelReached = 0;
    let completedLevels = 0;
    const sectionProgress = [];

    userLevels.forEach((userLevel) => {
      // Points per level completed (progressive system)
      let sectionLevelPoints = 0;
      for (let level = 1; level <= userLevel.maxLevelReached; level++) {
        sectionLevelPoints += level * 100;
      }
      levelPoints += sectionLevelPoints;

      totalCyberQuestXP += userLevel.totalXPEarned || 0;
      maxLevelReached = Math.max(maxLevelReached, userLevel.maxLevelReached);
      completedLevels += userLevel.maxLevelReached - 1; // -1 because level 1 is default

      sectionProgress.push({
        section: {
          _id: userLevel.section._id,
          name: userLevel.section.name,
          sectionCode: userLevel.section.sectionCode,
        },
        currentLevel: userLevel.currentLevel,
        maxLevelReached: userLevel.maxLevelReached,
        totalQuestsCompleted: userLevel.totalQuestsCompleted,
        totalXPEarned: userLevel.totalXPEarned,
        levelPoints: sectionLevelPoints,
        lastLevelCompletedAt: userLevel.lastLevelCompletedAt,
      });
    });

    // Level bonus removed: combined score == global XP
    const globalXP = user.gamification?.totalXP || 0;
    const combinedScore = globalXP;

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          fullName: user.fullName,
          section: user.section,
          profileImage: constructProfileImageUrl(user.profileImage),
        },
        progression: {
          globalLevel: user.gamification?.level || 1,
          globalXP: globalXP,
          cyberQuestXP: totalCyberQuestXP,
          levelPoints: levelPoints,
          combinedScore: combinedScore,
          maxLevelReached: maxLevelReached,
          completedLevels: completedLevels,
          totalSections: userLevels.length,
        },
        sectionProgress: sectionProgress,
        scoringInfo: {
          description: "Combined score equals Global XP (level bonus removed)",
          levelPointsFormula: null,
          example: null,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching level progress:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch level progress",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/users/cyberlearn-history
 * @desc    Get current authenticated user's CyberLearn/CyberQuest history
 * @access  Private
 */
router.get("/cyberlearn-history", protectRoute, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id)
      .select("analytics")
      .lean();

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const progress = await Progress.findOne({ user: req.user.id })
      .select("cyberQuestProgress")
      .lean();

    const cyberQuestIds = [
      ...new Set(
        (progress?.cyberQuestProgress || [])
          .map((entry) => entry?.cyberQuest?.toString())
          .filter(Boolean)
      ),
    ];

    const toNum = (value) => {
      if (typeof value === "number") return value;
      if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    const CyberQuest = await import("../models/CyberQuest.js").then(
      (m) => m.default
    );

    const quests = cyberQuestIds.length
      ? await CyberQuest.find({ _id: { $in: cyberQuestIds } })
          .select("_id title subject level difficulty questions")
          .lean()
      : [];

    const subjectIds = [
      ...new Set(
        quests.map((q) => q?.subject?.toString()).filter(Boolean)
      ),
    ];

    const subjects = subjectIds.length
      ? await Section.find({ _id: { $in: subjectIds } })
          .select("_id name")
          .lean()
      : [];

    const subjectNameMap = new Map(
      subjects.map((s) => [s._id.toString(), s.name || "N/A"])
    );
    const questMap = new Map(quests.map((q) => [q._id.toString(), q]));

    const history = [];

    for (const cqp of progress?.cyberQuestProgress || []) {
      const questId = cqp?.cyberQuest?.toString();
      if (!questId) continue;

      const quest = questMap.get(questId);
      const title = quest?.title || "Untitled CyberQuest";
      const level = toNum(quest?.level);
      const difficulty = quest?.difficulty || "medium";
      const totalFromQuest = Array.isArray(quest?.questions)
        ? quest.questions.length
        : null;
      const subjectName = quest?.subject
        ? subjectNameMap.get(quest.subject.toString()) || "N/A"
        : "N/A";

      if (Array.isArray(cqp.attempts) && cqp.attempts.length) {
        cqp.attempts.forEach((attempt, index) => {
          const totalQuestions =
            toNum(attempt?.totalQuestions) ??
            (Array.isArray(attempt?.answers) ? attempt.answers.length : null) ??
            totalFromQuest;
          const correctAnswers =
            toNum(attempt?.correctAnswers) ??
            (Array.isArray(attempt?.answers)
              ? attempt.answers.filter((ans) => ans?.isCorrect).length
              : null);
          const incorrectAnswers =
            toNum(attempt?.incorrectAnswers) ??
            (typeof totalQuestions === "number" &&
            typeof correctAnswers === "number"
              ? Math.max(totalQuestions - correctAnswers, 0)
              : null);

          history.push({
            id: `${questId}-${attempt?._id?.toString() || index}`,
            title,
            subjectName,
            level,
            attemptNumber: toNum(attempt?.attemptNumber) ?? index + 1,
            score: toNum(attempt?.score),
            totalQuestions,
            correctAnswers,
            incorrectAnswers,
            difficulty,
            completedAt:
              attempt?.completedAt || attempt?.startedAt || cqp?.lastAttemptAt,
          });
        });
      } else if (typeof toNum(cqp?.bestScore) === "number") {
        const totalQuestions = totalFromQuest;
        const derivedCorrect =
          typeof totalQuestions === "number"
            ? Math.max(
                Math.min(
                  Math.round((toNum(cqp.bestScore) / 100) * totalQuestions),
                  totalQuestions
                ),
                0
              )
            : null;
        history.push({
          id: `${questId}-best-${new Date(
            cqp?.lastAttemptAt || Date.now()
          ).getTime()}`,
          title,
          subjectName,
          level,
          attemptNumber: 1,
          score: toNum(cqp?.bestScore),
          totalQuestions,
          correctAnswers: derivedCorrect,
          incorrectAnswers:
            typeof totalQuestions === "number" && typeof derivedCorrect === "number"
              ? Math.max(totalQuestions - derivedCorrect, 0)
              : null,
          difficulty,
          completedAt: cqp?.lastAttemptAt,
        });
      }
    }

    if (!history.length && Array.isArray(currentUser.analytics?.gameLog)) {
      currentUser.analytics.gameLog.forEach((log, idx) => {
        if (log?.gameType !== "cyberQuest") return;
        const meta = log?.meta || {};
        const totalQuestions =
          toNum(meta.totalQuestions) ?? toNum(meta?.result?.totalQuestions);
        const correctAnswers =
          toNum(meta.correctAnswers) ?? toNum(meta?.result?.correctAnswers);
        const incorrectAnswers =
          toNum(meta.incorrectAnswers) ??
          (typeof totalQuestions === "number" &&
          typeof correctAnswers === "number"
            ? Math.max(totalQuestions - correctAnswers, 0)
            : null);

        history.push({
          id: `alog-cq-${idx}-${new Date(log?.completedAt || Date.now()).getTime()}`,
          title:
            log?.title ||
            meta?.title ||
            meta?.cyberQuestTitle ||
            meta?.questTitle ||
            "CyberQuest",
          subjectName:
            meta?.subjectName ||
            (typeof meta?.subject === "string" ? meta.subject : "N/A"),
          level:
            toNum(meta.level) ??
            toNum(meta.questLevel) ??
            toNum(meta?.result?.level) ??
            toNum(meta?.result?.questLevel),
          attemptNumber: toNum(meta.attemptNumber) ?? idx + 1,
          score:
            typeof log?.score === "number"
              ? log.score
              : toNum(meta.score) ?? toNum(meta?.result?.score),
          totalQuestions,
          correctAnswers,
          incorrectAnswers,
          difficulty: meta?.difficulty || "medium",
          completedAt: log?.completedAt,
        });
      });
    }

    history.sort(
      (a, b) =>
        new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
    );

    return res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching cyberlearn history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cyberlearn history",
      error: error.message,
    });
  }
});

/**
 * @route   PATCH /api/users/me/username
 * @desc    Update current authenticated user's username
 * @access  Private
 */
router.patch("/me/username", protectRoute, async (req, res) => {
  try {
    const rawUsername = typeof req.body?.username === "string" ? req.body.username : "";
    const nextUsername = rawUsername.trim().toLowerCase();

    if (!nextUsername) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    if (nextUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username should be at least 3 characters long",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.username === nextUsername) {
      return res.json({
        success: true,
        message: "Username is already up to date",
        user: {
          _id: user._id,
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          privilege: user.privilege,
          section: user.section,
          sections: user.sections,
          currentSection: user.currentSection,
          profileImage: constructProfileImageUrl(user.profileImage),
          profileImageTimestamp: Date.now(),
        },
      });
    }

    const usernameExists = await User.findOne({ username: nextUsername });
    if (usernameExists) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
      });
    }

    user.username = nextUsername;
    await user.save();

    return res.json({
      success: true,
      message: "Username updated successfully",
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        privilege: user.privilege,
        section: user.section,
        sections: user.sections,
        currentSection: user.currentSection,
        profileImage: constructProfileImageUrl(user.profileImage),
        profileImageTimestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error("Error updating current username:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update username",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/users/:id
 * * @desc    Get user by ID
 * @access  Private/instructor
 */
router.get(
  "/:id",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      if (error.kind === "ObjectId") {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private/instructor
 */
router.post(
  "/",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const {
        username,
        fullName,
        email,
        password,
        role,
        profilePicture,
        section,
        sendAccountNotification,
      } = req.body;

      const shouldSendAccountNotification = isTruthyFlag(sendAccountNotification);
      const resolvedPassword = shouldSendAccountNotification
        ? generateTemporaryPassword()
        : password;
      const privilege = role || "student"; // Map role to privilege for consistency
      const normalizedSection = String(section || "").trim();

      // Validation
      if (!username || !fullName || !email || !resolvedPassword) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide all required fields (username, fullName, email, password)",
        });
      }

      if (privilege === "student" && !normalizedSection) {
        return res.status(400).json({
          success: false,
          message: "Section is required for students",
        });
      }

      // Use same validation as auth routes
      if (resolvedPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password should be at least 8 characters long",
        });
      }

      if (username.length < 3) {
        return res.status(400).json({
          success: false,
          message: "Username should be at least 3 characters long",
        });
      }

      // Check if user exists
      const userExists = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
        ],
      });

      if (userExists) {
        if (userExists.email === email.toLowerCase()) {
          return res.status(400).json({
            success: false,
            message: "Email already in use",
          });
        } else {
          return res.status(400).json({
            success: false,
            message: "Username already taken",
          });
        }
      }

      // Handle profile picture upload if provided
      let imageFilename = "";
      if (profilePicture && profilePicture.startsWith("data:image")) {
        try {
          const uploadResponse = await localStorage.uploader.upload(
            profilePicture,
            "user-profiles"
          );
          // Extract filename from the secure_url (/uploads/user-profiles/filename.png)
          imageFilename = uploadResponse.secure_url.split("/").pop();
        } catch (localStorageError) {
          console.error("Error uploading profile picture:", localStorageError);
          // Continue without profile picture
        }
      }

      // Generate a Dicebear avatar if no profile picture is provided
      const profileImage =
        imageFilename ||
        `https://api.dicebear.com/9.x/bottts/svg?seed=${username}`;
      const userSection =
        privilege === "student" ? normalizedSection : "no_section";

      // Create new user
      const newUser = new User({
        username: username.toLowerCase(),
        fullName: fullName.trim(),
        email: email.toLowerCase(),
        password: resolvedPassword, // The User model will hash this automatically via middleware
        profileImage,
        section: userSection,
        privilege,
      });

      await newUser.save();

      // Initialize user progress like in auth routes
      await initializeUserProgress(newUser._id);

      // Generate token
      const token = generateToken(newUser._id, newUser.privilege);

      let accountNotification = {
        requested: shouldSendAccountNotification,
        sent: false,
      };

      if (shouldSendAccountNotification) {
        try {
          await sendNewAccountEmail({
            to: newUser.email,
            fullName: newUser.fullName,
            username: newUser.username,
            temporaryPassword: resolvedPassword,
          });
          accountNotification.sent = true;
        } catch (emailError) {
          console.error("Error sending account creation email:", emailError);
          accountNotification.error = emailError.message;
          // Fallback for admins so credentials are not lost when email delivery fails.
          accountNotification.temporaryPassword = resolvedPassword;
        }
      }

      // Don't return password
      const userResponse = {
        _id: newUser._id,
        username: newUser.username,
        fullName: newUser.fullName,
        email: newUser.email,
        section: newUser.section,
        privilege: newUser.privilege,
        profileImage: constructProfileImageUrl(newUser.profileImage),
        createdAt: newUser.createdAt,
      };

      res.status(201).json({
        success: true,
        message:
          shouldSendAccountNotification && accountNotification.sent
            ? "User created successfully. Account email sent."
            : "User created successfully",
        user: userResponse,
        token,
        accountNotification,
      });
    } catch (error) {
      // Enhanced error logging for deployment debugging
      console.error("Error creating user:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });
      res.status(500).json({
        success: false,
        message: "Failed to create user",
        error: error.message, // This will now show in frontend
      });
    }
  }
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private/instructor
 */
router.put(
  "/:id",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { username, email, password, role, profilePicture } = req.body;
      const userId = req.params.id;

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if username or email is taken (by another user)
      if (username && username !== user.username) {
        // Validation check for username length
        if (username.length < 3) {
          return res.status(400).json({
            success: false,
            message: "Username should be at least 3 characters long",
          });
        }

        const usernameExists = await User.findOne({
          username: username.toLowerCase(),
        });
        if (usernameExists) {
          return res.status(400).json({
            success: false,
            message: "Username already taken",
          });
        }
        user.username = username.toLowerCase();
      }

      if (email && email !== user.email) {
        const emailExists = await User.findOne({ email: email.toLowerCase() });
        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: "Email already in use",
          });
        }
        user.email = email.toLowerCase();
      }

      // Update role/privilege if provided
      if (role) {
        user.privilege = role; // Use privilege field for consistency
      }

      // Update password if provided
      if (password) {
        // Password length validation
        if (password.length < 8) {
          return res.status(400).json({
            success: false,
            message: "Password should be at least 8 characters long",
          });
        }

        // Let the User model handle the password hashing
        user.password = password;
      }

      // Handle profile picture update
      if (profilePicture) {
        // Check if it's a new image (not just the same URL)
        if (profilePicture.startsWith("data:image")) {
          // Delete old image from local storage if exists
          if (user.profileImage && !user.profileImage.startsWith("http")) {
            // Only delete if it's a local filename (not external URL)
            const publicId = localStorage.extractPublicIdFromUrl(
              `/uploads/user-profiles/${user.profileImage}`
            );
            if (publicId) {
              try {
                await localStorage.uploader.destroy(publicId);
              } catch (localStorageError) {
                console.error(
                  "Error deleting old profile picture:",
                  localStorageError
                );
                // Continue with update even if deletion fails
              }
            }
          }

          // Upload new profile picture
          try {
            const uploadResponse = await localStorage.uploader.upload(
              profilePicture,
              "user-profiles"
            );
            // Extract filename from the secure_url (/uploads/user-profiles/filename.png)
            const filename = uploadResponse.secure_url.split("/").pop();
            user.profileImage = filename;
          } catch (localStorageError) {
            console.error(
              "Error uploading profile picture:",
              localStorageError
            );
            // Continue without updating profile picture
          }
        } else if (
          profilePicture !== constructProfileImageUrl(user.profileImage)
        ) {
          // It's a URL but different from current one
          user.profileImage = profilePicture;
        }
      }

      await user.save();

      // Generate new token with updated info
      const token = generateToken(user._id, user.privilege);

      // Return updated user without password
      const userResponse = {
        _id: user._id,
        username: user.username,
        email: user.email,
        privilege: user.privilege,
        profileImage: constructProfileImageUrl(user.profileImage),
        updatedAt: user.updatedAt,
      };

      res.json({
        success: true,
        message: "User updated successfully",
        user: userResponse,
        token,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update user",
        error: error.message,
      });
    }
  }
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (hard delete). If user not archived, performs soft delete first unless force=true.
 * @access  Private/instructor
 */
router.delete(
  "/:id",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const userId = req.params.id;

      // Check if trying to delete self
      if (userId === req.user.id) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete your own account",
        });
      }

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const force = req.query.force === "true";
      if (!user.isArchived && !force) {
        user.isArchived = true;
        user.archivedAt = new Date();
        await user.save();
        return res.json({
          success: true,
          message:
            "User archived (soft deleted). Use force=true to hard delete.",
          archived: true,
        });
      }

      // HARD DELETE PATH
      // Delete profile picture from local storage if exists
      if (user.profileImage && !user.profileImage.startsWith("http")) {
        const publicId = localStorage.extractPublicIdFromUrl(
          `/uploads/user-profiles/${user.profileImage}`
        );
        if (publicId) {
          try {
            await localStorage.uploader.destroy(publicId);
          } catch (localStorageError) {
            console.error("Error deleting profile picture:", localStorageError);
          }
        }
      }

      await Progress.deleteMany({ user: userId });
      await User.findByIdAndDelete(userId);

      res.json({
        success: true,
        message: "User permanently deleted",
        archived: !!user.isArchived,
        hardDeleted: true,
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete user",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/users/:id/archive
 * @desc    Archive (soft delete) a user
 * @access  Private/instructor
 */
router.post(
  "/:id/archive",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const userId = req.params.id;
      if (userId === req.user.id) {
        return res.status(400).json({
          success: false,
          message: "You cannot archive your own account",
        });
      }
      const user = await User.findById(userId);
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      if (user.isArchived) {
        return res.json({
          success: true,
          message: "User already archived",
          archived: true,
        });
      }
      user.isArchived = true;
      user.archivedAt = new Date();
      await user.save();
      res.json({
        success: true,
        message: "User archived successfully",
        archived: true,
      });
    } catch (error) {
      console.error("Error archiving user:", error);
      res.status(500).json({
        success: false,
        message: "Failed to archive user",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/users/:id/unarchive
 * @desc    Unarchive a user
 * @access  Private/instructor
 */
router.post(
  "/:id/unarchive",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await User.findById(userId);
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      if (!user.isArchived) {
        return res.json({
          success: true,
          message: "User is not archived",
          archived: false,
        });
      }
      user.isArchived = false;
      user.archivedAt = null;
      await user.save();
      res.json({
        success: true,
        message: "User unarchived successfully",
        archived: false,
      });
    } catch (error) {
      console.error("Error unarchiving user:", error);
      res.status(500).json({
        success: false,
        message: "Failed to unarchive user",
        error: error.message,
      });
    }
  }
);

// Helper function to initialize user progress - Same as in authRoutes
async function initializeUserProgress(userId) {
  try {
    const existingProgress = await Progress.findOne({ user: userId });
    if (existingProgress) {
      return existingProgress;
    }

    // Now uses static imports instead of dynamic
    const firstModule = await Module.findOne({ order: 1 });

    if (!firstModule) {
      console.log("No modules found - progress not initialized");
      return null;
    }

    const firstQuiz = await Quiz.findOne({
      module: firstModule._id,
      order: 1,
    }).sort({ order: 1 });

    const progress = new Progress({
      user: userId,
      globalProgress: {
        currentModule: firstModule._id,
        unlockedModules: [firstModule._id],
        completedModules: [],
      },
      moduleProgress: [
        {
          module: firstModule._id,
          status: "unlocked",
          currentQuiz: firstQuiz?._id,
          unlockedQuizzes: firstQuiz ? [firstQuiz._id] : [],
          completedQuizzes: [],
        },
      ],
    });

    await progress.save();
    console.log(`Progress initialized for user ${userId}`);
    return progress;
  } catch (error) {
    // Don't let progress initialization failure block user creation
    console.error("Error initializing user progress:", error);
    return null;
  }
}

export default router;
