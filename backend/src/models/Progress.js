import mongoose from "mongoose";
 // Ensure this path is correct

const completionSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  score: Number,
  bestScore: Number,
  attempts: { type: Number, default: 1 },
  passed: { type: Boolean, default: false },
  everPassed: { type: Boolean, default: false },
  completedAt: Date
});

const progressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  // Global progress tracking
  globalProgress: {
    currentModule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module"
    },
    unlockedModules: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module"
    }],
    completedModules: [{
      module: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Module"
      },
      completedAt: Date,
      finalScore: Number
    }]
  },
  
  // Module-specific progress
  moduleProgress: [{
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true
    },
    status: {
      type: String,
      enum: ['locked', 'unlocked', 'in_progress', 'completed'],
      default: 'locked'
    },
    currentQuiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz"
    },
    unlockedQuizzes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz"
    }],
    completedQuizzes: [completionSchema],
    startedAt: Date,
    completedAt: Date,
    totalXP: {
      type: Number,
      default: 0
    },
    completionPercentage: {
      type: Number,
      default: 0
    }
  }],
  
  // Quiz attempts (detailed tracking)
  quizAttempts: [{
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true
    },
    attemptNumber: Number,
    score: Number,
    totalQuestions: Number,
    correctAnswers: Number,
    timeSpent: Number,
    answers: [{
      questionIndex: Number,
      userAnswer: mongoose.Schema.Types.Mixed,
      isCorrect: Boolean,
      timeSpent: Number
    }],
    passed: Boolean,
    xpEarned: Number,
    completedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { 
  timestamps: true
});

// Ensure one progress document per user
progressSchema.index({ user: 1 }, { unique: true });

// Method to unlock next module
progressSchema.methods.unlockNextModule = async function() {
  const Module = mongoose.model('Module');
  
  // Find the next module in order
  const currentModuleOrder = await Module.findById(this.globalProgress.currentModule).select('order');
  const nextModule = await Module.findOne({ 
    order: currentModuleOrder.order + 1 
  }).sort({ order: 1 });
  
  if (nextModule && !this.globalProgress.unlockedModules.includes(nextModule._id)) {
    this.globalProgress.unlockedModules.push(nextModule._id);
    this.globalProgress.currentModule = nextModule._id;
    
    // Initialize module progress
    const moduleProgress = {
      module: nextModule._id,
      status: 'unlocked',
      unlockedQuizzes: [],
      completedQuizzes: []
    };
    this.moduleProgress.push(moduleProgress);
    
    // Unlock first quiz in the module
    await this.unlockNextQuizInModule(nextModule._id);
  }
};

// Method to unlock next quiz in current module
progressSchema.methods.unlockNextQuizInModule = async function(moduleId) {
  const Quiz = mongoose.model('Quiz');
  
  const moduleProgress = this.moduleProgress.find(mp => mp.module.toString() === moduleId.toString());
  if (!moduleProgress) return;
  
  // Find the next quiz in order
  const completedQuizCount = moduleProgress.completedQuizzes.length;
  const nextQuiz = await Quiz.findOne({ 
    module: moduleId,
    order: completedQuizCount + 1
  }).sort({ order: 1 });
  
  if (nextQuiz && !moduleProgress.unlockedQuizzes.includes(nextQuiz._id)) {
    moduleProgress.unlockedQuizzes.push(nextQuiz._id);
    moduleProgress.currentQuiz = nextQuiz._id;
    
    if (moduleProgress.status === 'locked') {
      moduleProgress.status = 'unlocked';
    }
  }
};

