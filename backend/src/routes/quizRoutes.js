import express from "express";
import Quiz from "../models/Quiz.js";
import Module from "../models/Module.js";
import { protectRoute, authorizeRole } from "../middleware/auth.middleware.js";
import mongoose from "mongoose";
import cloudinary from "../lib/cloudinary.js";
import Progress from "../models/Progress.js"; // Import Progress model

const router = express.Router();

// Configure Cloudinary (if not already done elsewhere)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
    
    // ✅ Allow access if user is instructor OR quiz is order 1
    const isinstructor = req.user.privilege === 'instructor' || req.user.privilege === 'admin';
    const isFirstQuiz = quiz.order === 1;
    
    if (!isinstructor && !isFirstQuiz) {
      // For non-instructor and non-first quiz, check progress
      const progress = await Progress.findOne({ user: req.user.id });
      
      if (progress && !progress.isQuizUnlockedSync(quiz._id, quiz.order)) {
        return res.status(403).json({ message: "Quiz is locked" });
      }
    }
    
    // Remove correct answers for students (unless instructor)
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

// Add helper route for next order
router.get("/next-order/:moduleId", protectRoute, authorizeRole(['instructor', 'admin']), async (req, res) => {
  try {
    const { moduleId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      return res.status(400).json({ message: "Invalid module ID" });
    }
    
    const lastQuiz = await Quiz.findOne({ module: moduleId }).sort({ order: -1 }).select('order');
    const nextOrder = lastQuiz ? lastQuiz.order + 1 : 1;
    
    res.json({ 
      nextOrder,
      message: `Next available order for this module is ${nextOrder}`
    });
  } catch (error) {
    console.error("Error getting next order:", error);
    res.status(500).json({ message: "Error getting next order" });
  }
});

// CREATE a new quiz (instructor only) - Updated with Cloudinary handling
router.post("/", protectRoute, authorizeRole(['instructor', 'admin']), async (req, res) => {
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
    
    // ✅ Auto-assign the next order number for this module
    const lastQuiz = await Quiz.findOne({ module }).sort({ order: -1 }).select('order');
    const nextOrder = lastQuiz ? lastQuiz.order + 1 : 1;
    
    let imageUrl = null;
    
    // Handle image upload to Cloudinary if provided
    if (image) {
      try {
        console.log("Starting Cloudinary upload for quiz image...");
        
        // Ensure image has proper format before uploading
        let imageDataUrl = image;
        if (!image.startsWith('data:image')) {
          // Try to detect type or default to jpeg
          imageDataUrl = `data:image/jpeg;base64,${image}`;
        }
        
        const uploadResponse = await cloudinary.uploader.upload(imageDataUrl, {
          timeout: 120000, // Increase timeout to 2 minutes
          resource_type: 'image',
          folder: 'quizzes', // Optional: organize images in folders
        });
        
        console.log("Cloudinary upload successful for quiz");
        imageUrl = uploadResponse.secure_url;
        
      } catch (cloudinaryError) {
        console.error("Cloudinary upload error details:", cloudinaryError);
        
        // FIX: Safely check if message exists before using includes()
        let errorMessage = "Quiz image upload failed";
        
        // Add this safety check
        if (cloudinaryError && typeof cloudinaryError.message === 'string') {
          if (cloudinaryError.message.includes("timed out")) {
            errorMessage = "Quiz image upload timed out. Try a smaller image.";
          } else if (cloudinaryError.message.includes("Invalid image")) {
            errorMessage = "Invalid quiz image format or corrupted image.";
          }
        }
        
        return res.status(500).json({ 
          message: errorMessage,
          error: cloudinaryError?.message || "Unknown cloudinary error"
        });
      }
    }
    
    // Create new quiz
    const newQuiz = new Quiz({
      title,
      description,
      module,
      image: imageUrl, // Use the Cloudinary URL
      difficulty,
      timeLimit,
      passingScore,
      questions,
      order: nextOrder // ✅ Add the auto-generated order
    });
    
    await newQuiz.save();
    
    // Update module with quiz reference
    await Module.findByIdAndUpdate(module, {
      $push: { quizzes: newQuiz._id },
      $inc: { totalQuizzes: 1 }
    });
    
    console.log(`Quiz created with order: ${nextOrder}`);
    res.status(201).json({
      message: "Quiz created successfully",
      quiz: newQuiz
    });
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({ message: error.message || "Failed to create quiz" });
  }
});

