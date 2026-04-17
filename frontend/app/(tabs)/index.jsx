import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  ScrollView,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  StyleSheet,
  Dimensions,
  Animated,
  useWindowDimensions,
  TextInput,
} from "react-native";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_URL, constructProfileImageUrl } from "../../constants/api";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import COLORS from "@/constants/custom-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";

const PlayerCharacter = React.memo(
  function PlayerCharacter({
    playerX,
    playerY,
    user,
    profileImageError,
    setProfileImageError,
    getCompatibleImageUrl,
  }) {
    const animatedStyle = {
      transform: [{ translateX: playerX }, { translateY: playerY }],
    };

    return (
      <Animated.View style={[styles.player, animatedStyle]}>
        {user?.profileImage && !profileImageError ? (
          <Image
            source={{ uri: getCompatibleImageUrl(user.profileImage) }}
            style={[styles.playerImage, styles.playerImageWithBorder]}
            onError={() => {
              console.log("Profile image failed to load, using default");
              setProfileImageError(true);
            }}
          />
        ) : (
          <Image
            source={require("../../assets/images/character1.png")}
            style={styles.playerImage}
          />
        )}
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    return (
      prevProps.user?.profileImage === nextProps.user?.profileImage &&
      prevProps.profileImageError === nextProps.profileImageError &&
      prevProps.playerX === nextProps.playerX &&
      prevProps.playerY === nextProps.playerY
    );
  }
);

const USE_DUMMY_DATA = false;

// Background options for the quest map
const BACKGROUND_OPTIONS = [
  {
    id: "future_road",
    name: "Default",
    image: require("../../assets/images/future_road.png"),
    moduleImage: require("../../assets/images/future_module.jpg"),
  },
  {
    id: "medieval_road",
    name: "Medieval",
    image: require("../../assets/images/medieval_road.png"),
    moduleImage: require("../../assets/images/medieval_module.jpg"),
  },
  {
    id: "urban_road",
    name: "Urban",
    image: require("../../assets/images/urban_road.png"),
    moduleImage: require("../../assets/images/urban_module.jpg"),
  },
  {
    id: "desert_road",
    name: "Desert",
    image: require("../../assets/images/desert_road.png"),
    moduleImage: require("../../assets/images/desert_module.jpg"),
  },
  {
    id: "lava_road",
    name: "Lava",
    image: require("../../assets/images/lava_road.png"),
    moduleImage: require("../../assets/images/lava_module.jpg"),
  },
  {
    id: "lair_road",
    name: "Wolf",
    image: require("../../assets/images/lair_road.png"),
    moduleImage: require("../../assets/images/lair_module.jpg"),
  },
  {
    id: "boss_road",
    name: "Boss",
    image: require("../../assets/images/boss_road.png"),
    moduleImage: require("../../assets/images/boss_module.jpg"),
  },
];

export default function Home() {
  const routeParams = useLocalSearchParams();
  const returnSubjectIdParam = Array.isArray(routeParams?.subjectId)
    ? routeParams.subjectId[0]
    : routeParams?.subjectId;
  const focusModuleIdParam = Array.isArray(routeParams?.focusModuleId)
    ? routeParams.focusModuleId[0]
    : routeParams?.focusModuleId;
  const { user, token, checkAuth, logout } = useAuthStore();
  const { colors, isDarkMode } = useTheme();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const isinstructor =
    user?.privilege === "instructor" || user?.privilege === "admin";
  const isAdmin = user?.privilege === "admin";

    const isInstructorOrAdmin =
  user?.privilege === "instructor" || user?.privilege === "admin";

const [exporting, setExporting] = React.useState(false);
const [importing, setImporting] = React.useState(false);

  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(null);
  const [isPlayerMoving, setIsPlayerMoving] = useState(false);
  const [hasInitializedPlayer, setHasInitializedPlayer] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [userSubjects, setUserSubjects] = useState([]);
  const [showSubjectSelector, setShowSubjectSelector] = useState(false);
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
  const [showJoinSubjectModal, setShowJoinSubjectModal] = useState(false);
  const [joinSubjectCode, setJoinSubjectCode] = useState("");
  const [joinSubjectSubmitting, setJoinSubjectSubmitting] = useState(false);
  const [joinSubjectError, setJoinSubjectError] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedBackground, setSelectedBackground] = useState(
    BACKGROUND_OPTIONS[0]
  );
  const [levelProgress, setLevelProgress] = useState(null);
  const [isPlayerStatsExpanded, setIsPlayerStatsExpanded] = useState(
    Platform.OS !== "android"
  );
  const levelProgressLoadedRef = useRef(false); // Track if level progress has been loaded
  const hasAppliedReturnSubjectRef = useRef(false);
  const hasAppliedReturnFocusRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    hasAppliedReturnSubjectRef.current = false;
    hasAppliedReturnFocusRef.current = false;
  }, [returnSubjectIdParam, focusModuleIdParam]);

const downloadJsonWeb = (data, filename) => {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download JSON failed:", err);
    alert("Failed to start download. See console for details.");
  }
};

const handleExportCyberQuests = async () => {
  if (!selectedSubject?._id) {
    if (Platform.OS === "web") {
      alert("Please select a subject first.");
    } else {
      Alert.alert("Subject Required", "Please select a subject first.");
    }
    return;
  }

  try {
    setExporting(true);
    const res = await fetch(
      `${API_URL}/subjects/${selectedSubject._id}/cyber-quests/export`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || "Failed to export cyber quests");
    }

    const json = await res.json();

    if (!json.success) {
      throw new Error(json.message || "Failed to export cyber quests");
    }

    const filename = `cyberquests-${json.subject.sectionCode || json.subject.name || "subject"}.json`;

    if (Platform.OS === "web") {
      downloadJsonWeb(json, filename);
    } else {
      // For native: just log + simple alert; you can wire FileSystem/Sharing later
      console.log("Exported cyber quests JSON:", json);
      Alert.alert(
        "Export Ready",
        "Cyber quests JSON has been generated. See console logs for now."
      );
    }
  } catch (err) {
    console.error("Error exporting cyber quests:", err);
    if (Platform.OS === "web") {
      alert(err.message || "Failed to export cyber quests");
    } else {
      Alert.alert("Error", err.message || "Failed to export cyber quests");
    }
  } finally {
    setExporting(false);
  }
};

