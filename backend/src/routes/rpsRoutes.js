import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { trackGameCompletion } from "../middleware/analytics.middleware.js";
import {
  logActivity,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  extractRequestInfo,
} from "../lib/auditLogger.js";
import {
  rpsGames,
  createRpsGame,
  joinRpsGame,
  leaveRpsGame,
  getRpsGameState,
  updateRpsGameState,
  deleteRpsGame,
  getAllRpsGames,
} from "../state/rpsState.js";

const router = express.Router();

// RPS game constants
const TEAMS = {
  A: { name: "Team Mystics", color: "#8B5CF6", icon: "alpha-a-box" },
  B: { name: "Team Legends", color: "#F59E0B", icon: "alpha-b-box" },
};

const PHASES = {
  ROOM_SETUP: "room_setup",
  TEAM_SELECTION: "team_selection",
  GAME_RULES: "game_rules",
  PLAYING: "playing",
  FINISHED: "finished",
};

const PLAY_STAGE = {
  QUESTION: "question_display",
  VOTING: "voting",
  REVEAL: "reveal",
  ANSWERING: "answering",
  REBOUND: "rebound",
};

const RPS_CHOICES = {
  ROCK: "rock",
  PAPER: "paper",
  SCISSORS: "scissors",
};

const logRpsActivity = async ({ req, action, roomCode, details = {} }) => {
  const requestInfo = extractRequestInfo(req);
  await logActivity({
    userId: req.user?.id || null,
    username: req.user?.username || details.username || "Unknown Player",
    userRole: req.user?.privilege || "student",
    action,
    resource: AUDIT_RESOURCES.MULTIPLAYER_GAME,
    resourceId: roomCode,
    details: {
      gameType: "rps",
      roomCode,
      ...details,
    },
    ...requestInfo,
  });
};

const SAMPLE_QUESTIONS = [
  {
    id: 1,
    question: "What does MERN stand for?",
    options: [
      "MongoDB, Express, React, Node",
      "MySQL, Express, React, Node",
      "MongoDB, Ember, React, Node",
      "MongoDB, Express, Ruby, Node",
    ],
    correct: 0,
  },
  {
    id: 2,
    question: "Which of these is a NoSQL database?",
    options: ["PostgreSQL", "MongoDB", "MySQL", "SQLite"],
    correct: 1,
  },
  {
    id: 3,
    question: "What does REST stand for?",
    options: [
      "Representational State Transfer",
      "Rapid Server Technology",
      "Remote Server Transfer",
      "Resource Stack Transfer",
    ],
    correct: 0,
  },
  {
    id: 4,
    question: "Which JavaScript method removes the last element?",
    options: ["shift()", "pop()", "unshift()", "push()"],
    correct: 1,
  },
  {
    id: 5,
    question: "What is React primarily used for?",
    options: [
      "Database management",
      "Building user interfaces",
      "Server management",
      "Authentication",
    ],
    correct: 1,
  },
];

// Generate a random 6-character room code
function generateRoomCode() {
  return Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();
}

// Get a random question from SAMPLE_QUESTIONS
function getRandomQuestion() {
  return SAMPLE_QUESTIONS[Math.floor(Math.random() * SAMPLE_QUESTIONS.length)];
}

// ============================================================================
// ROOM MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /rps/rooms
 * Create a new RPS game room
 * Body: { username: string }
 * Returns: { success, room: { roomCode, players, scores, phase } }
 */
router.post("/rooms", protectRoute, (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    let roomCode = generateRoomCode();
    // Ensure uniqueness
    while (rpsGames.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const game = createRpsGame(roomCode, userId, username);

    res.status(201).json({
      success: true,
      message: "RPS room created successfully",
      room: {
        roomCode: game.roomCode,
        createdBy: game.createdBy,
        creatorName: game.creatorName,
        status: game.status,
        phase: game.phase,
        players: game.players,
        scores: game.scores,
        teams: TEAMS,
        createdAt: game.createdAt,
      },
    });

    logRpsActivity({
      req,
      action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_CREATE,
      roomCode,
      details: {
        event: "room_created",
        username,
        teamSizes: {
          A: game.players.A.length,
          B: game.players.B.length,
        },
      },
    }).catch((error) => console.error("Failed to log RPS room create:", error));
  } catch (error) {
    console.error("Error creating RPS room:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create room",
    });
  }
});

/**
 * GET /rps/rooms/:roomCode
 * Get the current state of a room
 * Returns: { success, room: { roomCode, players, scores, phase, playStage, ... } }
 */
