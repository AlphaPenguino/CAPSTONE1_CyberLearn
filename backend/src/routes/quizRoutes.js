import express from "express";
import Quiz from "../models/Quiz.js";
import Module from "../models/Module.js";
import { protectRoute, authorizeRole } from "../middleware/auth.middleware.js";
import mongoose from "mongoose";

const router = express.Router();

// GET all quizzes with pagination and filtering
router.get("/", protectRoute, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Sorting
    const sortField = req.query.sortField || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sortOptions = { [sortField]: sortOrder };
    
    // Filtering
    const filter = {};
    
    if (req.query.difficulty) {
      filter.difficulty = req.query.difficulty;
    }
    
    if (req.query.module) {
      filter.module = req.query.module;
    }
    
    if (req.query.isActive) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // Get total count
    const total = await Quiz.countDocuments(filter);
    
    // Get quizzes
    const quizzes = await Quiz.find(filter)
      .select('-questions.correctAnswer') // Don't send answers to frontend
      .populate('module', 'title image')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;
    
    res.json({
      quizzes,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasMore
      }
    });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).json({ message: "Failed to fetch quizzes" });
  }
});

// GET quizzes by module ID
router.get("/module/:moduleId", protectRoute, async (req, res) => {
  try {
    const { moduleId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      return res.status(400).json({ message: "Invalid module ID" });
    }
    
    const quizzes = await Quiz.find({ module: moduleId })
      .select('title description difficulty timeLimit totalQuestions image')
      .sort({ createdAt: 1 });
    
    res.json(quizzes);
  } catch (error) {
    console.error("Error fetching module quizzes:", error);
    res.status(500).json({ message: "Failed to fetch quizzes for this module" });
  }
});

// GET a single quiz by ID (without correct answers for students)
router.get("/:id", protectRoute, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }
    
    const quiz = await Quiz.findById(id);
    
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    
    // Remove correct answers for students
    let sanitizedQuiz;
    
    if (req.user.role === 'student') {
      sanitizedQuiz = quiz.toObject();
      
      // Remove correct answers based on question type
      sanitizedQuiz.questions = sanitizedQuiz.questions.map(q => {
        const question = { ...q };
        
        if (q.questionType === 'multipleChoice') {
          question.options = q.options.map(opt => ({ text: opt.text }));
        } else if (['codeSimulation', 'codeImplementation'].includes(q.questionType)) {
          delete question.correctAnswer;
          delete question.expectedOutput;
        } else if (q.questionType === 'fillInBlanks') {
          delete question.blanks;
        } else if (q.questionType === 'codeOrdering') {
          question.codeBlocks = q.codeBlocks.map(block => ({ 
            code: block.code
          }));
        }
        
        return question;
      });
    } else {
      sanitizedQuiz = quiz;
    }
    
    res.json(sanitizedQuiz);
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({ message: "Failed to fetch quiz" });
  }
});

// CREATE a new quiz (admin only)
router.post("/", protectRoute, authorizeRole(['admin']), async (req, res) => {
  try {
    const {
      title,
      description,
      module,
      image,
      difficulty,
      timeLimit,
      passingScore,
      questions
    } = req.body;
    
    // Validate required fields
    if (!title || !description || !module || !questions || questions.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    // Check if module exists
    const moduleExists = await Module.findById(module);
    if (!moduleExists) {
      return res.status(404).json({ message: "Module not found" });
    }
    
    // Create new quiz
    const newQuiz = new Quiz({
      title,
      description,
      module,
      image,
      difficulty,
      timeLimit,
      passingScore,
      questions
    });
    
    await newQuiz.save();
    
    // Update module with quiz reference
    await Module.findByIdAndUpdate(module, {
      $push: { quizzes: newQuiz._id },
      $inc: { totalQuizzes: 1 }
    });
    
    res.status(201).json({
      message: "Quiz created successfully",
      quiz: newQuiz
    });
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({ message: "Failed to create quiz" });
  }
});

// UPDATE a quiz (admin only)
router.put("/:id", protectRoute, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }
    
    const updates = req.body;
    
    // Find and update the quiz
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!updatedQuiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    
    res.json({
      message: "Quiz updated successfully",
      quiz: updatedQuiz
    });
  } catch (error) {
    console.error("Error updating quiz:", error);
    res.status(500).json({ message: "Failed to update quiz" });
  }
});

// DELETE a quiz (admin only)
router.delete("/:id", protectRoute, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }
    
    const quiz = await Quiz.findById(id);
    
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    
    // Get module ID before deleting quiz
    const moduleId = quiz.module;
    
    // Delete the quiz
    await Quiz.findByIdAndDelete(id);
    
    // Update module by removing quiz reference
    await Module.findByIdAndUpdate(moduleId, {
      $pull: { quizzes: id },
      $inc: { totalQuizzes: -1 }
    });
    
    res.json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({ message: "Failed to delete quiz" });
  }
});

// SUBMIT quiz answers and get score
router.post("/:id/submit", protectRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }
    
    const quiz = await Quiz.findById(id);
    
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Invalid answers format" });
    }
    
    // Calculate score
    let totalPoints = 0;
    let earnedPoints = 0;
    const questionResults = [];
    
    quiz.questions.forEach((question, index) => {
      const points = question.points || 10; // Default 10 points per question
      totalPoints += points;
      
      const userAnswer = answers[index];
      let isCorrect = false;
      let correctAnswer;
      
      if (!userAnswer) {
        questionResults.push({ 
          questionId: question._id,
          isCorrect: false,
          points: 0,
          maxPoints: points
        });
        return;
      }
      
      switch(question.questionType) {
        case 'multipleChoice':
          correctAnswer = question.options
            .map((opt, i) => opt.isCorrect ? i : null)
            .filter(i => i !== null);
          isCorrect = Array.isArray(userAnswer) 
            ? userAnswer.length === correctAnswer.length && 
              userAnswer.every(a => correctAnswer.includes(a))
            : correctAnswer.includes(userAnswer);
          break;
          
        case 'fillInBlanks':
          isCorrect = question.blanks.every((blank, i) => {
            return userAnswer[i] && userAnswer[i].toLowerCase() === blank.answer.toLowerCase();
          });
          break;
          
        case 'codeSimulation':
        case 'codeImplementation':
          // Simplified check - in real app you'd want more sophisticated comparison
          isCorrect = userAnswer === question.correctAnswer;
          break;
          
        case 'codeOrdering':
          isCorrect = question.codeBlocks.every((block, i) => {
            return userAnswer[i] === block.correctPosition;
          });
          break;
      }
      
      const earnedQuestionPoints = isCorrect ? points : 0;
      earnedPoints += earnedQuestionPoints;
      
      questionResults.push({
        questionId: question._id,
        isCorrect,
        points: earnedQuestionPoints,
        maxPoints: points,
        // Don't send correct answer back unless the quiz is completed
      });
    });
    
    const percentageScore = (earnedPoints / totalPoints) * 100;
    const passed = percentageScore >= (quiz.passingScore || 70);
    
    // Save results to user history (would be implemented separately)
    
    res.json({
      quizId: id,
      score: {
        earned: earnedPoints,
        total: totalPoints,
        percentage: percentageScore
      },
      passed,
      questionResults,
      completedAt: new Date()
    });
  } catch (error) {
    console.error("Error submitting quiz answers:", error);
    res.status(500).json({ message: "Failed to process quiz submission" });
  }
});

export default router;