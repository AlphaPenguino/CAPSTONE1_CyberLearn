import { Slot, useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/store/authStore";
import { PaperProvider } from "react-native-paper";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { NotificationProvider } from "../contexts/NotificationContext";

function AppContent() {
  const [mounted, setMounted] = useState(false);
  // Ensure we don't redirect until auth state is hydrated from storage
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { checkAuth, user, token } = useAuthStore();
  const { isDarkMode } = useTheme();

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

  return (
    <>
      <Slot />
      <StatusBar style={isDarkMode ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <ThemeProvider>
          <NotificationProvider>
            <SettingsProvider>
              <AppContent />
            </SettingsProvider>
          </NotificationProvider>
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
