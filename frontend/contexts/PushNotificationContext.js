import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useSettings } from "./SettingsContext";

const PushNotificationContext = createContext();

export const usePushNotifications = () => {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error(
      "usePushNotifications must be used within a PushNotificationProvider"
    );
  }
  return context;
};

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const PushNotificationProvider = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState("");
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();
  const { settings } = useSettings();

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
      }
    });

    // Listen for notifications received while app is open
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
      });

    // Listen for user interactions with notifications
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification response:", response);
        // Handle notification tap - could navigate to specific screens
      });

    return () => {
      Notifications.removeNotificationSubscription(
        notificationListener.current
      );
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("game-completion", {
        name: "Game Completion",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return null;
      }

      try {
        token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log("Expo push token:", token);
      } catch (error) {
        console.error("Error getting push token:", error);
      }
    } else {
      console.log("Must use physical device for Push Notifications");
    }

    return token;
  };

  const schedulePushNotification = async (
    title,
    body,
    data = {},
    seconds = 1
  ) => {
    if (!settings?.notifications) {
      console.log("Notifications disabled in settings");
      return;
    }

    if (Platform.OS !== "android") {
      console.log("Push notifications currently only implemented for Android");
      return;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: "default",
        },
        trigger: {
          seconds,
          channelId: "game-completion",
        },
      });

      console.log("Push notification scheduled:", {
        title,
        body,
        notificationId,
      });
      return notificationId;
    } catch (error) {
      console.error("Error scheduling push notification:", error);
    }
  };

  const cancelNotification = async (notificationId) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log("Notification cancelled:", notificationId);
    } catch (error) {
      console.error("Error cancelling notification:", error);
    }
  };

  const cancelAllNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log("All notifications cancelled");
    } catch (error) {
      console.error("Error cancelling all notifications:", error);
    }
  };

  const sendGameCompletionNotification = async (
    gameType,
    score = null,
    additionalData = {}
  ) => {
    const notificationData = getGameCompletionData(
      gameType,
      score,
      additionalData
    );

    return await schedulePushNotification(
      notificationData.title,
      notificationData.body,
      {
        gameType,
        score,
        completedAt: new Date().toISOString(),
        ...additionalData,
      },
      1 // Schedule for 1 second from now
    );
  };

  const getGameCompletionData = (gameType, score, additionalData) => {
    switch (gameType) {
      case "quickplay":
        return {
          title: "🎮 Quick Play Complete!",
          body: score
            ? `Game finished! You scored ${score} points.`
            : "Quick Play game completed successfully!",
        };

      case "knowledge-relay":
        return {
          title: "🏃‍♂️ Knowledge Relay Finished!",
          body: additionalData.victory
            ? "Congratulations! Your team won the relay race!"
            : "Knowledge Relay completed. Check your team's results!",
        };

      case "quiz-showdown":
        return {
          title: "⚡ Quiz Showdown Complete!",
          body: additionalData.winner
            ? `Quiz Showdown finished! Winner: ${additionalData.winner}`
            : "Quiz Showdown completed. Check the final results!",
        };

      case "digital-defenders":
        return {
          title: "🛡️ Digital Defenders Complete!",
          body: additionalData.victory
            ? "Victory! You successfully defended against all attacks!"
            : "Digital Defenders game completed. Check your defense results!",
        };

      default:
        return {
          title: "🎯 Game Complete!",
          body: "Your game has finished successfully!",
        };
    }
  };

  const value = {
    expoPushToken,
    notification,
    schedulePushNotification,
    cancelNotification,
    cancelAllNotifications,
    sendGameCompletionNotification,
    registerForPushNotificationsAsync,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
};
