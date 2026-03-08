import React, { createContext, useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

const { width } = Dimensions.get("window");

// Individual notification component
const NotificationItem = ({ notification, onHide }) => {
  const slideAnim = new Animated.Value(-width);
  const opacityAnim = new Animated.Value(0);

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after duration
    const timer = setTimeout(() => {
      hideNotification();
    }, notification.duration || 4000);

    return () => clearTimeout(timer);
  }, []);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide(notification.id);
    });
  };

  const getIcon = () => {
    switch (notification.type) {
      case "quickplay":
        return "gamepad-variant";
      case "knowledge-relay":
        return "flag-checkered";
      case "quiz-showdown":
        return "lightning-bolt";
      case "digital-defenders":
        return "shield-check";
      case "victory":
        return "trophy";
      default:
        return "check-circle";
    }
  };

  const getColor = () => {
    switch (notification.type) {
      case "quickplay":
        return "#4CAF50";
      case "knowledge-relay":
        return "#FF9800";
      case "quiz-showdown":
        return "#2196F3";
      case "digital-defenders":
        return "#9C27B0";
      case "victory":
        return "#FFD700";
      default:
        return "#4CAF50";
    }
  };

  return (
    <Animated.View
      style={[
        styles.notificationContainer,
        {
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim,
          borderLeftColor: getColor(),
        },
      ]}
    >
      <View style={styles.notificationContent}>
        <MaterialCommunityIcons
          name={getIcon()}
          size={24}
          color={getColor()}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{notification.title}</Text>
          <Text style={styles.body}>{notification.body}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = ({
    title,
    body,
    type = "default",
    duration = 4000,
  }) => {
    const id = Date.now().toString();
    const notification = { id, title, body, type, duration };

    setNotifications((prev) => [...prev, notification]);

    // Trigger haptic feedback if available
    if (Platform.OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const hideNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const value = {
    showNotification,
    hideNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <View style={styles.notificationOverlay} pointerEvents="none">
        <SafeAreaView style={styles.safeArea}>
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onHide={hideNotification}
            />
          ))}
        </SafeAreaView>
      </View>
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  notificationOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  safeArea: {
    flex: 1,
  },
  notificationContainer: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: "#666",
    lineHeight: 18,
  },
});
