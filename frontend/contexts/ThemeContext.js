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
  background: "#ffffff",
  surface: "#f8f9fa",
  primary: COLORS.primary,
  secondary: COLORS.accent,
  accent: COLORS.coral,
  text: COLORS.textDark,
  // Darkened for better contrast (WCAG AA against white ~ 4.9:1)
  textSecondary: "#4a5568",
  border: "#d8dfe3",
  card: "#ffffff",
  notification: "#ff6b6b",
  success: COLORS.success,
  warning: COLORS.warning,
  error: COLORS.error,
};

const darkColors = {
  background: COLORS.background,
  surface: COLORS.cardBackground,
  primary: COLORS.primary,
  secondary: COLORS.accent,
  accent: COLORS.coral,
  text: COLORS.textPrimary,
  textSecondary: COLORS.textSecondary,
  border: "rgba(255, 215, 0, 0.2)",
  card: COLORS.cardBackground,
  notification: "#ff6b6b",
  success: COLORS.success,
  warning: COLORS.warning,
  error: COLORS.error,
};
