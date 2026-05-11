import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Dimensions,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { API_URL } from "../../constants/api";

export default function InstructorAnalytics({ embedded = false, onBack = null }) {
  const { user, token } = useAuthStore();
  const { colors } = useTheme();
  const router = useRouter();
  const handleBack = useCallback(() => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    router.replace({
      pathname: "/(tabs)/instructor",
      params: { tab: "tools" },
    });
  }, [onBack, router]);

  // State management
  const [studentData, setStudentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [selectedGameLogTab, setSelectedGameLogTab] = useState("digital_defenders");
  const [showCyberQuestHistory, setShowCyberQuestHistory] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("all");
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [subjectsLoaded, setSubjectsLoaded] = useState(false);
  // Removed card expansion state (recent game results hidden)

  const fetchAvailableSubjects = useCallback(async () => {
    if (!token) {
      setAvailableSubjects([]);
      setSelectedSubjectId("all");
      setSubjectsLoaded(true);
      return;
    }

    try {
      setSubjectsLoaded(false);
      const response = await fetch(`${API_URL}/subjects/user-subjects`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch subjects: ${response.status}`);
      }

      const data = await response.json();
      const subjects = (data.subjects || []).map((subject) => ({
        _id: String(subject._id || subject.id || ""),
        name: subject.name || "Unnamed Subject",
      }));

      const normalizedSubjects = subjects.filter((subject) => subject._id);
      setAvailableSubjects(normalizedSubjects);
      setSelectedSubjectId((previous) => {
        if (previous === "all") return "all";
        const stillExists = normalizedSubjects.some(
          (subject) => subject._id === previous
        );
        return stillExists ? previous : "all";
      });
    } catch (err) {
      console.error("Error fetching subjects for analytics:", err);
      setAvailableSubjects([]);
      setSelectedSubjectId("all");
    } finally {
      setSubjectsLoaded(true);
    }
  }, [token]);

  // Fetch student analytics data
  const fetchStudentAnalytics = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedSubjectId && selectedSubjectId !== "all") {
        params.set("subjectId", selectedSubjectId);
      }

      const response = await fetch(
        `${API_URL}/instructor/analytics/students${
          params.toString() ? `?${params.toString()}` : ""
        }`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setStudentData(data.data);
      } else {
        throw new Error(data.message || "Failed to fetch student analytics");
      }
    } catch (err) {
      console.error("Error fetching student analytics:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubjectId, token]);

  const formatCount = (value) =>
    typeof value === "number" ? value : "N/A";

  const toNum = (value) => {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const toNonEmptyText = (...values) => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return null;
  };

  const resolveGameTitle = (game) =>
    toNonEmptyText(
      game?.title,
      game?.cyberQuestTitle,
      game?.questTitle,
      game?.quizTitle,
      game?.moduleTitle,
      game?.name,
      game?.meta?.title,
      game?.meta?.cyberQuestTitle,
      game?.meta?.questTitle
    ) || "Untitled CyberQuest";

  const resolveGameLevelLabel = (game) => {
    const levelTitle = toNonEmptyText(
      game?.levelTitle,
      game?.questLevelTitle,
      game?.cyberQuestLevelTitle,
      game?.moduleLevelTitle,
      game?.meta?.levelTitle,
      game?.meta?.questLevelTitle
    );

    if (levelTitle) return levelTitle;

    const levelNumber =
      toNum(game?.level) ??
      toNum(game?.questLevel) ??
      toNum(game?.cyberQuestLevel);

    return typeof levelNumber === "number" ? `Level ${levelNumber}` : "N/A";
  };

  const getCyberQuestCount = (game, key) => {
    const directValue = toNum(game[key]);
    if (typeof directValue === "number") {
      return directValue;
    }

    const totalQuestions = toNum(game.totalQuestions);

    if (key === "correctAnswers") {
      const score = toNum(game.score);
      if (typeof totalQuestions === "number" && typeof score === "number") {
        return Math.max(Math.round((score / 100) * totalQuestions), 0);
      }
      return null;
    }

    if (key === "incorrectAnswers") {
      const correct = toNum(game.correctAnswers);
      if (
        typeof totalQuestions === "number" &&
        typeof correct === "number"
      ) {
        return Math.max(totalQuestions - correct, 0);
      }
    }

    return null;
  };

  const selectedSubjectName =
    selectedSubjectId !== "all"
      ? availableSubjects.find((subject) => subject._id === selectedSubjectId)
          ?.name || null
      : null;

  const normalizeText = (value) =>
    typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;

  const GAME_LOG_TABS = [
    { id: "digital_defenders", label: "Digital Defenders" },
    { id: "quickplay", label: "Quick Play" },
    { id: "rain_of_words", label: "Rain of Words" },
  ];

  const matchesSelectedSubject = (game) => {
    if (!selectedSubjectId || selectedSubjectId === "all") return true;

    const gameSubjectId =
      game?.subjectId != null ? String(game.subjectId).trim() : null;
    if (gameSubjectId && gameSubjectId === selectedSubjectId) {
      return true;
    }

    const normalizedGameSubject = normalizeText(game?.subject);
    const normalizedSelectedName = normalizeText(selectedSubjectName);
    if (
      normalizedGameSubject &&
      normalizedSelectedName &&
      normalizedGameSubject === normalizedSelectedName
    ) {
      return true;
    }

    return false;
  };

  const computeGameStats = (student, gameType) => {
    const logs = (student.gameplayLogs || []).filter((l) => l?.gameType === gameType);
    const gamesPlayed = logs.length;
    let latestScore = null;
    let latestTime = 0;
    let sum = 0;
    let count = 0;
    const players = new Set();

    logs.forEach((l) => {
      const ts = l?.timestamp ? new Date(l.timestamp).getTime() : 0;
      const score = typeof l.score === "number" ? l.score : l?.details?.score ?? l?.details?.playerScore ?? l?.details?.finalScore;
      if (typeof score === "number") {
        sum += score;
        count += 1;
        if (ts > latestTime) {
          latestTime = ts;
          latestScore = score;
        }
      }

      const det = l.details || {};
      if (Array.isArray(det.players)) {
        det.players.forEach((p) => {
          if (!p) return;
          const name = typeof p === "string" ? p : p.username || p.name || p.playerName;
          if (name) players.add(name);
        });
      }
      if (det.playerName && det.playerName !== student.studentName) players.add(det.playerName);
      if (det.opponent && det.opponent !== student.studentName) players.add(det.opponent);
      if (l.username && l.username !== student.studentName) players.add(l.username);
    });

    const avgScore = count ? Math.round(sum / count) : null;

    return {
      gamesPlayed,
      latestScore,
      avgScore,
      players: Array.from(players).slice(0, 8),
    };
  };

  // Load data on component mount
  useEffect(() => {
    fetchAvailableSubjects();
  }, [fetchAvailableSubjects]);

  useEffect(() => {
    if (!subjectsLoaded) return;
    fetchStudentAnalytics();
  }, [subjectsLoaded, fetchStudentAnalytics]);

  useEffect(() => {
    setExpandedStudent(null);
  }, [selectedSubjectId]);

  const createStyles = () => {
    const screenWidth =
      Platform.OS === "web"
        ? typeof window !== "undefined"
          ? window.innerWidth
          : 1024
        : Dimensions.get("window").width;
    const isSmallScreen = screenWidth < 600;
    const isAndroid = Platform.OS === "android";

    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: embedded ? "transparent" : colors.surface,
      },
      pageWrapper: {
        flex: 1,
        width: "100%",
        maxWidth: 1200,
        alignSelf: "center",
        // Remove horizontal padding on Android mobile per request
        paddingHorizontal: isAndroid ? 0 : 48,
        paddingBottom: 32,
        ...(isSmallScreen && !isAndroid ? { paddingHorizontal: 16 } : {}),
      },
      header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 20,
        // horizontal spacing managed by pageWrapper
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      backButton: {
        padding: 8,
      },
      title: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.text,
      },
      placeholder: {
        width: 40,
      },
      content: {
        flex: 1,
        paddingTop: 16,
        // horizontal padding removed to rely on pageWrapper for consistent whitespace
      },
      overviewContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.text,
        marginBottom: 16,
      },
      statsGrid: {
        flexDirection: "row",
        justifyContent: "space-around",
      },
      statCard: {
        alignItems: "center",
      },
      statNumber: {
        fontSize: 24,
        fontWeight: "bold",
        color: colors.text,
        marginTop: 8,
      },
      statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
      },
      studentsContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 20,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      searchBarContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 16,
        gap: 8,
      },
      filterContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        marginBottom: 12,
      },
      filterIcon: {
        marginRight: 8,
      },
      picker: {
        flex: 1,
        height: Platform.OS === "ios" ? 160 : 50,
        color: colors.text,
      },
      searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
        padding: 0,
      },
      clearButton: {
        padding: 4,
        borderRadius: 16,
        backgroundColor: colors.card,
      },
      clearButtonText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: "600",
      },
      studentCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
      },
      studentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
      },
      studentInfo: {
        flex: 1,
      },
      studentName: {
        fontSize: 16,
        fontWeight: "bold",
        color: colors.text,
        marginBottom: 4,
      },
      studentEmail: {
        fontSize: 12,
        color: colors.textSecondary,
      },
      // Removed right-side badge and percentage styles
      studentStats: {
        display: "none",
      },
      quickStats: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      },
      quickStatItem: {
        flexDirection: "row",
        alignItems: "center",
      },
      quickStatText: {
        fontSize: 12,
        color: colors.textSecondary,
        marginLeft: 4,
      },
      historyButton: {
        marginTop: 16,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: "#45db8b",
        borderRadius: 6,
        alignSelf: "flex-start",
      },
      historyButtonText: {
        color: "#FFFFFF",
        fontWeight: "600",
        fontSize: 12,
      },
      historyContainer: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      },
      historyItem: {
        marginBottom: 12,
        paddingLeft: 8,
        borderLeftWidth: 2,
        borderLeftColor: colors.primary,
      },
      historyTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: colors.text,
      },
      historyDetails: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
      },
      // Removed expanded recent game result styles
      unauthorizedContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
      },
      unauthorizedText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        marginTop: 16,
      },
      loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
      },
      loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 16,
        textAlign: "center",
      },
      errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
      },
      errorText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#F44336",
        marginTop: 16,
        textAlign: "center",
      },
      errorSubText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 8,
        textAlign: "center",
      },
      retryButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 16,
      },
      retryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
      },
      emptyContainer: {
        alignItems: "center",
        padding: 40,
      },
      emptyText: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.text,
        marginTop: 16,
        textAlign: "center",
      },
      emptySubText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 8,
        textAlign: "center",
      },
      noGamesText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontStyle: "italic",
        textAlign: "center",
        paddingVertical: 20,
      },
      gameplayLogsContainer: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      },
      gameplayLogsTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 10,
      },
      globalGameTabsWrap: {
        marginTop: 4,
        marginBottom: 12,
      },
      globalGameTabsTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 8,
      },
      gameTabsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 10,
      },
      gameTabButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      },
      gameTabButtonActive: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}20`,
      },
      gameTabButtonText: {
        fontSize: 12,
        fontWeight: "700",
        color: colors.textSecondary,
      },
      gameTabButtonTextActive: {
        color: colors.primary,
      },
      monitorStatsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 12,
      },
      monitorStatChip: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: 8,
        paddingVertical: 6,
      },
      monitorStatLabel: {
        fontSize: 11,
        color: colors.textSecondary,
      },
      monitorStatValue: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: "700",
        color: colors.text,
      },
      gameplayLogItem: {
        marginBottom: 10,
        paddingLeft: 8,
        borderLeftWidth: 2,
        borderLeftColor: colors.primary,
      },
      gameplayLogHeadline: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.text,
      },
      gameplayLogMeta: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
      },
    });
  };

  const styles = createStyles();

  // Check if user is instructor or admin
  if (user?.privilege !== "instructor" && user?.privilege !== "admin") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.unauthorizedContainer}>
          <MaterialCommunityIcons
            name="lock"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.unauthorizedText}>
            This feature is only available for instructors
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Helper functions

  const analyticsContent = (
    <View style={styles.pageWrapper}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.title}>Student Analytics</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Loading State */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>
                Loading student analytics...
              </Text>
            </View>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={48}
                color="#F44336"
              />
              <Text style={styles.errorText}>Failed to load analytics</Text>
              <Text style={styles.errorSubText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchStudentAnalytics}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Content */}
          {studentData && !isLoading && !error && (
            <>
              {/* Student Overview */}
              <View style={styles.overviewContainer}>
                <Text style={styles.sectionTitle}>Student Overview</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <MaterialCommunityIcons
                      name="account-group"
                      size={24}
                      color={colors.primary}
                    />
                    <Text style={styles.statNumber}>
                      {studentData.summary.totalStudents}
                    </Text>
                    <Text style={styles.statLabel}>Students</Text>
                  </View>

                  <View style={styles.statCard}>
                    <MaterialCommunityIcons
                      name="gamepad-variant"
                      size={24}
                      color="#FF9800"
                    />
                    <Text style={styles.statNumber}>
                      {studentData.summary.totalGames}
                    </Text>
                    <Text style={styles.statLabel}>Total Games Recorded</Text>
                  </View>
                </View>

                <View style={styles.globalGameTabsWrap}>
                  <Text style={styles.globalGameTabsTitle}>
                    Game Log Sort
                  </Text>
                  <View style={styles.gameTabsContainer}>
                    {GAME_LOG_TABS.map((tab) => {
                      const isActive = selectedGameLogTab === tab.id;
                      return (
                        <TouchableOpacity
                          key={`global-${tab.id}`}
                          style={[
                            styles.gameTabButton,
                            isActive && styles.gameTabButtonActive,
                          ]}
                          onPress={() => setSelectedGameLogTab(tab.id)}
                        >
                          <Text
                            style={[
                              styles.gameTabButtonText,
                              isActive && styles.gameTabButtonTextActive,
                            ]}
                          >
                            {tab.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => setShowCyberQuestHistory((v) => !v)}
                    style={[
                      styles.gameTabButton,
                      showCyberQuestHistory && styles.gameTabButtonActive,
                    ]}
                  >
                    <Text style={[styles.gameTabButtonText, showCyberQuestHistory && styles.gameTabButtonTextActive]}>
                      {showCyberQuestHistory ? "Hide CyberQuest History" : "Show CyberQuest History"}
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                    Toggle CyberQuest history visible in expanded student cards
                  </Text>
                </View>
              </View>

              {/* Student List */}
              <View style={styles.studentsContainer}>
                <Text style={styles.sectionTitle}>Student Performance</Text>

                {/* Subject Filter */}
                {availableSubjects.length > 0 && (
                  <View style={styles.filterContainer}>
                    <MaterialCommunityIcons
                      name="filter-variant"
                      size={18}
                      color={colors.textSecondary}
                      style={styles.filterIcon}
                    />
                    <Picker
                      selectedValue={selectedSubjectId}
                      onValueChange={(value) => setSelectedSubjectId(value)}
                      style={styles.picker}
                      dropdownIconColor={colors.textSecondary}
                      mode="dropdown"
                    >
                      <Picker.Item label="All Subjects" value="all" />
                      {availableSubjects.map((subject) => (
                        <Picker.Item
                          key={subject._id}
                          label={subject.name}
                          value={subject._id}
                        />
                      ))}
                    </Picker>
                  </View>
                )}

                {/* Search Bar */}
                <View style={styles.searchBarContainer}>
                  <MaterialCommunityIcons
                    name="magnify"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <TextInput
                    placeholder="Search students by name"
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchInput}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery("")}
                      style={styles.clearButton}
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={16}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Filtered Students */}
                {studentData.students
                  .filter((s) =>
                    s.studentName
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase().trim())
                  )
                  .sort((a, b) => a.studentName.localeCompare(b.studentName))
                  .length === 0 && (
                  <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons
                      name="account-search"
                      size={48}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.emptyText}>No matches found</Text>
                    <Text style={styles.emptySubText}>
                      Try a different name or clear the search
                    </Text>
                  </View>
                )}

                {studentData.students.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons
                      name="account-school"
                      size={64}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.emptyText}>No students found</Text>
                    <Text style={styles.emptySubText}>
                      Students will appear here once they start taking quizzes
                    </Text>
                  </View>
                ) : (
                  studentData.students
                    .filter((s) =>
                      s.studentName
                        ?.toLowerCase()
                        .includes(searchQuery.toLowerCase().trim())
                    )
                    .sort((a, b) => {
                      const aLogs = (a.gameplayLogs || []).filter(
                        (log) => log?.gameType === selectedGameLogTab
                      );
                      const bLogs = (b.gameplayLogs || []).filter(
                        (log) => log?.gameType === selectedGameLogTab
                      );

                      if (bLogs.length !== aLogs.length) {
                        return bLogs.length - aLogs.length;
                      }

                      const aLatest = aLogs[0]?.timestamp
                        ? new Date(aLogs[0].timestamp).getTime()
                        : 0;
                      const bLatest = bLogs[0]?.timestamp
                        ? new Date(bLogs[0].timestamp).getTime()
                        : 0;

                      if (bLatest !== aLatest) {
                        return bLatest - aLatest;
                      }

                      return a.studentName.localeCompare(b.studentName);
                    })
                    .map((student) => (
                      <View key={student.id} style={styles.studentCard}>
                        <View style={styles.studentHeader}>
                          <View style={styles.studentInfo}>
                            <Text style={styles.studentName}>
                              {student.studentName}
                            </Text>
                            <Text style={styles.studentEmail}>
                              {student.email}
                            </Text>
                          </View>
                          {/* Right-side badge and percentage removed */}
                        </View>

                        <View style={styles.quickStats}>
                          <View style={styles.quickStatItem}>
                            <MaterialCommunityIcons
                              name="gamepad"
                              size={16}
                              color={colors.textSecondary}
                            />
                            <Text style={styles.quickStatText}>
                              {student.gamesPlayed} games
                            </Text>
                          </View>
                          <View style={styles.quickStatItem}>
                            <MaterialCommunityIcons
                              name="trophy"
                              size={16}
                              color={colors.textSecondary}
                            />
                            <Text style={styles.quickStatText}>
                              {typeof student.combinedScore === "number"
                                ? `${student.combinedScore} XP`
                                : "0 XP"}
                            </Text>
                          </View>
                          {/* Completion percentage on the right removed */}
                        </View>

                        <TouchableOpacity
                          style={styles.historyButton}
                          onPress={() =>
                            setExpandedStudent(
                              expandedStudent === student.id ? null : student.id
                            )
                          }
                        >
                          <Text style={styles.historyButtonText}>
                            {expandedStudent === student.id
                              ? "Hide CyberQuest History"
                              : "View CyberQuest History"}
                          </Text>
                        </TouchableOpacity>

                        {expandedStudent === student.id && (
                          <View style={styles.historyContainer}>
                            {showCyberQuestHistory ? (
                              ((student.cyberQuestHistory?.length > 0
                                ? student.cyberQuestHistory
                                : student.gameHistory?.filter(
                                    (game) => game.type === "cyberQuest"
                                  ) || [])
                                .filter(matchesSelectedSubject)).length > 0 ? (
                                (student.cyberQuestHistory?.length > 0
                                  ? student.cyberQuestHistory
                                  : student.gameHistory?.filter(
                                      (game) => game.type === "cyberQuest"
                                    ) || [])
                                  .filter(matchesSelectedSubject)
                                  .map((game, index) => {
                                    const resolvedTitle = resolveGameTitle(game);
                                    const resolvedLevelLabel = resolveGameLevelLabel(game);
                                     const resolvedCorrect = getCyberQuestCount(
                                       game,
                                       "correctAnswers"
                                     );
                                     const resolvedIncorrect =
                                      typeof game.incorrectAnswers === "number"
                                        ? game.incorrectAnswers
                                        : typeof game.totalQuestions === "number" &&
                                          typeof resolvedCorrect === "number"
                                        ? Math.max(
                                            game.totalQuestions - resolvedCorrect,
                                            0
                                          )
                                        : null;

                                     return (
                                       <View
                                         key={game.id || index}
                                         style={styles.historyItem}
                                       >
                                         <Text style={styles.historyTitle}>
                                          {resolvedTitle}
                                         </Text>
 
                                         <Text style={styles.historyDetails}>
                                          Level: {resolvedLevelLabel} • Attempt: {game.attemptNumber ?? index + 1}
                                         </Text>
                                         <Text style={styles.historyDetails}>
                                           Score: {" "}
                                          {typeof toNum(game.score) === "number"
                                            ? `${toNum(game.score)}%`
                                            : "N/A"}
                                          {typeof game.passed === "boolean"
                                            ? ` • ${game.passed ? "Passed" : "In progress"}`
                                            : ""}
                                         </Text>
                                         <Text style={styles.historyDetails}>
                                          Correct: {formatCount(resolvedCorrect)} • Incorrect: {formatCount(resolvedIncorrect)}
                                          {typeof toNum(game.totalQuestions) === "number"
                                            ? ` • Total: ${toNum(game.totalQuestions)}`
                                            : ""}
                                         </Text>
                                         <Text style={styles.historyDetails}>
                                          Difficulty: {game.difficulty || "medium"}
                                         </Text>
                                         <Text style={styles.historyDetails}>
                                          Finished: {" "}
                                          {game.completedAt
                                            ? new Date(game.completedAt).toLocaleString()
                                            : "N/A"}
                                         </Text>
                                      </View>
                                    );
                                  })
                              ) : (
                                <Text style={styles.noGamesText}>
                                  No CyberQuest history available.
                                </Text>
                              )) : null}

                            <View style={styles.gameplayLogsContainer}>
                              <Text style={styles.gameplayLogsTitle}>
                                Gameplay Logs and Monitoring
                              </Text>

                              {(() => {
                                const selectedLogs = (student.gameplayLogs || [])
                                  .filter((log) => log?.gameType === selectedGameLogTab)
                                  .sort((a, b) => {
                                    const aTime = new Date(a?.timestamp || 0).getTime();
                                    const bTime = new Date(b?.timestamp || 0).getTime();
                                    return bTime - aTime;
                                  });

                                const successCount = selectedLogs.filter((log) => log?.success !== false).length;
                                const failedCount = selectedLogs.filter((log) => log?.success === false).length;
                                const lastEventTime = selectedLogs[0]?.timestamp
                                  ? new Date(selectedLogs[0].timestamp).toLocaleString()
                                  : "N/A";

                                const stats = computeGameStats(student, selectedGameLogTab);

                                return (
                                  <>
                                    <View style={styles.monitorStatsRow}>
                                      <View style={styles.monitorStatChip}>
                                        <Text style={styles.monitorStatLabel}>Events</Text>
                                        <Text style={styles.monitorStatValue}>{selectedLogs.length}</Text>
                                      </View>
                                      <View style={styles.monitorStatChip}>
                                        <Text style={styles.monitorStatLabel}>Success</Text>
                                        <Text style={styles.monitorStatValue}>{successCount}</Text>
                                      </View>
                                      <View style={styles.monitorStatChip}>
                                        <Text style={styles.monitorStatLabel}>Failed</Text>
                                        <Text style={styles.monitorStatValue}>{failedCount}</Text>
                                      </View>
                                      <View style={styles.monitorStatChip}>
                                        <Text style={styles.monitorStatLabel}>Last Activity</Text>
                                        <Text style={styles.monitorStatValue}>{lastEventTime}</Text>
                                      </View>
                                      <View style={styles.monitorStatChip}>
                                        <Text style={styles.monitorStatLabel}>Avg Score</Text>
                                        <Text style={styles.monitorStatValue}>{stats.avgScore ?? "N/A"}</Text>
                                      </View>
                                      <View style={styles.monitorStatChip}>
                                        <Text style={styles.monitorStatLabel}>Latest Score</Text>
                                        <Text style={styles.monitorStatValue}>{stats.latestScore ?? "N/A"}</Text>
                                      </View>
                                    </View>

                                    {stats.players.length > 0 && (
                                      <View style={{ marginBottom: 10 }}>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>Players seen with this student</Text>
                                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                          {stats.players.map((p) => (
                                            <View key={p} style={[styles.monitorStatChip, { paddingHorizontal: 10 }]}>
                                              <Text style={{ color: colors.text, fontWeight: "700" }}>{p}</Text>
                                            </View>
                                          ))}
                                        </View>
                                      </View>
                                    )}

                                    {selectedLogs.length > 0 ? (
                                      selectedLogs.slice(0, 80).map((log, logIndex) => (
                                  <View key={log.id || `${student.id}-log-${logIndex}`} style={styles.gameplayLogItem}>
                                    <Text style={styles.gameplayLogHeadline}>
                                      {(log.gameType || "game").replace(/_/g, " ")} • {(log.action || "event").replace(/_/g, " ")}
                                    </Text>
                                    <Text style={styles.gameplayLogMeta}>
                                      {log.eventSummary || "Event recorded"}
                                    </Text>
                                    <Text style={styles.gameplayLogMeta}>
                                      {log.roomCode ? `Room: ${log.roomCode} • ` : ""}
                                      {typeof log.score === "number" ? `Score: ${log.score} • ` : ""}
                                      {log.success === false ? "Failed" : "Success"}
                                    </Text>
                                    <Text style={styles.gameplayLogMeta}>
                                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : "N/A"}
                                    </Text>
                                  </View>
                                      ))
                                    ) : (
                                      <Text style={styles.noGamesText}>No gameplay logs recorded yet for this game.</Text>
                                    )}
                                  </>
                                );
                              })()}
                            </View>
                          </View>
                        )}
                      </View>
                    ))
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
  );

  if (embedded) {
    return <View style={styles.container}>{analyticsContent}</View>;
  }

  return (
    <SafeAreaView style={styles.container}>{analyticsContent}</SafeAreaView>
  );
}
