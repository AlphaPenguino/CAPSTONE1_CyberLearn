import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { trackGameCompletion } from "../middleware/analytics.middleware.js";
import { rainOfWordsGames, rainOfWordsPlayers } from "../controllers/rainOfWordsController.js";

const router = express.Router();

// Rain of Words game constants and models
const SAMPLE_QUESTIONS = [
  {
    id: 5,
    question: "What does CPU stand for?",
    answers: ["Central", "Computer", "Control", "Central Processing Unit"],
    correct: "Central Processing Unit",
    category: "Hardware",
  },
  {
    id: 2,
    question: "Which port is commonly used for HTTPS?",
    answers: ["80", "443", "8080", "3000"],
    correct: "443",
    category: "Network",
  },
  {
    id: 3,
    question: "What does DDoS stand for?",
    answers: ["Distributed", "Digital", "Direct", "Denial"],
    correct: "Distributed",
    category: "Cybersecurity",
  },
  {
    id: 4,
    question: "Which is a NoSQL database?",
    answers: ["PostgreSQL", "MongoDB", "MySQL", "SQLite"],
    correct: "MongoDB",
    category: "Database",
  },
  {
    id: 5,
    question: "What does CPU stand for?",
    answers: ["Central", "Computer", "Control", "Central Processing Unit"],
    correct: "Central Processing Unit",
    category: "Hardware",
  },
];

// ============================================================================
// QUESTION MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /rain-of-words/questions
 * Get all Rain of Words questions
 */
router.get("/questions", async (req, res) => {
  try {
    res.json({
      success: true,
      data: SAMPLE_QUESTIONS,
    });
  } catch (error) {
    console.error("Error fetching Rain of Words questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch questions",
      error: error.message,
    });
  }
});

/**
 * GET /rain-of-words/questions/:id
 * Get a specific question by ID
 */
