// routes/progressRoutes.js
import express from "express";
import Progress from "../models/Progress.js";
import Module from "../models/Module.js";
import Quiz from "../models/Quiz.js";
import User from "../models/Users.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  logActivity,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  extractRequestInfo,
} from "../lib/auditLogger.js";

const router = express.Router();

// Initialize user progress (call this when user first registers)
router.post("/initialize", protectRoute, async (req, res) => {
  try {
    console.log("🚀 Initializing progress for user:", req.user.id);

    const existingProgress = await Progress.findOne({ user: req.user.id });
    if (existingProgress) {
      console.log("✅ Progress already exists");
      return res.json(existingProgress);
    }

    // Find first module
    const firstModule = await Module.findOne({ order: 1 });
    if (!firstModule) {
      return res.status(404).json({ message: "No modules found" });
    }

    console.log("🎯 First module found:", firstModule.title);

    // ✅ Find ALL modules and create progress for each
    const allModules = await Module.find().sort({ order: 1 });
    const moduleProgressArray = [];

    for (const module of allModules) {
      // ✅ Get ALL quizzes in this module (not just first one)
      const allQuizzesInModule = await Quiz.find({
        module: module._id,
      }).sort({ order: 1 });

      const firstQuizInModule = allQuizzesInModule.find((q) => q.order === 1);

      console.log(
        `📚 Module: ${module.title}, Quizzes: ${
          allQuizzesInModule.length
        }, First Quiz: ${firstQuizInModule?.title || "None"}`
      );

      const moduleProgress = {
        module: module._id,
        status:
          module._id.toString() === firstModule._id.toString()
            ? "unlocked"
            : "locked",
        currentQuiz: firstQuizInModule?._id,
        // ✅ For first module, unlock first quiz. For others, still add first quiz but mark module as locked
        unlockedQuizzes: firstQuizInModule ? [firstQuizInModule._id] : [],
        completedQuizzes: [],
        totalXP: 0,
        completionPercentage: 0,
      };

      moduleProgressArray.push(moduleProgress);
    }

    const progressData = {
      user: req.user.id,
      globalProgress: {
        currentModule: firstModule._id,
        unlockedModules: [firstModule._id],
        completedModules: [],
      },
      moduleProgress: moduleProgressArray,
      quizAttempts: [],
    };

    const progress = new Progress(progressData);
    await progress.save();

    console.log("✅ Progress initialized successfully");
    console.log("📊 Progress details:", {
      modules: moduleProgressArray.length,
      unlockedModules: 1,
      firstQuizzes: moduleProgressArray.filter(
        (mp) => mp.unlockedQuizzes.length > 0
      ).length,
    });

    res.json(progress);
  } catch (error) {
    console.error("❌ Error in initialize:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get all modules with lock status
router.get("/modules", protectRoute, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get the user to check their section and role
    const User = await import("../models/Users.js").then(
      (module) => module.default
    );
    const user = await User.findById(userId).select("section privilege");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let modules;

    // If user is admin, return all modules
    if (user.privilege === "admin") {
      modules = await Module.find()
        .select(
          "title description category image order isActive totalQuizzes lastAccessed"
        )
        .sort({ order: 1 });
    }
    // If user is instructor, only return modules they created
    else if (user.privilege === "instructor") {
      modules = await Module.find({ createdBy: userId })
        .select(
          "title description category image order isActive totalQuizzes lastAccessed"
        )
        .sort({ order: 1 });
    }
    // If user is a student, only return modules created by their section's instructor
    else if (user.privilege === "student" && user.section !== "no_section") {
      // Find the section to get instructor
      const Section = await import("../models/Section.js").then(
        (module) => module.default
      );
      const section = await Section.findOne({
        sectionCode: user.section,
      }).populate("instructor");

      if (!section) {
        return res.status(200).json([]);
      }

      // Find all modules where createdBy is the section's instructor
      modules = await Module.find({ createdBy: section.instructor._id })
        .select(
          "title description category image order isActive totalQuizzes lastAccessed"
        )
        .sort({ order: 1 });
    }
    // If no section or not a student, return empty array
    else {
      return res.status(200).json([]);
    }

    // Get user progress
    const Progress = await import("../models/Progress.js").then(
      (module) => module.default
    );
    const userProgress = await Progress.findOne({ user: userId });

    // Enhance modules with unlock status and completion status
    const enhancedModules = modules.map((module, index) => {
      const moduleObj = module.toObject();

      // First module or instructor always unlocked
      if (
        index === 0 ||
        user.privilege === "instructor" ||
        user.privilege === "admin"
      ) {
        moduleObj.isUnlocked = true;
      } else if (!userProgress) {
        moduleObj.isUnlocked = false;
      } else {
        // Check if this module is in the unlocked modules list
        moduleObj.isUnlocked = userProgress.globalProgress.unlockedModules.some(
          (id) => id.toString() === module._id.toString()
        );
      }

      // Check if module is completed
      if (userProgress && userProgress.globalProgress.completedModules) {
        moduleObj.isCompleted =
          userProgress.globalProgress.completedModules.some(
            (item) => item.module.toString() === module._id.toString()
          );
      } else {
        moduleObj.isCompleted = false;
      }

      // Check if module is current
      if (userProgress && userProgress.globalProgress.currentModule) {
        moduleObj.isCurrent =
          userProgress.globalProgress.currentModule.toString() ===
          module._id.toString();
      } else {
        moduleObj.isCurrent = index === 0;
      }

      return moduleObj;
    });

    res.json(enhancedModules);

    // Log student progress view
    if (user.privilege === "student") {
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.privilege,
        action: AUDIT_ACTIONS.STUDENT_PROGRESS_VIEW,
        resource: AUDIT_RESOURCES.MODULE,
        details: {
          accessType: "modules_progress",
          modulesCount: enhancedModules.length,
          unlockedModules: enhancedModules.filter((m) => m.isUnlocked).length,
          completedModules: enhancedModules.filter((m) => m.isCompleted).length,
          section: user.section,
        },
        ...requestInfo,
      });
    }
  } catch (error) {
    console.error("Error fetching modules with progress:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch modules with progress",
      error: error.message,
    });
  }
});

