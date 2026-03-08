import { API_URL } from "@/constants/api";

class KnowledgeRelayAPI {
  constructor() {
    this.baseURL = `${API_URL}/knowledge-relay`;
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
      console.error(`Knowledge Relay API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Track game completion for analytics
  async trackGameCompletion(gameData) {
    try {
      return await this.makeRequest("/game/complete", {
        method: "POST",
        body: JSON.stringify(gameData),
      });
    } catch (error) {
      console.error("Error tracking Knowledge Relay game completion:", error);
      // Don't throw error to avoid disrupting game flow
      return { success: false, error: error.message };
    }
  }

  // Get questions
  async getQuestions() {
    return this.makeRequest("/questions");
  }

  // Health check
  async healthCheck() {
    return this.makeRequest("/health");
  }
}

export default new KnowledgeRelayAPI();
