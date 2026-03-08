import express from "express";
import { QuizShowdownQuestion } from "../models/QuizShowdown.js";
import User from "../models/Users.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { trackGameCompletion } from "../middleware/analytics.middleware.js";

const router = express.Router();

// Get all Quiz Showdown questions
router.get("/questions", async (req, res) => {
  try {
    const questions = await QuizShowdownQuestion.find()
      .populate("createdBy", "fullName email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: questions,
    });
  } catch (error) {
    console.error("Error fetching Quiz Showdown questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch questions",
      error: error.message,
    });
  }
});

// Get a specific question by ID
router.get("/questions/:id", async (req, res) => {
  try {
    const question = await QuizShowdownQuestion.findById(
      req.params.id
    ).populate("createdBy", "fullName email");

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    res.json({
      success: true,
      data: question,
    });
  } catch (error) {
    console.error("Error fetching question:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch question",
      error: error.message,
    });
  }
});

// Create a new Quiz Showdown question (requires authentication)
router.post("/questions", protectRoute, async (req, res) => {
  try {
    const { question, options, correct } = req.body;

    // Validation
    if (
      !question ||
      !options ||
      options.length !== 4 ||
      correct === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Question, 4 options, and correct answer index are required",
      });
    }

    if (correct < 0 || correct > 3) {
      return res.status(400).json({
        success: false,
        message: "Correct answer index must be between 0 and 3",
      });
    }

    // Check if all options are provided and not empty
    if (options.some((option) => !option || option.trim() === "")) {
      return res.status(400).json({
        success: false,
        message: "All four options must be provided and non-empty",
      });
    }

    const newQuestion = new QuizShowdownQuestion({
      question: question.trim(),
      options: options.map((option) => option.trim()),
      correct,
      createdBy: req.user.id,
    });

    const savedQuestion = await newQuestion.save();
    await savedQuestion.populate("createdBy", "fullName email");

    res.status(201).json({
      success: true,
      message: "Question created successfully",
      data: savedQuestion,
    });
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create question",
      error: error.message,
    });
  }
});

// Update a Quiz Showdown question (requires authentication)
router.put("/questions/:id", protectRoute, async (req, res) => {
  try {
    const { question, options, correct } = req.body;

    // Validation
    if (
      !question ||
      !options ||
      options.length !== 4 ||
      correct === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Question, 4 options, and correct answer index are required",
      });
    }

    if (correct < 0 || correct > 3) {
      return res.status(400).json({
        success: false,
        message: "Correct answer index must be between 0 and 3",
      });
    }

    // Check if all options are provided and not empty
    if (options.some((option) => !option || option.trim() === "")) {
      return res.status(400).json({
        success: false,
        message: "All four options must be provided and non-empty",
      });
    }

    const existingQuestion = await QuizShowdownQuestion.findById(req.params.id);
    if (!existingQuestion) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    const updatedQuestion = await QuizShowdownQuestion.findByIdAndUpdate(
      req.params.id,
      {
        question: question.trim(),
        options: options.map((option) => option.trim()),
        correct,
      },
      { new: true, runValidators: true }
    ).populate("createdBy", "fullName email");

    res.json({
      success: true,
      message: "Question updated successfully",
      data: updatedQuestion,
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update question",
      error: error.message,
    });
  }
});

// Delete a Quiz Showdown question (requires authentication)
router.delete("/questions/:id", protectRoute, async (req, res) => {
  try {
    const question = await QuizShowdownQuestion.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    await QuizShowdownQuestion.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete question",
      error: error.message,
    });
  }
});

// Bulk create questions (for initial setup or import)
router.post("/questions/bulk", protectRoute, async (req, res) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Questions array is required",
      });
    }

    // Validate each question
    const validationErrors = [];
    questions.forEach((q, index) => {
      if (
        !q.question ||
        !q.options ||
        q.options.length !== 4 ||
        q.correct === undefined
      ) {
        validationErrors.push(`Question ${index + 1}: Missing required fields`);
      }
      if (q.correct < 0 || q.correct > 3) {
        validationErrors.push(
          `Question ${index + 1}: Invalid correct answer index`
        );
      }
      if (
        q.options &&
        q.options.some((option) => !option || option.trim() === "")
      ) {
        validationErrors.push(
          `Question ${index + 1}: All options must be non-empty`
        );
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: validationErrors,
      });
    }

    // Prepare questions for insertion
    const questionsToInsert = questions.map((q) => ({
      question: q.question.trim(),
      options: q.options.map((option) => option.trim()),
      correct: q.correct,
      createdBy: req.user.id,
    }));

    const savedQuestions = await QuizShowdownQuestion.insertMany(
      questionsToInsert
    );

    res.status(201).json({
      success: true,
      message: `${savedQuestions.length} questions created successfully`,
      data: savedQuestions,
    });
  } catch (error) {
    console.error("Error bulk creating questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create questions",
      error: error.message,
    });
  }
});

// Get questions count
router.get("/questions/stats/count", async (req, res) => {
  try {
    const count = await QuizShowdownQuestion.countDocuments();

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error("Error getting questions count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get questions count",
      error: error.message,
    });
  }
});

