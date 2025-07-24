// routes/progressRoutes.js
import express from "express";
import Progress from "../models/Progress.js";
import Module from "../models/Module.js";
import Quiz from "../models/Quiz.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Initialize user progress (call this when user first registers)
router.post("/initialize", protectRoute, async (req, res) => {
  try {
    console.log('🚀 Initializing progress for user:', req.user.id);
    
    const existingProgress = await Progress.findOne({ user: req.user.id });
    if (existingProgress) {
      console.log('✅ Progress already exists');
      return res.json(existingProgress);
    }
    
    // Find first module
    const firstModule = await Module.findOne({ order: 1 });
    if (!firstModule) {
      return res.status(404).json({ message: "No modules found" });
    }
    
    console.log('🎯 First module found:', firstModule.title);
    
    // ✅ Find ALL modules and create progress for each
    const allModules = await Module.find().sort({ order: 1 });
    const moduleProgressArray = [];
    
    for (const module of allModules) {
      // ✅ Get ALL quizzes in this module (not just first one)
      const allQuizzesInModule = await Quiz.find({ 
        module: module._id 
      }).sort({ order: 1 });
      
      const firstQuizInModule = allQuizzesInModule.find(q => q.order === 1);
      
      console.log(`📚 Module: ${module.title}, Quizzes: ${allQuizzesInModule.length}, First Quiz: ${firstQuizInModule?.title || 'None'}`);
      
      const moduleProgress = {
        module: module._id,
        status: module._id.toString() === firstModule._id.toString() ? 'unlocked' : 'locked',
        currentQuiz: firstQuizInModule?._id,
        // ✅ For first module, unlock first quiz. For others, still add first quiz but mark module as locked
        unlockedQuizzes: firstQuizInModule ? [firstQuizInModule._id] : [],
        completedQuizzes: [],
        totalXP: 0,
        completionPercentage: 0
      };
      
      moduleProgressArray.push(moduleProgress);
    }
    
    const progressData = {
      user: req.user.id,
      globalProgress: {
        currentModule: firstModule._id,
        unlockedModules: [firstModule._id],
        completedModules: []
      },
      moduleProgress: moduleProgressArray,
      quizAttempts: []
    };
    
    const progress = new Progress(progressData);
    await progress.save();
    
    console.log('✅ Progress initialized successfully');
    console.log('📊 Progress details:', {
      modules: moduleProgressArray.length,
      unlockedModules: 1,
      firstQuizzes: moduleProgressArray.filter(mp => mp.unlockedQuizzes.length > 0).length
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
    const progress = await Progress.findOne({ user: req.user.id });
    const modules = await Module.find().sort({ order: 1 });
    
    // ✅ Check if user is admin
    const isAdmin = req.user.privilege === 'admin' || req.user.privilege === 'superadmin';
    
    const modulesWithStatus = modules.map(module => ({
      ...module.toObject(),
      // Admin has access to all modules, students follow progress rules
      isUnlocked: isAdmin ? true : (progress ? progress.isModuleUnlocked(module._id) : module.order === 1),
      isCompleted: isAdmin ? false : (progress ? progress.globalProgress.completedModules.some(
        cm => cm.module.toString() === module._id.toString()
      ) : false),
      isCurrent: isAdmin ? false : (progress ? progress.globalProgress.currentModule?.toString() === module._id.toString() : false)
    }));
    
    res.json(modulesWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get quizzes for a module with lock status
router.get("/module/:moduleId/quizzes", protectRoute, async (req, res) => {
  try {
    const progress = await Progress.findOne({ user: req.user.id });
    const { moduleId } = req.params;
    
    console.log('📚 Fetching quizzes for module:', moduleId);
    
    const isAdmin = req.user.privilege === 'admin' || req.user.privilege === 'superadmin';
    
    // Admin can access any module, students need unlock check
    if (!isAdmin && progress && !progress.isModuleUnlocked(moduleId)) {
      console.log('🔒 Module is locked for student');
      return res.status(403).json({ message: "Module is locked" });
    }
    
    // Get all quizzes in the module
    const quizzes = await Quiz.find({ module: moduleId }).sort({ order: 1 });
    
    const moduleProgress = progress?.moduleProgress.find(mp => mp.module.toString() === moduleId);
    
    const quizzesWithStatus = quizzes.map(quiz => {
      let isUnlocked;
      let isCompleted = false;
      let isPassed = false;
      let bestScore = null;
      let attempts = 0;
      
      if (isAdmin) {
        // Admin has access to all quizzes
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
      if (!isAdmin && moduleProgress) {
        const completion = moduleProgress.completedQuizzes.find(
          cq => cq.quiz.toString() === quiz._id.toString()
        );
        
        if (completion) {
          isCompleted = true;
          isPassed = completion.passed || false;
          bestScore = completion.bestScore;
          attempts = completion.attempts;
        }
      }
      
      const isCurrent = isAdmin ? false : (moduleProgress?.currentQuiz?.toString() === quiz._id.toString());
      
      console.log(`📝 Quiz: ${quiz.title}, Order: ${quiz.order}, Unlocked: ${isUnlocked}, Completed: ${isCompleted}, Passed: ${isPassed}`);
      
      return {
        ...quiz.toObject(),
        isUnlocked,
        isCompleted,
        isPassed, // ✅ Add passed status
        isCurrent,
        bestScore,
        attempts // ✅ Add attempt count
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
    
    console.log('📝 Quiz submission received:', {
      quizId,
      userId: req.user.id,
      userPrivilege: req.user.privilege,
      score: attemptData.score
    });
    
    // ✅ Check if user is admin
    const isAdmin = req.user.privilege === 'admin' || req.user.privilege === 'superadmin';
    
    if (isAdmin) {
      console.log('👑 Admin quiz submission - no progress tracking');
      return res.json({
        message: "Quiz completed successfully (Admin mode)",
        isAdmin: true
      });
    }
    
    // ✅ For students, handle progress tracking
    let progress = await Progress.findOne({ user: req.user.id });
    
    if (!progress) {
      console.log('❌ Student progress not found');
      return res.status(404).json({ 
        message: "User progress not found. Please initialize your progress first." 
      });
    }
    
    // ✅ Get quiz details for better debugging
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      console.log('❌ Quiz not found:', quizId);
      return res.status(404).json({ message: "Quiz not found" });
    }
    
    console.log(`🎯 Quiz details: ${quiz.title}, Order: ${quiz.order}, Module: ${quiz.module}`);
    
    // ✅ Check module unlock first
    const isModuleUnlocked = progress.isModuleUnlocked(quiz.module);
    console.log(`📚 Module unlock status: ${isModuleUnlocked}`);
    
    if (!isModuleUnlocked) {
      console.log('🔒 Module is locked for student');
      return res.status(403).json({ message: "Module is locked" });
    }
    
    // ✅ Check quiz unlock
    const isQuizUnlocked = await progress.isQuizUnlockedAsync(quizId);
    console.log(`🎯 Quiz unlock status: ${isQuizUnlocked}`);
    
    if (!isQuizUnlocked) {
      console.log('🔒 Quiz is locked for student');
      
      // ✅ Additional debugging info
      const moduleProgress = progress.moduleProgress.find(
        mp => mp.module.toString() === quiz.module.toString()
      );
      
      console.log('📊 Module progress details:', {
        moduleId: quiz.module,
        status: moduleProgress?.status,
        unlockedQuizzes: moduleProgress?.unlockedQuizzes?.length || 0,
        currentQuiz: moduleProgress?.currentQuiz
      });
      
      return res.status(403).json({ 
        message: "Quiz is locked",
        debug: {
          quizOrder: quiz.order,
          moduleStatus: moduleProgress?.status,
          unlockedQuizzes: moduleProgress?.unlockedQuizzes?.length || 0
        }
      });
    }
    
    console.log('✅ Quiz is unlocked, updating progress...');
    
    // ✅ Update progress for students
    await progress.completeQuiz(quizId, attemptData);
    await progress.save();
    
    // ✅ Return detailed response
    const hasPassed = (attemptData.score || 0) >= (quiz.passingScore || 70);
    
    res.json({
      message: "Quiz completed successfully",
      score: attemptData.score,
      passingScore: quiz.passingScore,
      passed: hasPassed,
      unlockedContent: hasPassed ? "Next quiz/module unlocked!" : "Complete this quiz to unlock next content",
      isAdmin: false
    });
  } catch (error) {
    console.error('❌ Error in quiz completion:', error);
    res.status(500).json({ 
      message: "Failed to submit quiz",
      error: error.message 
    });
  }
});

// In your progressRoutes.js - Add debug route (temporary)
router.get("/debug/:userId", protectRoute, async (req, res) => {
  try {
    const progress = await Progress.findOne({ user: req.params.userId })
      .populate('globalProgress.unlockedModules')
      .populate('moduleProgress.module')
      .populate('moduleProgress.unlockedQuizzes');
    
    if (!progress) {
      return res.json({ message: "No progress found" });
    }
    
    const debugInfo = {
      user: progress.user,
      globalProgress: {
        currentModule: progress.globalProgress.currentModule,
        unlockedModules: progress.globalProgress.unlockedModules.length,
        completedModules: progress.globalProgress.completedModules.length
      },
      moduleProgress: progress.moduleProgress.map(mp => ({
        module: mp.module.title,
        status: mp.status,
        unlockedQuizzes: mp.unlockedQuizzes.length,
        completedQuizzes: mp.completedQuizzes.length
      }))
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
    
    console.log('🎮 Fetching completed quizzes for user:', userId);
    
    // Find user progress
    const progress = await Progress.findOne({ user: userId });
    if (!progress) {
      console.log('❌ User progress not found');
      return res.status(404).json({ message: "User progress not found" });
    }
    
    // Get all completed/passed quizzes across all modules
    const completedQuizIds = [];
    
    // Iterate through all module progress
    progress.moduleProgress.forEach(module => {
      module.completedQuizzes.forEach(quiz => {
        // Include quiz if it's ever been passed or best score >= 70
        if ((quiz.everPassed || quiz.passed || quiz.bestScore >= 70) && quiz.quiz) {
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
      _id: { $in: completedQuizIds }
    }).populate('questions');
    
    console.log(`✅ Successfully fetched ${completedQuizzes.length} quizzes with questions`);
    
    // Return the quizzes with their questions
    res.json(completedQuizzes);
  } catch (error) {
    console.error("❌ Error fetching completed quizzes:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;