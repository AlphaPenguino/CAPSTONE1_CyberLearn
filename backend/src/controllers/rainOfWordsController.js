import { logActivity, AUDIT_ACTIONS, AUDIT_RESOURCES } from "../lib/auditLogger.js";

// Game state storage
const rainOfWordsGames = new Map();
const rainOfWordsPlayers = new Map();
const ROOM_ID_LENGTH = 6;
const ROOM_ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// Game constants
const MAX_QUESTIONS_PER_GAME = 10;
const FALLING_SPEEDS = ["slow", "medium", "fast"];

// Question data for the game
const GAME_QUESTIONS = [
  {
    id: 1,
    question: "What does ICT stand for?",
    answers: ["Technology", "Communication", "Information", "Internet"],
    correct: "Information",
  },
  {
    id: 2,
    question: "Which port is commonly used for HTTPS?",
    answers: ["80", "443", "8080", "3000"],
    correct: "443",
  },
  {
    id: 3,
    question: "What does DDoS stand for?",
    answers: ["Distributed", "Digital", "Direct", "Denial"],
    correct: "Distributed",
  },
  {
    id: 4,
    question: "Which is a NoSQL database?",
    answers: ["PostgreSQL", "MongoDB", "MySQL", "SQLite"],
    correct: "MongoDB",
  },
  {
    id: 5,
    question: "What does CPU stand for?",
    answers: ["Central", "Computer", "Control", "Central Processing Unit"],
    correct: "Central Processing Unit",
  },
  {
    id: 6,
    question: "What is phishing?",
    answers: ["Fishing", "Social engineering attack", "Virus", "Malware"],
    correct: "Social engineering attack",
  },
  {
    id: 7,
    question: "What does VPN stand for?",
    answers: ["Virtual Private Network", "Virtual Public Network", "Very Personal Network", "Verified Private Network"],
    correct: "Virtual Private Network",
  },
  {
    id: 8,
    question: "Which protocol is secure?",
    answers: ["HTTP", "FTP", "HTTPS", "SMTP"],
    correct: "HTTPS",
  },
  {
    id: 9,
    question: "What does SQL stand for?",
    answers: ["Structured Query Language", "Standard Query Language", "Simple Query Logic", "System Query Library"],
    correct: "Structured Query Language",
  },
  {
    id: 10,
    question: "What is ransomware?",
    answers: ["Random software", "Malware that encrypts files", "Antivirus", "Firewall"],
    correct: "Malware that encrypts files",
  },
];

const generateRoomId = () => {
  let id = "";
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    id += ROOM_ID_CHARS.charAt(Math.floor(Math.random() * ROOM_ID_CHARS.length));
  }
  return id;
};

const isValidRoomId = (roomId) => /^[A-Z0-9]{6}$/.test(roomId || "");

/**
 * RainOfWordsGame class - Manages 1v1 game state
 */
class RainOfWordsGame {
  constructor(roomId, creatorSocketId, creatorName) {
    this.roomId = roomId;
    this.creator = creatorName;
    this.creatorSocketId = creatorSocketId;
    this.gameState = "lobby"; // lobby, waiting, playing, finished
    this.status = "waiting"; // waiting, playing, finished
    this.players = new Map(); // socketId -> {socketId, name, score, questionsAnswered}
    this.scores = { player1: 0, player2: 0 };
    this.currentQuestionIndex = 0;
    this.currentQuestion = null;
    this.questionsAnswered = 0;
    this.createdAt = new Date();
  }

  addPlayer(socketId, playerName) {
    if (this.players.size >= 2) {
      return { success: false, message: "Room is full" };
    }

    const playerNumber = this.players.size + 1;
    this.players.set(socketId, {
      socketId,
      name: playerName,
      score: 0,
      questionsAnswered: 0,
      playerNumber,
    });

    return { success: true, message: "Player added" };
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    if (this.players.size === 0) {
      return { success: true, message: "Game closed", closeGame: true };
    }
    return { success: true, message: "Player removed" };
  }

  startGame() {
    if (this.players.size < 2) {
      return { success: false, message: "Need 2 players to start" };
    }

    this.gameState = "playing";
    this.status = "playing";
    this.questionsAnswered = 0;
    this.currentQuestionIndex = 0;
    this.spawnNextQuestion();

    return { success: true, message: "Game started" };
  }

