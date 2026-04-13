import { io } from "socket.io-client";
import { API_URL } from "@/constants/api";

class DigitalDefendersSocketService {
  constructor() {
    this.socket = null;
    this.callbacks = new Map();
  }

  connect() {
    // Reuse existing socket instance to avoid multiple parallel connections.
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return this.socket;
    }

    // Extract base URL and create Socket.IO connection
    const baseUrl = API_URL.replace("/api", "");
    console.log(
      `Connecting to Digital Defenders socket at: ${baseUrl}/digital-defenders`
    );

    this.socket = io(`${baseUrl}/digital-defenders`, {
      transports: ["websocket", "polling"],
      forceNew: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      maxReconnectionAttempts: 10,
      timeout: 20000,
      autoConnect: true,
      upgrade: true,
      rememberUpgrade: false,
    });

    this.setupEventListeners();
    return this.socket;
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Digital Defenders Socket connected:", this.socket.id);
      this.emit("socket-connected", { socketId: this.socket.id });
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Digital Defenders Socket disconnected:", reason);
      this.emit("socket-disconnected", { reason });
    });

    this.socket.on("connect_error", (error) => {
      console.error("Digital Defenders Socket connection error:", error);
      this.emit("socket-error", { error: error.message });
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log(
        "Digital Defenders Socket reconnected after",
        attemptNumber,
        "attempts"
      );
      this.emit("socket-reconnected", { attemptNumber });
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("Digital Defenders Socket reconnection error:", error);
      this.emit("socket-reconnect-error", { error: error.message });
    });

    this.socket.on("reconnect_failed", () => {
      console.error("Digital Defenders Socket failed to reconnect");
      this.emit("socket-reconnect-failed");
    });

    // Game event listeners
    this.socket.on("room-created", (data) => {
      console.log("Digital Defenders Room created:", data);
      this.emit("room-created", data);
    });

    this.socket.on("room-joined", (data) => {
      console.log("Digital Defenders Room joined:", data);
      this.emit("room-joined", data);
    });

    this.socket.on("player-joined", (data) => {
      console.log("Digital Defenders Player joined:", data);
      this.emit("player-joined", data);
    });

    this.socket.on("room-updated", (data) => {
      console.log("Digital Defenders Room updated:", data);
      this.emit("room-updated", data);
    });

    this.socket.on("game-started", (data) => {
      console.log("Digital Defenders Game started:", data);
      this.emit("game-started", data);
    });

    this.socket.on("turn-updated", (data) => {
      console.log("Digital Defenders Turn updated:", data);
      this.emit("turn-updated", data);
    });

    this.socket.on("card-played", (data) => {
      console.log("Digital Defenders Card played:", data);
      this.emit("card-played", data);
    });

    this.socket.on("card-reshuffled", (data) => {
      console.log("Digital Defenders Cards reshuffled:", data);
      this.emit("card-reshuffled", data);
    });

    this.socket.on("countdown-updated", (data) => {
      console.log("Digital Defenders Countdown updated:", data);
      this.emit("countdown-updated", data);
    });

    this.socket.on("wave-advanced", (data) => {
      console.log("Digital Defenders Wave advanced:", data);
      this.emit("wave-advanced", data);
    });

    this.socket.on("wave-completed", (data) => {
      console.log("Digital Defenders Wave completed:", data);
      this.emit("wave-completed", data);
    });

    this.socket.on("game-over", (data) => {
      console.log("Digital Defenders Game over:", data);
      this.emit("game-over", data);
    });

    this.socket.on("victory", (data) => {
      console.log("Digital Defenders Victory:", data);
      this.emit("victory", data);
    });

    this.socket.on("player-disconnected", (data) => {
      console.log("Digital Defenders Player disconnected:", data);
      this.emit("player-disconnected", data);
    });

    this.socket.on("player-left", (data) => {
      console.log("Digital Defenders Player left:", data);
      this.emit("player-left", data);
    });

    this.socket.on("room-closed", (data) => {
      console.log("Digital Defenders Room closed:", data);
      this.emit("room-closed", data);
    });

    this.socket.on("turn-order-selection-started", (data) => {
      console.log("Digital Defenders Turn order selection started:", data);
      this.emit("turn-order-selection-started", data);
    });

    this.socket.on("turn-position-selected", (data) => {
      console.log("Digital Defenders Turn position selected:", data);
      this.emit("turn-position-selected", data);
    });

    this.socket.on("turn-order-finalized", (data) => {
      console.log("Digital Defenders Turn order finalized:", data);
      this.emit("turn-order-finalized", data);
    });

    this.socket.on("game-state", (data) => {
      console.log("Digital Defenders Game state:", data);
      this.emit("game-state", data);
    });

    this.socket.on("error", (data) => {
      console.error("Digital Defenders Socket error:", data);
      this.emit("socket-game-error", data);
    });
  }

  // Game actions
  createRoom(playerName, maxPlayers = 4) {
    if (!this.socket?.connected) {
      console.error("Socket not connected when trying to create room");
      throw new Error("Socket not connected");
    }
    console.log(
      "Creating Digital Defenders room for player:",
      playerName,
      "maxPlayers:",
      maxPlayers
    );
    this.socket.emit("create-room", { playerName, maxPlayers });
  }

  joinRoom(roomId, playerName) {
    if (!this.socket?.connected) {
      console.error("Socket not connected when trying to join room");
      throw new Error("Socket not connected");
    }
    console.log(
      "Joining Digital Defenders room:",
      roomId,
      "with player:",
      playerName
    );
    this.socket.emit("join-room", { roomCode: roomId, playerName });
  }

  startGame(roomId) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log("Starting Digital Defenders game in room:", roomId);
    this.socket.emit("start-game", { roomCode: roomId });
  }

  playCard(roomId, cardId, targetQuestionId = null) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log(
      "Playing card:",
      cardId,
      "in room:",
      roomId,
      "target question:",
      targetQuestionId
    );
    this.socket.emit("play-card", {
      roomCode: roomId,
      cardId,
      targetQuestionId,
    });
  }

  skipTurn(roomId) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log("Skipping turn in room:", roomId);
    this.socket.emit("skip-turn", { roomCode: roomId });
  }

  reshuffleCards(roomId) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log("Reshuffling cards in room:", roomId);
    this.socket.emit("reshuffle-cards", { roomCode: roomId });
  }

  setTurnOrder(roomId, playersOrder) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log("Setting turn order in room:", roomId, "order:", playersOrder);
    this.socket.emit("set-turn-order", { roomCode: roomId, playersOrder });
  }

  selectTurnPosition(roomId, position) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log("Selecting turn position:", position, "in room:", roomId);
    this.socket.emit("select-turn-position", { roomCode: roomId, position });
  }

  getGameState(roomId) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log("Getting Digital Defenders game state for room:", roomId);
    this.socket.emit("get-game-state", { roomCode: roomId });
  }

  leaveRoom(roomId) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    console.log("Leaving Digital Defenders room:", roomId);
    this.socket.emit("leave-room", { roomCode: roomId });
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
      console.log("Disconnecting Digital Defenders socket");
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks.clear();
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export default new DigitalDefendersSocketService();