// Method to complete a quiz and check for unlocks
progressSchema.methods.completeQuiz = async function(quizId, attemptData) {
  try {

    const Module = mongoose.model('Module');
    const Quiz = mongoose.model('Quiz');
    // Get quiz details
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }
    
    const moduleId = quiz.module;
    const passingScore = quiz.passingScore || 70;
    const userScore = attemptData.score || 0;
    const hasPassed = userScore >= passingScore;
    
    // Find module progress
    let moduleProgress = this.moduleProgress.find(
      mp => mp.module.toString() === moduleId.toString()
    );
    
    if (!moduleProgress) {
      // Create module progress if it doesn't exist
      moduleProgress = {
        module: moduleId,
        status: 'unlocked',
        currentQuiz: quizId,
        unlockedQuizzes: [quizId],
        completedQuizzes: [],
        totalXP: 0,
        completionPercentage: 0
      };
      this.moduleProgress.push(moduleProgress);
    }
    
    // Find or create the quiz completion
    const existingCompletionIndex = moduleProgress.completedQuizzes.findIndex(
      cq => cq.quiz.toString() === quizId.toString()
    );
    
    if (existingCompletionIndex === -1) {
      // First attempt
      moduleProgress.completedQuizzes.push({
        quiz: quizId,
        score: userScore,
        bestScore: userScore,
        attempts: 1,
        passed: hasPassed,
        everPassed: hasPassed, // Track if ever passed
        completedAt: new Date()
      });
    } else {
      // Update existing completion
      const existingCompletion = moduleProgress.completedQuizzes[existingCompletionIndex];
      existingCompletion.attempts += 1;
      existingCompletion.score = userScore;
      
      // Update best score if this attempt is better
      if (userScore > existingCompletion.bestScore) {
        existingCompletion.bestScore = userScore;
      }
      
      // Update passed status
      existingCompletion.passed = hasPassed;
      
      // Once passed, always mark as everPassed
      if (hasPassed || existingCompletion.everPassed) {
        existingCompletion.everPassed = true;
      }
    }
    
    // Recalculate completion percentage
    await this.recalculateCompletionPercentage(moduleId);
    
    // ✅ ONLY unlock next content if user PASSED
    if (hasPassed) {
      console.log('🎉 User passed! Checking for unlocks...');
      
      // Find next quiz in the same module
      const nextQuiz = await Quiz.findOne({
        module: moduleId,
        order: quiz.order + 1
      });
      
      if (nextQuiz) {
        // Unlock next quiz in same module
        if (!moduleProgress.unlockedQuizzes.some(uq => uq.toString() === nextQuiz._id.toString())) {
          moduleProgress.unlockedQuizzes.push(nextQuiz._id);
          console.log('🔓 Unlocked next quiz:', nextQuiz.title);
        }
        moduleProgress.currentQuiz = nextQuiz._id;
      } else {
        console.log('🏁 This was the last quiz in the module');
        
        // Check if ALL quizzes in module are PASSED (not just completed)
        const allQuizzesInModule = await Quiz.find({ module: moduleId });
        const passedQuizzes = moduleProgress.completedQuizzes.filter(cq => cq.passed);
        
        console.log(`📊 Module completion check: ${passedQuizzes.length}/${allQuizzesInModule.length} quizzes passed`);
        
        if (passedQuizzes.length >= allQuizzesInModule.length) {
          // ✅ Module completed with all quizzes passed
          moduleProgress.status = 'completed';
          console.log('🎊 Module completed successfully!');
          
          // Add to completed modules
          if (!this.globalProgress.completedModules.some(
            cm => cm.module.toString() === moduleId.toString()
          )) {
            this.globalProgress.completedModules.push({
              module: moduleId,
              completedAt: new Date()
            });
          }
          
          // Find and unlock next module
          const currentModule = await Module.findById(moduleId);
          const nextModule = await Module.findOne({ order: currentModule.order + 1 });
          
          if (nextModule) {
            console.log('🌟 Unlocking next module:', nextModule.title);
            
            // Unlock next module
            if (!this.globalProgress.unlockedModules.some(
              um => um.toString() === nextModule._id.toString()
            )) {
              this.globalProgress.unlockedModules.push(nextModule._id);
            }
            
            this.globalProgress.currentModule = nextModule._id;
            
            // Find first quiz in next module and create progress
            const firstQuizInNextModule = await Quiz.findOne({
              module: nextModule._id,
              order: 1
            });
            
            if (firstQuizInNextModule) {
              // Create progress for next module
              const nextModuleProgress = {
                module: nextModule._id,
                status: 'unlocked',
                currentQuiz: firstQuizInNextModule._id,
                unlockedQuizzes: [firstQuizInNextModule._id],
                completedQuizzes: [],
                totalXP: 0,
                completionPercentage: 0
              };
              this.moduleProgress.push(nextModuleProgress);
              console.log('✨ Created progress for next module');
            }
          } else {
            console.log('🏆 All modules completed!');
          }
        } else {
          console.log('⚠️ Module not completed - some quizzes not passed yet');
        }
      }
    } else {
      console.log('❌ User failed quiz - no unlocks');
      // Don't unlock anything, but keep current progress
    }
    
    // Update completion percentage
    const allQuizzesInModule = await Quiz.find({ module: moduleId });
    const passedQuizzesCount = moduleProgress.completedQuizzes.filter(cq => cq.everPassed || cq.bestScore >= 70).length;
    moduleProgress.completionPercentage = Math.round((
      moduleProgress.completedQuizzes.filter(cq => cq.everPassed || cq.bestScore >= 70).length / 
      allQuizzesInModule.length
    ) * 100);
    
    console.log(`📈 Module completion: ${moduleProgress.completionPercentage}%`);
    console.log('✅ Quiz completion processed successfully');
    
  } catch (error) {
    console.error('Error completing quiz:', error);
    throw error;
  }
};

