import {
  KnowledgeRelayGame,
  PHASES,
  knowledgeRelayQuestions,
} from "../models/KnowledgeRelay.js";
import {
  logActivity,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
} from "../lib/auditLogger.js";
import {
  knowledgeRelayGames,
  knowledgeRelayPlayers,
  knowledgeRelayGameTimers,
} from "../state/knowledgeRelayState.js";

// This array will hold globally loaded questions (volatile in-memory)
let globalKnowledgeRelayQuestions = [...knowledgeRelayQuestions];

const logKnowledgeRelayActivity = ({ socket, action, playerName, roomId, details = {} }) => {
  logActivity({
    userId: null,
    username: playerName || "Unknown Player",
    userRole: "unknown",
    action,
    resource: AUDIT_RESOURCES.KNOWLEDGE_RELAY,
    resourceId: roomId,
    details: {
      gameType: "knowledge_relay",
      roomId,
      ...details,
    },
    ipAddress: socket?.handshake?.address,
    userAgent: socket?.handshake?.headers?.["user-agent"],
  }).catch((error) => {
    console.error("Failed to write Knowledge Relay audit log:", error);
  });
};

// Expose a setter so routes can update global questions
export const setGlobalKnowledgeRelayQuestions = (questions) => {
  globalKnowledgeRelayQuestions = questions;
  // Apply to all existing games so they instantly see new question set if desired
  for (const game of knowledgeRelayGames.values()) {
    game.questions = [...questions];
    game.currentQuestionIndex = 0;
  }
};

export const getGlobalKnowledgeRelayQuestions = () =>
  globalKnowledgeRelayQuestions;

// Initialize timer for a game
const initializeGameTimer = (io, gameId) => {
  // Clear existing timer if any
  if (knowledgeRelayGameTimers.has(gameId)) {
    clearInterval(knowledgeRelayGameTimers.get(gameId));
  }

  const timer = setInterval(() => {
    const game = knowledgeRelayGames.get(gameId);
    if (!game || game.phase !== PHASES.PLAYING || !game.isTimerActive) {
      clearInterval(timer);
      knowledgeRelayGameTimers.delete(gameId);
      return;
    }

    const timerResult = game.tickTimer();

    // Broadcast timer update
    io.to(`kr-${gameId}`).emit("kr-timer-update", { timer: game.timer });

    // Handle timeout if timer reached 0
    if (
      timerResult &&
      timerResult !== true &&
      timerResult.passed !== undefined
    ) {
      io.to(`kr-${gameId}`).emit("kr-timeout-occurred", {
        ...timerResult,
        gameState: game.getGameState(),
      });
    }
  }, 1000);

  knowledgeRelayGameTimers.set(gameId, timer);
};

// Clean up game timer
const cleanupGameTimer = (gameId) => {
  if (knowledgeRelayGameTimers.has(gameId)) {
    clearInterval(knowledgeRelayGameTimers.get(gameId));
    knowledgeRelayGameTimers.delete(gameId);
  }
};

