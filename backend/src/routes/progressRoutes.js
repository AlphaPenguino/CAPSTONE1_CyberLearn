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
    
    // Get the user with their section information
    const User = await import("../models/Users.js").then(module => module.default);
    const Section = await import("../models/Section.js").then(module => module.default);
    
    const user = await User.findById(req.user.id).select('section privilege');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const existingProgress = await Progress.findOne({ user: req.user.id });
    if (existingProgress) {
      console.log('✅ Progress already exists, ensuring module access...');
      // Instead of just returning, ensure the student has access
      await ensureStudentModuleAccess(user, existingProgress);
      return res.json(existingProgress);
    }
    
    // Find modules based on user role and section
    let instructorId = null;
    let firstModule = null;
    let allModules = [];
    
    if (user.privilege === 'instructor' || user.privilege === 'admin') {
      // For instructors/admins, get their own modules or all modules
      if (user.privilege === 'instructor') {
        firstModule = await Module.findOne({ createdBy: user._id, order: 1 });
        allModules = await Module.find({ createdBy: user._id }).sort({ order: 1 });
      } else {
        // Admin gets first module from system
        firstModule = await Module.findOne().sort({ order: 1 });
        allModules = await Module.find().sort({ order: 1 });
      }
    } 
    else if (user.privilege === 'student' && user.section !== 'no_section') {
      // Get the instructor for the student's section
      const section = await Section.findOne({ sectionCode: user.section })
        .populate('instructor');
      
      if (section && section.instructor) {
        instructorId = section.instructor._id;
        // Get modules created by the section's instructor
        firstModule = await Module.findOne({ 
          createdBy: instructorId, 
          order: 1 
        });
        
        allModules = await Module.find({ 
          createdBy: instructorId 
        }).sort({ order: 1 });
        
        console.log(`🔄 Found ${allModules.length} modules from instructor ${instructorId} for section ${user.section}`);
      }
    }
    
    // If no modules found or no section assigned, create empty progress
    if (!firstModule) {
      console.log('⚠️ No modules found or no section assigned');
      const emptyProgress = new Progress({
        user: req.user.id,
        globalProgress: {
          unlockedModules: [],
          completedModules: []
        },
        moduleProgress: []
      });
      
      await emptyProgress.save();
      return res.json(emptyProgress);
    }
    
    // Rest of your code remains the same for creating moduleProgressArray
    const moduleProgressArray = [];
    
    for (const module of allModules) {
      // Get quizzes in this module
      const allQuizzesInModule = await Quiz.find({ 
        module: module._id 
      }).sort({ order: 1 });
      
      const firstQuizInModule = allQuizzesInModule.find(q => q.order === 1);
      
      const moduleProgress = {
        module: module._id,
        status: module._id.toString() === firstModule._id.toString() ? 'unlocked' : 'locked',
        currentQuiz: firstQuizInModule?._id,
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
    const User = await import("../models/Users.js").then(module => module.default);
    const user = await User.findById(userId).select('section privilege');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    let modules;
    
    // If user is admin, return all modules
    if (user.privilege === 'admin') {
      modules = await Module.find()
        .select('title description category image order isActive totalQuizzes lastAccessed')
        .sort({ order: 1 });
    } 
    // If user is instructor, only return modules they created
    else if (user.privilege === 'instructor') {
      modules = await Module.find({ createdBy: userId })
        .select('title description category image order isActive totalQuizzes lastAccessed')
        .sort({ order: 1 });
    }
    // If user is a student, only return modules created by their section's instructor
    else if (user.privilege === 'student' && user.section !== 'no_section') {
      // Find the section to get instructor
      const Section = await import("../models/Section.js").then(module => module.default);
      const section = await Section.findOne({ sectionCode: user.section })
        .populate('instructor');
      
      if (!section) {
        return res.status(200).json([]);
      }
      
      // Find all modules where createdBy is the section's instructor
      modules = await Module.find({ createdBy: section.instructor._id })
        .select('title description category image order isActive totalQuizzes lastAccessed')
        .sort({ order: 1 });
    } 
    // If no section or not a student, return empty array
    else {
      return res.status(200).json([]);
    }
    
    // Get user progress
    const Progress = await import("../models/Progress.js").then(module => module.default);
    const userProgress = await Progress.findOne({ user: userId });
    
    // Enhance modules with unlock status and completion status
    const enhancedModules = modules.map((module, index) => {
      const moduleObj = module.toObject();
      
      // First module or instructor always unlocked
      if (index === 0 || user.privilege === 'instructor' || user.privilege === 'admin') {
        moduleObj.isUnlocked = true;
      } else if (!userProgress) {
        moduleObj.isUnlocked = false;
      } else {
        // Check if this module is in the unlocked modules list
        moduleObj.isUnlocked = userProgress.globalProgress.unlockedModules.some(
          id => id.toString() === module._id.toString()
        );
      }
      
      // Check if module is completed
      if (userProgress && userProgress.globalProgress.completedModules) {
        moduleObj.isCompleted = userProgress.globalProgress.completedModules.some(
          item => item.module.toString() === module._id.toString()
        );
      } else {
        moduleObj.isCompleted = false;
      }
      
      // Check if module is current
      if (userProgress && userProgress.globalProgress.currentModule) {
        moduleObj.isCurrent = userProgress.globalProgress.currentModule.toString() === module._id.toString();
      } else {
        moduleObj.isCurrent = index === 0;
      }
      
      // Add totalXP field
      const moduleProgress = userProgress.moduleProgress.find(mp => mp.module.toString() === module._id.toString());
      moduleObj.totalXP = moduleProgress ? moduleProgress.totalXP : 0;
      
      // In your progressRoutes.js file, make sure your endpoint includes completedQuizzes
      const moduleWithProgress = {
        _id: module._id,
        title: module.title,
        description: module.description,
        image: module.image,
        order: module.order,
        isUnlocked: moduleObj.isUnlocked,
        isCompleted: moduleObj.isCompleted,
        isCurrent: moduleObj.isCurrent,
        completionPercentage: moduleProgress ? moduleProgress.completionPercentage : 0,
        totalXP: moduleProgress ? moduleProgress.totalXP : 0,
        completedQuizzes: moduleProgress ? moduleProgress.completedQuizzes : [] // Include this
      };
      
      return moduleWithProgress;
    });
    
    res.json(enhancedModules);
  } catch (error) {
    console.error("Error fetching modules with progress:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch modules with progress",
      error: error.message 
    });
  }
});