// Get quizzes for a module with lock status
router.get("/module/:moduleId/quizzes", protectRoute, async (req, res) => {
  try {
    const progress = await Progress.findOne({ user: req.user.id });
    const { moduleId } = req.params;

    console.log("📚 Fetching quizzes for module:", moduleId);

    const isinstructor =
      req.user.privilege === "instructor" || req.user.privilege === "admin";

    // instructor can access any module, students need unlock check
    if (!isinstructor && progress && !progress.isModuleUnlocked(moduleId)) {
      console.log("🔒 Module is locked for student");
      return res.status(403).json({ message: "Module is locked" });
    }

    // Get all quizzes in the module
    const quizzes = await Quiz.find({ module: moduleId }).sort({ order: 1 });

    const moduleProgress = progress?.moduleProgress.find(
      (mp) => mp.module.toString() === moduleId
    );

    const quizzesWithStatus = quizzes.map((quiz) => {
      let isUnlocked;
      let isCompleted = false;
      let isPassed = false;
      let bestScore = null;
      let attempts = 0;

      if (isinstructor) {
        // instructor has access to all quizzes
        isUnlocked = true;
      } else if (quiz.order === 1) {
        // ✅ ALWAYS unlock the first quiz
        isUnlocked = true;
      } else if (progress) {
        // ✅ Check if quiz is unlocked
        isUnlocked = progress.isQuizUnlockedSync(quiz._id, quiz.order);
      } else {
        isUnlocked = false;
      }

      // ✅ Get completion status for students
      if (!isinstructor && moduleProgress) {
        const completion = moduleProgress.completedQuizzes.find(
          (cq) => cq.quiz.toString() === quiz._id.toString()
        );

        if (completion) {
          isCompleted = true;
          isPassed = completion.passed || false;
          bestScore = completion.bestScore;
          attempts = completion.attempts;
        }
      }

      const isCurrent = isinstructor
        ? false
        : moduleProgress?.currentQuiz?.toString() === quiz._id.toString();

      console.log(
        `📝 Quiz: ${quiz.title}, Order: ${quiz.order}, Unlocked: ${isUnlocked}, Completed: ${isCompleted}, Passed: ${isPassed}`
      );

      return {
        ...quiz.toObject(),
        isUnlocked,
        isCompleted,
        isPassed, // ✅ Add passed status
        isCurrent,
        bestScore,
        attempts, // ✅ Add attempt count
      };
    });

    res.json(quizzesWithStatus);
  } catch (error) {
    console.error("❌ Error fetching module quizzes:", error);
    res.status(500).json({ message: error.message });
  }
});

