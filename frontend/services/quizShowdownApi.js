import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

class QuizShowdownApiService {
  constructor() {
    this.baseUrl = `${API_URL}/quiz-showdown`;
  }

  async getAuthToken() {
    try {
      return await AsyncStorage.getItem("token");
    } catch (error) {
      console.error("Failed to get auth token:", error);
      return null;
    }
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const token = await this.getAuthToken();

      const config = {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      };

      console.log(`Making request to: ${url}`, config);

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `HTTP error! status: ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Question management APIs
  async getQuestions() {
    return this.makeRequest("/questions");
  }

  async getQuestion(id) {
    return this.makeRequest(`/questions/${id}`);
  }

  async createQuestion(questionData) {
    return this.makeRequest("/questions", {
      method: "POST",
      body: JSON.stringify(questionData),
    });
  }

  async updateQuestion(id, questionData) {
    return this.makeRequest(`/questions/${id}`, {
      method: "PUT",
      body: JSON.stringify(questionData),
    });
  }

  async deleteQuestion(id) {
    return this.makeRequest(`/questions/${id}`, {
      method: "DELETE",
    });
  }

  // Instructor management APIs
  async getInstructorQuestions(instructorId) {
    return this.makeRequest(`/instructor/${instructorId}/questions`);
  }

  async createInstructorQuestion(instructorId, questionData) {
    return this.makeRequest(`/instructor/${instructorId}/questions`, {
      method: "POST",
      body: JSON.stringify(questionData),
    });
  }

  async updateInstructorQuestion(instructorId, questionId, questionData) {
    return this.makeRequest(
      `/instructor/${instructorId}/questions/${questionId}`,
      {
        method: "PUT",
        body: JSON.stringify(questionData),
      }
    );
  }

  async deleteInstructorQuestion(instructorId, questionId) {
    return this.makeRequest(
      `/instructor/${instructorId}/questions/${questionId}`,
      {
        method: "DELETE",
      }
    );
  }

  // Upload questions from JSON file
  async uploadQuestions(questions) {
    return this.makeRequest("/upload-questions", {
      method: "POST",
      body: JSON.stringify({ questions }),
    });
  }

  // Validate questions format before upload
  async validateQuestions(questions) {
    return this.makeRequest("/validate-questions", {
      method: "POST",
      body: JSON.stringify({ questions }),
    });
  }

  // Game statistics APIs
  async getGameStats() {
    return this.makeRequest("/stats");
  }

  async getPlayerStats(playerId) {
    return this.makeRequest(`/stats/player/${playerId}`);
  }

  // Track game completion for analytics
  async trackGameCompletion(gameData) {
    try {
      return await this.makeRequest("/game/complete", {
        method: "POST",
        body: JSON.stringify(gameData),
      });
    } catch (error) {
      console.error("Error tracking Quiz Showdown game completion:", error);
      // Don't throw error to avoid disrupting game flow
      return { success: false, error: error.message };
    }
  }

  // Admin APIs
  async getActiveGames() {
    return this.makeRequest("/admin/games");
  }

  async getGameHistory() {
    return this.makeRequest("/admin/history");
  }
}

export default new QuizShowdownApiService();
