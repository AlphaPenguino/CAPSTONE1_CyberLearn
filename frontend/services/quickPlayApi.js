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

  async getInstructorSlots() {
    const token = await this.getAuthToken();
    try {
      const res = await fetch(`${this.baseUrl}/slots`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load Quick Play slots");
      }
      return data;
    } catch (error) {
      console.error("QuickPlay getInstructorSlots failed", error);
      throw error;
    }
  }

  async saveInstructorSlot(payload) {
    const token = await this.getAuthToken();
    try {
      const res = await fetch(`${this.baseUrl}/slots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save Quick Play slot");
      }
      return data;
    } catch (error) {
      console.error("QuickPlay saveInstructorSlot failed", error);
      throw error;
    }
  }

  async fetchTileSetByCode(quizCode) {
    const token = await this.getAuthToken();
    try {
      const res = await fetch(`${this.baseUrl}/code/${encodeURIComponent(quizCode)}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load Quick Play set");
      }
      return data;
    } catch (error) {
      console.error("QuickPlay fetchTileSetByCode failed", error);
      throw error;
    }
  }
}

export default new QuickPlayApiService();