// Submit quiz attempt
router.post("/quiz/:quizId/complete", protectRoute, async (req, res) => {
  try {
    const { quizId } = req.params;
    const attemptData = req.body;

    console.log("📝 Quiz submission received:", {
      quizId,
      userId: req.user.id,
      userPrivilege: req.user.privilege,
      score: attemptData.score,
    });

    // ✅ Check if user is instructor
    const isinstructor =
      req.user.privilege === "instructor" || req.user.privilege === "admin";

    if (isinstructor) {
      console.log("👑 instructor quiz submission - no progress tracking");
      return res.json({
        message: "Quiz completed successfully (instructor mode)",
        isinstructor: true,
      });
    }

    // ✅ For students, handle progress tracking
    let progress = await Progress.findOne({ user: req.user.id });

    if (!progress) {
      console.log("❌ Student progress not found");
      return res.status(404).json({
        message:
          "User progress not found. Please initialize your progress first.",
      });
    }

    // ✅ Get quiz details for better debugging
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      console.log("❌ Quiz not found:", quizId);
      return res.status(404).json({ message: "Quiz not found" });
    }

    console.log(
      `🎯 Quiz details: ${quiz.title}, Order: ${quiz.order}, Module: ${quiz.module}`
    );

    // ✅ Check module unlock first
    const isModuleUnlocked = progress.isModuleUnlocked(quiz.module);
    console.log(`📚 Module unlock status: ${isModuleUnlocked}`);

    if (!isModuleUnlocked) {
      console.log("🔒 Module is locked for student");
      return res.status(403).json({ message: "Module is locked" });
    }

    // ✅ Check quiz unlock
    const isQuizUnlocked = await progress.isQuizUnlockedAsync(quizId);
    console.log(`🎯 Quiz unlock status: ${isQuizUnlocked}`);

    if (!isQuizUnlocked) {
      console.log("🔒 Quiz is locked for student");

      // ✅ Additional debugging info
      const moduleProgress = progress.moduleProgress.find(
        (mp) => mp.module.toString() === quiz.module.toString()
      );

      console.log("📊 Module progress details:", {
        moduleId: quiz.module,
        status: moduleProgress?.status,
        unlockedQuizzes: moduleProgress?.unlockedQuizzes?.length || 0,
        currentQuiz: moduleProgress?.currentQuiz,
      });

      return res.status(403).json({
        message: "Quiz is locked",
        debug: {
          quizOrder: quiz.order,
          moduleStatus: moduleProgress?.status,
          unlockedQuizzes: moduleProgress?.unlockedQuizzes?.length || 0,
        },
      });
    }

    console.log("✅ Quiz is unlocked, updating progress...");

    // ✅ Update progress for students
    await progress.completeQuiz(quizId, attemptData);
    await progress.save();

    // ✅ Check if the quiz was passed for audit logging
    const hasPassed = (attemptData.score || 0) >= (quiz.passingScore || 70);

    // ✅ Log quiz completion for analytics (correct helper: logActivity)
    await logActivity({
      userId: req.user.id,
      username: req.user.username,
      userRole: req.user.privilege,
      action: AUDIT_ACTIONS.QUIZ_COMPLETE,
      resource: AUDIT_RESOURCES.QUIZ,
      resourceId: quiz._id,
      details: {
        quizId: quiz._id,
        quizTitle: quiz.title,
        moduleId: quiz.module,
        score: attemptData.score,
        passingScore: quiz.passingScore,
        passed: hasPassed,
        difficulty: quiz.difficulty || "medium",
        timeSpent: attemptData.timeSpent || 0,
      },
      ...extractRequestInfo(req),
      success: true,
    });

    // For students, fetch and return XP information
    if (!isInstructor) {
      const user = await User.findById(req.user.id);
      let xpEarned = 0;
      let levelUp = false;

      if (user) {
        // XP calculation logic...
        xpEarned = Math.floor(
          (baseXP + scoreBonus + passingBonus) * difficultyMultiplier[difficulty]
        );
        user.gamification.totalXP = oldXP + xpEarned;
        user.gamification.level = newLevel;
        await user.save();
      }

      // Return XP information in response
      return res.json({
        message: "Quiz completed successfully",
        score: attemptData.score,
        passingScore: quiz.passingScore,
        passed: hasPassed,
        xpEarned: xpEarned,
        totalXP: user ? user.gamification.totalXP : 0,
        currentLevel: user ? user.gamification.level : 1,
        levelUp: levelUp,
        unlockedContent: hasPassed
          ? "Next quiz/module unlocked!"
          : "Complete this quiz to unlock next content",
        isinstructor: false,
      });
    }
  } catch (error) {
    console.error("❌ Error in quiz completion:", error);
    res.status(500).json({
      message: "Failed to submit quiz",
      error: error.message,
    });
  }
});

