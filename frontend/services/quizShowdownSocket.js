import { io } from "socket.io-client";
import { API_URL } from "@/constants/api";

class QuizShowdownSocketService {
  constructor() {
    this.socket = null;
    this.callbacks = new Map();
  }

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Extract base URL and create Socket.IO connection
    const baseUrl = API_URL.replace("/api", "");
    this.socket = io(`${baseUrl}/quiz-showdown`, {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5,
      timeout: 20000,
    });

    this.setupEventListeners();
    return this.socket;
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Quiz Showdown Socket connected:", this.socket.id);
      this.emit("socket-connected", { socketId: this.socket.id });
    });

    this.socket.on("disconnect", () => {
      console.log("Quiz Showdown Socket disconnected");
      this.emit("socket-disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Quiz Showdown Socket connection error:", error);
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

    this.socket.on("player-joined", (data) => {
      console.log("Player joined:", data);
      this.emit("player-joined", data);
    });

    this.socket.on("team-updated", (data) => {
      console.log("Team updated:", data);
      this.emit("team-updated", data);
    });

    this.socket.on("team-joined", (data) => {
      console.log("Team joined:", data);
      this.emit("team-joined", data);
    });

    this.socket.on("game-started", (data) => {
      console.log("Game started:", data);
      this.emit("game-started", data);
    });

    this.socket.on("buzzer-activated", (data) => {
      console.log("Buzzer activated:", data);
      this.emit("buzzer-activated", data);
    });

    this.socket.on("team-buzzed", (data) => {
      console.log("Team buzzed:", data);
      this.emit("team-buzzed", data);
    });

    this.socket.on("buzz-failed", (data) => {
      console.log("Buzz failed:", data);
      this.emit("buzz-failed", data);
    });

    this.socket.on("answer-submitted", (data) => {
      console.log("Answer submitted:", data);
      this.emit("answer-submitted", data);
    });

    this.socket.on("answer-failed", (data) => {
      console.log("Answer failed:", data);
      this.emit("answer-failed", data);
    });

    this.socket.on("next-question", (data) => {
      console.log("Next question:", data);
      this.emit("next-question", data);
    });

    this.socket.on("team-turn", (data) => {
      console.log("Team turn:", data);
      this.emit("team-turn", data);
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

    this.socket.on("game-state", (data) => {
      console.log("Game state:", data);
      this.emit("game-state", data);
    });

    this.socket.on("error", (data) => {
      console.error("Socket error:", data);
      this.emit("socket-game-error", data);
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

  joinRoom(roomId, playerName) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log("Joining room:", roomId, "with player:", playerName);
    this.socket.emit("join-room", { roomId, playerName });
  }

  joinTeam(roomId, teamName) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log("Joining team:", teamName, "in room:", roomId);
    this.socket.emit("join-team", { roomId, teamName });
  }

  startGame(roomId) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log("Starting game in room:", roomId);
    this.socket.emit("start-game", { roomId });
  }

  buzz(roomId, teamName) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log("Buzzing for team:", teamName, "in room:", roomId);
    this.socket.emit("buzz", { roomId, teamName });
  }

  submitAnswer(roomId, teamName, answerIndex) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log(
      "Submitting answer:",
      answerIndex,
      "for team:",
      teamName,
      "in room:",
      roomId
    );
    this.socket.emit("submit-answer", { roomId, teamName, answerIndex });
  }

  getGameState(roomId) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log("Getting game state for room:", roomId);
    this.socket.emit("get-game-state", { roomId });
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
      console.log("Disconnecting Quiz Showdown socket");
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks.clear();
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export default new QuizShowdownSocketService();
