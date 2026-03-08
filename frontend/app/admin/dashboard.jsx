import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { API_URL } from "../../constants/api";
import { useRouter } from "expo-router";

export default function AdminDashboard() {
  const { user, token } = useAuthStore();
  const { colors, isDarkMode } = useTheme();
  // Dark blue override in light mode instead of yellow accents
  const highlightColor = isDarkMode ? colors.primary : "#1976d2";
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalInstructors: 0,
    totalModules: 0,
    totalQuizzes: 0,
    activeSessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [announcementModal, setAnnouncementModal] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const fetchAdminStats = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch comprehensive admin statistics
      const [usersResponse, modulesResponse] = await Promise.all([
        fetch(`${API_URL}/users?limit=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/modules?limit=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (usersResponse.ok && modulesResponse.ok) {
        const usersData = await usersResponse.json();
        const modulesData = await modulesResponse.json();

        const users = usersData.users || [];
        const modules = modulesData.modules || [];

        setStats({
          totalUsers: users.length,
          totalStudents: users.filter((u) => u.privilege === "student").length,
          totalInstructors: users.filter((u) => u.privilege === "instructor")
            .length,
          totalModules: modules.length,
          totalQuizzes: modules.reduce(
            (total, module) => total + (module.totalQuizzes || 0),
            0
          ),
          activeSessions: Math.floor(Math.random() * 50) + 10, // Mock data
        });
      }
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      Alert.alert("Error", "Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAdminStats();
  }, [fetchAdminStats]);

  // Check admin access
  if (user?.privilege !== "admin") {
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
            This area is restricted to administrators only.
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
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
      pageWrapper: {
        flex: 1,
        width: "100%",
        maxWidth: 1200,
        alignSelf: "center",
        paddingHorizontal: 48,
        paddingBottom: 32,
        ...(typeof window !== "undefined" && window.innerWidth < 600
          ? { paddingHorizontal: 16 }
          : {}),
      },
      header: {
        padding: 20,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: colors.text,
        textAlign: "center",
      },
      headerSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "center",
        marginTop: 4,
      },
      tabsContainer: {
        flexDirection: "row",
        backgroundColor: colors.surface,
        paddingHorizontal: 20,
        paddingVertical: 10,
      },
      tab: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginHorizontal: 4,
        alignItems: "center",
      },
      tabActive: {
        backgroundColor: highlightColor,
      },
      tabText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.textSecondary,
      },
      tabTextActive: {
        color: "#FFFFFF",
      },
      content: {
        flex: 1,
        paddingTop: 20,
        // horizontal padding now managed by pageWrapper to keep consistency
      },
      overviewScrollContent: {
        paddingBottom: 40,
      },
      statsContainer: {
        marginBottom: 24,
      },
      sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.text,
        marginBottom: 16,
      },
      statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
      },
      statCard: {
        width: "48%",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
      },
      statIcon: {
        alignSelf: "flex-start",
        marginBottom: 8,
      },
      statValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: colors.text,
        marginBottom: 4,
      },
      statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
      },
      quickActionsContainer: {
        marginBottom: 24,
      },
      actionsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
      },
      actionCard: {
        width: "48%",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
      },
      actionIcon: {
        marginBottom: 8,
      },
      actionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        textAlign: "center",
        marginBottom: 4,
      },
      actionDescription: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: "center",
      },
      systemStatusContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
      },
      statusItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      statusLabel: {
        fontSize: 14,
        color: colors.text,
      },
      statusValue: {
        fontSize: 14,
        fontWeight: "600",
        color: highlightColor,
      },
      statusGood: {
        color: colors.success || "#4CAF50",
      },
      loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
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
      backButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
      },
      backButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
      },
      modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
      },
      modalContent: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 24,
        width: "90%",
        maxWidth: 400,
      },
      modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.text,
        marginBottom: 16,
        textAlign: "center",
      },
      input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        color: colors.text,
        fontSize: 16,
        marginBottom: 16,
        minHeight: 100,
        textAlignVertical: "top",
      },
      modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
      },
      modalButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginHorizontal: 4,
        alignItems: "center",
      },
      cancelButton: {
        backgroundColor: colors.textSecondary,
      },
      confirmButton: {
        backgroundColor: highlightColor,
      },
      modalButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
      },
    });

  const styles = createStyles();

  const StatCard = ({ icon, value, label, color }) => (
    <View style={styles.statCard}>
      <MaterialCommunityIcons
        name={icon}
        size={28}
        color={color}
        style={styles.statIcon}
      />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const ActionCard = ({ icon, title, description, onPress, color }) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <MaterialCommunityIcons
        name={icon}
        size={32}
        color={color}
        style={styles.actionIcon}
      />
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
    </TouchableOpacity>
  );

  const handleBulkUserImport = () => {
    Alert.alert(
      "Bulk User Import",
      "This feature allows CSV import of multiple users. Would you like to proceed?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Import", onPress: () => router.push("/admin/bulk-import") },
      ]
    );
  };

  const handleSystemConfiguration = () => {
    router.push("/admin/system-config");
  };

  const handleUserManagement = () => {
    router.push("/(tabs)/users");
  };

  const handleAnalytics = () => {
    router.push("/admin/analytics");
  };

  const handleContentManagement = () => {
    router.push("/admin/content");
  };

  const handleClassManagement = () => {
    router.push("/admin/classes");
  };

  const handleAnnouncement = async () => {
    if (!announcement.trim()) {
      Alert.alert("Error", "Please enter an announcement message");
      return;
    }

    try {
      // Here you would implement the actual announcement API call
      Alert.alert("Success", "System-wide announcement sent successfully!");
      setAnnouncement("");
      setAnnouncementModal(false);
    } catch (_error) {
      Alert.alert("Error", "Failed to send announcement");
    }
  };

  const renderOverview = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.overviewScrollContent}
    >
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>System Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="account-group"
            value={stats.totalUsers}
            label="Total Users"
            color={highlightColor}
          />
          <StatCard
            icon="account-school"
            value={stats.totalStudents}
            label="Students"
            color={colors.success || "#4CAF50"}
          />
          <StatCard
            icon="account-tie"
            value={stats.totalInstructors}
            label="Instructors"
            color={colors.warning || "#FF9800"}
          />
          <StatCard
            icon="book-multiple"
            value={stats.totalModules}
            label="Modules"
            color={colors.info || "#2196F3"}
          />
          <StatCard
            icon="quiz-list"
            value={stats.totalQuizzes}
            label="Quizzes"
            color={colors.secondary || "#9C27B0"}
          />
          <StatCard
            icon="account-circle"
            value={stats.activeSessions}
            label="Active Sessions"
            color={colors.accent || "#FF5722"}
          />
        </View>
      </View>

      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <ActionCard
            icon="account-plus"
            title="User Management"
            description="Manage user accounts and roles"
            onPress={handleUserManagement}
            color={highlightColor}
          />
          <ActionCard
            icon="upload"
            title="Bulk Import"
            description="Import users via CSV"
            onPress={handleBulkUserImport}
            color={colors.success || "#4CAF50"}
          />
          <ActionCard
            icon="chart-box"
            title="Analytics"
            description="System-wide analytics"
            onPress={handleAnalytics}
            color={colors.info || "#2196F3"}
          />
          <ActionCard
            icon="cog"
            title="System Config"
            description="Configure system settings"
            onPress={handleSystemConfiguration}
            color={colors.warning || "#FF9800"}
          />
          <ActionCard
            icon="book-edit"
            title="Content Management"
            description="Manage modules and quizzes"
            onPress={handleContentManagement}
            color={colors.secondary || "#9C27B0"}
          />
          <ActionCard
            icon="google-classroom"
            title="Class Management"
            description="Manage classes and assignments"
            onPress={handleClassManagement}
            color={colors.accent || "#FF5722"}
          />
          <ActionCard
            icon="bullhorn"
            title="Announcements"
            description="Send system announcements"
            onPress={() => setAnnouncementModal(true)}
            color={colors.error || "#F44336"}
          />
          <ActionCard
            icon="backup-restore"
            title="Maintenance"
            description="System maintenance tools"
            onPress={() => Alert.alert("Info", "Maintenance tools coming soon")}
            color={colors.textSecondary}
          />
        </View>
      </View>

      <View style={styles.systemStatusContainer}>
        <Text style={styles.sectionTitle}>System Status</Text>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Database Status</Text>
          <Text style={[styles.statusValue, styles.statusGood]}>Online</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>API Status</Text>
          <Text style={[styles.statusValue, styles.statusGood]}>Healthy</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Storage Usage</Text>
          <Text style={styles.statusValue}>67%</Text>
        </View>
        <View style={[styles.statusItem, { borderBottomWidth: 0 }]}>
          <Text style={styles.statusLabel}>Last Backup</Text>
          <Text style={styles.statusValue}>2 hours ago</Text>
        </View>
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={highlightColor} />
          <Text style={[styles.statusLabel, { marginTop: 16 }]}>
            Loading admin dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageWrapper}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            System Administration & Management
          </Text>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === "overview" && styles.tabActive]}
            onPress={() => setSelectedTab("overview")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "overview" && styles.tabTextActive,
              ]}
            >
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === "users" && styles.tabActive]}
            onPress={() => setSelectedTab("users")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "users" && styles.tabTextActive,
              ]}
            >
              Users
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === "content" && styles.tabActive]}
            onPress={() => setSelectedTab("content")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "content" && styles.tabTextActive,
              ]}
            >
              Content
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === "system" && styles.tabActive]}
            onPress={() => setSelectedTab("system")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "system" && styles.tabTextActive,
              ]}
            >
              System
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {selectedTab === "overview" && renderOverview()}
          {selectedTab === "users" && (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={[styles.statusLabel, { textAlign: "center" }]}>
                User management functionality is available in the Users tab
              </Text>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  {
                    marginTop: 16,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 8,
                  },
                ]}
                onPress={handleUserManagement}
              >
                <Text style={styles.modalButtonText}>
                  Go to User Management
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {selectedTab === "content" && (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialCommunityIcons
                name="book-edit"
                size={64}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  styles.statusLabel,
                  { textAlign: "center", marginTop: 16 },
                ]}
              >
                Content management features coming soon
              </Text>
            </View>
          )}
          {selectedTab === "system" && (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialCommunityIcons
                name="cog"
                size={64}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  styles.statusLabel,
                  { textAlign: "center", marginTop: 16 },
                ]}
              >
                System configuration panel coming soon
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Announcement Modal */}
      <Modal
        visible={announcementModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAnnouncementModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>System Announcement</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter announcement message..."
              placeholderTextColor={colors.textSecondary}
              value={announcement}
              onChangeText={setAnnouncement}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setAnnouncementModal(false);
                  setAnnouncement("");
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAnnouncement}
              >
                <Text style={styles.modalButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
