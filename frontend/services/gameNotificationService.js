import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

/**
 * Enhanced notification service for game completion notifications
 * Combines in-app notifications with push notifications for Android mobile
 */

// Configure notification handler for Android
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const GameNotificationService = {
  /**
   * Send both in-app and push notifications for game completion
   * @param {string} gameType - Type of game ('quickplay', 'knowledge-relay', 'quiz-showdown', 'digital-defenders')
   * @param {Object} gameData - Game completion data (score, winner, etc.)
   * @param {Function} showInAppNotification - Function from NotificationContext to show in-app notification
   * @param {Object} settings - User settings from SettingsContext
   */
  async sendGameCompletionNotification(
    gameType,
    gameData = {},
    showInAppNotification,
    settings
  ) {
    if (!settings?.notifications) {
      console.log("Notifications disabled in settings");
      return;
    }

    const notificationData = this.getNotificationContent(gameType, gameData);

    try {
      // Always show in-app notification
      if (showInAppNotification) {
        showInAppNotification({
          title: notificationData.title,
          body: notificationData.body,
          type: notificationData.type,
          duration: 4000,
        });
      }

      // For Android mobile, also send push notification
      if (Platform.OS === "android") {
        await this.schedulePushNotification(
          notificationData.title,
          notificationData.body,
          {
            gameType,
            completedAt: new Date().toISOString(),
            ...gameData,
          }
        );
      }

      console.log("Game completion notification sent:", {
        gameType,
        title: notificationData.title,
        platform: Platform.OS,
      });
    } catch (error) {
      console.error("Error sending game completion notification:", error);
    }
  },

  /**
   * Schedule a push notification for Android
   */
  async schedulePushNotification(title, body, data = {}) {
    if (Platform.OS !== "android") {
      return;
    }

    try {
      // Ensure notification channel exists for Android
      await Notifications.setNotificationChannelAsync("game-completion", {
        name: "Game Completion",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        sound: "default",
        description: "Notifications for when games are completed",
      });

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: "default",
          priority: Notifications.AndroidImportance.HIGH,
        },
        trigger: {
          seconds: 1, // Send immediately
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
  },

  /**
   * Get notification content based on game type and data
   */
  getNotificationContent(gameType, gameData) {
    switch (gameType) {
      case "quickplay":
        return {
          title: "🎮 Quick Play Complete!",
          body: gameData.score
            ? `Game finished! You scored ${gameData.score} points.`
            : "Quick Play game completed successfully!",
          type: "quickplay",
        };

      case "knowledge-relay":
        return {
          title: "🏃‍♂️ Knowledge Relay Finished!",
          body: gameData.winner
            ? `Knowledge Relay completed! Winner: ${gameData.winner}`
            : "Knowledge Relay race has finished. Check the results!",
          type: "knowledge-relay",
        };

      case "quiz-showdown":
        return {
          title: "⚡ Quiz Showdown Complete!",
          body: gameData.winner
            ? `Quiz Showdown finished! Winner: ${gameData.winner}`
            : "Quiz Showdown completed. Check the final results!",
          type: "quiz-showdown",
        };

      case "digital-defenders":
        return {
          title: "🛡️ Digital Defenders Complete!",
          body: gameData.victory
            ? "Victory! You successfully defended against all attacks!"
            : "Digital Defenders game completed. Check your defense results!",
          type: gameData.victory ? "victory" : "digital-defenders",
        };

      default:
        return {
          title: "🎯 Game Complete!",
          body: "Your game has finished successfully!",
          type: "default",
        };
    }
  },

  /**
   * Request notification permissions (mainly for iOS, Android usually auto-grants)
   */
  async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Error requesting notification permissions:", error);
      return false;
    }
  },

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log("All scheduled notifications cancelled");
    } catch (error) {
      console.error("Error cancelling notifications:", error);
    }
  },
};

export default GameNotificationService;