  spawnNextQuestion() {
    if (this.questionsAnswered >= MAX_QUESTIONS_PER_GAME) {
      this.gameState = "finished";
      this.status = "finished";
      return null;
    }

    // Shuffle answers for this question
    const baseQuestion = GAME_QUESTIONS[this.questionsAnswered % GAME_QUESTIONS.length];
    const shuffledAnswers = [...baseQuestion.answers].sort(() => Math.random() - 0.5);

    this.currentQuestion = {
      ...baseQuestion,
      answers: shuffledAnswers,
      questionIndex: this.questionsAnswered,
    };

    this.currentQuestionIndex = this.questionsAnswered;
    return this.currentQuestion;
  }

  submitAnswer(socketId, answer, isCorrect) {
    const player = this.players.get(socketId);
    if (!player) {
      return { success: false, message: "Player not found" };
    }

    if (isCorrect) {
      player.score += 1;
      player.questionsAnswered += 1;
      this.questionsAnswered += 1;

      const gameFinished = player.score >= MAX_QUESTIONS_PER_GAME;

      return {
        success: true,
        isCorrect: true,
        playerScore: player.score,
        questionsAnswered: player.questionsAnswered,
        gameFinished,
      };
    }

    return {
      success: true,
      isCorrect: false,
      playerScore: player.score,
      questionsAnswered: player.questionsAnswered,
      gameFinished: false,
    };
  }

  getPublicGameState() {
    const playersArray = Array.from(this.players.values());
    return {
      roomId: this.roomId,
      gameState: this.gameState,
      status: this.status,
      creator: this.creator,
      players: playersArray.map((p) => ({
        name: p.name,
        score: p.score,
        questionsAnswered: p.questionsAnswered,
      })),
      currentQuestion: this.currentQuestion,
      questionsAnswered: this.questionsAnswered,
      createdAt: this.createdAt,
    };
  }

  getGameResult() {
    const playersArray = Array.from(this.players.values());
    const sortedPlayers = playersArray.sort((a, b) => b.score - a.score);

    return {
      winner: sortedPlayers[0].name,
      finalScores: [sortedPlayers[0].score, sortedPlayers[1]?.score || 0],
      players: sortedPlayers.map((p) => ({
        name: p.name,
        score: p.score,
      })),
    };
  }
}

/**
 * Initialize Socket.IO for Rain of Words
 */
