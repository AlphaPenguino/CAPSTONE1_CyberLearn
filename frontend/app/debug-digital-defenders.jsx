import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import debugDigitalDefendersAPI from "@/services/debugDigitalDefendersAPI";

export default function DigitalDefendersDebugScreen() {
  const router = useRouter();
  const { user, token, checkAuth } = useAuthStore();
  const [testResults, setTestResults] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log("🎮 Digital Defenders Debug Screen mounted");
    console.log("👤 Current user:", user);
    console.log("🔑 Current token exists:", !!token);

    // Re-check auth status
    checkAuth();
  }, [user, token, checkAuth]);

  const runAllTests = async () => {
    setIsLoading(true);
    try {
      console.log("🧪 Starting all API tests...");
      const results = await debugDigitalDefendersAPI.testAllEndpoints();
      setTestResults(results);
    } catch (error) {
      console.error("❌ Test suite failed:", error);
      Alert.alert("Error", `Test suite failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testSingleEndpoint = async (name, endpoint) => {
    setIsLoading(true);
    try {
      console.log(`🧪 Testing single endpoint: ${name}`);
      let result;

      switch (endpoint) {
        case "tool-cards":
          result = await debugDigitalDefendersAPI.getToolCards();
          break;
        case "questions":
          result = await debugDigitalDefendersAPI.getQuestions(null);
          break;
        case "answers":
          result = await debugDigitalDefendersAPI.getAnswers(null);
          break;
        default:
          throw new Error(`Unknown endpoint: ${endpoint}`);
      }

      setTestResults((prev) => ({
        ...prev,
        [name]: { success: true, data: result },
      }));

      Alert.alert("Success", `${name} test passed!`);
    } catch (error) {
      console.error(`❌ ${name} test failed:`, error);
      setTestResults((prev) => ({
        ...prev,
        [name]: { success: false, error: error.message },
      }));
      Alert.alert("Error", `${name} test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const forceLogin = async () => {
    try {
      console.log("🔐 Force login attempt...");
      const result = await useAuthStore
        .getState()
        .login("student1@cyberlearn.test", "password123");

      if (result.success) {
        Alert.alert("Success", "Login successful!");
        console.log("✅ Force login successful");
      } else {
        Alert.alert("Error", `Login failed: ${result.error}`);
        console.log("❌ Force login failed:", result.error);
      }
    } catch (error) {
      console.error("❌ Force login error:", error);
      Alert.alert("Error", `Login error: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>🛡️ Digital Defenders Debug</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication Status</Text>
          <Text style={styles.info}>
            User: {user ? user.username : "Not logged in"}
          </Text>
          <Text style={styles.info}>
            Token: {token ? "Present" : "Missing"}
          </Text>
          <Text style={styles.info}>Privilege: {user?.privilege || "N/A"}</Text>

          <TouchableOpacity style={styles.button} onPress={forceLogin}>
            <Text style={styles.buttonText}>Force Login (Test User)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Tests</Text>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={runAllTests}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Testing..." : "Run All Tests"}
            </Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.smallButton, isLoading && styles.buttonDisabled]}
              onPress={() => testSingleEndpoint("Tool Cards", "tool-cards")}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Tool Cards</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallButton, isLoading && styles.buttonDisabled]}
              onPress={() => testSingleEndpoint("Questions", "questions")}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Questions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallButton, isLoading && styles.buttonDisabled]}
              onPress={() => testSingleEndpoint("Answers", "answers")}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Answers</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {Object.keys(testResults).length === 0 ? (
            <Text style={styles.info}>No tests run yet</Text>
          ) : (
            Object.entries(testResults).map(([name, result]) => (
              <View key={name} style={styles.testResult}>
                <Text
                  style={[
                    styles.testName,
                    result.success ? styles.success : styles.error,
                  ]}
                >
                  {name}: {result.success ? "✅ PASS" : "❌ FAIL"}
                </Text>
                {!result.success && (
                  <Text style={styles.errorText}>{result.error}</Text>
                )}
                {result.success && result.data && (
                  <Text style={styles.successText}>
                    Data loaded: {JSON.stringify(result.data).substring(0, 100)}
                    ...
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Back to Game</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  section: {
    backgroundColor: "#16213e",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#00d2ff",
    marginBottom: 10,
  },
  info: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 5,
  },
  button: {
    backgroundColor: "#00d2ff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  smallButton: {
    backgroundColor: "#00d2ff",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#666",
  },
  backButton: {
    backgroundColor: "#666",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  testResult: {
    backgroundColor: "#0f1419",
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
  },
  testName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  success: {
    color: "#4ade80",
  },
  error: {
    color: "#f87171",
  },
  successText: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 5,
  },
  errorText: {
    color: "#f87171",
    fontSize: 12,
    marginTop: 5,
  },
});