// Method to calculate module final score
progressSchema.methods.calculateModuleFinalScore = function(moduleId) {
  const moduleProgress = this.moduleProgress.find(mp => mp.module.toString() === moduleId.toString());
  if (!moduleProgress || !moduleProgress.completedQuizzes.length) return 0;
  
  const totalScore = moduleProgress.completedQuizzes.reduce((sum, cq) => sum + cq.bestScore, 0);
  return Math.round(totalScore / moduleProgress.completedQuizzes.length);
};

// Method to check if module is unlocked for user
progressSchema.methods.isModuleUnlocked = function(moduleId) {
  return this.globalProgress.unlockedModules.some(id => id.toString() === moduleId.toString());
};

// Method to check if quiz is unlocked for user
progressSchema.methods.isQuizUnlocked = function(quizId) {
  // Convert to string for comparison
  const quizIdStr = quizId.toString();
  
  // Find the module progress that contains this quiz
  for (const moduleProgress of this.moduleProgress) {
    const isQuizInModule = moduleProgress.unlockedQuizzes.some(
      unlockedQuizId => unlockedQuizId.toString() === quizIdStr
    );
    
    if (isQuizInModule) {
      return true;
    }
  }
  
  return false;
};

// ✅ Add an async version that checks quiz order
progressSchema.methods.isQuizUnlockedAsync = async function(quizId) {
  try {
    // ✅ Use mongoose.model() instead of require()
    const Quiz = mongoose.model('Quiz');
    
    // Get the quiz to check its order
    const quiz = await Quiz.findById(quizId);
    
    if (!quiz) {
      console.log('❌ Quiz not found:', quizId);
      return false;
    }
    
    console.log(`🎯 Checking quiz unlock: ${quiz.title}, Order: ${quiz.order}`);
    
    // ✅ ALWAYS unlock quiz with order 1 (first quiz in module)
    if (quiz.order === 1) {
      console.log('✅ Quiz order 1 - automatically unlocked');
      return true;
    }
    
    // For other quizzes, check the progress
    const isUnlocked = this.isQuizUnlockedSync(quizId, quiz.order);
    console.log(`🔍 Quiz unlock status: ${isUnlocked}`);
    
    return isUnlocked;
  } catch (error) {
    console.error('❌ Error in isQuizUnlockedAsync:', error);
    return false;
  }
};