// Initialize Socket.IO for Knowledge Relay games
const initializeKnowledgeRelaySocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Knowledge Relay - User connected:", socket.id);

    // Join Knowledge Relay room
    socket.on("kr-join-room", (data) => {
      const { roomId, playerName } = data;

      if (!roomId || !playerName) {
        socket.emit("kr-error", {
          message: "Room ID and player name are required",
        });
        return;
      }

      let game = knowledgeRelayGames.get(roomId);

      // Create new game if it doesn't exist
      if (!game) {
        game = new KnowledgeRelayGame(roomId, socket.id, playerName);
        // Override default questions with current global set
        game.questions = [...globalKnowledgeRelayQuestions];
        knowledgeRelayGames.set(roomId, game);
        console.log(`Knowledge Relay - Created new game: ${roomId}`);
        logKnowledgeRelayActivity({
          socket,
          action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_CREATE,
          playerName,
          roomId,
          details: { isCreator: true },
        });
      }

      // Check if player was previously disconnected
      if (game.disconnectedPlayers.has(socket.id)) {
        socket.emit("kr-error", {
          message: "You were disconnected and cannot rejoin this game",
        });
        return;
      }

      // Join socket room
      socket.join(`kr-${roomId}`);

      // Store player info
      knowledgeRelayPlayers.set(socket.id, {
        gameId: roomId,
        playerName,
        isCreator: game.isCreator(socket.id),
      });

      // Send game state to player
      socket.emit("kr-room-joined", {
        gameState: game.getGameState(),
        isCreator: game.isCreator(socket.id),
        playerName,
      });

      // Notify others of new player
      socket.to(`kr-${roomId}`).emit("kr-player-joined", {
        playerName,
        gameState: game.getGameState(),
      });

      console.log(
        `Knowledge Relay - Player ${playerName} joined room ${roomId}`
      );
      logKnowledgeRelayActivity({
        socket,
        action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_JOIN,
        playerName,
        roomId,
        details: { isCreator: game.isCreator(socket.id) },
      });
    });

    // Select team
    socket.on("kr-select-team", (data) => {
      const { teamId } = data;
      const playerInfo = knowledgeRelayPlayers.get(socket.id);

      if (!playerInfo) {
        socket.emit("kr-error", { message: "Player not found" });
        return;
      }

      const game = knowledgeRelayGames.get(playerInfo.gameId);
      if (!game) {
        socket.emit("kr-error", { message: "Game not found" });
        return;
      }

      if (game.phase !== PHASES.TEAM_SELECTION) {
        socket.emit("kr-error", {
          message: "Team selection is not available in current game phase",
        });
        return;
      }

      const result = game.addPlayerToTeam(
        socket.id,
        playerInfo.playerName,
        teamId
      );

      if (result.success) {
        // Update player info
        knowledgeRelayPlayers.set(socket.id, {
          ...playerInfo,
          teamId,
        });

        // Notify all players of team change
        io.to(`kr-${playerInfo.gameId}`).emit("kr-team-selected", {
          playerId: socket.id,
          playerName: playerInfo.playerName,
          teamId,
          gameState: game.getGameState(),
        });

        console.log(
          `Knowledge Relay - Player ${playerInfo.playerName} joined team ${teamId}`
        );
      } else {
        socket.emit("kr-error", { message: result.message });
      }
    });

    // Start game (only creator)
    socket.on("kr-start-game", () => {
      const playerInfo = knowledgeRelayPlayers.get(socket.id);

      if (!playerInfo) {
        socket.emit("kr-error", { message: "Player not found" });
        return;
      }

      const game = knowledgeRelayGames.get(playerInfo.gameId);
      if (!game) {
        socket.emit("kr-error", { message: "Game not found" });
        return;
      }

      if (!game.isCreator(socket.id)) {
        socket.emit("kr-error", {
          message: "Only the game creator can start the game",
        });
        return;
      }

      const result = game.startGame();

      if (result.success) {
        // Initialize game timer
        initializeGameTimer(io, playerInfo.gameId);

        // Notify all players that game started
        io.to(`kr-${playerInfo.gameId}`).emit("kr-game-started", {
          gameState: game.getGameState(),
          currentQuestion: game.getCurrentQuestion(),
        });

        console.log(`Knowledge Relay - Game ${playerInfo.gameId} started`);
        logKnowledgeRelayActivity({
          socket,
          action: AUDIT_ACTIONS.MULTIPLAYER_GAME_START,
          playerName: playerInfo.playerName,
          roomId: playerInfo.gameId,
          details: { phase: PHASES.PLAYING },
        });
      } else {
        socket.emit("kr-error", { message: result.message });
      }
    });

    // Submit answer
    socket.on("kr-submit-answer", (data) => {
      const { answerIndex } = data;
      const playerInfo = knowledgeRelayPlayers.get(socket.id);

      if (!playerInfo) {
        socket.emit("kr-error", { message: "Player not found" });
        return;
      }

      const game = knowledgeRelayGames.get(playerInfo.gameId);
      if (!game) {
        socket.emit("kr-error", { message: "Game not found" });
        return;
      }

      if (game.phase !== PHASES.PLAYING) {
        socket.emit("kr-error", { message: "Game is not in playing phase" });
        return;
      }

      const result = game.answerQuestion(socket.id, answerIndex);

      if (result.success) {
        // Restart timer if game continues
        if (!result.gameFinished) {
          initializeGameTimer(io, playerInfo.gameId);
        } else {
          cleanupGameTimer(playerInfo.gameId);
        }

        // Notify all players of answer result
        io.to(`kr-${playerInfo.gameId}`).emit("kr-answer-result", {
          ...result,
          gameState: game.getGameState(),
          answeredBy: playerInfo.playerName,
        });

        console.log(
          `Knowledge Relay - Player ${playerInfo.playerName} answered: ${
            result.correct ? "Correct" : "Incorrect"
          }`
        );
        if (result.gameFinished) {
          logKnowledgeRelayActivity({
            socket,
            action: AUDIT_ACTIONS.MULTIPLAYER_GAME_END,
            playerName: playerInfo.playerName,
            roomId: playerInfo.gameId,
            details: {
              reason: "questions_completed",
              correct: result.correct,
              winnerTeam: result.winnerTeam || null,
            },
          });
        }
      } else {
        socket.emit("kr-error", { message: result.message });
      }
    });

    // Use pass
    socket.on("kr-use-pass", () => {
      const playerInfo = knowledgeRelayPlayers.get(socket.id);

      if (!playerInfo) {
        socket.emit("kr-error", { message: "Player not found" });
        return;
      }

      const game = knowledgeRelayGames.get(playerInfo.gameId);
      if (!game) {
        socket.emit("kr-error", { message: "Game not found" });
        return;
      }

      if (game.phase !== PHASES.PLAYING) {
        socket.emit("kr-error", { message: "Game is not in playing phase" });
        return;
      }

      // Check if it's player's turn
      const currentTeamData = game.teams[game.currentTeam];
      const currentPlayer =
        currentTeamData.players[currentTeamData.currentPlayerIndex];

      if (!currentPlayer || currentPlayer.id !== socket.id) {
        socket.emit("kr-error", { message: "Not your turn" });
        return;
      }

      const result = game.usePass(game.currentTeam);

      if (result.success) {
        // Restart timer
        initializeGameTimer(io, playerInfo.gameId);

        // Notify all players of pass usage
        io.to(`kr-${playerInfo.gameId}`).emit("kr-pass-used", {
          ...result,
          gameState: game.getGameState(),
          passedBy: playerInfo.playerName,
        });

        console.log(
          `Knowledge Relay - Player ${playerInfo.playerName} used a pass`
        );
      } else {
        socket.emit("kr-error", { message: result.message });
      }
    });

    // Get leaderboard
    socket.on("kr-get-leaderboard", () => {
      const playerInfo = knowledgeRelayPlayers.get(socket.id);

      if (!playerInfo) {
        socket.emit("kr-error", { message: "Player not found" });
        return;
      }

      const game = knowledgeRelayGames.get(playerInfo.gameId);
      if (!game) {
        socket.emit("kr-error", { message: "Game not found" });
        return;
      }

      socket.emit("kr-leaderboard", {
        leaderboard: game.getLeaderboard(),
        gameState: game.getGameState(),
      });
    });

    // Change game phase (for testing/navigation)
    socket.on("kr-change-phase", (data) => {
      const { phase } = data;
      const playerInfo = knowledgeRelayPlayers.get(socket.id);

      if (!playerInfo) {
        socket.emit("kr-error", { message: "Player not found" });
        return;
      }

      const game = knowledgeRelayGames.get(playerInfo.gameId);
      if (!game) {
        socket.emit("kr-error", { message: "Game not found" });
        return;
      }

      if (!game.isCreator(socket.id)) {
        socket.emit("kr-error", {
          message: "Only the game creator can change phases",
        });
        return;
      }

      // Validate phase
      if (!Object.values(PHASES).includes(phase)) {
        socket.emit("kr-error", { message: "Invalid phase" });
        return;
      }

      game.phase = phase;

      // Clean up timer if leaving playing phase
      if (phase !== PHASES.PLAYING) {
        cleanupGameTimer(playerInfo.gameId);
      }

      io.to(`kr-${playerInfo.gameId}`).emit("kr-phase-changed", {
        phase,
        gameState: game.getGameState(),
      });

      console.log(
        `Knowledge Relay - Game ${playerInfo.gameId} phase changed to ${phase}`
      );
    });

    // Update questions (instructor mode)
    socket.on("kr-update-questions", (data) => {
      const { questions } = data;
      const playerInfo = knowledgeRelayPlayers.get(socket.id);

      if (!playerInfo) {
        socket.emit("kr-error", { message: "Player not found" });
        return;
      }

      const game = knowledgeRelayGames.get(playerInfo.gameId);
      if (!game) {
        socket.emit("kr-error", { message: "Game not found" });
        return;
      }

      const result = game.updateQuestions(questions);

      if (result.success) {
        io.to(`kr-${playerInfo.gameId}`).emit("kr-questions-updated", {
          message: result.message,
          questionCount: result.questionCount,
          gameState: game.getGameState(),
        });

        console.log(
          `Knowledge Relay - Questions updated for game ${playerInfo.gameId}`
        );
      } else {
        socket.emit("kr-error", { message: result.message });
      }
    });

    // Get current game state
    socket.on("kr-get-game-state", () => {
      const playerInfo = knowledgeRelayPlayers.get(socket.id);

      if (!playerInfo) {
        socket.emit("kr-error", { message: "Player not found" });
        return;
      }

      const game = knowledgeRelayGames.get(playerInfo.gameId);
      if (!game) {
        socket.emit("kr-error", { message: "Game not found" });
        return;
      }

      socket.emit("kr-game-state", {
        gameState: game.getGameState(),
        currentQuestion: game.getCurrentQuestion(),
        isCreator: game.isCreator(socket.id),
      });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("Knowledge Relay - User disconnected:", socket.id);

      const playerInfo = knowledgeRelayPlayers.get(socket.id);
      if (playerInfo) {
        logKnowledgeRelayActivity({
          socket,
          action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_LEAVE,
          playerName: playerInfo.playerName,
          roomId: playerInfo.gameId,
          details: { leaveType: "disconnect" },
        });
        const game = knowledgeRelayGames.get(playerInfo.gameId);
        if (game) {
          // Mark player as disconnected (permanent removal)
          const disconnectResult = game.disconnectPlayer(socket.id);

          if (disconnectResult.success) {
            // Notify other players
            socket
              .to(`kr-${playerInfo.gameId}`)
              .emit("kr-player-disconnected", {
                playerName: playerInfo.playerName,
                gameState: game.getGameState(),
              });

            console.log(
              `Knowledge Relay - Player ${playerInfo.playerName} disconnected from game ${playerInfo.gameId}`
            );

            // If game is empty, clean up
            const activePlayers = game.getAllActivePlayers();
            if (activePlayers.length === 0) {
              knowledgeRelayGames.delete(playerInfo.gameId);
              cleanupGameTimer(playerInfo.gameId);
              console.log(
                `Knowledge Relay - Game ${playerInfo.gameId} cleaned up (no active players)`
              );
            }
          }
        }

        knowledgeRelayPlayers.delete(socket.id);
      }
    });

    // Leave game (explicit)
    socket.on("kr-leave-game", () => {
      const playerInfo = knowledgeRelayPlayers.get(socket.id);

      if (playerInfo) {
        logKnowledgeRelayActivity({
          socket,
          action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_LEAVE,
          playerName: playerInfo.playerName,
          roomId: playerInfo.gameId,
          details: { leaveType: "manual" },
        });
        const game = knowledgeRelayGames.get(playerInfo.gameId);
        if (game) {
          const leaveResult = game.removePlayer(socket.id);

          if (leaveResult.success) {
            // Leave socket room
            socket.leave(`kr-${playerInfo.gameId}`);

            // Notify other players
            socket.to(`kr-${playerInfo.gameId}`).emit("kr-player-left", {
              playerName: playerInfo.playerName,
              gameState: game.getGameState(),
            });

            socket.emit("kr-left-game", {
              message: "Successfully left the game",
            });

            console.log(
              `Knowledge Relay - Player ${playerInfo.playerName} left game ${playerInfo.gameId}`
            );
          }
        }

        knowledgeRelayPlayers.delete(socket.id);
      }
    });
  });
};

// Clean up inactive games (run periodically)
const cleanupInactiveGames = () => {
  const now = new Date();
  const maxIdleTime = 30 * 60 * 1000; // 30 minutes

  for (const [gameId, game] of knowledgeRelayGames.entries()) {
    const timeSinceCreation = now - game.createdAt;
    const activePlayers = game.getAllActivePlayers();

    // Clean up games that are too old or have no active players
    if (timeSinceCreation > maxIdleTime || activePlayers.length === 0) {
      knowledgeRelayGames.delete(gameId);
      cleanupGameTimer(gameId);
      console.log(`Knowledge Relay - Cleaned up inactive game: ${gameId}`);
    }
  }
};

// Run cleanup every 10 minutes
setInterval(cleanupInactiveGames, 10 * 60 * 1000);

export { initializeKnowledgeRelaySocket };
