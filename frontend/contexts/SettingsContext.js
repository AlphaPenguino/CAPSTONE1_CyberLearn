import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Vibration } from "react-native";
import { AudioContext } from "react-native-audio-api";
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
  const clickAudioContextRef = useRef(null);
  const clickAudioBufferRef = useRef(null);
  const clickAudioLoadPromiseRef = useRef(null);
  const ingameAudioContextRef = useRef(null);
  const ingameAudioBufferRef = useRef(null);
  const ingameAudioLoadPromiseRef = useRef(null);
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

  const loadClickAudioBuffer = useCallback(async () => {
    if (clickAudioBufferRef.current) return clickAudioBufferRef.current;

    if (!clickAudioLoadPromiseRef.current) {
      clickAudioLoadPromiseRef.current = (async () => {
        const audioContext = new AudioContext();
        try {
          const audioBuffer = await audioContext.decodeAudioData(
            require("../assets/sounds/click-sound-effect.wav")
          );
          clickAudioContextRef.current = audioContext;
          clickAudioBufferRef.current = audioBuffer;
          return audioBuffer;
        } catch (error) {
          clickAudioContextRef.current = null;
          clickAudioBufferRef.current = null;
          await audioContext.close().catch(() => {
            // Best effort cleanup when decoding fails.
          });
          throw error;
        }
      })().finally(() => {
        clickAudioLoadPromiseRef.current = null;
      });
    }

    return clickAudioLoadPromiseRef.current;
  }, []);

  const loadIngameAudioBuffer = useCallback(async () => {
    if (ingameAudioBufferRef.current) return ingameAudioBufferRef.current;

    if (!ingameAudioLoadPromiseRef.current) {
      ingameAudioLoadPromiseRef.current = (async () => {
        const audioContext = new AudioContext();
        try {
          const audioBuffer = await audioContext.decodeAudioData(
            require("../assets/sounds/ingame-click-sound-effect.wav")
          );
          ingameAudioContextRef.current = audioContext;
          ingameAudioBufferRef.current = audioBuffer;
          return audioBuffer;
        } catch (error) {
          ingameAudioContextRef.current = null;
          ingameAudioBufferRef.current = null;
          await audioContext.close().catch(() => {
            // Best effort cleanup when decoding fails.
          });
          throw error;
        }
      })().finally(() => {
        ingameAudioLoadPromiseRef.current = null;
      });
    }

    return ingameAudioLoadPromiseRef.current;
  }, []);

  const playSound = useCallback(async (soundName = "click") => {
    if (!settings.soundEffects) return;

    try {
      if (soundName === "ingame") {
        await loadIngameAudioBuffer();
      } else {
        await loadClickAudioBuffer();
      }

      const audioContext =
        soundName === "ingame"
          ? ingameAudioContextRef.current
          : clickAudioContextRef.current;
      const audioBuffer =
        soundName === "ingame"
          ? ingameAudioBufferRef.current
          : clickAudioBufferRef.current;
      if (!audioContext || !audioBuffer) return;

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        source.disconnect();
      };
      source.start(audioContext.currentTime);

      if (Platform.OS !== "web" && settings.hapticFeedback) {
        Vibration.vibrate(20);
      }
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }, [
    loadClickAudioBuffer,
    loadIngameAudioBuffer,
    settings.hapticFeedback,
    settings.soundEffects,
  ]);

  useEffect(() => {
    return () => {
      const clickAudioContext = clickAudioContextRef.current;
      const ingameAudioContext = ingameAudioContextRef.current;
      clickAudioContextRef.current = null;
      clickAudioBufferRef.current = null;
      clickAudioLoadPromiseRef.current = null;
      ingameAudioContextRef.current = null;
      ingameAudioBufferRef.current = null;
      ingameAudioLoadPromiseRef.current = null;
      if (clickAudioContext) {
        clickAudioContext.close().catch(() => {
          // Ignore cleanup errors while unmounting provider.
        });
      }
      if (ingameAudioContext) {
        ingameAudioContext.close().catch(() => {
          // Ignore cleanup errors while unmounting provider.
        });
      }
    };
  }, []);

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