// Sync version of quiz unlock check
progressSchema.methods.isQuizUnlockedSync = function(quizId, quizOrder = null) {
  // If we know the quiz order, use it directly
  if (quizOrder === 1) {
    return true;
  }
  
  const quizIdStr = quizId.toString();
  
  // Find the module progress that contains this quiz
  for (const moduleProgress of this.moduleProgress) {
    const isQuizInModule = moduleProgress.unlockedQuizzes.some(
      unlockedQuizId => unlockedQuizId.toString() === quizIdStr
    );
    
    if (isQuizInModule) {
      return true;
    }
  }
  
  return false;
};

// Add this method to your Progress model
progressSchema.methods.recalculateCompletionPercentage = async function(moduleId) {
  try {
    const Quiz = mongoose.model('Quiz');
    
    // Find the module progress
    const moduleProgress = this.moduleProgress.find(
      mp => mp.module.toString() === moduleId.toString()
    );
    
    if (!moduleProgress) return;
    
    // Get all existing quizzes for this module
    const moduleQuizzes = await Quiz.find({ module: moduleId });
    
    // Filter out completed quizzes that reference non-existent quizzes
    const validQuizIds = moduleQuizzes.map(q => q._id.toString());
    
    moduleProgress.completedQuizzes = moduleProgress.completedQuizzes.filter(
      cq => validQuizIds.includes(cq.quiz.toString())
    );
    
    // Count quizzes that were ever passed
    const passedQuizCount = moduleProgress.completedQuizzes.filter(
      cq => cq.everPassed
    ).length;
    
    // Calculate percentage
    moduleProgress.completionPercentage = moduleQuizzes.length > 0
      ? Math.round((passedQuizCount / moduleQuizzes.length) * 100)
      : 0;
      
    // Also update unlocked quizzes to only include existing ones
    moduleProgress.unlockedQuizzes = moduleProgress.unlockedQuizzes.filter(
      quizId => validQuizIds.includes(quizId.toString())
    );
    
    // Make sure currentQuiz exists
    if (moduleProgress.currentQuiz && !validQuizIds.includes(moduleProgress.currentQuiz.toString())) {
      // Set to last quiz in the module as fallback
      moduleProgress.currentQuiz = moduleQuizzes.length > 0
        ? moduleQuizzes[moduleQuizzes.length - 1]._id
        : null;
    }
    
    return moduleProgress.completionPercentage;
  } catch (error) {
    console.error('Error recalculating completion percentage:', error);
    return null;
  }
};

// Add to the Progress model
progressSchema.methods.ensureDefaultAccess = async function() {
  try {
    // Ensure first module is unlocked
    const Module = mongoose.model('Module');
    const firstModule = await Module.findOne({ order: 1 });
    
    if (!firstModule) return;
    
    let needsSaving = false;
    
    // Check if first module is in unlockedModules
    if (!this.globalProgress.unlockedModules.some(id => 
      id.toString() === firstModule._id.toString()
    )) {
      this.globalProgress.unlockedModules.push(firstModule._id);
      needsSaving = true;
    }
    
    // Find module progress for first module
    let firstModuleProgress = this.moduleProgress.find(mp => 
      mp.module.toString() === firstModule._id.toString()
    );
    
    if (!firstModuleProgress) {
      // Get first quiz in the module
      const Quiz = mongoose.model('Quiz');
      const firstQuiz = await Quiz.findOne({ 
        module: firstModule._id,
        order: 1 
      });
      
      // Create module progress
      firstModuleProgress = {
        module: firstModule._id,
        status: 'unlocked',
        unlockedQuizzes: firstQuiz ? [firstQuiz._id] : [],
        completedQuizzes: []
      };
      
      this.moduleProgress.push(firstModuleProgress);
      needsSaving = true;
    }
    
    // If first module progress exists but is locked, unlock it
    if (firstModuleProgress.status === 'locked') {
      firstModuleProgress.status = 'unlocked';
      needsSaving = true;
    }
    
    // Save if changes were made
    if (needsSaving) {
      await this.save();
    }
    
    return needsSaving;
  } catch (error) {
    console.error("Error ensuring default access:", error);
    return false;
  }
};

const Progress = mongoose.model("Progress", progressSchema);

export default Progress;