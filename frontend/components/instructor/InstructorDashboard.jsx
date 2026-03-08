import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";

const StatCard = ({ title, value, icon, color, subtitle }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.statCard,
        {
          borderLeftColor: color || colors.primary,
          backgroundColor: colors.card,
        },
      ]}
    >
      <View style={styles.statIcon}>
        <MaterialCommunityIcons
          name={icon}
          size={24}
          color={color || colors.primary}
        />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.statSubtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
};

const ToolCard = ({ title, description, icon, onPress, color }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.toolCard, { backgroundColor: colors.card }]}
      onPress={onPress}
    >
      <View
        style={[
          styles.toolIcon,
          { backgroundColor: `${color || colors.primary}20` },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={28}
          color={color || colors.primary}
        />
      </View>
      <View style={styles.toolContent}>
        <Text style={[styles.toolTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.toolDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={colors.textSecondary}
      />
    </TouchableOpacity>
  );
};

export default function InstructorDashboard({
  stats = {},
  onNavigateToGames,
  onNavigateToAnalytics,
  onNavigateToUsers,
  onNavigateToTrivia,
  onCreateContent,
  onManageClasses,
}) {
  const { colors } = useTheme();

  const defaultStats = {
    totalStudents: stats.totalStudents || 0,
    activeGames: stats.activeGames || 0,
    averageScore: stats.averageScore || 0,
    completionRate: stats.completionRate || 0,
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={[styles.welcomeTitle, { color: colors.text }]}>
          Instructor Dashboard
        </Text>
        <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
          Manage your cybersecurity education platform
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          Quick Overview
        </Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Students"
            value={defaultStats.totalStudents}
            icon="account-group"
            color={colors.primary}
            subtitle="Active learners"
          />
          <StatCard
            title="Active Games"
            value={defaultStats.activeGames}
            icon="gamepad-variant"
            color={colors.accent}
            subtitle="In progress"
          />
          <StatCard
            title="Avg Score"
            value={`${defaultStats.averageScore}%`}
            icon="chart-line"
            color={colors.success}
            subtitle="Class average"
          />
          <StatCard
            title="Completion"
            value={`${defaultStats.completionRate}%`}
            icon="check-circle"
            color={colors.warning}
            subtitle="Course progress"
          />
        </View>
      </View>

      {/* Teaching Tools */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          Teaching Tools
        </Text>
        <View style={styles.toolsGrid}>
          <ToolCard
            title="Trivia Master"
            description="Interactive trivia with teaching mode"
            icon="school"
            color={colors.secondary}
            onPress={onNavigateToTrivia}
          />

          <ToolCard
            title="Student Analytics"
            description="View detailed learning analytics"
            icon="chart-box"
            color={colors.primary}
            onPress={onNavigateToAnalytics}
          />

          <ToolCard
            title="Class Management"
            description="Organize and manage classes"
            icon="google-classroom"
            color={colors.secondary}
            onPress={onManageClasses}
          />
        </View>
      </View>

      {/* Recent Activity Section (Placeholder) */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          Recent Activity
        </Text>
        <View style={styles.activityContainer}>
          <View style={[styles.activityItem, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons
              name="account-plus"
              size={20}
              color={colors.success}
            />
            <Text style={[styles.activityText, { color: colors.text }]}>
              5 new students joined today
            </Text>
          </View>
          <View style={[styles.activityItem, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons
              name="gamepad-variant"
              size={20}
              color={colors.accent}
            />
            <Text style={[styles.activityText, { color: colors.text }]}>
              12 games completed this week
            </Text>
          </View>
          <View style={[styles.activityItem, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons
              name="trophy"
              size={20}
              color={colors.warning}
            />
            <Text style={[styles.activityText, { color: colors.text }]}>
              Average score improved by 15%
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  welcomeSection: {
    padding: 20,
    paddingBottom: 10,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
  },
  statIcon: {
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statTitle: {
    fontSize: 14,
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  toolsGrid: {
    gap: 12,
  },
  toolCard: {
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  toolContent: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 14,
  },
  activityContainer: {
    gap: 12,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  activityText: {
    fontSize: 14,
    flex: 1,
  },
});
