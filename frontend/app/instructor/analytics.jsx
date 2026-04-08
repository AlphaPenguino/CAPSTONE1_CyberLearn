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

export default function InstructorAnalytics() {
  const { user, token } = useAuthStore();
  const { colors } = useTheme();
  const router = useRouter();

  // State management
  const [studentData, setStudentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("all");
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [subjectsLoaded, setSubjectsLoaded] = useState(false);
  // Removed card expansion state (recent game results hidden)

  // Compute average leaderboard (combined) score across students
  const avgLeaderboardScore = studentData?.students?.length
    ? Math.round(
        studentData.students.reduce(
          (sum, s) =>
            sum + (typeof s.combinedScore === "number" ? s.combinedScore : 0),
          0
        ) / studentData.students.length
      )
    : 0;

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
        backgroundColor: colors.surface,
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageWrapper}>
        <View style={styles.header}>
          <TouchableOpacity
            // Navigate explicitly to the instructor dashboard instead of relying on history
            onPress={() => router.replace("/(tabs)/instructor")}
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
                      name="trophy"
                      size={24}
                      color="#FFD700"
                    />
                    <Text style={styles.statNumber}>{avgLeaderboardScore}</Text>
                    <Text style={styles.statLabel}>Avg Points</Text>
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
                    <Text style={styles.statLabel}>Total Games</Text>
                  </View>
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
                    .sort((a, b) => a.studentName.localeCompare(b.studentName))
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
                            {(student.cyberQuestHistory?.length > 0
                              ? student.cyberQuestHistory
                              : student.gameHistory?.filter(
                                  (game) => game.type === "cyberQuest"
                                ) || [])
                              .length > 0 ? (
                              (student.cyberQuestHistory?.length > 0
                                ? student.cyberQuestHistory
                                : student.gameHistory?.filter(
                                    (game) => game.type === "cyberQuest"
                                  ) || [])
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
                            )}
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
    </SafeAreaView>
  );
}
