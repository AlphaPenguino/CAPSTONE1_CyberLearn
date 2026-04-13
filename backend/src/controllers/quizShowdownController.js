import {
  QuizShowdownGame,
} from "../models/QuizShowdown.js";
import {
  logActivity,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
} from "../lib/auditLogger.js";

// Game state storage
const quizShowdownGames = new Map();
const quizShowdownPlayers = new Map();
const ROOM_ID_LENGTH = 6;
const ROOM_ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const generateRoomId = () => {
  let id = "";
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    id += ROOM_ID_CHARS.charAt(Math.floor(Math.random() * ROOM_ID_CHARS.length));
  }
  return id;
};

const isValidRoomId = (roomId) => /^[A-Z0-9]{6}$/.test(roomId || "");

// Initialize Socket.IO for Quiz Showdown
const initializeQuizShowdownSocket = (io) => {
  const quizShowdownNamespace = io.of("/quiz-showdown");

  quizShowdownNamespace.on("connection", (socket) => {
    console.log("Quiz Showdown user connected:", socket.id);

    const handlePlayerExit = async (leaveType = "disconnect") => {
      const player = quizShowdownPlayers.get(socket.id);
      if (!player) return;

      const game = quizShowdownGames.get(player.gameId);

      try {
        await logActivity({
          userId: null,
          username: player.playerName,
          userRole: "unknown",
          action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_LEAVE,
          resource: AUDIT_RESOURCES.QUIZ_SHOWDOWN,
          resourceId: player.gameId,
          details: {
            gameType: "quiz_showdown",
            roomId: player.gameId,
            leaveType,
            teamName: player.teamName,
          },
          ipAddress: socket.handshake.address,
          userAgent: socket.handshake.headers["user-agent"],
        });
      } catch (error) {
        console.error("Failed to log Quiz Showdown room leave:", error);
      }

      if (game) {
        game.removePlayerFromAllTeams(socket.id);

        socket.to(player.gameId).emit("player-disconnected", {
          playerName: player.playerName,
          teamName: player.teamName,
          game: game.getPublicGameState(),
          leaveType,
        });

        quizShowdownNamespace.to(player.gameId).emit("team-updated", {
          game: game.getPublicGameState(),
          playerName: player.playerName,
          teamName: player.teamName,
        });

        // Creator leaving lobby closes room.
        if (player.isCreator && game.gameState === "lobby") {
          quizShowdownGames.delete(player.gameId);
          quizShowdownNamespace.to(player.gameId).emit("room-closed", {
            message:
              leaveType === "leave-room"
                ? "Room creator left"
                : "Room creator disconnected",
          });
        }
      }

      if (leaveType === "leave-room") {
        socket.leave(player.gameId);
        socket.emit("room-left", { roomId: player.gameId });
      }

      quizShowdownPlayers.delete(socket.id);
    };

    // Create a new game room
    socket.on("create-room", async (data) => {
      const { playerName } = data;

      // Generate 6-character alphanumeric room ID
      let roomId;
      do {
        roomId = generateRoomId();
      } while (quizShowdownGames.has(roomId));

      const game = new QuizShowdownGame(roomId, socket.id, playerName);

      // Load questions from database
      await game.loadQuestions();

      quizShowdownGames.set(roomId, game);

      // Add creator to players map
      quizShowdownPlayers.set(socket.id, {
        gameId: roomId,
        playerName,
        teamName: null,
        isCreator: true,
      });

      socket.join(roomId);
      socket.emit("room-created", {
        roomId,
        game: game.getPublicGameState(),
        isCreator: true,
        playerName,
      });

      // Log room creation
      await logActivity({
        userId: null, // We don't have authenticated user info in socket context
        username: playerName,
        userRole: "unknown",
        action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_CREATE,
        resource: AUDIT_RESOURCES.QUIZ_SHOWDOWN,
        resourceId: roomId,
        details: {
          gameType: "quiz_showdown",
          roomId: roomId,
          playerName: playerName,
          isCreator: true,
        },
        ipAddress: socket.handshake.address,
        userAgent: socket.handshake.headers["user-agent"],
      });

      console.log(`Quiz Showdown room ${roomId} created by ${playerName}`);
    });

    // Join an existing game room
    socket.on("join-room", async (data) => {
      const normalizedRoomId = (data.roomId || "").trim().toUpperCase();
      const { playerName } = data;

      if (!isValidRoomId(normalizedRoomId)) {
        socket.emit("error", {
          message: "Room ID must be 6 alphanumeric characters",
        });
        return;
      }

      const game = quizShowdownGames.get(normalizedRoomId);

      if (!game) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      if (game.gameState !== "lobby") {
        socket.emit("error", { message: "Game already in progress" });
        return;
      }

      // Add player to players map (without team initially)
      quizShowdownPlayers.set(socket.id, {
        gameId: normalizedRoomId,
        playerName,
        teamName: null,
        isCreator: false,
      });

      socket.join(normalizedRoomId);
      socket.emit("room-joined", {
        roomId: normalizedRoomId,
        game: game.getPublicGameState(),
        isCreator: false,
        playerName,
      });

      // Notify other players
      socket.to(normalizedRoomId).emit("player-joined", {
        playerName,
        game: game.getPublicGameState(),
      });

      // Log room join
      await logActivity({
        userId: null,
        username: playerName,
        userRole: "unknown",
        action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_JOIN,
        resource: AUDIT_RESOURCES.QUIZ_SHOWDOWN,
        resourceId: normalizedRoomId,
        details: {
          gameType: "quiz_showdown",
          roomId: normalizedRoomId,
          playerName: playerName,
          isCreator: false,
        },
        ipAddress: socket.handshake.address,
        userAgent: socket.handshake.headers["user-agent"],
      });

      console.log(
        `${playerName} joined Quiz Showdown room ${normalizedRoomId}`
      );
    });

    socket.on("leave-room", async () => {
      await handlePlayerExit("leave-room");
    });

    // Join a team
    socket.on("join-team", (data) => {
      const { roomId, teamName } = data;
      const game = quizShowdownGames.get(roomId);
      const player = quizShowdownPlayers.get(socket.id);

      if (!game) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      if (!player || player.gameId !== roomId) {
        socket.emit("error", { message: "Invalid session" });
        return;
      }

      if (teamName !== "Team A" && teamName !== "Team B") {
        socket.emit("error", { message: "Invalid team name" });
        return;
      }

      const result = game.addPlayerToTeam(
        socket.id,
        player.playerName,
        teamName
      );
      if (!result.success) {
        socket.emit("error", { message: result.message });
        return;
      }

      // Update player's team
      player.teamName = teamName;

      // Notify all players in the room
      quizShowdownNamespace.to(roomId).emit("team-updated", {
        game: game.getPublicGameState(),
        playerName: player.playerName,
        teamName,
      });

      socket.emit("team-joined", {
        teamName,
        game: game.getPublicGameState(),
      });

      console.log(`${player.playerName} joined ${teamName} in room ${roomId}`);
    });

    // Start the game
    socket.on("start-game", (data) => {
      const { roomId } = data;
      const game = quizShowdownGames.get(roomId);
      const player = quizShowdownPlayers.get(socket.id);

      if (!game) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      if (!player || !player.isCreator) {
        socket.emit("error", {
          message: "Only the room creator can start the game",
        });
        return;
      }

      const result = game.startGame();
      if (!result.success) {
        socket.emit("error", { message: result.message });
        return;
      }

      // Notify all players that game started
      quizShowdownNamespace.to(roomId).emit("game-started", {
        game: game.getPublicGameState(),
      });

      // Start countdown for first question
      setTimeout(() => {
        game.activateBuzzer();
        quizShowdownNamespace.to(roomId).emit("buzzer-activated", {
          game: game.getPublicGameState(),
        });
      }, 3000); // 3 second countdown

      console.log(`Quiz Showdown game started in room ${roomId}`);
      logActivity({
        userId: null,
        username: player.playerName,
        userRole: "unknown",
        action: AUDIT_ACTIONS.MULTIPLAYER_GAME_START,
        resource: AUDIT_RESOURCES.QUIZ_SHOWDOWN,
        resourceId: roomId,
        details: {
          gameType: "quiz_showdown",
          roomId,
          startedBy: player.playerName,
        },
        ipAddress: socket.handshake.address,
        userAgent: socket.handshake.headers["user-agent"],
      }).catch((error) =>
        console.error("Failed to log Quiz Showdown game start:", error)
      );
    });

    // Host-only rematch after game over
    socket.on("restart-game", (data) => {
      const { roomId } = data;
      const game = quizShowdownGames.get(roomId);
      const player = quizShowdownPlayers.get(socket.id);

      if (!game) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      if (!player || !player.isCreator) {
        socket.emit("error", {
          message: "Only the room creator can play again",
        });
        return;
      }

      if (game.gameState !== "finished") {
        socket.emit("error", {
          message: "Play again is only available after game over",
        });
        return;
      }

      const result = game.restartGame();
      if (!result.success) {
        socket.emit("error", { message: result.message || "Failed to restart game" });
        return;
      }

      quizShowdownNamespace.to(roomId).emit("game-restarted", {
        game: game.getPublicGameState(),
        restartedBy: player.playerName,
      });
    });

    // Handle buzzer press
    socket.on("buzz", (data) => {
      const { roomId, teamName } = data;
      const game = quizShowdownGames.get(roomId);
      const player = quizShowdownPlayers.get(socket.id);

      if (!game) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      if (!player || player.gameId !== roomId) {
        socket.emit("error", { message: "Invalid session" });
        return;
      }

      if (player.teamName !== teamName) {
        socket.emit("error", { message: "You're not on this team" });
        return;
      }

      const result = game.handleBuzz(socket.id, teamName);
      if (result.success) {
        // Notify all players about the buzz
        quizShowdownNamespace.to(roomId).emit("team-buzzed", {
          buzzedTeam: result.buzzedTeam,
          message: result.message,
          game: game.getPublicGameState(),
        });
      } else {
        socket.emit("buzz-failed", { message: result.message });
      }
    });

    // Handle answer submission
    socket.on("submit-answer", (data) => {
      const { roomId, teamName, answerIndex } = data;
      const game = quizShowdownGames.get(roomId);
      const player = quizShowdownPlayers.get(socket.id);

      if (!game) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      if (!player || player.gameId !== roomId) {
        socket.emit("error", { message: "Invalid session" });
        return;
      }

      if (player.teamName !== teamName) {
        socket.emit("error", { message: "You're not on this team" });
        return;
      }

      const result = game.submitAnswer(socket.id, teamName, answerIndex);
      if (result.success) {
        // Get the current question to send correct answer for result display
        const currentQuestion = game.getCurrentQuestion();

        // Notify all players about the answer result
        quizShowdownNamespace.to(roomId).emit("answer-submitted", {
          teamName,
          answerIndex,
          correct: result.correct,
          correctAnswer: currentQuestion ? currentQuestion.correct : null,
          message: result.message,
          game: game.getPublicGameState(),
          gameFinished: result.gameFinished,
          nextQuestion: result.nextQuestion,
          nextTeam: result.nextTeam,
        });

        if (result.gameFinished) {
          // Game is finished
          quizShowdownNamespace.to(roomId).emit("game-finished", {
            winner: result.winner,
            finalScores: result.finalScores,
            game: game.getPublicGameState(),
          });

          logActivity({
            userId: null,
            username: player.playerName,
            userRole: "unknown",
            action: AUDIT_ACTIONS.MULTIPLAYER_GAME_END,
            resource: AUDIT_RESOURCES.QUIZ_SHOWDOWN,
            resourceId: roomId,
            details: {
              gameType: "quiz_showdown",
              roomId,
              endedBy: player.playerName,
              winner: result.winner || null,
              finalScores: result.finalScores || null,
            },
            ipAddress: socket.handshake.address,
            userAgent: socket.handshake.headers["user-agent"],
          }).catch((error) =>
            console.error("Failed to log Quiz Showdown game end:", error)
          );
        } else if (result.nextQuestion) {
          // Move to next question after a delay
          setTimeout(() => {
            quizShowdownNamespace.to(roomId).emit("next-question", {
              game: game.getPublicGameState(),
            });

            // Start countdown for next question
            setTimeout(() => {
              game.activateBuzzer();
              quizShowdownNamespace.to(roomId).emit("buzzer-activated", {
                game: game.getPublicGameState(),
              });
            }, 3000);
          }, 2000); // 2 second delay to show results
        } else if (result.nextTeam) {
          // Other team's turn to answer
          quizShowdownNamespace.to(roomId).emit("team-turn", {
            answeringTeam: result.nextTeam,
            game: game.getPublicGameState(),
          });
        }
      } else {
        socket.emit("answer-failed", { message: result.message });
      }
    });

    // Handle question timeout (treat as incorrect answer and pass turn)
    socket.on("question-time-expired", (data) => {
      const { roomId, teamName } = data;
      const game = quizShowdownGames.get(roomId);
      const player = quizShowdownPlayers.get(socket.id);

      if (!game) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      if (!player || player.gameId !== roomId) {
        socket.emit("error", { message: "Invalid session" });
        return;
      }

      if (player.teamName !== teamName) {
        socket.emit("error", { message: "You're not on this team" });
        return;
      }

      const result = game.submitAnswer(socket.id, teamName, -1);
      if (result.success) {
        const currentQuestion = game.getCurrentQuestion();

        quizShowdownNamespace.to(roomId).emit("answer-submitted", {
          teamName,
          answerIndex: -1,
          timedOut: true,
          correct: false,
          correctAnswer: currentQuestion ? currentQuestion.correct : null,
          message: `${teamName} ran out of time!`,
          game: game.getPublicGameState(),
          gameFinished: result.gameFinished,
          nextQuestion: result.nextQuestion,
          nextTeam: result.nextTeam,
        });

        if (result.gameFinished) {
          quizShowdownNamespace.to(roomId).emit("game-finished", {
            winner: result.winner,
            finalScores: result.finalScores,
            game: game.getPublicGameState(),
          });
        } else if (result.nextQuestion) {
          setTimeout(() => {
            quizShowdownNamespace.to(roomId).emit("next-question", {
              game: game.getPublicGameState(),
            });

            setTimeout(() => {
              game.activateBuzzer();
              quizShowdownNamespace.to(roomId).emit("buzzer-activated", {
                game: game.getPublicGameState(),
              });
            }, 3000);
          }, 2000);
        } else if (result.nextTeam) {
          quizShowdownNamespace.to(roomId).emit("team-turn", {
            answeringTeam: result.nextTeam,
            game: game.getPublicGameState(),
          });
        }
      } else {
        socket.emit("answer-failed", { message: result.message });
      }
    });

    // Get game state
    socket.on("get-game-state", (data) => {
      const { roomId } = data;
      const game = quizShowdownGames.get(roomId);

      if (!game) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      socket.emit("game-state", {
        game: game.getPublicGameState(),
      });
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      await handlePlayerExit("disconnect");
      console.log("Quiz Showdown user disconnected:", socket.id);
    });

    // Admin: Get all active games
    socket.on("admin-get-games", () => {
      const games = Array.from(quizShowdownGames.entries()).map(
        ([id, game]) => ({
          id,
          creator: game.creator,
          status: game.status,
          gameState: game.gameState,
          playerCount: game.teamA.members.length + game.teamB.members.length,
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

  for (const [gameId, game] of quizShowdownGames) {
    if (now - game.createdAt > maxAge) {
      quizShowdownGames.delete(gameId);
      console.log(`Cleaned up old Quiz Showdown game: ${gameId}`);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupOldGames, 60 * 60 * 1000);

export { initializeQuizShowdownSocket };