router.get("/rooms/:roomCode", (req, res) => {
  try {
    const { roomCode } = req.params;
    const game = getRpsGameState(roomCode);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    res.json({
      success: true,
      room: {
        roomCode: game.roomCode,
        status: game.status,
        phase: game.phase,
        playStage: game.playStage,
        players: game.players,
        scores: game.scores,
        currentRoundIndex: game.currentRoundIndex,
        currentQuestion: game.currentQuestion,
        voteTally: game.voteTally,
        teamVotes: game.teamVotes,
        rpsWinner: game.rpsWinner,
        answeringTeam: game.answeringTeam,
        selectedAnswer: game.selectedAnswer,
        isCorrect: game.isCorrect,
        gameHistory: game.gameHistory,
        voteTimer: game.voteTimer,
        stealTimer: game.stealTimer,
        teams: TEAMS,
      },
    });
  } catch (error) {
    console.error("Error fetching RPS room:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch room",
    });
  }
});

/**
 * POST /rps/rooms/:roomCode/join
 * Join an existing room
 * Body: { username: string, teamCode: "A" | "B" }
 * Returns: { success, room: { roomCode, players, scores, ... } }
 */
router.post("/rooms/:roomCode/join", protectRoute, (req, res) => {
  try {
    const { roomCode } = req.params;
    const { username, teamCode } = req.body;
    const userId = req.user.id;

    if (!username || !teamCode) {
      return res.status(400).json({
        success: false,
        message: "Username and teamCode are required",
      });
    }

    if (!["A", "B"].includes(teamCode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team code. Must be 'A' or 'B'",
      });
    }

    const game = joinRpsGame(roomCode, userId, username, teamCode);

    res.json({
      success: true,
      message: "Joined room successfully",
      room: {
        roomCode: game.roomCode,
        status: game.status,
        phase: game.phase,
        players: game.players,
        scores: game.scores,
        teams: TEAMS,
      },
    });

    logRpsActivity({
      req,
      action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_JOIN,
      roomCode,
      details: {
        event: "room_joined",
        username,
        teamCode,
        teamSizes: {
          A: game.players.A.length,
          B: game.players.B.length,
        },
      },
    }).catch((error) => console.error("Failed to log RPS room join:", error));
  } catch (error) {
    console.error("Error joining RPS room:", error);
    const statusCode = error.message.includes("not found") ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to join room",
    });
  }
});

/**
 * POST /rps/rooms/:roomCode/leave
 * Leave a room
 * Returns: { success, message }
 */
router.post("/rooms/:roomCode/leave", protectRoute, (req, res) => {
  try {
    const { roomCode } = req.params;
    const userId = req.user.id;

    const game = leaveRpsGame(userId, roomCode);

    res.json({
      success: true,
      message: "Left room successfully",
      roomDeleted: !game, // Room was deleted if no players left
    });

    logRpsActivity({
      req,
      action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_LEAVE,
      roomCode,
      details: {
        event: "room_left",
        roomDeleted: !game,
      },
    }).catch((error) => console.error("Failed to log RPS room leave:", error));
  } catch (error) {
    console.error("Error leaving RPS room:", error);
    res.status(500).json({
      success: false,
      message: "Failed to leave room",
    });
  }
});

// ============================================================================
// GAME STATE ENDPOINTS
// ============================================================================

/**
 * POST /rps/rooms/:roomCode/state
 * Update the game state (for phase/stage transitions, scoring, etc.)
 * Body: { updates: { phase?, playStage?, scores?, voteTally?, ... } }
 * Returns: { success, room: updated game state }
 */
router.post("/rooms/:roomCode/state", protectRoute, (req, res) => {
  try {
    const { roomCode } = req.params;
    const { updates } = req.body;

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        success: false,
        message: "Updates object is required",
      });
    }

    const game = updateRpsGameState(roomCode, updates);

    res.json({
      success: true,
      message: "Game state updated",
      room: {
        roomCode: game.roomCode,
        phase: game.phase,
        playStage: game.playStage,
        players: game.players,
        scores: game.scores,
        currentRoundIndex: game.currentRoundIndex,
        currentQuestion: game.currentQuestion,
        voteTally: game.voteTally,
        teamVotes: game.teamVotes,
        rpsWinner: game.rpsWinner,
        answeringTeam: game.answeringTeam,
        selectedAnswer: game.selectedAnswer,
        isCorrect: game.isCorrect,
        voteTimer: game.voteTimer,
        stealTimer: game.stealTimer,
      },
    });

    logRpsActivity({
      req,
      action: AUDIT_ACTIONS.GAME_START,
      roomCode,
      details: {
        event: "state_updated",
        phase: game.phase,
        playStage: game.playStage,
        currentRoundIndex: game.currentRoundIndex,
        answeringTeam: game.answeringTeam,
        selectedAnswer: game.selectedAnswer,
        isCorrect: game.isCorrect,
        scoreA: game.scores?.A,
        scoreB: game.scores?.B,
      },
    }).catch((error) => console.error("Failed to log RPS state update:", error));
  } catch (error) {
    console.error("Error updating RPS game state:", error);
    const statusCode = error.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update game state",
    });
  }
});