const initializeRainOfWordsSocket = (io) => {
  const rainOfWordsNamespace = io.of("/rain-of-words");

  const logRainOfWordsActivity = ({ socket, action, playerName, roomId, details = {} }) => {
    logActivity({
      userId: null,
      username: playerName || "Unknown Player",
      userRole: "unknown",
      action,
      resource: AUDIT_RESOURCES.MULTIPLAYER_GAME,
      resourceId: roomId,
      details: {
        gameType: "rain_of_words",
        roomId,
        ...details,
      },
      ipAddress: socket?.handshake?.address,
      userAgent: socket?.handshake?.headers?.["user-agent"],
    }).catch((error) => {
      console.error("Failed to log Rain of Words activity:", error);
    });
  };

  rainOfWordsNamespace.on("connection", (socket) => {
    console.log("Rain of Words user connected:", socket.id);

    const handlePlayerExit = async (leaveType = "disconnect") => {
      const player = rainOfWordsPlayers.get(socket.id);
      if (!player) return;

      const game = rainOfWordsGames.get(player.gameId);

      logRainOfWordsActivity({
        socket,
        action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_LEAVE,
        playerName: player.playerName,
        roomId: player.gameId,
        details: { leaveType, event: "player_exit" },
      });

      if (game) {
        const result = game.removePlayer(socket.id);
        if (result.closeGame) {
          rainOfWordsGames.delete(player.gameId);
          rainOfWordsNamespace.to(player.gameId).emit("room-closed", {
            message: "Room closed due to host leaving",
          });
        } else {
          rainOfWordsNamespace.to(player.gameId).emit("player-disconnected", {
            game: game.getPublicGameState(),
          });
        }
      }

      rainOfWordsPlayers.delete(socket.id);
    };

    // Create a new game room
    socket.on("create-room", async (data) => {
      const { playerName } = data;

      // Generate unique room ID
      let roomId;
      do {
        roomId = generateRoomId();
      } while (rainOfWordsGames.has(roomId));

      const game = new RainOfWordsGame(roomId, socket.id, playerName);
      const result = game.addPlayer(socket.id, playerName);

      if (!result.success) {
        socket.emit("error", { message: result.message });
        return;
      }

      rainOfWordsGames.set(roomId, game);
      rainOfWordsPlayers.set(socket.id, {
        gameId: roomId,
        playerName,
        socketId: socket.id,
        isCreator: true,
      });

      socket.join(roomId);
      socket.emit("room-created", {
        roomId,
        game: game.getPublicGameState(),
        isCreator: true,
        playerName,
      });

      logRainOfWordsActivity({
        socket,
        action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_CREATE,
        playerName,
        roomId,
        details: { playerName, isCreator: true, event: "room_created" },
      });

      console.log(`Rain of Words room ${roomId} created by ${playerName}`);
    });

    // Join an existing game room
    socket.on("join-room", async (data) => {
      const normalizedRoomId = (data.roomId || "").trim().toUpperCase();
      const { playerName } = data;

      if (!isValidRoomId(normalizedRoomId)) {
        socket.emit("error", { message: "Invalid room code" });
        return;
      }

      const game = rainOfWordsGames.get(normalizedRoomId);
      if (!game) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      if (game.gameState !== "lobby") {
        socket.emit("error", { message: "Game already in progress" });
        return;
      }

      const result = game.addPlayer(socket.id, playerName);
      if (!result.success) {
        socket.emit("error", { message: result.message });
        return;
      }

      rainOfWordsPlayers.set(socket.id, {
        gameId: normalizedRoomId,
        playerName,
        socketId: socket.id,
        isCreator: false,
      });

      socket.join(normalizedRoomId);
      socket.emit("room-joined", {
        roomId: normalizedRoomId,
        game: game.getPublicGameState(),
        isCreator: false,
        playerName,
        opponentName: Array.from(game.players.values()).find(
          (p) => p.socketId !== socket.id
        )?.name,
      });

      // Notify other player that someone joined
      socket.to(normalizedRoomId).emit("opponent-joined", {
        playerName,
        game: game.getPublicGameState(),
      });

      logRainOfWordsActivity({
        socket,
        action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_JOIN,
        playerName,
        roomId: normalizedRoomId,
        details: { playerName, isCreator: false, event: "room_joined" },
      });

      console.log(`${playerName} joined Rain of Words room ${normalizedRoomId}`);
    });

    socket.on("leave-room", async () => {
      await handlePlayerExit("leave-room");
    });

    // Start the game
    socket.on("start-game", (data) => {
      const { roomCode } = data;
      const game = rainOfWordsGames.get(roomCode);
      const player = rainOfWordsPlayers.get(socket.id);

      if (!game) {
        socket.emit("error", { message: "Game not found" });
        return;
      }

      const result = game.startGame();
      if (!result.success) {
        socket.emit("error", { message: result.message });
        return;
      }

      // Notify all players that game started
      rainOfWordsNamespace.to(roomCode).emit("game-started", {
        game: game.getPublicGameState(),
      });

      // Send first question to all players after a brief delay
      setTimeout(() => {
        const question = game.spawnNextQuestion();
        if (question) {
          rainOfWordsNamespace.to(roomCode).emit("question-display", {
            question,
            questionIndex: game.currentQuestionIndex,
          });
        }
      }, 1000);

      console.log(`Rain of Words game started in room ${roomCode}`);

      logRainOfWordsActivity({
        socket,
        action: AUDIT_ACTIONS.MULTIPLAYER_GAME_START,
        playerName: player?.playerName,
        roomId: roomCode,
        details: {
          startedBy: player?.playerName,
          event: "game_started",
          questionIndex: game.currentQuestionIndex,
        },
      });
    });

    // Handle answer submission
    socket.on("submit-answer", (data) => {
      const { roomCode, answer, isCorrect, questionIndex } = data;
      const game = rainOfWordsGames.get(roomCode);
      const player = rainOfWordsPlayers.get(socket.id);

      if (!game) {
        socket.emit("error", { message: "Game not found" });
        return;
      }

      if (!player || player.gameId !== roomCode) {
        socket.emit("error", { message: "Player not found" });
        return;
      }

      const result = game.submitAnswer(socket.id, answer, isCorrect);

      logRainOfWordsActivity({
        socket,
        action: AUDIT_ACTIONS.STUDENT_GAME_ACCESS,
        playerName: player.playerName,
        roomId: roomCode,
        details: {
          event: "answer_submitted",
          answer,
          isCorrect: Boolean(result?.isCorrect),
          questionIndex,
          playerScore: result?.playerScore,
          questionsAnswered: result?.questionsAnswered,
        },
      });

      if (result.success && result.isCorrect) {
        // Correct answer - check if game is finished
        if (result.gameFinished) {
          // This player won!
          const gameResult = game.getGameResult();
          rainOfWordsNamespace.to(roomCode).emit("game-finished", {
            winner: player.playerName,
            finalScores: [result.playerScore, 0], // Simplified for now
            game: game.getPublicGameState(),
          });

          logRainOfWordsActivity({
            socket,
            action: AUDIT_ACTIONS.MULTIPLAYER_GAME_END,
            playerName: player.playerName,
            roomId: roomCode,
            details: {
              event: "game_finished_by_correct_answer",
              winner: player.playerName,
              finalScore: result.playerScore,
            },
          });
        } else {
          // Continue to next question
          const nextQuestion = game.spawnNextQuestion();
          socket.emit("answer-result", {
            isCorrect: true,
            playerScore: result.playerScore,
            questionsAnswered: result.questionsAnswered,
            gameFinished: result.gameFinished,
          });

          // Notify opponent of this player's correct answer
          socket.to(roomCode).emit("opponent-answer", {
            opponentScore: result.playerScore,
            questionsAnswered: result.questionsAnswered,
          });

          // Send next question to all players
          if (nextQuestion) {
            setTimeout(() => {
              rainOfWordsNamespace.to(roomCode).emit("question-display", {
                question: nextQuestion,
                questionIndex: nextQuestion.questionIndex,
              });
            }, 1500);
          }
        }
      } else {
        socket.emit("answer-result", {
          isCorrect: false,
          playerScore: result.playerScore,
          questionsAnswered: result.questionsAnswered,
          gameFinished: result.gameFinished,
        });
      }
    });

    // Handle missed round (word hit bottom)
    socket.on("missed-round", (data) => {
      const { roomCode } = data;
      const game = rainOfWordsGames.get(roomCode);

      if (!game) return;

      const player = rainOfWordsPlayers.get(socket.id);
      logRainOfWordsActivity({
        socket,
        action: AUDIT_ACTIONS.STUDENT_GAME_ACCESS,
        playerName: player?.playerName,
        roomId: roomCode,
        details: {
          event: "missed_round",
          questionIndex: game.currentQuestionIndex,
        },
      });

      // Spawn next question
      const nextQuestion = game.spawnNextQuestion();

      if (nextQuestion) {
        rainOfWordsNamespace.to(roomCode).emit("missed-round", {
          message: "Word hit the bottom!",
        });

        setTimeout(() => {
          rainOfWordsNamespace.to(roomCode).emit("question-display", {
            question: nextQuestion,
            questionIndex: nextQuestion.questionIndex,
          });
        }, 1500);
      } else {
        // Game finished
        const gameResult = game.getGameResult();
        rainOfWordsNamespace.to(roomCode).emit("game-finished", {
          winner: gameResult.winner,
          finalScores: gameResult.players.map((p) => p.score),
          game: game.getPublicGameState(),
        });

        logRainOfWordsActivity({
          socket,
          action: AUDIT_ACTIONS.MULTIPLAYER_GAME_END,
          playerName: player?.playerName,
          roomId: roomCode,
          details: {
            event: "game_finished_after_missed_round",
            winner: gameResult.winner,
            finalScores: gameResult.players.map((p) => ({
              name: p.name,
              score: p.score,
            })),
          },
        });
      }
    });

    // Get game state
    socket.on("get-game-state", (data) => {
      const { roomCode } = data;
      const game = rainOfWordsGames.get(roomCode);

      if (!game) {
        socket.emit("error", { message: "Game not found" });
        return;
      }

      socket.emit("game-state", {
        game: game.getPublicGameState(),
      });
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      await handlePlayerExit("disconnect");
      console.log("Rain of Words user disconnected:", socket.id);
    });

    // Admin: Get all active games
    socket.on("admin-get-games", () => {
      const games = Array.from(rainOfWordsGames.entries()).map(
        ([id, game]) => ({
          id,
          creator: game.creator,
          status: game.status,
          gameState: game.gameState,
          playerCount: game.players.size,
          createdAt: game.createdAt,
        })
      );

      socket.emit("admin-games-list", { games });
    });
  });
};

// Cleanup function to remove old games
const cleanupOldGames = () => {
  const now = new Date();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [gameId, game] of rainOfWordsGames) {
    if (now - game.createdAt > maxAge) {
      rainOfWordsGames.delete(gameId);
      console.log(`Cleaned up old Rain of Words game: ${gameId}`);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupOldGames, 60 * 60 * 1000);

export { initializeRainOfWordsSocket, rainOfWordsGames, rainOfWordsPlayers };
