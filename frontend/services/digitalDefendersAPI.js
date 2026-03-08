import { API_URL } from "@/constants/api";

class DigitalDefendersAPI {
  constructor() {
    this.baseURL = `${API_URL}/digital-defenders`;
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
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Question management
  async getQuestions(sectionId) {
    // If no sectionId provided, use global questions
    const endpoint = sectionId
      ? `/questions/${sectionId}`
      : `/questions/global`;
    console.log(
      `🎮 Digital Defenders API: Fetching questions from ${endpoint}`
    );
    return this.makeRequest(endpoint);
  }

  async createQuestion(sectionId, questionData) {
    // Use global endpoint if no sectionId provided
    const endpoint = sectionId
      ? `/questions/${sectionId}`
      : `/questions/global`;

    console.log(`🎮 Digital Defenders API: Creating question via ${endpoint}`);

    return this.makeRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(questionData),
    });
  }

  async updateQuestion(questionId, questionData) {
    return this.makeRequest(`/questions/${questionId}`, {
      method: "PUT",
      body: JSON.stringify(questionData),
    });
  }

  async deleteQuestion(questionId) {
    return this.makeRequest(`/questions/${questionId}`, {
      method: "DELETE",
    });
  }

  // Answer card management
  async getAnswers(sectionId) {
    // If no sectionId provided, use global answers
    const endpoint = sectionId ? `/answers/${sectionId}` : `/answers/global`;
    console.log(`🎮 Digital Defenders API: Fetching answers from ${endpoint}`);
    return this.makeRequest(endpoint);
  }

  async createAnswer(sectionId, answerData) {
    // Use global endpoint if no sectionId provided
    const endpoint = sectionId ? `/answers/${sectionId}` : `/answers/global`;

    console.log(`🎮 Digital Defenders API: Creating answer via ${endpoint}`);

    return this.makeRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(answerData),
    });
  }

  async updateAnswer(answerId, answerData) {
    return this.makeRequest(`/answers/${answerId}`, {
      method: "PUT",
      body: JSON.stringify(answerData),
    });
  }

  async deleteAnswer(answerId) {
    return this.makeRequest(`/answers/${answerId}`, {
      method: "DELETE",
    });
  }

  // Tool cards (read-only)
  async getToolCards() {
    return this.makeRequest("/tool-cards");
  }

  // Statistics
  async getStats(sectionId) {
    return this.makeRequest(`/stats/${sectionId}`);
  }

  async updateStats(sectionId, statsData) {
    return this.makeRequest(`/stats/${sectionId}/update`, {
      method: "POST",
      body: JSON.stringify(statsData),
    });
  }

  // Leaderboard
  async getLeaderboard(sectionId, sortBy = "gamesWon") {
    return this.makeRequest(`/leaderboard/${sectionId}?sortBy=${sortBy}`);
  }

  // Helper method to get user's section
  async getUserSection() {
    try {
      const AsyncStorage = await import(
        "@react-native-async-storage/async-storage"
      );
      const userStr = await AsyncStorage.default.getItem("user");
      if (!userStr) return null;

      const user = JSON.parse(userStr);
      return user.section;
    } catch (error) {
      console.error("Error getting user section:", error);
      return null;
    }
  }

  // Get sections for instructor/admin
  async getSections() {
    const sectionsAPI = API_URL.replace("/digital-defenders", "/sections");
    const token = await this.getAuthToken();

    const response = await fetch(sectionsAPI, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch sections");
    }

    return response.json();
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
}

export default new DigitalDefendersAPI();
