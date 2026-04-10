import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import COLORS from "../constants/custom-colors";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem("userSettings");
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setIsDarkMode(settings.darkMode ?? false);
      }
    } catch (error) {
      console.error("Error loading theme preference:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);

      // Save to storage
      const savedSettings = await AsyncStorage.getItem("userSettings");
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      settings.darkMode = newMode;
      await AsyncStorage.setItem("userSettings", JSON.stringify(settings));
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  const theme = {
    isDarkMode,
    colors: isDarkMode ? darkColors : lightColors,
    typography,
    toggleTheme,
    isLoading,
  };

  if (isLoading) {
    return null; // or a loading component
  }

  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      {children}
    </ThemeContext.Provider>
  );
};

const lightColors = {
  background: "#F1F5F9",
  surface: "#FFFFFF",
  surfaceMuted: "#E2E8F0",
  primary: COLORS.primary,
  secondary: COLORS.accent,
  accent: COLORS.accent,
  text: COLORS.textDark,
  textSecondary: "#334155",
  textMuted: "#64748B",
  border: "#CBD5E1",
  card: "#FFFFFF",
  notification: "#EF4444",
  success: COLORS.success,
  warning: COLORS.warning,
  error: COLORS.error,
  tabBar: "#FFFFFF",
  tabBarBorder: "#E2E8F0",
  overlay: "rgba(15, 23, 42, 0.55)",
};

const darkColors = {
  background: "#020617",
  surface: "#0F172A",
  surfaceMuted: "#1E293B",
  primary: COLORS.primary,
  secondary: COLORS.accent,
  accent: COLORS.accent,
  text: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  border: "#334155",
  card: "#0B1220",
  notification: "#F87171",
  success: COLORS.success,
  warning: COLORS.warning,
  error: COLORS.error,
  tabBar: "#0B1220",
  tabBarBorder: "#1E293B",
  overlay: "rgba(2, 6, 23, 0.7)",
};

const typography = {
  familyRegular: "System",
  familyMedium: "System",
  familyBold: "System",
  h1: { fontSize: 30, fontWeight: "800", letterSpacing: 0.2 },
  h2: { fontSize: 24, fontWeight: "700", letterSpacing: 0.2 },
  h3: { fontSize: 20, fontWeight: "700", letterSpacing: 0.1 },
  body: { fontSize: 15, fontWeight: "500", lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: "500", lineHeight: 18 },
};