// UPDATE a quiz (instructor only) - Updated with Cloudinary handling
router.put("/:id", protectRoute, authorizeRole(['instructor', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, difficulty, timeLimit, passingScore, questions, image } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }
    
    // Find the quiz
    const quiz = await Quiz.findById(id);
    
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    
    // Update basic fields if provided
    if (title) quiz.title = title;
    if (description) quiz.description = description;
    if (difficulty) quiz.difficulty = difficulty;
    if (timeLimit) quiz.timeLimit = timeLimit;
    if (passingScore) quiz.passingScore = passingScore;
    if (questions) quiz.questions = questions;
    
    // Handle image update if provided
    if (image && image !== quiz.image) {
      // If it's a new image (not just the same URL)
      if (image.startsWith('data:image')) {
        // Delete old image from Cloudinary
        if (quiz.image) {
          const publicId = extractPublicIdFromUrl(quiz.image);
          if (publicId) {
            try {
              await cloudinary.uploader.destroy(publicId);
              console.log(`Old quiz image deleted from Cloudinary: ${publicId}`);
            } catch (cloudinaryError) {
              console.error("Error deleting old quiz image:", cloudinaryError);
              // Continue with the update even if image deletion fails
            }
          }
        }
        
        // Upload new image
        try {
          console.log("Uploading new quiz image to Cloudinary...");
          
          // Ensure image has proper format
          let imageDataUrl = image;
          if (!image.startsWith('data:image')) {
            imageDataUrl = `data:image/jpeg;base64,${image}`;
          }
          
          const uploadResponse = await cloudinary.uploader.upload(imageDataUrl, {
            timeout: 120000, // 2 minutes timeout
            resource_type: 'image',
            folder: 'quizzes',
          });
          
          console.log("New quiz image upload successful");
          quiz.image = uploadResponse.secure_url;
        } catch (cloudinaryError) {
          console.error("Error uploading new quiz image:", cloudinaryError);
          return res.status(500).json({ 
            message: "Failed to upload new quiz image",
            error: cloudinaryError.message
          });
        }
      } else {
        // It's a URL, just update the field
        quiz.image = image;
      }
    }
    
    // Save updated quiz
    await quiz.save();
    
    res.json({
      message: "Quiz updated successfully",
      quiz: quiz
    });
  } catch (error) {
    console.error("Error updating quiz:", error);
    res.status(500).json({ message: "Failed to update quiz" });
  }
});

// DELETE a quiz (instructor only) - Updated with Cloudinary handling
router.delete("/:id", protectRoute, authorizeRole(['instructor', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }
    
    // 1. Find the quiz to get its details
    const quiz = await Quiz.findById(id);
    
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    
    const moduleId = quiz.module;
    const deletedOrder = quiz.order;
    
    // 2. Delete associated image from Cloudinary
    if (quiz.image) {
      const publicId = extractPublicIdFromUrl(quiz.image);
      
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
          console.log(`Quiz image deleted from Cloudinary: ${publicId}`);
        } catch (cloudinaryError) {
          console.error("Error deleting quiz image from Cloudinary:", cloudinaryError);
        }
      }
    }
    
    // 3. Delete the quiz from database
    await Quiz.findByIdAndDelete(id);
    
    // 4. ✅ Re-order remaining quizzes in the module
    await reorderQuizzesAfterDeletion(moduleId, deletedOrder);
    
    // 5. Update module by removing quiz reference and updating count
    await Module.findByIdAndUpdate(moduleId, {
      $pull: { quizzes: id },
      $inc: { totalQuizzes: -1 }
    });
    
    res.json({ 
      success: true,
      message: "Quiz deleted and order re-numbered successfully" 
    });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({ message: "Failed to delete quiz" });
  }
});

// ✅ Helper function to re-order quizzes after deletion
async function reorderQuizzesAfterDeletion(moduleId, deletedOrder) {
  try {
    // Find all quizzes in the module with order greater than the deleted quiz
    const quizzesToReorder = await Quiz.find({
      module: moduleId,
      order: { $gt: deletedOrder }
    }).sort({ order: 1 });
    
    // Update each quiz's order by decreasing it by 1
    const updatePromises = quizzesToReorder.map((quiz, index) => {
      const newOrder = deletedOrder + index;
      return Quiz.findByIdAndUpdate(quiz._id, { order: newOrder });
    });
    
    await Promise.all(updatePromises);
    
    console.log(`Re-ordered ${quizzesToReorder.length} quizzes after deletion`);
  } catch (error) {
    console.error("Error re-ordering quizzes:", error);
    throw error;
  }
}

// ✅ Add a route to manually re-order all quizzes in a module (instructor only)
router.post("/reorder/:moduleId", protectRoute, authorizeRole(['instructor', 'admin']), async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { quizOrder } = req.body; // Array of quiz IDs in desired order
    
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      return res.status(400).json({ message: "Invalid module ID" });
    }
    
    if (!Array.isArray(quizOrder)) {
      return res.status(400).json({ message: "Quiz order must be an array" });
    }
    
    // Update each quiz with its new order
    const updatePromises = quizOrder.map((quizId, index) => {
      return Quiz.findByIdAndUpdate(quizId, { order: index + 1 });
    });
    
    await Promise.all(updatePromises);
    
    res.json({
      success: true,
      message: "Quiz order updated successfully"
    });
  } catch (error) {
    console.error("Error reordering quizzes:", error);
    res.status(500).json({ message: "Failed to reorder quizzes" });
  }
});

// ✅ Add route to get quiz for editing
router.get("/edit/:id", protectRoute, authorizeRole(['instructor', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }
    
    const quiz = await Quiz.findById(id).populate('module', 'title');
    
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    
    // Return full quiz data including correct answers for instructor editing
    res.json(quiz);
  } catch (error) {
    console.error("Error fetching quiz for editing:", error);
    res.status(500).json({ message: "Failed to fetch quiz" });
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

// Helper function to extract public_id from Cloudinary URL (same as in moduleRoutes)
function extractPublicIdFromUrl(url) {
  try {
    // Cloudinary URLs usually look like: 
    // https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/folder/image_id.jpg
    
    // Extract everything after the upload/ part up to the last dot
    const regex = /\/upload\/(?:v\d+\/)?(.+?)\.(?:[^.]+)$/;
    const matches = url.match(regex);
    
    if (matches && matches[1]) {
      return matches[1];
    }
    
    return null;
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
}

export default router;