// Get quizzes for a module with lock status
router.get("/module/:moduleId/quizzes", protectRoute, async (req, res) => {
  try {
    const progress = await Progress.findOne({ user: req.user.id });
    const { moduleId } = req.params;
    
    console.log('📚 Fetching quizzes for module:', moduleId);
    
    const isinstructor = req.user.privilege === 'instructor' || req.user.privilege === 'admin';
    
    // instructor can access any module, students need unlock check
    if (!isinstructor && progress && !progress.isModuleUnlocked(moduleId)) {
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
          cq => cq.quiz.toString() === quiz._id.toString()
        );
        
        if (completion) {
          isCompleted = true;
          isPassed = completion.passed || false;
          bestScore = completion.bestScore;
          attempts = completion.attempts;
        }
      }
      
      const isCurrent = isinstructor ? false : (moduleProgress?.currentQuiz?.toString() === quiz._id.toString());
      
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
    
    // ✅ Check if user is instructor
    const isinstructor = req.user.privilege === 'instructor' || req.user.privilege === 'admin';
    
    if (isinstructor) {
      console.log('👑 instructor quiz submission - no progress tracking');
      return res.json({
        message: "Quiz completed successfully (instructor mode)",
        isinstructor: true
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
    
    // Update progress for students and get XP information
    const xpResult = await progress.completeQuiz(quizId, attemptData);
    await progress.save();
    
    // Return detailed response with XP earned
    const hasPassed = (attemptData.score || 0) >= (quiz.passingScore || 70);
    
    res.json({
      message: "Quiz completed successfully",
      score: attemptData.score,
      passingScore: quiz.passingScore,
      passed: hasPassed,
      unlockedContent: hasPassed ? "Next quiz/module unlocked!" : "Complete this quiz to unlock next content",
      xpEarned: xpResult.xpEarned,
      totalModuleXP: xpResult.totalModuleXP,
      questionsCount: quiz.questions.length,
      xpPerQuestion: 10,
      isinstructor: false
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

// Helper function to ensure students have access to their instructor's modules
async function ensureStudentModuleAccess(user, progress) {
  try {
    // Only needed for students with a section
    if (user.privilege !== 'student' || user.section === 'no_section') {
      return false;
    }
    
    // Get the instructor for the student's section
    const Section = await import("../models/Section.js").then(module => module.default);
    const section = await Section.findOne({ sectionCode: user.section })
      .populate('instructor');
    
    if (!section || !section.instructor) {
      console.log('⚠️ Section or instructor not found');
      return false;
    }
    
    const instructorId = section.instructor._id;
    
    // Get first module from the instructor
    const firstInstructorModule = await Module.findOne({ 
      createdBy: instructorId, 
      order: 1 
    });
    
    if (!firstInstructorModule) {
      console.log('⚠️ No modules found for instructor');
      return false;
    }
    
    let needsSaving = false;
    
    // Ensure first module is in unlockedModules
    if (!progress.globalProgress.unlockedModules.some(id => 
      id.toString() === firstInstructorModule._id.toString()
    )) {
      progress.globalProgress.unlockedModules.push(firstInstructorModule._id);
      needsSaving = true;
      console.log('🔓 Added first instructor module to unlocked modules');
    }
    
    // Ensure there's a moduleProgress entry for the first module
    let firstModuleProgress = progress.moduleProgress.find(mp => 
      mp.module.toString() === firstInstructorModule._id.toString()
    );
    
    if (!firstModuleProgress) {
      // Get first quiz in the module
      const firstQuiz = await Quiz.findOne({ 
        module: firstInstructorModule._id,
        order: 1 
      });
      
      // Create module progress
      firstModuleProgress = {
        module: firstInstructorModule._id,
        status: 'unlocked',
        currentQuiz: firstQuiz?._id,
        unlockedQuizzes: firstQuiz ? [firstQuiz._id] : [],
        completedQuizzes: []
      };
      
      progress.moduleProgress.push(firstModuleProgress);
      needsSaving = true;
      console.log('🔄 Created module progress for first instructor module');
    }
    
    // If current module isn't set, set it to the first module
    if (!progress.globalProgress.currentModule) {
      progress.globalProgress.currentModule = firstInstructorModule._id;
      needsSaving = true;
      console.log('🔄 Set current module to first instructor module');
    }
    
    if (needsSaving) {
      await progress.save();
      console.log('✅ Progress updated for student in section');
    }
    
    return needsSaving;
  } catch (error) {
    console.error('❌ Error ensuring student module access:', error);
    return false;
  }
}

// Add this route to repair student access when they're added to a section
router.post("/repair-section-access", protectRoute, async (req, res) => {
  try {
    const userId = req.body.userId || req.user.id;
    
    // Get the user
    const User = await import("../models/Users.js").then(module => module.default);
    const user = await User.findById(userId).select('section privilege');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Get progress
    const progress = await Progress.findOne({ user: userId });
    if (!progress) {
      return res.status(404).json({ message: "Progress not found" });
    }
    
    // Repair the access
    const updated = await ensureStudentModuleAccess(user, progress);
    
    res.json({
      success: true,
      message: updated ? "Student module access repaired" : "No updates needed",
      user: {
        id: user._id,
        section: user.section,
        privilege: user.privilege
      }
    });
  } catch (error) {
    console.error("❌ Error repairing section access:", error);
    res.status(500).json({ message: "Failed to repair access", error: error.message });
  }
});

// Get module status and completion percentage
router.get("/module/:moduleId/status", protectRoute, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user.id;
    
    console.log(`📊 Fetching module status for moduleId: ${moduleId}, user: ${userId}`);
    
    // Get user progress
    const progress = await Progress.findOne({ user: userId });
    
    if (!progress) {
      return res.status(404).json({ 
        message: "User progress not found"
      });
    }
    
    // Find module progress
    const moduleProgress = progress.moduleProgress.find(
      mp => mp.module.toString() === moduleId
    );
    
    if (!moduleProgress) {
      console.log(`⚠️ No module progress found for module ${moduleId}`);
      return res.json({
        status: 'not_started',
        completionPercentage: 0,
        completedQuizzes: 0
      });
    }
    
    // Get quiz counts
    const Quiz = mongoose.model('Quiz');
    const quizzesInModule = await Quiz.countDocuments({ module: moduleId });
    
    const completedQuizzes = moduleProgress.completedQuizzes.filter(
      cq => cq.everPassed || cq.bestScore >= 70
    ).length;
    
    // Return module status details
    res.json({
      status: moduleProgress.status,
      completionPercentage: moduleProgress.completionPercentage,
      completedQuizzes: completedQuizzes,
      totalQuizzes: quizzesInModule,
      isCompleted: moduleProgress.status === 'completed',
      totalXP: moduleProgress.totalXP || 0
    });
    
  } catch (error) {
    console.error(`❌ Error fetching module status: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// Get leaderboards data from progress
router.get('/leaderboards', protectRoute, async (req, res) => {
  try {
    const { timeFrame = 'all', category = 'cookies' } = req.query;
    
    // Get time filter for MongoDB query
    let timeFilter = {};
    if (timeFrame === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      timeFilter = { updatedAt: { $gte: weekAgo } };
    } else if (timeFrame === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      timeFilter = { updatedAt: { $gte: monthAgo } };
    }

    // Aggregate progress data by user
    const progressData = await Progress.aggregate([
      { $match: timeFilter },
      {
        $lookup: {
          from: 'users', 
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      { $unwind: '$userData' },
      {
        $project: {
          userId: '$user',
          username: '$userData.username',
          profileImage: '$userData.profileImage',
          section: '$userData.section', // Include section information
          totalXP: { $sum: '$moduleProgress.totalXP' },
          completedQuizzes: {
            $sum: { 
              $map: {
                input: '$moduleProgress',
                as: 'module',
                in: { $size: { $ifNull: ['$$module.completedQuizzes', []] } }
              }
            }
          }
        }
      },
      {
        $sort: category === 'cookies' 
          ? { totalXP: -1 } 
          : { completedQuizzes: -1 }
      },
      { $limit: 50 }
    ]);
    
    res.json(progressData);
    
  } catch (error) {
    console.error('Error fetching leaderboards:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboards data' });
  }
});

// Get user stats for current user
router.get('/stats', protectRoute, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const progress = await Progress.findOne({ user: userId });
    if (!progress) {
      return res.json({ 
        totalXP: 0, 
        completedQuizzes: 0
      });
    }
    
    // Calculate total XP
    const totalXP = progress.moduleProgress.reduce(
      (sum, module) => sum + (module.totalXP || 0), 
      0
    );
    
    // Calculate completed quizzes
    let completedQuizzes = 0;
    progress.moduleProgress.forEach(module => {
      if (module.completedQuizzes && Array.isArray(module.completedQuizzes)) {
        completedQuizzes += module.completedQuizzes.length;
      }
    });
    
    res.json({ 
      totalXP, 
      completedQuizzes,
    });
    
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Failed to fetch user statistics' });
  }
});

export default router;