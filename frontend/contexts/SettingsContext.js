import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Vibration } from "react-native";
import { useNotifications } from "./NotificationContext";
import { GameNotificationService } from "@/services/gameNotificationService";

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const { showNotification } = useNotifications();
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    soundEffects: true,
    hapticFeedback: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    // Request notification permissions on app start for Android
    if (Platform.OS === "android") {
      GameNotificationService.requestPermissions();
    }
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem("userSettings");
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await AsyncStorage.setItem(
        "userSettings",
        JSON.stringify(updatedSettings)
      );
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const playSound = async (soundName) => {
    if (!settings.soundEffects) return;

    try {
      // Simple console log for now - you can integrate proper sound library later
      console.log(`Playing sound: ${soundName}`);

      // For now, we'll use a simple vibration as audio feedback
      if (Platform.OS !== "web" && settings.hapticFeedback) {
        Vibration.vibrate(50);
      }
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  const triggerHaptic = (type = "light") => {
    if (!settings.hapticFeedback) return;

    try {
      if (Platform.OS !== "web") {
        switch (type) {
          case "light":
            Vibration.vibrate(50);
            break;
          case "medium":
            Vibration.vibrate(100);
            break;
          case "heavy":
            Vibration.vibrate(200);
            break;
          case "success":
            Vibration.vibrate([100, 50, 100]);
            break;
          case "warning":
            Vibration.vibrate([50, 100, 50]);
            break;
          case "error":
            Vibration.vibrate([200, 100, 200]);
            break;
          default:
            Vibration.vibrate(50);
        }
      }
    } catch (error) {
      console.error("Error triggering haptic feedback:", error);
    }
  };

  const requestNotificationPermissions = async () => {
    // For in-app notifications, no system permissions needed
    return true;
  };

  const scheduleNotification = async (
    title,
    body,
    data = {},
    trigger = null
  ) => {
    if (!settings.notifications) return;

    try {
      // Determine notification type based on game data
      let type = "default";
      if (data.gameType) {
        switch (data.gameType) {
          case "quickplay":
            type = "quickplay";
            break;
          case "knowledge-relay":
            type = "knowledge-relay";
            break;
          case "quiz-showdown":
            type = "quiz-showdown";
            break;
          case "digital-defenders":
            type = data.victory ? "victory" : "digital-defenders";
            break;
        }
      }

      // Show in-app notification
      showNotification({
        title,
        body,
        type,
        duration: 4000,
      });

      console.log("In-app notification shown:", { title, body, data });
      return "notification-shown";
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  };
  const toggleNotifications = async (enabled) => {
    if (enabled) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        return false;
      }
    }

    await saveSettings({ notifications: enabled });
    return true;
  };

  const value = {
    settings,
    isLoading,
    saveSettings,
    playSound,
    triggerHaptic,
    scheduleNotification,
    toggleNotifications,
    requestNotificationPermissions,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
