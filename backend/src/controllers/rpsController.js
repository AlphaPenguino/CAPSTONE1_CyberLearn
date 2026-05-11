import { rpsGames, createRpsGame, joinRpsGame, leaveRpsGame, getRpsGameState, updateRpsGameState, deleteRpsGame } from "../state/rpsState.js";

export function initializeRpsSocket(io) {
  const nsp = io.of("/rps");

  nsp.on("connection", (socket) => {
    console.log(`RPS socket connected: ${socket.id}`);

    socket.on("rps:create", ({ roomCode, userId, username }, callback) => {
      try {
        const code = roomCode || Math.random().toString(36).substring(2, 8).toUpperCase();
        const game = createRpsGame(code, userId, username);
        socket.join(code);
        nsp.to(code).emit("rps:state", game);
        callback && callback({ success: true, room: game });
      } catch (err) {
        console.error("rps:create error", err);
        callback && callback({ success: false, message: err.message });
      }
    });

    socket.on("rps:join", ({ roomCode, userId, username, team }, callback) => {
      try {
        const game = joinRpsGame(roomCode, userId, username, team);
        socket.join(roomCode);
        nsp.to(roomCode).emit("rps:state", game);
        callback && callback({ success: true, room: game });
      } catch (err) {
        console.error("rps:join error", err);
        callback && callback({ success: false, message: err.message });
      }
    });

    socket.on("rps:leave", ({ roomCode, userId }, callback) => {
      try {
        leaveRpsGame(userId, roomCode);
        socket.leave(roomCode);
        const game = getRpsGameState(roomCode);
        if (game) nsp.to(roomCode).emit("rps:state", game);
        callback && callback({ success: true });
      } catch (err) {
        console.error("rps:leave error", err);
        callback && callback({ success: false, message: err.message });
      }
    });

    socket.on("rps:update", ({ roomCode, updates }, callback) => {
      try {
        const game = updateRpsGameState(roomCode, updates);
        nsp.to(roomCode).emit("rps:state", game);
        callback && callback({ success: true, room: game });
      } catch (err) {
        console.error("rps:update error", err);
        callback && callback({ success: false, message: err.message });
      }
    });

    socket.on("rps:start", ({ roomCode }, callback) => {
      try {
        const game = getRpsGameState(roomCode);
        if (!game) throw new Error("Room not found");
        if (game.players.A.length === 0 || game.players.B.length === 0) {
          throw new Error("Both teams must have at least one player");
        }
        game.status = "playing";
        game.phase = "playing";
        game.playStage = "question_display";
        game.currentRoundIndex = 0;
        game.currentQuestion = null;
        game.answeringTeam = null;
        game.selectedAnswer = null;
        game.isCorrect = null;
        nsp.to(roomCode).emit("rps:state", game);
        callback && callback({ success: true, room: game });
      } catch (err) {
        console.error("rps:start error", err);
        callback && callback({ success: false, message: err.message });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`RPS socket disconnected: ${socket.id} (${reason})`);
    });
  });
}
