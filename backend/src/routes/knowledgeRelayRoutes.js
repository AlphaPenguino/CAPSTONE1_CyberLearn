import express from "express";
import {
  knowledgeRelayQuestions,
  TEAMS,
  PHASES,
} from "../models/KnowledgeRelay.js";
import { KnowledgeRelayQuestion } from "../models/KnowledgeRelayQuestion.js";
import {
  setGlobalKnowledgeRelayQuestions,
  getGlobalKnowledgeRelayQuestions,
} from "../controllers/knowledgeRelayController.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { trackGameCompletion } from "../middleware/analytics.middleware.js";

const router = express.Router();

// Get default questions for Knowledge Relay
router.get("/questions", (req, res) => {
  try {
    res.json({
      success: true,
      questions: knowledgeRelayQuestions,
      count: knowledgeRelayQuestions.length,
    });
  } catch (error) {
    console.error("Error fetching Knowledge Relay questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch questions",
    });
  }
});

// Get team configurations
router.get("/teams", (req, res) => {
  try {
    res.json({
      success: true,
      teams: TEAMS,
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch teams",
    });
  }
});

// Get game phases
router.get("/phases", (req, res) => {
  try {
    res.json({
      success: true,
      phases: PHASES,
    });
  } catch (error) {
    console.error("Error fetching phases:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch phases",
    });
  }
});

