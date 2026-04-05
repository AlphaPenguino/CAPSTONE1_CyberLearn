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
          <View
            style={[
              styles.userRankCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.primary,
              },
            ]}
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
          </View>
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
              <View
                key={user._id}
                style={[
                  styles.leaderCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  index < 3 && styles.topThreeCard,
                ]}
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
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
});
