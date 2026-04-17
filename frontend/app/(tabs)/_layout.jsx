import {
  Platform,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { Tabs, useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import CustomDrawer from "../../components/drawer/drawer";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationLockProvider, useNavigationLock } from "../../contexts/NavigationLockContext";

export default function TabLayout() {
  return (
    <NavigationLockProvider>
      <TabLayoutContent />
    </NavigationLockProvider>
  );
}

function TabLayoutContent() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const { user, checkAuth } = useAuthStore();
  const { colors } = useTheme();
  const isInstructor = user?.privilege === "instructor";
  const isAdmin = user?.privilege === "admin";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { isNavigationLocked } = useNavigationLock();
  const lastNonCreateRef = useRef(null); // stores last path before entering /create
  const isGameplayNavigationLocked =
    isNavigationLocked &&
    (pathname?.includes("quick-play") ||
      pathname?.includes("knowledge-relay") ||
      pathname?.includes("digital-defenders"));
  const lockedTabItemStyle = isGameplayNavigationLocked
    ? {
        opacity: 0.45,
        backgroundColor: "rgba(148, 163, 184, 0.24)",
      }
    : undefined;
  const preventLockedTabPress = (event) => {
    if (isGameplayNavigationLocked) {
      event.preventDefault();
    }
  };

  // Track the last route that is NOT the creator and is allowed for the user
  useEffect(() => {
    if (!pathname) return;
    // Ignore create route itself
    if (pathname.startsWith("/create")) return;
    // If instructor (not admin) ignore admin dashboard so we don't bounce into access denied
    if (!isAdmin && pathname.startsWith("/dashboard")) return;
    lastNonCreateRef.current = pathname;
  }, [pathname, isAdmin]);

  const handleCreatorBack = () => {
    // Prefer stored last non-create route
    const target = lastNonCreateRef.current;
    if (target) {
      // Safety: prevent instructors from being sent to admin dashboard
      if (!isAdmin && target.startsWith("/dashboard")) {
        router.replace("/instructor");
        return;
      }
      router.replace(target);
      return;
    }
    // Fallback hierarchy
    if (isInstructor && !isAdmin) {
      router.replace("/instructor");
      return;
    }
    if (router?.canGoBack?.()) {
      try {
        router.back();
        return;
      } catch {}
    }
    router.replace(isAdmin ? "/dashboard" : "/index");
  };

  useEffect(() => {
    (async () => {
      await checkAuth();
      setAuthReady(true);
    })();
    console.log("Is Admin:", isAdmin);
    console.log("Platform:", Platform.OS);
  }, [checkAuth, isAdmin]);

  if (!authReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      {Platform.OS !== "web" && (
        <CustomDrawer
          visible={drawerVisible}
          onDismiss={() => setDrawerVisible(false)}
        />
      )}
      <Tabs
        initialRouteName={isAdmin ? "dashboard" : "index"}
        screenOptions={{
          headerShown: Platform.OS !== "web",
          headerTitle: "",
          tabBarPosition: Platform.OS === "web" ? "top" : "bottom",
          tabBarStyle: {
              backgroundColor: "#0e5f55",
              borderTopWidth: 0,
              borderBottomWidth: 0,
              borderColor: "transparent",
              elevation: 6,
              shadowOpacity: 0.08,
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: -2 },
              shadowRadius: 10,
            height:
              Platform.OS === "web"
                ? 56
                : Platform.OS === "android"
                ? 65 + (insets.bottom > 0 ? insets.bottom : 12)
                : 80,
            paddingTop: Platform.OS === "web" ? 0 : 8,
            paddingBottom:
              Platform.OS === "web"
                ? 0
                : Platform.OS === "android"
                ? insets.bottom > 0
                  ? insets.bottom
                  : 12
                : 30,
            position: "relative",
            top: Platform.OS === "web" ? 0 : undefined,
            bottom: Platform.OS === "web" ? undefined : 0,
            left: 0,
            right: 0,
            safeAreaInsets: { bottom: 0 },
          },
          tabBarLabelStyle: {
            paddingBottom: Platform.OS === "android" ? 4 : 0,
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 0.2,
          },
          tabBarActiveTintColor: "#ECFDF5",
          tabBarInactiveTintColor: "#BFE7DA",
          tabBarActiveBackgroundColor: "rgba(255, 255, 255, 0.16)",
          tabBarItemStyle: {
            borderRadius: 12,
            marginVertical: Platform.OS === "web" ? 8 : 6,
            marginHorizontal: 4,
          },
          headerStyle: {
            height: Platform.OS === "android" ? 50 : 56,
            backgroundColor: colors.surface,
            elevation: 2,
            shadowOpacity: 0.08,
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 4,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerTitleStyle: {
            color: colors.text,
            fontWeight: "700",
            letterSpacing: 0.2,
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Admin Tools",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "analytics" : "analytics-outline"}
                size={size}
                color={isGameplayNavigationLocked ? "#9CA3AF" : color}
              />
            ),
            href: isAdmin ? undefined : null,
            // Remove blank header space on web
            headerShown: Platform.OS !== "web" && isAdmin,
            tabBarItemStyle: lockedTabItemStyle,
          }}
          listeners={{ tabPress: preventLockedTabPress }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={size}
                color={isGameplayNavigationLocked ? "#9CA3AF" : color}
              />
            ),
            // Hide header on web to eliminate top gap
            headerShown: Platform.OS !== "web",
            tabBarItemStyle: lockedTabItemStyle,
          }}
          listeners={{ tabPress: preventLockedTabPress }}
        />

        <Tabs.Screen
          name="game"
          options={{
            title: "Arcade",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "game-controller" : "game-controller-outline"}
                size={size}
                color={isGameplayNavigationLocked ? "#9CA3AF" : color}
              />
            ),
            headerShown: Platform.OS !== "web",
            tabBarItemStyle: lockedTabItemStyle,
          }}
          listeners={{ tabPress: preventLockedTabPress }}
        />

        {/** Hidden create route: still accessible via instructor dashboard (tools > content creator) but removed from tab bar */}
        <Tabs.Screen
          name="create"
          options={{
            href: null, // hide from tab navigation
            title: "Creator's Workshop",
            // Android uses the in-screen Creator header/back button.
            // Keep native header off there to avoid duplicate blue back controls.
            headerShown: Platform.OS !== "web" && Platform.OS !== "android",
            headerLeft: () => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={handleCreatorBack}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  position: "absolute",
                  left: 0,
                }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
            ),
            headerTitleStyle: { fontSize: 16, fontWeight: "600" },
          }}
        />

        <Tabs.Screen
          name="instructor"
          options={{
            title: "Instructor Dashboard",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "school" : "school-outline"}
                size={size}
                color={isGameplayNavigationLocked ? "#9CA3AF" : color}
              />
            ),
            href: isInstructor || isAdmin ? undefined : null,
            headerShown: Platform.OS !== "web" && (isInstructor || isAdmin),
            tabBarItemStyle: lockedTabItemStyle,
          }}
          listeners={{ tabPress: preventLockedTabPress }}
        />

        <Tabs.Screen
          name="users"
          options={{
            title: "Manage Users",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={size}
                color={color}
              />
            ),
            // Hide from nav (accessible via dashboard links)
            href: null,
            headerShown: Platform.OS !== "web" && isAdmin,
          }}
        />

        <Tabs.Screen
          name="logs"
          options={{
            title: "Audit Logs",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "document-text" : "document-text-outline"}
                size={size}
                color={color}
              />
            ),
            // Hide from nav (accessible via dashboard links)
            href: null,
            headerShown: Platform.OS !== "web" && isAdmin,
          }}
        />

        <Tabs.Screen
          name="leaderboards"
          options={{
            title: "Leaderboards",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "trophy" : "trophy-outline"}
                size={size}
                color={color}
              />
            ),
            // Hide from nav (accessible via arcade page) but ensure no access restrictions
            href: null,
            headerShown: false, // Changed to false to remove any potential header restrictions
          }}
        />

        <Tabs.Screen
          name="quick-play"
          options={{
            href: null,
            title: "Quick Play",
            headerShown: Platform.OS !== "web",
          }}
        />

        <Tabs.Screen
          name="knowledge-relay"
          options={{
            href: null,
            title: "Knowledge Relay",
            headerShown: Platform.OS !== "web",
          }}
        />

        <Tabs.Screen
          name="quiz-showdown"
          options={{
            href: null,
            title: "Quiz Showdown",
            headerShown: Platform.OS !== "web",
          }}
        />

        <Tabs.Screen
          name="digital-defenders"
          options={{
            href: null,
            title: "Digital Defenders",
            headerShown: Platform.OS !== "web",
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "settings" : "settings-outline"}
                size={size}
                color={isGameplayNavigationLocked ? "#9CA3AF" : color}
              />
            ),
            headerShown: Platform.OS !== "web",
            tabBarItemStyle: lockedTabItemStyle,
          }}
          listeners={{ tabPress: preventLockedTabPress }}
        />
      </Tabs>
    </>
  );
}
