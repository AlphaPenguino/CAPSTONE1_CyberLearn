import { io } from "socket.io-client";
import { API_URL } from "@/constants/api";

class RainOfWordsSocketService {
  constructor() {
    this.socket = null;
    this.callbacks = new Map();
  }

  connect() {
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return this.socket;
    }

    // Extract base URL and create Socket.IO connection
    const baseUrl = API_URL.replace("/api", "");
    this.socket = io(`${baseUrl}/rain-of-words`, {
      transports: ["websocket", "polling"],
      forceNew: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 20000,
    });

    this.setupEventListeners();
    return this.socket;
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Rain of Words Socket connected:", this.socket.id);
      this.emit("socket-connected", { socketId: this.socket.id });
    });

    this.socket.on("disconnect", () => {
      console.log("Rain of Words Socket disconnected");
      this.emit("socket-disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Rain of Words Socket connection error:", error);
      this.emit("socket-error", { error: error.message });
    });

    // Game event listeners
    this.socket.on("room-created", (data) => {
      console.log("Room created:", data);
      this.emit("room-created", data);
    });

    this.socket.on("room-joined", (data) => {
      console.log("Room joined:", data);
      this.emit("room-joined", data);
    });

    this.socket.on("opponent-joined", (data) => {
      console.log("Opponent joined:", data);
      this.emit("opponent-joined", data);
    });

    this.socket.on("game-started", (data) => {
      console.log("Game started:", data);
      this.emit("game-started", data);
    });

    this.socket.on("question-display", (data) => {
      console.log("Question displayed:", data);
      this.emit("question-display", data);
    });

    this.socket.on("answer-result", (data) => {
      console.log("Answer result:", data);
      this.emit("answer-result", data);
    });

    this.socket.on("opponent-answer", (data) => {
      console.log("Opponent answered:", data);
      this.emit("opponent-answer", data);
    });

    this.socket.on("missed-round", (data) => {
      console.log("Round missed:", data);
      this.emit("missed-round", data);
    });

    this.socket.on("next-question", (data) => {
      console.log("Next question:", data);
      this.emit("next-question", data);
    });

    this.socket.on("game-finished", (data) => {
      console.log("Game finished:", data);
      this.emit("game-finished", data);
    });

    this.socket.on("player-disconnected", (data) => {
      console.log("Player disconnected:", data);
      this.emit("player-disconnected", data);
    });

    this.socket.on("room-closed", (data) => {
      console.log("Room closed:", data);
      this.emit("room-closed", data);
    });

    this.socket.on("error", (data) => {
      console.error("Socket error:", data);
      this.emit("socket-error", data);
    });
  }

  // Game actions
  createRoom(playerName) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log("Creating room for player:", playerName);
    this.socket.emit("create-room", { playerName });
  }

  joinRoom(roomCode, playerName) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log("Joining room:", roomCode, "with player:", playerName);
    this.socket.emit("join-room", {
      roomId: roomCode,
      roomCode,
      playerName,
    });
  }

  leaveRoom() {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    this.socket.emit("leave-room");
  }

  startGame(roomCode) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log("Starting game in room:", roomCode);
    this.socket.emit("start-game", { roomCode });
  }

  submitAnswer(roomCode, answer, isCorrect, questionIndex) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log("Submitting answer:", answer, "in room:", roomCode);
    this.socket.emit("submit-answer", {
      roomCode,
      answer,
      isCorrect,
      questionIndex,
    });
  }

  missedRound(roomCode) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    this.socket.emit("missed-round", { roomCode });
  }

  getGameState(roomCode) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    this.socket.emit("get-game-state", { roomCode });
  }

  // Event handling
  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  off(event, callback) {
    if (this.callbacks.has(event)) {
      const callbacks = this.callbacks.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in callback for event ${event}:`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      console.log("Disconnecting Rain of Words socket");
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks.clear();
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export default new RainOfWordsSocketService();
