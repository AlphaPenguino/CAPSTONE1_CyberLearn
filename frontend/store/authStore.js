import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";
export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: false,

  register: async (username, fullName, email, password, confirmPassword) => {
    set({ isLoading: true });

    if (password !== confirmPassword) {
      set({ isLoading: false });
      return {
        success: false,
        error: "Passwords do not match",
      };
    } else {
      try {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, fullName, email, password }),
        });

        // Check if response is JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error(
            "Server returned non-JSON response. Please check API endpoint."
          );
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Registration failed");
        }

        await AsyncStorage.setItem("user", JSON.stringify(data.user));
        await AsyncStorage.setItem("token", data.token);

        set({ token: data.token, user: data.user, isLoading: false });
        return { success: true, user: data.user };
      } catch (error) {
        set({ isLoading: false });
        return {
          success: false,
          error: error.message || "An error occurred during registration",
        };
      }
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "Server returned non-JSON response. Please check API endpoint."
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      await AsyncStorage.setItem("token", data.token);

      set({ user: data.user, token: data.token, isLoading: false });
      return { success: true, user: data.user };
    } catch (error) {
      set({ isLoading: false });
      return {
        success: false,
        error: error.message || "An error occurred during login",
      };
    }
  },

  changePassword: async ({ email, oldPassword, newPassword }) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, oldPassword, newPassword }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response.");
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to change password");
      }

      set({ isLoading: false });
      return { success: true, message: data.message };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: error.message };
    }
  },

  checkAuth: async () => {
    try {
      const userJson = await AsyncStorage.getItem("user");
      const token = await AsyncStorage.getItem("token");
      const user = userJson ? JSON.parse(userJson) : null;

      // Normalize any stored localhost profile image URL to current API host (mobile fix)
      if (
        user?.profileImage &&
        /^https?:\/\/localhost:3000\//.test(user.profileImage)
      ) {
        try {
          const base = API_URL.replace("/api", "");
          user.profileImage = user.profileImage.replace(
            /https?:\/\/localhost:3000/,
            base
          );
        } catch {}
      }

      set({ user, token });
    } catch (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
  },

  logout: async () => {
    try {
      // Get current token before clearing it
      const token = await AsyncStorage.getItem("token");

      // Call backend logout endpoint if we have a token
      if (token) {
        try {
          await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (error) {
          console.error("Error calling logout endpoint:", error);
          // Continue with local logout even if backend call fails
        }
      }
    } catch (error) {
      console.error("Error getting token for logout:", error);
    }

    // Clear local storage
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("token");
    set({ user: null, token: null });
  },

  updateUser: async (updatedUser) => {
    try {
      console.log("🔄 Updating user in auth store:");
      console.log("   📧 Email:", updatedUser.email);
      console.log("   👤 Username:", updatedUser.username);
      console.log("   🖼️  Profile Image:", updatedUser.profileImage);
      console.log("   📱 Platform:", require("react-native").Platform.OS);

      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      set({ user: updatedUser });
    } catch (error) {
      console.error("Error updating user:", error);
    }
  },

  sayHello: () => {
    console.log("uses authStore.js");
  },
}));