// Validate questions format (for instructor mode)
router.post("/validate-questions", (req, res) => {
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
      if (!question.question || typeof question.question !== "string") {
        errors.push(`Question ${index + 1}: Missing or invalid question text`);
      }

      if (
        !question.options ||
        !Array.isArray(question.options) ||
        question.options.length < 2
      ) {
        errors.push(`Question ${index + 1}: Must have at least 2 options`);
      }

      if (
        typeof question.correctAnswer !== "number" ||
        question.correctAnswer < 0 ||
        question.correctAnswer >= (question.options?.length || 0)
      ) {
        errors.push(`Question ${index + 1}: Invalid correct answer index`);
      }

      if (question.category && typeof question.category !== "string") {
        errors.push(`Question ${index + 1}: Category must be a string`);
      }

      if (
        question.difficulty &&
        !["Easy", "Medium", "Hard"].includes(question.difficulty)
      ) {
        errors.push(
          `Question ${index + 1}: Difficulty must be Easy, Medium, or Hard`
        );
      }

      if (
        question.points &&
        (typeof question.points !== "number" || question.points < 0)
      ) {
        errors.push(
          `Question ${index + 1}: Points must be a non-negative number`
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

// Upload questions from JSON file (for instructor mode)
router.post("/upload-questions", (req, res) => {
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
    const processedQuestions = [];

    questions.forEach((question, index) => {
      // Validate required fields
      if (!question.question || typeof question.question !== "string") {
        errors.push(`Question ${index + 1}: Missing or invalid question text`);
        return;
      }

      if (
        !question.options ||
        !Array.isArray(question.options) ||
        question.options.length < 2
      ) {
        errors.push(`Question ${index + 1}: Must have at least 2 options`);
        return;
      }

      if (
        typeof question.correctAnswer !== "number" ||
        question.correctAnswer < 0 ||
        question.correctAnswer >= question.options.length
      ) {
        errors.push(`Question ${index + 1}: Invalid correct answer index`);
        return;
      }

      // Process and normalize the question
      const processedQuestion = {
        id: question.id || index + 1,
        question: question.question.trim(),
        options: question.options.map((opt) => String(opt).trim()),
        correctAnswer: question.correctAnswer,
        category: question.category || "General",
        difficulty: question.difficulty || "Medium",
        points:
          question.points ||
          (question.difficulty === "Hard"
            ? 3
            : question.difficulty === "Medium"
            ? 2
            : 1),
      };

      // Validate optional fields
      if (!["Easy", "Medium", "Hard"].includes(processedQuestion.difficulty)) {
        processedQuestion.difficulty = "Medium";
      }

      if (
        typeof processedQuestion.points !== "number" ||
        processedQuestion.points < 0
      ) {
        processedQuestion.points =
          processedQuestion.difficulty === "Hard"
            ? 3
            : processedQuestion.difficulty === "Medium"
            ? 2
            : 1;
      }

      processedQuestions.push(processedQuestion);
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
        validCount: processedQuestions.length,
        totalCount: questions.length,
      });
    }

    res.json({
      success: true,
      message: `Successfully processed ${processedQuestions.length} questions`,
      questions: processedQuestions,
      count: processedQuestions.length,
    });
  } catch (error) {
    console.error("Error uploading questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process questions upload",
    });
  }
});

// Get game statistics (if needed for analytics)
router.get("/stats", (req, res) => {
  try {
    // This would typically come from a database
    // For now, return basic stats structure
    res.json({
      success: true,
      stats: {
        totalGamesPlayed: 0,
        totalPlayers: 0,
        averageGameDuration: 0,
        popularQuestionCategories: [],
        teamWinRates: {
          A: 0,
          B: 0,
          C: 0,
          D: 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
    });
  }
});

// Load questions globally (for instructor mode) - persists in-memory and updates all active games
router.post("/load-questions-global", async (req, res) => {
  try {
    const { questions, persist = true } = req.body;

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
    questions.forEach((question, index) => {
      if (!question.question || typeof question.question !== "string") {
        errors.push(`Question ${index + 1}: Missing or invalid question text`);
      }
      if (
        !question.options ||
        !Array.isArray(question.options) ||
        question.options.length < 2
      ) {
        errors.push(`Question ${index + 1}: Must have at least 2 options`);
      }
      if (
        typeof question.correctAnswer !== "number" ||
        question.correctAnswer < 0 ||
        question.correctAnswer >= (question.options?.length || 0)
      ) {
        errors.push(`Question ${index + 1}: Invalid correct answer index`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // Normalize minimal optional fields
    const normalized = questions.map((q, idx) => ({
      id: q.id || idx + 1,
      question: q.question.trim(),
      options: q.options.map((o) => String(o).trim()),
      correctAnswer: q.correctAnswer,
      category: q.category || "General",
      difficulty: ["Easy", "Medium", "Hard"].includes(q.difficulty)
        ? q.difficulty
        : "Medium",
      points:
        typeof q.points === "number" && q.points >= 0
          ? q.points
          : q.difficulty === "Hard"
          ? 3
          : q.difficulty === "Medium"
          ? 2
          : 1,
    }));

    // Update global shared questions in-memory
    setGlobalKnowledgeRelayQuestions(normalized);

    let persisted = 0;
    if (persist) {
      // Purge existing questions (could be changed to soft delete later)
      await KnowledgeRelayQuestion.deleteMany({});
      const docs = normalized.map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        category: q.category,
        difficulty: q.difficulty,
        points: q.points,
        isActive: true,
      }));
      const inserted = await KnowledgeRelayQuestion.insertMany(docs);
      persisted = inserted.length;
      console.log(
        `Knowledge Relay - Persisted ${persisted} global questions to MongoDB.`
      );
    }

    console.log(
      `Knowledge Relay - Loaded ${
        normalized.length
      } global questions (in-memory${persist ? ", persisted" : ""})`
    );

    res.json({
      success: true,
      message: `Successfully loaded ${normalized.length} questions globally${
        persist ? " and saved to database" : ""
      }`,
      count: normalized.length,
      persisted,
    });
  } catch (error) {
    console.error("Error loading questions globally:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load questions globally",
    });
  }
});

// Get currently globally loaded questions
router.get("/global-questions", async (req, res) => {
  try {
    // Prefer persisted questions if available
    const dbQuestions = await KnowledgeRelayQuestion.find({ isActive: true })
      .lean()
      .exec();
    if (dbQuestions.length > 0) {
      return res.json({
        success: true,
        questions: dbQuestions.map((q) => ({
          id: q._id.toString(),
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          category: q.category,
          difficulty: q.difficulty,
          points: q.points,
        })),
        count: dbQuestions.length,
        source: "database",
      });
    }

    const questions = getGlobalKnowledgeRelayQuestions();
    res.json({
      success: true,
      questions,
      count: questions.length,
      source: "memory",
    });
  } catch (error) {
    console.error("Error fetching global questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch global questions",
    });
  }
});

// Generate a random room ID
router.get("/generate-room-id", (req, res) => {
  try {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    res.json({
      success: true,
      roomId,
    });
  } catch (error) {
    console.error("Error generating room ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate room ID",
    });
  }
});

// Health check for Knowledge Relay
router.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "Knowledge Relay",
    status: "operational",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Track game completion for Knowledge Relay
router.post(
  "/game/complete",
  protectRoute,
  trackGameCompletion("knowledgeRelay"),
  async (req, res) => {
    try {
      const { gameResult, teamResult, finalScore } = req.body;

      res.json({
        success: true,
        message: "Knowledge Relay game completion tracked",
        data: {
          gameResult,
          teamResult,
          finalScore,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error("Error tracking Knowledge Relay completion:", error);
      res.status(500).json({
        success: false,
        message: "Failed to track game completion",
      });
    }
  }
);

export default router;
