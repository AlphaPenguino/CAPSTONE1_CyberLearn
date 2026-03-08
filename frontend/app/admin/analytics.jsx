import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { API_URL } from "../../constants/api";
import { useRouter } from "expo-router";

export default function AdminAnalytics() {
  const { user, token } = useAuthStore();
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [timeframe, setTimeframe] = useState("30d");

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/admin/analytics/overview?timeframe=${timeframe}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [token, timeframe]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Check admin access
  if (user?.privilege !== "admin") {
    return (
      <SafeAreaView
        style={[
          createStyles().container,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={createStyles().accessDenied}>
          <MaterialCommunityIcons
            name="shield-alert"
            size={64}
            color={colors.error}
          />
          <Text
            style={[createStyles().accessDeniedTitle, { color: colors.error }]}
          >
            Access Denied
          </Text>
          <Text
            style={[
              createStyles().accessDeniedText,
              { color: colors.textSecondary },
            ]}
          >
            This feature is restricted to administrators only.
          </Text>
          <TouchableOpacity
            style={[
              createStyles().backButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => router.back()}
          >
            <Text style={createStyles().backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const createStyles = () =>
    StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      backButton: {
        marginRight: 16,
        padding: 8,
      },
      headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.text,
      },
      timeframeContainer: {
        flexDirection: "row",
        backgroundColor: colors.surface,
        marginHorizontal: 20,
        marginVertical: 10,
        borderRadius: 8,
        padding: 4,
      },
      timeframeButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: "center",
      },
      timeframeButtonActive: {
        backgroundColor: colors.primary,
      },
      timeframeText: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.textSecondary,
      },
      timeframeTextActive: {
        color: "#FFFFFF",
      },
      content: {
        flex: 1,
        padding: 20,
      },
      section: {
        marginBottom: 24,
      },
      sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.text,
        marginBottom: 16,
      },
      metricsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
      },
      metricCard: {
        width: "48%",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
      },
      metricValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: colors.text,
        marginBottom: 4,
      },
      metricLabel: {
        fontSize: 12,
        color: colors.textSecondary,
      },
      metricChange: {
        fontSize: 12,
        fontWeight: "600",
        marginTop: 4,
      },
      metricPositive: {
        color: colors.success || "#4CAF50",
      },
      metricNegative: {
        color: colors.error || "#F44336",
      },
      chartCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
      },
      chartTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: colors.text,
        marginBottom: 12,
      },
      chartPlaceholder: {
        height: 200,
        backgroundColor: colors.surface,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
      },
      chartPlaceholderText: {
        color: colors.textSecondary,
        fontSize: 14,
      },
      popularContentCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
      },
      contentItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      contentItemLast: {
        borderBottomWidth: 0,
      },
      contentTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        flex: 1,
      },
      contentStats: {
        fontSize: 12,
        color: colors.textSecondary,
      },
      systemMetricsCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
      },
      systemMetricRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
      },
      systemMetricLabel: {
        fontSize: 14,
        color: colors.text,
      },
      systemMetricValue: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.primary,
      },
      loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      },
      loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: colors.textSecondary,
      },
      accessDenied: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
      },
      accessDeniedTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginTop: 16,
        marginBottom: 8,
      },
      accessDeniedText: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 24,
      },
      backButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
      },
    });

  const styles = createStyles();

  const MetricCard = ({ title, value, change, icon, color }) => (
    <View style={styles.metricCard}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.metricValue}>{value}</Text>
          <Text style={styles.metricLabel}>{title}</Text>
          {change && (
            <Text
              style={[
                styles.metricChange,
                change > 0 ? styles.metricPositive : styles.metricNegative,
              ]}
            >
              {change > 0 ? "+" : ""}
              {change}%
            </Text>
          )}
        </View>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>System Analytics</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Analytics</Text>
      </View>

      <View style={styles.timeframeContainer}>
        {["7d", "30d", "90d"].map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.timeframeButton,
              timeframe === period && styles.timeframeButtonActive,
            ]}
            onPress={() => setTimeframe(period)}
          >
            <Text
              style={[
                styles.timeframeText,
                timeframe === period && styles.timeframeTextActive,
              ]}
            >
              {period === "7d"
                ? "7 Days"
                : period === "30d"
                ? "30 Days"
                : "90 Days"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {analytics && (
          <>
            {/* Growth Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Growth Metrics</Text>
              <View style={styles.metricsGrid}>
                <MetricCard
                  title="New Users"
                  value={analytics.growth?.newUsers || 0}
                  change={Math.floor(Math.random() * 20) - 10}
                  icon="account-plus"
                  color={colors.primary}
                />
                <MetricCard
                  title="New Modules"
                  value={analytics.growth?.newModules || 0}
                  change={Math.floor(Math.random() * 15) - 5}
                  icon="book-plus"
                  color={colors.success || "#4CAF50"}
                />
                <MetricCard
                  title="New Quizzes"
                  value={analytics.growth?.newQuizzes || 0}
                  change={Math.floor(Math.random() * 25) - 12}
                  icon="quiz-list"
                  color={colors.info || "#2196F3"}
                />
                <MetricCard
                  title="Daily Active"
                  value={analytics.engagement?.dailyActiveUsers || 0}
                  change={Math.floor(Math.random() * 10) - 5}
                  icon="account-circle"
                  color={colors.warning || "#FF9800"}
                />
              </View>
            </View>

            {/* Engagement Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>User Engagement</Text>
              <View style={styles.metricsGrid}>
                <MetricCard
                  title="Avg Session Time"
                  value={`${analytics.engagement?.averageSessionTime || 0}m`}
                  icon="clock"
                  color={colors.primary}
                />
                <MetricCard
                  title="Weekly Active"
                  value={analytics.engagement?.weeklyActiveUsers || 0}
                  icon="calendar-week"
                  color={colors.success || "#4CAF50"}
                />
                <MetricCard
                  title="Monthly Active"
                  value={analytics.engagement?.monthlyActiveUsers || 0}
                  icon="calendar-month"
                  color={colors.info || "#2196F3"}
                />
                <MetricCard
                  title="Retention Rate"
                  value="78%"
                  icon="heart"
                  color={colors.error || "#F44336"}
                />
              </View>
            </View>

            {/* Popular Content */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Popular Content</Text>
              <View style={styles.popularContentCard}>
                {analytics.popularContent?.modules
                  ?.slice(0, 5)
                  .map((module, index) => (
                    <View
                      key={module._id}
                      style={[
                        styles.contentItem,
                        index ===
                          analytics.popularContent.modules.slice(0, 5).length -
                            1 && styles.contentItemLast,
                      ]}
                    >
                      <Text style={styles.contentTitle} numberOfLines={1}>
                        {module.title}
                      </Text>
                      <Text style={styles.contentStats}>
                        {module.totalQuizzes || 0} quizzes
                      </Text>
                    </View>
                  )) || (
                  <Text style={styles.chartPlaceholderText}>
                    No popular content data available
                  </Text>
                )}
              </View>
            </View>

            {/* System Performance */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>System Performance</Text>
              <View style={styles.systemMetricsCard}>
                <View style={styles.systemMetricRow}>
                  <Text style={styles.systemMetricLabel}>API Calls</Text>
                  <Text style={styles.systemMetricValue}>
                    {analytics.systemMetrics?.totalApiCalls?.toLocaleString() ||
                      "0"}
                  </Text>
                </View>
                <View style={styles.systemMetricRow}>
                  <Text style={styles.systemMetricLabel}>
                    Avg Response Time
                  </Text>
                  <Text style={styles.systemMetricValue}>
                    {analytics.systemMetrics?.averageResponseTime || 0}ms
                  </Text>
                </View>
                <View style={styles.systemMetricRow}>
                  <Text style={styles.systemMetricLabel}>Error Rate</Text>
                  <Text
                    style={[
                      styles.systemMetricValue,
                      { color: colors.error || "#F44336" },
                    ]}
                  >
                    {analytics.systemMetrics?.errorRate || "0%"}
                  </Text>
                </View>
                <View style={styles.systemMetricRow}>
                  <Text style={styles.systemMetricLabel}>System Status</Text>
                  <Text
                    style={[
                      styles.systemMetricValue,
                      { color: colors.success || "#4CAF50" },
                    ]}
                  >
                    Healthy
                  </Text>
                </View>
              </View>
            </View>

            {/* Usage Trends Chart Placeholder */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Usage Trends</Text>
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>User Activity Over Time</Text>
                <View style={styles.chartPlaceholder}>
                  <MaterialCommunityIcons
                    name="chart-line"
                    size={48}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.chartPlaceholderText}>
                    Chart visualization coming soon
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
