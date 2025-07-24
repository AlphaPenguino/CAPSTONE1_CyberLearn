import { RelayGame, sampleQuestions } from '../models/RelayGame.js';

// Game state storage
const games = new Map();
const players = new Map();

// Initialize Socket.IO for games
const initializeGameSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("create-game", (data) => {
      const { playerName } = data;
      const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const game = new RelayGame(gameId, socket.id, playerName);
      games.set(gameId, game);

      socket.emit("game-created", {
        gameId,
        game: game.getGameState(),
        isCreator: true,
        playerName,
      });
    });

    socket.on("join-game", (data) => {
      const { gameId, playerName, teamName } = data;
      const game = games.get(gameId);

      if (!game) {
        socket.emit("error", { message: "Game not found" });
        return;
      }

      // Add team if it doesn't exist
      if (!game.teams.has(teamName)) {
        const teamResult = game.addTeam(teamName);
        if (!teamResult.success) {
          socket.emit("error", { message: teamResult.message });
          return;
        }
      }

      // Add player to team
      const result = game.addPlayerToTeam(socket.id, playerName, teamName);
      if (!result.success) {
        socket.emit("error", { message: result.message });
        return;
      }

      const isCreator = game.isCreator(socket.id);
      players.set(socket.id, { gameId, playerName, teamName, isCreator });
      socket.join(gameId);
      socket.join(`${gameId}-${teamName}`);

      io.to(gameId).emit("game-updated", game.getGameState());
      socket.emit("joined-game", {
        player: result.player,
        game: game.getGameState(),
        isCreator,
      });
    });

    socket.on("start-game", (data) => {
      const { gameId } = data;
      const game = games.get(gameId);
      const player = players.get(socket.id);

      if (!game) {
        socket.emit("error", { message: "Game not found" });
        return;
      }

      // Only creator can start the game
      if (!game.isCreator(socket.id)) {
        socket.emit("error", { message: "Only the game creator can start the game" });
        return;
      }

      game.status = "active";
      io.to(gameId).emit("game-started", game.getGameState());

      // Send first question to each team
      game.teams.forEach((team, teamName) => {
        const question = game.getCurrentQuestion(teamName);
        if (question) {
          io.to(`${gameId}-${teamName}`).emit("new-question", {
            question,
            currentPlayer: team.members[team.currentPlayerIndex],
          });
        }
      });
    });

    socket.on("answer-question", (data) => {
      const { gameId, answerIndex } = data;
      const player = players.get(socket.id);

      if (!player || player.gameId !== gameId) {
        socket.emit("error", { message: "Invalid game session" });
        return;
      }

      const game = games.get(gameId);
      if (!game) {
        socket.emit("error", { message: "Game not found" });
        return;
      }

      const result = game.answerQuestion(player.teamName, socket.id, answerIndex);

      if (result.success) {
        io.to(`${gameId}-${player.teamName}`).emit("answer-result", result);
        io.to(gameId).emit("game-updated", game.getGameState());

        if (result.correct && !game.teams.get(player.teamName).isFinished) {
          // Send next question
          const nextQuestion = game.getCurrentQuestion(player.teamName);
          if (nextQuestion) {
            io.to(`${gameId}-${player.teamName}`).emit("new-question", {
              question: nextQuestion,
              currentPlayer: game.teams.get(player.teamName).members[game.teams.get(player.teamName).currentPlayerIndex],
            });
          }
        }

        // Check for game end
        if (game.status === "finished") {
          const winner = Array.from(game.teams.values()).find((team) => team.isFinished);
          io.to(gameId).emit("game-finished", {
            winner: winner.name,
            finalState: game.getGameState(),
          });
        }
      } else {
        socket.emit("error", { message: result.message });
      }
    });

    socket.on("request-help", (data) => {
      const { gameId } = data;
      const player = players.get(socket.id);

      if (!player || player.gameId !== gameId) {
        socket.emit("error", { message: "Invalid game session" });
        return;
      }

      const game = games.get(gameId);
      if (!game) {
        socket.emit("error", { message: "Game not found" });
        return;
      }

      const result = game.requestHelp(player.teamName, socket.id);

      if (result.success) {
        io.to(`${gameId}-${player.teamName}`).emit("help-requested", {
          requester: player.playerName,
          helpRemaining: result.helpRemaining,
          currentQuestion: game.getCurrentQuestion(player.teamName),
        });
      } else {
        socket.emit("error", { message: result.message });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      players.delete(socket.id);
    });
  });
};

export { initializeGameSocket };