import { Slot, usePathname, useRouter, useSegments } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/store/authStore";
import { PaperProvider } from "react-native-paper";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { NotificationProvider } from "../contexts/NotificationContext";

const SESSION_TIMEOUT_MS = 20 * 60 * 1000;

function ThemedPaperProvider({ children }) {
  const { colors, isDarkMode, typography } = useTheme();

  const paperTheme = {
    dark: isDarkMode,
    roundness: 14,
    colors: {
      primary: colors.primary,
      secondary: colors.accent,
      background: colors.background,
      surface: colors.surface,
      surfaceVariant: colors.surfaceMuted,
      onPrimary: "#FFFFFF",
      onSecondary: "#FFFFFF",
      onBackground: colors.text,
      onSurface: colors.text,
      outline: colors.border,
      error: colors.error,
    },
    fonts: {
      bodyLarge: { ...typography.body, fontFamily: typography.familyRegular },
      bodyMedium: { ...typography.body, fontFamily: typography.familyRegular },
      titleLarge: { ...typography.h2, fontFamily: typography.familyBold },
      titleMedium: { ...typography.h3, fontFamily: typography.familyBold },
      labelLarge: { fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },
    },
  };

  return <PaperProvider theme={paperTheme}>{children}</PaperProvider>;
}

function AppContent() {
  const [mounted, setMounted] = useState(false);
  // Ensure we don't redirect until auth state is hydrated from storage
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { checkAuth, logout, user, token } = useAuthStore();
  const { isDarkMode } = useTheme();
  const activityTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const appStateRef = useRef(AppState.currentState);
  const loggingOutRef = useRef(false);

  const clearActivityTimer = useCallback(() => {
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
      activityTimeoutRef.current = null;
    }
  }, []);

  const triggerLogout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    try {
      await logout();
    } finally {
      loggingOutRef.current = false;
    }
  }, [logout]);

  const scheduleLogout = useCallback(() => {
    clearActivityTimer();

    if (!user || !token) return;

    activityTimeoutRef.current = setTimeout(() => {
      triggerLogout();
    }, SESSION_TIMEOUT_MS);
  }, [clearActivityTimer, token, triggerLogout, user]);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (user && token) {
      scheduleLogout();
    }
  }, [scheduleLogout, token, user]);

  useEffect(() => {
    let isActive = true;
    (async () => {
      // Hydrate auth from AsyncStorage before enabling any redirect logic
      await checkAuth();
      if (!isActive) return;
      setAuthReady(true);
      setMounted(true);
    })();
    return () => {
      isActive = false;
    };
  }, [checkAuth]);

  useEffect(() => {
    clearActivityTimer();

    if (user && token) {
      markActivity();
    }

    return clearActivityTimer;
  }, [clearActivityTimer, markActivity, token, user]);

  useEffect(() => {
    if (!mounted || !authReady || !user || !token) return;

    if (Platform.OS === "web") {
      const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
      const handleWebActivity = () => markActivity();

      activityEvents.forEach((eventName) => {
        window.addEventListener(eventName, handleWebActivity, { passive: true });
      });

      return () => {
        activityEvents.forEach((eventName) => {
          window.removeEventListener(eventName, handleWebActivity);
        });
      };
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === "active") {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= SESSION_TIMEOUT_MS) {
          triggerLogout();
        } else if (previousState !== "active") {
          markActivity();
        }
      }
    });

    return () => subscription.remove();
  }, [authReady, markActivity, mounted, token, triggerLogout, user]);

  useEffect(() => {
    // Don't run redirect logic until the component is mounted AND auth is ready
    if (!mounted || !authReady) return;

    const inAuthScreen = segments[0] === "(auth)";
    const isSignedIn = user && token;

    if (!isSignedIn && !inAuthScreen) {
      router.replace("/(auth)");
    } else if (isSignedIn && inAuthScreen) {
      // Check if user is admin and redirect accordingly
      if (user?.privilege === "admin") {
        router.replace("/(tabs)/dashboard");
      } else {
        router.replace("/(tabs)");
      }
    }
  }, [user, token, segments, mounted, authReady, router]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    // Keep a stable branded title regardless of nested route path.
    document.title = "cyberlearn";
    const syncTitleId = setTimeout(() => {
      document.title = "cyberlearn";
    }, 0);

    return () => clearTimeout(syncTitleId);
  }, [pathname]);

  return (
    <>
      <View
        style={{ flex: 1 }}
        onTouchStart={Platform.OS === "web" ? undefined : markActivity}
      >
        <Slot />
      </View>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedPaperProvider>
          <NotificationProvider>
            <SettingsProvider>
              <AppContent />
            </SettingsProvider>
          </NotificationProvider>
        </ThemedPaperProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