router.get("/questions/:id", async (req, res) => {
  try {
    const question = SAMPLE_QUESTIONS.find(
      (q) => q.id === parseInt(req.params.id)
    );

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

/**
 * POST /rain-of-words/questions
 * Create a new Rain of Words question (requires authentication)
 */
router.post("/questions", protectRoute, async (req, res) => {
  try {
    const { question, answers, correct, category } = req.body;

    // Validation
    if (!question || !answers || answers.length !== 4 || !correct) {
      return res.status(400).json({
        success: false,
        message: "Question, 4 answers, and correct answer are required",
      });
    }

    // Check if all answers are provided and not empty
    if (answers.some((answer) => !answer || answer.trim() === "")) {
      return res.status(400).json({
        success: false,
        message: "All four answers must be provided and non-empty",
      });
    }

    // Check if correct answer is in the answers array
    if (!answers.includes(correct)) {
      return res.status(400).json({
        success: false,
        message: "Correct answer must be one of the provided answers",
      });
    }

    const newQuestion = {
      id: SAMPLE_QUESTIONS.length + 1,
      question: question.trim(),
      answers: answers.map((answer) => answer.trim()),
      correct: correct.trim(),
      category: category || "General",
      createdBy: req.user?.id,
      createdAt: new Date(),
    };

    SAMPLE_QUESTIONS.push(newQuestion);

    res.status(201).json({
      success: true,
      message: "Question created successfully",
      data: newQuestion,
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

/**
 * PUT /rain-of-words/questions/:id
 * Update a Rain of Words question (requires authentication)
 */
router.put("/questions/:id", protectRoute, async (req, res) => {
  try {
    const { question, answers, correct, category } = req.body;
    const questionId = parseInt(req.params.id);

    // Validation
    if (!question || !answers || answers.length !== 4 || !correct) {
      return res.status(400).json({
        success: false,
        message: "Question, 4 answers, and correct answer are required",
      });
    }

    // Check if all answers are provided and not empty
    if (answers.some((answer) => !answer || answer.trim() === "")) {
      return res.status(400).json({
        success: false,
        message: "All four answers must be provided and non-empty",
      });
    }

    // Check if correct answer is in the answers array
    if (!answers.includes(correct)) {
      return res.status(400).json({
        success: false,
        message: "Correct answer must be one of the provided answers",
      });
    }

    const questionIndex = SAMPLE_QUESTIONS.findIndex((q) => q.id === questionId);
    if (questionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    const updatedQuestion = {
      ...SAMPLE_QUESTIONS[questionIndex],
      question: question.trim(),
      answers: answers.map((answer) => answer.trim()),
      correct: correct.trim(),
      category: category || SAMPLE_QUESTIONS[questionIndex].category,
      updatedAt: new Date(),
    };

    SAMPLE_QUESTIONS[questionIndex] = updatedQuestion;

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

/**
 * DELETE /rain-of-words/questions/:id
 * Delete a Rain of Words question (requires authentication)
 */
router.delete("/questions/:id", protectRoute, async (req, res) => {
  try {
    const questionId = parseInt(req.params.id);
    const questionIndex = SAMPLE_QUESTIONS.findIndex((q) => q.id === questionId);

    if (questionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    SAMPLE_QUESTIONS.splice(questionIndex, 1);

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

/**
 * POST /rain-of-words/questions/bulk
 * Bulk create questions (for initial setup or import)
 */
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
      if (!q.question || !q.answers || q.answers.length !== 4 || !q.correct) {
        validationErrors.push(`Question ${index + 1}: Missing required fields`);
      }
      if (q.answers && q.answers.some((answer) => !answer || answer.trim() === "")) {
        validationErrors.push(`Question ${index + 1}: All answers must be non-empty`);
      }
      if (q.answers && !q.answers.includes(q.correct)) {
        validationErrors.push(`Question ${index + 1}: Correct answer not in answers`);
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: validationErrors,
      });
    }

    // Add questions to array
    const addedQuestions = questions.map((q, index) => ({
      id: SAMPLE_QUESTIONS.length + index + 1,
      question: q.question.trim(),
      answers: q.answers.map((answer) => answer.trim()),
      correct: q.correct.trim(),
      category: q.category || "General",
      createdBy: req.user?.id,
      createdAt: new Date(),
    }));

    SAMPLE_QUESTIONS.push(...addedQuestions);

    res.status(201).json({
      success: true,
      message: `${addedQuestions.length} questions created successfully`,
      data: addedQuestions,
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

/**
 * GET /rain-of-words/questions/stats/count
 * Get questions count
 */
router.get("/questions/stats/count", async (req, res) => {
  try {
    res.json({
      success: true,
      data: { count: SAMPLE_QUESTIONS.length },
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

/**
 * GET /rain-of-words/questions/search
 * Search questions
 */
router.get("/search", async (req, res) => {
  try {
    const { query, limit = 10, skip = 0 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query parameter is required",
      });
    }

    const searchRegex = new RegExp(query, "i");
    const filtered = SAMPLE_QUESTIONS.filter(
      (q) =>
        searchRegex.test(q.question) ||
        q.answers.some((answer) => searchRegex.test(answer))
    );

    const paginated = filtered.slice(parseInt(skip), parseInt(skip) + parseInt(limit));

    res.json({
      success: true,
      data: {
        questions: paginated,
        total: filtered.length,
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

/**
 * POST /rain-of-words/upload-questions
 * Upload questions from JSON file (for instructor mode)
 */
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

    const errors = [];
    const validQuestions = [];

    questions.forEach((question, index) => {
      if (!question.question) {
        errors.push(`Question ${index + 1}: Missing question text`);
        return;
      }
      if (!question.answers || !Array.isArray(question.answers)) {
        errors.push(`Question ${index + 1}: Answers must be an array`);
        return;
      }
      if (!question.correct) {
        errors.push(`Question ${index + 1}: Missing correct answer`);
        return;
      }

      let normalizedOptions = [...question.answers];
      while (normalizedOptions.length < 4) {
        normalizedOptions.push("");
      }

      if (normalizedOptions.some((option) => !option || option.trim() === "")) {
        errors.push(`Question ${index + 1}: Need exactly 4 non-empty answers`);
        return;
      }

      if (!normalizedOptions.includes(question.correct)) {
        errors.push(`Question ${index + 1}: Correct answer not in answers`);
        return;
      }

      validQuestions.push({
        question: question.question.trim(),
        answers: normalizedOptions.map((a) => a.trim()),
        correct: question.correct.trim(),
        category: question.category || "General",
      });
    });

    if (errors.length > 0 && validQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid questions found",
        errors,
      });
    }

    // Save valid questions
    const questionsToSave = validQuestions.map((q, index) => ({
      id: SAMPLE_QUESTIONS.length + index + 1,
      ...q,
      createdBy: req.user?.id,
      createdAt: new Date(),
    }));

    SAMPLE_QUESTIONS.push(...questionsToSave);

    if (errors.length > 0) {
      return res.status(207).json({
        success: true,
        message: `${validQuestions.length} questions uploaded (${errors.length} errors)`,
        data: questionsToSave,
        errors,
      });
    }

    res.status(201).json({
      success: true,
      message: `${validQuestions.length} questions uploaded successfully`,
      data: questionsToSave,
    });
  } catch (error) {
    console.error("Error uploading questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload questions",
      error: error.message,
    });
  }
});

/**
 * POST /rain-of-words/validate-questions
 * Validate questions format (for preview before upload)
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

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one question is required",
      });
    }

    const errors = [];
    questions.forEach((question, index) => {
      if (!question.question) {
        errors.push(`Question ${index + 1}: Missing question text`);
      }
      if (!question.answers || !Array.isArray(question.answers)) {
        errors.push(`Question ${index + 1}: Answers must be an array`);
      }
      if (!question.correct) {
        errors.push(`Question ${index + 1}: Missing correct answer`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
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

/**
 * POST /rain-of-words/game/complete
 * Track game completion for analytics
 */
router.post(
  "/game/complete",
  protectRoute,
  trackGameCompletion("rainOfWords"),
  async (req, res) => {
    try {
      const { gameResult, finalScore, playersData } = req.body;

      res.json({
        success: true,
        message: "Rain of Words game completion tracked",
        data: {
          gameResult,
          finalScore,
          playersData,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error("Error tracking Rain of Words completion:", error);
      res.status(500).json({
        success: false,
        message: "Failed to track game completion",
      });
    }
  }
);

/**
 * GET /rain-of-words/debug/rooms
 * Debug endpoint to list active rooms
 * @access  Public (for debugging)
 */
router.get("/debug/rooms", (req, res) => {
  try {
    const rooms = Array.from(rainOfWordsGames.entries()).map(
      ([roomCode, game]) => ({
        roomCode,
        playerCount: game.players.size,
        gameState: game.gameState,
        maxPlayers: game.maxPlayers,
        createdAt: game.createdAt,
        players: Array.from(game.players.values()).map((p) => ({
          name: p.name,
        })),
      })
    );

    const players = Array.from(rainOfWordsPlayers.entries()).map(
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
      totalRooms: rainOfWordsGames.size,
      activePlayers: players,
      totalPlayers: rainOfWordsPlayers.size,
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

export default router;
