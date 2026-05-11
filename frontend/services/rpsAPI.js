import { API_URL } from "@/constants/api";

class RPSAPI {
  constructor() {
    this.baseURL = `${API_URL}/rps`;
  }

  // Helper method to get auth token
  async getAuthToken() {
    const AsyncStorage = await import(
      "@react-native-async-storage/async-storage"
    );
    return await AsyncStorage.default.getItem("token");
  }

  // Helper method to make authenticated requests
  async makeRequest(endpoint, options = {}) {
    const token = await this.getAuthToken();

    const defaultHeaders = {
      "Content-Type": "application/json",
    };

    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `HTTP error! status: ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error(`RPS API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // ============================================================================
  // ROOM MANAGEMENT
  // ============================================================================

  /**
   * Create a new RPS game room
   * @param {string} username - The creator's username
   * @returns {Promise<{success: boolean, room: object}>}
   */
  async createRoom(username) {
    return this.makeRequest("/rooms", {
      method: "POST",
      body: JSON.stringify({ username }),
    });
  }

  /**
   * Join an existing RPS room
   * @param {string} roomCode - The room code to join
   * @param {string} username - The player's username
   * @param {string} teamCode - Team to join: "A" or "B"
   * @returns {Promise<{success: boolean, room: object}>}
   */
  async joinRoom(roomCode, username, teamCode) {
    return this.makeRequest(`/rooms/${roomCode}/join`, {
      method: "POST",
      body: JSON.stringify({ username, teamCode }),
    });
  }

  /**
   * Get the current state of a room
   * @param {string} roomCode - The room code
   * @returns {Promise<{success: boolean, room: object}>}
   */
  async getRoom(roomCode) {
    return this.makeRequest(`/rooms/${roomCode}`);
  }

  /**
   * Leave a room
   * @param {string} roomCode - The room code to leave
   * @returns {Promise<{success: boolean, message: string, roomDeleted: boolean}>}
   */
  async leaveRoom(roomCode) {
    return this.makeRequest(`/rooms/${roomCode}/leave`, {
      method: "POST",
    });
  }

  // ============================================================================
  // GAME STATE MANAGEMENT
  // ============================================================================

  /**
   * Update the game state (phase transitions, scoring, etc.)
   * @param {string} roomCode - The room code
   * @param {object} updates - State updates to apply
   * @returns {Promise<{success: boolean, room: object}>}
   */
  async updateGameState(roomCode, updates) {
    return this.makeRequest(`/rooms/${roomCode}/state`, {
      method: "POST",
      body: JSON.stringify({ updates }),
    });
  }

  /**
   * Start a game (transition from team selection to playing)
   * @param {string} roomCode - The room code
   * @returns {Promise<{success: boolean, room: object}>}
   */
  async startGame(roomCode) {
    return this.makeRequest(`/rooms/${roomCode}/start`, {
      method: "POST",
    });
  }

  /**
   * Track game completion for analytics
   * @param {string} roomCode - The room code
   * @param {object} gameData - Game completion data
   * @returns {Promise<{success: boolean, data: object}>}
   */
  async completeGame(roomCode, gameData) {
    try {
      return await this.makeRequest(`/rooms/${roomCode}/complete`, {
        method: "POST",
        body: JSON.stringify(gameData),
      });
    } catch (error) {
      console.error("Error tracking RPS game completion:", error);
      // Don't throw error to avoid disrupting game flow
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Get team configurations
   * @returns {Promise<{success: boolean, teams: object}>}
   */
  async getTeams() {
    return this.makeRequest("/teams");
  }

  /**
   * Get available game phases
   * @returns {Promise<{success: boolean, phases: object}>}
   */
  async getPhases() {
    return this.makeRequest("/phases");
  }

  /**
   * Get available play stages
   * @returns {Promise<{success: boolean, playStages: object}>}
   */
  async getPlayStages() {
    return this.makeRequest("/play-stages");
  }

  /**
   * Get RPS choice options
   * @returns {Promise<{success: boolean, choices: object}>}
   */
  async getRpsChoices() {
    return this.makeRequest("/rps-choices");
  }

  /**
   * Health check
   * @returns {Promise<{success: boolean, status: string}>}
   */
  async healthCheck() {
    return this.makeRequest("/health");
  }

  /**
   * Get server statistics
   * @returns {Promise<{success: boolean, stats: object}>}
   */
  async getStats() {
    return this.makeRequest("/stats");
  }
}

export default new RPSAPI();
