import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  StyleSheet,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "@/constants/custom-colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { Picker } from "@react-native-picker/picker";
import { API_URL } from "@/constants/api";
import { router, useFocusEffect } from "expo-router";

export default function Leaderboards() {
  const { user, token } = useAuthStore();
  const { colors, isDarkMode } = useTheme();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSection, setSelectedSection] = useState("all");
  const [availableSections, setAvailableSections] = useState([]);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [subjectsLoaded, setSubjectsLoaded] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileModalLoading, setProfileModalLoading] = useState(false);
  const [profileModalError, setProfileModalError] = useState(null);
  const [selectedProfileData, setSelectedProfileData] = useState(null);
  const [profileDataCache, setProfileDataCache] = useState({});
  const [sectionsCatalog, setSectionsCatalog] = useState(null);
  const staleRefreshTimerRef = useRef(null);

  // Role helpers
  const isInstructorOrAdmin =
    user?.privilege === "instructor" || user?.privilege === "admin";
  const isAdmin = user?.privilege === "admin";

  // Get image URL helper (handles localhost, relative paths, and Dicebear SVG on native)
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;

    const apiBase = API_URL.replace("/api", "");

    // If absolute URL
    if (imagePath.startsWith("http")) {
      try {
        const url = new URL(imagePath);

        // Convert Dicebear SVG to PNG on native (RN Image can't render remote SVG)
        if (url.hostname.includes("api.dicebear.com")) {
          if (Platform.OS !== "web" && url.pathname.endsWith("/svg")) {
            url.pathname = url.pathname.replace(/\/svg$/, "/png");
          }
          return url.toString();
        }

        // Normalize localhost/127.0.0.1 to current API host (useful on mobile)
        const isLocalHost = ["localhost", "127.0.0.1"].includes(url.hostname);
        if (isLocalHost) {
          const base = new URL(apiBase);
          // Keep the path (e.g., /uploads/user-profiles/xxx.png), swap origin
          return `${base.origin}${url.pathname}${url.search}`;
        }

        return imagePath;
      } catch {
        // Fall through to treat as relative
      }
    }

    // If path starts with /uploads, join with API base
    if (imagePath.startsWith("/uploads")) {
      return `${apiBase}${imagePath}`;
    }

    // Otherwise assume it's a filename stored under user-profiles
    return `${apiBase}/uploads/user-profiles/${imagePath}`;
  };

  // Load subjects from the same source as Cyber Adventure Path
  const fetchAvailableSubjects = useCallback(async () => {
    try {
      if (!token) {
        setAvailableSections([]);
        setSubjectsLoaded(true);
        return;
      }

      const response = await fetch(`${API_URL}/subjects/user-subjects`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch subjects (${response.status})`);
      }

      const data = await response.json();
      const subjects = (data.subjects || []).map((subject) => ({
        _id: String(subject._id || subject.id || ""),
        name: subject.name || "Unnamed Subject",
        sectionCode: subject.sectionCode || subject.subjectCode || "",
        students: Array.isArray(subject.students)
          ? subject.students.map((studentId) => String(studentId))
          : [],
      }));

      setAvailableSections(subjects);

      setSelectedSection((previousSelected) => {
        if (isAdmin) {
          if (previousSelected === "all") return "all";
          const stillExists = subjects.some(
            (subject) => (subject._id || subject.id) === previousSelected
          );
          return stillExists ? previousSelected : "all";
        }

        if (subjects.length === 0) return "all";

        const stillExists = subjects.some(
          (subject) => (subject._id || subject.id) === previousSelected
        );
        return stillExists
          ? previousSelected
          : subjects[0]._id || subjects[0].id || "all";
      });

      setSubjectsLoaded(true);
    } catch (err) {
      console.error("Failed to fetch leaderboard subjects:", err);
      setAvailableSections([]);
      if (!isAdmin) {
        setSelectedSection("all");
      }
      setSubjectsLoaded(true);
    }
  }, [isAdmin, token]);

  // Fetch leaderboard data from backend
  const fetchLeaderboards = useCallback(async () => {
    try {
      if (!token) {
        setLoading(false);
        return;
      }

      // Non-admin roles must be scoped to a selected subject.
      if (!isAdmin && (!subjectsLoaded || selectedSection === "all")) {
        setLeaders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      // Treat selectedSection as a subjectId now
      if (selectedSection !== "all") {
        params.append("subject", selectedSection);
        const selectedSubject = availableSections.find(
          (subject) => String(subject._id || subject.id) === String(selectedSection)
        );
        if (selectedSubject?.sectionCode) {
          params.append("sectionCode", selectedSubject.sectionCode);
        }
      }

      console.log("Fetching leaderboard...");
      console.log("API URL:", `${API_URL}/users/leaderboard?${params}`);

      const response = await fetch(`${API_URL}/users/leaderboard?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        let rankings = data.data.rankings || [];

        if (selectedSection !== "all") {
          const selectedSubject = availableSections.find(
            (subject) => String(subject._id || subject.id) === String(selectedSection)
          );
          const enrolledStudentIds = new Set(
            (selectedSubject?.students || []).map((studentId) => String(studentId))
          );

          rankings = rankings.filter((leader) =>
            enrolledStudentIds.has(String(leader._id))
          );

          rankings.sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0));
        }

        setLeaders(rankings);
        setCurrentUserRank(null);
        setLastUpdated(Date.now());
      } else {
        throw new Error(data.message || "Failed to fetch leaderboard");
      }
    } catch (err) {
      console.error("Leaderboards fetch error:", err);
      setLeaders([]);
      setError(err.message || "Failed to load leaderboards");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [availableSections, isAdmin, selectedSection, subjectsLoaded, token]);

  useEffect(() => {
    fetchAvailableSubjects();
  }, [fetchAvailableSubjects]);

  useEffect(() => {
    fetchLeaderboards();
  }, [fetchLeaderboards]);

  // Refetch whenever screen regains focus (user navigates back after finishing a game)
  useFocusEffect(
    useCallback(() => {
      // Only refetch if data might be stale (older than 5s) to avoid double fetch with mount effect
      if (!lastUpdated || Date.now() - lastUpdated > 5000) {
        fetchLeaderboards();
      }
      return () => {};
    }, [fetchLeaderboards, lastUpdated])
  );

  // Background stale refresh every 30s while on this screen (cleared on blur/unmount)
  useFocusEffect(
    useCallback(() => {
      staleRefreshTimerRef.current = setInterval(() => {
        fetchLeaderboards();
      }, 30000);
      return () => {
        if (staleRefreshTimerRef.current) {
          clearInterval(staleRefreshTimerRef.current);
          staleRefreshTimerRef.current = null;
        }
      };
    }, [fetchLeaderboards])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaderboards();
  }, [fetchLeaderboards]);

  const getNormalizedRole = (account) =>
    (account?.privilege || account?.role || "student").toLowerCase();

  const getSubjectCode = (subject) =>
    subject?.subjectCode || subject?.sectionCode || "N/A";

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
      if (!userItem?._id) return;

      const baseRole = getNormalizedRole(userItem);
      const fallbackProfile = {
        basic: {
          _id: String(userItem?._id || ""),
          username: userItem?.username || "N/A",
          fullName: userItem?.fullName || userItem?.username || "N/A",
          email: userItem?.email || "N/A",
          profileImage: userItem?.profileImage || userItem?.profilePicture || null,
          role: baseRole,
        },
        student:
          baseRole === "student"
            ? {
                level: userItem?.maxLevelReached || 1,
                totalXP: userItem?.combinedScore || userItem?.totalXP || 0,
                totalGamesPlayed: userItem?.totalGamesPlayed || 0,
                cyberQuestGamesPlayed: userItem?.cyberQuestGamesPlayed || 0,
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

      setSelectedProfileData(fallbackProfile);
      setProfileModalError(null);
      setProfileModalVisible(true);

      if (profileDataCache[userItem._id]) {
        setSelectedProfileData(profileDataCache[userItem._id]);
        return;
      }

      try {
        setProfileModalLoading(true);
        const response = await fetch(`${API_URL}/users/${userItem._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Unable to load full profile details");
        }

        const payload = await response.json();
        const fetched = payload?.user || payload?.data || null;
        if (!fetched) {
          throw new Error("User profile data is unavailable");
        }

        const role = getNormalizedRole(fetched);
        const userId = String(fetched?._id || userItem._id);
        const allSections = await fetchSectionsCatalog();

        const enrolledSubjects = allSections.filter((section) => {
          const studentIds = Array.isArray(section?.students)
            ? section.students.map((studentId) => String(studentId))
            : [];
          const isInStudentsArray = studentIds.includes(userId);

          const sectionCodes = Array.isArray(fetched?.sections) ? fetched.sections : [];
          const matchesSectionCode =
            String(fetched?.section || "") === String(section?.sectionCode || "") ||
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
            primaryInstructor === userId ||
            additionalInstructors.includes(userId) ||
            createdBy === userId
          );
        });

        const availableSubjectsForInstructor = allSections.filter((section) => {
          const isHandled = handledSubjects.some(
            (handled) => String(handled?._id) === String(section?._id)
          );
          return !isHandled && section?.archived !== true && section?.isActive !== false;
        });

        const compiledProfile = {
          basic: {
            _id: userId,
            username: fetched?.username || "N/A",
            fullName: fetched?.fullName || fetched?.username || "N/A",
            email: fetched?.email || "N/A",
            profileImage: fetched?.profileImage || fetched?.profilePicture || null,
            role,
          },
          student:
            role === "student"
              ? {
                  level: fetched?.gamification?.level || 1,
                  totalXP: fetched?.gamification?.totalXP || 0,
                  totalGamesPlayed: fetched?.analytics?.totalGamesPlayed || 0,
                  cyberQuestGamesPlayed:
                    fetched?.analytics?.gamesByType?.cyberQuest || 0,
                  enrolledSubjects,
                }
              : null,
          instructor:
            role === "instructor"
              ? {
                  handledSubjects,
                  availableSubjects: availableSubjectsForInstructor,
                }
              : null,
        };

        setSelectedProfileData(compiledProfile);
        setProfileDataCache((current) => ({
          ...current,
          [userItem._id]: compiledProfile,
        }));
      } catch (err) {
        setProfileModalError(err.message || "Unable to open user profile");
      } finally {
        setProfileModalLoading(false);
      }
    },
    [fetchSectionsCatalog, profileDataCache, token]
  );

  // Get rank badge colors
  const getRankBadgeColor = (index) => {
    switch (index) {
      case 0:
        return isDarkMode ? COLORS.gold : "#FFD700";
      case 1:
        return isDarkMode ? "#E5E5E5" : "#C0C0C0";
      case 2:
        return isDarkMode ? "#DEB887" : "#CD7F32";
      default:
        return colors.primary;
    }
  };

  if (loading && !refreshing) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading Leaderboards...
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerContent}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/game")}
            accessibilityRole="button"
            accessibilityLabel="Go back to arcade"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={colors.text}
            />
          </TouchableOpacity>

          <MaterialCommunityIcons
            name="trophy"
            size={28}
            color={colors.primary}
          />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Leaderboards
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            accessibilityRole="button"
            accessibilityLabel="Refresh leaderboard"
            style={styles.refreshButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={22}
              color={colors.text}
              style={lastUpdated ? {} : { opacity: 0.7 }}
            />
          </TouchableOpacity>
        </View>

        {/* Subject filter by role */}
        {availableSections.length > 0 && (
          <View
            style={[styles.filterContainer, { backgroundColor: colors.card }]}
          >
            <MaterialCommunityIcons
              name="filter-variant"
              size={20}
              color={colors.text}
              style={styles.filterIcon}
            />
            <Picker
              selectedValue={selectedSection}
              onValueChange={(itemValue) => setSelectedSection(itemValue)}
              style={[styles.picker, { color: colors.text }]}
              dropdownIconColor={colors.text}
              mode="dropdown"
              itemStyle={Platform.OS === "ios" ? styles.pickerItem : undefined}
            >
              {isAdmin && <Picker.Item label="All Subjects" value="all" />}
              {availableSections.map((subject) => (
                <Picker.Item
                  key={subject._id || subject.id || subject}
                  label={subject.name || subject}
                  value={subject._id || subject.id || subject}
                />
              ))}
            </Picker>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {/* Current User Rank Card - Only for Students */}
        {currentUserRank && !isInstructorOrAdmin && (
          <TouchableOpacity
            style={[
              styles.userRankCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => openUserProfileModal(currentUserRank)}
            activeOpacity={0.86}
          >
            <Text style={[styles.userRankTitle, { color: colors.primary }]}>
              Your Ranking
            </Text>
            <View style={styles.userRankContent}>
              <View
                style={[
                  styles.rankBadge,
                  {
                    backgroundColor: getRankBadgeColor(
                      currentUserRank.rank - 1
                    ),
                  },
                ]}
              >
                <Text style={styles.rankBadgeText}>
                  #{currentUserRank.rank}
                </Text>
              </View>
              <Image
                source={
                  currentUserRank.profileImage
                    ? { uri: getImageUrl(currentUserRank.profileImage) }
                    : require("../../assets/images/character1.png")
                }
                style={styles.userAvatar}
              />
              <View style={styles.userInfo}>
                <Text style={[styles.username, { color: colors.text }]}>
                  {currentUserRank.username}
                </Text>
                <Text style={[styles.userXP, { color: colors.textSecondary }]}>
                  {`${
                    currentUserRank.combinedScore ||
                    currentUserRank.totalXP ||
                    0
                  } XP`}
                </Text>
                {/* Level label removed as requested */}
                {currentUserRank.maxLevelReached > 1 && (
                  <Text style={[styles.userLevel, { color: colors.primary }]}>
                    Max CQ Level: {currentUserRank.maxLevelReached}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Error State */}
        {error && (
          <View
            style={[styles.errorContainer, { backgroundColor: colors.card }]}
          >
            <MaterialCommunityIcons
              name="alert-circle"
              size={48}
              color={colors.error}
            />
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={fetchLeaderboards}
            >
              <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!error && leaders.length === 0 && (
          <View
            style={[styles.emptyContainer, { backgroundColor: colors.card }]}
          >
            <MaterialCommunityIcons
              name="trophy-broken"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Rankings Yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {selectedSection === "all"
                ? "Complete quizzes to appear on the leaderboard"
                : (() => {
                    const selected = availableSections.find(
                      (s) => (s._id || s.id || s) === selectedSection
                    );
                    return `No students found in ${
                      selected?.name || "this subject"
                    }`;
                  })()}
            </Text>
          </View>
        )}

        {/* Leaderboard List */}
        {!error && leaders.length > 0 && (
          <View style={styles.leaderboardList}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Top Performers
              {selectedSection !== "all" && (
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {" "}
                  in{" "}
                  {(() => {
                    const subj =
                      availableSections.find(
                        (s) =>
                          (s._id || s.id || s) === selectedSection
                      ) || {};
                    return subj.name || selectedSection;
                  })()}
                </Text>
              )}
            </Text>

            {leaders.map((user, index) => (
              <TouchableOpacity
                key={user._id}
                style={[
                  styles.leaderCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  index < 3 && styles.topThreeCard,
                ]}
                onPress={() => openUserProfileModal(user)}
                activeOpacity={0.86}
              >
                <View
                  style={[
                    styles.rankBadge,
                    { backgroundColor: getRankBadgeColor(index) },
                  ]}
                >
                  <Text style={styles.rankBadgeText}>#{index + 1}</Text>
                </View>

                <Image
                  source={
                    user.profileImage
                      ? { uri: getImageUrl(user.profileImage) }
                      : require("../../assets/images/character1.png")
                  }
                  style={styles.avatar}
                />

                <View style={styles.userDetails}>
                  <Text style={[styles.leaderUsername, { color: colors.text }]}>
                    {user.username}
                    {index === 0 && " 👑"}
                  </Text>
                  {/* Section label removed as requested */}
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <MaterialCommunityIcons
                        name="star"
                        size={16}
                        color={COLORS.gold}
                      />
                      <Text
                        style={[
                          styles.statText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {`${user.combinedScore || user.totalXP || 0} XP`}
                      </Text>
                    </View>
                    {/* Level label removed as requested */}
                  </View>
                  {user.maxLevelReached > 1 && (
                    <View style={styles.cqLevelContainer}>
                      <View style={styles.statItem}>
                        <MaterialCommunityIcons
                          name="trophy"
                          size={16}
                          color="#FF6B6B"
                        />
                        <Text
                          style={[
                            styles.statText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          CQ Lv.{user.maxLevelReached}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {index < 3 && (
                  <MaterialCommunityIcons
                    name="medal"
                    size={24}
                    color={getRankBadgeColor(index)}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setProfileModalVisible(false);
          setProfileModalError(null);
        }}
      >
        <View style={styles.profileModalOverlay}>
          <View style={[styles.profileModalContent, { backgroundColor: colors.card }]}> 
            <View style={styles.profileModalHeader}>
              <Text style={[styles.profileModalTitle, { color: colors.text }]}>User Profile</Text>
              <TouchableOpacity
                onPress={() => {
                  setProfileModalVisible(false);
                  setProfileModalError(null);
                }}
              >
                <MaterialCommunityIcons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {profileModalLoading && !selectedProfileData ? (
              <View style={styles.profileModalLoadingWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.profileModalInfoText, { color: colors.textSecondary }]}>Loading profile...</Text>
              </View>
            ) : selectedProfileData ? (
              <ScrollView
                style={styles.profileScrollArea}
                contentContainerStyle={styles.profileScrollContent}
                showsVerticalScrollIndicator={Platform.OS === "web"}
              >
                {profileModalError ? (
                  <View style={styles.profileInlineWarning}>
                    <MaterialCommunityIcons
                      name="alert-circle-outline"
                      size={16}
                      color={colors.warning || "#FF9800"}
                    />
                    <Text style={styles.profileInlineWarningText}>{profileModalError}</Text>
                  </View>
                ) : null}

                <LinearGradient
                  colors={["rgba(95, 210, 205, 0.28)", "rgba(202, 241, 200, 0.18)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.profileHero}
                >
                  <View style={styles.profileHeroTop}>
                    <View style={styles.profileAvatarBadge}>
                      {selectedProfileData.basic.profileImage ? (
                        <Image
                          source={{ uri: getImageUrl(selectedProfileData.basic.profileImage) }}
                          style={styles.profileAvatarImage}
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
                      <Text style={styles.profileHeroName}>{selectedProfileData.basic.fullName}</Text>
                      <Text style={styles.profileHeroUsername}>@{selectedProfileData.basic.username}</Text>
                    </View>
                    <View style={styles.profileRoleBadgePill}>
                      <Text style={styles.profileRoleBadgeText}>{selectedProfileData.basic.role}</Text>
                    </View>
                  </View>
                </LinearGradient>

                <View style={styles.profileCard}>
                  <Text style={styles.profileCardTitle}>Account Details</Text>
                  <View style={styles.profileInfoRow}>
                    <Text style={styles.profileInfoLabel}>Username</Text>
                    <Text style={styles.profileInfoValue}>{selectedProfileData.basic.username}</Text>
                  </View>
                  <View style={styles.profileInfoDivider} />
                  <View style={styles.profileInfoRow}>
                    <Text style={styles.profileInfoLabel}>Name</Text>
                    <Text style={styles.profileInfoValue}>{selectedProfileData.basic.fullName}</Text>
                  </View>
                  <View style={styles.profileInfoDivider} />
                  <View style={styles.profileInfoRow}>
                    <Text style={styles.profileInfoLabel}>Email</Text>
                    <Text style={styles.profileInfoValue}>{selectedProfileData.basic.email}</Text>
                  </View>
                  <View style={styles.profileInfoDivider} />
                  <View style={styles.profileInfoRow}>
                    <Text style={styles.profileInfoLabel}>Role</Text>
                    <Text style={styles.profileInfoValue}>{selectedProfileData.basic.role}</Text>
                  </View>
                </View>

                {selectedProfileData.student && (
                  <>
                    <View style={styles.profileCard}>
                      <Text style={styles.profileCardTitle}>Student CyberQuest Progress</Text>
                      <View style={styles.profileStatsWrap}>
                        <View style={styles.profileStatChip}>
                          <Text style={styles.profileStatLabel}>Level</Text>
                          <Text style={styles.profileStatValue}>{selectedProfileData.student.level}</Text>
                        </View>
                        <View style={styles.profileStatChip}>
                          <Text style={styles.profileStatLabel}>XP</Text>
                          <Text style={styles.profileStatValue}>{selectedProfileData.student.totalXP}</Text>
                        </View>
                        <View style={styles.profileStatChip}>
                          <Text style={styles.profileStatLabel}>All Games</Text>
                          <Text style={styles.profileStatValue}>{selectedProfileData.student.totalGamesPlayed}</Text>
                        </View>
                        <View style={styles.profileStatChip}>
                          <Text style={styles.profileStatLabel}>CyberQuest</Text>
                          <Text style={styles.profileStatValue}>{selectedProfileData.student.cyberQuestGamesPlayed}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.profileCard}>
                      <View style={styles.profileSectionHeaderRow}>
                        <Text style={styles.profileCardTitle}>Enrolled Subjects</Text>
                        <Text style={styles.profileSectionCount}>{selectedProfileData.student.enrolledSubjects.length}</Text>
                      </View>
                      {selectedProfileData.student.enrolledSubjects.length > 0 ? (
                        selectedProfileData.student.enrolledSubjects.map((subject) => (
                          <View key={String(subject._id)} style={styles.profileSubjectItem}>
                            <View style={styles.profileSubjectRow}>
                              <MaterialCommunityIcons
                                name="book-open-page-variant"
                                size={16}
                                color={colors.primary}
                              />
                              <Text style={styles.profileSubjectName}>{subject.name}</Text>
                            </View>
                            <Text style={styles.profileSubjectMeta}>Code: {getSubjectCode(subject)}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.profileEmptyText}>No enrolled subjects found.</Text>
                      )}
                    </View>
                  </>
                )}

                {selectedProfileData.instructor && (
                  <>
                    <View style={styles.profileCard}>
                      <View style={styles.profileSectionHeaderRow}>
                        <Text style={styles.profileCardTitle}>Handled Subjects</Text>
                        <Text style={styles.profileSectionCount}>{selectedProfileData.instructor.handledSubjects.length}</Text>
                      </View>
                      {selectedProfileData.instructor.handledSubjects.length > 0 ? (
                        selectedProfileData.instructor.handledSubjects.map((subject) => (
                          <View key={String(subject._id)} style={styles.profileSubjectItem}>
                            <View style={styles.profileSubjectRow}>
                              <MaterialCommunityIcons
                                name="school-outline"
                                size={16}
                                color={colors.primary}
                              />
                              <Text style={styles.profileSubjectName}>{subject.name}</Text>
                            </View>
                            <Text style={styles.profileSubjectMeta}>Code: {getSubjectCode(subject)}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.profileEmptyText}>No handled subjects found.</Text>
                      )}
                    </View>

                    <View style={styles.profileCard}>
                      <View style={styles.profileSectionHeaderRow}>
                        <Text style={styles.profileCardTitle}>Available Subjects</Text>
                        <Text style={styles.profileSectionCount}>{selectedProfileData.instructor.availableSubjects.length}</Text>
                      </View>
                      {selectedProfileData.instructor.availableSubjects.length > 0 ? (
                        selectedProfileData.instructor.availableSubjects.map((subject) => (
                          <View key={String(subject._id)} style={styles.profileSubjectItem}>
                            <View style={styles.profileSubjectRow}>
                              <MaterialCommunityIcons
                                name="book-outline"
                                size={16}
                                color={colors.primary}
                              />
                              <Text style={styles.profileSubjectName}>{subject.name}</Text>
                            </View>
                            <Text style={styles.profileSubjectMeta}>Code: {getSubjectCode(subject)}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.profileEmptyText}>No available subjects found.</Text>
                      )}
                    </View>
                  </>
                )}
              </ScrollView>
            ) : (
              <View style={styles.profileModalLoadingWrap}>
                <Text style={[styles.profileModalInfoText, { color: colors.textSecondary }]}>No profile data available.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    ...(Platform.OS === "web" && {
      alignItems: "center",
    }),
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 16,
    ...(Platform.OS === "web" && {
      width: "100%",
      maxWidth: 800,
    }),
  },
  backButton: {
    position: "absolute",
    left: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 8,
  },
  refreshButton: {
    position: "absolute",
    right: 0,
    padding: 4,
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    minHeight: 50,
    ...(Platform.OS === "web" && {
      width: "100%",
      maxWidth: 800,
      overflow: "visible",
    }),
  },
  filterIcon: {
    marginRight: 8,
  },
  picker: {
    flex: 1,
    height: 50,
    ...(Platform.OS === "web" && {
      cursor: "pointer",
    }),
  },
  pickerItem: {
    height: 120,
  },
  scrollView: {
    flex: 1,
    ...(Platform.OS === "web" && {
      alignSelf: "center",
      width: "100%",
      maxWidth: 800,
    }),
  },
  scrollContent: {
    padding: 20,
    ...(Platform.OS === "web" && {
      paddingHorizontal: 10,
    }),
  },
  userRankCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === "web" && {
      maxWidth: 800,
      width: "100%",
    }),
  },
  userRankTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  userRankContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  rankBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  rankBadgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: "bold",
  },
  userXP: {
    fontSize: 16,
    marginTop: 2,
  },
  userLevel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  errorContainer: {
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    ...(Platform.OS === "web" && {
      maxWidth: 600,
      alignSelf: "center",
      width: "100%",
    }),
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 16,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 40,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    ...(Platform.OS === "web" && {
      maxWidth: 600,
      alignSelf: "center",
      width: "100%",
    }),
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  leaderboardList: {
    marginBottom: 20,
    ...(Platform.OS === "web" && {
      maxWidth: 800,
      width: "100%",
    }),
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: "normal",
  },
  leaderCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topThreeCard: {
    borderWidth: 2,
    shadowOpacity: 0.15,
    elevation: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginHorizontal: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  userDetails: {
    flex: 1,
  },
  leaderUsername: {
    fontSize: 18,
    fontWeight: "bold",
  },
  leaderSection: {
    fontSize: 14,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: "row",
    marginTop: 8,
  },
  cqLevelContainer: {
    flexDirection: "row",
    marginTop: 4,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statText: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: "500",
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.58)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  profileModalContent: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  profileModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  profileModalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  profileModalLoadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  profileModalInfoText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "600",
  },
  profileModalErrorText: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "600",
  },
  profileBody: {
    gap: 12,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  profileTopText: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "800",
  },
  profileUsername: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
  },
  profileRole: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  profileInfoCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  profileInfoRowText: {
    fontSize: 14,
    fontWeight: "600",
  },
  profileScrollArea: {
    maxHeight: Platform.OS === "web" ? 560 : 520,
  },
  profileScrollContent: {
    paddingBottom: 6,
  },
  profileInlineWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255, 152, 0, 0.12)",
  },
  profileInlineWarningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#B45309",
  },
  profileHero: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
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
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: "rgba(95, 210, 205, 0.35)",
    marginRight: 10,
  },
  profileAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profileHeroTextWrap: {
    flex: 1,
  },
  profileHeroName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  profileHeroUsername: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  profileRoleBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(14, 116, 144, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(14, 116, 144, 0.25)",
  },
  profileRoleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F766E",
    textTransform: "capitalize",
  },
  profileCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.28)",
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 12,
    marginBottom: 10,
  },
  profileCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },
  profileInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    gap: 12,
  },
  profileInfoLabel: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  profileInfoValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "700",
  },
  profileInfoDivider: {
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.22)",
  },
  profileStatsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  profileStatChip: {
    minWidth: 104,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.28)",
    backgroundColor: "rgba(236, 253, 245, 0.7)",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  profileStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  profileStatValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  profileSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  profileSectionCount: {
    minWidth: 24,
    textAlign: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "800",
    color: "#0F766E",
    backgroundColor: "rgba(20, 184, 166, 0.14)",
  },
  profileSubjectItem: {
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "rgba(248, 250, 252, 0.9)",
  },
  profileSubjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profileSubjectName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  profileSubjectMeta: {
    marginTop: 4,
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  profileEmptyText: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
  },
});
