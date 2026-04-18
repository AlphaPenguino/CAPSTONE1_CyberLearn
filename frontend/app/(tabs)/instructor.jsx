import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { API_URL, constructProfileImageUrl } from "../../constants/api";
import InstructorAnalytics from "../instructor/analytics";

// Get screen width to determine if we're on web with a large screen
const screenWidth = Dimensions.get("window").width;
const isWeb = Platform.OS === "web";
const isLargeScreen = isWeb && screenWidth > 768;

export default function InstructorDashboard() {
  const params = useLocalSearchParams();
  const requestedTab = Array.isArray(params?.tab) ? params.tab[0] : params?.tab;
  const normalizedRequestedTab =
    typeof requestedTab === "string" ? requestedTab.toLowerCase() : null;
  const [activeTab, setActiveTab] = useState(
    normalizedRequestedTab === "analytics"
      ? "analytics"
      : normalizedRequestedTab === "tools"
      ? "tools"
      : "dashboard"
  );
  const [summary, setSummary] = useState({
    totalStudents: 0,
    averageScore: 0,
    recentActivity: [],
  });
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileModalLoading, setProfileModalLoading] = useState(false);
  const [profileModalError, setProfileModalError] = useState(null);
  const [selectedProfileData, setSelectedProfileData] = useState(null);
  const [profileDataCache, setProfileDataCache] = useState({});
  const [sectionsCatalog, setSectionsCatalog] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuthStore();
  const { colors } = useTheme();
  // Dark blue override for light mode (replacing yellow accents)
  const highlightColor = colors.textPrimary;
  const router = useRouter();

  useEffect(() => {
    if (normalizedRequestedTab === "analytics") {
      setActiveTab("analytics");
      return;
    }
    if (normalizedRequestedTab === "tools") {
      setActiveTab("tools");
      return;
    }
    if (normalizedRequestedTab === "dashboard") {
      setActiveTab("dashboard");
    }
  }, [normalizedRequestedTab]);

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
      if (data.success) {
        const normalizedRecentActivity = Array.isArray(data?.data?.recentActivity)
          ? data.data.recentActivity.map((activity) => {
              const rawImage = activity?.profileImage || activity?.profilePicture || null;
              const normalizedUrl = rawImage
                ? (() => {
                    const fullUrl = constructProfileImageUrl(rawImage);
                    if (
                      fullUrl &&
                      fullUrl.includes("dicebear") &&
                      fullUrl.includes("/svg") &&
                      Platform.OS === "android"
                    ) {
                      return fullUrl.replace("/svg", "/png");
                    }
                    return fullUrl;
                  })()
                : null;

              return {
                ...activity,
                profileImage: rawImage,
                profileImageUrl: normalizedUrl,
              };
            })
          : [];

        setSummary({
          ...data.data,
          recentActivity: normalizedRecentActivity,
        });
      }
    } catch (e) {
      console.warn("Failed to load instructor summary:", e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getNormalizedRole = (account) =>
    (account?.privilege || account?.role || "student").toLowerCase();

  const getSubjectCode = (subject) =>
    subject?.subjectCode || subject?.sectionCode || "N/A";

  const getCompatibleImageUrl = (url) => {
    if (!url) return null;

    const fullUrl = constructProfileImageUrl(url);
    if (fullUrl && fullUrl.includes("dicebear") && fullUrl.includes("/svg")) {
      if (Platform.OS === "android") {
        return fullUrl.replace("/svg", "/png");
      }
    }

    return fullUrl;
  };

  const fetchSectionsCatalog = useCallback(async () => {
    if (Array.isArray(sectionsCatalog)) {
      return sectionsCatalog;
    }

    try {
      const response = await fetch(
        `${API_URL}/sections?page=1&limit=500&sort=createdAt&direction=desc`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        setSectionsCatalog([]);
        return [];
      }

      const payload = await response.json();
      const sections = Array.isArray(payload?.sections) ? payload.sections : [];
      setSectionsCatalog(sections);
      return sections;
    } catch (err) {
      console.warn("Unable to fetch sections for profile modal:", err);
      setSectionsCatalog([]);
      return [];
    }
  }, [sectionsCatalog, token]);

  const openUserProfileModal = useCallback(
    async (userItem) => {
      const userId = String(userItem?._id || userItem?.id || userItem?.userId || "");
      if (!userId) {
        Alert.alert("User Profile", "Unable to open profile for this student.");
        return;
      }

      const baseRole = getNormalizedRole(userItem);
      const fallbackProfile = {
        basic: {
          _id: userId,
          username: userItem?.username || userItem?.studentName || "N/A",
          fullName:
            userItem?.fullName || userItem?.studentName || userItem?.username || "N/A",
          email: userItem?.email || "N/A",
          profileImage:
            userItem?.profileImage ||
            userItem?.profilePicture ||
            userItem?.profileImageUrl ||
            null,
          role: baseRole,
        },
        student:
          baseRole === "student"
            ? {
                level: userItem?.gamification?.level || userItem?.level || 1,
                totalXP: userItem?.gamification?.totalXP || userItem?.totalXP || 0,
                totalGamesPlayed: userItem?.analytics?.totalGamesPlayed || 0,
                cyberQuestGamesPlayed:
                  userItem?.analytics?.gamesByType?.cyberQuest || 0,
                progress: {
                  unlockedModules: 0,
                  completedModules: 0,
                },
                enrolledSubjects: [],
              }
            : null,
        instructor:
          baseRole === "instructor"
            ? {
                handledSubjects: [],
                availableSubjects: [],
              }
            : null,
      };

      setProfileModalVisible(true);
      setProfileModalError(null);
      setSelectedProfileData(fallbackProfile);

      if (profileDataCache[userId]) {
        setSelectedProfileData(profileDataCache[userId]);
        return;
      }

      try {
        setProfileModalLoading(true);

        const userResponse = await fetch(`${API_URL}/users/${encodeURIComponent(userId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        let fetchedUser = userItem;
        if (userResponse.ok) {
          const payload = await userResponse.json();
          if (payload?.success && payload?.user) {
            fetchedUser = payload.user;
          }
        }

        const role = getNormalizedRole(fetchedUser);
        const normalizedUserId = String(fetchedUser?._id || userId);
        const allSections = await fetchSectionsCatalog();

        const enrolledSubjects = allSections.filter((section) => {
          const studentIds = Array.isArray(section?.students)
            ? section.students.map((studentId) => String(studentId))
            : [];
          const isInStudentsArray = studentIds.includes(normalizedUserId);

          const sectionCodes = Array.isArray(fetchedUser?.sections)
            ? fetchedUser.sections
            : [];
          const matchesSectionCode =
            String(fetchedUser?.section || "") ===
              String(section?.sectionCode || "") ||
            sectionCodes.includes(section?.sectionCode);

          return isInStudentsArray || matchesSectionCode;
        });

        const handledSubjects = allSections.filter((section) => {
          const primaryInstructor = String(
            section?.instructor?._id || section?.instructor || ""
          );
          const additionalInstructors = Array.isArray(section?.instructors)
            ? section.instructors.map((inst) => String(inst?._id || inst))
            : [];
          const createdBy = String(section?.createdBy?._id || section?.createdBy || "");

          return (
            primaryInstructor === normalizedUserId ||
            additionalInstructors.includes(normalizedUserId) ||
            createdBy === normalizedUserId
          );
        });

        const availableSubjects = allSections.filter((section) => {
          const isHandled = handledSubjects.some(
            (handled) => String(handled?._id) === String(section?._id)
          );
          return !isHandled && section?.archived !== true && section?.isActive !== false;
        });

        let studentProgress = null;
        if (role === "student") {
          try {
            const progressResponse = await fetch(
              `${API_URL}/progress/debug/${encodeURIComponent(normalizedUserId)}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (progressResponse.ok) {
              studentProgress = await progressResponse.json();
            }
          } catch (progressErr) {
            console.warn("Unable to fetch student progress:", progressErr);
          }
        }

        const compiledProfile = {
          basic: {
            _id: normalizedUserId,
            username:
              fetchedUser?.username || fetchedUser?.studentName || userItem?.studentName || "N/A",
            fullName:
              fetchedUser?.fullName ||
              fetchedUser?.studentName ||
              fetchedUser?.username ||
              userItem?.studentName ||
              "N/A",
            email: fetchedUser?.email || userItem?.email || "N/A",
            profileImage: fetchedUser?.profileImage || fetchedUser?.profilePicture || null,
            role,
          },
          student:
            role === "student"
              ? {
                  level: fetchedUser?.gamification?.level || fetchedUser?.level || 1,
                  totalXP: fetchedUser?.gamification?.totalXP || fetchedUser?.totalXP || 0,
                  totalGamesPlayed: fetchedUser?.analytics?.totalGamesPlayed || 0,
                  cyberQuestGamesPlayed:
                    fetchedUser?.analytics?.gamesByType?.cyberQuest || 0,
                  progress: {
                    unlockedModules:
                      studentProgress?.globalProgress?.unlockedModules || 0,
                    completedModules:
                      studentProgress?.globalProgress?.completedModules || 0,
                  },
                  enrolledSubjects,
                }
              : null,
          instructor:
            role === "instructor"
              ? {
                  handledSubjects,
                  availableSubjects,
                }
              : null,
        };

        setSelectedProfileData(compiledProfile);
        setProfileDataCache((prev) => ({ ...prev, [normalizedUserId]: compiledProfile }));
      } catch (err) {
        setProfileModalError(err.message || "Some profile details could not be loaded");
      } finally {
        setProfileModalLoading(false);
      }
    },
    [fetchSectionsCatalog, profileDataCache, token]
  );

  const handleImageError = (userId) => {
    setImageErrors((prev) => ({
      ...prev,
      [userId]: true,
    }));
  };

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
            <TouchableOpacity
              key={activity.id || activity._id || index}
              style={[styles.activityItem, { backgroundColor: colors.card }]}
              onPress={() => openUserProfileModal(activity)}
              activeOpacity={0.86}
            >
              <View style={styles.activityIcon}>
                {(activity.profileImageUrl || activity.profileImage) &&
                !imageErrors[activity.id || activity._id] ? (
                  <Image
                    source={{
                      uri:
                        activity.profileImageUrl ||
                        getCompatibleImageUrl(activity.profileImage),
                    }}
                    style={styles.activityAvatarImage}
                    onError={() => handleImageError(activity.id || activity._id)}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="account-circle"
                    size={32}
                    color={highlightColor}
                  />
                )}
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
            </TouchableOpacity>
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
          onPress={() => setActiveTab("analytics")}
        />

        <ToolCard
          title="Content Creator"
          description="Create levels, quizzes, and manage classes"
          icon="plus-circle"
          color={highlightColor}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/create",
              params: { from: "instructor-tools" },
            })
          }
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
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "tools" && renderTools()}
          {activeTab === "analytics" && (
            <InstructorAnalytics
              embedded
              onBack={() => setActiveTab("tools")}
            />
          )}

          <Modal
            animationType="fade"
            transparent={true}
            visible={profileModalVisible}
            onRequestClose={() => {
              setProfileModalVisible(false);
              setProfileModalError(null);
            }}
          >
            <View style={styles.profileModalOverlay}>
              <View
                style={[
                  styles.profileModalContent,
                  {
                    backgroundColor: colors.card,
                    borderColor: "rgba(148, 163, 184, 0.25)",
                  },
                ]}
              >
                <View style={styles.profileModalHeader}>
                  <Text style={[styles.profileModalTitle, { color: colors.text }]}> 
                    User Profile
                  </Text>
                  <TouchableOpacity
                    style={styles.profileCloseButton}
                    onPress={() => {
                      setProfileModalVisible(false);
                      setProfileModalError(null);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={22}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>

                {profileModalLoading && !selectedProfileData ? (
                  <View style={styles.profileCenteredMini}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}> 
                      Loading user profile...
                    </Text>
                  </View>
                ) : selectedProfileData ? (
                  <ScrollView
                    style={styles.profileScrollArea}
                    contentContainerStyle={styles.profileScrollContent}
                    showsVerticalScrollIndicator={isWeb}
                  >
                    {profileModalError ? (
                      <View style={styles.profileInlineWarning}>
                        <MaterialCommunityIcons
                          name="alert-circle-outline"
                          size={16}
                          color={colors.warning || "#FF9800"}
                        />
                        <Text
                          style={[
                            styles.profileInlineWarningText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {profileModalError}
                        </Text>
                      </View>
                    ) : null}

                    <LinearGradient
                      colors={[
                        "rgba(95, 210, 205, 0.28)",
                        "rgba(202, 241, 200, 0.18)",
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.profileHero}
                    >
                      <View style={styles.profileHeroTop}>
                        <View style={styles.profileAvatarBadge}>
                          {selectedProfileData.basic.profileImage &&
                          !imageErrors[selectedProfileData.basic._id] ? (
                            <Image
                              source={{
                                uri: getCompatibleImageUrl(
                                  selectedProfileData.basic.profileImage
                                ),
                              }}
                              style={styles.profileAvatarImage}
                              onError={() =>
                                handleImageError(selectedProfileData.basic._id)
                              }
                            />
                          ) : (
                            <MaterialCommunityIcons
                              name="account-circle-outline"
                              size={40}
                              color={colors.primary}
                            />
                          )}
                        </View>
                        <View style={styles.profileHeroTextWrap}>
                          <Text style={[styles.profileHeroName, { color: colors.text }]}> 
                            {selectedProfileData.basic.fullName}
                          </Text>
                          <Text
                            style={[
                              styles.profileHeroUsername,
                              { color: colors.textSecondary },
                            ]}
                          >
                            @{selectedProfileData.basic.username}
                          </Text>
                        </View>
                        <View style={styles.profileRoleBadgePill}>
                          <Text style={styles.profileRoleBadgeText}>
                            {selectedProfileData.basic.role}
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>

                    <View style={styles.profileCard}>
                      <Text style={[styles.profileCardTitle, { color: colors.text }]}> 
                        Account Details
                      </Text>
                      <View style={styles.profileInfoRow}>
                        <Text
                          style={[styles.profileInfoLabel, { color: colors.textSecondary }]}
                        >
                          Username
                        </Text>
                        <Text style={[styles.profileInfoValue, { color: colors.text }]}> 
                          {selectedProfileData.basic.username}
                        </Text>
                      </View>
                      <View style={styles.profileInfoDivider} />
                      <View style={styles.profileInfoRow}>
                        <Text
                          style={[styles.profileInfoLabel, { color: colors.textSecondary }]}
                        >
                          Name
                        </Text>
                        <Text style={[styles.profileInfoValue, { color: colors.text }]}> 
                          {selectedProfileData.basic.fullName}
                        </Text>
                      </View>
                      <View style={styles.profileInfoDivider} />
                      <View style={styles.profileInfoRow}>
                        <Text
                          style={[styles.profileInfoLabel, { color: colors.textSecondary }]}
                        >
                          Email
                        </Text>
                        <Text style={[styles.profileInfoValue, { color: colors.text }]}> 
                          {selectedProfileData.basic.email}
                        </Text>
                      </View>
                      <View style={styles.profileInfoDivider} />
                      <View style={styles.profileInfoRow}>
                        <Text
                          style={[styles.profileInfoLabel, { color: colors.textSecondary }]}
                        >
                          Role
                        </Text>
                        <Text style={[styles.profileInfoValue, { color: colors.text }]}> 
                          {selectedProfileData.basic.role}
                        </Text>
                      </View>
                    </View>

                    {selectedProfileData.student ? (
                      <>
                        <View style={styles.profileCard}>
                          <Text style={[styles.profileCardTitle, { color: colors.text }]}> 
                            Student CyberQuest Progress
                          </Text>
                          <View style={styles.profileStatsWrap}>
                            <View style={styles.profileStatChip}>
                              <Text
                                style={[
                                  styles.profileStatLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Level
                              </Text>
                              <Text style={[styles.profileStatValue, { color: colors.text }]}> 
                                {selectedProfileData.student.level}
                              </Text>
                            </View>
                            <View style={styles.profileStatChip}>
                              <Text
                                style={[
                                  styles.profileStatLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                XP
                              </Text>
                              <Text style={[styles.profileStatValue, { color: colors.text }]}> 
                                {selectedProfileData.student.totalXP}
                              </Text>
                            </View>
                            <View style={styles.profileStatChip}>
                              <Text
                                style={[
                                  styles.profileStatLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                All Games
                              </Text>
                              <Text style={[styles.profileStatValue, { color: colors.text }]}> 
                                {selectedProfileData.student.totalGamesPlayed}
                              </Text>
                            </View>
                            <View style={styles.profileStatChip}>
                              <Text
                                style={[
                                  styles.profileStatLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                CyberQuest
                              </Text>
                              <Text style={[styles.profileStatValue, { color: colors.text }]}> 
                                {selectedProfileData.student.cyberQuestGamesPlayed}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.profileCard}>
                          <View style={styles.profileSectionHeaderRow}>
                            <Text style={[styles.profileCardTitle, { color: colors.text }]}> 
                              Enrolled Subjects
                            </Text>
                            <Text
                              style={[
                                styles.profileSectionCount,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {selectedProfileData.student.enrolledSubjects.length}
                            </Text>
                          </View>
                          {selectedProfileData.student.enrolledSubjects.length > 0 ? (
                            selectedProfileData.student.enrolledSubjects.map((subject) => (
                              <View
                                key={String(subject._id)}
                                style={styles.profileSubjectItem}
                              >
                                <View style={styles.profileSubjectRow}>
                                  <MaterialCommunityIcons
                                    name="book-open-page-variant"
                                    size={16}
                                    color={colors.primary}
                                  />
                                  <Text
                                    style={[styles.profileSubjectName, { color: colors.text }]}
                                  >
                                    {subject.name}
                                  </Text>
                                </View>
                                <Text
                                  style={[
                                    styles.profileSubjectMeta,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  Code: {getSubjectCode(subject)}
                                </Text>
                              </View>
                            ))
                          ) : (
                            <Text
                              style={[styles.profileEmptyText, { color: colors.textSecondary }]}
                            >
                              No enrolled subjects found.
                            </Text>
                          )}
                        </View>
                      </>
                    ) : null}
                  </ScrollView>
                ) : (
                  <View style={styles.profileCenteredMini}>
                    <Text style={[styles.profileEmptyText, { color: colors.textSecondary }]}> 
                      No profile data available.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Modal>
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
  activityAvatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  profileModalContent: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "92%",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  profileModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.2)",
  },
  profileModalTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  profileCloseButton: {
    padding: 4,
  },
  profileCenteredMini: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  profileScrollArea: {
    flex: 1,
  },
  profileScrollContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  profileInlineWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
  },
  profileInlineWarningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  profileHero: {
    borderRadius: 14,
    padding: 14,
  },
  profileHeroTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatarBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    overflow: "hidden",
  },
  profileAvatarImage: {
    width: "100%",
    height: "100%",
  },
  profileHeroTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  profileHeroName: {
    fontSize: 18,
    fontWeight: "800",
  },
  profileHeroUsername: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
  },
  profileRoleBadgePill: {
    borderRadius: 999,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  profileRoleBadgeText: {
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  profileCard: {
    borderRadius: 14,
    backgroundColor: "rgba(148, 163, 184, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    padding: 14,
  },
  profileCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },
  profileInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  profileInfoLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  profileInfoValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
  },
  profileInfoDivider: {
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  profileStatsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  profileStatChip: {
    minWidth: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    backgroundColor: "rgba(255,255,255,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  profileStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  profileStatValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  profileSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  profileSectionCount: {
    fontSize: 12,
    fontWeight: "700",
  },
  profileSubjectItem: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    backgroundColor: "rgba(148, 163, 184, 0.05)",
    padding: 10,
    marginBottom: 8,
  },
  profileSubjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  profileSubjectName: {
    fontSize: 13,
    fontWeight: "700",
  },
  profileSubjectMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
  },
  profileEmptyText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
