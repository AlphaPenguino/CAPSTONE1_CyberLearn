import {
  DigitalDefendersGame,
  DigitalDefendersQuestion,
  DigitalDefendersAnswer,
  DigitalDefendersStats,
} from "../models/DigitalDefenders.js";
import {
  logActivity,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
} from "../lib/auditLogger.js";

// Game state storage
const digitalDefendersGames = new Map();
const digitalDefendersPlayers = new Map();

// Generate 4-letter room code
const generateRoomCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let roomCode = "";
  for (let i = 0; i < 4; i++) {
    roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return roomCode;
};

const logDigitalDefendersActivity = ({ socket, action, playerName, roomCode, details = {} }) => {
  logActivity({
    userId: null,
    username: playerName || "Unknown Player",
    userRole: "unknown",
    action,
    resource: AUDIT_RESOURCES.DIGITAL_DEFENDERS,
    resourceId: roomCode,
    details: {
      gameType: "digital_defenders",
      roomCode,
      ...details,
    },
    ipAddress: socket?.handshake?.address,
    userAgent: socket?.handshake?.headers?.["user-agent"],
  }).catch((error) => {
    console.error("Failed to write Digital Defenders audit log:", error);
  });
};

// Initialize Socket.IO for Digital Defenders
const initializeDigitalDefendersSocket = (io) => {
  const digitalDefendersNamespace = io.of("/digital-defenders");

  digitalDefendersNamespace.on("connection", (socket) => {
    console.log("Digital Defenders user connected:", socket.id);

    // Handle socket errors
    socket.on("error", (error) => {
      console.error(`Socket ${socket.id} error:`, error);
    });

    // Create a new game room
    socket.on("create-room", async (data) => {
      try {
        const { playerName, maxPlayers = 4 } = data;

        // Validate input data
        if (
          !playerName ||
          typeof playerName !== "string" ||
          playerName.trim().length === 0
        ) {
          socket.emit("error", { message: "Player name is required" });
          return;
        }

        console.log(
          `Creating room for player: ${playerName}, maxPlayers: ${maxPlayers}`
        );

        // Generate unique 4-letter room code
        let roomCode;
        let attempts = 0;
        do {
          roomCode = generateRoomCode();
          attempts++;
          if (attempts > 100) {
            socket.emit("error", {
              message: "Unable to generate unique room code",
            });
            return;
          }
        } while (digitalDefendersGames.has(roomCode));

        console.log(
          `Generated room code: ${roomCode} after ${attempts} attempts`
        );

        const game = new DigitalDefendersGame(
          roomCode,
          socket.id,
          playerName.trim(),
          maxPlayers
        );

        // Load questions from database (or use defaults)
        await game.loadQuestions();

        digitalDefendersGames.set(roomCode, game);
        console.log(`Game instance created and stored for room ${roomCode}`);

        // Add creator to players map
        digitalDefendersPlayers.set(socket.id, {
          gameId: roomCode,
          playerName: playerName.trim(),
          isCreator: true,
        });

        // Join socket to room
        await socket.join(roomCode);
        console.log(`Socket ${socket.id} joined room ${roomCode}`);

        // Emit room created event
        socket.emit("room-created", {
          room: {
            id: roomCode,
            players: Array.from(game.players.values()),
            gameState: game.gameState,
            maxPlayers: game.maxPlayers,
          },
          playerId: socket.id,
          isCreator: true,
          playerName: playerName.trim(),
          roomCode: roomCode,
        });

        console.log(
          `Digital Defenders room ${roomCode} created by ${playerName.trim()}`
        );
        logDigitalDefendersActivity({
          socket,
          action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_CREATE,
          playerName: playerName.trim(),
          roomCode,
          details: { isCreator: true, maxPlayers: game.maxPlayers },
        });
        console.log(
          `Room stored in games map:`,
          digitalDefendersGames.has(roomCode)
        );
        console.log(`Total active rooms:`, digitalDefendersGames.size);
      } catch (error) {
        console.error(`Error creating room:`, error);
        socket.emit("error", { message: "Failed to create room" });
      }
    });

    // Join an existing game room
    socket.on("join-room", async (data) => {
      try {
        const { roomCode, playerName } = data;

        // Validate input data
        if (
          !roomCode ||
          typeof roomCode !== "string" ||
          roomCode.trim().length !== 4
        ) {
          socket.emit("error", {
            message: "Room code must be exactly 4 letters",
          });
          return;
        }

        if (
          !playerName ||
          typeof playerName !== "string" ||
          playerName.trim().length === 0
        ) {
          socket.emit("error", { message: "Player name is required" });
          return;
        }

        const trimmedRoomCode = roomCode.trim().toUpperCase();
        console.log(
          `Player ${playerName} trying to join room: ${trimmedRoomCode}`
        );
        console.log(
          `Available rooms:`,
          Array.from(digitalDefendersGames.keys())
        );

        const game = digitalDefendersGames.get(trimmedRoomCode);

        if (!game) {
          console.log(
            `Room ${trimmedRoomCode} not found. Available rooms:`,
            Array.from(digitalDefendersGames.keys())
          );
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

        // Cancel any pending cleanup timer since a player joined
        if (game.cleanupTimer) {
          clearTimeout(game.cleanupTimer);
          game.cleanupTimer = null;
          console.log(
            `Digital Defenders room ${trimmedRoomCode} cleanup timer cancelled - player joined`
          );
        }

        // Add player to players map
        digitalDefendersPlayers.set(socket.id, {
          gameId: trimmedRoomCode,
          playerName,
          isCreator: false,
        });

        // Join socket to room
        await socket.join(trimmedRoomCode);

        socket.emit("room-joined", {
          room: {
            id: trimmedRoomCode,
            players: Array.from(game.players.values()),
            gameState: game.gameState,
            maxPlayers: game.maxPlayers,
          },
          playerId: socket.id,
          isCreator: false,
          playerName,
          roomCode: trimmedRoomCode,
        });

        // Notify other players
        socket.to(trimmedRoomCode).emit("player-joined", {
          room: {
            id: trimmedRoomCode,
            players: Array.from(game.players.values()),
            gameState: game.gameState,
            maxPlayers: game.maxPlayers,
          },
          playerName,
        });

        console.log(
          `${playerName} joined Digital Defenders room ${trimmedRoomCode}`
        );
        logDigitalDefendersActivity({
          socket,
          action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_JOIN,
          playerName,
          roomCode: trimmedRoomCode,
          details: { isCreator: false, playersInRoom: game.players.size },
        });
      } catch (error) {
        console.error(`Error joining room:`, error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // Start the game
    socket.on("start-game", (data) => {
      const { roomCode } = data;
      const game = digitalDefendersGames.get(roomCode);
      const player = digitalDefendersPlayers.get(socket.id);

      if (!game) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      if (!player || player.gameId !== roomCode) {
        socket.emit("error", { message: "Invalid session" });
        return;
      }

      // Only creator can start the game
      if (!game.isCreator(socket.id)) {
        socket.emit("error", {
          message: "Only the room creator can start the game",
        });
        return;
      }

      if (!game.canStartTurnOrderSelection()) {
        socket.emit("error", { message: "Need at least 2 players to start" });
        return;
      }

      // Start turn order selection phase
      const result = game.startTurnOrderSelection();
      if (!result.success) {
        socket.emit("error", { message: result.message });
        return;
      }

      // Notify all players to start turn order selection
      digitalDefendersNamespace
        .to(roomCode)
        .emit("turn-order-selection-started", {
          gameState: game.getPublicGameState(),
          message: "Choose your turn order!",
          playerCount: game.players.size,
        });

      console.log(
        `Digital Defenders turn order selection started in room ${roomCode}`
      );
      logDigitalDefendersActivity({
        socket,
        action: AUDIT_ACTIONS.MULTIPLAYER_GAME_START,
        playerName: player.playerName,
        roomCode,
        details: { phase: "turn_order_selection", playersInRoom: game.players.size },
      });
    });

    // Play a card
    socket.on("play-card", (data) => {
      const { roomCode, cardId, targetQuestionId } = data;
      const game = digitalDefendersGames.get(roomCode);
      const player = digitalDefendersPlayers.get(socket.id);

      if (!game || !player || player.gameId !== roomCode) {
        socket.emit("error", { message: "Invalid game session" });
        return;
      }

      const result = game.playCard(socket.id, cardId, targetQuestionId);
      if (!result.success) {
        socket.emit("error", { message: result.message });
        return;
      }

      // Check for wave advancement
      if (result.waveAdvanced && result.newWave) {
        // Emit wave transition event to all players
        digitalDefendersNamespace.to(roomCode).emit("wave-advanced", {
          previousWave: result.newWave - 1,
          newWave: result.newWave,
          gameState: game.getPublicGameState(),
        });
      }

      // Check for game over due to wrong answer
      if (result.effect && result.effect.gameOver) {
        logDigitalDefendersActivity({
          socket,
          action: AUDIT_ACTIONS.MULTIPLAYER_GAME_END,
          playerName: player.playerName,
          roomCode,
          details: {
            reason: "health_depleted",
            finalWave: game.currentWave,
            finalHealth: game.pcHealth,
          },
        });
        digitalDefendersNamespace.to(roomCode).emit("game-over", {
          reason: "health_depleted",
          message: "Game Over! PC Health reached 0 due to wrong answer.",
          finalWave: game.currentWave,
          finalHealth: game.pcHealth,
          gameState: game.getPublicGameState(),
        });
        return; // Exit early since game is over
      }

      // Notify all players about the card played
      digitalDefendersNamespace.to(roomCode).emit("card-played", {
        playerId: socket.id,
        playerName: player.playerName,
        card: result.card,
        effect: result.effect,
        gameState: game.getPublicGameState(),
        waveAdvanced: result.waveAdvanced,
        newWave: result.newWave,
      });

      // Send updated individual player states
      game.players.forEach((playerObj, socketId) => {
        const playerGameState = game.getPlayerGameState(socketId);
        digitalDefendersNamespace
          .to(socketId)
          .emit("game-state", playerGameState);
      });

      // Check if turn should advance automatically
      if (game.getPlayerActionsLeft(socket.id) === 0) {
        const turnResult = game.nextTurn();
        if (turnResult.success) {
          digitalDefendersNamespace.to(roomCode).emit("turn-updated", {
            currentPlayer: turnResult.nextPlayer,
            currentTurn: turnResult.currentTurn,
            gameState: game.getPublicGameState(),
          });

          // Send updated player states
          game.players.forEach((playerObj, socketId) => {
            const playerGameState = game.getPlayerGameState(socketId);
            digitalDefendersNamespace
              .to(socketId)
              .emit("game-state", playerGameState);
          });

          // Check for no cards remaining game end condition from turn advancement
          if (turnResult.gameEndCheck && turnResult.gameEndCheck.shouldEnd) {
            const endData = turnResult.gameEndCheck;
            digitalDefendersNamespace.to(roomCode).emit("game-over", {
              reason: endData.reason,
              winner: endData.winner,
              isTie: endData.isTie,
              tiedPlayers: endData.tiedPlayers,
              playerStats: endData.playerStats,
              finalWave: endData.finalWave,
              finalHealth: endData.finalHealth,
              gameState: game.getPublicGameState(),
              message: endData.isTie
                ? `Game ended! It's a tie between ${endData.tiedPlayers
                    .map((p) => p.playerName)
                    .join(", ")}!`
                : `Game ended! ${endData.winner.playerName} wins with ${endData.winner.score} points!`,
            });
          }
        }
      }

      // Check for game end conditions
      if (game.gameState === "gameOver") {
        logDigitalDefendersActivity({
          socket,
          action: AUDIT_ACTIONS.MULTIPLAYER_GAME_END,
          playerName: player.playerName,
          roomCode,
          details: { reason: "pc_health_zero", finalWave: game.currentWave },
        });
        digitalDefendersNamespace.to(roomCode).emit("game-over", {
          reason: "PC Health reached 0",
          finalWave: game.currentWave,
          gameState: game.getPublicGameState(),
        });
      } else if (game.gameState === "victory") {
        logDigitalDefendersActivity({
          socket,
          action: AUDIT_ACTIONS.MULTIPLAYER_GAME_END,
          playerName: player.playerName,
          roomCode,
          details: {
            reason: "victory",
            finalWave: game.currentWave,
            finalHealth: game.pcHealth,
          },
        });
        digitalDefendersNamespace.to(roomCode).emit("victory", {
          message: "Congratulations! You completed all 10 waves!",
          finalHealth: game.pcHealth,
          gameState: game.getPublicGameState(),
        });
      }

      // Check for no cards remaining game end condition
      if (result.gameEndCheck && result.gameEndCheck.shouldEnd) {
        const endData = result.gameEndCheck;
        digitalDefendersNamespace.to(roomCode).emit("game-over", {
          reason: endData.reason,
          winner: endData.winner,
          isTie: endData.isTie,
          tiedPlayers: endData.tiedPlayers,
          playerStats: endData.playerStats,
          finalWave: endData.finalWave,
          finalHealth: endData.finalHealth,
          gameState: game.getPublicGameState(),
          message: endData.isTie
            ? `Game ended! It's a tie between ${endData.tiedPlayers
                .map((p) => p.playerName)
                .join(", ")}!`
            : `Game ended! ${endData.winner.playerName} wins with ${endData.winner.score} points!`,
        });
      }

      console.log(
        `Card ${cardId} played by ${player.playerName} in room ${roomCode}`
      );
    });

    // Skip turn
    socket.on("skip-turn", (data) => {
      const { roomCode } = data;
      const game = digitalDefendersGames.get(roomCode);
      const player = digitalDefendersPlayers.get(socket.id);

      if (!game || !player || player.gameId !== roomCode) {
        socket.emit("error", { message: "Invalid game session" });
        return;
      }

      const result = game.skipTurn(socket.id);
      if (!result.success) {
        socket.emit("error", { message: result.message });
        return;
      }

      // Advance turn
      const turnResult = game.nextTurn();
      if (turnResult.success) {
        digitalDefendersNamespace.to(roomCode).emit("turn-updated", {
          currentPlayer: turnResult.nextPlayer,
          currentTurn: turnResult.currentTurn,
          gameState: game.getPublicGameState(),
          message: `${player.playerName} skipped their turn`,
        });

        // Send updated player states
        game.players.forEach((playerObj, socketId) => {
          const playerGameState = game.getPlayerGameState(socketId);
          digitalDefendersNamespace
            .to(socketId)
            .emit("game-state", playerGameState);
        });

        // Check for no cards remaining game end condition from turn advancement
        if (turnResult.gameEndCheck && turnResult.gameEndCheck.shouldEnd) {
          const endData = turnResult.gameEndCheck;
          digitalDefendersNamespace.to(roomCode).emit("game-over", {
            reason: endData.reason,
            winner: endData.winner,
            isTie: endData.isTie,
            tiedPlayers: endData.tiedPlayers,
            playerStats: endData.playerStats,
            finalWave: endData.finalWave,
            finalHealth: endData.finalHealth,
            gameState: game.getPublicGameState(),
            message: endData.isTie
              ? `Game ended! It's a tie between ${endData.tiedPlayers
                  .map((p) => p.playerName)
                  .join(", ")}!`
              : `Game ended! ${endData.winner.playerName} wins with ${endData.winner.score} points!`,
          });
        }
      }

      console.log(`${player.playerName} skipped turn in room ${roomCode}`);
    });

    // Reshuffle cards
    socket.on("reshuffle-cards", (data) => {
      const { roomCode } = data;
      const game = digitalDefendersGames.get(roomCode);
      const player = digitalDefendersPlayers.get(socket.id);

      if (!game || !player || player.gameId !== roomCode) {
        socket.emit("error", { message: "Invalid game session" });
        return;
      }

      const result = game.reshuffleHand(socket.id);
      if (!result.success) {
        socket.emit("error", { message: result.message });
        return;
      }

      // Notify all players about the reshuffle
      digitalDefendersNamespace.to(roomCode).emit("card-reshuffled", {
        playerId: socket.id,
        playerName: player.playerName,
        message: result.message,
        guaranteedAnswer: result.guaranteedAnswer,
        answerCardSource: result.answerCardSource,
        gameState: game.getPublicGameState(),
      });

      // Send updated individual player state
      const playerGameState = game.getPlayerGameState(socket.id);
      socket.emit("game-state", playerGameState);

      // Check if turn should advance automatically
      if (game.getPlayerActionsLeft(socket.id) === 0) {
        const turnResult = game.nextTurn();
        if (turnResult.success) {
          digitalDefendersNamespace.to(roomCode).emit("turn-updated", {
            currentPlayer: turnResult.nextPlayer,
            currentTurn: turnResult.currentTurn,
            gameState: game.getPublicGameState(),
          });

          // Send updated player states
          game.players.forEach((playerObj, socketId) => {
            const playerGameState = game.getPlayerGameState(socketId);
            digitalDefendersNamespace
              .to(socketId)
              .emit("game-state", playerGameState);
          });

          // Check for no cards remaining game end condition from turn advancement
          if (turnResult.gameEndCheck && turnResult.gameEndCheck.shouldEnd) {
            const endData = turnResult.gameEndCheck;
            digitalDefendersNamespace.to(roomCode).emit("game-over", {
              reason: endData.reason,
              winner: endData.winner,
              isTie: endData.isTie,
              tiedPlayers: endData.tiedPlayers,
              playerStats: endData.playerStats,
              finalWave: endData.finalWave,
              finalHealth: endData.finalHealth,
              gameState: game.getPublicGameState(),
              message: endData.isTie
                ? `Game ended! It's a tie between ${endData.tiedPlayers
                    .map((p) => p.playerName)
                    .join(", ")}!`
                : `Game ended! ${endData.winner.playerName} wins with ${endData.winner.score} points!`,
            });
          }
        }
      }

      console.log(`${player.playerName} reshuffled cards in room ${roomCode}`);
    });

    // Handle turn order selection
    socket.on("select-turn-position", (data) => {
      const { roomCode, position } = data;
      const game = digitalDefendersGames.get(roomCode);
      const player = digitalDefendersPlayers.get(socket.id);

      if (!game || !player || player.gameId !== roomCode) {
        socket.emit("error", { message: "Invalid game session" });
        return;
      }

      const result = game.selectTurnOrder(socket.id, position);
      if (!result.success) {
        socket.emit("error", { message: result.message });
        return;
      }

      // Notify all players about the selection
      digitalDefendersNamespace.to(roomCode).emit("turn-position-selected", {
        playerId: socket.id,
        playerName: player.playerName,
        position: result.selectedPosition,
        readyPlayers: result.readyPlayers,
        totalPlayers: result.totalPlayers,
        gameState: game.getPublicGameState(),
      });

      // Check if all players have selected their positions
      if (game.allPlayersSelectedTurnOrder()) {
        // Small delay to ensure all clients receive the selection update
        setTimeout(() => {
          const finalizeResult = game.finalizeTurnOrder();
          if (finalizeResult.success) {
            // Notify all players that turn order is finalized
            digitalDefendersNamespace
              .to(roomCode)
              .emit("turn-order-finalized", {
                playerOrder: finalizeResult.playerOrder,
                gameState: game.getPublicGameState(),
              });

            // Auto-start the actual game after turn order is set
            setTimeout(async () => {
              const gameResult = await game.initializeGame();
              if (gameResult.success) {
                // Notify all players that the game has started
                digitalDefendersNamespace.to(roomCode).emit("game-started", {
                  gameState: game.getPublicGameState(),
                  message: "Game started! Get ready to defend!",
                });

                // Send individual player states
                game.players.forEach((playerObj, socketId) => {
                  const playerGameState = game.getPlayerGameState(socketId);
                  digitalDefendersNamespace
                    .to(socketId)
                    .emit("game-state", playerGameState);
                });

                console.log(
                  `Digital Defenders game started in room ${roomCode} with turn order:`,
                  finalizeResult.playerOrder
                );
              }
            }, 1000); // 1 second delay to show turn order
          }
        }, 500); // 500ms delay for UI synchronization
      }

      console.log(
        `Player ${player.playerName} selected position ${result.selectedPosition} in room ${roomCode}`
      );
    });

    // Set turn order (for future implementation)
    socket.on("set-turn-order", (data) => {
      const { roomCode, playersOrder } = data;
      const game = digitalDefendersGames.get(roomCode);
      const player = digitalDefendersPlayers.get(socket.id);

      if (!game || !player || player.gameId !== roomCode) {
        socket.emit("error", { message: "Invalid game session" });
        return;
      }

      if (!game.isCreator(socket.id)) {
        socket.emit("error", {
          message: "Only the room creator can set turn order",
        });
        return;
      }

      // Update game turn order
      game.playerOrder = playersOrder;

      digitalDefendersNamespace.to(roomCode).emit("turn-order-set", {
        playerOrder: playersOrder,
        gameState: game.getPublicGameState(),
      });

      console.log(`Turn order set in room ${roomCode}:`, playersOrder);
    });

    // Get current game state
    socket.on("get-game-state", (data) => {
      const { roomCode } = data;
      const game = digitalDefendersGames.get(roomCode);
      const player = digitalDefendersPlayers.get(socket.id);

      if (!game || !player || player.gameId !== roomCode) {
        socket.emit("error", { message: "Invalid game session" });
        return;
      }

      const playerGameState = game.getPlayerGameState(socket.id);
      socket.emit("game-state", playerGameState);
    });

    // Handle countdown tick (optional - for server-controlled countdown)
    socket.on("countdown-tick", (data) => {
      const { roomCode } = data;
      const game = digitalDefendersGames.get(roomCode);

      if (!game || game.gameState !== "playing") {
        return;
      }

      // This would be handled by a server-side timer in a production environment
      // For now, we'll rely on client-side countdown management
    });

    // Handle player disconnection
    socket.on("disconnect", (reason) => {
      console.log(`Socket ${socket.id} disconnected. Reason: ${reason}`);
      const player = digitalDefendersPlayers.get(socket.id);

      if (player) {
        logDigitalDefendersActivity({
          socket,
          action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_LEAVE,
          playerName: player.playerName,
          roomCode: player.gameId,
          details: { leaveType: "disconnect", reason },
        });
        console.log(
          `Player ${player.playerName} disconnected from room ${player.gameId}`
        );
        const game = digitalDefendersGames.get(player.gameId);

        if (game) {
          console.log(
            `Room ${player.gameId} has ${game.players.size} players before removal`
          );
          game.removePlayer(socket.id);

          // Notify other players about disconnection
          digitalDefendersNamespace
            .to(player.gameId)
            .emit("player-disconnected", {
              playerName: player.playerName,
              playerId: socket.id,
              room: {
                id: player.gameId,
                players: Array.from(game.players.values()),
                gameState: game.gameState,
                maxPlayers: game.maxPlayers,
              },
            });

          // Only clean up if game is in lobby state and empty
          // Keep the room for a bit if game is in progress
          if (game.players.size === 0) {
            if (game.gameState === "lobby") {
              // Instead of immediate cleanup, set a timer for delayed cleanup
              // This allows players to reconnect or new players to join
              console.log(
                `Digital Defenders room ${player.gameId} is empty (lobby state) - scheduling cleanup in 5 minutes`
              );

              // Set cleanup timer if not already set
              if (!game.cleanupTimer) {
                game.cleanupTimer = setTimeout(() => {
                  // Double-check the room is still empty before cleanup
                  const currentGame = digitalDefendersGames.get(player.gameId);
                  if (
                    currentGame &&
                    currentGame.players.size === 0 &&
                    currentGame.gameState === "lobby"
                  ) {
                    digitalDefendersGames.delete(player.gameId);
                    console.log(
                      `Digital Defenders room ${player.gameId} cleaned up after timeout - no players rejoined`
                    );
                  }
                }, 5 * 60 * 1000); // 5 minutes
              }
            } else {
              console.log(
                `Digital Defenders room ${player.gameId} kept alive - game in progress`
              );
              // Could set a timer here to clean up after a delay
            }
          } else {
            console.log(
              `Digital Defenders room ${player.gameId} has ${game.players.size} players remaining`
            );

            // If players rejoin and there's a pending cleanup, cancel it
            if (game.cleanupTimer) {
              clearTimeout(game.cleanupTimer);
              game.cleanupTimer = null;
              console.log(
                `Digital Defenders room ${player.gameId} cleanup timer cancelled - players present`
              );
            }
          }
        }

        digitalDefendersPlayers.delete(socket.id);
      }

      console.log("Digital Defenders user disconnected:", socket.id);
    });

    // Handle socket timeout
    socket.on("timeout", () => {
      console.log(`Socket ${socket.id} timed out`);
      socket.disconnect(true);
    });

    // Leave room explicitly
    socket.on("leave-room", (data) => {
      const { roomCode } = data;
      const player = digitalDefendersPlayers.get(socket.id);

      if (player && player.gameId === roomCode) {
        const game = digitalDefendersGames.get(roomCode);

        if (game) {
          game.removePlayer(socket.id);

          // Notify other players
          socket.to(roomCode).emit("player-left", {
            playerName: player.playerName,
            playerId: socket.id,
            room: {
              id: roomCode,
              players: Array.from(game.players.values()),
              gameState: game.gameState,
              maxPlayers: game.maxPlayers,
            },
          });

          // If game is empty, set up delayed cleanup for lobby games
          if (game.players.size === 0) {
            if (game.gameState === "lobby") {
              console.log(
                `Digital Defenders room ${roomCode} is empty (lobby state) - scheduling cleanup in 5 minutes`
              );

              // Set cleanup timer if not already set
              if (!game.cleanupTimer) {
                game.cleanupTimer = setTimeout(() => {
                  // Double-check the room is still empty before cleanup
                  const currentGame = digitalDefendersGames.get(roomCode);
                  if (
                    currentGame &&
                    currentGame.players.size === 0 &&
                    currentGame.gameState === "lobby"
                  ) {
                    digitalDefendersGames.delete(roomCode);
                    console.log(
                      `Digital Defenders room ${roomCode} cleaned up after timeout - no players rejoined`
                    );
                  }
                }, 5 * 60 * 1000); // 5 minutes
              }
            } else {
              digitalDefendersGames.delete(roomCode);
              console.log(
                `Digital Defenders room ${roomCode} cleaned up - no players (game was in progress)`
              );
            }
          }
        }

        digitalDefendersPlayers.delete(socket.id);
        socket.leave(roomCode);

        socket.emit("room-left", { success: true });
        logDigitalDefendersActivity({
          socket,
          action: AUDIT_ACTIONS.MULTIPLAYER_ROOM_LEAVE,
          playerName: player.playerName,
          roomCode,
          details: { leaveType: "manual" },
        });
        console.log(
          `${player.playerName} left Digital Defenders room ${roomCode}`
        );
      }
    });
  });
};

// Helper function to clean up inactive games (could be called periodically)
const cleanupInactiveGames = () => {
  const now = Date.now();
  const INACTIVE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  digitalDefendersGames.forEach((game, roomCode) => {
    if (game.gameStartTime && now - game.gameStartTime > INACTIVE_TIMEOUT) {
      console.log(`Cleaning up inactive Digital Defenders game: ${roomCode}`);
      digitalDefendersGames.delete(roomCode);

      // Clean up associated players
      digitalDefendersPlayers.forEach((player, socketId) => {
        if (player.gameId === roomCode) {
          digitalDefendersPlayers.delete(socketId);
        }
      });
    }
  });
};

// Export the controller functions
export {
  initializeDigitalDefendersSocket,
  cleanupInactiveGames,
  digitalDefendersGames,
  digitalDefendersPlayers,
  generateRoomCode,
};
