import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

class QuickPlayApiService {
  constructor() {
    this.baseUrl = `${API_URL}/quickplay`;
  }

  async getAuthToken() {
    try {
      return await AsyncStorage.getItem("token");
    } catch (error) {
      console.error("QuickPlay getAuthToken error", error);
      return null;
    }
  }

  async fetchQuestions(limit = 10) {
    const token = await this.getAuthToken();
    const url = `${this.baseUrl}/questions?limit=${limit}`;
    try {
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load quick play questions");
      }
      return data;
    } catch (err) {
      console.error("QuickPlay fetchQuestions failed", err);
      throw err;
    }
  }
}

export default new QuickPlayApiService();