// Web-only simple file picker import
const handleImportCyberQuestsWeb = () => {
  if (Platform.OS !== "web") {
    Alert.alert(
      "Not Supported",
      "Import via file is currently only supported on web."
    );
    return;
  }

  if (!selectedSubject?._id) {
    alert("Please select a subject first.");
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";

  input.onchange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const text = await file.text();
      const parsed = JSON.parse(text);

      const payload = Array.isArray(parsed.cyberQuests)
        ? parsed
        : { cyberQuests: parsed };

      if (!Array.isArray(payload.cyberQuests)) {
        throw new Error("Invalid file format: expected cyberQuests array.");
      }

      const res = await fetch(
        `${API_URL}/subjects/${selectedSubject._id}/cyber-quests/import`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cyberQuests: payload.cyberQuests,
          }),
        }
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to import cyber quests");
      }

      alert(
        `Import completed.\nCreated: ${json.summary?.created || 0}\nUpdated: ${
          json.summary?.updated || 0
        }\nFailed: ${json.summary?.failed || 0}`
      );

      // Refresh map/quests after import
      fetchModules();
    } catch (err) {
      console.error("Error importing cyber quests:", err);
      alert(err.message || "Failed to import cyber quests");
    } finally {
      setImporting(false);
    }
  };

  input.click();
};

  // Load saved background preference on component mount
  useEffect(() => {
    const loadBackgroundPreference = async () => {
      try {
        const savedBgId = await AsyncStorage.getItem("quest_map_background");
        if (savedBgId) {
          const savedBg = BACKGROUND_OPTIONS.find((bg) => bg.id === savedBgId);
          if (savedBg) {
            setSelectedBackground(savedBg);
          }
        }
      } catch (error) {
        console.error("Failed to load background preference:", error);
      }
    };

    loadBackgroundPreference();
  }, []);

  // Save background preference when changed
  const handleBackgroundChange = async (background) => {
    setSelectedBackground(background);
    setShowBackgroundSelector(false);

    try {
      await AsyncStorage.setItem("quest_map_background", background.id);
    } catch (error) {
      console.error("Failed to save background preference:", error);
    }
  };

  // Calculate module position for zigzag path going upward from bottom (Candy Crush style)
  const getModulePosition = useCallback(
    (index) => {
      const screenWidth = viewportWidth;
      const verticalSpacing = 190; // Further reduced space between levels
      const baseHeight = 350; // Further increase to move Level 1 much higher
      const horizontalOffset = 60; // How far left/right from center

      // Calculate total height needed for all modules - add more space at bottom
      const totalHeight = modules.length * verticalSpacing + baseHeight + 250;

      // Create zigzag pattern - alternate left and right
      let x;
      if (index === 0) {
        // First level at center bottom
        x = screenWidth / 2 - 45;
      } else {
        // Zigzag pattern: even indices go right, odd go left
        const isEven = index % 2 === 0;
        const centerX = screenWidth / 2 - 45;
        x = isEven ? centerX + horizontalOffset : centerX - horizontalOffset;
      }

      // Position Y starting from bottom, going up
      // Higher index = higher on screen (lower Y value)
      const y = totalHeight - index * verticalSpacing - baseHeight;

      return { x, y };
    },
    [modules.length, viewportWidth]
  );

  // Initialize player position - will be updated when modules load
  const playerPosition = useRef(
    new Animated.ValueXY({ x: viewportWidth / 2 - 45, y: 200 })
  ).current;

  // Initialize info panel animation
  const infoPanelAnimation = useRef(new Animated.Value(0)).current;

  // Parallax scroll animation
  const scrollY = useRef(new Animated.Value(0)).current;

  const [profileImageError, setProfileImageError] = useState(false);

  useEffect(() => {
    setProfileImageError(false);
  }, [user, user?.profileImage]);
  const scrollViewRef = useRef(null);

  const fetchUserSubjects = useCallback(async () => {
    try {
      if (USE_DUMMY_DATA) {
        // Dummy subject data for development
        const dummySubjects = [
          {
            id: "1",
            name: "Cybersecurity Fundamentals",
            description: "Basic cybersecurity concepts",
          },
          {
            id: "2",
            name: "Advanced Security",
            description: "Advanced security topics",
          },
        ];
        setUserSubjects(dummySubjects);

        // Set default subject if none selected
        if (!selectedSubject && dummySubjects.length > 0) {
          setSelectedSubject(dummySubjects[0]);
        }
        return;
      }

      if (!token) return;

      // Use the new subjects endpoint that works for both instructors and students
      const response = await fetch(`${API_URL}/subjects/user-subjects`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const subjects = data.subjects || [];
        setUserSubjects(subjects);

        // Don't auto-assign any subject - let users choose their subject
        // Both instructors and students should manually select their subject

        // Check for empty subjects and set loading to false if needed
        if (subjects.length === 0) {
          // If we found zero subjects, set loading to false
          setLoading(false);
        }
      } else {
        console.warn("Failed to fetch subjects:", response.status);
        // Set empty array but don't show error - user might not have subjects yet
        setUserSubjects([]);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching user subjects:", error);
      setUserSubjects([]);
      // Also set loading to false here to prevent infinite loading
      setLoading(false);
    }
  }, [token, selectedSubject]);

  // Function to fetch cyber quest progress for a subject
  const fetchCyberQuestProgress = useCallback(
    async (subjectId) => {
      if (!token || !subjectId) return {};

      try {
        // Use legacy sections route for progress (backend alias not added yet)
        const response = await fetch(
          `${API_URL}/sections/${subjectId}/cyber-quest-progress`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.progress) {
            console.log("📊 Raw progress data count:", data.progress.length);

            // Convert array to object for easy lookup
            // Handle duplicates by keeping the entry with the highest bestScore
            const progressMap = data.progress.reduce((acc, questProgress) => {
              const existingEntry = acc[questProgress.cyberQuest];

              if (!existingEntry) {
                // No existing entry, add this one
                acc[questProgress.cyberQuest] = questProgress;
              } else {
                // Duplicate found - keep the better entry
                console.log(
                  `⚠️ Duplicate found for quest ${questProgress.cyberQuest}:`,
                  {
                    existing: {
                      status: existingEntry.status,
                      bestScore: existingEntry.bestScore,
                      attempts: existingEntry.totalAttempts,
                    },
                    new: {
                      status: questProgress.status,
                      bestScore: questProgress.bestScore,
                      attempts: questProgress.totalAttempts,
                    },
                  }
                );

                // Priority: 1) completed status, 2) higher bestScore, 3) more attempts
                const shouldReplace =
                  (questProgress.status === "completed" &&
                    existingEntry.status !== "completed") ||
                  (questProgress.status === existingEntry.status &&
                    questProgress.bestScore > existingEntry.bestScore) ||
                  (questProgress.status === existingEntry.status &&
                    questProgress.bestScore === existingEntry.bestScore &&
                    questProgress.totalAttempts > existingEntry.totalAttempts);

                if (shouldReplace) {
                  console.log(`✅ Replacing with better entry`);
                  acc[questProgress.cyberQuest] = questProgress;
                } else {
                  console.log(`❌ Keeping existing entry`);
                }
              }

              return acc;
            }, {});

            console.log(
              "📊 Unique progress entries:",
              Object.keys(progressMap).length
            );
            console.log(
              "📊 Final progress map:",
              Object.entries(progressMap).map(([id, prog]) => ({
                id,
                bestScore: prog.bestScore,
                status: prog.status,
                attempts: prog.totalAttempts,
              }))
            );
            return progressMap;
          }
        }
      } catch (error) {
        console.error("Error fetching cyber quest progress:", error);
      }

      return {};
    },
    [token]
  );

  // Function to fetch user level progression details
  const fetchLevelProgress = useCallback(async () => {
    if (!token || levelProgressLoadedRef.current) {
      console.log("🚫 Skipping level progress fetch:", {
        hasToken: !!token,
        alreadyLoaded: levelProgressLoadedRef.current,
      });
      return;
    }

    try {
      console.log("📊 Fetching level progress...");
      levelProgressLoadedRef.current = true;

      const response = await fetch(`${API_URL}/users/level-progress`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log("✅ Level progress loaded successfully");
          setLevelProgress(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching level progress:", error);
      levelProgressLoadedRef.current = false; // Reset on error to allow retry
    }
  }, [token]);

  // Update to fetch cyber quests for sections
  const fetchModules = useCallback(
    async (pageNum = 1, sortOrder = "order") => {
      try {
        setLoading(refreshing ? false : true);
        setError(null);

        if (USE_DUMMY_DATA) {
          try {
            const dummyData = await createDummyModules();
            setModules(dummyData);

            if (dummyData.length > 0) {
              const currentModule =
                dummyData.find((m) => m.isCurrent) ||
                dummyData.filter((m) => m.isUnlocked).pop();

              if (currentModule) {
                const moduleIndex = dummyData.findIndex(
                  (m) => m._id === currentModule._id
                );
                const modulePosition = getModulePosition(moduleIndex);

                playerPosition.setValue({
                  x: modulePosition.x,
                  y: modulePosition.y,
                });

                if (!hasInitializedPlayer) {
                  setHasInitializedPlayer(true);
                }
              }
            }

            setLoading(false);
            return true;
          } catch (dummyError) {
            console.error("Error creating dummy modules:", dummyError);
            setError("Failed to load demo data");
            return false;
          }
        }

        if (!token) {
          setError("Authentication required. Please log in again.");
          logout();
          router.replace("/login");
          return false;
        }

        if (!API_URL) {
          setError("API configuration error. Please contact support.");
          return false;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          let response;

          // Both instructors and students fetch cyber quests for the selected subject
          if (selectedSubject) {
            response = await fetch(
              `${API_URL}/subjects/${
                selectedSubject._id || selectedSubject.id
              }/cyber-quests`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                signal: controller.signal,
              }
            );
          } else {
            // Fallback to regular modules if no section selected
            response = await fetch(`${API_URL}/progress/modules`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              signal: controller.signal,
            });
          }

          clearTimeout(timeoutId);

          if (response.status === 401) {
            setError("Session expired. Please log in again.");
            logout();
            router.replace("/login");
            return false;
          }

          if (response.status === 404) {
            setModules([]);
            setLoading(false);
            return true;
          }

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.message || `Server error: ${response.status}`
            );
          }

          const data = await response.json();

          // Check for empty data AFTER parsing the response
          if (!data || (Array.isArray(data) && data.length === 0)) {
            setModules([]);
            setLoading(false);
            return true;
          }

          let modulesData = [];

          // Handle different response formats
          if (selectedSubject) {
            // Both instructors and students: handle cyber quests for the selected subject

            if (isinstructor) {
              // For instructors: All quests are unlocked, no progress tracking
              if (data.success && data.cyberQuests) {
                modulesData = data.cyberQuests.map((quest, index) => ({
                  _id: quest._id,
                  title: quest.title,
                  description: `Cyber Quest: ${
                    quest.questions?.length || 0
                  } questions`,
                  difficulty: quest.difficulty,
                  isUnlocked: true, // Instructors can access all quests
                  isCompleted: false, // Instructors don't have completion status
                  order: quest.level || index + 1,
                  type: "cyber-quest",
                  questions: quest.questions,
                  progress: {},
                  bestScore: 0,
                  totalAttempts: 0,
                  section: quest.section,
                  isCurrent: false, // Instructors don't have a "current" quest
                }));
              }
            } else {
              // For students: Handle progress and unlock logic
              const progressData = await fetchCyberQuestProgress(
                selectedSubject._id || selectedSubject.id
              );

              if (data.success && data.cyberQuests) {
                // First pass: determine unlock status for all quests
                const questsWithUnlockStatus = data.cyberQuests.map(
                  (quest, index) => {
                    const questProgress = progressData[quest._id] || {};
                    const isCompleted = questProgress.status === "completed";

                    // Level progression logic:
                    // - If there's a progress entry, the level is unlocked
                    // - If there's no progress entry, the level is locked
                    // - The backend only creates progress entries for unlocked levels
                    // Always allow Level 1 as unlocked for students as a safe fallback
                    const isUnlocked =
                      quest.level === 1 || !!questProgress.status;

                    const questData = {
                      _id: quest._id,
                      title: quest.title,
                      description: `Cyber Quest: ${
                        quest.questions?.length || 0
                      } questions`,
                      difficulty: quest.difficulty,
                      isUnlocked: isUnlocked,
                      isCompleted: isCompleted,
                      order: quest.level || index + 1, // Use actual level from backend, fallback to index
                      type: "cyber-quest",
                      questions: quest.questions,
                      progress: questProgress,
                      bestScore: questProgress.bestScore || 0,
                      totalAttempts: questProgress.totalAttempts || 0,
                    };

                    console.log(`🎯 Quest ${quest.title} mapped:`, {
                      id: quest._id,
                      bestScore: questData.bestScore,
                      isCompleted: questData.isCompleted,
                      progressData: questProgress,
                    });

                    return questData;
                  }
                );

                // Second pass: determine which quest is current (only one quest can be current)
                let currentQuestFound = false;
                modulesData = questsWithUnlockStatus.map((quest) => {
                  let isCurrent = false;

                  // Current quest logic: first unlocked but not completed quest
                  if (
                    !currentQuestFound &&
                    quest.isUnlocked &&
                    !quest.isCompleted
                  ) {
                    isCurrent = true;
                    currentQuestFound = true;
                  }

                  return {
                    ...quest,
                    isCurrent: isCurrent,
                  };
                });
              }
            }
          } else {
            // Regular modules format
            if (Array.isArray(data)) {
              modulesData = data;
            } else if (data.modules && Array.isArray(data.modules)) {
              modulesData = data.modules;
            }
          }

          if (!Array.isArray(modulesData)) {
            console.warn("Invalid modules data received:", data);
            setModules([]);
            setLoading(false);
            return true;
          }

          setModules(modulesData);

          if (modulesData.length > 0) {
            const currentModule =
              modulesData.find((m) => m.isCurrent) ||
              modulesData.filter((m) => m.isUnlocked).pop();

            if (currentModule) {
              const moduleIndex = modulesData.findIndex(
                (m) => m._id === currentModule._id
              );
              const modulePosition = getModulePosition(moduleIndex);

              playerPosition.setValue({
                x: modulePosition.x,
                y: modulePosition.y,
              });

              if (!hasInitializedPlayer) {
                setHasInitializedPlayer(true);
              }
            }
          }

          return true;
        } catch (fetchError) {
          clearTimeout(timeoutId);

          if (fetchError.name === "AbortError") {
            throw new Error("Request timed out. Please try again.");
          }
          throw fetchError;
        }
      } catch (err) {
        console.error("Error fetching modules/cyber quests:", err);

        let errorMessage = "Failed to load content";
        if (err.message.includes("fetch")) {
          errorMessage =
            "Network error. Please check your internet connection and try again.";
        } else if (err.message.includes("timeout")) {
          errorMessage = "Request timed out. Please try again.";
        } else if (err.message) {
          errorMessage = err.message;
        }

        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [
      token,
      refreshing,
      logout,
      router,
      playerPosition,
      getModulePosition,
      hasInitializedPlayer,
      setHasInitializedPlayer,
      selectedSubject,
      fetchCyberQuestProgress,
      isinstructor,
    ]
  );

  useFocusEffect(
    React.useCallback(() => {
      checkAuth();
      fetchUserSubjects();
      // Refresh modules to get updated progress data when screen gains focus
      if (selectedSubject) {
        fetchModules();
      }
      // Only fetch level progress for students (only once)
      if (!isinstructor && token) {
        fetchLevelProgress();
      }

      return () => {};
    }, [
      checkAuth,
      fetchUserSubjects,
      fetchModules,
      fetchLevelProgress,
      isinstructor,
      token,
      selectedSubject,
    ])
  );

  // Separate effect for handling subject/module changes
  useEffect(() => {
    if (userSubjects.length > 0 || selectedSubject) {
      fetchModules();
    } else {
      // If there are no subjects, set loading to false
      setLoading(false);
    }
  }, [selectedSubject, userSubjects.length, fetchModules]);

  const movePlayerToModule = useCallback(
    (module, index) => {
      if (isPlayerMoving) return;

      if (menuVisible) {
        setMenuVisible(null);
      }

      setIsPlayerMoving(true);

      const modulePosition = getModulePosition(index);

      if (selectedModule?._id !== module._id) {
        setSelectedModule(module);

        Animated.spring(infoPanelAnimation, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }).start();
      }

      const scrollToY = Math.max(
        0,
        modulePosition.y - viewportHeight / 2 + 100
      );

      if (scrollViewRef.current && scrollViewRef.current.scrollTo) {
        try {
          scrollViewRef.current.scrollTo({
            y: scrollToY,
            animated: true,
          });
        } catch (error) {
          console.warn("ScrollView scrollTo failed:", error);
        }
      }

      setTimeout(() => {
        Animated.spring(playerPosition, {
          toValue: { x: modulePosition.x, y: modulePosition.y },
          friction: 8,
          tension: 50,
          useNativeDriver: false,
        }).start(() => {
          setIsPlayerMoving(false);
        });
      }, 100);
    },
    [
      isPlayerMoving,
      menuVisible,
      selectedModule,
      getModulePosition,
      infoPanelAnimation,
      playerPosition,
      setSelectedModule,
      setMenuVisible,
      setIsPlayerMoving,
      scrollViewRef,
      viewportHeight,
    ]
  );

  useEffect(() => {
    if (hasAppliedReturnSubjectRef.current) return;
    if (!returnSubjectIdParam || !Array.isArray(userSubjects) || !userSubjects.length) {
      return;
    }

    const matchedSubject = userSubjects.find((subject) => {
      const subjectId = subject?._id || subject?.id;
      return String(subjectId) === String(returnSubjectIdParam);
    });

    if (!matchedSubject) {
      hasAppliedReturnSubjectRef.current = true;
      return;
    }

    const currentSubjectId = selectedSubject?._id || selectedSubject?.id;
    if (String(currentSubjectId || "") !== String(returnSubjectIdParam)) {
      setSelectedSubject(matchedSubject);
    }
    hasAppliedReturnSubjectRef.current = true;
  }, [returnSubjectIdParam, userSubjects, selectedSubject]);

  useEffect(() => {
    if (hasAppliedReturnFocusRef.current) return;
    if (!focusModuleIdParam || !Array.isArray(modules) || !modules.length) return;

    const currentSubjectId = selectedSubject?._id || selectedSubject?.id;
    if (
      returnSubjectIdParam &&
      String(currentSubjectId || "") !== String(returnSubjectIdParam)
    ) {
      return;
    }

    const moduleIndex = modules.findIndex(
      (module) => String(module?._id || module?.id) === String(focusModuleIdParam)
    );

    if (moduleIndex < 0) {
      hasAppliedReturnFocusRef.current = true;
      return;
    }

    movePlayerToModule(modules[moduleIndex], moduleIndex);
    hasAppliedReturnFocusRef.current = true;
  }, [
    focusModuleIdParam,
    modules,
    movePlayerToModule,
    selectedSubject,
    returnSubjectIdParam,
  ]);

  const createDummyModules = async () => {
    const dummyModules = [];

    let completionData = [];
    try {
      const existingDataString = await AsyncStorage.getItem(
        "moduleCompletions"
      );
      completionData = existingDataString ? JSON.parse(existingDataString) : [];
    } catch (_error) {
      console.log("AsyncStorage not available, using default progression");
    }

    const completedModuleIds = completionData.map((item) => item.moduleId);

    let highestCompletedLevel = -1;
    for (let i = 0; i < 20; i++) {
      const moduleId = `dummy-${i}`;
      if (completedModuleIds.includes(moduleId)) {
        highestCompletedLevel = i;
      }
    }

    const highestUnlockedLevel = Math.max(0, highestCompletedLevel + 1);

    // Sample questions showcasing new question types
    const sampleQuestions = [
      // Traditional multiple choice
      {
        type: "multipleChoice",
        text: "What is the primary purpose of a firewall?",
        preview: "Multiple Choice: Network security fundamentals",
      },
      // Code missing
      {
        type: "codeMissing",
        text: "Complete the Python code to hash a password",
        preview: "Code Challenge: Fill in missing code",
      },
      // NEW: Categorization/Sorting
      {
        type: "sorting",
        text: "Categorize these items into 'Safe Practices' vs 'Security Risks'",
        categories: ["Safe Practices", "Security Risks"],
        items: [
          { text: "Using strong passwords", category: "Safe Practices" },
          { text: "Public WiFi for banking", category: "Security Risks" },
          { text: "Two-factor authentication", category: "Safe Practices" },
          { text: "Sharing passwords via email", category: "Security Risks" },
        ],
        preview: "🔄 Sorting Challenge: Categorize cybersecurity practices",
      },
      // NEW: Cryptogram/Cipher
      {
        type: "cipher",
        text: "Decode this cybersecurity term: HQFUBSWLRQ",
        answer: "ENCRYPTION",
        scrambledHint: "QOCNIRYTPE",
        preview: "🔐 Cipher Challenge: Decode the hidden message",
      },
      // Fill in blanks
      {
        type: "fillInBlanks",
        text: "Complete: A _____ attack floods a server with traffic",
        preview: "Fill the Blanks: Network attack terminology",
      },
      // Code ordering
      {
        type: "codeOrdering",
        text: "Order these steps for secure password creation",
        preview: "Code Ordering: Arrange security procedures",
      },
    ];

    for (let i = 0; i < 20; i++) {
      const moduleId = `dummy-${i}`;
      const isCompleted = completedModuleIds.includes(moduleId);
      const isUnlocked = i <= highestUnlockedLevel;
      const isCurrent = i === highestUnlockedLevel && !isCompleted;

      // Assign sample questions in rotation, highlighting new question types in early modules
      const questionIndex =
        i < sampleQuestions.length ? i : i % sampleQuestions.length;
      const sampleQuestion = sampleQuestions[questionIndex];

      // Create question preview text
      let questionPreview = sampleQuestion.preview;
      if (i === 2) {
        // Highlight sorting question
        questionPreview = "✨ NEW: " + sampleQuestion.preview;
      } else if (i === 3) {
        // Highlight cipher question
        questionPreview = "✨ NEW: " + sampleQuestion.preview;
      }

      dummyModules.push({
        _id: moduleId,
        title: `Cyber Module ${i + 1}`,
        description: `Learn about cybersecurity fundamentals in this exciting module ${
          i + 1
        }. Master the skills needed to protect digital systems.`,
        questionPreview: questionPreview, // Add question preview
        questionType: sampleQuestion.type, // Add question type for styling
        image:
          i % 3 === 0
            ? "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=200&h=200&fit=crop&crop=center"
            : i % 3 === 1
            ? "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=200&h=200&fit=crop&crop=center"
            : "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=200&h=200&fit=crop&crop=center",
        isUnlocked: isUnlocked,
        isCompleted: isCompleted,
        isCurrent: isCurrent,
        order: i + 1,
      });
    }
    return dummyModules;
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchModules().then(() => {
      setRefreshing(false);
    });
  }, [fetchModules]);

  const handleDeleteModule = (moduleId) => {
    if (Platform.OS === "web") {
      if (confirm("Are you sure you want to delete this cyber quest?")) {
        deleteModule(moduleId);
      }
    } else {
      Alert.alert(
        "Delete Cyber Quest",
        "Are you sure you want to delete this cyber quest?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            onPress: () => deleteModule(moduleId),
            style: "destructive",
          },
        ]
      );
    }
  };

  const deleteModule = async (moduleId) => {
    try {
      const response = await fetch(`${API_URL}/cyber-quests/${moduleId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setModules(modules.filter((m) => m._id !== moduleId));

        if (selectedModule?._id === moduleId) {
          setSelectedModule(null);
        }

        // Show success message
        if (Platform.OS === "web") {
          alert("Cyber Quest deleted successfully!");
        } else {
          Alert.alert("Success", "Cyber Quest deleted successfully!");
        }
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete cyber quest");
      }
    } catch (error) {
      console.error("Error deleting cyber quest:", error);
      const errorMessage = error.message || "Failed to delete cyber quest";

      if (Platform.OS === "web") {
        alert("Failed to delete cyber quest: " + errorMessage);
      } else {
        Alert.alert("Error", "Failed to delete cyber quest: " + errorMessage);
      }
    }
  };

  useEffect(() => {
    if (user?.profileImage) {
      //console.log("Attempting to load profile image:", user.profileImage);

      fetch(user.profileImage)
        .then((response) => {
          //console.log("Profile image response:", response.status);
        })
        .catch((error) => {
          //console.log("Profile image fetch error:", error);
        });
    }
  }, [user?.profileImage, router]);

  const getCompatibleImageUrl = (url) => {
    if (!url) return null;

    // First construct the full URL from filename if needed
    const fullUrl = constructProfileImageUrl(url);

    if (fullUrl && fullUrl.includes("dicebear") && fullUrl.includes("/svg")) {
      if (Platform.OS === "android" || Platform.OS === "ios") {
        return fullUrl.replace("/svg", "/png");
      }
    }
    return fullUrl;
  };

  // Update getModuleImageUrl to return null if no URL
  const getModuleImageUrl = (url) => {
    return url || null;
  };

  useFocusEffect(
    React.useCallback(() => {
      if (!selectedModule) {
        infoPanelAnimation.setValue(0);
      }
    }, [selectedModule, infoPanelAnimation])
  );

  const hidePlayerStatsForEmptySelectedSubject =
    user?.privilege === "student" &&
    !!selectedSubject &&
    !loading &&
    !error &&
    modules.length === 0;

  const shouldShowPlayerStatsToggle =
    Platform.OS === "android" ||
    (Platform.OS === "web" && viewportHeight >= viewportWidth && viewportWidth <= 768);

  const showPlayerStatsDetails =
    !shouldShowPlayerStatsToggle || isPlayerStatsExpanded;

  const showPrivilegedNoSubjectsState =
    isInstructorOrAdmin &&
    !loading &&
    !error &&
    modules.length === 0 &&
    userSubjects.length === 0;

  const showWebMapBackdrop =
    Platform.OS === "web" &&
    !!selectedBackground?.image &&
    !(!!selectedSubject && !loading && !error && modules.length === 0) &&
    !showPrivilegedNoSubjectsState;

  const screenGradient = isDarkMode
    ? ["#020617", "#0B1220"]
    : ["#F8FAFC", "#E2E8F0"];

  const webMapStripWidth = Platform.OS === "web" ? Math.min(viewportWidth, 800) : viewportWidth;
  const webMapStripLeft = Platform.OS === "web" ? (viewportWidth - webMapStripWidth) / 2 : 0;
  const webMapBackgroundScale = Platform.OS === "web" ? 1.6 : 1;
  const isWebPlatform = Platform.OS === "web";
  const isWebPortrait = isWebPlatform && viewportHeight >= viewportWidth;
  const isWebCompact = isWebPlatform && viewportWidth <= 900;
  const isWebMobilePortrait = isWebPortrait && viewportWidth <= 768;
  const isWebTight = isWebPlatform && viewportWidth <= 520;

  const handleOpenJoinSubject = useCallback(() => {
    if (Platform.OS === "web") {
      setJoinSubjectCode("");
      setJoinSubjectError("");
      setShowJoinSubjectModal(true);
      return;
    }
    router.push("/join-subject");
  }, [router]);

  const handleCloseJoinSubjectModal = useCallback(() => {
    setShowJoinSubjectModal(false);
    setJoinSubjectSubmitting(false);
    setJoinSubjectError("");
  }, []);

  const handleSubmitJoinSubjectWeb = useCallback(async () => {
    const code = joinSubjectCode.trim();
    if (!code) {
      setJoinSubjectError("Please enter a subject code.");
      return;
    }
    if (!token) {
      setJoinSubjectError("Authentication required. Please log in again.");
      return;
    }

    try {
      setJoinSubjectSubmitting(true);
      setJoinSubjectError("");

      const response = await fetch(`${API_URL}/subjects/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subjectCode: code }),
      });

      const data = await response.json().catch(() => ({}));
      const message = data?.message || "";
      const backendError = data?.error || "";
      const legacySectionValidation =
        /no_section is not a valid section|User validation failed/i.test(
          backendError || message
        );

      if ((response.ok && data.success) || legacySectionValidation) {
        handleCloseJoinSubjectModal();
        await fetchUserSubjects();
        await fetchModules();
        if (typeof window !== "undefined") {
          window.alert("Successfully joined subject.");
        }
        return;
      }

      setJoinSubjectError(data?.message || "Failed to join subject.");
      setJoinSubjectCode("");
    } catch (error) {
      console.error("Error joining subject:", error);
      setJoinSubjectError("Failed to join subject. Please try again.");
      setJoinSubjectCode("");
    } finally {
      setJoinSubjectSubmitting(false);
    }
  }, [
    joinSubjectCode,
    token,
    handleCloseJoinSubjectModal,
    fetchUserSubjects,
    fetchModules,
  ]);

  const fetchCyberlearnHistoryWeb = useCallback(async () => {
    if (!token) {
      setHistoryError("Authentication required. Please log in again.");
      return;
    }

    try {
      setHistoryLoading(true);
      setHistoryError("");

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

      setHistoryItems(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error("Error fetching cyberlearn history:", err);
      setHistoryError(err?.message || "Failed to load history");
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  const handleOpenHistory = useCallback(() => {
    if (Platform.OS === "web") {
      setShowHistoryModal(true);
      fetchCyberlearnHistoryWeb();
      return;
    }
    router.push("/cyberlearn-history");
  }, [fetchCyberlearnHistoryWeb, router]);

  const handleCloseHistoryModal = useCallback(() => {
    setShowHistoryModal(false);
  }, []);

  const formatHistoryCount = (value) =>
    typeof value === "number" ? value : "N/A";

  return (
    <ExpoLinearGradient colors={screenGradient} style={styles.container}>
      {showWebMapBackdrop && (
        <>
          <Image
            source={selectedBackground.image}
            style={styles.webMapBackdropImage}
            resizeMode="cover"
            blurRadius={10}
          />
          <View style={styles.webMapBackdropTint} pointerEvents="none" />
        </>
      )}
      {/* Enhanced Header with Mobile-Optimized Layout */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border },
          isWebMobilePortrait && styles.headerCompactWeb,
        ]}
      >


        <View
          style={[
            styles.headerControls,
            isWebMobilePortrait && styles.headerControlsCompactWeb,
          ]}
        >
          {/* Subject Selector - Show if any subjects exist */}
          {userSubjects.length > 0 && (
            <TouchableOpacity
              style={[
                styles.sectionSelector,
                { backgroundColor: colors.card, borderColor: colors.border },
                isWebMobilePortrait && styles.sectionSelectorCompactWeb,
              ]}
              onPress={() => setShowSubjectSelector(!showSubjectSelector)}
              activeOpacity={0.7}
            >
              <Ionicons name="book-outline" size={18} color={colors.primary} />
              <Text
                style={[styles.sectionSelectorText, { color: colors.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedSubject?.name ||
                  (userSubjects.length > 1
                    ? `Select Subject (${userSubjects.length})`
                    : "Select Subject")}
              </Text>
              <Ionicons
                name={showSubjectSelector ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          <View
            style={[
              styles.headerActions,
              isWebMobilePortrait && styles.headerActionsCompactWeb,
            ]}
          >
            {/* Background Selector Button - Only visible to instructors and admins */}
            

            

             {isInstructorOrAdmin && selectedSubject && (
              <>
                <TouchableOpacity

                  style={[
                    styles.backgroundSelector,
                    Platform.OS === "web" && styles.webQuestActionButton,
                    isWebCompact && styles.webQuestActionButtonCompact,
                  ]}
                  onPress={handleExportCyberQuests}
                  disabled={exporting}
                >
                  <Ionicons
                    name="download-outline"
                    size={20}
                    color={colors.primary}
                  />
                  {Platform.OS === "web" && !isWebTight && (
                    <Text style={styles.webQuestActionText}>Export Quest</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.backgroundSelector,
                    Platform.OS === "web" && styles.webQuestActionButton,
                    isWebCompact && styles.webQuestActionButtonCompact,
                  ]}
                  onPress={handleImportCyberQuestsWeb}
                  disabled={importing}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={20}
                    color={colors.primary}
                  />
                  {Platform.OS === "web" && !isWebTight && (
                    <Text style={styles.webQuestActionText}>Import Quest</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {isinstructor && (
              <TouchableOpacity
                style={styles.backgroundSelector}
                onPress={() =>
                  setShowBackgroundSelector(!showBackgroundSelector)
                }
              >
                <Ionicons
                  name="image-outline"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}

            {USE_DUMMY_DATA && (
              <View style={styles.dummyIndicator}>
                <Text style={styles.dummyText}>DEMO</Text>
              </View>
            )}

            {isinstructor && (
              <TouchableOpacity
                style={styles.instructorButton}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/create",
                    params: { from: "index" },
                  })
                }
              >
                <Ionicons name="add-circle" size={24} color={colors.primary} />
              </TouchableOpacity>
            )}

            {user?.privilege === "student" && (
              <>
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={handleOpenJoinSubject}
                >
                  <Ionicons name="enter" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.historyHeaderButton}
                  onPress={handleOpenHistory}
                >
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Level Progress Display for Students - Mobile optimized */}
        {!isinstructor &&
          levelProgress &&
          !hidePlayerStatsForEmptySelectedSubject && (
          <View
            style={[
              styles.levelProgressContainer,
              {
                backgroundColor: "rgba(10, 25, 41, 0.7)",
                borderColor: "rgba(41, 98, 255, 0.6)",
              },
              Platform.OS !== "web" && styles.levelProgressContainerMobile, // Apply mobile-specific styling
              Platform.OS === "web" && styles.levelProgressContainerWeb, // Apply web-specific vertical styling
              isWebMobilePortrait && styles.levelProgressContainerWebCompact,
            ]}
          >
            <View
              style={[
                styles.levelProgressHeader,
                Platform.OS === "web" && styles.levelProgressHeaderWeb,
                isWebMobilePortrait && styles.levelProgressHeaderCompactWeb,
              ]}
            >
              <View
                style={[
                  styles.levelProgressHeaderLeft,
                  isWebMobilePortrait && styles.levelProgressHeaderLeftCompactWeb,
                ]}
              >
                <MaterialCommunityIcons
                  name="crown"
                  size={Platform.OS === "web" ? 22 : 18}
                  color="#FFD700"
                />
                <Text style={[styles.levelProgressTitle, { color: "#fff" }]}>Player Stats</Text>
              </View>
              {shouldShowPlayerStatsToggle && (
                <TouchableOpacity
                  style={[
                    styles.playerStatsToggleButton,
                    isWebMobilePortrait && styles.playerStatsToggleButtonCompactWeb,
                  ]}
                  onPress={() => setIsPlayerStatsExpanded((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.playerStatsToggleText}>
                    {isPlayerStatsExpanded ? "Hide" : "Show"}
                  </Text>
                  <Ionicons
                    name={isPlayerStatsExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#E2E8F0"
                  />
                </TouchableOpacity>
              )}
            </View>

            {showPlayerStatsDetails && (
              <>
                {/* Add user info section */}
                <View
                  style={[
                    styles.levelProgressUserInfo,
                    Platform.OS === "web" && styles.levelProgressUserInfoWeb,
                  ]}
                >
                  <Text style={styles.levelProgressUsername}>
                    {user?.username || "Unknown Player"}
                  </Text>
                  {user?.fullName && (
                    <Text style={styles.levelProgressFullName}>{user.fullName}</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.levelProgressStats,
                    Platform.OS !== "web" && styles.levelProgressStatsMobile,
                    Platform.OS === "web" && styles.levelProgressStatsWeb,
                    isWebMobilePortrait && styles.levelProgressStatsCompactWeb,
                  ]}
                >
                  <View
                    style={[
                      styles.levelProgressStat,
                      Platform.OS === "web" && styles.levelProgressStatWeb,
                      isWebMobilePortrait && styles.levelProgressStatCompactWeb,
                    ]}
                  >
                    <View
                      style={[
                        styles.levelIconContainer,
                        { backgroundColor: "rgba(41, 121, 255, 0.2)" },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="account-star"
                        size={Platform.OS === "web" ? 24 : 18} // Smaller icon on mobile
                        color="#2979FF"
                      />
                    </View>
                    <View
                      style={
                        Platform.OS === "web" && styles.levelProgressContentWeb
                      }
                    >
                      <Text
                        style={[
                          styles.levelProgressValue,
                          { color: "#2979FF" },
                          Platform.OS !== "web" && styles.levelProgressValueMobile,
                          Platform.OS === "web" && styles.levelProgressValueWeb,
                        ]}
                      >
                        {levelProgress.progression.globalLevel}
                      </Text>
                      <Text
                        style={[
                          styles.levelProgressLabel,
                          { color: "#B0C4DE" },
                          Platform.OS !== "web" && styles.levelProgressLabelMobile,
                          Platform.OS === "web" && styles.levelProgressLabelWeb,
                        ]}
                      >
                        Global Level
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.progressBarContainer,
                        Platform.OS === "android" && styles.progressBarContainerAndroid,
                        Platform.OS === "web" && styles.progressBarContainerWeb,
                      ]}
                    >
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${Math.min(
                              (levelProgress.progression.globalLevel % 5) * 20,
                              100
                            )}%`,
                            backgroundColor: "#2979FF",
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View
                    style={[
                      styles.levelProgressStat,
                      styles.middleStat,
                      Platform.OS === "web" && styles.middleStatWeb,
                      Platform.OS === "web" && styles.levelProgressStatWeb,
                      isWebMobilePortrait && styles.levelProgressStatCompactWeb,
                    ]}
                  >
                    <View
                      style={[
                        styles.levelIconContainer,
                        { backgroundColor: "rgba(255, 107, 107, 0.2)" },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="trophy-award"
                        size={Platform.OS === "web" ? 24 : 18} // Smaller icon on mobile
                        color="#FF6B6B"
                      />
                    </View>
                    <View
                      style={
                        Platform.OS === "web" && styles.levelProgressContentWeb
                      }
                    >
                      <Text
                        style={[
                          styles.levelProgressValue,
                          { color: "#FF6B6B" },
                          Platform.OS !== "web" && styles.levelProgressValueMobile,
                          Platform.OS === "web" && styles.levelProgressValueWeb,
                        ]}
                      >
                        {levelProgress.progression.maxLevelReached}
                      </Text>
                      <Text
                        style={[
                          styles.levelProgressLabel,
                          { color: "#B0C4DE" },
                          Platform.OS !== "web" && styles.levelProgressLabelMobile,
                          Platform.OS === "web" && styles.levelProgressLabelWeb,
                        ]}
                      >
                        Max Quest
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.starContainer,
                        Platform.OS === "web" && styles.starContainerWeb,
                      ]}
                    >
                      {[...Array(3)].map((_, i) => (
                        <MaterialCommunityIcons
                          key={i}
                          name="star"
                          size={Platform.OS === "web" ? 12 : 10} // Smaller stars on mobile
                          color={
                            i <
                            Math.min(
                              levelProgress.progression.maxLevelReached / 5,
                              3
                            )
                              ? "#FFD700"
                              : "rgba(255,255,255,0.3)"
                          }
                        />
                      ))}
                    </View>
                  </View>
                  <View
                    style={[
                      styles.levelProgressStat,
                      Platform.OS === "web" && styles.levelProgressStatWeb,
                      isWebMobilePortrait && styles.levelProgressStatCompactWeb,
                    ]}
                  >
                    <View
                      style={[
                        styles.levelIconContainer,
                        { backgroundColor: "rgba(16, 185, 129, 0.2)" },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="counter"
                        size={Platform.OS === "web" ? 24 : 18} // Smaller icon on mobile
                        color="#10B981"
                      />
                    </View>
                    <View
                      style={
                        Platform.OS === "web" && styles.levelProgressContentWeb
                      }
                    >
                      <Text
                        style={[
                          styles.levelProgressValue,
                          { color: "#10B981" },
                          Platform.OS !== "web" && styles.levelProgressValueMobile,
                          Platform.OS === "web" && styles.levelProgressValueWeb,
                        ]}
                      >
                        {levelProgress.progression.combinedScore}
                      </Text>
                      <Text
                        style={[
                          styles.levelProgressLabel,
                          { color: "#B0C4DE" },
                          Platform.OS !== "web" && styles.levelProgressLabelMobile,
                          Platform.OS === "web" && styles.levelProgressLabelWeb,
                        ]}
                      >
                        XP
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badgeContainer,
                        Platform.OS === "web" && styles.badgeContainerWeb,
                      ]}
                    >
                      {levelProgress.progression.combinedScore > 500 && (
                        <MaterialCommunityIcons
                          name="shield-check"
                          size={Platform.OS === "web" ? 14 : 12}
                          color="#10B981"
                        />
                      )}
                      {levelProgress.progression.combinedScore > 1000 && (
                        <MaterialCommunityIcons
                          name="medal"
                          size={Platform.OS === "web" ? 14 : 12}
                          color="#FFD700"
                        />
                      )}
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        )}
      </View>

      {/* Subject Selector Dropdown - Mobile optimized */}
      {showSubjectSelector && userSubjects.length > 0 && (
        <View
          style={[
            styles.sectionDropdown,
            { backgroundColor: colors.card, borderColor: colors.border },
            isWebMobilePortrait && styles.sectionDropdownCompactWeb,
          ]}
        >
          <View style={styles.dropdownHeader}>
            <Text style={[styles.dropdownTitle, { color: colors.text }]}>
              Select Subject
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSubjectSelector(false)}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.dropdownScroll}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              key={99999999}
              style={[
                styles.sectionDropdownItem,
                !selectedSubject && {
                  backgroundColor: `${colors.primary}20`,
                },
              ]}
              onPress={() => {
                setSelectedSubject(null);
                setShowSubjectSelector(false);
                fetchModules();
              }}
              activeOpacity={0.7}
            >
                <Ionicons
                  name="book-outline"
                size={16}
                color={!selectedSubject ? colors.primary : colors.textSecondary}
              />
              <View style={styles.sectionInfo}>
                <Text
                  style={[
                    styles.sectionName,
                    {
                      color: !selectedSubject ? colors.primary : colors.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  All Subjects
                </Text>
                <Text
                  style={[
                    styles.sectionDescription,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  View modules from all your subjects
                </Text>
              </View>
            </TouchableOpacity>
            {userSubjects.map((sectionItem) => (
              <TouchableOpacity
                key={sectionItem._id || sectionItem.id}
                style={[
                  styles.sectionDropdownItem,
                  (selectedSubject?._id || selectedSubject?.id) ===
                    (sectionItem._id || sectionItem.id) && {
                    backgroundColor: `${colors.primary}20`,
                  },
                ]}
                onPress={() => {
                  setSelectedSubject(sectionItem);
                  setShowSubjectSelector(false);
                  fetchModules();
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="book-outline"
                  size={16}
                  color={
                    (selectedSubject?._id || selectedSubject?.id) ===
                    (sectionItem._id || sectionItem.id)
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <View style={styles.sectionInfo}>
                  <Text
                    style={[
                      styles.sectionName,
                      {
                        color:
                          (selectedSubject?._id || selectedSubject?.id) ===
                          (sectionItem._id || sectionItem.id)
                            ? colors.primary
                            : colors.text,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {sectionItem.name}
                  </Text>
                  <Text
                    style={[
                      styles.sectionDescription,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {isInstructorOrAdmin
                      ? `${sectionItem.description || "No description"} • ${
                          sectionItem.studentCount ??
                          sectionItem.students?.length ??
                          0
                        } students`
                      : sectionItem.description || "No description"}
                  </Text>
                </View>
                {(selectedSubject?._id || selectedSubject?.id) ===
                  (sectionItem._id || sectionItem.id) && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Background Selector Dropdown */}
      {showBackgroundSelector && isinstructor && (
        <View
          style={[
            styles.backgroundDropdown,
            { backgroundColor: colors.card, borderColor: colors.border },
            isWebMobilePortrait && styles.backgroundDropdownCompactWeb,
          ]}
        >
          <Text
            style={[styles.backgroundDropdownTitle, { color: colors.text }]}
          >
            Select Map Background
          </Text>

          <ScrollView style={styles.backgroundScrollView}>
            {BACKGROUND_OPTIONS.map((background) => (
              <TouchableOpacity
                key={background.id}
                style={[
                  styles.backgroundDropdownItem,
                  selectedBackground.id === background.id && {
                    backgroundColor: `${colors.primary}20`,
                  },
                ]}
                onPress={() => handleBackgroundChange(background)}
                activeOpacity={0.7}
              >
                <Image
                  source={background.image}
                  style={styles.backgroundThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.backgroundInfo}>
                  <Text
                    style={[
                      styles.backgroundName,
                      {
                        color:
                          selectedBackground.id === background.id
                            ? colors.primary
                            : colors.text,
                      },
                    ]}
                  >
                    {background.name}
                  </Text>
                </View>
                {selectedBackground.id === background.id && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View
          style={[
            styles.loadingContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            🗺️ Charting your adventure path...
          </Text>
        </View>
      ) : error ? (
        <View
          style={[
            styles.errorContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <Ionicons name="alert-circle" size={40} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchModules}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : modules.length === 0 ? (
        userSubjects.length === 0 ? (
          <View
            style={[
              styles.errorContainer,
              {
                backgroundColor: colors.background,
                alignItems: "center", // Center content horizontally
                justifyContent: "center", // Center content vertically
                paddingHorizontal: 20,
                paddingVertical: 40,
              },
            ]}
          >
            <Ionicons
              name="school-outline"
              size={50}
              color={COLORS.textSecondary}
            />
            <Text style={[styles.emptyModulesTitle, { textAlign: "center" }]}>
              No Subjects Available
            </Text>
            <Text style={[styles.emptyModulesText, { textAlign: "center" }]}>
              {isinstructor
                ? "You haven't created any subjects yet. Create a subject to start building cyber quests."
                : "You're not assigned to any subjects yet. Contact your instructor to be added to one or more subjects."}
            </Text>

            {/* Container for buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isWebMobilePortrait && styles.actionButtonWebCompact,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={fetchModules}
              >
                <Ionicons name="refresh" size={20} color={colors.text} />
                <Text style={[styles.actionButtonText, { color: colors.text }]}> 
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : selectedSubject ? (
          <View
            style={[
              styles.errorContainer,
              { backgroundColor: colors.background, alignItems: "center" },
            ]}
          >
            <Ionicons
              name="map-outline"
              size={50}
              color={COLORS.textSecondary}
            />
            <Text style={[styles.emptyModulesTitle, { textAlign: "center" }]}>
              No Cyber Quests in {selectedSubject.name}
            </Text>
            <Text style={styles.emptyModulesText}>
              {selectedSubject.name} doesn&apos;t have any cyber quests yet.{" "}
              {isinstructor
                ? "Create some cyber quests to get started!"
                : "Your instructor hasn't created any cyber quests for this subject yet."}
            </Text>

            {/* Container for buttons to avoid stretching */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isWebMobilePortrait && styles.actionButtonWebCompact,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => {
                  setRefreshing(true);
                  fetchModules().then(() => {
                    setRefreshing(false);
                  });
                }}
              >
                <Ionicons name="refresh" size={20} color={colors.text} />
                <Text style={[styles.actionButtonText, { color: colors.text }]}>
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View
            style={[styles.container, { backgroundColor: colors.background }]}
          >
            {/* Section List Header */}
            <View
              style={[
                styles.sectionListHeader,
                isWebMobilePortrait && styles.sectionListHeaderCompactWeb,
              ]}
            >
              <Text style={styles.sectionListTitle}>Cyber Quest Map</Text>
              <Text style={styles.sectionListSubtitle}>
                Choose a subject to view its quest map
              </Text>
            </View>

            {/* Scrollable Section List */}
            <ScrollView
              style={[
                styles.sectionListContainer,
                isWebMobilePortrait && styles.sectionListContainerCompactWeb,
              ]}
              contentContainerStyle={[
                styles.sectionListContent,
                isWebCompact && styles.sectionListContentCompactWeb,
              ]}
              showsVerticalScrollIndicator={false}
            >
              {userSubjects.map((section, index) => (
                <TouchableOpacity
                  key={section._id || section.id}
                  style={[
                    styles.sectionListItem,
                    { borderColor: colors.border },
                    index === 0 && styles.sectionListItemFirst,
                    isWebCompact && styles.sectionListItemTabletWeb,
                    isWebMobilePortrait && styles.sectionListItemCompactWeb,
                  ]}
                  onPress={() => {
                    setSelectedSubject(section);
                    fetchModules();
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.sectionListIcon,
                      isWebMobilePortrait && styles.sectionListIconCompactWeb,
                    ]}
                  >
                    <Ionicons
                      name="book"
                      size={isWebMobilePortrait ? 24 : 28}
                      color={COLORS.primary}
                      style={styles.sectionListIconImage}
                    />
                    {isInstructorOrAdmin &&
                      (section.studentCount ?? section.students?.length ?? 0) >
                        0 && (
                      <View style={styles.studentCountBadge}>
                        <Text style={styles.studentCountText}>
                          {section.studentCount ?? section.students?.length ?? 0}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={[
                      styles.sectionListInfo,
                      isWebMobilePortrait && styles.sectionListInfoCompactWeb,
                    ]}
                  >
                    <Text
                      style={[styles.sectionListName, { color: colors.text }]}
                      numberOfLines={isWebMobilePortrait ? 2 : Platform.OS === "web" ? undefined : 1}
                      ellipsizeMode={isWebMobilePortrait ? "tail" : Platform.OS === "web" ? undefined : "tail"}
                    >
                      {section.name}
                    </Text>
                    {section.description && (
                      <Text
                        style={[
                          styles.sectionListDescription,
                          { color: colors.textSecondary },
                        ]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {section.description}
                      </Text>
                    )}
                    {isInstructorOrAdmin && (
                      <View style={styles.sectionListMeta}>
                        <View style={styles.sectionListMetaItem}>
                          <Ionicons
                            name="people"
                            size={14}
                            color={COLORS.textSecondary}
                          />
                          <Text
                            style={[
                              styles.sectionListMetaText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {section.studentCount ?? section.students?.length ?? 0} students
                          </Text>
                        </View>
                        {(section.subjectCode || section.sectionCode) && (
                          <View style={styles.sectionListMetaItem}>
                            <Ionicons
                              name="key"
                              size={14}
                              color={COLORS.textSecondary}
                            />
                            <Text
                              style={[
                                styles.sectionListMetaText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {section.subjectCode || section.sectionCode}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  <View
                    style={[
                      styles.sectionListArrow,
                      isWebMobilePortrait && styles.sectionListArrowCompactWeb,
                    ]}
                  >
                    <Ionicons
                      name="chevron-forward-circle"
                      size={isWebMobilePortrait ? 24 : 28}
                      color={COLORS.primary}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Action Buttons */}
            <View
              style={[
                styles.sectionListActions,
                {
                  backgroundColor:
                    Platform.OS === "web"
                      ? "rgba(255, 255, 255, 0.82)"
                      : colors.surface,
                  borderTopColor:
                    Platform.OS === "web"
                      ? "rgba(148, 163, 184, 0.28)"
                      : colors.border,
                },
                isWebMobilePortrait && styles.sectionListActionsCompactWeb,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.refreshSectionButton,
                  Platform.OS === "web"
                    ? styles.refreshSectionButtonWeb
                    : {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderWidth: 1,
                      },
                  Platform.OS === "web" && {
                    backgroundColor: isDarkMode
                      ? "rgba(15, 23, 42, 0.92)"
                      : "rgba(248, 250, 252, 0.96)",
                    borderColor: isDarkMode
                      ? "rgba(148, 163, 184, 0.42)"
                      : "rgba(148, 163, 184, 0.58)",
                  },
                  isWebMobilePortrait && styles.refreshSectionButtonWebCompact,
                ]}
                onPress={fetchModules}
              >
                {Platform.OS !== "web" && (
                  <Ionicons
                    name="refresh"
                    size={20}
                    color={colors.text}
                  />
                )}
                <Text
                  style={[
                    styles.refreshSectionButtonText,
                    Platform.OS === "web" && styles.refreshSectionButtonTextWeb,
                    isWebMobilePortrait && styles.refreshSectionButtonTextCompactWeb,
                    {
                      color:
                        Platform.OS === "web"
                          ? isDarkMode
                            ? "#f8fafc"
                            : "#0f172a"
                          : colors.text,
                    },
                  ]}
                  numberOfLines={Platform.OS === "web" ? undefined : 1}
                  ellipsizeMode={Platform.OS === "web" ? "tail" : "clip"}
                >
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.mapContainer}
          contentContainerStyle={[
            styles.mapContent,
            {
              // Calculate proper height to prevent scrolling past Level 1
              minHeight: (() => {
                if (modules.length === 0)
                  return viewportHeight;

                // Get Level 1 (index 0) position
                const level1Position = getModulePosition(0);
                const nodeHeight = 120;
                const screenHeight = viewportHeight;

                // Make sure Level 1 is at the bottom of the screen
                // The content height should be: Level 1's Y position + node height
                const contentHeight = level1Position.y + nodeHeight;

                // But ensure we have at least screen height
                return Math.max(contentHeight, screenHeight);
              })(),
              paddingBottom: 0,
            },
          ]}
          contentInset={{ bottom: 0 }}
          contentOffset={{
            y: (() => {
              if (modules.length === 0) return 0;

              // Calculate initial scroll position to show Level 1 at bottom
              const level1Position = getModulePosition(0);
              const nodeHeight = 90;
              const screenHeight = viewportHeight;
              const contentHeight = level1Position.y + nodeHeight;

              // If content is taller than screen, scroll to show Level 1 at bottom
              return Math.max(0, contentHeight - screenHeight);
            })(),
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.white}
              title="Refreshing map..."
              titleColor={COLORS.white}
            />
          }
          showsVerticalScrollIndicator={true}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          // Enhanced scrolling properties
          bounces={false} // Prevent bouncing past content
          alwaysBounceVertical={false}
          overScrollMode="never" // Android specific
          scrollEnabled={true} // Explicitly enable scrolling
          directionalLockEnabled={true} // Only vertical scrolling
          // Make scrolling more responsive
          decelerationRate="fast" // Faster scroll deceleration
          maximumZoomScale={1} // Prevent zooming
          minimumZoomScale={1} // Prevent zooming
          bouncesZoom={false} // Prevent zoom bouncing
        >
          {/* Enhanced Parallax Background using selected background */}
          {(() => {
            const isWebMap = Platform.OS === "web";
            const backgroundWidth = isWebMap
              ? webMapStripWidth * webMapBackgroundScale
              : webMapStripWidth;
            const backgroundLeft = isWebMap
              ? webMapStripLeft - (backgroundWidth - webMapStripWidth) / 2
              : webMapStripLeft;
            const bgHeight = isWebMap
              ? Math.max(420, viewportHeight * 0.72) * webMapBackgroundScale
              : 400; // Keep web tiles tall enough so full image height is visible
            const totalHeight =
              modules.length > 0 ? modules.length * 200 + 600 : 800;
            // Slight web overlap + pixel snapping reduces visible seams between repeated tiles.
            const overlap = isWebMap ? 8 : 2;
            const snappedBgHeight = Math.round(bgHeight);
            const tileStep = Math.max(1, Math.round(snappedBgHeight - overlap));
            const topBuffer = isWebMap ? Math.round(snappedBgHeight * 1.2) : snappedBgHeight;
            const bottomBuffer = isWebMap
              ? Math.max(viewportHeight + snappedBgHeight * 1.5, snappedBgHeight * 2.5)
              : Math.max(viewportHeight + snappedBgHeight, snappedBgHeight * 2);
            const renderSpan = totalHeight + topBuffer + bottomBuffer;
            const numImages = Math.ceil(renderSpan / tileStep) + (isWebMap ? 2 : 1);

            return Array.from({ length: numImages }).map((_, i) => (
              <Animated.Image
                key={`bg-img-${i}`}
                source={selectedBackground.image}
                style={[
                  styles.mapBackground,
                  {
                    position: "absolute",
                    // Start above the map and render beyond bottom so zoom-out never exposes gaps.
                    top: Math.round(-topBuffer + i * tileStep),
                    height: snappedBgHeight,
                    width: backgroundWidth,
                    left: backgroundLeft,
                    zIndex: -1,
                    transform: [
                      {
                        translateY: scrollY.interpolate({
                          inputRange: [0, 1000],
                          outputRange: [0, -150],
                          extrapolate: "clamp",
                        }),
                      },
                    ],
                  },
                ]}
                resizeMode={isWebMap ? "contain" : "cover"}
                onError={() =>
                  console.log(
                    `Failed to load background image: ${selectedBackground.id}`
                  )
                }
              />
            ));
          })()}

          {/* Player Character */}
          <PlayerCharacter
            playerX={playerPosition.x}
            playerY={playerPosition.y}
            user={user}
            profileImageError={profileImageError}
            setProfileImageError={setProfileImageError}
            getCompatibleImageUrl={getCompatibleImageUrl}
          />

          {/* SVG Path Network - Curved Snake-like Candy Crush Style */}
          <Svg
            style={[
              styles.pathNetwork,
              {
                width: viewportWidth,
                height: modules.length > 0 ? modules.length * 200 + 600 : 800, // Further reduced height
              },
            ]}
          >
            <Defs>
              <LinearGradient
                id="activeGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <Stop offset="0%" stopColor={COLORS.gold} stopOpacity="0.8" />
                <Stop offset="50%" stopColor={COLORS.primary} stopOpacity="1" />
                <Stop offset="100%" stopColor={COLORS.gold} stopOpacity="0.8" />
              </LinearGradient>
              <LinearGradient
                id="inactiveGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <Stop
                  offset="0%"
                  stopColor={COLORS.textSecondary}
                  stopOpacity="0.4"
                />
                <Stop
                  offset="100%"
                  stopColor={COLORS.textSecondary}
                  stopOpacity="0.6"
                />
              </LinearGradient>
            </Defs>

            {modules.map((module, index) => {
              if (index === 0) return null;

              const currentPos = getModulePosition(index);
              const prevPos = getModulePosition(index - 1);

              const prevCenterX = prevPos.x + 45;
              const prevCenterY = prevPos.y + 45;
              const currentCenterX = currentPos.x + 45;
              const currentCenterY = currentPos.y + 45;

              const deltaX = currentCenterX - prevCenterX;
              const deltaY = currentCenterY - prevCenterY;
              const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

              const normalizedX = deltaX / distance;
              const normalizedY = deltaY / distance;

              const nodeRadius = 45;
              const lineStartX = prevCenterX + normalizedX * nodeRadius;
              const lineStartY = prevCenterY + normalizedY * nodeRadius;
              const lineEndX = currentCenterX - normalizedX * nodeRadius;
              const lineEndY = currentCenterY - normalizedY * nodeRadius;

              // Create curved path for snake-like appearance

              // Add curve control points for snake-like path
              const curviness = 30; // How much curve to add
              const controlX1 =
                lineStartX +
                deltaX * 0.3 +
                (deltaY > 0 ? curviness : -curviness);
              const controlY1 = lineStartY + deltaY * 0.3;
              const controlX2 =
                lineEndX - deltaX * 0.3 + (deltaY > 0 ? -curviness : curviness);
              const controlY2 = lineEndY - deltaY * 0.3;

              const isUnlocked =
                module.isUnlocked || modules[index - 1]?.isCompleted;
              const strokeColor = isUnlocked
                ? "url(#activeGradient)"
                : "url(#inactiveGradient)";

              // Create curved path string
              const pathData = `M ${lineStartX} ${lineStartY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${lineEndX} ${lineEndY}`;

              return (
                <React.Fragment key={`path-${index}`}>
                  {/* Curved connecting path - snake-like */}
                  <Path
                    d={pathData}
                    stroke={strokeColor}
                    strokeWidth={isUnlocked ? 6 : 3}
                    strokeOpacity={isUnlocked ? 1 : 0.5}
                    strokeLinecap="round"
                    fill="none"
                  />

                  {/* Connection dots at endpoints for better visual connection */}
                  <Circle
                    cx={lineStartX}
                    cy={lineStartY}
                    r={isUnlocked ? 8 : 5}
                    fill={isUnlocked ? COLORS.gold : COLORS.textSecondary}
                    fillOpacity={isUnlocked ? 0.9 : 0.4}
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth={1}
                  />
                  <Circle
                    cx={lineEndX}
                    cy={lineEndY}
                    r={isUnlocked ? 8 : 5}
                    fill={isUnlocked ? COLORS.gold : COLORS.textSecondary}
                    fillOpacity={isUnlocked ? 0.9 : 0.4}
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth={1}
                  />

                  {/* Animated sparkles along the path for unlocked connections */}
                  {isUnlocked && (
                    <>
                      <Circle
                        cx={(lineStartX + lineEndX) / 2}
                        cy={(lineStartY + lineEndY) / 2}
                        r={3}
                        fill={COLORS.gold}
                        fillOpacity={0.8}
                      />
                      <Circle
                        cx={lineStartX + (lineEndX - lineStartX) * 0.25}
                        cy={lineStartY + (lineEndY - lineStartY) * 0.25}
                        r={2}
                        fill={COLORS.primary}
                        fillOpacity={0.6}
                      />
                      <Circle
                        cx={lineStartX + (lineEndX - lineStartX) * 0.75}
                        cy={lineStartY + (lineEndY - lineStartY) * 0.75}
                        r={2}
                        fill={COLORS.primary}
                        fillOpacity={0.6}
                      />
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </Svg>

          {/* Module Locations */}
          {/* Module Locations */}
          {modules.map((module, index) => {
            const position = getModulePosition(index);

            return (
              <TouchableOpacity
                key={module._id}
                style={[
                  styles.moduleNode,
                  selectedModule?._id === module._id && styles.selectedNode,
                  !module.isUnlocked && styles.lockedNode,
                  module.isCompleted && styles.completedNode,
                  {
                    left: position.x,
                    top: position.y,
                  },
                ]}
                onPress={() => {
                  if (module.isUnlocked) {
                    movePlayerToModule(module, index);
                  } else {
                    // Show feedback for locked level
                    const previousLevel = Math.max(
                      1,
                      (module.order || index + 1) - 1
                    );
                    const lockedMsg =
                      previousLevel === 1
                        ? "This is the first level. Pull to refresh or try again in a moment."
                        : `Complete Level ${previousLevel} to unlock Level ${
                            module.order || index + 1
                          }!`;

                    if (Platform.OS === "web") {
                      alert(
                        `Level ${
                          module.order || index + 1
                        } is locked. ${lockedMsg}`
                      );
                    } else {
                      Alert.alert("Level Locked", lockedMsg, [
                        { text: "OK", style: "default" },
                      ]);
                    }

                    // Haptic feedback
                    if (Platform.OS !== "web") {
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Warning
                      );
                    }
                  }
                }}
                activeOpacity={module.isUnlocked ? 0.7 : 0.9}
                disabled={false} // Allow tapping for feedback, but handle logic in onPress
              >
                {/* Use the selected background's module image instead of fixed image */}
                {module.image ? (
                  <Image
                    source={{ uri: getModuleImageUrl(module.image) }}
                    style={[
                      styles.moduleImage,
                      !module.isUnlocked && styles.lockedImage,
                    ]}
                  />
                ) : (
                  <Image
                    source={
                      selectedBackground.moduleImage ||
                      require("../../assets/images/background1.jpg")
                    }
                    style={[
                      styles.moduleImage,
                      !module.isUnlocked && styles.lockedImage,
                    ]}
                  />
                )}

                {/* Always show the level indicator */}
                <Text style={styles.moduleLevel}>Level {index + 1}</Text>

                {/* Lock icon for locked modules - no dark overlay */}
                {!module.isUnlocked && (
                  <View style={styles.lockIcon}>
                    <Ionicons
                      name="lock-closed"
                      size={24}
                      color="rgba(255, 255, 255, 0.8)"
                    />
                  </View>
                )}

                {/* Question Preview - only show for unlocked modules and when not completed */}
                {module.isUnlocked && module.questionPreview && (
                  <View style={styles.questionPreviewContainer}>
                    <Text
                      style={[
                        styles.questionPreviewText,
                        (module.questionType === "sorting" ||
                          module.questionType === "cipher") &&
                          styles.newQuestionTypeText,
                      ]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {module.questionPreview}
                    </Text>
                  </View>
                )}

                {/* Progress indicator with stars or score */}
                {module.isCompleted && (
                  <View style={styles.completedBadge}>
                    {module.type === "cyber-quest" && module.bestScore ? (
                      // Show star rating based on score for cyber quests
                      <>
                        {(() => {
                          const score = module.bestScore;
                          let starCount = 0;
                          if (score >= 90) starCount = 3; // 3 stars for 90%+
                          else if (score >= 65)
                            starCount = 2; // 2 stars for 65-89%
                          else if (score >= 34) starCount = 1; // 1 star for 34-64%

                          return Array.from({ length: 3 }, (_, i) => (
                            <Ionicons
                              key={i}
                              name="star"
                              size={16}
                              color={
                                i < starCount
                                  ? COLORS.gold
                                  : "rgba(255,255,255,0.3)"
                              }
                            />
                          ));
                        })()}
                        <Text style={styles.scoreBadgeText}>
                          {module.bestScore}%
                        </Text>
                      </>
                    ) : (
                      // Default 3 stars for regular completed modules
                      <>
                        <Ionicons name="star" size={16} color={COLORS.gold} />
                        <Ionicons name="star" size={16} color={COLORS.gold} />
                        <Ionicons name="star" size={16} color={COLORS.gold} />
                      </>
                    )}
                  </View>
                )}

                {/* Current level indicator */}
                {module.isCurrent && !module.isCompleted && (
                  <View style={styles.currentBadge}>
                    <Ionicons
                      name="play-circle"
                      size={20}
                      color={COLORS.coral}
                    />
                  </View>
                )}

                {/* Level number badge */}
                <View style={styles.levelNumberBadge}>
                  <Text style={styles.levelNumberText}>{index + 1}</Text>
                </View>

                {/* instructor Options Button */}
                {isinstructor && (
                  <View style={styles.instructorOptionsContainer}>
                    <TouchableOpacity
                      style={styles.optionsButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        setMenuVisible(
                          menuVisible === module._id ? null : module._id
                        );
                      }}
                    >
                      <Ionicons
                        name="ellipsis-vertical"
                        size={18}
                        color={COLORS.white}
                      />
                    </TouchableOpacity>

                    {/* Options Menu Popup */}
                    {menuVisible === module._id && (
                      <>
                        <TouchableOpacity
                          style={styles.optionsOverlay}
                          onPress={(e) => {
                            e.stopPropagation();
                            setMenuVisible(null);
                          }}
                          activeOpacity={0}
                        />
                        <View
                          style={[
                            styles.optionsMenu,
                            Platform.OS === "android" &&
                              styles.optionsMenuAndroid,
                          ]}
                        >
                          <TouchableOpacity
                            style={styles.optionItem}
                            onPress={() => {
                              setMenuVisible(null);
                              router.push(`/(tabs)/create?edit=${module._id}`);
                            }}
                          >
                            <Ionicons
                              name="create-outline"
                              size={Platform.OS === "android" ? 24 : 16}
                              color={COLORS.white}
                            />
                            <Text
                              style={[
                                styles.optionText,
                                Platform.OS === "android" &&
                                  styles.optionTextAndroid,
                              ]}
                            >
                              Edit
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.optionItem,
                              styles.deleteOption,
                              Platform.OS === "android" &&
                                styles.optionItemAndroid,
                            ]}
                            onPress={() => {
                              setMenuVisible(null);
                              handleDeleteModule(module._id);
                            }}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={Platform.OS === "android" ? 24 : 16}
                              color={COLORS.error}
                            />
                            <Text
                              style={[
                                styles.optionText,
                                { color: COLORS.error },
                                Platform.OS === "android" &&
                                  styles.optionTextAndroid,
                              ]}
                            >
                              Delete
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Pagination Controls */}
        </ScrollView>
      )}

      {/* Enhanced Sticky Info Panel - Outside ScrollView */}
      {selectedModule && (
        <Animated.View
          style={[
            styles.enhancedInfoPanel,
            isWebMobilePortrait && styles.enhancedInfoPanelCompactWeb,
            {
              transform: [
                {
                  translateY: infoPanelAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
              opacity: infoPanelAnimation,
            },
          ]}
        >
          {/* Profile Section */}
          <View
            style={[
              styles.profileSection,
              isWebMobilePortrait && styles.profileSectionCompactWeb,
            ]}
          >
            {/* Profile Header with Title and Close Button */}
            <View style={styles.profileHeader}>
              <Text style={styles.profileTitle}>Your Profile</Text>

              <TouchableOpacity
                style={styles.enhancedCloseButton}
                onPress={() => {
                  setSelectedModule(null);
                  Animated.spring(infoPanelAnimation, {
                    toValue: 0,
                    friction: 8,
                    tension: 100,
                    useNativeDriver: true,
                  }).start();
                }}
              >
                <Ionicons name="close" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.profileContent,
                isWebMobilePortrait && styles.profileContentCompactWeb,
              ]}
            >
              {/* User Avatar */}
              <View
                style={[
                  styles.profileAvatar,
                  isWebMobilePortrait && styles.profileAvatarCompactWeb,
                ]}
              >
                {user?.profileImage && !profileImageError ? (
                  <Image
                    source={{
                      uri: getCompatibleImageUrl(user?.profileImage),
                    }}
                    style={styles.profileImage}
                    onError={() => setProfileImageError(true)}
                  />
                ) : (
                  <View style={styles.profileImageFallback}>
                    <Text style={styles.profileInitial}>
                      {user?.username?.charAt(0).toUpperCase() || "?"}
                    </Text>
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.profileInfo,
                  isWebMobilePortrait && styles.profileInfoCompactWeb,
                ]}
              >
                <Text style={styles.profileName}>
                  {user?.username || "Unknown Hero"}
                </Text>
                <Text style={styles.profileRole}>
                  {user?.privilege === "instructor"
                    ? "Instructor"
                    : user?.privilege === "admin"
                    ? "Admin"
                    : "Student"}
                </Text>
              </View>

              {/* Current Level Counter */}
              {!isAdmin && (
                <View
                  style={[
                    styles.currentLevelBadge,
                    isWebMobilePortrait && styles.currentLevelBadgeCompactWeb,
                  ]}
                >
                  <Text style={styles.currentLevelText}>
                    Level{" "}
                    {(modules?.findIndex((m) => m._id === selectedModule._id) ||
                      0) + 1}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats Section */}
          <View
            style={[
              styles.statsSection,
              isWebMobilePortrait && styles.statsSectionCompactWeb,
            ]}
          >
            <View
              style={[styles.statRow, isWebMobilePortrait && styles.statRowCompactWeb]}
            >
              {!isInstructorOrAdmin && (
                <View
                  style={[
                    styles.enhancedStatItem,
                    isWebMobilePortrait && styles.enhancedStatItemCompactWeb,
                  ]}
                >
                {!isInstructorOrAdmin && (
                  <View style={styles.enhancedStatIcon}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  </View>
                )}
                {!isInstructorOrAdmin && (
                  <Text style={styles.enhancedStatLabel}>Completed</Text>
                )}
                <Text style={styles.enhancedStatValue}>
                  {modules?.filter((m) => m.isCompleted)?.length || 0}
                  {!isInstructorOrAdmin ? " stages" : ""}
                </Text>
                </View>
              )}

              <View
                style={[
                  styles.enhancedStatItem,
                  isWebMobilePortrait && styles.enhancedStatItemCompactWeb,
                ]}
              >
                <View style={styles.enhancedStatIcon}>
                  <Ionicons name="play-circle" size={16} color="#FF9800" />
                </View>
                <Text style={styles.enhancedStatLabel}>Available</Text>
                <Text style={styles.enhancedStatValue}>
                  {modules?.filter((m) => m.isUnlocked && !m.isCompleted)
                    ?.length || 0}{" "}
                  stages
                </Text>
              </View>

              {!isInstructorOrAdmin && (
                  <View
                    style={[
                      styles.enhancedStatItem,
                      isWebMobilePortrait && styles.enhancedStatItemCompactWeb,
                    ]}
                  >
                {!isInstructorOrAdmin && (
                  <View style={styles.enhancedStatIcon}>
                    <Ionicons name="lock-closed" size={16} color="#757575" />
                  </View>
                )}
                {!isInstructorOrAdmin && (
                  <Text style={styles.enhancedStatLabel}>Locked</Text>
                )}
                <Text style={styles.enhancedStatValue}>
                  {modules?.filter((m) => !m.isUnlocked)?.length || 0}
                  {!isInstructorOrAdmin ? " stages" : ""}
                </Text>
                </View>
              )}
            </View>
          </View>

          {/* Module Info Section */}
          <View style={styles.moduleInfoSection}>
            <Text style={styles.moduleTitle}>{selectedModule.title}</Text>
            <Text style={styles.moduleDescription}>
              {selectedModule.description}
            </Text>

            <TouchableOpacity
              style={styles.enhancedStartButton}
              onPress={() => {
                // Always use the module/game route for all quests (cyber-quest and regular modules)
                // This route has the full game experience with animations, sprites, and backgrounds
                router.push({
                  pathname: `/module/game/${selectedModule._id}`,
                  params: {
                    returnSubjectId:
                      selectedSubject?._id || selectedSubject?.id || "",
                    returnModuleId: selectedModule?._id || selectedModule?.id || "",
                  },
                });
              }}
            >
              <Ionicons name="play" size={20} color="#FFFFFF" />
              <Text style={styles.enhancedStartButtonText}>
                {selectedModule.type === "cyber-quest"
                  ? "Start Quest"
                  : "Begin Quest"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* User Profile Panel */}
      {!loading && (
        <View style={styles.userProfilePanel}>
          <View style={styles.userProfileHeader}>
            <Text style={styles.userProfileTitle}>Profile</Text>
          </View>

          <View style={styles.userProfileContent}>
            {/* User Avatar */}
            <View style={styles.avatarContainer}>
              {user?.profileImage && !profileImageError ? (
                <Image
                  source={{ uri: getCompatibleImageUrl(user?.profileImage) }}
                  style={styles.userAvatar}
                  onError={() => setProfileImageError(true)}
                />
              ) : (
                <View style={styles.userAvatarFallback}>
                  <Text style={styles.avatarLetterText}>
                    {user?.username?.charAt(0).toUpperCase() || "?"}
                  </Text>
                </View>
              )}

              {/* User Role Badge */}
              <View style={styles.roleBadge}>
                <Ionicons
                  name={
                    user?.privilege === "instructor"
                      ? "shield"
                      : user?.privilege === "admin"
                      ? "star"
                      : "person"
                  }
                  size={12}
                  color={COLORS.white}
                />
              </View>
            </View>

            {/* User Info */}
            <View style={styles.userInfoBox}>
              <Text style={styles.usernameText}>
                {user?.username || "Unknown Hero"}
              </Text>

              <View style={styles.infoRow}>
                <Ionicons
                  name="ribbon-outline"
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.infoText}>
                  {user?.privilege === "instructor"
                    ? "Instructor"
                    : user?.privilege === "admin"
                    ? "Admin"
                    : "Student"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons
                  name={
                    user?.section === "no_section" ? "school-outline" : "school"
                  }
                  size={16}
                  color={user?.section === "no_section" ? "#aaa" : "#4CAF50"}
                />
                <Text
                  style={[
                    styles.infoText,
                    user?.section === "no_section" && {
                      color: "#aaa",
                      fontStyle: "italic",
                    },
                  ]}
                >
                  {user?.section === "no_section"
                    ? "No Class Assigned"
                    : user?.section}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            {!isInstructorOrAdmin && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {modules?.filter((m) => m.isCompleted)?.length || 0}
                </Text>
                {!isInstructorOrAdmin && (
                  <Text style={styles.statLabel}>Completed</Text>
                )}
              </View>
            )}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {modules?.filter((m) => m.isUnlocked && !m.isCompleted)
                  ?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            {!isInstructorOrAdmin && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {modules?.filter((m) => !m.isUnlocked)?.length || 0}
                </Text>
                {!isInstructorOrAdmin && <Text style={styles.statLabel}>Locked</Text>}
              </View>
            )}
          </View>
        </View>
      )}

      {Platform.OS === "web" && showJoinSubjectModal && (
        <Modal
          visible={showJoinSubjectModal}
          transparent
          animationType="fade"
          onRequestClose={handleCloseJoinSubjectModal}
        >
          <View style={styles.joinSubjectModalOverlay}>
            <TouchableWithoutFeedback onPress={handleCloseJoinSubjectModal}>
              <View style={styles.joinSubjectModalBackdrop} />
            </TouchableWithoutFeedback>
            <View
              style={[
                styles.joinSubjectModalCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                isWebMobilePortrait && styles.joinSubjectModalCardCompactWeb,
              ]}
            >
              <View style={styles.joinSubjectModalHeader}>
                <Text style={[styles.joinSubjectModalTitle, { color: colors.text }]}> 
                  Join Subject
                </Text>
                <TouchableOpacity
                  style={styles.joinSubjectModalCloseBtn}
                  onPress={handleCloseJoinSubjectModal}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <TextInput
                value={joinSubjectCode}
                onChangeText={setJoinSubjectCode}
                placeholder="Enter subject code"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                style={[
                  styles.joinSubjectModalInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              />

              {joinSubjectError ? (
                <Text style={styles.joinSubjectModalError}>{joinSubjectError}</Text>
              ) : null}

              <View style={styles.joinSubjectModalActions}>
                <TouchableOpacity
                  style={[styles.joinSubjectModalActionBtn, styles.joinSubjectModalCancelBtn]}
                  onPress={handleCloseJoinSubjectModal}
                  disabled={joinSubjectSubmitting}
                >
                  <Text style={styles.joinSubjectModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.joinSubjectModalActionBtn, styles.joinSubjectModalJoinBtn]}
                  onPress={handleSubmitJoinSubjectWeb}
                  disabled={joinSubjectSubmitting}
                >
                  <Text style={styles.joinSubjectModalJoinText}>
                    {joinSubjectSubmitting ? "Joining..." : "Join"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === "web" && showHistoryModal && (
        <Modal
          visible={showHistoryModal}
          transparent
          animationType="fade"
          onRequestClose={handleCloseHistoryModal}
        >
          <View style={styles.historyModalOverlay}>
            <TouchableWithoutFeedback onPress={handleCloseHistoryModal}>
              <View style={styles.historyModalBackdrop} />
            </TouchableWithoutFeedback>

            <View
              style={[
                styles.historyModalCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                isWebMobilePortrait && styles.historyModalCardCompactWeb,
              ]}
            >
              <View style={styles.historyModalHeader}>
                <Text style={[styles.historyModalTitle, { color: colors.text }]}>
                  CyberLearn History
                </Text>
                <TouchableOpacity
                  style={styles.historyModalCloseBtn}
                  onPress={handleCloseHistoryModal}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.historyModalScroll}
                contentContainerStyle={styles.historyModalScrollContent}
                showsVerticalScrollIndicator={true}
                persistentScrollbar={Platform.OS === "web"}
              >
                {historyLoading && (
                  <View style={styles.historyModalCentered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.historyModalInfoText, { color: colors.textSecondary }]}>
                      Loading history...
                    </Text>
                  </View>
                )}

                {!historyLoading && historyError ? (
                  <View style={styles.historyModalCentered}>
                    <Ionicons name="alert-circle" size={44} color="#EF4444" />
                    <Text style={styles.historyModalErrorText}>{historyError}</Text>
                    <TouchableOpacity
                      style={[styles.historyModalRetryBtn, { backgroundColor: colors.primary }]}
                      onPress={fetchCyberlearnHistoryWeb}
                    >
                      <Text style={styles.historyModalRetryText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {!historyLoading && !historyError && historyItems.length === 0 ? (
                  <View style={styles.historyModalCentered}>
                    <Ionicons name="time-outline" size={42} color={colors.textSecondary} />
                    <Text style={[styles.historyModalInfoText, { color: colors.textSecondary }]}>
                      No CyberLearn history yet.
                    </Text>
                  </View>
                ) : null}

                {!historyLoading && !historyError && historyItems.length > 0
                  ? historyItems.map((item, index) => (
                      <View
                        key={item.id || item._id || `${item.title || "history"}-${index}`}
                        style={[
                          styles.historyModalItem,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.historyModalItemTitle, { color: colors.text }]}>
                          {item.title || "CyberLearn Quest"}
                        </Text>
                        <Text style={[styles.historyModalItemDetail, { color: colors.textSecondary }]}> 
                          Subject: {item.subjectName || "N/A"}
                        </Text>
                        <Text style={[styles.historyModalItemDetail, { color: colors.textSecondary }]}> 
                          Level: {item.level ?? "N/A"} • Attempt: {item.attemptNumber ?? "N/A"}
                        </Text>
                        <Text style={[styles.historyModalItemDetail, { color: colors.textSecondary }]}> 
                          Score: {typeof item.score === "number" ? `${item.score}%` : "N/A"}
                        </Text>
                        <Text style={[styles.historyModalItemDetail, { color: colors.textSecondary }]}> 
                          Correct: {formatHistoryCount(item.correctAnswers)} • Incorrect: {formatHistoryCount(item.incorrectAnswers)}
                          {typeof item.totalQuestions === "number"
                            ? ` • Total: ${item.totalQuestions}`
                            : ""}
                        </Text>
                        <Text style={[styles.historyModalItemDetail, { color: colors.textSecondary }]}> 
                          Difficulty: {item.difficulty || "medium"}
                        </Text>
                        <Text style={[styles.historyModalItemDetail, { color: colors.textSecondary }]}> 
                          Finished: {item.completedAt ? new Date(item.completedAt).toLocaleString() : "N/A"}
                        </Text>
                      </View>
                    ))
                  : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Section/background selector overlay - visible when any dropdown is open */}
      {(showSubjectSelector || showBackgroundSelector) && (
        <TouchableWithoutFeedback
          onPress={() => {
            setShowSubjectSelector(false);
            setShowBackgroundSelector(false);
          }}
        >
          <View style={styles.sectionSelectorOverlay} />
        </TouchableWithoutFeedback>
      )}
    </ExpoLinearGradient>
  );
}

const styles = StyleSheet.create({
  levelProgressContainerWeb: {
    position: "fixed",
    top: "50%",
    transform: "translateY(-50%)",
    left: 16,
    width: 200,
    maxHeight: "80%",
    marginTop: 0,
    zIndex: 1000, // Increase z-index to ensure it's above other elements
    borderRadius: 12,
    padding: 16,
    display: "flex", // Explicitly set display to flex
  },
  levelProgressContainerWebCompact: {
    position: "relative",
    top: "auto",
    left: "auto",
    transform: "none",
    width: "100%",
    maxWidth: "100%",
    maxHeight: "none",
    marginTop: 8,
    padding: 12,
    zIndex: 2,
  },

  levelProgressHeaderWeb: {
    justifyContent: "center",
    marginBottom: 16,
  },

  levelProgressUserInfoWeb: {
    marginBottom: 16,
    paddingBottom: 12,
  },

  levelProgressStatsWeb: {
    flexDirection: "column",
    justifyContent: "flex-start",
    gap: 16,
  },

  levelProgressStatWeb: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    justifyContent: "flex-start",
    gap: 10,
  },
  levelProgressStatsCompactWeb: {
    gap: 10,
  },
  levelProgressStatCompactWeb: {
    borderWidth: 1,
    borderRadius: 10,
    borderColor: "rgba(148, 163, 184, 0.2)",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },

  levelProgressContentWeb: {
    flex: 1,
  },

  levelProgressValueWeb: {
    fontSize: 16,
    marginBottom: 2,
    textAlign: "left",
  },

  levelProgressLabelWeb: {
    fontSize: 12,
    textAlign: "left",
  },

  progressBarContainerWeb: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
  },

  starContainerWeb: {
    position: "absolute",
    bottom: -2,
    left: 0,
    right: 0,
    justifyContent: "center",
  },

  badgeContainerWeb: {
    position: "absolute",
    bottom: -2,
    left: 0,
    right: 0,
    justifyContent: "center",
  },

  middleStatWeb: {
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 16,
    marginVertical: 8,
  },
  levelProgressUserInfo: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  levelProgressUsername: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
    textAlign: "center",
  },
  levelProgressFullName: {
    fontSize: 14,
    color: "#B0C4DE",
    fontStyle: "italic",
    textAlign: "center",
  },
  levelProgressContainerMobile: {
    marginTop: 4,
    marginBottom: 2,
    padding: 8, // Reduced padding
    borderRadius: 10,
  },
  levelProgressStatsMobile: {
    paddingVertical: 2, // Less vertical padding
  },
  levelProgressValueMobile: {
    fontSize: 15, // Smaller font size (was 18)
  },
  levelProgressLabelMobile: {
    fontSize: 10, // Smaller font size (was 12)
    marginBottom: 1,
  },
  levelIconContainer: {
    width: Platform.OS === "web" ? 40 : 32, // Smaller container on mobile
    height: Platform.OS === "web" ? 40 : 32,
    borderRadius: Platform.OS === "web" ? 20 : 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Platform.OS === "web" ? 6 : 3, // Less margin on mobile
  },
  progressBarContainer: {
    width: "90%" // Slightly narrower
  },
  progressBarContainerAndroid: {
    width: "84%",
    height: 6,
    marginTop: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(41, 121, 255, 0.2)",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },
  starContainer: {
    flexDirection: "row",
    gap: Platform.OS === "web" ? 2 : 1, // Less space between stars on mobile
    marginTop: Platform.OS === "web" ? 4 : 2,
  },
  badgeContainer: {
    flexDirection: "row",
    gap: Platform.OS === "web" ? 4 : 2, // Less space between badges on mobile
    marginTop: Platform.OS === "web" ? 4 : 2,
  },
  sectionListContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 60, // Room for bottom buttons
    ...Platform.select({
      web: {
        maxWidth: "1240px",
        marginLeft: "auto",
        marginRight: "auto",
        paddingHorizontal: 10,
      },
      default: {},
    }),
  },
  sectionListContainerCompactWeb: {
    ...Platform.select({
      web: {
        paddingHorizontal: 8,
      },
      default: {},
    }),
  },
  sectionListContent: {
    paddingVertical: 8,
    paddingBottom: 80, // Extra padding for action buttons
    ...Platform.select({
      web: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "stretch",
        justifyContent: "flex-start",
        gap: 12,
      },
      default: {},
    }),
  },
  sectionListContentCompactWeb: {
    ...Platform.select({
      web: {
        justifyContent: "center",
        gap: 10,
        paddingBottom: 96,
      },
      default: {},
    }),
  },
  sectionListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.34)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    ...Platform.select({
      web: {
        width: "calc(33.333% - 12px)",
        minWidth: 360,
        maxWidth: 450,
        minHeight: 184,
        maxHeight: 184,
        marginLeft: 0,
        marginRight: 0,
        paddingHorizontal: 18,
        paddingVertical: 16,
      },
      default: {
        marginHorizontal: 2,
      },
    }),
  },
  sectionListItemTabletWeb: {
    ...Platform.select({
      web: {
        width: "calc(50% - 12px)",
        minWidth: 280,
        maxWidth: "none",
        minHeight: 170,
        maxHeight: "none",
      },
      default: {},
    }),
  },
  sectionListItemCompactWeb: {
    ...Platform.select({
      web: {
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        minHeight: 0,
        maxHeight: "none",
        paddingHorizontal: 12,
        paddingVertical: 12,
      },
      default: {},
    }),
  },
  sectionListItemFirst: {
    marginTop: 4, // Add more space for first item
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderColor: "rgba(99, 102, 241, 0.45)",
  },
  sectionListIcon: {
    position: "relative",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(25, 118, 210, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    borderWidth: 2,
    borderColor: "#1976d2",
    ...Platform.select({
      web: {
        width: 64,
        height: 64,
        borderRadius: 32,
      },
      default: {},
    }),
  },
  sectionListIconCompactWeb: {
    ...Platform.select({
      web: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 10,
      },
      default: {},
    }),
  },
  sectionListIconImage: {
    textShadowColor: "rgba(25, 118, 210, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  studentCountBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF6B6B",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
  },
  studentCountText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    paddingHorizontal: 4,
  },
  sectionListInfo: {
    flex: 1,
    paddingRight: 10,
    ...Platform.select({
      web: {
        minHeight: 136,
        maxHeight: 136,
        justifyContent: "flex-start",
        overflow: "hidden",
        overflowY: "auto",
      },
      default: {},
    }),
  },
  sectionListInfoCompactWeb: {
    ...Platform.select({
      web: {
        minHeight: 0,
        maxHeight: "none",
        overflow: "visible",
        overflowY: "visible",
      },
      default: {},
    }),
  },
  sectionListName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0A2647", // Dark blue text for contrast
    marginBottom: 4,
    ...Platform.select({
      web: {
        fontSize: 16,
        lineHeight: "21px",
        marginBottom: 6,
        overflowWrap: "break-word",
        wordBreak: "break-word",
      },
      ios: {
        fontSize: 17,
      },
      android: {
        fontSize: 16,
      },
    }),
  },
  // Update the sectionListDescription style to make text fully visible on all platforms
  sectionListDescription: {
    fontSize: 14,
    color: "#444444", // Darker text for better readability
    marginBottom: 8,
    lineHeight: 20, // Increased from 18 to give more space
    flexShrink: 1, // Allow text to shrink to fit
    flexWrap: "wrap", // Ensure text wraps properly
    ...Platform.select({
      web: {
        lineHeight: "20px", // Use px unit for web
        maxWidth: "100%", // Ensure it doesn't overflow container
        overflowWrap: "break-word", // Better text wrapping for web
        wordBreak: "break-word", // Handle long words
        minHeight: 0,
        maxHeight: "none",
        display: "block", // Use block display on web
      },
      default: {},
    }),
  },
  sectionListMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  sectionListMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(25, 118, 210, 0.15)", // Lighter blue background
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sectionListMetaText: {
    fontSize: 11,
    color: "#1976d2", // Blue text for metadata
    fontWeight: "500",
  },
  sectionListArrow: {
    marginLeft: 8,
    backgroundColor: "rgba(25, 118, 210, 0.2)", // Lighter background
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(25, 118, 210, 0.4)",
    ...Platform.select({
      web: {
        width: 44,
        height: 44,
        borderRadius: 22,
      },
      default: {},
    }),
  },
  sectionListArrowCompactWeb: {
    ...Platform.select({
      web: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginLeft: 6,
      },
      default: {},
    }),
  },
  sectionListHeader: {
    padding: 16,
    paddingVertical: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.25)",
    backgroundColor: "rgba(255, 255, 255, 0.84)",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    ...Platform.select({
      web: {
        maxWidth: "700px",
        marginLeft: "auto",
        marginRight: "auto",
      },
      default: {},
    }),
  },
  sectionListHeaderCompactWeb: {
    ...Platform.select({
      web: {
        marginHorizontal: 8,
        marginTop: 6,
        marginBottom: 10,
        paddingHorizontal: 12,
        paddingVertical: 14,
      },
      default: {},
    }),
  },
  sectionListTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  sectionListSubtitle: {
    fontSize: 14,
    color: "#334155",
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "600",
  },
  header: {
    flexDirection: "column",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.35)",
    backgroundColor: "rgba(255,255,255,0.86)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 10,
  },
  headerCompactWeb: {
    ...Platform.select({
      web: {
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 10,
      },
      default: {},
    }),
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  headerControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  headerControlsCompactWeb: {
    ...Platform.select({
      web: {
        flexDirection: "column",
        alignItems: "stretch",
        gap: 10,
      },
      default: {},
    }),
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionsCompactWeb: {
    ...Platform.select({
      web: {
        width: "100%",
        flexWrap: "wrap",
        justifyContent: "flex-start",
      },
      default: {},
    }),
  },
  sectionSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
    gap: 8,
    flex: 1,
    minWidth: 140,
    maxWidth: 260,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionSelectorCompactWeb: {
    ...Platform.select({
      web: {
        minWidth: 0,
        maxWidth: "100%",
        width: "100%",
      },
      default: {},
    }),
  },
  sectionSelectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#ffffff",
  },
  backgroundSelector: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
  },
  instructorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
  },
  joinButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
  },
  historyHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
  },

  // Updated dropdown styles
  sectionDropdown: {
    position: "absolute",
    top: Platform.OS === "ios" ? 120 : 110,
    left: 16,
    right: 16,
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
    padding: 0,
    zIndex: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    maxHeight: 350,
    ...Platform.select({
      web: {
        maxWidth: "600px",
        left: "18%",
        right: "auto",
        transform: "translateX(-50%)",
      },
      default: {},
    }),
  },
  sectionDropdownCompactWeb: {
    ...Platform.select({
      web: {
        top: 98,
        left: 8,
        right: 8,
        maxWidth: "none",
        transform: "none",
      },
      default: {},
    }),
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.3)",
    padding: 12,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(148, 163, 184, 0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownScroll: {
    maxHeight: 300,
    padding: 8,
  },
  sectionDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
    marginBottom: 4,
  },

  // Updated level progress styles
  levelProgressContainer: {
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    // Remove the conflicting web-specific styles here
    ...Platform.select({
      web: {
        // Remove minWidth, marginLeft, and marginRight from here
        // They're already defined in levelProgressContainerWeb
      },
      default: {},
    }),
  },
  levelProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 6,
  },
  levelProgressHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  levelProgressHeaderCompactWeb: {
    ...Platform.select({
      web: {
        alignItems: "flex-start",
      },
      default: {},
    }),
  },
  levelProgressHeaderLeftCompactWeb: {
    ...Platform.select({
      web: {
        flex: 1,
        minWidth: 0,
      },
      default: {},
    }),
  },
  playerStatsToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  playerStatsToggleButtonCompactWeb: {
    ...Platform.select({
      web: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        alignSelf: "flex-start",
      },
      default: {},
    }),
  },
  playerStatsToggleText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
  },
  levelProgressTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  levelProgressStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  levelProgressStat: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 4,
  },
  middleStat: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  levelProgressLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  levelProgressValue: {
    fontSize: 18,
    fontWeight: "bold",
  },

  // Small screen optimizations
  dummyIndicator: {
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dummyText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
    overflow: "hidden",
    ...Platform.select({
      web: {
        width: "100vw",
        height: "100vh",
      },
      default: {},
    }),
  },
  webMapBackdropImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 2,
    transform: [{ scale: 1.08 }],
    ...Platform.select({
      web: {
        filter: "blur(12px)",
      },
      default: {},
    }),
  },
  webMapBackdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 16, 28, 0.25)",
  },

  headerLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  backgroundSelectorText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.primary,
  },
  webQuestActionButton: {
    width: "auto",
    minWidth: 122,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    gap: 6,
  },
  webQuestActionButtonCompact: {
    ...Platform.select({
      web: {
        minWidth: 0,
        paddingHorizontal: 8,
      },
      default: {},
    }),
  },
  webQuestActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },

  sectionInfo: {
    flex: 1,
    paddingRight: 10,
  },
  sectionDescription: {
    fontSize: 12,
    color: "#cccccc",
    flexWrap: "wrap",
    marginBottom: 4,
    ...Platform.select({
      web: {
        fontSize: 11,
        lineHeight: 14,
      },
      default: {},
    }),
  },
  sectionName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
    flexWrap: "wrap",
    ...Platform.select({
      web: {
        fontSize: 13,
      },
      default: {},
    }),
  },

  playerImage: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  player: {
    position: "absolute",
    width: 2,
    height: 2,
    zIndex: 10, // Increase this value to be higher than module nodes

    // ...other existing styles
  },
  moduleNode: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(25, 118, 210, 0.5)",
    borderWidth: 3,
    borderColor: "#1976d2",
    elevation: 12,
    zIndex: 4,
    ...Platform.select({
      web: {
        boxShadow:
          "0 0 20px rgba(25, 118, 210, 0.6), inset 0 0 15px rgba(255, 255, 255, 0.1)",
        backgroundImage:
          "linear-gradient(145deg, rgba(25, 118, 210, 0.7), rgba(25, 118, 210, 0.3))",
        cursor: "pointer",
        transition: "all 0.3s ease-in-out",
        ":hover": {
          transform: "scale(1.05)",
          boxShadow: "0 0 25px rgba(25, 118, 210, 0.8)",
        },
      },
      default: {
        shadowColor: "#1976d2",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
      },
    }),
  },
  selectedNode: {
    borderColor: "#FFD700",
    borderWidth: 4,
    backgroundColor: "rgba(255, 215, 0, 0.4)",
    ...Platform.select({
      web: {
        boxShadow: "0px 4px 8px rgba(255, 215, 0, 0.8)",
        animationKeyframes: {
          "0%": { transform: "scale(1.15)" },
          "50%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1.15)" },
        },
        animationDuration: "1.5s",
        animationIterationCount: "infinite",
      },
      default: {
        shadowColor: "#FFD700",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
    transform: [{ scale: 1.15 }],
  },
  completedNode: {
    borderColor: "#4CAF50",
    backgroundColor: "rgba(76, 175, 80, 0.3)",
    ...Platform.select({
      web: {
        boxShadow: "0px 4px 8px rgba(76, 175, 80, 0.8)",
      },
      default: {
        shadowColor: "#4CAF50",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  lockedNode: {
    opacity: 0.6,
    backgroundColor: "rgba(120, 120, 120, 0.4)",
    borderColor: "#888888",
    ...Platform.select({
      web: {
        cursor: "not-allowed",
        filter: "grayscale(60%)",
        boxShadow: "0 0 10px rgba(120, 120, 120, 0.3)",
      },
      default: {
        shadowColor: "#888888",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
    }),
  },
  moduleImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  moduleName: {
    color: "#ffffff",
    fontWeight: "bold",
    textAlign: "center",
    position: "absolute",
    top: -60,
    left: "50%",
    marginLeft: -50,
    width: 100,
    fontSize: 12,
  },
  moduleLevel: {
    position: "absolute",
    top: -25,
    left: "50%",
    marginLeft: -25,
    backgroundColor: "#2D5AA0", // Darker blue for better contrast
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    borderWidth: 2,
    borderColor: "#ffffff",
    textAlign: "center",
    minWidth: 50,
    boxShadow: "0px 2px 4px rgba(25, 118, 210, 0.8)",
    elevation: 5,
  },

  // Question Preview Styles
  questionPreviewContainer: {
    position: "absolute",
    bottom: -35,
    left: "50%",
    marginLeft: -45,
    backgroundColor: "rgba(25, 118, 210, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    width: 90,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    elevation: 3,
    shadowColor: "#1976d2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },

  questionPreviewText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 11,
  },

  newQuestionTypeText: {
    color: "#FFD700", // Gold color for new question types
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  infoPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10, 25, 41, 0.9)",
    padding: 16,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  stickyInfoPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10, 25, 41, 0.95)",
    padding: 20,
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
    boxShadow: "0px -5px  10px rgba(0, 0, 0, 0.3)",
    elevation: 10,
    zIndex: 100,
    transform: [{ translateY: 0 }],

    ...Platform.select({
      web: {
        boxShadow: "0 -5px 20px rgba(25, 118, 210, 0.3)",
        transition: "all 0.3s ease-in-out",
      },
      default: {},
    }),
  },
  // Enhanced Info Panel Styles
  enhancedInfoPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10, 25, 41, 0.98)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
    elevation: 15,
    zIndex: 100,
    ...Platform.select({
      web: {
        maxWidth: 350, // Make it narrower
        width: "30%", // Only take up 30% of screen width
        height: "auto", // Let it size naturally based on content
        left: "auto", // Position at left with some margin
        right: 50, // Override right:0
        bottom: 20, // Add some margin at bottom
        top: "auto", // Don't pin to top
        borderRadius: 12, // Rounded corners on all sides
        border: "2px solid rgba(25, 118, 210, 0.6)",
        marginHorizontal: 0, // Remove auto margins
        transform: "none", // Remove previous transformations
        boxShadow: "4px 4px 16px rgba(0, 0, 0, 0.4)",
        background:
          "linear-gradient(135deg, rgba(10, 25, 41, 0.98) 0%, rgba(15, 35, 60, 0.99) 100%)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
    }),
  },
  enhancedInfoPanelCompactWeb: {
    ...Platform.select({
      web: {
        width: "calc(100% - 16px)",
        maxWidth: "100%",
        right: 8,
        left: 8,
        bottom: 8,
        paddingTop: 14,
        paddingHorizontal: 12,
        paddingBottom: 14,
      },
      default: {},
    }),
  },
  profileSection: {
    marginBottom: 20,
  },
  profileSectionCompactWeb: {
    marginBottom: 12,
  },
  profileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  enhancedCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    zIndex: 101,
  },
  profileTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#cfb645ff",
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  profileContentCompactWeb: {
    ...Platform.select({
      web: {
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 10,
        paddingHorizontal: 4,
      },
      default: {},
    }),
  },
  profileAvatar: {
    marginRight: 15,
  },
  profileAvatarCompactWeb: {
    ...Platform.select({
      web: {
        marginRight: 0,
      },
      default: {},
    }),
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  profileImageFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  profileInitial: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
  },
  profileInfo: {
    flex: 1,
  },
  profileInfoCompactWeb: {
    ...Platform.select({
      web: {
        width: "100%",
      },
      default: {},
    }),
  },
  profileName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 12,
    color: "#cccccc",
  },
  currentLevelBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  currentLevelBadgeCompactWeb: {
    ...Platform.select({
      web: {
        alignSelf: "flex-start",
      },
      default: {},
    }),
  },
  currentLevelText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  statsSection: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statsSectionCompactWeb: {
    ...Platform.select({
      web: {
        padding: 10,
        marginBottom: 12,
      },
      default: {},
    }),
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statRowCompactWeb: {
    ...Platform.select({
      web: {
        flexDirection: "column",
        gap: 8,
      },
      default: {},
    }),
  },
  enhancedStatItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 5,
  },
  enhancedStatItemCompactWeb: {
    ...Platform.select({
      web: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
      },
      default: {},
    }),
  },
  enhancedStatIcon: {
    marginBottom: 5,
  },
  enhancedStatLabel: {
    fontSize: 10,
    color: "#cccccc",
    marginBottom: 2,
    textAlign: "center",
  },
  enhancedStatValue: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "bold",
    textAlign: "center",
  },
  rewardsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  rewardItem: {
    alignItems: "center",
  },
  rewardLabel: {
    fontSize: 11,
    color: "#cccccc",
    marginTop: 5,
    marginBottom: 2,
  },
  rewardValue: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "bold",
  },
  // Update inner content sections to work better with the new container width
  // Also update the inner content sections for the new panel size
  moduleInfoSection: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    ...Platform.select({
      web: {
        padding: 12, // Slightly reduce padding for smaller panel
        marginBottom: 0, // Remove bottom margin
      },
      default: {},
    }),
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  moduleDescription: {
    fontSize: 14,
    color: "#cccccc",
    marginBottom: 15,
    textAlign: "center",
    lineHeight: 20,
  },
  enhancedStartButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    ...Platform.select({
      web: {
        boxShadow: "0 4px 12px rgba(25, 118, 210, 0.4)",
      },
      default: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  enhancedStartButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  infoPanelCloseButton: {
    position: "absolute",
    top: 15,
    right: 15,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 101,
  },
  infoTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  infoDescription: {
    color: "#cccccc",
    marginBottom: 16,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  startButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
  loadMoreButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  loadMoreText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
  instructorOptionsContainer: {
    position: "absolute",
    top: -6,
    right: -6,
    zIndex: 30,
  },
  optionsButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffffff44",
  },
  optionsMenu: {
    position: "absolute",
    top: 28,
    right: 0,
    backgroundColor: "rgba(10, 25, 41, 0.95)",
    borderRadius: 8,
    width: 100,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#1976d2",
    zIndex: 50,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  optionsMenuAndroid: {
    width: 150,
    top: 30,
    right: -25,
    borderRadius: 12,
    paddingVertical: 8,
    borderWidth: 2,
    elevation: 10,
  },
  optionsOverlay: {
    position: "absolute",
    top: -10,
    right: -10,
    padding: 10,
    width: 300, // Larger touch area
    height: 300, // Larger touch area
    backgroundColor: "transparent",
    zIndex: 45,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  optionItemAndroid: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionText: {
    color: "#ffffff",
    marginLeft: 8,
    fontSize: 12,
  },
  optionTextAndroid: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 12,
  },
  deleteOption: {
    borderTopWidth: 1,
    borderTopColor: "#ffffff22",
    marginTop: 4, // Add some spacing
  },
  lockIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
    zIndex: 10,
  },
  lockedImage: {
    opacity: 0.4,
    filter: "grayscale(100%)",
  },
  lockedText: {
    opacity: 0.5,
  },
  completedBadge: {
    position: "absolute",
    bottom: -20,
    left: "50%",
    marginLeft: -30,
    backgroundColor: "rgba(76, 175, 80, 0.95)",
    borderRadius: 20,
    padding: 4,
    flexDirection: "row",
    borderWidth: 2,
    borderColor: "#4CAF50",
    boxShadow: "0px 0px 5px rgba(76, 175, 80, 0.8)",
    elevation: 5,
  },
  scoreBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    minWidth: 24,
  },
  currentBadge: {
    position: "absolute",
    bottom: -15,
    left: "50%",
    marginLeft: -10,
    backgroundColor: "rgba(255, 152, 0, 0.9)",
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: "#FF9800",
    boxShadow: "0px 0px 5px rgba(255, 152, 0, 0.8)",
    elevation: 5,
  },
  levelNumberBadge: {
    position: "absolute",
    display: "none",
    top: -45,
    left: "50%",
    marginLeft: -15,
    backgroundColor: "#1976d2",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    boxShadow: "0px 2px 4px rgba(25, 118, 210, 0.8)",
    elevation: 5,
  },
  lockedChallenge: {
    opacity: 0.6,
  },
  quizLockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderRadius: 15,
  },
  lockText: {
    color: "#ffffff",
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
  },
  emptyModulesTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyModulesText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: "center",
    marginHorizontal: 32,
    lineHeight: 24,
  },
  userProfilePanel: {
    position: "absolute",
    top: 70,
    left: 16,
    width: 200,
    backgroundColor: "rgba(10, 25, 41, 0.9)",
    borderRadius: 12,
    padding: 12,
    zIndex: 50,
    borderWidth: 1,
    borderColor: "#1976d2",
    boxShadow: "0px 0px 10px rgba(25, 118, 210, 0.5)",
    elevation: 8,
    maxHeight: 250,
    ...Platform.select({
      web: {
        display: "none", // Hide on web to prevent obstruction
      },
      default: {
        display: Dimensions.get("window").width < 600 ? "none" : "flex",
      },
    }),
  },

  userProfileHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    paddingBottom: 8,
    marginBottom: 12,
  },
  userProfileTitle: {
    color: "#cfb645ff",
    fontSize: 16,
    fontWeight: "bold",
    textShadow: "1px 1px 2px rgba(0, 0, 0, 0.5)",
  },
  userProfileContent: {
    flexDirection: "row",
    marginBottom: 12,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  userAvatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1976d2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#1976d2",
  },
  avatarLetterText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "bold",
  },
  roleBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0, 150, 255, 0.7)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  userInfoBox: {
    flex: 1,
    justifyContent: "center",
  },
  usernameText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  infoText: {
    color: "#cccccc",
    marginLeft: 4,
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#ffffff22",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    color: "#cccccc",
    fontSize: 12,
  },
  adminStatMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 2,
  },
  adminStatMetaText: {
    color: "#cccccc",
    fontSize: 12,
    fontWeight: "600",
  },

  pathNetwork: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 3,
  },
  pathLine: {
    position: "absolute",
    height: 8,
    borderRadius: 4,
    zIndex: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.3)",
    elevation: 3,
  },
  pathSegment: {
    position: "absolute",
    borderRadius: 4,
    zIndex: 3,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.4)",
    elevation: 4,

    ...Platform.select({
      web: {
        boxShadow: "0 0 8px rgba(76, 175, 80, 0.4)",
      },
      default: {},
    }),
  },
  diagonalPathLine: {
    position: "absolute",
    borderRadius: 6,
    zIndex: 3,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.4)",
    elevation: 4,

    ...Platform.select({
      web: {
        boxShadow: "0 0 8px rgba(76, 175, 80, 0.3)",
        transformOrigin: "0% 50%",
      },
      default: {},
    }),
  },
  pathDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 4,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.6)",
    boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.3)",
    elevation: 3,
  },
  pathSparkle: {
    position: "absolute",
    zIndex: 5,
    opacity: 0.8,
    ...Platform.select({
      web: {
        animationKeyframes: {
          "0%, 100%": { opacity: 0.4, transform: "scale(0.8)" },
          "50%": { opacity: 1, transform: "scale(1.2)" },
        },
        animationDuration: "2s",
        animationIterationCount: "infinite",
        animationTimingFunction: "ease-in-out",
      },
      default: {},
    }),
  },
  verticalPathLine: {
    position: "absolute",
    width: 10,
    borderRadius: 5,
    zIndex: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    elevation: 3,
    ...Platform.select({
      web: {
        backgroundColor: "rgba(255, 255, 255, 0.4)",
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255,255,255,0.2) 10px, rgba(255,255,255,0.2) 20px)",
        boxShadow: "2px 0px 4px rgba(0, 0, 0, 0.3)",
      },
      default: {
        backgroundColor: "rgba(255, 255, 255, 0.4)",
        shadowColor: "#000",
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
    }),
  },
  playerImageWithBorder: {
    borderWidth: 3,
    borderColor: "#FFD700",
    borderRadius: 20,
    boxShadow: "0px 0px 8px rgba(255, 215, 0, 0.8)",
    elevation: 8,
  },
  // Section List Styles

  sectionListActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    ...Platform.select({
      web: {
        maxWidth: 1240,
        width: "calc(100% - 20px)",
        marginHorizontal: "auto",
        paddingHorizontal: 12,
        paddingVertical: 10,
        justifyContent: "center",
        alignItems: "center",
        gap: 0,
        borderTopWidth: 1,
        borderRadius: 12,
        boxShadow: "0 6px 16px rgba(15, 23, 42, 0.06)",
      },
      default: {},
    }),
  },
  sectionListActionsCompactWeb: {
    ...Platform.select({
      web: {
        width: "calc(100% - 16px)",
        minWidth: 0,
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
      },
      default: {},
    }),
  },
  refreshSectionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(25, 118, 210, 0.3)",
    gap: 8,
    ...Platform.select({
      web: {
        width: "100%",
        minWidth: 0,
        maxWidth: "none",
        marginHorizontal: 0,
      },
      default: {},
    }),
  },
  refreshSectionButtonWeb: {
    flex: 0,
    alignSelf: "center",
    width: "auto",
    minWidth: 132,
    maxWidth: 260,
    minHeight: 44,
    backgroundColor: "rgba(248, 250, 252, 0.96)",
    borderColor: "rgba(148, 163, 184, 0.58)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    boxShadow: "0 3px 10px rgba(15, 23, 42, 0.1)",
    cursor: "pointer",
  },
  refreshSectionButtonWebCompact: {
    ...Platform.select({
      web: {
        width: "auto",
        minWidth: 120,
        maxWidth: "none",
        alignSelf: "center",
        minHeight: 46,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
      },
      default: {},
    }),
  },
  refreshSectionButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  refreshSectionButtonTextWeb: {
    fontSize: 14,
    letterSpacing: 0.2,
    lineHeight: 20,
    textAlign: "center",
    includeFontPadding: false,
    ...Platform.select({
      web: {
        whiteSpace: "nowrap",
      },
      default: {},
    }),
  },
  refreshSectionButtonTextCompactWeb: {
    ...Platform.select({
      web: {
        fontSize: 14,
        lineHeight: 20,
      },
      default: {},
    }),
  },
  createSectionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createSectionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  sectionSelectorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 15, // Lower than dropdown but higher than content
  },
  joinSubjectModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  joinSubjectModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.58)",
  },
  joinSubjectModalCard: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  joinSubjectModalCardCompactWeb: {
    ...Platform.select({
      web: {
        maxWidth: "96%",
        marginHorizontal: 8,
        padding: 14,
      },
      default: {},
    }),
  },
  joinSubjectModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  joinSubjectModalTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  joinSubjectModalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148, 163, 184, 0.16)",
  },
  joinSubjectModalInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  joinSubjectModalError: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "600",
  },
  joinSubjectModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  joinSubjectModalActionBtn: {
    minWidth: 96,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  joinSubjectModalCancelBtn: {
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  joinSubjectModalCancelText: {
    color: "#1f2937",
    fontWeight: "700",
    fontSize: 14,
  },
  joinSubjectModalJoinBtn: {
    backgroundColor: COLORS.primary,
  },
  joinSubjectModalJoinText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  historyModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  historyModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.58)",
  },
  historyModalCard: {
    width: "100%",
    maxWidth: 840,
    height: "84%",
    maxHeight: "84%",
    borderRadius: 14,
    borderWidth: 1,
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    overflow: "hidden",
    display: "flex",
  },
  historyModalCardCompactWeb: {
    ...Platform.select({
      web: {
        maxWidth: "96%",
        height: "90%",
        maxHeight: "90%",
      },
      default: {},
    }),
  },
  historyModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.25)",
  },
  historyModalTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  historyModalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148, 163, 184, 0.16)",
  },
  historyModalScroll: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === "web" && {
      overflowY: "scroll",
      scrollbarWidth: "thin",
    }),
  },
  historyModalScrollContent: {
    padding: 14,
    paddingBottom: 20,
    gap: 10,
    ...(Platform.OS === "web" && {
      paddingRight: 16,
    }),
  },
  historyModalCentered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 22,
  },
  historyModalInfoText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: "center",
  },
  historyModalErrorText: {
    marginTop: 10,
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
  },
  historyModalRetryBtn: {
    marginTop: 14,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  historyModalRetryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  historyModalItem: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  historyModalItemTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  historyModalItemDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  multiSubjectBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  multiSubjectBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  backgroundDropdown: {
    position: "absolute",
    top: 85,
    right: 16,
    width: 300,
    maxHeight: 400, // Limit height to ensure it fits on screen
    backgroundColor: "#0a1929",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 8,
    zIndex: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  backgroundDropdownCompactWeb: {
    ...Platform.select({
      web: {
        top: 96,
        right: 8,
        width: "calc(100% - 16px)",
        maxHeight: 360,
      },
      default: {},
    }),
  },

  backgroundScrollView: {
    maxHeight: 330, // Allow scrolling for many options
  },

  backgroundDropdownTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },

  backgroundDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
    marginBottom: 4,
  },

  backgroundThumbnail: {
    width: 60,
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },

  backgroundInfo: {
    flex: 1,
  },

  backgroundName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 280,
    marginTop: 20,
    gap: 12,
    alignSelf: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 46,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonWebCompact: {
    ...Platform.select({
      web: {
        width: "auto",
        minWidth: 120,
        alignSelf: "center",
        paddingHorizontal: 18,
        borderRadius: 10,
      },
      default: {},
    }),
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
    marginLeft: 8,
  },

  joinButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.primary,
    ...(Platform.OS === "web" && {
      fontSize: 20,
    }),
  },
  mapBackground: {
    ...Platform.select({
      web: {
        objectFit: "contain",
        opacity: 0.9, // Slightly reduce opacity to blend better
      },
      default: {
        left: 0,
        width: "100%",
      },
    }),
  },

  // Level Progress Styles
});