/**
 * POST /rps/rooms/:roomCode/start
 * Start the game (transition from team selection to game rules -> playing)
 * Returns: { success, room: updated game state }
 */
router.post("/rooms/:roomCode/start", protectRoute, (req, res) => {
  try {
    const { roomCode } = req.params;
    const game = getRpsGameState(roomCode);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Validate both teams have at least one player
    if (game.players.A.length === 0 || game.players.B.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Both teams must have at least one player",
      });
    }

    // Update game state
    game.status = "playing";
    game.phase = PHASES.PLAYING;
    game.playStage = PLAY_STAGE.QUESTION;
    game.currentRoundIndex = 0;
    game.currentQuestion = getRandomQuestion();
    game.answeringTeam = null;
    game.selectedAnswer = null;
    game.isCorrect = null;

    res.json({
      success: true,
      message: "Game started",
      room: {
        roomCode: game.roomCode,
        status: game.status,
        phase: game.phase,
        playStage: game.playStage,
        players: game.players,
        scores: game.scores,
        currentQuestion: game.currentQuestion,
      },
    });

    logRpsActivity({
      req,
      action: AUDIT_ACTIONS.GAME_START,
      roomCode,
      details: {
        event: "game_started",
        currentQuestionId: game.currentQuestion?.id || null,
        scoreA: game.scores?.A,
        scoreB: game.scores?.B,
      },
    }).catch((error) => console.error("Failed to log RPS game start:", error));
  } catch (error) {
    console.error("Error starting RPS game:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start game",
    });
  }
});

// ============================================================================
// GAME COMPLETION & ANALYTICS
// ============================================================================

/**
 * POST /rps/rooms/:roomCode/complete
 * Track game completion for analytics
 * Body: { gameResult, teamResult, finalScore }
 * Returns: { success, message }
 */
router.post(
  "/rooms/:roomCode/complete",
  protectRoute,
  trackGameCompletion("rps"),
  async (req, res) => {
    try {
      const { roomCode } = req.params;
      const { gameResult, teamResult, finalScore } = req.body;

      const game = getRpsGameState(roomCode);
      if (!game) {
        return res.status(404).json({
          success: false,
          message: "Room not found",
        });
      }

      // Mark game as finished
      game.status = "finished";
      game.phase = PHASES.FINISHED;

      res.json({
        success: true,
        message: "RPS game completion tracked",
        data: {
          gameResult,
          teamResult,
          finalScore,
          gameHistory: game.gameHistory,
          timestamp: new Date(),
        },
      });

      logRpsActivity({
        req,
        action: AUDIT_ACTIONS.GAME_END,
        roomCode,
        details: {
          event: "game_completed",
          gameResult,
          teamResult,
          finalScore,
        },
      }).catch((error) => console.error("Failed to log RPS game end:", error));
    } catch (error) {
      console.error("Error tracking RPS game completion:", error);
      res.status(500).json({
        success: false,
        message: "Failed to track game completion",
      });
    }
  }
);

// ============================================================================
// CONFIGURATION & INFO ENDPOINTS
// ============================================================================

/**
 * GET /rps/teams
 * Get team configurations
 */
router.get("/teams", (req, res) => {
  res.json({
    success: true,
    teams: TEAMS,
  });
});

/**
 * GET /rps/phases
 * Get available game phases
 */
router.get("/phases", (req, res) => {
  res.json({
    success: true,
    phases: PHASES,
  });
});

/**
 * GET /rps/play-stages
 * Get available play stages
 */
router.get("/play-stages", (req, res) => {
  res.json({
    success: true,
    playStages: PLAY_STAGE,
  });
});

/**
 * GET /rps/rps-choices
 * Get RPS choice options
 */
router.get("/rps-choices", (req, res) => {
  res.json({
    success: true,
    choices: RPS_CHOICES,
  });
});

/**
 * GET /rps/health
 * Health check endpoint
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "Rock Paper Scissors Battle Royale",
    status: "operational",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    activeRooms: rpsGames.size,
  });
});

/**
 * GET /rps/stats (optional, for admin/monitoring)
 * Get server-wide RPS statistics
 */
router.get("/stats", protectRoute, (req, res) => {
  try {
    const allGames = getAllRpsGames();
    const totalPlayers = allGames.reduce(
      (sum, game) => sum + game.players.A.length + game.players.B.length,
      0
    );
    const playingGames = allGames.filter((g) => g.status === "playing");
    const finishedGames = allGames.filter((g) => g.status === "finished");

    res.json({
      success: true,
      stats: {
        activeRooms: rpsGames.size,
        totalPlayers,
        playingGames: playingGames.length,
        finishedGames: finishedGames.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching RPS stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stats",
    });
  }
});

export default router;