// In your progressRoutes.js - Add debug route (temporary)
router.get("/debug/:userId", protectRoute, async (req, res) => {
  try {
    const progress = await Progress.findOne({ user: req.params.userId })
      .populate("globalProgress.unlockedModules")
      .populate("moduleProgress.module")
      .populate("moduleProgress.unlockedQuizzes");

    if (!progress) {
      return res.json({ message: "No progress found" });
    }

    const debugInfo = {
      user: progress.user,
      globalProgress: {
        currentModule: progress.globalProgress.currentModule,
        unlockedModules: progress.globalProgress.unlockedModules.length,
        completedModules: progress.globalProgress.completedModules.length,
      },
      moduleProgress: progress.moduleProgress.map((mp) => ({
        module: mp.module.title,
        status: mp.status,
        unlockedQuizzes: mp.unlockedQuizzes.length,
        completedQuizzes: mp.completedQuizzes.length,
      })),
    };

    res.json(debugInfo);
  } catch (error) {
    console.error("Error in debug route:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get user's completed quizzes with questions for the game
router.get("/completed-quizzes", protectRoute, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("🎮 Fetching completed quizzes for user:", userId);

    // Find user progress
    const progress = await Progress.findOne({ user: userId });
    if (!progress) {
      console.log("❌ User progress not found");
      return res.status(404).json({ message: "User progress not found" });
    }

    // Get all completed/passed quizzes across all modules
    const completedQuizIds = [];

    // Iterate through all module progress
    progress.moduleProgress.forEach((module) => {
      module.completedQuizzes.forEach((quiz) => {
        // Include quiz if it's ever been passed or best score >= 70
        if (
          (quiz.everPassed || quiz.passed || quiz.bestScore >= 70) &&
          quiz.quiz
        ) {
          completedQuizIds.push(quiz.quiz);
        }
      });
    });

    console.log(`📊 Found ${completedQuizIds.length} completed quizzes`);

    if (completedQuizIds.length === 0) {
      return res.json([]);
    }

    // Fetch the actual quiz data with questions
    const completedQuizzes = await Quiz.find({
      _id: { $in: completedQuizIds },
    }).populate("questions");

    console.log(
      `✅ Successfully fetched ${completedQuizzes.length} quizzes with questions`
    );

    // Return the quizzes with their questions
    res.json(completedQuizzes);
  } catch (error) {
    console.error("❌ Error fetching completed quizzes:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @route   POST /api/progress/complete-module
 * @desc    Mark a module as completed and award XP
 * @access  Private
 */
router.post("/complete-module", protectRoute, async (req, res) => {
  try {
    const { moduleId, score, questType = "module" } = req.body;

    console.log("📝 Module completion received:", {
      moduleId,
      userId: req.user.id,
      userPrivilege: req.user.privilege,
      score: score,
      questType: questType,
    });

    // Check if user is instructor
    const isInstructor =
      req.user.privilege === "instructor" || req.user.privilege === "admin";

    if (isInstructor) {
      console.log("👑 Instructor module completion - no progress tracking");
      return res.json({
        message: "Module completed successfully (instructor mode)",
        isInstructor: true,
      });
    }

    // Get module details for XP calculation
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }

    // Update user XP and level
    const user = await User.findById(req.user.id);
    let xpEarned = 0;
    let levelUp = false;

    if (user) {
      // Calculate XP based on module difficulty and performance
      const difficultyMultiplier = {
        easy: 1.0,
        medium: 1.5,
        hard: 2.0,
      };

      const difficulty = module.difficulty || "medium";
      const baseXP = questType === "cyber-quest" ? 100 : 80; // More XP for cyber quests
      const scoreBonus = Math.floor((score || 0) * 2); // 2 XP per point scored
      const completionBonus = 50; // Bonus for completing module

      xpEarned = Math.floor(
        (baseXP + scoreBonus + completionBonus) *
          difficultyMultiplier[difficulty]
      );

      // Add XP to user's total
      const oldXP = user.gamification.totalXP || 0;
      const oldLevel = user.gamification.level || 1;

      user.gamification.totalXP = oldXP + xpEarned;
      user.gamification.level = Math.floor(user.gamification.totalXP / 500) + 1;

      levelUp = user.gamification.level > oldLevel;

      await user.save();

      console.log(
        `🎯 Module XP Update: +${xpEarned} XP (Total: ${oldXP} → ${
          user.gamification.totalXP
        }), Level: ${oldLevel} → ${user.gamification.level}${
          levelUp ? " 🎉 LEVEL UP!" : ""
        }`
      );
    }

    // Update progress tracking
    let progress = await Progress.findOne({ user: req.user.id });
    if (progress) {
      // Mark module as completed if not already
      const existingCompletion = progress.globalProgress.completedModules.find(
        (cm) => cm.module.toString() === moduleId
      );

      if (!existingCompletion) {
        progress.globalProgress.completedModules.push({
          module: moduleId,
          completedAt: new Date(),
          finalScore: score || 0,
        });
        await progress.save();
      }
    }

    res.json({
      message: "Module completed successfully",
      score: score,
      xpEarned: xpEarned,
      totalXP: user ? user.gamification.totalXP : 0,
      currentLevel: user ? user.gamification.level : 1,
      levelUp: levelUp,
      isInstructor: false,
    });
  } catch (error) {
    console.error("❌ Error in module completion:", error);
    res.status(500).json({
      message: "Failed to complete module",
      error: error.message,
    });
  }
});

export default router;
