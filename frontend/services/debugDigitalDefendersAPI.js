import { API_URL } from "@/constants/api";

class DebugDigitalDefendersAPI {
  constructor() {
    this.baseURL = `${API_URL}/digital-defenders`;
    console.log(
      "🎮 Debug Digital Defenders API initialized with baseURL:",
      this.baseURL
    );
  }

  // Helper method to get auth token
  async getAuthToken() {
    try {
      const AsyncStorage = await import(
        "@react-native-async-storage/async-storage"
      );
      const token = await AsyncStorage.default.getItem("token");
      console.log(
        "🔑 Auth token retrieved:",
        token ? `${token.substring(0, 50)}...` : "NO TOKEN"
      );
      return token;
    } catch (error) {
      console.error("❌ Error getting auth token:", error);
      return null;
    }
  }

  // Helper method to get user info
  async getUserInfo() {
    try {
      const AsyncStorage = await import(
        "@react-native-async-storage/async-storage"
      );
      const userStr = await AsyncStorage.default.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      console.log("👤 User info retrieved:", user);
      return user;
    } catch (error) {
      console.error("❌ Error getting user info:", error);
      return null;
    }
  }

  // Helper method to make authenticated requests
  async makeRequest(endpoint, options = {}) {
    console.log(`🌐 Making request to: ${this.baseURL}${endpoint}`);

    const token = await this.getAuthToken();
    const user = await this.getUserInfo();

    const defaultHeaders = {
      "Content-Type": "application/json",
    };

    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
      console.log("✅ Request will include auth token");
    } else {
      console.log("⚠️ Request will NOT include auth token");
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    console.log("📤 Request config:", config);

    try {
      console.log(`🚀 Fetching: ${this.baseURL}${endpoint}`);
      const response = await fetch(`${this.baseURL}${endpoint}`, config);

      console.log(
        `📥 Response status: ${response.status} ${response.statusText}`
      );
      console.log(
        "📥 Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      const data = await response.json();
      console.log("📥 Response data:", data);

      if (!response.ok) {
        const error = new Error(
          data.message || `HTTP error! status: ${response.status}`
        );
        console.error(`❌ API Error (${endpoint}):`, error);
        throw error;
      }

      console.log(`✅ API Success (${endpoint}):`, data);
      return data;
    } catch (error) {
      console.error(`❌ API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Test all endpoints
  async testAllEndpoints() {
    console.log("🔬 Testing all Digital Defenders API endpoints...");

    const tests = [
      { name: "Tool Cards", method: () => this.makeRequest("/tool-cards") },
      {
        name: "Questions Global",
        method: () => this.makeRequest("/questions/global"),
      },
      {
        name: "Answers Global",
        method: () => this.makeRequest("/answers/global"),
      },
    ];

    const results = {};

    for (const test of tests) {
      try {
        console.log(`🧪 Testing ${test.name}...`);
        const result = await test.method();
        results[test.name] = { success: true, data: result };
        console.log(`✅ ${test.name} test passed`);
      } catch (error) {
        results[test.name] = { success: false, error: error.message };
        console.log(`❌ ${test.name} test failed:`, error.message);
      }
    }

    console.log("🎯 All tests completed:", results);
    return results;
  }

  // Original API methods with debug logging
  async getQuestions(sectionId) {
    const endpoint = sectionId
      ? `/questions/${sectionId}`
      : `/questions/global`;
    console.log(
      `🎮 Digital Defenders API: Fetching questions from ${endpoint}`
    );
    return this.makeRequest(endpoint);
  }

  async getAnswers(sectionId) {
    const endpoint = sectionId ? `/answers/${sectionId}` : `/answers/global`;
    console.log(`🎮 Digital Defenders API: Fetching answers from ${endpoint}`);
    return this.makeRequest(endpoint);
  }

  async getToolCards() {
    console.log("🎮 Digital Defenders API: Fetching tool cards");
    return this.makeRequest("/tool-cards");
  }
}

export default new DebugDigitalDefendersAPI();