// Search questions
router.get("/questions/search", async (req, res) => {
  try {
    const { query, limit = 10, skip = 0 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const searchRegex = new RegExp(query, "i");
    const questions = await QuizShowdownQuestion.find({
      $or: [{ question: searchRegex }, { options: { $in: [searchRegex] } }],
    })
      .populate("createdBy", "name email")
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });

    const total = await QuizShowdownQuestion.countDocuments({
      $or: [{ question: searchRegex }, { options: { $in: [searchRegex] } }],
    });

    res.json({
      success: true,
      data: {
        questions,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
      },
    });
  } catch (error) {
    console.error("Error searching questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search questions",
      error: error.message,
    });
  }
});

// Upload questions from JSON file (for instructor mode)
router.post("/upload-questions", protectRoute, async (req, res) => {
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
        errors.push(`Question ${index + 1}: Missing or invalid question text`);
        return;
      }

      if (!question.options || !Array.isArray(question.options)) {
        errors.push(`Question ${index + 1}: Missing or invalid options array`);
        return;
      }

      if (question.options.length < 2) {
        errors.push(`Question ${index + 1}: Must have at least 2 options`);
        return;
      }

      if (question.options.length > 4) {
        errors.push(`Question ${index + 1}: Cannot have more than 4 options`);
        return;
      }

      if (
        typeof question.correct !== "number" ||
        question.correct < 0 ||
        question.correct >= question.options.length
      ) {
        errors.push(
          `Question ${
            index + 1
          }: Invalid correct answer index (must be between 0 and ${
            question.options.length - 1
          })`
        );
        return;
      }

      // Check if options are valid strings
      if (
        question.options.some(
          (option) =>
            !option || typeof option !== "string" || option.trim() === ""
        )
      ) {
        errors.push(
          `Question ${index + 1}: All options must be non-empty strings`
        );
        return;
      }

      // Ensure exactly 4 options (pad with empty strings if needed)
      const normalizedOptions = [...question.options];
      while (normalizedOptions.length < 4) {
        normalizedOptions.push("");
      }

      // Create standardized question object
      const standardQuestion = {
        question: question.question.trim(),
        options: normalizedOptions.slice(0, 4).map((opt) => opt.trim()),
        correct: question.correct,
        // Optional fields with defaults
        category: question.category || "General",
        difficulty: question.difficulty || "Medium",
        points:
          question.points ||
          (question.difficulty === "Easy"
            ? 1
            : question.difficulty === "Hard"
            ? 3
            : 2),
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

    // Save valid questions to database
    const questionsToSave = validQuestions.map((q) => ({
      question: q.question,
      options: q.options,
      correct: q.correct,
      createdBy: req.user.id,
    }));

    const savedQuestions = await QuizShowdownQuestion.insertMany(
      questionsToSave
    );

    // Return response with results
    if (errors.length > 0) {
      res.status(207).json({
        success: true,
        message: `${validQuestions.length} questions uploaded successfully with ${errors.length} errors`,
        count: validQuestions.length,
        questions: savedQuestions,
        errors,
        validCount: validQuestions.length,
      });
    } else {
      res.json({
        success: true,
        message: `Successfully uploaded ${validQuestions.length} questions`,
        count: validQuestions.length,
        questions: savedQuestions,
        errors: [],
        validCount: validQuestions.length,
      });
    }
  } catch (error) {
    console.error("Error uploading questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload questions",
      error: error.message,
    });
  }
});

// Validate questions format (for preview before upload)
router.post("/validate-questions", async (req, res) => {
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

    const errors = [];
    questions.forEach((question, index) => {
      if (!question.question || typeof question.question !== "string") {
        errors.push(`Question ${index + 1}: Missing or invalid question text`);
      }

      if (!question.options || !Array.isArray(question.options)) {
        errors.push(`Question ${index + 1}: Missing or invalid options array`);
      } else if (question.options.length < 2) {
        errors.push(`Question ${index + 1}: Must have at least 2 options`);
      } else if (question.options.length > 4) {
        errors.push(`Question ${index + 1}: Cannot have more than 4 options`);
      }

      if (
        typeof question.correct !== "number" ||
        question.correct < 0 ||
        (question.options && question.correct >= question.options.length)
      ) {
        errors.push(`Question ${index + 1}: Invalid correct answer index`);
      }

      if (
        question.options &&
        question.options.some(
          (option) =>
            !option || typeof option !== "string" || option.trim() === ""
        )
      ) {
        errors.push(
          `Question ${index + 1}: All options must be non-empty strings`
        );
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
    console.error("Error validating questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate questions",
    });
  }
});

// Track game completion for Quiz Showdown
router.post(
  "/game/complete",
  protectRoute,
  trackGameCompletion("quizShowdown"),
  async (req, res) => {
    try {
      const { gameResult, finalScore, playersData } = req.body;

      res.json({
        success: true,
        message: "Quiz Showdown game completion tracked",
        data: {
          gameResult,
          finalScore,
          playersData,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error("Error tracking Quiz Showdown completion:", error);
      res.status(500).json({
        success: false,
        message: "Failed to track game completion",
      });
    }
  }
);

export default router;
