import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";
import { useAuthStore } from "../store/authStore";
import { API_URL } from "../constants/api";

export default function CyberLearnHistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, token } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/users/cyberlearn-history`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch history (${response.status})`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch history");
      }

      setHistory(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error("Error fetching cyberlearn history:", err);
      setError(err.message || "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatCount = (value) =>
    typeof value === "number" ? value : "N/A";

  if (user?.privilege !== "student") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="lock" size={56} color={colors.textSecondary} />
          <Text style={[styles.messageText, { color: colors.textSecondary }]}>This page is for students only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>CyberLearn History</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.messageText, { color: colors.textSecondary }]}>Loading history...</Text>
          </View>
        )}

        {!isLoading && error && (
          <View style={styles.centered}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#F44336" />
            <Text style={[styles.errorText]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={fetchHistory}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !error && history.length === 0 && (
          <View style={styles.centered}>
            <MaterialCommunityIcons
              name="history"
              size={48}
              color={colors.textSecondary}
            />
            <Text style={[styles.messageText, { color: colors.textSecondary }]}>No CyberLearn history yet.</Text>
          </View>
        )}

        {!isLoading && !error && history.length > 0 &&
          history.map((item) => (
            <View
              key={item.id}
              style={[
                styles.historyItem,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.historyTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.historyDetail, { color: colors.textSecondary }]}>Subject: {item.subjectName || "N/A"}</Text>
              <Text style={[styles.historyDetail, { color: colors.textSecondary }]}>Level: {item.level ?? "N/A"} • Attempt: {item.attemptNumber ?? "N/A"}</Text>
              <Text style={[styles.historyDetail, { color: colors.textSecondary }]}>Score: {typeof item.score === "number" ? `${item.score}%` : "N/A"}</Text>
              <Text style={[styles.historyDetail, { color: colors.textSecondary }]}>Correct: {formatCount(item.correctAnswers)} • Incorrect: {formatCount(item.incorrectAnswers)}{typeof item.totalQuestions === "number" ? ` • Total: ${item.totalQuestions}` : ""}</Text>
              <Text style={[styles.historyDetail, { color: colors.textSecondary }]}>Difficulty: {item.difficulty || "medium"}</Text>
              <Text style={[styles.historyDetail, { color: colors.textSecondary }]}>Finished: {item.completedAt ? new Date(item.completedAt).toLocaleString() : "N/A"}</Text>
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 38,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  messageText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: "center",
  },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    color: "#F44336",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 14,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  historyItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  historyDetail: {
    fontSize: 13,
    marginTop: 2,
  },
});

