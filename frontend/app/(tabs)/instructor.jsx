import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { API_URL } from "../../constants/api";

// Get screen width to determine if we're on web with a large screen
const screenWidth = Dimensions.get("window").width;
const isWeb = Platform.OS === "web";
const isLargeScreen = isWeb && screenWidth > 768;

export default function InstructorDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [summary, setSummary] = useState({
    totalStudents: 0,
    averageScore: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuthStore();
  const { colors } = useTheme();
  // Dark blue override for light mode (replacing yellow accents)
  const highlightColor = colors.textPrimary;
  const router = useRouter();

  // Fetch dashboard summary from backend
  const fetchSummary = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/instructor/dashboard/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) setSummary(data.data);
    } catch (e) {
      console.warn("Failed to load instructor summary:", e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Check if user is instructor or admin
  if (user?.privilege !== "instructor" && user?.privilege !== "admin") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.accessDenied}>
          <MaterialCommunityIcons
            name="shield-alert"
            size={64}
            color={colors.error}
          />
          <Text style={[styles.accessDeniedTitle, { color: colors.error }]}>
            Access Denied
          </Text>
          <Text
            style={[styles.accessDeniedText, { color: colors.textSecondary }]}
          >
            This area is restricted to instructors and administrators only.
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const StatCard = ({ title, value, icon, color = highlightColor }) => (
    <View
      style={[
        styles.statCard,
        { borderLeftColor: color, backgroundColor: colors.card },
      ]}
    >
      <View style={styles.statIcon}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statInfo}>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
          {title}
        </Text>
      </View>
    </View>
  );

  const ToolCard = ({
    title,
    description,
    icon,
    onPress,
    color = highlightColor,
  }) => (
    <TouchableOpacity
      style={[styles.toolCard, { backgroundColor: colors.card }]}
      onPress={onPress}
    >
      <View style={[styles.toolIcon, { backgroundColor: `${color}20` }]}>
        <MaterialCommunityIcons name={icon} size={32} color={color} />
      </View>
      <View style={styles.toolInfo}>
        <Text style={[styles.toolTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.toolDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color={colors.textSecondary}
      />
    </TouchableOpacity>
  );

  const renderDashboard = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Welcome Header */}
      <View style={styles.welcomeHeader}>
        <Text style={[styles.welcomeTitle, { color: colors.text }]}>
          Welcome back, {user?.username || "Instructor"}!
        </Text>
        <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
          Ready to guide your students on their cyber learning journey?
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Text style={[styles.sectionTitle, { color: highlightColor }]}>
          📊 Quick Overview
        </Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Students"
            value={summary.totalStudents}
            icon="account-group"
            color={highlightColor}
          />
          <StatCard
            title="Average Score"
            value={`${Math.round(summary.averageScore)}%`}
            icon="chart-line"
            color={colors.warning}
          />
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.activityContainer}>
        <Text style={[styles.sectionTitle, { color: highlightColor }]}>
          🔔 Recent Student Activity
        </Text>
        <View style={styles.activityList}>
          {loading && (
            <Text style={{ opacity: 0.7, marginBottom: 8 }}>Loading...</Text>
          )}
          {!loading && summary.recentActivity.length === 0 && (
            <Text style={{ opacity: 0.7 }}>No recent activity</Text>
          )}
          {summary.recentActivity.map((activity, index) => (
            <View
              key={index}
              style={[styles.activityItem, { backgroundColor: colors.card }]}
            >
              <View style={styles.activityIcon}>
                <MaterialCommunityIcons
                  name="account-circle"
                  size={32}
                  color={highlightColor}
                />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityStudent, { color: colors.text }]}>
                  {activity.studentName}
                </Text>
                <Text
                  style={[
                    styles.activityAction,
                    { color: colors.textSecondary },
                  ]}
                >
                  {activity.email}
                </Text>
                <Text
                  style={[styles.activityTime, { color: colors.textSecondary }]}
                >
                  {activity.lastActiveRelative || ""}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderTools = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.toolsHeader}>
        <Text style={[styles.sectionTitle, { color: highlightColor }]}>
          🛠️ Instructor Tools
        </Text>
        <Text style={[styles.toolsSubtitle, { color: colors.textSecondary }]}>
          Manage your educational content and monitor student progress
        </Text>
      </View>

      <View style={styles.toolsGrid}>
        <ToolCard
          title="Student Analytics"
          description="View detailed analytics and performance metrics"
          icon="chart-box"
          color={colors.success}
          onPress={() => router.push("/instructor/analytics")}
        />

        <ToolCard
          title="Content Creator"
          description="Create levels, quizzes, and manage classes"
          icon="plus-circle"
          color={highlightColor}
          onPress={() => router.push("/(tabs)/create")}
        />
      </View>
    </ScrollView>
  );

  return (
    <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Wrapper for content width limitation on web */}
        <View
          style={[
            styles.contentWrapper,
            isLargeScreen && styles.webContentWrapper,
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: highlightColor }]}>
              🎓 Instructor Dashboard
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.textSecondary }]}
            >
              Empowerment Technologies Dashboard
            </Text>
          </View>

          {/* Tab Navigation */}
          <View
            style={[styles.tabContainer, { backgroundColor: colors.surface }]}
          >
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "dashboard" && [
                  styles.activeTab,
                  { backgroundColor: highlightColor + "20" },
                ],
              ]}
              onPress={() => setActiveTab("dashboard")}
            >
              <MaterialCommunityIcons
                name="view-dashboard"
                size={20}
                color={
                  activeTab === "dashboard"
                    ? highlightColor
                    : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.tabText,
                  { color: colors.textSecondary },
                  activeTab === "dashboard" && { color: highlightColor },
                ]}
              >
                Dashboard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "tools" && [
                  styles.activeTab,
                  { backgroundColor: highlightColor + "20" },
                ],
              ]}
              onPress={() => setActiveTab("tools")}
            >
              <MaterialCommunityIcons
                name="tools"
                size={20}
                color={
                  activeTab === "tools" ? highlightColor : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.tabText,
                  { color: colors.textSecondary },
                  activeTab === "tools" && { color: highlightColor },
                ]}
              >
                Tools
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {activeTab === "dashboard" ? renderDashboard() : renderTools()}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    width: "100%",
  },
  webContentWrapper: {
    maxWidth: 1000,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 20,
    ...(Platform.OS === "web" && {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
    }),
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    // backgroundColor will be set dynamically in component
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
  },
  activeTabText: {
    // color will be set dynamically in component
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeHeader: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  statsContainer: {
    marginBottom: 32,
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
  },
  statIcon: {
    marginRight: 16,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
  },
  activityContainer: {
    marginBottom: 32,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  activityIcon: {
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityStudent: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  activityAction: {
    fontSize: 14,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  toolsHeader: {
    marginBottom: 24,
  },
  toolsSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  toolsGrid: {
    gap: 16,
  },
  toolCard: {
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  toolIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  toolInfo: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  accessDenied: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
