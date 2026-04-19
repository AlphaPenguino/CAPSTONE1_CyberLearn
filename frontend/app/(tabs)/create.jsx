import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Platform,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  TouchableWithoutFeedback,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "@/store/authStore.js";
import { API_URL } from "@/constants/api.js";
import { useLocalSearchParams, useRouter } from "expo-router";
import { subjectsAPI } from "@/services/subjectsAPI.js";
import { useTheme } from "@/contexts/ThemeContext.js";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

// Custom Color Palette
const CREATOR_COLORS = {
  navyBlue: "#0F172A",
  white: "#FFFFFF",
  gold: "#14B8A6",
  warmBeige: "#94A3B8",
  coral: "#14B8A6",
  darkBlue: "#111827",
  lightBlue: "#2A9D8F",
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#f44336",
};

// Utility function to generate unique IDs
const generateUniqueId = () => Date.now() + Math.random();

// Function to migrate old sorting questions to have IDs
const migrateSortingItems = (questions) => {
  return questions.map((question) => {
    if (question.type === "sorting" && question.items) {
      return {
        ...question,
        items: question.items.map((item) => ({
          ...item,
          id: item.id || generateUniqueId(),
        })),
      };
    }
    return question;
  });
};

export default function Create() {
  const { edit, from, subjectId, focusModuleId } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  // Use dark blue in light mode instead of yellow for text & icon accents
  const highlightColor = isDarkMode ? colors.primary : "#1976d2";
  console.log("🚀 ~ Create ~ edit:", edit);
  const { user, token } = useAuthStore();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Debug logging
  console.log("🔍 Create Component - Edit param:", edit);
  console.log("🔍 Create Component - Type of edit:", typeof edit);

    // Simply check: if we have edit param, we're in edit mode
    // If user clicks Create tab directly, they can click "Create New" to start fresh
    const isEditMode = !!edit;
    const fromSource = Array.isArray(from) ? from[0] : from;
    const returnSubjectId = Array.isArray(subjectId) ? subjectId[0] : subjectId;
    const returnFocusModuleId = Array.isArray(focusModuleId)
    ? focusModuleId[0]
    : focusModuleId;
    const openedFromInstructorTools = fromSource === "instructor-tools";
    const openedFromIndex = fromSource === "index";
    console.log("🔍 Create Component - isEditMode:", isEditMode);

  // Internal UI state to track which creator is active
  const [activeCreator, setActiveCreator] = useState(() => {
    // If we have edit param, show editor by default
    const initialState = edit ? "cyber-quest-map" : "";
    console.log("🔍 Create Component - Initial activeCreator:", initialState);
    return initialState;
  });
  const questMenuControlRef = useRef(null);

    // Function to clear edit mode and show options
    const resetToCreateMode = useCallback(() => {
    console.log("🔍 Resetting to create mode");
    setActiveCreator("");
    // Clear URL parameters by replacing the current route
    router.replace("/create");
    }, [router]);

    const navigateBackToIndexWithContext = useCallback(() => {
    const params = {};
    if (returnSubjectId) {
      params.subjectId = String(returnSubjectId);
    }
    if (returnFocusModuleId) {
      params.focusModuleId = String(returnFocusModuleId);
    }

    if (Object.keys(params).length > 0) {
      router.replace({ pathname: "/(tabs)", params });
      return;
    }

    router.replace("/(tabs)");
    }, [returnSubjectId, returnFocusModuleId, router]);

    const handleCreatorBack = useCallback(() => {
    // In creator flows, go back to creator options first and clear edit params when needed.
    if (activeCreator) {
      questMenuControlRef.current?.closeMenu?.();
      if (isEditMode) {
        if (openedFromIndex) {
          navigateBackToIndexWithContext();
        } else {
          resetToCreateMode();
        }
      } else {
        setActiveCreator("");
      }
      return;
    }

    if (openedFromInstructorTools) {
      router.replace({
        pathname: "/(tabs)/instructor",
        params: { tab: "tools" },
      });
      return;
    }

    if (openedFromIndex) {
      navigateBackToIndexWithContext();
      return;
    }

    router.back();
    }, [
    activeCreator,
    isEditMode,
    openedFromIndex,
    openedFromInstructorTools,
    navigateBackToIndexWithContext,
    resetToCreateMode,
    router,
    questMenuControlRef,
    ]);

  useEffect(() => {
    if (activeCreator !== "cyber-quest-map") {
      questMenuControlRef.current?.closeMenu?.();
    }
  }, [activeCreator]);

  // Handle URL parameter changes
  useEffect(() => {
    console.log("🔍 Create Component - useEffect triggered, edit:", edit);

    if (edit) {
      // If edit parameter exists, go to editor
      console.log(
        "🔍 Create Component - Setting activeCreator to cyber-quest-map"
      );
      setActiveCreator("cyber-quest-map");
    } else {
      // If no edit parameter, show create options
      console.log(
        "🔍 Create Component - Setting activeCreator to empty (show options)"
      );
      setActiveCreator("");
    }
  }, [edit]); // Animate on tab change
  React.useEffect(() => {
    if (activeCreator) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [activeCreator, fadeAnim, slideAnim]);

  const CreatorCard = ({
    title,
    description,
    icon,
    onPress,
    gradient,
    disabled = false,
  }) => (
    <TouchableOpacity
      style={[styles.creatorCard, disabled && styles.disabledCard]}
      onPress={disabled ? null : onPress}
      activeOpacity={disabled ? 1 : 0.8}
    >
      <LinearGradient
        colors={disabled ? [colors.textSecondary, colors.border] : gradient}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardContent}>
          <View
            style={[
              styles.cardIcon,
              {
                backgroundColor: disabled
                  ? `${colors.text}20`
                  : "rgba(255, 255, 255, 0.2)",
              },
            ]}
          >
            <Ionicons
              name={icon}
              size={32}
              color={disabled ? colors.textSecondary : "#FFFFFF"}
            />
          </View>
          <Text
            style={[
              styles.cardTitle,
              { color: disabled ? colors.textSecondary : "#FFFFFF" },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: disabled ? colors.border : "#FFFFFF" },
            ]}
          >
            {description}
          </Text>
        </View>
        {!disabled && (
          <View style={styles.cardArrow}>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderCreateOptions = () => (
    <View style={styles.optionsContainer}>
      <CreatorCard
        title="Quest"
        description="Create instructor-led quizzes with multiple choice questions for subjects"
        icon="map"
        gradient={["#3f9f86", "#2f4f46"]}
        onPress={() => {
          // Clear any edit parameters when creating new
          console.log(
            "🔍 Cyber Quest Map clicked - setting activeCreator to cyber-quest-map"
          );
          setActiveCreator("cyber-quest-map");
        }}
      />

      <CreatorCard
        title="Course"
        description="Create and manage subjects with multi-subject student enrollment"
        icon="people"
        gradient={["#5fd2cd", "#3f9f86"]}
        onPress={() => setActiveCreator("section-management")}
      />
    </View>
  );

  const CyberQuestCreator = ({
    isCreateMode = false,
    useCompactHeader = false,
    menuControlRef = null,
  }) => {
    const params = useLocalSearchParams();
    const router = useRouter();
    const editQuestId = params.edit;

    const [questData, setQuestData] = useState({
      title: "",
      description: "",
      selectedSubject: null,
      difficulty: "medium",
      level: 1,
      questions: [],
    });

    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [creatingQuest, setCreatingQuest] = useState(false);
    // Replace dropdown with modal for subject selection (better large list UX)
    const [subjectDropdownVisible, setSubjectDropdownVisible] = useState(false); // legacy flag (kept for minimal refactor impact)
    const [subjectModalVisible, setSubjectModalVisible] = useState(false);
    const [showQuestionTypes, setShowQuestionTypes] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [loadingQuestData, setLoadingQuestData] = useState(false);
    const [loadedQuizSnapshot, setLoadedQuizSnapshot] = useState(null);

    // Modal state for success/error messages
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({
      title: "",
      message: "",
      type: "success", // "success" or "error"
      onConfirm: () => {},
    });
    const [showImportExportMenu, setShowImportExportMenu] = useState(false);

    const [showQuestionExamples, setShowQuestionExamples] = useState(true);

    useEffect(() => {
      if (!menuControlRef) return;

      menuControlRef.current = {
        toggleMenu: () => setShowImportExportMenu((v) => !v),
        closeMenu: () => setShowImportExportMenu(false),
      };

      return () => {
        if (menuControlRef.current) {
          menuControlRef.current = null;
        }
      };
    }, [menuControlRef]);

    // State for instructions modal
    const [showInstructionsModal, setShowInstructionsModal] = useState(false);

    // Helper function to show custom modal (cross-platform)
    const showCustomModal = (
      title,
      message,
      type = "success",
      onConfirm = () => {}
    ) => {
      if (Platform.OS === "web") {
        // Use custom modal for web
        setModalConfig({ title, message, type, onConfirm });
        setShowModal(true);
      } else {
        // Use native Alert for mobile
        Alert.alert(title, message, [{ text: "OK", onPress: onConfirm }]);
      }
    };

    // Fetch subjects function
    const fetchMySubjects = useCallback(async () => {
      try {
        setLoadingSubjects(true);
        const response = await fetch(`${API_URL}/subjects/user-subjects`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.subjects)) {
            setAvailableSubjects(data.subjects);
          }
        } else {
          showCustomModal("Error", "Failed to load your subjects", "error");
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
        showCustomModal("Error", "Failed to connect to server", "error");
      } finally {
        setLoadingSubjects(false);
      }
    }, []);

    const questionTypes = [
      {
        type: "multipleChoice",
        title: "Multiple Choice",
        icon: "list",
        color: CREATOR_COLORS.success,
        description: "Choose the best answer from options",
      },
      {
        type: "codeMissing",
        title: "Code Missing",
        icon: "code-slash",
        color: CREATOR_COLORS.lightBlue,
        description: "Fill in the missing code",
      },
      {
        type: "fillInBlanks",
        title: "Fill in Blanks",
        icon: "create",
        color: CREATOR_COLORS.warning,
        description: "Complete the sentence or code",
      },
      {
        type: "codeOrdering",
        title: "Code Ordering",
        icon: "swap-vertical",
        color: CREATOR_COLORS.coral,
        description: "Arrange code in correct order",
      },
      {
        type: "sorting",
        title: "Categorization",
        icon: "file-tray-stacked",
        color: "#9C27B0",
        description: "Sort items into correct categories",
      },
      {
        type: "cipher",
        title: "Cryptogram",
        icon: "key",
        color: "#FF5722",
        description: "Decode scrambled letters to find the answer",
      },
    ];

    const difficulties = [
      {
        value: "easy",
        label: "Easy Quest",
        color: CREATOR_COLORS.success,
      },
      {
        value: "medium",
        label: "Medium Quest",
        color: CREATOR_COLORS.warning,
      },
      {
        value: "hard",
        label: "Hard Quest",
        color: CREATOR_COLORS.error,
      },
    ];

    // Load instructor's subjects
    useEffect(() => {
      fetchMySubjects();
    }, [fetchMySubjects]);

    // Effect to match subject ID with subject object when editing
    useEffect(() => {
      if (
        isEditing &&
        availableSubjects.length > 0 &&
        questData.selectedSection
      ) {
        // If selectedSection is just an ID (string), find the matching subject object
        if (typeof questData.selectedSection === "string") {
          const matchedSubject = availableSubjects.find(
            (subject) => subject._id === questData.selectedSection
          );
          if (matchedSubject) {
            setQuestData((prevData) => ({
              ...prevData,
              selectedSection: matchedSubject,
            }));
          }
        }
      }
    }, [isEditing, availableSubjects, questData.selectedSection]);

    // Define fetchQuestData before using it in useEffect
    const fetchQuestData = useCallback(async (questId) => {
      try {
        setLoadingQuestData(true);
        const response = await fetch(`${API_URL}/cyber-quests/${questId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.cyberQuest) {
            const quest = data.cyberQuest;
            const migratedQuestions = migrateSortingItems(quest.questions || []);
            setQuestData({
              title: quest.title,
              description: quest.description,
              // Prefer new subject field; fallback to legacy if present
              selectedSection: quest.subject || quest.section_id,
              difficulty: quest.difficulty,
              level: quest.level || 1,
              questions: migratedQuestions,
            });
            setLoadedQuizSnapshot({
              title: quest.title || "",
              description: quest.description || "",
              difficulty: quest.difficulty || "medium",
              level: quest.level || 1,
              questions: migratedQuestions,
            });
          }
        } else {
          showCustomModal("Error", "Failed to load quest data", "error");
        }
      } catch (error) {
        console.error("Error fetching quest data:", error);
        showCustomModal("Error", "Failed to connect to server", "error");
      } finally {
        setLoadingQuestData(false);
      }
    }, []);

    // Initialize component based on whether we're editing or creating
    useEffect(() => {
      if (isCreateMode) {
        // We're in create mode - always reset form regardless of URL params
        setQuestData({
          title: "",
          description: "",
          selectedSection: null,
          difficulty: "medium",
          level: 1,
          questions: [],
        });
        setLoadedQuizSnapshot(null);
        setIsEditing(false);
      } else if (editQuestId) {
        // We have an edit ID and we're not in create mode - load quest data
        fetchQuestData(editQuestId);
        setIsEditing(true);
      }
    }, [editQuestId, isCreateMode, fetchQuestData]);

    const fetchNextLevel = async (sectionId) => {
      try {
        const response = await fetch(
          `${API_URL}/sections/${sectionId}/cyber-quests`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.cyberQuests)) {
            // Find the highest level in existing cyber quests
            const highestLevel = data.cyberQuests.reduce((maxLevel, quest) => {
              return Math.max(maxLevel, quest.level || 1);
            }, 0);

            // Set the next level (highest + 1, minimum 1)
            const nextLevel = Math.max(1, highestLevel + 1);

            setQuestData((prevData) => ({
              ...prevData,
              level: nextLevel,
            }));
          } else {
            // If no quests exist, start with level 1
            setQuestData((prevData) => ({
              ...prevData,
              level: 1,
            }));
          }
        } else {
          console.warn(
            "Failed to fetch existing cyber quests for level calculation"
          );
          // Default to level 1 if we can't fetch existing quests
          setQuestData((prevData) => ({
            ...prevData,
            level: 1,
          }));
        }
      } catch (error) {
        console.error("Error fetching next level:", error);
        // Default to level 1 if there's an error
        setQuestData((prevData) => ({
          ...prevData,
          level: 1,
        }));
      }
    };

    const buildQuizBankPayload = (source = questData) => ({
      title: source?.title || "Untitled Quiz Bank",
      description: source?.description || "",
      difficulty: source?.difficulty || "medium",
      level: source?.level || 1,
      questions: migrateSortingItems(Array.isArray(source?.questions) ? source.questions : []),
    });

    const saveQuizBankJson = async (payload, fallbackName = "quiz-bank") => {
      if (!Array.isArray(payload?.questions) || payload.questions.length === 0) {
        showCustomModal(
          "No Questions",
          "There are no quiz questions to export yet.",
          "error"
        );
        return;
      }

      const safeName = String(payload.title || fallbackName)
        .trim()
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
      const fileName = `${safeName || fallbackName}.json`;
      const jsonString = JSON.stringify(payload, null, 2);

      if (Platform.OS === "web") {
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      } else {
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, jsonString);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/json",
            dialogTitle: "Export Quiz Bank",
            UTI: "public.json",
          });
        }
      }

      setShowImportExportMenu(false);
      showCustomModal("Success", "Quiz bank exported successfully.", "success");
    };

    const handleExportCurrentQuizBank = async () => {
      try {
        await saveQuizBankJson(buildQuizBankPayload(questData), "quiz-bank-current");
      } catch (error) {
        console.error("Error exporting current quiz bank:", error);
        showCustomModal(
          "Export Error",
          error.message || "Failed to export current quiz bank.",
          "error"
        );
      }
    };

    const handleExportLoadedQuizBank = async () => {
      try {
        const source = loadedQuizSnapshot || questData;
        await saveQuizBankJson(buildQuizBankPayload(source), "quiz-bank-loaded");
      } catch (error) {
        console.error("Error exporting loaded quiz bank:", error);
        showCustomModal(
          "Export Error",
          error.message || "Failed to export loaded quiz bank.",
          "error"
        );
      }
    };

    // Function to handle JSON file import
    const handleImportJSON = async () => {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: "application/json",
          copyToCacheDirectory: true,
        });

        if (result.canceled) {
          return;
        }

        const file = result.assets[0];
        let fileContent;

        // Platform-specific file reading
        if (Platform.OS === "web") {
          // Web: Use fetch to read the file blob URI
          const response = await fetch(file.uri);
          fileContent = await response.text();
        } else {
          // Native: Use FileSystem
          fileContent = await FileSystem.readAsStringAsync(file.uri);
        }

        const jsonData = JSON.parse(fileContent);

        // Validate the JSON structure
        if (!jsonData.title || !jsonData.description || !jsonData.questions) {
          showCustomModal(
            "Invalid Format",
            "The JSON file must contain title, description, and questions fields.",
            "error"
          );
          return;
        }

        // Validate questions array
        if (
          !Array.isArray(jsonData.questions) ||
          jsonData.questions.length === 0
        ) {
          showCustomModal(
            "Invalid Format",
            "Questions must be a non-empty array.",
            "error"
          );
          return;
        }

        // Populate the form with imported data (excluding subject)
        setQuestData({
          ...questData,
          title: jsonData.title || "",
          description: jsonData.description || "",
          difficulty: jsonData.difficulty || "medium",
          level: jsonData.level || 1,
          questions: jsonData.questions || [],
        });

        setShowImportExportMenu(false);
        showCustomModal(
          "Success",
          "Quest data imported successfully! Please select a subject before creating.",
          "success"
        );
      } catch (error) {
        console.error("Error importing JSON:", error);
        showCustomModal(
          "Import Error",
          error.message ||
            "Failed to import JSON file. Please check the file format.",
          "error"
        );
      }
    };

    // Function to download sample JSON
    const handleDownloadSampleJSON = async () => {
      try {
        const sampleData = {
          title: "Fundamentals of Cyber Safety",
          description:
            "Intro quest covering passwords, hardware vs software, and basic coding awareness.",
          difficulty: "medium",
          level: 1,
          questions: [
            {
              type: "multipleChoice",
              text: "What does CPU stand for?",
              choices: [
                "Central Processing Unit",
                "Computer Processing Utility",
                "Control Program Unit",
                "Central Protocol Unit",
              ],
              correct_index: 0,
              hint: "It's often called the brain of the computer",
            },
            {
              type: "fillInBlanks",
              text: "Fill the blanks: A ___ is physical equipment, and a ___ is a program you run.",
              blanks: ["hardware", "software"],
              hint: "One you can touch, one you cannot",
            },
            {
              type: "codeMissing",
              text: "Complete the Python print statement to display Hello World",
              codeTemplate: "print(___)",
              correctAnswer: '"Hello World"',
              hint: "Strings in Python use quotes",
            },
            {
              type: "codeOrdering",
              text: "Arrange the code to define and call a greet function",
              codeBlocks: [
                { id: 1, code: "def greet(name):", position: 0 },
                { id: 2, code: "    return f'Hello, {name}'", position: 1 },
                { id: 3, code: "print(greet('Alice'))", position: 2 },
              ],
              hint: "Function definition first",
            },
            {
              type: "sorting",
              text: "Sort items into Hardware or Software",
              categories: ["Hardware", "Software"],
              items: [
                { id: 101, text: "Mouse", categoryId: 0 },
                { id: 102, text: "Web Browser", categoryId: 1 },
                { id: 103, text: "CPU", categoryId: 0 },
                { id: 104, text: "Operating System", categoryId: 1 },
              ],
              hint: "Physical vs intangible",
            },
            {
              type: "cipher",
              text: "Decode this scrambled cybersecurity term",
              answer: "FIREWALL",
              scrambledHint: "EWFILLRA",
              hint: "Protects network boundaries",
            },
          ],
        };

        const jsonString = JSON.stringify(sampleData, null, 2);
        const fileName = "sample-cyber-quest.json";

        if (Platform.OS === "web") {
          // Web: Use Blob and anchor download
          const blob = new Blob([jsonString], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = fileName;
          anchor.style.display = "none";
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          URL.revokeObjectURL(url);

          showCustomModal(
            "Success",
            "Sample JSON downloaded successfully!",
            "success"
          );
          setShowImportExportMenu(false);
        } else {
          // Mobile: Write to file system and share
          const fileUri = FileSystem.documentDirectory + fileName;
          await FileSystem.writeAsStringAsync(fileUri, jsonString);

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: "application/json",
              dialogTitle: "Sample Cyber Quest JSON",
              UTI: "public.json",
            });
            showCustomModal("Success", "Sample JSON ready to save!", "success");
          } else {
            showCustomModal(
              "Success",
              `Sample file saved at: ${fileUri}`,
              "success"
            );
          }
          setShowImportExportMenu(false);
        }
      } catch (error) {
        console.error("Error creating sample JSON:", error);
        showCustomModal(
          "Error",
          `Failed to create sample JSON file: ${error.message}`,
          "error"
        );
      }
    };

    const addQuestion = (type) => {
      if (questData.questions.length < 50) {
        let newQuestion;

        switch (type) {
          case "multipleChoice":
            newQuestion = {
              type: "multipleChoice",
              text: "",
              choices: ["", "", "", ""],
              correct_index: 0,
              hint: "",
            };
            break;
          case "codeMissing":
            newQuestion = {
              type: "codeMissing",
              text: "",
              codeTemplate: "",
              correctAnswer: "",
              hint: "",
            };
            break;
          case "fillInBlanks":
            newQuestion = {
              type: "fillInBlanks",
              text: "",
              blanks: ["", ""],
              hint: "",
            };
            break;
          case "codeOrdering":
            newQuestion = {
              type: "codeOrdering",
              text: "",
              codeBlocks: [
                { id: 1, code: "", position: 0 },
                { id: 2, code: "", position: 1 },
                { id: 3, code: "", position: 2 },
              ],
              hint: "",
            };
            break;
          case "sorting":
            newQuestion = {
              type: "sorting",
              text: "",
              categories: ["", ""],
              items: [
                { id: generateUniqueId(), text: "", categoryId: 0 },
                { id: generateUniqueId(), text: "", categoryId: 1 },
                { id: generateUniqueId(), text: "", categoryId: 0 },
                { id: generateUniqueId(), text: "", categoryId: 1 },
              ],
              hint: "",
            };
            break;
          case "cipher":
            newQuestion = {
              type: "cipher",
              text: "",
              answer: "",
              scrambledHint: "",
              hint: "",
            };
            break;
          default:
            newQuestion = {
              type: "multipleChoice",
              text: "",
              choices: ["", "", "", ""],
              correct_index: 0,
              hint: "",
            };
        }

        setQuestData({
          ...questData,
          questions: [...questData.questions, newQuestion],
        });
        setShowQuestionTypes(false);
      }
    };

    const removeQuestion = (index) => {
      if (questData.questions.length > 1) {
        const newQuestions = questData.questions.filter((_, i) => i !== index);
        setQuestData({
          ...questData,
          questions: newQuestions,
        });
      }
    };

    const updateQuestion = (index, field, value) => {
      const newQuestions = [...questData.questions];
      newQuestions[index][field] = value;
      setQuestData({
        ...questData,
        questions: newQuestions,
      });
    };

    const updateChoice = (questionIndex, choiceIndex, value) => {
      const newQuestions = [...questData.questions];
      newQuestions[questionIndex].choices[choiceIndex] = value;
      setQuestData({
        ...questData,
        questions: newQuestions,
      });
    };

    const addChoice = (questionIndex) => {
      const newQuestions = [...questData.questions];
      if (newQuestions[questionIndex].choices.length < 10) {
        newQuestions[questionIndex].choices.push("");
        setQuestData({
          ...questData,
          questions: newQuestions,
        });
      }
    };

    const removeChoice = (questionIndex, choiceIndex) => {
      const newQuestions = [...questData.questions];
      if (newQuestions[questionIndex].choices.length > 1) {
        newQuestions[questionIndex].choices.splice(choiceIndex, 1);
        // Adjust correct_index if needed
        if (
          newQuestions[questionIndex].correct_index >=
          newQuestions[questionIndex].choices.length
        ) {
          newQuestions[questionIndex].correct_index =
            newQuestions[questionIndex].choices.length - 1;
        }
        setQuestData({
          ...questData,
          questions: newQuestions,
        });
      }
    };

    const updateBlank = (questionIndex, blankIndex, value) => {
      const newQuestions = [...questData.questions];
      newQuestions[questionIndex].blanks[blankIndex] = value;
      setQuestData({
        ...questData,
        questions: newQuestions,
      });
    };

    const addBlank = (questionIndex) => {
      const newQuestions = [...questData.questions];
      if (newQuestions[questionIndex].blanks.length < 5) {
        newQuestions[questionIndex].blanks.push("");
        setQuestData({
          ...questData,
          questions: newQuestions,
        });
      }
    };

    const removeBlank = (questionIndex, blankIndex) => {
      const newQuestions = [...questData.questions];
      if (newQuestions[questionIndex].blanks.length > 1) {
        newQuestions[questionIndex].blanks.splice(blankIndex, 1);
        setQuestData({
          ...questData,
          questions: newQuestions,
        });
      }
    };

    const updateCodeBlock = (questionIndex, blockIndex, value) => {
      const newQuestions = [...questData.questions];
      newQuestions[questionIndex].codeBlocks[blockIndex].code = value;
      setQuestData({
        ...questData,
        questions: newQuestions,
      });
    };

    const addCodeBlock = (questionIndex) => {
      const newQuestions = [...questData.questions];
      const nextId =
        Math.max(...newQuestions[questionIndex].codeBlocks.map((b) => b.id)) +
        1;
      const nextPosition = newQuestions[questionIndex].codeBlocks.length;
      newQuestions[questionIndex].codeBlocks.push({
        id: nextId,
        code: "",
        position: nextPosition,
      });
      setQuestData({
        ...questData,
        questions: newQuestions,
      });
    };

    const removeCodeBlock = (questionIndex, blockIndex) => {
      const newQuestions = [...questData.questions];
      if (newQuestions[questionIndex].codeBlocks.length > 3) {
        newQuestions[questionIndex].codeBlocks.splice(blockIndex, 1);
        // Update positions
        newQuestions[questionIndex].codeBlocks.forEach((block, index) => {
          block.position = index;
        });
        setQuestData({
          ...questData,
          questions: newQuestions,
        });
      }
    };

    // Sorting question helpers
    const updateSortingCategory = (questionIndex, categoryIndex, value) => {
      const newQuestions = [...questData.questions];
      newQuestions[questionIndex].categories[categoryIndex] = value;
      setQuestData({
        ...questData,
        questions: newQuestions,
      });
    };

    const addSortingCategory = (questionIndex) => {
      const newQuestions = [...questData.questions];
      if (newQuestions[questionIndex].categories.length < 5) {
        newQuestions[questionIndex].categories.push("");
        setQuestData({
          ...questData,
          questions: newQuestions,
        });
      }
    };

    const removeSortingCategory = (questionIndex, categoryIndex) => {
      const newQuestions = [...questData.questions];
      if (newQuestions[questionIndex].categories.length > 2) {
        newQuestions[questionIndex].categories.splice(categoryIndex, 1);
        // Update item categoryIds that reference removed category
        newQuestions[questionIndex].items.forEach((item) => {
          if (item.categoryId === categoryIndex) {
            item.categoryId = 0; // Reset to first category
          } else if (item.categoryId > categoryIndex) {
            item.categoryId -= 1; // Shift down
          }
        });
        setQuestData({
          ...questData,
          questions: newQuestions,
        });
      }
    };

    const updateSortingItem = (questionIndex, itemIndex, itemData) => {
      const newQuestions = [...questData.questions];
      newQuestions[questionIndex].items[itemIndex] = itemData;
      setQuestData({
        ...questData,
        questions: newQuestions,
      });
    };

    const addSortingItem = (questionIndex) => {
      const newQuestions = [...questData.questions];
      if (newQuestions[questionIndex].items.length < 10) {
        newQuestions[questionIndex].items.push({
          id: generateUniqueId(),
          text: "",
          categoryId: 0,
        });
        setQuestData({
          ...questData,
          questions: newQuestions,
        });
      }
    };

    const removeSortingItem = (questionIndex, itemIndex) => {
      const newQuestions = [...questData.questions];
      if (newQuestions[questionIndex].items.length > 2) {
        newQuestions[questionIndex].items.splice(itemIndex, 1);
        setQuestData({
          ...questData,
          questions: newQuestions,
        });
      }
    };

    // Cipher question helpers
    const generateScrambledHint = (questionIndex) => {
      const question = questData.questions[questionIndex];
      if (question.answer && question.answer.length > 0) {
        const answer = question.answer.toUpperCase();
        const scrambled = answer
          .split("")
          .sort(() => Math.random() - 0.5)
          .join("");

        updateQuestion(questionIndex, {
          ...question,
          scrambledHint: scrambled,
        });
      }
    };

    const renderQuestionEditor = (question, questionIndex) => {
      switch (question.type) {
        case "multipleChoice":
          return (
            <View style={styles.choicesContainer}>
              <Text
                style={[
                  styles.choicesLabel,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                Answer Choices:
              </Text>
              {question.choices.map((choice, choiceIndex) => (
                <View key={choiceIndex} style={styles.choiceItem}>
                  <TouchableOpacity
                    style={[
                      styles.correctIndicator,
                      question.correct_index === choiceIndex &&
                        styles.correctIndicatorSelected,
                    ]}
                    onPress={() =>
                      updateQuestion(
                        questionIndex,
                        "correct_index",
                        choiceIndex
                      )
                    }
                  >
                    <Ionicons
                      name={
                        question.correct_index === choiceIndex
                          ? "checkmark-circle"
                          : "radio-button-off"
                      }
                      size={20}
                      color={
                        question.correct_index === choiceIndex
                          ? colors.success
                          : colors.textSecondary
                      }
                    />
                  </TouchableOpacity>

                  <TextInput
                    value={choice}
                    onChangeText={(text) =>
                      updateChoice(questionIndex, choiceIndex, text)
                    }
                    placeholder={`Choice ${choiceIndex + 1}...`}
                    style={[styles.textInput, styles.choiceInput]}
                    mode="outlined"
                    theme={{
                      colors: {
                        primary: colors.primary,
                        outline: colors.border,
                        background: colors.surface,
                        onSurface: colors.text,
                        text: colors.text,
                        placeholder: colors.textSecondary,
                      },
                    }}
                    textColor={colors.text}
                  />

                  {question.choices.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeChoiceButton}
                      onPress={() => removeChoice(questionIndex, choiceIndex)}
                    >
                      <Ionicons name="close" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {question.choices.length < 10 && (
                <TouchableOpacity
                  style={styles.addChoiceButton}
                  onPress={() => addChoice(questionIndex)}
                >
                  <Ionicons name="add" size={16} color={highlightColor} />
                  <Text
                    style={[
                      styles.addChoiceText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Add Choice
                  </Text>
                </TouchableOpacity>
              )}

              {/* Sample Examples for Instructors */}
              {showQuestionExamples && (
                <View
                  style={[
                    styles.examplesContainer,
                    {
                      backgroundColor: `${colors.primary}10`,
                      borderColor: colors.primary,
                      marginTop: 20,
                    },
                  ]}
                >
                  <Text style={[styles.examplesTitle, { color: colors.primary }]}>
                    📚 Multiple Choice Question Examples
                  </Text>

                  <View style={styles.exampleItem}>
                    <Text style={[styles.exampleLabel, { color: colors.text }]}>
                      Example 1: Network Security
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Question: &ldquo;Which protocol is used for secure web
                      browsing?&rdquo;
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Choices: A) HTTP, B) HTTPS ✓, C) FTP, D) SMTP
                    </Text>
                  </View>

                  <View style={styles.exampleItem}>
                    <Text style={[styles.exampleLabel, { color: colors.text }]}>
                      Example 2: Malware Types
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Question: &ldquo;What type of malware replicates itself
                      across networks?&rdquo;
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Choices: A) Virus, B) Trojan, C) Worm ✓, D) Ransomware
                    </Text>
                  </View>

                  <View style={styles.exampleItem}>
                    <Text style={[styles.exampleLabel, { color: colors.text }]}>
                      Example 3: Authentication
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Question: &ldquo;Which provides the strongest
                      authentication?&rdquo;
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Choices: A) Password only, B) Two-factor authentication ✓,
                      C) Username only, D) Biometrics only
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );

        case "codeMissing":
          return (
            <View style={styles.codeMissingContainer}>
              <Text
                style={[
                  styles.choicesLabel,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                Code Template:
              </Text>
              <TextInput
                value={question.codeTemplate}
                onChangeText={(text) =>
                  updateQuestion(questionIndex, "codeTemplate", text)
                }
                placeholder="Enter code with ____ for missing parts..."
                multiline
                numberOfLines={6}
                style={[styles.textInput, styles.codeInput]}
                mode="outlined"
                theme={{
                  colors: {
                    primary: colors.primary,
                    outline: colors.border,
                    background: colors.surface,
                    onSurface: colors.text,
                    text: colors.text,
                    placeholder: colors.textSecondary,
                  },
                }}
                textColor={colors.text}
              />

              <Text
                style={[styles.choicesLabel, { color: colors.textSecondary }]}
              >
                Correct Answer:
              </Text>
              <TextInput
                value={question.correctAnswer}
                onChangeText={(text) =>
                  updateQuestion(questionIndex, "correctAnswer", text)
                }
                placeholder="Enter the correct code/answer..."
                style={[styles.textInput, styles.choiceInput]}
                mode="outlined"
                theme={{
                  colors: {
                    primary: colors.primary,
                    outline: colors.border,
                    background: colors.surface,
                    onSurface: colors.text,
                    text: colors.text,
                    placeholder: colors.textSecondary,
                  },
                }}
                textColor={colors.text}
              />

              {/* Sample Examples for Instructors */}
              {showQuestionExamples && (
                <View
                  style={[
                    styles.examplesContainer,
                    {
                      backgroundColor: `${colors.primary}10`,
                      borderColor: colors.primary,
                      marginTop: 20,
                    },
                  ]}
                >
                  <Text style={[styles.examplesTitle, { color: colors.primary }]}>
                    📚 Code Missing Question Examples
                  </Text>

                  <View style={styles.exampleItem}>
                    <Text style={[styles.exampleLabel, { color: colors.text }]}>
                      Example 1: Python Password Check
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Code Template: &ldquo;if ____ &gt; 8: print(&apos;Strong
                      password&apos;)&rdquo;
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Correct Answer: len(password)
                    </Text>
                  </View>

                  <View style={styles.exampleItem}>
                    <Text style={[styles.exampleLabel, { color: colors.text }]}>
                      Example 2: SQL Injection Prevention
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Code Template: &ldquo;SELECT * FROM users WHERE id =
                      ____&rdquo;
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Correct Answer: ?
                    </Text>
                  </View>

                  <View style={styles.exampleItem}>
                    <Text style={[styles.exampleLabel, { color: colors.text }]}>
                      Example 3: JavaScript Input Validation
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Code Template: &ldquo;const sanitized = input.____();&rdquo;
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Correct Answer: trim
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );

        case "fillInBlanks":
          return (
            <View style={styles.fillBlanksContainer}>
              <Text
                style={[
                  styles.choicesLabel,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                Blanks to Fill:
              </Text>
              {question.blanks.map((blank, blankIndex) => (
                <View key={blankIndex} style={styles.choiceItem}>
                  <Text style={styles.blankNumber}>#{blankIndex + 1}</Text>
                  <TextInput
                    value={blank}
                    onChangeText={(text) =>
                      updateBlank(questionIndex, blankIndex, text)
                    }
                    placeholder={`Answer for blank ${blankIndex + 1}...`}
                    style={[
                      styles.textInput,
                      styles.choiceInput,
                      { backgroundColor: colors.surface },
                    ]}
                    mode="outlined"
                    theme={{
                      colors: {
                        primary: colors.primary,
                        outline: colors.primary,
                        background: colors.surface,
                        onSurface: colors.text,
                        text: colors.text,
                        placeholder: colors.textSecondary,
                      },
                    }}
                    textColor={colors.text}
                  />

                  {question.blanks.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeChoiceButton}
                      onPress={() => removeBlank(questionIndex, blankIndex)}
                    >
                      <Ionicons name="close" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {question.blanks.length < 5 && (
                <TouchableOpacity
                  style={styles.addChoiceButton}
                  onPress={() => addBlank(questionIndex)}
                >
                  <Ionicons name="add" size={16} color={highlightColor} />
                  <Text style={styles.addChoiceText}>Add Blank</Text>
                </TouchableOpacity>
              )}

              {/* Sample Examples for Instructors */}
              {showQuestionExamples && (
                <View
                  style={[
                    styles.examplesContainer,
                    {
                      backgroundColor: `${colors.primary}10`,
                      borderColor: colors.primary,
                      marginTop: 20,
                    },
                  ]}
                >
                  <Text style={[styles.examplesTitle, { color: colors.primary }]}>
                    📚 Fill in Blanks Question Examples
                  </Text>

                  <View style={styles.exampleItem}>
                    <Text style={[styles.exampleLabel, { color: colors.text }]}>
                      Example 1: Network Security Terms
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Question: &ldquo;A ____ is a security system that monitors
                      network traffic. It can be hardware or ____ based.&rdquo;
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Answers: 1) firewall, 2) software
                    </Text>
                  </View>

                  <View style={styles.exampleItem}>
                    <Text style={[styles.exampleLabel, { color: colors.text }]}>
                      Example 2: Encryption Concepts
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Question: &ldquo;____ encryption uses the same key for
                      encryption and decryption, while ____ encryption uses
                      different keys.&rdquo;
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Answers: 1) Symmetric, 2) Asymmetric
                    </Text>
                  </View>

                  <View style={styles.exampleItem}>
                    <Text style={[styles.exampleLabel, { color: colors.text }]}>
                      Example 3: Authentication Methods
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Question: &ldquo;Multi-factor authentication requires at
                      least ____ different types of credentials to verify
                      identity.&rdquo;
                    </Text>
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Answers: 1) two (or 2)
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );

        case "codeOrdering":
          return (
            <View style={styles.codeOrderingContainer}>
              <Text
                style={[
                  styles.choicesLabel,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                Code Blocks (in correct order):
              </Text>
              {question.codeBlocks.map((block, blockIndex) => (
                <View key={block.id} style={styles.choiceItem}>
                  <Text style={styles.blankNumber}>#{blockIndex + 1}</Text>
                  <TextInput
                    value={block.code}
                    onChangeText={(text) =>
                      updateCodeBlock(questionIndex, blockIndex, text)
                    }
                    placeholder={`Code block ${blockIndex + 1}...`}
                    multiline
                    numberOfLines={2}
                    style={[
                      styles.textInput,
                      styles.codeInput,
                      { backgroundColor: colors.surface },
                    ]}
                    mode="outlined"
                    theme={{
                      colors: {
                        primary: colors.primary,
                        outline: colors.primary,
                        background: colors.surface,
                        onSurface: colors.text,
                        text: colors.text,
                        placeholder: colors.textSecondary,
                      },
                    }}
                    textColor={colors.text}
                  />

                  {question.codeBlocks.length > 3 && (
                    <TouchableOpacity
                      style={styles.removeChoiceButton}
                      onPress={() => removeCodeBlock(questionIndex, blockIndex)}
                    >
                      <Ionicons name="close" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {question.codeBlocks.length < 6 && (
                <TouchableOpacity
                  style={styles.addChoiceButton}
                  onPress={() => addCodeBlock(questionIndex)}
                >
                  <Ionicons name="add" size={16} color={highlightColor} />
                  <Text
                    style={[
                      styles.addChoiceText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Add Code Block
                  </Text>
                </TouchableOpacity>
              )}

              {/* Sample Examples for Instructors */}
              {showQuestionExamples && (
                <View
                  style={[
                    styles.examplesContainer,
                    {
                      backgroundColor: `${colors.primary}10`,
                      borderColor: colors.primary,
                      marginTop: 20,
                    },
                  ]}
                >
                  <Text style={[styles.examplesTitle, { color: colors.primary }]}>
                    📚 Code Ordering Question Examples
                  </Text>

                <View style={styles.exampleItem}>
                  <Text style={[styles.exampleLabel, { color: colors.text }]}>
                    Example 1: Secure Login Process
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Question: &ldquo;Order the steps for secure user
                    authentication:&rdquo;
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Blocks: 1) Validate input format, 2) Hash the password, 3)
                    Compare with stored hash, 4) Create session token
                  </Text>
                </View>

                <View style={styles.exampleItem}>
                  <Text style={[styles.exampleLabel, { color: colors.text }]}>
                    Example 2: Incident Response Plan
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Question: &ldquo;Order the cybersecurity incident response
                    steps:&rdquo;
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Blocks: 1) Identify the threat, 2) Contain the incident, 3)
                    Eradicate the threat, 4) Recover systems, 5) Learn from
                    incident
                  </Text>
                </View>

                <View style={styles.exampleItem}>
                  <Text style={[styles.exampleLabel, { color: colors.text }]}>
                    Example 3: SQL Injection Prevention
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Question: &ldquo;Order the code for safe database
                    queries:&rdquo;
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Blocks: 1) Prepare statement template, 2) Bind user input
                    parameters, 3) Execute prepared statement, 4) Process
                    results
                  </Text>
                </View>
              </View>
              )}
            </View>
          );

        case "sorting":
          return (
            <View>
              <Text
                style={[
                  styles.choicesLabel,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                Categories:
              </Text>
              {question.categories.map((category, categoryIndex) => (
                <View key={categoryIndex} style={styles.choiceItem}>
                  <Text style={styles.blankNumber}>#{categoryIndex + 1}</Text>
                  <TextInput
                    value={category}
                    onChangeText={(text) =>
                      updateSortingCategory(questionIndex, categoryIndex, text)
                    }
                    placeholder={`Category ${categoryIndex + 1}...`}
                    style={[
                      styles.textInput,
                      { backgroundColor: colors.surface },
                    ]}
                    mode="outlined"
                    theme={{
                      colors: {
                        primary: colors.primary,
                        outline: colors.primary,
                        background: colors.surface,
                        onSurface: colors.text,
                        text: colors.text,
                        placeholder: colors.textSecondary,
                      },
                    }}
                    textColor={colors.text}
                  />

                  {question.categories.length > 2 && (
                    <TouchableOpacity
                      style={styles.removeChoiceButton}
                      onPress={() =>
                        removeSortingCategory(questionIndex, categoryIndex)
                      }
                    >
                      <Ionicons name="close" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {question.categories.length < 5 && (
                <TouchableOpacity
                  style={styles.addChoiceButton}
                  onPress={() => addSortingCategory(questionIndex)}
                >
                  <Ionicons name="add" size={16} color={highlightColor} />
                  <Text
                    style={[
                      styles.addChoiceText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Add Category
                  </Text>
                </TouchableOpacity>
              )}

              <Text
                style={[
                  styles.choicesLabel,
                  {
                    color: colors.textSecondary,
                    marginTop: 20,
                  },
                ]}
              >
                Items to Sort:
              </Text>
              {question.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.choiceItem}>
                  <Text style={styles.blankNumber}>#{itemIndex + 1}</Text>
                  <TextInput
                    value={item.text}
                    onChangeText={(text) =>
                      updateSortingItem(questionIndex, itemIndex, {
                        ...item,
                        text,
                      })
                    }
                    placeholder={`Item ${itemIndex + 1}...`}
                    style={[
                      styles.textInput,
                      { backgroundColor: colors.surface, flex: 2 },
                    ]}
                    mode="outlined"
                    theme={{
                      colors: {
                        primary: colors.primary,
                        outline: colors.primary,
                        background: colors.surface,
                        onSurface: colors.text,
                        text: colors.text,
                        placeholder: colors.textSecondary,
                      },
                    }}
                    textColor={colors.text}
                  />

                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text
                      style={[
                        styles.choicesLabel,
                        { color: colors.textSecondary, fontSize: 12 },
                      ]}
                    >
                      Category:
                    </Text>
                    <View style={styles.categorySelector}>
                      {question.categories.map((cat, catIndex) => (
                        <TouchableOpacity
                          key={catIndex}
                          style={[
                            styles.categorySelectorButton,
                            item.categoryId === catIndex &&
                              styles.categorySelectorButtonSelected,
                            { borderColor: colors.border },
                          ]}
                          onPress={() =>
                            updateSortingItem(questionIndex, itemIndex, {
                              ...item,
                              categoryId: catIndex,
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.categorySelectorText,
                              {
                                color:
                                  item.categoryId === catIndex
                                    ? colors.primary
                                    : colors.text,
                              },
                            ]}
                          >
                            {catIndex + 1}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {question.items.length > 2 && (
                    <TouchableOpacity
                      style={styles.removeChoiceButton}
                      onPress={() =>
                        removeSortingItem(questionIndex, itemIndex)
                      }
                    >
                      <Ionicons name="close" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {question.items.length < 10 && (
                <TouchableOpacity
                  style={styles.addChoiceButton}
                  onPress={() => addSortingItem(questionIndex)}
                >
                  <Ionicons name="add" size={16} color={highlightColor} />
                  <Text
                    style={[
                      styles.addChoiceText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Add Item
                  </Text>
                </TouchableOpacity>
              )}

              {/* Sample Examples for Instructors */}
              {showQuestionExamples && (
                <View
                  style={[
                    styles.examplesContainer,
                    {
                      backgroundColor: `${colors.primary}10`,
                      borderColor: colors.primary,
                      marginTop: 20,
                    },
                  ]}
                >
                  <Text style={[styles.examplesTitle, { color: colors.primary }]}>
                    📚 Sorting Question Examples
                  </Text>

                <View style={styles.exampleItem}>
                  <Text style={[styles.exampleLabel, { color: colors.text }]}>
                    Example 1: Cybersecurity Threats vs Defenses
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Categories: &ldquo;Security Threats&rdquo;, &ldquo;Security
                    Defenses&rdquo;
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Items: Malware (Threats), Firewall (Defenses), Phishing
                    (Threats), Antivirus (Defenses)
                  </Text>
                </View>

                <View style={styles.exampleItem}>
                  <Text style={[styles.exampleLabel, { color: colors.text }]}>
                    Example 2: Network Components
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Categories: &ldquo;Hardware&rdquo;, &ldquo;Software&rdquo;
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Items: Router (Hardware), Operating System (Software),
                    Switch (Hardware), Web Browser (Software)
                  </Text>
                </View>

                <View style={styles.exampleItem}>
                  <Text style={[styles.exampleLabel, { color: colors.text }]}>
                    Example 3: Password Security
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Categories: &ldquo;Strong Password&rdquo;, &ldquo;Weak
                    Password&rdquo;
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Items: MyP@ssw0rd123! (Strong), 123456 (Weak),
                    SecureKey2024# (Strong), password (Weak)
                  </Text>
                </View>

                <View style={styles.exampleItem}>
                  <Text style={[styles.exampleLabel, { color: colors.text }]}>
                    Example 4: Data Types
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Categories: &ldquo;Personal Data&rdquo;, &ldquo;Public
                    Data&rdquo;
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Items: Social Security Number (Personal), Company Name
                    (Public), Bank Account (Personal), Website URL (Public)
                  </Text>
                </View>

                <View style={styles.exampleItem}>
                  <Text style={[styles.exampleLabel, { color: colors.text }]}>
                    Example 5: Security Protocols
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Categories: &ldquo;Encryption&rdquo;,
                    &ldquo;Authentication&rdquo;
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Items: AES (Encryption), OAuth (Authentication), TLS
                    (Encryption), Biometrics (Authentication)
                  </Text>
                </View>
              </View>
              )}
            </View>
          );

        case "cipher":
          return (
            <View>
              <Text
                style={[
                  styles.choicesLabel,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                Correct Answer:
              </Text>
              <TextInput
                value={question.answer}
                onChangeText={(text) =>
                  updateQuestion(questionIndex, "answer", text)
                }
                placeholder="Enter the correct answer..."
                style={[styles.textInput, { backgroundColor: colors.surface }]}
                mode="outlined"
                theme={{
                  colors: {
                    primary: colors.primary,
                    outline: colors.primary,
                    background: colors.surface,
                    onSurface: colors.text,
                    text: colors.text,
                    placeholder: colors.textSecondary,
                  },
                }}
                textColor={colors.text}
              />

              <Text
                style={[
                  styles.choicesLabel,
                  {
                    color: colors.textSecondary,
                    marginTop: 16,
                  },
                ]}
              >
                Scrambled Hint (will be auto-generated if left blank):
              </Text>
              <TextInput
                value={question.scrambledHint}
                onChangeText={(text) =>
                  updateQuestion(questionIndex, "scrambledHint", text)
                }
                placeholder="Scrambled letters hint..."
                style={[styles.textInput, { backgroundColor: colors.surface }]}
                mode="outlined"
                theme={{
                  colors: {
                    primary: colors.primary,
                    outline: colors.primary,
                    background: colors.surface,
                    onSurface: colors.text,
                    text: colors.text,
                    placeholder: colors.textSecondary,
                  },
                }}
                textColor={colors.text}
              />

              <TouchableOpacity
                style={styles.addChoiceButton}
                onPress={() => generateScrambledHint(questionIndex)}
              >
                <Ionicons name="shuffle" size={16} color={highlightColor} />
                <Text
                  style={[
                    styles.addChoiceText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Generate Scrambled Hint
                </Text>
              </TouchableOpacity>

              {/* Sample Examples for Instructors */}
              {showQuestionExamples && (
                <View
                  style={[
                    styles.examplesContainer,
                    {
                      backgroundColor: `${colors.primary}10`,
                      borderColor: colors.primary,
                      marginTop: 20,
                    },
                  ]}
                >
                  <Text style={[styles.examplesTitle, { color: colors.primary }]}>
                    💡 Cipher Question Examples
                  </Text>

                <View style={styles.exampleItem}>
                  <Text style={[styles.exampleLabel, { color: colors.text }]}>
                    Example 1: Basic Cybersecurity Term
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Question: &ldquo;Decode this cybersecurity term:
                    WLIADREL&rdquo;
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Answer: FIREWALL
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Scrambled Hint: FIREWALL → WLIADREL
                  </Text>
                </View>

                <View style={styles.exampleItem}>
                  <Text style={[styles.exampleLabel, { color: colors.text }]}>
                    Example 2: Security Concept
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Question: &ldquo;What security method is scrambled here:
                    HQFUBSWLRQ&rdquo;
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Answer: ENCRYPTION
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Scrambled Hint: ENCRYPTION → HQFUBSWLRQ
                  </Text>
                </View>

                <View style={styles.exampleItem}>
                  <Text style={[styles.exampleLabel, { color: colors.text }]}>
                    Example 3: Attack Type
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Question: &ldquo;Decode this attack type: GQLVKLHS&rdquo;
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Answer: PHISHING
                  </Text>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Scrambled Hint: PHISHING → GQLVKLHS
                  </Text>
                </View>
              </View>
              )}
            </View>
          );

        default:
          return null;
      }
    };

    const isValid = () => {
      if (!questData.title.trim()) return false;
      if (!questData.description.trim()) return false;
      if (!questData.selectedSection) return false;
      // Minimum question count reduced to 1 (previously 3)
      if (questData.questions.length < 1) return false;

      return questData.questions.every((question) => {
        // Only require non-empty text (removed 10 character minimum)
        if (!question.text.trim()) return false;

        switch (question.type) {
          case "multipleChoice":
            return (
              question.choices &&
              question.choices.length > 0 &&
              question.choices.every((choice) => choice.trim().length > 0)
            );

          case "codeMissing":
            return (
              question.codeTemplate.trim().length > 0 &&
              question.correctAnswer.trim().length > 0
            );

          case "fillInBlanks":
            return (
              question.blanks.length >= 1 &&
              question.blanks.every((blank) => blank.trim().length > 0)
            );

          case "codeOrdering":
            return (
              question.codeBlocks.length >= 3 &&
              question.codeBlocks.every((block) => block.code.trim().length > 0)
            );

          case "sorting":
            return (
              question.categories &&
              question.categories.length >= 2 &&
              question.categories.every(
                (category) => category.trim().length > 0
              ) &&
              question.items &&
              question.items.length >= 2 &&
              question.items.every(
                (item) =>
                  item.text.trim().length > 0 &&
                  item.categoryId >= 0 &&
                  item.categoryId < question.categories.length
              )
            );

          case "cipher":
            return question.answer && question.answer.trim().length > 0;

          default:
            return false;
        }
      });
    };

    const getValidationMessages = () => {
      const messages = [];

      if (!questData.title.trim()) {
        messages.push("Please enter a quest title");
      }
      if (!questData.description.trim()) {
        messages.push("Please enter a quest description");
      }
      if (!questData.selectedSection) {
        messages.push("Please select a subject");
      }
      if (questData.questions.length < 1) {
        messages.push("Please add at least one question");
      }
      if (questData.questions.some((q) => !q.text.trim())) {
        messages.push("All questions must have text");
      }

      const hasIncompleteQuestionFields = questData.questions.some((q) => {
        switch (q.type) {
          case "multipleChoice":
            return q.choices && q.choices.some((c) => !c.trim());
          case "codeMissing":
            return (
              !q.codeTemplate ||
              !q.correctAnswer ||
              q.codeTemplate.trim().length === 0 ||
              q.correctAnswer.trim().length === 0
            );
          case "fillInBlanks":
            return !q.blanks || q.blanks.some((b) => !b.trim());
          case "codeOrdering":
            return !q.codeBlocks || q.codeBlocks.some((b) => !b.code.trim());
          default:
            return false;
        }
      });

      if (hasIncompleteQuestionFields) {
        messages.push("Please complete all question fields");
      }

      return messages;
    };

    const validationMessages = getValidationMessages();

    const createCyberQuest = async () => {
      if (!isValid()) {
        showCustomModal(
          "Validation Error",
          "Please fill all required fields correctly.",
          "error"
        );
        return;
      }

      try {
        setCreatingQuest(true);

        const url = isEditing
          ? `${API_URL}/cyber-quests/${editQuestId}`
          : `${API_URL}/sections/${
              typeof questData.selectedSection === "string"
                ? questData.selectedSection
                : questData.selectedSection._id
            }/cyber-quests`;

        const method = isEditing ? "PUT" : "POST";

        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: questData.title.trim(),
            description: questData.description.trim(),
            questions: questData.questions,
            difficulty: questData.difficulty,
            level: questData.level,
            // Send subject for forward compatibility; route uses path param
            subject: questData.selectedSection._id || questData.selectedSection,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          showCustomModal(
            "Success",
            isEditing
              ? "Cyber Quest updated successfully!"
              : "Cyber Quest created successfully!",
            "success",
            () => {
              if (isEditing) {
                // After editing from map, return to the same selected subject/module.
                if (openedFromIndex) {
                  navigateBackToIndexWithContext();
                } else {
                  // Existing behavior for non-map edit flows
                  resetToCreateMode();
                  router.push("/(tabs)");
                }
              } else {
                // After creating, reset form and go back to options
                setQuestData({
                  title: "",
                  description: "",
                  selectedSection: null,
                  difficulty: "medium",
                  level: 1,
                  questions: [
                    {
                      text: "",
                      choices: ["", "", "", ""],
                      correct_index: 0,
                    },
                  ],
                });
                // Clear edit parameters and show options
                router.replace("/(tabs)/create");
                setActiveCreator("");
              }
            }
          );
        } else {
          showCustomModal(
            "Error",
            data.message ||
              `Failed to ${isEditing ? "update" : "create"} cyber quest`,
            "error"
          );
        }
      } catch (error) {
        console.error(
          `Error ${isEditing ? "updating" : "creating"} cyber quest:`,
          error
        );
        showCustomModal(
          "Error",
          `Failed to ${isEditing ? "update" : "create"} cyber quest`,
          "error"
        );
      } finally {
        setCreatingQuest(false);
      }
    };

    return (
      <View style={styles.formContainer}>
        {!useCompactHeader && (
          <View style={styles.formHeader}>
            {/* Apply dynamic color so header is visible in dark mode */}
            <Text style={[styles.formTitle, { color: colors.textSecondary }]}> 
              🗺️ {isEditing ? "Edit" : "Create"} Cyber Quest Map
            </Text>

            {/* Import/Export Menu Button */}
            <View style={styles.headerActions}>
              <TouchableOpacity
                id="cq-import-export-btn"
                style={[styles.menuButton, { borderColor: colors.border }]}
                onPress={() => setShowImportExportMenu((v) => !v)}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={20}
                  color={highlightColor}
                />
              </TouchableOpacity>

              {isEditing && (
                <TouchableOpacity
                  style={styles.createNewButton}
                  onPress={() => {
                    console.log(
                      "🔍 Create New button clicked - clearing edit mode"
                    );
                    resetToCreateMode();
                  }}
                >
                  <Ionicons name="add" size={20} color={highlightColor} />
                  <Text
                    style={[
                      styles.createNewText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    New
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Import/Export Context Menu */}
        {showImportExportMenu && (
          <View
            id="cq-import-export-menu"
            style={[
              styles.contextMenu,
              styles.contextMenuHeader,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: colors.text,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.contextMenuItem,
                { borderBottomColor: colors.border },
              ]}
              onPress={handleImportJSON}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={20}
                color={highlightColor}
              />
              <Text style={[styles.contextMenuText, { color: colors.text }]}>
                Upload JSON
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.contextMenuItem,
                { borderBottomColor: colors.border },
              ]}
              onPress={handleDownloadSampleJSON}
            >
              <Ionicons
                name="download-outline"
                size={20}
                color={highlightColor}
              />
              <Text style={[styles.contextMenuText, { color: colors.text }]}>
                Download Sample JSON
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.contextMenuItem,
                { borderBottomColor: colors.border },
              ]}
              onPress={() => {
                setShowQuestionExamples((prev) => !prev);
                setShowImportExportMenu(false);
              }}
            >
              <Ionicons
                name={showQuestionExamples ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={highlightColor}
              />
              <Text style={[styles.contextMenuText, { color: colors.text }]}>
                {showQuestionExamples ? "Disable Examples" : "Enable Examples"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => {
                setShowImportExportMenu(false);
                setShowInstructionsModal(true);
              }}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={highlightColor}
              />
              <Text style={[styles.contextMenuText, { color: colors.text }]}>
                Instructions
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Instructions Modal */}
        <Modal
          visible={showInstructionsModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowInstructionsModal(false)}
        >
          <View style={styles.instructionsModalOverlay}>
            <View
              style={[
                styles.instructionsModalContainer,
                { backgroundColor: colors.background },
              ]}
            >
              <View
                style={[
                  styles.instructionsModalHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.instructionsModalTitle,
                    { color: colors.text },
                  ]}
                >
                  📚 JSON Import Instructions
                </Text>
                <TouchableOpacity
                  onPress={() => setShowInstructionsModal(false)}
                  style={styles.instructionsCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
  style={styles.instructionsModalContent}
  showsVerticalScrollIndicator={true}
  contentContainerStyle={{ paddingBottom: 20 }}
>

                <Text
                  style={[styles.instructionsSection, { color: colors.text }]}
                >
                  <Text style={styles.instructionsBold}>
                    JSON File Structure
                  </Text>
                  {"\n\n"}
                  Your JSON file must include the following fields:
                  {"\n\n"}• <Text style={styles.instructionsCode}>title</Text> -
                  The quest title (string)
                  {"\n"}•{" "}
                  <Text style={styles.instructionsCode}>description</Text> -
                  Quest description (string)
                  {"\n"}•{" "}
                  <Text style={styles.instructionsCode}>difficulty</Text> -
                  "easy", "medium", or "hard"
                  {"\n"}• <Text style={styles.instructionsCode}>level</Text> -
                  Quest level (number, 1-100)
                  {"\n"}• <Text style={styles.instructionsCode}>questions</Text>{" "}
                  - Array of question objects
                </Text>

                <Text
                  style={[styles.instructionsSection, { color: colors.text }]}
                >
                  <Text style={styles.instructionsBold}>Question Types</Text>
                  {"\n\n"}
                  <Text style={styles.instructionsBold}>
                    1. Multiple Choice
                  </Text>
                  {"\n"}
                  {`{
  "type": "multipleChoice",
  "text": "Question text?",
  "choices": ["Option 1", "Option 2", "Option 3"],
  "correct_index": 0,
  "hint": "Optional hint"
}`}
                </Text>

                <Text
                  style={[styles.instructionsSection, { color: colors.text }]}
                >
                  <Text style={styles.instructionsBold}>2. Fill in Blanks</Text>
                  {"\n"}
                  {`{
  "type": "fillInBlanks",
  "text": "Complete: ___ and ___",
  "blanks": ["Answer 1", "Answer 2"],
  "hint": "Optional hint"
}`}
                </Text>

                <Text
                  style={[styles.instructionsSection, { color: colors.text }]}
                >
                  <Text style={styles.instructionsBold}>3. Code Missing</Text>
                  {"\n"}
                  {`{
  "type": "codeMissing",
  "text": "Complete the code",
  "codeTemplate": "print(___)",
  "correctAnswer": "\\"Hello\\"",
  "hint": "Optional hint"
}`}
                </Text>

                <Text
                  style={[styles.instructionsSection, { color: colors.text }]}
                >
                  <Text style={styles.instructionsBold}>4. Code Ordering</Text>
                  {"\n"}
                  {`{
  "type": "codeOrdering",
  "text": "Arrange in correct order",
  "codeBlocks": [
    { "id": 1, "code": "line 1", "position": 0 },
    { "id": 2, "code": "line 2", "position": 1 }
  ],
  "hint": "Optional hint"
}`}
                </Text>

                <Text
                  style={[styles.instructionsSection, { color: colors.text }]}
                >
                  <Text style={styles.instructionsBold}>
                    5. Sorting/Categorization
                  </Text>
                  {"\n"}
                  {`{
  "type": "sorting",
  "text": "Categorize items",
  "categories": ["Cat 1", "Cat 2"],
  "items": [
    { "id": 1, "text": "Item 1", "categoryId": 0 },
    { "id": 2, "text": "Item 2", "categoryId": 1 }
  ],
  "hint": "Optional hint"
}`}
                </Text>

                <Text
                  style={[styles.instructionsSection, { color: colors.text }]}
                >
                  <Text style={styles.instructionsBold}>
                    6. Cipher/Cryptogram
                  </Text>
                  {"\n"}
                  {`{
  "type": "cipher",
  "text": "Decode the word",
  "answer": "FIREWALL",
  "scrambledHint": "EWFILLRA",
  "hint": "Optional hint"
}`}
                </Text>

                <Text
                  style={[styles.instructionsSection, { color: colors.text }]}
                >
                  <Text style={styles.instructionsBold}>Important Notes</Text>
                  {"\n\n"}
                  ⚠️ The <Text style={styles.instructionsCode}>
                    subject
                  </Text>{" "}
                  field is NOT included in the JSON import. You must manually
                  select the subject after importing.
                  {"\n\n"}✅ Questions must be between 3-10 per quest
                  {"\n\n"}✅ All fields marked as required must be present
                  {"\n\n"}✅ Hints are optional for all question types
                  {"\n\n"}
                  💡 Download the sample JSON to see a complete working example!
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <ScrollView
          style={[styles.formScroll, Platform.OS === "web" && styles.webScrollableForm]}
          showsVerticalScrollIndicator={true}
          persistentScrollbar={Platform.OS === "web"}
          nestedScrollEnabled={Platform.OS === "android"}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: Platform.OS === "web" ? 24 : 120,
          }}
        >
          {loadingQuestData ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={highlightColor} />
              <Text
                style={[styles.loadingText, { color: colors.textSecondary }]}
              >
                Loading quest data...
              </Text>
            </View>
          ) : (
            <>
              {/* Quiz Bank quick actions */}
              <View
                style={[
                  styles.quizBankCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.quizBankHeaderRow}>
                  <Ionicons name="library-outline" size={20} color={highlightColor} />
                  <Text style={[styles.quizBankTitle, { color: colors.text }]}>Quiz Bank</Text>
                </View>
                <Text style={[styles.quizBankSubtitle, { color: colors.textSecondary }]}> 
                  Import a quiz bank into fields or export quiz data from this map.
                </Text>

                <View style={styles.quizBankActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.quizBankActionButton,
                      {
                        backgroundColor: `${highlightColor}15`,
                        borderColor: `${highlightColor}60`,
                      },
                    ]}
                    onPress={handleImportJSON}
                  >
                    <Ionicons name="cloud-upload-outline" size={18} color={highlightColor} />
                    <Text style={[styles.quizBankActionText, { color: colors.text }]}>Import Quiz Bank</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.quizBankActionButton,
                      {
                        backgroundColor: `${highlightColor}15`,
                        borderColor: `${highlightColor}60`,
                      },
                    ]}
                    onPress={handleExportCurrentQuizBank}
                  >
                    <Ionicons name="cloud-download-outline" size={18} color={highlightColor} />
                    <Text style={[styles.quizBankActionText, { color: colors.text }]}>Export Current Quiz Bank</Text>
                  </TouchableOpacity>

                  {isEditing && (
                    <TouchableOpacity
                      style={[
                        styles.quizBankActionButton,
                        {
                          backgroundColor: `${highlightColor}15`,
                          borderColor: `${highlightColor}60`,
                        },
                      ]}
                      onPress={handleExportLoadedQuizBank}
                    >
                      <Ionicons name="archive-outline" size={18} color={highlightColor} />
                      <Text style={[styles.quizBankActionText, { color: colors.text }]}>Export Loaded Quiz Bank</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Quest Title */}
              <View style={styles.inputGroup}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  Quest Title
                </Text>
                <TextInput
                  value={questData.title}
                  onChangeText={(text) =>
                    setQuestData({ ...questData, title: text })
                  }
                  placeholder="Enter an epic quest name..."
                  style={styles.textInput}
                  mode="outlined"
                  theme={{
                    colors: {
                      primary: colors.primary,
                      outline: colors.border,
                      background: colors.surface,
                      onSurface: colors.text,
                      text: colors.text,
                      placeholder: colors.textSecondary,
                    },
                  }}
                  textColor={colors.text}
                />
              </View>

              {/* Quest Description */}
              <View style={styles.inputGroup}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  Quest Description
                </Text>
                <TextInput
                  value={questData.description}
                  onChangeText={(text) =>
                    setQuestData({ ...questData, description: text })
                  }
                  placeholder="Describe what this quest is about..."
                  multiline
                  numberOfLines={3}
                  style={[styles.textInput, styles.textArea]}
                  mode="outlined"
                  theme={{
                    colors: {
                      primary: colors.primary,
                      outline: colors.border,
                      background: colors.surface,
                      onSurface: colors.text,
                      text: colors.text,
                      placeholder: colors.textSecondary,
                    },
                  }}
                  textColor={colors.text}
                  contentStyle={styles.textInputContent}
                />
              </View>

              {/* Subject Selection (Modal-based) */}
              <View style={styles.inputGroup}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  Subject
                </Text>
                {loadingSubjects ? (
                  <Text style={{ color: colors.textSecondary }}>
                    Loading subjects...
                  </Text>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.dropdownButton,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (availableSubjects.length === 0) {
                          showCustomModal(
                            "No Subjects",
                            "You haven't created any subjects yet. Please create a subject first.",
                            "error"
                          );
                          return;
                        }
                        setSubjectModalVisible(true);
                      }}
                    >
                      <Text
                        style={[styles.dropdownText, { color: colors.text }]}
                      >
                        {questData.selectedSection
                          ? typeof questData.selectedSection === "string"
                            ? "Loading subject..."
                            : questData.selectedSection.name
                          : availableSubjects.length === 0
                          ? "No subjects available"
                          : "Select subject..."}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={highlightColor}
                      />
                    </TouchableOpacity>

                    <Modal
                      visible={subjectModalVisible}
                      animationType="slide"
                      transparent
                      onRequestClose={() => setSubjectModalVisible(false)}
                    >
                      <View style={styles.modalBackdrop}>
                        <View
                          style={[
                            styles.subjectModalContainer,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <View style={styles.subjectModalHeader}>
                            <Text
                              style={[
                                styles.subjectModalTitle,
                                { color: colors.text },
                              ]}
                            >
                              Select Subject
                            </Text>
                            <TouchableOpacity
                              onPress={() => setSubjectModalVisible(false)}
                            >
                              <Ionicons
                                name="close"
                                size={24}
                                color={highlightColor}
                              />
                            </TouchableOpacity>
                          </View>
                          <View style={styles.subjectModalBody}>
                            {availableSubjects.length === 0 ? (
                              <Text style={{ color: colors.textSecondary }}>
                                No subjects available.
                              </Text>
                            ) : (
                              <FlatList
                                data={availableSubjects}
                                keyExtractor={(item) => item._id}
                                contentContainerStyle={
                                  styles.subjectListContent
                                }
                                initialNumToRender={20}
                                maxToRenderPerBatch={30}
                                windowSize={10}
                                renderItem={({ item: section }) => {
                                  const selectedSectionId =
                                    typeof questData.selectedSection ===
                                    "string"
                                      ? questData.selectedSection
                                      : questData.selectedSection?._id;
                                  const isSelected =
                                    selectedSectionId === section._id;
                                  return (
                                    <TouchableOpacity
                                      style={[
                                        styles.subjectListItem,
                                        {
                                          borderColor: isSelected
                                            ? highlightColor
                                            : colors.border,
                                          backgroundColor: isSelected
                                            ? `${highlightColor}25`
                                            : colors.surface,
                                        },
                                      ]}
                                      onPress={() => {
                                        setQuestData({
                                          ...questData,
                                          selectedSection: section,
                                        });
                                        setSubjectModalVisible(false);
                                        if (!isEditing) {
                                          fetchNextLevel(section._id);
                                        }
                                      }}
                                    >
                                      <Text
                                        style={[
                                          styles.subjectListItemText,
                                          { color: colors.text },
                                          isSelected && {
                                            color: highlightColor,
                                            fontWeight: "600",
                                          },
                                        ]}
                                      >
                                        {section.name}
                                      </Text>
                                      {isSelected && (
                                        <Ionicons
                                          name="checkmark"
                                          size={20}
                                          color={highlightColor}
                                        />
                                      )}
                                    </TouchableOpacity>
                                  );
                                }}
                              />
                            )}
                          </View>
                        </View>
                      </View>
                    </Modal>
                  </>
                )}
              </View>

              {/* Quest Level Display */}
              {questData.selectedSection && (
                <View style={styles.inputGroup}>
                  <Text
                    style={[styles.inputLabel, { color: colors.textSecondary }]}
                  >
                    Quest Level
                  </Text>
                  <View
                    style={[
                      styles.levelDisplay,
                      {
                        backgroundColor: `${highlightColor}15`,
                        borderColor: `${highlightColor}50`,
                      },
                    ]}
                  >
                    <View style={styles.levelBadge}>
                      <Ionicons
                        name="trophy"
                        size={20}
                        color={highlightColor}
                      />
                      <Text
                        style={[
                          styles.levelText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Level {questData.level}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.levelDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {isEditing
                        ? "This quest is at level " + questData.level
                        : `This will be level ${questData.level} in ${
                            typeof questData.selectedSection === "string"
                              ? "the selected subject"
                              : questData.selectedSection.name
                          }`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Difficulty Selection */}
              <View style={styles.inputGroup}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  Difficulty Levels
                </Text>
                <View style={styles.difficultyContainer}>
                  {difficulties.map((diff) => (
                    <TouchableOpacity
                      key={diff.value}
                      style={[
                        styles.difficultyButton,
                        {
                          backgroundColor: "#FFFFFF",
                          borderColor: colors.border,
                        },
                        questData.difficulty === diff.value && [
                          styles.selectedDifficulty,
                          {
                            backgroundColor: "#FFFFFF",
                            borderColor: colors.primary,
                          },
                        ],
                      ]}
                      onPress={() =>
                        setQuestData({ ...questData, difficulty: diff.value })
                      }
                    >
                      <Text
                        style={[
                          styles.difficultyText,
                          { color: colors.text },
                          questData.difficulty === diff.value && {
                            color: colors.text,
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {diff.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Questions Editor */}
              <View style={styles.inputGroup}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  Questions ({questData.questions.length}/50)
                </Text>

                {questData.questions.map((question, questionIndex) => (
                  <View
                    key={questionIndex}
                    style={[
                      styles.questionContainer,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.questionHeader}>
                      <View style={styles.questionHeaderLeft}>
                        <Text
                          style={[
                            styles.questionNumber,
                            {
                              color: colors.primary,
                            },
                          ]}
                        >
                          Question {questionIndex + 1}
                        </Text>
                        <View
                          style={[
                            styles.questionTypeBadge,
                            {
                              backgroundColor:
                                questionTypes.find(
                                  (t) => t.type === question.type
                                )?.color || "#2acde6",
                            },
                          ]}
                        >
                          <Text style={styles.questionTypeBadgeText}>
                            {questionTypes.find((t) => t.type === question.type)
                              ?.title || question.type}
                          </Text>
                        </View>
                      </View>
                      {questData.questions.length > 0 && (
                        <TouchableOpacity
                          style={styles.removeQuestionButton}
                          onPress={() => removeQuestion(questionIndex)}
                        >
                          <Ionicons
                            name="trash"
                            size={16}
                            color={colors.error}
                          />
                        </TouchableOpacity>
                      )}
                    </View>

                    <TextInput
                      value={question.text}
                      onChangeText={(text) =>
                        updateQuestion(questionIndex, "text", text)
                      }
                      placeholder="Enter your question..."
                      style={[styles.textInput, styles.questionInput]}
                      mode="outlined"
                      multiline
                      numberOfLines={3}
                      theme={{
                        colors: {
                          primary: colors.primary,
                          outline: colors.border,
                          background: colors.surface,
                          onSurface: colors.text,
                          text: colors.text,
                          placeholder: colors.textSecondary,
                        },
                      }}
                      textColor={colors.text}
                      contentStyle={styles.textInputContent}
                    />

                    {/* Optional Generic Hint */}
                    <View style={styles.inlineFieldGroup}>
                      <Text
                        style={[
                          styles.inlineFieldLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Hint (optional)
                      </Text>
                      <TextInput
                        value={question.hint}
                        onChangeText={(text) =>
                          updateQuestion(questionIndex, "hint", text)
                        }
                        placeholder="Short hint to assist the learner..."
                        style={[styles.textInput, styles.hintInput]}
                        mode="outlined"
                        multiline
                        numberOfLines={2}
                        maxLength={200}
                        theme={{
                          colors: {
                            primary: colors.primary,
                            outline: colors.border,
                            background: colors.surface,
                            onSurface: colors.text,
                            text: colors.text,
                            placeholder: colors.textSecondary,
                          },
                        }}
                        textColor={colors.text}
                      />
                    </View>

                    {/* Render different question type editors */}
                    {renderQuestionEditor(question, questionIndex)}
                  </View>
                ))}
              </View>

              {/* Validation Message */}
              {validationMessages.length > 0 && (
                <Text style={styles.validationMessage}>
                  {validationMessages.map((message) => `• ${message}`).join("\n")}
                </Text>
              )}
            </>
          )}
          {/* Question Type Selection Modal */}
          {showQuestionTypes && (
            <View style={styles.questionTypeModal}>
              <Text style={styles.questionTypeTitle}>Choose Question Type</Text>
              <View style={styles.questionTypeGrid}>
                {questionTypes.map((type) => (
                  <TouchableOpacity
                    key={type.type}
                    style={[
                      styles.questionTypeCard,
                      { borderColor: type.color },
                    ]}
                    onPress={() => addQuestion(type.type)}
                  >
                    <Ionicons
                      name={type.icon}
                      size={32}
                      color={type.color}
                      style={styles.questionTypeIcon}
                    />
                    <Text style={styles.questionTypeLabel}>{type.title}</Text>
                    <Text style={styles.questionTypeDescription}>
                      {type.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.cancelQuestionType}
                onPress={() => setShowQuestionTypes(false)}
              >
                <Text style={styles.cancelQuestionTypeText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Add Question Button - Positioned above Create Quest Button */}
          {questData.questions.length < 50 && (
            <TouchableOpacity
              style={[
                styles.createButton,
                {
                  marginTop: 16,
                  marginBottom: 12,
                },
              ]}
              onPress={() => setShowQuestionTypes(true)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={["#4a7c59", "#3a6c49"]}
                style={styles.buttonGradient}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text
                  style={[
                    styles.buttonText,
                    {
                      color: "#FFFFFF",
                    },
                  ]}
                >
                  Add Question
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.createButton,
              (!isValid() || creatingQuest) && styles.disabledButton,
            ]}
            onPress={createCyberQuest}
            disabled={!isValid() || creatingQuest}
          >
            <LinearGradient
              colors={
                !isValid() || creatingQuest
                  ? [colors.textSecondary, colors.border]
                  : [colors.primary, colors.accent]
              }
              style={styles.buttonGradient}
            >
              {creatingQuest ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Ionicons name="map" size={20} color={colors.background} />
              )}
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: colors.background,
                  },
                ]}
              >
                {creatingQuest
                  ? isEditing
                    ? "Updating Quest..."
                    : "Creating Quest..."
                  : isEditing
                  ? "Update Cyber Quest"
                  : "Create Cyber Quest"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* Minimalistic Success/Error Toast Modal */}
        <Modal
          visible={showModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
          statusBarTranslucent={true}
        >
          <View style={styles.toastModalOverlay}>
            <View
              style={[
                styles.toastModalContainer,
                {
                  backgroundColor:
                    modalConfig.type === "success"
                      ? colors.success || "#4CAF50"
                      : colors.error || "#f44336",
                },
              ]}
            >
              <View style={styles.toastContent}>
                <Ionicons
                  name={
                    modalConfig.type === "success"
                      ? "checkmark-circle"
                      : "alert-circle"
                  }
                  size={24}
                  color="white"
                />
                <View style={styles.toastTextContainer}>
                  <Text style={styles.toastTitle}>{modalConfig.title}</Text>
                  <Text style={styles.toastMessage}>{modalConfig.message}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.toastButton}
                onPress={() => {
                  setShowModal(false);
                  modalConfig.onConfirm();
                }}
              >
                <Text style={styles.toastButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // Removed unused QuizCreator component (was triggering lint no-unused-vars)
  /* const QuizCreator = () => {
    const [quizData, setQuizData] = useState({
      title: "",
      description: "",
      timeLimit: "",
      questions: [],
      difficulty: "beginner",
    });

    const [currentQuestion, setCurrentQuestion] = useState({
      type: "multiple-choice",
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      codeBlock: "",
    });

    const questionTypes = [
      // ...implementation removed
    ];
    return null;
  }; */

  const SectionCreator = ({ useCompactHeader = false }) => {
    const [activeSection, setActiveSection] = useState("create"); // "create", "assign", or "manage"
    const [sectionData, setSectionData] = useState({
      name: "",
      description: "",
    });
    const [createdSubjectCode, setCreatedSubjectCode] = useState(""); // Store created subject code

    const [mySubjects, setMySubjects] = useState([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [allStudents, setAllStudents] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [assignedStudents, setAssignedStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [loadingAssignedStudents, setLoadingAssignedStudents] =
      useState(false);
    const [showArchivedSubjects, setShowArchivedSubjects] = useState(false);
    // Modal for selecting subject instead of dropdown
    const [subjectModalVisible, setSubjectModalVisible] = useState(false);

    // Modal state for student lists
    const [availableStudentsModalVisible, setAvailableStudentsModalVisible] =
      useState(false);
    const [assignedStudentsModalVisible, setAssignedStudentsModalVisible] =
      useState(false);
    const STUDENT_LIST_PREVIEW_COUNT = 3;

    // Instructors modal state
    const [instructorsModalVisible, setInstructorsModalVisible] =
      useState(false);
    const [selectedSubjectForInstructors, setSelectedSubjectForInstructors] =
      useState(null);
    const [subjectInstructors, setSubjectInstructors] = useState([]);
    const [availableInstructors, setAvailableInstructors] = useState([]);
    const [loadingInstructors, setLoadingInstructors] = useState(false);
    const [instructorSearchQuery, setInstructorSearchQuery] = useState("");

    // Edit subject state
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [editFormData, setEditFormData] = useState({
      name: "",
      description: "",
    });

    // Modal state for success/error messages
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({
      title: "",
      message: "",
      type: "success", // "success" or "error"
      onConfirm: () => {},
      actions: [], // For multiple action buttons
    });

    // Helper function to show custom modal (cross-platform)
    const showCustomModal = (
      title,
      message,
      type = "success",
      onConfirm = () => {},
      actions = []
    ) => {
      if (Platform.OS === "web") {
        // Use custom modal for web
        setModalConfig({ title, message, type, onConfirm, actions });
        setShowModal(true);
      } else {
        // Use native Alert for mobile
        if (actions.length > 0) {
          Alert.alert(title, message, actions);
        } else {
          Alert.alert(title, message, [{ text: "OK", onPress: onConfirm }]);
        }
      }
    };

    // Fetch instructor's subjects
    const fetchMySubjects = async () => {
      try {
        setLoadingSubjects(true);
        const response = await fetch(`${API_URL}/subjects/user-subjects`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setMySubjects(data.subjects || []);
        } else {
          const errorData = await response
            .json()
            .catch(() => ({ message: "Unknown error" }));
          console.error("Failed to fetch subjects:", errorData);
          Alert.alert(
            "Error",
            `Failed to load your subjects: ${
              errorData.message || "Unknown error"
            }`
          );
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
        Alert.alert("Error", "Failed to connect to server");
      } finally {
        setLoadingSubjects(false);
      }
    };

    // Fetch available students - show all students except those already in the selected subject
    const fetchAvailableStudents = useCallback(async () => {
      try {
        setLoadingStudents(true);
        console.log("🔍 Fetching students for availability list...");
        console.log("🔍 Selected subject:", selectedSubjectId);

        // 1) Get ALL students available to instructor/admin
        const allStudentsResp = await fetch(`${API_URL}/users/students`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!allStudentsResp.ok) {
          const t = await allStudentsResp.text();
          console.error("🔍 Failed to fetch all students:", t);
          setAllStudents([]);
          return;
        }

        const allStudentsData = await allStudentsResp.json();
        const allStudentsList = Array.isArray(allStudentsData.students)
          ? allStudentsData.students
          : [];
        console.log("🔍 All students fetched:", allStudentsList.length);

        // 2) If a subject is selected, fetch assigned students and exclude them
        if (selectedSubjectId) {
          const currentResp = await fetch(
            `${API_URL}/subjects/${selectedSubjectId}/students`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          let currentIds = [];
          if (currentResp.ok) {
            const currentData = await currentResp.json();
            currentIds = Array.isArray(currentData.students)
              ? currentData.students.map((s) => s._id)
              : [];
            console.log("🔍 Current section student count:", currentIds.length);
          }

          const available = allStudentsList.filter(
            (s) => !currentIds.includes(s._id)
          );
          console.log(
            "🔍 Available (excl. current section):",
            available.length
          );
          setAllStudents(available);
        } else {
          console.log("🔍 No section selected, showing all students");
          setAllStudents(allStudentsList);
        }
      } catch (error) {
        console.error("🔍 Network error fetching students:", error);
        showCustomModal(
          "Error",
          `Failed to load students: ${error.message}`,
          "error"
        );
        setAllStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    }, [selectedSubjectId]);

    // Fetch assigned students for a selected subject using subjects service
    const fetchAssignedStudents = async (subjectId) => {
      if (!subjectId) {
        setAssignedStudents([]);
        return;
      }

      try {
        setLoadingAssignedStudents(true);
        console.log(
          `[fetchAssignedStudents] Fetching students for subject: ${subjectId}`
        );

        const result = await subjectsAPI.getSubjectStudents(token, subjectId);

        if (result.success && Array.isArray(result.students)) {
          console.log(
            `[fetchAssignedStudents] Successfully fetched ${result.students.length} students`
          );
          setAssignedStudents(result.students);
        } else {
          console.error(
            "[fetchAssignedStudents] Invalid response format:",
            result
          );
          setAssignedStudents([]);
          // Show user-friendly error message
          showCustomModal(
            "Error",
            result.message || "Failed to load assigned students",
            "error"
          );
        }
      } catch (error) {
        console.error("[fetchAssignedStudents] Error:", error);
        setAssignedStudents([]);
        // Show user-friendly error message
        showCustomModal(
          "Error",
          "Unable to load assigned students. Please try again.",
          "error"
        );
      } finally {
        setLoadingAssignedStudents(false);
      }
    };

    // Load data when switching to assign section
    useEffect(() => {
      if (activeSection === "assign") {
        if (!token) {
          console.error("No token available");
          showCustomModal(
            "Error",
            "Authentication required. Please log in again.",
            "error"
          );
          return;
        }
        fetchMySubjects();
        fetchAvailableStudents();
      }
    }, [activeSection, fetchAvailableStudents]);

    // Fetch assigned students when subject is selected and refresh available students
    useEffect(() => {
      if (selectedSubjectId) {
        setAssignedStudents([]); // Clear previous assigned students immediately
        fetchAssignedStudents(selectedSubjectId);
        fetchAvailableStudents(); // Refresh available students when subject changes
      } else {
        setAssignedStudents([]);
        fetchAvailableStudents(); // Show all unassigned when no subject selected
      }
      // Also clear selected students when switching subjects
      setSelectedStudents([]);
    }, [selectedSubjectId, fetchAvailableStudents]);

    // Filter available students based on search query
    const availableStudents = allStudents.filter(
      (student) =>
        !selectedStudents.some((selected) => selected._id === student._id) &&
        (student.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.username?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const addStudent = (student) => {
      setSelectedStudents([...selectedStudents, student]);
      setSearchQuery("");
    };

    const removeStudent = (studentId) => {
      setSelectedStudents(
        selectedStudents.filter((student) => student._id !== studentId)
      );
    };

    // Remove student from assigned subject using subjects service
    const removeAssignedStudent = async (studentId) => {
      if (!selectedSubjectId) return;

      try {
        console.log(
          `[removeAssignedStudent] Removing student ${studentId} from subject ${selectedSubjectId}`
        );

        const result = await subjectsAPI.removeStudentFromSubject(
          token,
          selectedSubjectId,
          studentId
        );

        if (result.success) {
          // Remove from local state
          setAssignedStudents(
            assignedStudents.filter((student) => student._id !== studentId)
          );
          // Refresh available students list
          fetchAvailableStudents();
          console.log(
            `[removeAssignedStudent] Successfully removed student from subject`
          );
        } else {
          console.error(
            `[removeAssignedStudent] Failed to remove student:`,
            result
          );
          showCustomModal(
            "Error",
            result.message || "Failed to remove student from subject",
            "error"
          );
        }
      } catch (error) {
        console.error("[removeAssignedStudent] Error:", error);
        showCustomModal(
          "Error",
          "Unable to remove student. Please try again.",
          "error"
        );
      }
    };

    const createSection = async () => {
      if (!sectionData.name.trim()) {
        showCustomModal(
          "Validation Error",
          "Please enter a subject name",
          "error"
        );
        return;
      }

      if (!token) {
        showCustomModal(
          "Error",
          "Authentication required. Please log in again.",
          "error"
        );
        return;
      }

      try {
        setLoading(true);

        const sectionResponse = await fetch(`${API_URL}/subjects`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: sectionData.name,
            description: sectionData.description,
            instructor: user.id,
          }),
        });

        if (!sectionResponse.ok) {
          const errorData = await sectionResponse.json();
          throw new Error(errorData.message || "Failed to create subject");
        }

        const responseData = await sectionResponse.json();
        const subjectCode = responseData.subject?.subjectCode;

        // Store the subject code
        setCreatedSubjectCode(subjectCode || "");

        // Show success modal with multiple action options
        const successActions = [
          {
            text: "Copy Code",
            style: "default",
            onPress: () => {
              if (subjectCode) {
                showCustomModal(
                  "Code Ready to Share! 📋",
                  `Subject Code: ${subjectCode}\n\nTell students:\n1. Tap "Join" on home page\n2. Enter code: ${subjectCode}\n3. They'll be enrolled instantly!`,
                  "success"
                );
              }
            },
          },
          {
            text: "Create Another",
            style: "default",
            onPress: () => {
              // Reset form and clear the displayed code
              setSectionData({ name: "", description: "" });
              setCreatedSubjectCode(""); // Clear the displayed code
              // Stay on create tab for another subject
            },
          },
          {
            text: "View My Subjects",
            style: "default",
            onPress: () => {
              // Reset form and switch to manage tab
              setSectionData({ name: "", description: "" });
              setCreatedSubjectCode("");
              setActiveSection("manage");
              fetchMySubjects(); // Refresh the subjects list
            },
          },
        ];

        showCustomModal(
          "Subject Created! 🎉",
          `"${sectionData.name}" has been created successfully!\n\n📋 Subject Code: ${subjectCode}\n\nShare this 6-character code with students so they can join your subject using the "Join" button.`,
          "success",
          () => {}, // Default onConfirm
          successActions
        );
      } catch (error) {
        console.error("Error creating subject:", error);
        showCustomModal(
          "Error",
          error.message || "Failed to create subject. Please try again.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    };

    const assignStudentsToSubject = async () => {
      if (!selectedSubjectId) {
        showCustomModal("Validation Error", "Please select a subject", "error");
        return;
      }

      if (selectedStudents.length === 0) {
        showCustomModal(
          "Validation Error",
          "Please select at least one student",
          "error"
        );
        return;
      }

      if (!token) {
        showCustomModal(
          "Error",
          "Authentication required. Please log in again.",
          "error"
        );
        return;
      }

      // Check if any students are already assigned to this subject
      const alreadyAssignedStudents = selectedStudents.filter((student) =>
        assignedStudents.some((assigned) => assigned._id === student._id)
      );

      if (alreadyAssignedStudents.length > 0) {
        const studentNames = alreadyAssignedStudents
          .map((s) => s.fullName || s.username)
          .join(", ");
        showCustomModal(
          "Students Already Assigned",
          `The following students are already assigned to this subject: ${studentNames}`,
          "error",
          () => {}, // Default onConfirm
          [
            {
              text: "Cancel",
              onPress: () => {},
            },
            {
              text: "Assign Others",
              onPress: () => {
                // Remove already assigned students from selection
                const newSelection = selectedStudents.filter(
                  (student) =>
                    !alreadyAssignedStudents.some(
                      (assigned) => assigned._id === student._id
                    )
                );
                setSelectedStudents(newSelection);
              },
            },
          ]
        );
        return;
      }

      try {
        setLoading(true);

        // Use the subjects service for individual student assignment
        // This allows students to be in multiple subjects
        console.log(
          `[assignStudentsToSubject] Assigning ${selectedStudents.length} students to subject ${selectedSubjectId}`
        );

        const assignmentPromises = selectedStudents.map(async (student) => {
          try {
            const result = await subjectsAPI.assignStudentToSubject(
              token,
              selectedSubjectId,
              student._id
            );

            if (!result.success) {
              throw new Error(
                `Failed to assign ${student.fullName || student.username}: ${
                  result.message
                }`
              );
            }

            console.log(
              `[assignStudentsToSection] Successfully assigned ${
                student.fullName || student.username
              }`
            );
            return result;
          } catch (error) {
            console.error(
              `[assignStudentsToSection] Error assigning ${
                student.fullName || student.username
              }:`,
              error
            );
            throw error;
          }
        });

        // Wait for all assignments to complete
        await Promise.all(assignmentPromises);

        const selectedSubject = mySubjects.find(
          (subject) => subject._id === selectedSubjectId
        );

        showCustomModal(
          "Success",
          `${selectedStudents.length} students assigned to "${selectedSubject?.name}" successfully!\n\nNote: Students can now be enrolled in multiple subjects and can switch between them.`,
          "success",
          () => {
            // Reset form
            setSelectedStudents([]);
            // Don't reset selectedSubjectId so user can see the updated assigned list
            setSearchQuery("");
            fetchMySubjects(); // Refresh subjects
            fetchAvailableStudents(); // Refresh available students
            fetchAssignedStudents(selectedSubjectId); // Refresh assigned students
          }
        );
      } catch (error) {
        console.error("Error assigning students:", error);
        showCustomModal(
          "Error",
          error.message || "Failed to assign students. Please try again.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    };

    // Open edit modal with subject data
    const openEditModal = (subject) => {
      setEditingSubject(subject);
      setEditFormData({
        name: subject.name,
        description: subject.description || "",
      });
      setEditModalVisible(true);
    };

    // Close edit modal and reset state
    const closeEditModal = () => {
      setEditModalVisible(false);
      setEditingSubject(null);
      setEditFormData({ name: "", description: "" });
    };

    // Update subject
    const updateSubject = async () => {
      if (!editFormData.name.trim()) {
        showCustomModal(
          "Validation Error",
          "Please enter a subject name",
          "error"
        );
        return;
      }

      if (!token) {
        showCustomModal(
          "Error",
          "Authentication required. Please log in again.",
          "error"
        );
        return;
      }

      try {
        setLoading(true);

        const result = await subjectsAPI.updateSubject(
          token,
          editingSubject._id,
          {
            name: editFormData.name,
            description: editFormData.description,
          }
        );

        if (result.success) {
          // Update the local subjects list
          setMySubjects((prevSubjects) =>
            prevSubjects.map((subject) =>
              subject._id === editingSubject._id
                ? {
                    ...subject,
                    name: editFormData.name,
                    description: editFormData.description,
                  }
                : subject
            )
          );

          // Close edit modal first, then show success message
          closeEditModal();

          // Small delay to ensure modal closes before showing success
          setTimeout(() => {
            showCustomModal(
              "Success! 🎉",
              `"${editFormData.name}" has been updated successfully!`,
              "success"
            );
          }, 100);
        }
      } catch (error) {
        console.error("Error updating subject:", error);
        showCustomModal(
          "Error",
          error.message || "Failed to update subject. Please try again.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    };

    // Open instructors modal for a subject
    const openInstructorsModal = async (subject) => {
      setSelectedSubjectForInstructors(subject);
      setInstructorSearchQuery(""); // Clear search when opening modal
      setInstructorsModalVisible(true);
      await fetchSubjectInstructors(subject._id);
      await fetchAvailableInstructorsForSubject();
    };

    // Fetch instructors for a subject
    const fetchSubjectInstructors = async (subjectId) => {
      try {
        setLoadingInstructors(true);
        const result = await subjectsAPI.getSubjectInstructors(
          token,
          subjectId
        );
        if (result.success) {
          setSubjectInstructors(result.instructors || []);
        }
      } catch (error) {
        console.error("Error fetching subject instructors:", error);
        showCustomModal(
          "Error",
          error.message || "Failed to load instructors",
          "error"
        );
      } finally {
        setLoadingInstructors(false);
      }
    };

    // Fetch all available instructors (for adding to subject)
    const fetchAvailableInstructorsForSubject = async () => {
      try {
        const response = await fetch(`${API_URL}/users?role=instructor`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("📡 Available instructors response:", data);
          if (data.success) {
            setAvailableInstructors(data.users || []);
          }
        } else {
          console.error(
            "Failed to fetch instructors, status:",
            response.status
          );
        }
      } catch (error) {
        console.error("Error fetching available instructors:", error);
      }
    };

    // Add instructor to subject
    const addInstructorToSubject = async (instructorId) => {
      if (!selectedSubjectForInstructors) return;

      try {
        setLoadingInstructors(true);
        const result = await subjectsAPI.addInstructorToSubject(
          token,
          selectedSubjectForInstructors._id,
          instructorId
        );

        if (result.success) {
          showCustomModal(
            "Success",
            `Instructor added to ${selectedSubjectForInstructors.name}`,
            "success"
          );
          await fetchSubjectInstructors(selectedSubjectForInstructors._id);
          await fetchAvailableInstructorsForSubject();
        }
      } catch (error) {
        console.error("Error adding instructor:", error);
        showCustomModal(
          "Error",
          error.message || "Failed to add instructor",
          "error"
        );
      } finally {
        setLoadingInstructors(false);
      }
    };

    // Remove instructor from subject
    const removeInstructorFromSubject = async (
      instructorId,
      isPrimary = false
    ) => {
      if (!selectedSubjectForInstructors) return;

      const confirmMessage = isPrimary
        ? "Remove Primary Instructor?\n\nRemoving the primary instructor will promote another instructor to primary. Continue?"
        : "Remove this instructor from the subject?";

      const confirmRemoval = () => {
        subjectsAPI
          .removeInstructorFromSubject(
            token,
            selectedSubjectForInstructors._id,
            instructorId
          )
          .then((result) => {
            if (result.success) {
              showCustomModal(
                "Success",
                `Instructor removed from ${selectedSubjectForInstructors.name}`,
                "success"
              );
              fetchSubjectInstructors(selectedSubjectForInstructors._id);
            }
          })
          .catch((error) => {
            console.error("Error removing instructor:", error);
            showCustomModal(
              "Error",
              error.message || "Failed to remove instructor",
              "error"
            );
          });
      };

      if (Platform.OS === "web") {
        const confirmed = window.confirm(confirmMessage);
        if (confirmed) confirmRemoval();
      } else {
        Alert.alert("Remove Instructor", confirmMessage, [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: confirmRemoval },
        ]);
      }
    };

    return (
      <View style={styles.formContainer}>
        {!useCompactHeader && (
          <View style={[styles.formHeader, { borderBottomColor: colors.border }]}> 
            <Text style={[styles.formTitle, { color: colors.textSecondary }]}> 
              🎓 Course Management
            </Text>
          </View>
        )}

        {/* Tab Navigation */}
        <View style={styles.sectionTabContainer}>
          <TouchableOpacity
            style={[
              styles.sectionTab,
              activeSection === "create" && styles.activeSectionTab,
            ]}
            onPress={() => {
              setActiveSection("create");
            }}
          >
            <Ionicons
              name="add-circle"
              size={20}
              color={activeSection === "create" ? colors.background : "#4a7c59"}
            />
            <Text
              style={[
                styles.sectionTabText,
                {
                  color:
                    activeSection === "create" ? colors.background : "#4a7c59",
                },
                activeSection === "create" && styles.activeSectionTabText,
              ]}
            >
              Create Subject
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sectionTab,
              activeSection === "assign" && styles.activeSectionTab,
            ]}
            onPress={() => {
              setActiveSection("assign");
            }}
          >
            <Ionicons
              name="people"
              size={20}
              color={activeSection === "assign" ? colors.background : "#4a7c59"}
            />
            <Text
              style={[
                styles.sectionTabText,
                {
                  color:
                    activeSection === "assign" ? colors.background : "#4a7c59",
                },
                activeSection === "assign" && styles.activeSectionTabText,
              ]}
            >
              Assign Students
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sectionTab,
              activeSection === "manage" && styles.activeSectionTab,
            ]}
            onPress={() => {
              setActiveSection("manage");
              fetchMySubjects(); // Refresh the subjects list
            }}
          >
            <Ionicons
              name="list"
              size={20}
              color={activeSection === "manage" ? colors.background : "#4a7c59"}
            />
            <Text
              style={[
                styles.sectionTabText,
                {
                  color:
                    activeSection === "manage" ? colors.background : "#4a7c59",
                },
                activeSection === "manage" && styles.activeSectionTabText,
              ]}
            >
              My Subjects
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={[
            styles.scrollContainer,
            Platform.OS === "web" &&
              activeSection === "manage" &&
              styles.webScrollableManageSubjects,
            Platform.OS === "web" &&
              activeSection === "assign" &&
              styles.webScrollableAssignStudents,
          ]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          persistentScrollbar={Platform.OS === "web"}
          nestedScrollEnabled={Platform.OS === "android"}
          keyboardShouldPersistTaps="handled"
        >
          {activeSection === "create" ? (
            // CREATE SUBJECT DIVISION
            <>
              <View style={styles.divisionHeader}>
                <Ionicons name="school" size={24} color="#4a7c59" />
                <Text style={[styles.divisionTitle, { color: "#4a7c59" }]}>
                  Create New Subject
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: "#4a7c59" }]}>
                  Subject Name *
                </Text>
                <TextInput
                  value={sectionData.name}
                  onChangeText={(text) => {
                    setSectionData({ ...sectionData, name: text });
                    // Clear the created subject code when user starts typing new subject
                    if (createdSubjectCode && text.length > 0) {
                      setCreatedSubjectCode("");
                    }
                  }}
                  placeholder="Enter subject name"
                  placeholderTextColor="#4a7c59"
                  style={[styles.textInput, { backgroundColor: "#FFFFFF" }]}
                  mode="outlined"
                  theme={{
                    colors: {
                      primary: "#2acde6",
                      outline: "#2acde6",
                      background: "#FFFFFF",
                      onSurface: "#4a7c59",
                      text: "#4a7c59",
                      placeholder: "#4a7c59",
                    },
                  }}
                  textColor="#4a7c59"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: "#4a7c59" }]}>
                  Description
                </Text>
                <TextInput
                  value={sectionData.description}
                  onChangeText={(text) =>
                    setSectionData({ ...sectionData, description: text })
                  }
                  placeholder="Describe your subject (optional)"
                  placeholderTextColor="#4a7c59"
                  multiline
                  numberOfLines={3}
                  style={[
                    styles.textInput,
                    styles.textArea,
                    { backgroundColor: "#FFFFFF" },
                  ]}
                  mode="outlined"
                  theme={{
                    colors: {
                      primary: "#2acde6",
                      outline: "#2acde6",
                      background: "#FFFFFF",
                      onSurface: "#4a7c59",
                      text: "#4a7c59",
                      placeholder: "#4a7c59",
                    },
                  }}
                  textColor="#4a7c59"
                  contentStyle={styles.textInputContent}
                />
              </View>

              <TouchableOpacity
                style={[styles.createButton, loading && styles.disabledButton]}
                onPress={createSection}
                disabled={loading}
              >
                <LinearGradient
                  colors={
                    loading
                      ? [colors.textSecondary, colors.border]
                      : [colors.primary, colors.secondary]
                  }
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <Text style={[styles.buttonText, { color: "#ffffff" }]}>
                      Creating...
                    </Text>
                  ) : (
                    <>
                      <Ionicons name="school" size={20} color="#ffffff" />
                      <Text style={[styles.buttonText, { color: "#ffffff" }]}>
                        Create Subject
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Display created subject code */}
              {createdSubjectCode && (
                <View
                  style={[
                    styles.subjectCodeContainer,
                    {
                      backgroundColor: `${colors.primary}20`,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <View style={styles.subjectCodeHeader}>
                    <Ionicons name="key" size={20} color={colors.primary} />
                    <Text
                      style={[
                        styles.subjectCodeTitle,
                        { color: colors.primary },
                      ]}
                    >
                      Subject Code Created!
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.subjectCodeBox,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <Text
                      style={[styles.subjectCodeText, { color: colors.text }]}
                    >
                      {createdSubjectCode}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.copyButton,
                        { backgroundColor: `${colors.primary}40` },
                      ]}
                      onPress={() => {
                        Alert.alert(
                          "Share Code",
                          `Share this code with students: ${createdSubjectCode}`
                        );
                      }}
                    >
                      <Ionicons name="copy" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={[
                      styles.subjectCodeHelp,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Share this code with students so they can join your subject
                  </Text>
                </View>
              )}
            </>
          ) : activeSection === "assign" ? (
            // ASSIGN STUDENTS DIVISION
            <>
              <View style={styles.divisionHeader}>
                <Ionicons name="people" size={24} color="#4a7c59" />
                <Text style={[styles.divisionTitle, { color: "#4a7c59" }]}>
                  Assign Students to Subject
                </Text>
              </View>

              {/* Multi-Subject Info */}
              <View
                style={[styles.infoContainer, { backgroundColor: "#92eacc" }]}
              >
                <Ionicons name="information-circle" size={20} color="#4a7c59" />
                <Text style={[styles.infoText, { color: "#fffff" }]}>
                  Available students: unassigned students + students from other
                  subjects. Students can be enrolled in multiple subjects and
                  switch between them.
                </Text>
              </View>

              {/* Subject Selection */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: "#4a7c59" }]}>
                  Select Subject *
                </Text>
                {loadingSubjects ? (
                  <View style={styles.loadingContainer}>
                    <Text
                      style={[
                        styles.loadingText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Loading subjects...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity
                      style={[
                        styles.dropdownButton,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => {
                        if (mySubjects.length === 0) {
                          Alert.alert(
                            "No Subjects",
                            "You haven't created any subjects yet. Please create a subject first."
                          );
                          return;
                        }
                        setSubjectModalVisible(true);
                      }}
                    >
                      <Text
                        style={[styles.dropdownText, { color: colors.text }]}
                      >
                        {selectedSubjectId
                          ? mySubjects.find((s) => s._id === selectedSubjectId)
                              ?.name || "Select subject..."
                          : "Select subject..."}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {selectedSubjectId && (
                <>
                  {/* Currently Assigned Students Section */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: "#4a7c59" }]}>
                      Currently Assigned Students
                    </Text>

                    {loadingAssignedStudents ? (
                      <View style={styles.loadingContainer}>
                        <Text
                          style={[
                            styles.loadingText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Loading assigned students...
                        </Text>
                      </View>
                    ) : (
                      <View>
                        <ScrollView
                          style={[
                            styles.selectedStudentsList,
                            { backgroundColor: colors.surface },
                          ]}
                          showsVerticalScrollIndicator={true}
                          nestedScrollEnabled={true}
                        >
                          {assignedStudents.length > 0 ? (
                            assignedStudents
                              .slice(0, STUDENT_LIST_PREVIEW_COUNT)
                              .map((student) => (
                                <View
                                  key={student._id}
                                  style={styles.selectedStudentItem}
                                >
                                  <View style={styles.studentInfo}>
                                    <View
                                      style={[
                                        styles.studentAvatar,
                                        { backgroundColor: colors.primary },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.studentInitial,
                                          { color: colors.background },
                                        ]}
                                      >
                                        {(
                                          student.fullName ||
                                          student.username ||
                                          "U"
                                        )
                                          .charAt(0)
                                          .toUpperCase()}
                                      </Text>
                                    </View>
                                    <View style={styles.studentDetails}>
                                      <Text
                                        style={[
                                          styles.studentName,
                                          { color: colors.text },
                                        ]}
                                      >
                                        {student.fullName ||
                                          student.username ||
                                          "Unknown User"}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.studentEmail,
                                          { color: colors.textSecondary },
                                        ]}
                                      >
                                        {student.email}
                                      </Text>
                                    </View>
                                  </View>
                                  <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() =>
                                      removeAssignedStudent(student._id)
                                    }
                                  >
                                    <Ionicons
                                      name="close-circle"
                                      size={24}
                                      color={colors.error}
                                    />
                                  </TouchableOpacity>
                                </View>
                              ))
                          ) : (
                            <View style={styles.emptyStudentList}>
                              <Ionicons
                                name="people-outline"
                                size={48}
                                color={colors.textSecondary}
                              />
                              <Text
                                style={[
                                  styles.emptyText,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                No students assigned to this subject
                              </Text>
                              <Text
                                style={[
                                  styles.emptySubtext,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Students will appear here when assigned
                              </Text>
                            </View>
                          )}
                        </ScrollView>
                        {assignedStudents.length >
                          STUDENT_LIST_PREVIEW_COUNT && (
                          <TouchableOpacity
                            style={styles.viewMoreButton}
                            onPress={() =>
                              setAssignedStudentsModalVisible(true)
                            }
                          >
                            <Text
                              style={[
                                styles.viewMoreText,
                                { color: colors.primary },
                              ]}
                            >
                              View More (
                              {assignedStudents.length -
                                STUDENT_LIST_PREVIEW_COUNT}{" "}
                              more)
                            </Text>
                            <Ionicons
                              name="chevron-down"
                              size={20}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Student Assignment Section */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: "#4a7c59" }]}>
                      Assign Students ({selectedStudents.length})
                    </Text>

                    {loadingStudents ? (
                      <View style={styles.loadingContainer}>
                        <Text
                          style={[
                            styles.loadingText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Loading students...
                        </Text>
                      </View>
                    ) : (
                      <>
                        {/* Search and Add Students */}
                        <View style={styles.studentSearchContainer}>
                          <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search available students..."
                            placeholderTextColor="#4a7c59"
                            style={[
                              styles.textInput,
                              { backgroundColor: "#ffffff" },
                            ]}
                            mode="outlined"
                            theme={{
                              colors: {
                                primary: "#2acde6",
                                outline: "#2acde6",
                                background: "#92eacc",
                                onSurface: "#4a7c59",
                                text: "#4a7c59",
                                placeholder: "#4a7c59",
                              },
                            }}
                            textColor="#4a7c59"
                            right={
                              <TextInput.Icon
                                icon="magnify"
                                iconColor="#2acde6"
                              />
                            }
                          />

                          {/* Available Students List */}
                          <View
                            style={[
                              styles.availableStudentsContainer,
                              { backgroundColor: colors.surface },
                            ]}
                          >
                            <Text
                              style={[
                                styles.availableStudentsTitle,
                                { color: colors.primary },
                              ]}
                            >
                              Available Students ({availableStudents.length})
                            </Text>
                            {availableStudents.length > 0 ? (
                              <>
                                <ScrollView
                                  style={styles.availableStudentsList}
                                  showsVerticalScrollIndicator={true}
                                  nestedScrollEnabled={true}
                                >
                                  {availableStudents
                                    .slice(0, STUDENT_LIST_PREVIEW_COUNT)
                                    .map((student) => (
                                      <TouchableOpacity
                                        key={student._id}
                                        style={styles.studentDropdownItem}
                                        onPress={() => addStudent(student)}
                                      >
                                        <View
                                          style={[
                                            styles.studentAvatar,
                                            { backgroundColor: colors.primary },
                                          ]}
                                        >
                                          <Text
                                            style={[
                                              styles.studentInitial,
                                              { color: colors.background },
                                            ]}
                                          >
                                            {(
                                              student.fullName ||
                                              student.username ||
                                              "U"
                                            )
                                              .charAt(0)
                                              .toUpperCase()}
                                          </Text>
                                        </View>
                                        <View style={styles.studentDetails}>
                                          <Text
                                            style={[
                                              styles.studentName,
                                              { color: colors.text },
                                            ]}
                                          >
                                            {student.fullName ||
                                              student.username ||
                                              "Unknown User"}
                                          </Text>
                                          <Text
                                            style={[
                                              styles.studentEmail,
                                              { color: colors.textSecondary },
                                            ]}
                                          >
                                            {student.email}
                                          </Text>
                                        </View>
                                        <Ionicons
                                          name="add-circle"
                                          size={24}
                                          color={colors.success}
                                        />
                                      </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                {availableStudents.length >
                                  STUDENT_LIST_PREVIEW_COUNT && (
                                  <TouchableOpacity
                                    style={styles.viewMoreButton}
                                    onPress={() =>
                                      setAvailableStudentsModalVisible(true)
                                    }
                                  >
                                    <Text
                                      style={[
                                        styles.viewMoreText,
                                        { color: colors.primary },
                                      ]}
                                    >
                                      View More (
                                      {availableStudents.length -
                                        STUDENT_LIST_PREVIEW_COUNT}{" "}
                                      more)
                                    </Text>
                                    <Ionicons
                                      name="chevron-down"
                                      size={20}
                                      color={colors.primary}
                                    />
                                  </TouchableOpacity>
                                )}
                              </>
                            ) : (
                              <View style={styles.noResultsContainer}>
                                <Text
                                  style={[
                                    styles.noResultsText,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  No available students found
                                </Text>
                                <Text
                                  style={[
                                    styles.noResultsSubtext,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  All students may already be assigned to
                                  sections
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Selected Students List */}
                        <View
                          style={[
                            styles.selectedStudentsList,
                            { backgroundColor: colors.surface },
                          ]}
                        >
                          {selectedStudents.map((student) => (
                            <View
                              key={student._id}
                              style={styles.selectedStudentItem}
                            >
                              <View style={styles.studentInfo}>
                                <View
                                  style={[
                                    styles.studentAvatar,
                                    { backgroundColor: colors.primary },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.studentInitial,
                                      { color: colors.background },
                                    ]}
                                  >
                                    {(
                                      student.fullName ||
                                      student.username ||
                                      "U"
                                    )
                                      .charAt(0)
                                      .toUpperCase()}
                                  </Text>
                                </View>
                                <View style={styles.studentDetails}>
                                  <Text
                                    style={[
                                      styles.studentName,
                                      { color: colors.text },
                                    ]}
                                  >
                                    {student.fullName ||
                                      student.username ||
                                      "Unknown User"}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.studentEmail,
                                      { color: colors.textSecondary },
                                    ]}
                                  >
                                    {student.email}
                                  </Text>
                                </View>
                              </View>
                              <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => removeStudent(student._id)}
                              >
                                <Ionicons
                                  name="close-circle"
                                  size={24}
                                  color={colors.error}
                                />
                              </TouchableOpacity>
                            </View>
                          ))}

                          {selectedStudents.length === 0 && (
                            <View style={styles.emptyStudentList}>
                              <Ionicons
                                name="people-outline"
                                size={48}
                                color={colors.textSecondary}
                              />
                              <Text
                                style={[
                                  styles.emptyText,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                No students assigned yet
                              </Text>
                              <Text
                                style={[
                                  styles.emptySubtext,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Search and add students to this subject
                              </Text>
                            </View>
                          )}
                        </View>

                        {allStudents.length === 0 && (
                          <View
                            style={[
                              styles.noStudentsContainer,
                              { backgroundColor: colors.surface },
                            ]}
                          >
                            <Text
                              style={[
                                styles.noStudentsText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              No unassigned students available
                            </Text>
                            <Text
                              style={[
                                styles.noStudentsSubtext,
                                { color: colors.textSecondary },
                              ]}
                            >
                              All students are already assigned to subjects
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.createButton,
                      loading && styles.disabledButton,
                    ]}
                    onPress={assignStudentsToSubject}
                    disabled={loading || selectedStudents.length === 0}
                  >
                    <LinearGradient
                      colors={
                        loading || selectedStudents.length === 0
                          ? [colors.textSecondary, colors.border]
                          : [colors.success, colors.secondary]
                      }
                      style={styles.buttonGradient}
                    >
                      {loading ? (
                        <Text
                          style={[styles.buttonText, { color: colors.text }]}
                        >
                          Assigning...
                        </Text>
                      ) : (
                        <>
                          <Ionicons
                            name="people"
                            size={20}
                            color={colors.text}
                          />
                          <Text
                            style={[styles.buttonText, { color: colors.text }]}
                          >
                            Assign {selectedStudents.length} Student
                            {selectedStudents.length !== 1 ? "s" : ""}
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            // MY SUBJECTS DIVISION
            <>
              <View style={styles.divisionHeader}>
                <Ionicons name="list" size={24} color="#4a7c59" />
                <Text style={[styles.divisionTitle, { color: "#4a7c59" }]}>
                  My Subjects
                </Text>
              </View>

              <View
                style={[styles.infoContainer, { backgroundColor: "#92eacc" }]}
              >
                <Ionicons name="information-circle" size={20} color="#4a7c59" />
                <Text style={[styles.infoText, { color: "#4a7c59" }]}>
                  View all your created subjects and their join codes. Share
                  these codes with students to let them join your subjects.
                </Text>
              </View>

              {/* Archive Filter Toggle */}
              <View style={styles.archiveFilterContainer}>
                <TouchableOpacity
                  style={[
                    styles.archiveToggleButton,
                    {
                      backgroundColor: showArchivedSubjects
                        ? `${colors.primary}20`
                        : `${colors.textSecondary}20`,
                      borderColor: showArchivedSubjects
                        ? colors.primary
                        : colors.textSecondary,
                    },
                  ]}
                  onPress={() => setShowArchivedSubjects(!showArchivedSubjects)}
                >
                  <Ionicons
                    name={showArchivedSubjects ? "eye" : "eye-off"}
                    size={16}
                    color={
                      showArchivedSubjects
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.archiveToggleText,
                      {
                        color: showArchivedSubjects
                          ? colors.primary
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {showArchivedSubjects ? "Hide Archived" : "Show Archived"}
                  </Text>
                </TouchableOpacity>
              </View>

              {loadingSubjects ? (
                <View style={styles.loadingContainer}>
                  <Text
                    style={[
                      styles.loadingText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Loading subjects...
                  </Text>
                </View>
              ) : mySubjects.filter((subject) =>
                  showArchivedSubjects ? subject.archived : !subject.archived
                ).length === 0 ? (
                <View style={styles.noSubjectsContainer}>
                  <Ionicons
                    name={
                      showArchivedSubjects
                        ? "archive-outline"
                        : "school-outline"
                    }
                    size={64}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.noSubjectsText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {showArchivedSubjects
                      ? "No Archived Subjects"
                      : "No Active Subjects"}
                  </Text>
                  <Text
                    style={[
                      styles.noSubjectsSubtext,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {showArchivedSubjects
                      ? "You have no archived subjects to display"
                      : "Create your first subject to get started"}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.createFirstButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setActiveSection("create")}
                  >
                    <Ionicons name="add" size={20} color={colors.background} />
                    <Text
                      style={[
                        styles.createFirstButtonText,
                        { color: colors.background },
                      ]}
                    >
                      Create First Subject
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.subjectsList}>
                  {mySubjects
                    .filter((subject) =>
                      showArchivedSubjects
                        ? subject.archived
                        : !subject.archived
                    )
                    .map((subject) => (
                      <View
                        key={subject._id}
                        style={[
                          styles.subjectCard,
                          {
                            backgroundColor: colors.surface,
                            borderColor: `${colors.primary}20`,
                          },
                        ]}
                      >
                        <View style={styles.subjectHeader}>
                          <View style={styles.subjectInfo}>
                            <View style={styles.subjectNameRow}>
                              <Text
                                style={[
                                  styles.subjectName,
                                  { color: colors.text },
                                ]}
                              >
                                {subject.name}
                              </Text>
                              {subject.archived && (
                                <View
                                  style={[
                                    styles.archivedBadge,
                                    {
                                      backgroundColor: `${colors.warning}20`,
                                      borderColor: colors.warning,
                                    },
                                  ]}
                                >
                                  <Ionicons
                                    name="archive"
                                    size={12}
                                    color={colors.warning}
                                  />
                                  <Text
                                    style={[
                                      styles.archivedBadgeText,
                                      { color: colors.warning },
                                    ]}
                                  >
                                    Archived
                                  </Text>
                                </View>
                              )}
                            </View>
                            {subject.description && (
                              <Text
                                style={[
                                  styles.subjectDescription,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {subject.description}
                              </Text>
                            )}
                            <Text
                              style={[
                                styles.subjectStudents,
                                { color: colors.secondary },
                              ]}
                            >
                              {subject.students?.length || 0} student
                              {(subject.students?.length || 0) !== 1
                                ? "s"
                                : ""}{" "}
                              enrolled
                            </Text>
                          </View>
                          <View style={styles.subjectActions}>
                            <View style={styles.subjectCodeDisplay}>
                              <Text
                                style={[
                                  styles.codeLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Join Code:
                              </Text>
                              <View
                                style={[
                                  styles.codeBox,
                                  {
                                    backgroundColor: colors.background,
                                    borderColor: colors.primary,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.codeText,
                                    { color: colors.text },
                                  ]}
                                >
                                  {subject.subjectCode || "N/A"}
                                </Text>
                                <TouchableOpacity
                                  style={[
                                    styles.copyCodeButton,
                                    { backgroundColor: `${colors.primary}40` },
                                  ]}
                                  onPress={() => {
                                    Alert.alert(
                                      "Share Subject Code",
                                      `Share this code with students:\n\n${subject.subjectCode}\n\nStudents can enter this code to join "${subject.name}".`,
                                      [{ text: "OK", style: "default" }]
                                    );
                                  }}
                                >
                                  <Ionicons
                                    name="copy"
                                    size={16}
                                    color={colors.primary}
                                  />
                                </TouchableOpacity>
                              </View>
                            </View>

                            {/* Subject Action Buttons */}
                            <View style={styles.subjectActionButtons}>
                              {/* Edit Subject Button */}
                              <TouchableOpacity
                                style={[
                                  styles.editSubjectButton,
                                  {
                                    backgroundColor: `${colors.primary}20`,
                                    borderColor: colors.primary,
                                  },
                                ]}
                                onPress={() => openEditModal(subject)}
                              >
                                <Ionicons
                                  name="pencil"
                                  size={16}
                                  color={colors.primary}
                                />
                                <Text
                                  style={[
                                    styles.editSubjectButtonText,
                                    { color: colors.primary },
                                  ]}
                                >
                                  Edit
                                </Text>
                              </TouchableOpacity>

                              {/* Instructors Button */}
                              <TouchableOpacity
                                style={[
                                  styles.instructorsSubjectButton,
                                  {
                                    backgroundColor: `${
                                      colors.info || "#2196F3"
                                    }20`,
                                    borderColor: colors.info || "#2196F3",
                                  },
                                ]}
                                onPress={() => openInstructorsModal(subject)}
                              >
                                <Ionicons
                                  name="people"
                                  size={16}
                                  color={colors.info || "#2196F3"}
                                />
                                <Text
                                  style={[
                                    styles.instructorsSubjectButtonText,
                                    { color: colors.info || "#2196F3" },
                                  ]}
                                >
                                  Instructors
                                </Text>
                              </TouchableOpacity>

                              {/* Archive/Unarchive Subject Button */}
                              <TouchableOpacity
                                style={[
                                  styles.archiveSubjectButton,
                                  {
                                    backgroundColor: subject.archived
                                      ? `${colors.success}20`
                                      : `${colors.warning}20`,
                                    borderColor: subject.archived
                                      ? colors.success
                                      : colors.warning,
                                  },
                                ]}
                                onPress={() => {
                                  const isArchiving = !subject.archived;
                                  const action = isArchiving
                                    ? "archive"
                                    : "unarchive";
                                  const actionCapitalized =
                                    action.charAt(0).toUpperCase() +
                                    action.slice(1);

                                  const performArchive = () => {
                                    subjectsAPI
                                      .archiveSubject(
                                        token,
                                        subject._id,
                                        isArchiving
                                      )
                                      .then(() => {
                                        const message = `Subject ${actionCapitalized}d.\n\n${subject.name} has been ${action}d successfully.`;

                                        if (Platform.OS === "web") {
                                          window.alert(message);
                                        } else {
                                          Alert.alert(
                                            `Subject ${actionCapitalized}d`,
                                            message,
                                            [
                                              {
                                                text: "OK",
                                                onPress: () => {
                                                  // Update the subject in the local state
                                                  const updated =
                                                    mySubjects.map((s) =>
                                                      s._id === subject._id
                                                        ? {
                                                            ...s,
                                                            archived:
                                                              isArchiving,
                                                            archivedAt:
                                                              isArchiving
                                                                ? new Date()
                                                                : null,
                                                          }
                                                        : s
                                                    );
                                                  setMySubjects(updated);
                                                },
                                              },
                                            ]
                                          );
                                        }

                                        // Ensure state update also happens on web
                                        if (Platform.OS === "web") {
                                          const updated = mySubjects.map((s) =>
                                            s._id === subject._id
                                              ? {
                                                  ...s,
                                                  archived: isArchiving,
                                                  archivedAt: isArchiving
                                                    ? new Date()
                                                    : null,
                                                }
                                              : s
                                          );
                                          setMySubjects(updated);
                                        }
                                      })
                                      .catch((error) => {
                                        let message = `Failed to ${action} subject.`;
                                        if (error?.message) {
                                          if (
                                            error.message.includes(
                                              "Failed to fetch"
                                            )
                                          ) {
                                            message +=
                                              "\nNetwork or CORS issue. Please ensure the backend is running and PATCH/POST are allowed through CORS.";
                                          } else {
                                            message += `\n${error.message}`;
                                          }
                                        }
                                        if (Platform.OS === "web") {
                                          window.alert(
                                            `Error ${actionCapitalized}ing Subject\n\n${message}`
                                          );
                                        } else {
                                          Alert.alert(
                                            `Error ${actionCapitalized}ing Subject`,
                                            message
                                          );
                                        }
                                      });
                                  };

                                  const confirmMessage = isArchiving
                                    ? `Archive Subject?\n\nThis will hide "${subject.name}" from the regular view. You can restore it later by viewing archived subjects.\n\nContinue?`
                                    : `Restore Subject?\n\nThis will restore "${subject.name}" to active status and make it visible in the regular view.\n\nContinue?`;

                                  if (Platform.OS === "web") {
                                    const confirmed =
                                      window.confirm(confirmMessage);
                                    if (confirmed) performArchive();
                                  } else {
                                    Alert.alert(
                                      isArchiving
                                        ? "Archive Subject?"
                                        : "Restore Subject?",
                                      confirmMessage,
                                      [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                          text: actionCapitalized,
                                          style: "default",
                                          onPress: performArchive,
                                        },
                                      ]
                                    );
                                  }
                                }}
                              >
                                <Ionicons
                                  name={
                                    subject.archived ? "refresh" : "archive"
                                  }
                                  size={16}
                                  color={
                                    subject.archived
                                      ? colors.success
                                      : colors.warning
                                  }
                                />
                                <Text
                                  style={[
                                    styles.archiveSubjectButtonText,
                                    {
                                      color: subject.archived
                                        ? colors.success
                                        : colors.warning,
                                    },
                                  ]}
                                >
                                  {subject.archived ? "Restore" : "Archive"}
                                </Text>
                              </TouchableOpacity>

                              {/* Delete Subject Button */}
                              <TouchableOpacity
                                style={[
                                  styles.deleteSubjectButton,
                                  {
                                    backgroundColor: `${colors.error}20`,
                                    borderColor: colors.error,
                                  },
                                ]}
                                onPress={() => {
                                  // Cross-platform confirmation (Alert on native, window.confirm on web)
                                  const performDeletion = () => {
                                    subjectsAPI
                                      .deleteSubject(token, subject._id, {
                                        cascadeCyberQuests: true,
                                      })
                                      .then(() => {
                                        if (Platform.OS === "web") {
                                          // Basic browser alert fallback
                                          window.alert(
                                            `Subject Deleted.\n\n${subject.name} and its associated cyber quests were deleted.`
                                          );
                                        } else {
                                          Alert.alert(
                                            "Subject Deleted",
                                            `${subject.name} and its associated cyber quests were deleted.`,
                                            [
                                              {
                                                text: "OK",
                                                onPress: () => {
                                                  const updated =
                                                    mySubjects.filter(
                                                      (s) =>
                                                        s._id !== subject._id
                                                    );
                                                  setMySubjects(updated);
                                                },
                                              },
                                            ]
                                          );
                                        }
                                        // Ensure list refresh also happens on web (no button callback there)
                                        if (Platform.OS === "web") {
                                          const updated = mySubjects.filter(
                                            (s) => s._id !== subject._id
                                          );
                                          setMySubjects(updated);
                                        }
                                      })
                                      .catch((error) => {
                                        const message =
                                          error?.message ||
                                          "Failed to delete subject";
                                        if (Platform.OS === "web") {
                                          window.alert(
                                            `Error Deleting Subject\n\n${message}`
                                          );
                                        } else {
                                          Alert.alert("Error", message);
                                        }
                                      });
                                  };

                                  if (Platform.OS === "web") {
                                    const confirmed = window.confirm(
                                      `Delete Subject?\n\nThis will remove "${subject.name}" and all associated cyber quests. This action cannot be undone.\n\nContinue?`
                                    );
                                    if (confirmed) performDeletion();
                                  } else {
                                    Alert.alert(
                                      "Delete Subject?",
                                      `This will remove "${subject.name}" and all associated cyber quests. This action cannot be undone. Continue?`,
                                      [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                          text: "Delete",
                                          style: "destructive",
                                          onPress: performDeletion,
                                        },
                                      ]
                                    );
                                  }
                                }}
                              >
                                <Ionicons
                                  name="trash"
                                  size={16}
                                  color={colors.error}
                                />
                                <Text
                                  style={[
                                    styles.deleteSubjectButtonText,
                                    { color: colors.error },
                                  ]}
                                >
                                  Delete
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Subject Selection Modal */}
        <Modal
          visible={subjectModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSubjectModalVisible(false)}
        >
          <View style={styles.subjectSelectModalOverlay}>
            <View
              style={[
                styles.subjectSelectModalContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.subjectSelectModalHeader}>
                <Text
                  style={[
                    styles.subjectSelectModalTitle,
                    { color: colors.primary },
                  ]}
                >
                  Select a Subject
                </Text>
                <TouchableOpacity
                  onPress={() => setSubjectModalVisible(false)}
                  style={styles.subjectSelectCloseButton}
                >
                  <Ionicons name="close" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.subjectSelectList}>
                <TouchableOpacity
                  style={[
                    styles.subjectSelectItem,
                    !selectedSubjectId && styles.subjectSelectItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedSubjectId("");
                    setAssignedStudents([]);
                    setSubjectModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.subjectSelectItemText,
                      { color: colors.text },
                      !selectedSubjectId && {
                        color: colors.primary,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    -- None / Clear Selection --
                  </Text>
                  {!selectedSubjectId && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
                {mySubjects.map((section) => {
                  const isSelected = selectedSubjectId === section._id;
                  return (
                    <TouchableOpacity
                      key={section._id}
                      style={[
                        styles.subjectSelectItem,
                        isSelected && styles.subjectSelectItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedSubjectId(section._id);
                        setAssignedStudents([]);
                        setSubjectModalVisible(false);
                      }}
                    >
                      <View style={styles.subjectSelectItemInfo}>
                        <Text
                          style={[
                            styles.subjectSelectItemText,
                            { color: colors.text },
                            isSelected && {
                              color: colors.primary,
                              fontWeight: "600",
                            },
                          ]}
                        >
                          {section.name}
                        </Text>
                        {section.description ? (
                          <Text
                            style={[
                              styles.subjectSelectItemSub,
                              { color: colors.textSecondary },
                            ]}
                            numberOfLines={2}
                          >
                            {section.description}
                          </Text>
                        ) : null}
                        <Text
                          style={[
                            styles.subjectSelectItemMeta,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {section.students?.length || 0} student
                          {(section.students?.length || 0) === 1 ? "" : "s"}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Minimalistic Success/Error Toast Modal */}
        <Modal
          visible={showModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
          statusBarTranslucent={true}
        >
          <View style={styles.toastModalOverlay}>
            <View
              style={[
                styles.toastModalContainer,
                {
                  backgroundColor:
                    modalConfig.type === "success"
                      ? colors.success || "#4CAF50"
                      : colors.error || "#f44336",
                },
              ]}
            >
              <View style={styles.toastContent}>
                <Ionicons
                  name={
                    modalConfig.type === "success"
                      ? "checkmark-circle"
                      : "alert-circle"
                  }
                  size={24}
                  color="white"
                />
                <View style={styles.toastTextContainer}>
                  <Text style={styles.toastTitle}>{modalConfig.title}</Text>
                  <Text style={styles.toastMessage}>{modalConfig.message}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.toastButton}
                onPress={() => {
                  setShowModal(false);
                  modalConfig.onConfirm();
                }}
              >
                <Text style={styles.toastButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Available Students Modal */}
        <Modal
          visible={availableStudentsModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAvailableStudentsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <SafeAreaView
              style={[styles.modalContent, { backgroundColor: colors.surface }]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.primary }]}>
                  Available Students ({availableStudents.length})
                </Text>
                <TouchableOpacity
                  onPress={() => setAvailableStudentsModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={availableStudents}
                keyExtractor={(item) => item._id}
                style={styles.modalList}
                renderItem={({ item: student }) => (
                  <TouchableOpacity
                    style={styles.studentDropdownItem}
                    onPress={() => {
                      addStudent(student);
                    }}
                  >
                    <View
                      style={[
                        styles.studentAvatar,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.studentInitial,
                          { color: colors.background },
                        ]}
                      >
                        {(student.fullName || student.username || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.studentDetails}>
                      <Text
                        style={[styles.studentName, { color: colors.text }]}
                      >
                        {student.fullName || student.username || "Unknown User"}
                      </Text>
                      <Text
                        style={[
                          styles.studentEmail,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {student.email}
                      </Text>
                    </View>
                    <Ionicons
                      name="add-circle"
                      size={24}
                      color={colors.success}
                    />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.noResultsContainer}>
                    <Text
                      style={[
                        styles.noResultsText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      No available students found
                    </Text>
                  </View>
                }
              />
            </SafeAreaView>
          </View>
        </Modal>

        {/* Assigned Students Modal */}
        <Modal
          visible={assignedStudentsModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAssignedStudentsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <SafeAreaView
              style={[styles.modalContent, { backgroundColor: colors.surface }]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.primary }]}>
                  Currently Assigned Students ({assignedStudents.length})
                </Text>
                <TouchableOpacity
                  onPress={() => setAssignedStudentsModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={assignedStudents}
                keyExtractor={(item) => item._id}
                style={styles.modalList}
                onLayout={() =>
                  console.log(
                    "🔍 Assigned Students Modal FlatList - Data:",
                    assignedStudents
                  )
                }
                renderItem={({ item: student }) => (
                  <View style={styles.selectedStudentItem}>
                    <View style={styles.studentInfo}>
                      <View
                        style={[
                          styles.studentAvatar,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.studentInitial,
                            { color: colors.background },
                          ]}
                        >
                          {(student.fullName || student.username || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.studentDetails}>
                        <Text
                          style={[styles.studentName, { color: colors.text }]}
                        >
                          {student.fullName ||
                            student.username ||
                            "Unknown User"}
                        </Text>
                        <Text
                          style={[
                            styles.studentEmail,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {student.email}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => {
                        removeAssignedStudent(student._id);
                      }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={24}
                        color={colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyStudentList}>
                    <Ionicons
                      name="people-outline"
                      size={48}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.emptyText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      No students assigned to this subject
                    </Text>
                  </View>
                }
              />
            </SafeAreaView>
          </View>
        </Modal>

        {/* Edit Subject Modal */}
        <Modal
          visible={editModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeEditModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <View style={styles.editModalOverlay}>
              <View
                style={[
                  styles.editModalContent,
                  { backgroundColor: colors.surface },
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.primary }]}>
                    Edit Subject
                  </Text>
                  <TouchableOpacity
                    onPress={closeEditModal}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={24} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.editModalBody}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <View style={styles.inputGroup}>
                    <Text
                      style={[styles.inputLabel, { color: colors.primary }]}
                    >
                      Subject Name *
                    </Text>
                    <RNTextInput
                      value={editFormData.name}
                      onChangeText={(text) =>
                        setEditFormData({ ...editFormData, name: text })
                      }
                      placeholder="Enter subject name"
                      placeholderTextColor={colors.textSecondary}
                      style={[
                        styles.editTextInput,
                        {
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.primary,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text
                      style={[styles.inputLabel, { color: colors.primary }]}
                    >
                      Description
                    </Text>
                    <RNTextInput
                      value={editFormData.description}
                      onChangeText={(text) =>
                        setEditFormData({ ...editFormData, description: text })
                      }
                      placeholder="Enter subject description (optional)"
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      style={[
                        styles.editTextInput,
                        styles.editTextArea,
                        {
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.primary,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.editModalActions}>
                    <TouchableOpacity
                      style={[
                        styles.editModalButton,
                        styles.editModalCancelButton,
                        { borderColor: colors.textSecondary },
                      ]}
                      onPress={closeEditModal}
                    >
                      <Text
                        style={[
                          styles.editModalButtonText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.editModalButton,
                        styles.editModalSaveButton,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={updateSubject}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.background}
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="save"
                            size={20}
                            color={colors.background}
                          />
                          <Text
                            style={[
                              styles.editModalButtonText,
                              { color: colors.background },
                            ]}
                          >
                            Save Changes
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Instructors Management Modal */}
        <Modal
          visible={instructorsModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setInstructorsModalVisible(false)}
        >
          <View style={styles.instructorsModalOverlay}>
            <SafeAreaView
              style={[
                styles.instructorsModalContent,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.primary }]}>
                  Manage Instructors
                </Text>
                <TouchableOpacity
                  onPress={() => setInstructorsModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {selectedSubjectForInstructors && (
                <View style={styles.modalSubHeader}>
                  <Text style={[styles.modalSubTitle, { color: colors.text }]}>
                    Subject: {selectedSubjectForInstructors.name}
                  </Text>
                </View>
              )}

              <ScrollView
                style={styles.editModalBody}
                showsVerticalScrollIndicator={true}
              >
                {loadingInstructors ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text
                      style={[
                        styles.loadingText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Loading instructors...
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Current Instructors Section */}
                    <View style={styles.instructorsSection}>
                      <Text
                        style={[
                          styles.instructorsSectionTitle,
                          { color: colors.primary },
                        ]}
                      >
                        Current Instructors ({subjectInstructors.length})
                      </Text>
                      {subjectInstructors.length === 0 ? (
                        <View style={styles.emptyStateContainer}>
                          <Ionicons
                            name="people-outline"
                            size={48}
                            color={colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.emptyStateText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            No instructors assigned yet
                          </Text>
                        </View>
                      ) : (
                        <ScrollView
                          style={styles.instructorsListContainer}
                          showsVerticalScrollIndicator={true}
                          nestedScrollEnabled={true}
                        >
                          {subjectInstructors.map((instructor) => (
                            <View
                              key={instructor._id}
                              style={[
                                styles.instructorItem,
                                {
                                  backgroundColor: colors.background,
                                  borderColor: instructor.isPrimary
                                    ? colors.primary
                                    : colors.border,
                                },
                              ]}
                            >
                              <View style={styles.instructorInfo}>
                                <View style={styles.instructorIconContainer}>
                                  <Ionicons
                                    name={
                                      instructor.isPrimary
                                        ? "shield-checkmark"
                                        : "person"
                                    }
                                    size={24}
                                    color={
                                      instructor.isPrimary
                                        ? colors.primary
                                        : colors.info || "#2196F3"
                                    }
                                  />
                                </View>
                                <View style={styles.instructorDetails}>
                                  <Text
                                    style={[
                                      styles.instructorName,
                                      { color: colors.text },
                                    ]}
                                  >
                                    {instructor.fullName || instructor.username}
                                    {instructor.isPrimary && (
                                      <Text
                                        style={[
                                          styles.primaryBadge,
                                          { color: colors.primary },
                                        ]}
                                      >
                                        {" "}
                                        (Primary)
                                      </Text>
                                    )}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.instructorEmail,
                                      { color: colors.textSecondary },
                                    ]}
                                  >
                                    {instructor.email}
                                  </Text>
                                </View>
                              </View>
                              <TouchableOpacity
                                style={[
                                  styles.removeInstructorButton,
                                  {
                                    backgroundColor: `${colors.error}20`,
                                    borderColor: colors.error,
                                  },
                                ]}
                                onPress={() =>
                                  removeInstructorFromSubject(
                                    instructor._id,
                                    instructor.isPrimary
                                  )
                                }
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={18}
                                  color={colors.error}
                                />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </ScrollView>
                      )}
                    </View>

                    {/* Add Instructor Section */}
                    <View style={styles.instructorsSection}>
                      <Text
                        style={[
                          styles.instructorsSectionTitle,
                          { color: colors.primary },
                        ]}
                      >
                        Add Instructor
                      </Text>

                      {/* Search Input */}
                      <View style={styles.instructorSearchContainer}>
                        <Ionicons
                          name="search"
                          size={20}
                          color={colors.textSecondary}
                          style={styles.searchIcon}
                        />
                        <TextInput
                          value={instructorSearchQuery}
                          onChangeText={setInstructorSearchQuery}
                          placeholder="Search by name or email..."
                          placeholderTextColor={colors.textSecondary}
                          style={[
                            styles.instructorSearchInput,
                            {
                              backgroundColor: colors.background,
                              color: colors.text,
                              borderColor: colors.border,
                            },
                          ]}
                        />
                        {instructorSearchQuery.length > 0 && (
                          <TouchableOpacity
                            onPress={() => setInstructorSearchQuery("")}
                            style={styles.clearSearchButton}
                          >
                            <Ionicons
                              name="close-circle"
                              size={20}
                              color={colors.textSecondary}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                      {availableInstructors.length === 0 ? (
                        <View style={styles.emptyStateContainer}>
                          <Text
                            style={[
                              styles.emptyStateText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            No other instructors available
                          </Text>
                        </View>
                      ) : (
                        (() => {
                          const filteredInstructors = availableInstructors
                            .filter(
                              (instructor) =>
                                !subjectInstructors.some(
                                  (si) => si._id === instructor._id
                                )
                            )
                            .filter((instructor) => {
                              if (!instructorSearchQuery.trim()) return true;
                              const searchLower =
                                instructorSearchQuery.toLowerCase();
                              const name = (
                                instructor.fullName ||
                                instructor.username ||
                                ""
                              ).toLowerCase();
                              const email = (
                                instructor.email || ""
                              ).toLowerCase();
                              return (
                                name.includes(searchLower) ||
                                email.includes(searchLower)
                              );
                            });

                          if (
                            filteredInstructors.length === 0 &&
                            instructorSearchQuery.trim()
                          ) {
                            return (
                              <View style={styles.emptyStateContainer}>
                                <Ionicons
                                  name="search-outline"
                                  size={48}
                                  color={colors.textSecondary}
                                />
                                <Text
                                  style={[
                                    styles.emptyStateText,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  No instructors found matching "
                                  {instructorSearchQuery}"
                                </Text>
                              </View>
                            );
                          }

                          return (
                            <ScrollView
                              style={styles.instructorsListContainer}
                              showsVerticalScrollIndicator={true}
                              nestedScrollEnabled={true}
                            >
                              {filteredInstructors.map((instructor) => (
                                <View
                                  key={instructor._id}
                                  style={[
                                    styles.instructorItem,
                                    {
                                      backgroundColor: colors.background,
                                      borderColor: colors.border,
                                    },
                                  ]}
                                >
                                  <View style={styles.instructorInfo}>
                                    <View
                                      style={styles.instructorIconContainer}
                                    >
                                      <Ionicons
                                        name="person-add-outline"
                                        size={24}
                                        color={colors.textSecondary}
                                      />
                                    </View>
                                    <View style={styles.instructorDetails}>
                                      <Text
                                        style={[
                                          styles.instructorName,
                                          { color: colors.text },
                                        ]}
                                      >
                                        {instructor.fullName ||
                                          instructor.username}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.instructorEmail,
                                          { color: colors.textSecondary },
                                        ]}
                                      >
                                        {instructor.email}
                                      </Text>
                                    </View>
                                  </View>
                                  <TouchableOpacity
                                    style={[
                                      styles.addInstructorButton,
                                      {
                                        backgroundColor: `${colors.success}20`,
                                        borderColor: colors.success,
                                      },
                                    ]}
                                    onPress={() =>
                                      addInstructorToSubject(instructor._id)
                                    }
                                  >
                                    <Ionicons
                                      name="add"
                                      size={20}
                                      color={colors.success}
                                    />
                                    <Text
                                      style={[
                                        styles.addInstructorButtonText,
                                        { color: colors.success },
                                      ]}
                                    >
                                      Add
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </ScrollView>
                          );
                        })()
                      )}
                    </View>
                  </>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>
      </View>
    );
  };

  const renderContent = () => {
    console.log("🔍 renderContent - activeCreator:", activeCreator);
    console.log("🔍 renderContent - isEditMode:", isEditMode);

    // Show the three options if no creator is selected
    if (!activeCreator) {
      console.log("🔍 renderContent - Showing create options");
      return renderCreateOptions();
    }

    console.log("🔍 renderContent - Showing creator for:", activeCreator);
    return (
      <Animated.View
        style={[
          styles.formWrapper,
          {
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
            opacity: fadeAnim,
          },
        ]}
      >
        {activeCreator === "cyber-quest-map" && (
          <CyberQuestCreator
            isCreateMode={!isEditMode}
            useCompactHeader={Platform.OS === "android"}
            menuControlRef={questMenuControlRef}
          />
        )}
        {activeCreator === "section-management" && (
          <SectionCreator useCompactHeader={Platform.OS === "android"} />
        )}
      </Animated.View>
    );
  };

  return (
    <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.pageWrapper,
            Platform.OS === "android" && { paddingTop: Math.max(insets.top, 12) },
          ]}
        >
            {/* Header */}
            {(() => {
              const showCompactCreatorHeader =
                Platform.OS === "android" && Boolean(activeCreator);
              const shouldShowBackButton =
                Boolean(activeCreator) ||
                openedFromInstructorTools ||
                openedFromIndex;
              const compactCreatorTitle =
                activeCreator === "cyber-quest-map"
                  ? "Cyber Quest Map"
                  : activeCreator === "section-management"
                  ? "Course Management"
                  : "";

              return (
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={styles.headerTitleRow}>
                <View style={styles.headerLeftSlot}>
                  {shouldShowBackButton ? (
                    <TouchableOpacity
                      onPress={handleCreatorBack}
                      style={styles.headerBackButton}
                    >
                      <Ionicons
                        name="arrow-back"
                        size={22}
                        color="#000000"
                      />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.headerBackSpacer} />
                  )}
                </View>


                {showCompactCreatorHeader ? (
                  activeCreator === "cyber-quest-map" ? (
                    <View style={styles.headerCompactQuestRow}>
                      <Text
                        style={[
                          styles.headerCompactTitle,
                          { color: colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {compactCreatorTitle}
                      </Text>
                      <TouchableOpacity
                        id="cq-import-export-header-btn"
                        style={[
                          styles.menuButton,
                          styles.headerMenuButton,
                          { borderColor: colors.border },
                        ]}
                        onPress={() =>
                          questMenuControlRef.current?.toggleMenu?.()
                        }
                      >
                        <Ionicons
                          name="ellipsis-vertical"
                          size={20}
                          color={highlightColor}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.headerCompactTitle,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {compactCreatorTitle}
                    </Text>
                  )
                ) : (
                  <Text
                    style={[styles.headerTitle, { color: "#000000" }]}
                  >
                    🎮 Creator&apos;s Workshop
                  </Text>
                )}

                <View style={styles.headerRightSlot}>
                  <View style={styles.headerBackSpacer} />
                </View>
              </View>
              {!showCompactCreatorHeader && (
                <Text
                  style={[styles.headerSubtitle, { color: colors.textSecondary }]}
                >
                  Welcome back, {user?.username || "Instructor"}! Ready to craft
                  amazing content?
                </Text>
              )}
            </View>
              );
            })()}
            {/* Content */}
            {activeCreator ? (
              <View style={styles.outerScrollContainer}>{renderContent()}</View>
            ) : (
              <ScrollView
                style={styles.outerScrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                persistentScrollbar={false}
                keyboardShouldPersistTaps="handled"
              >
                {renderContent()}
              </ScrollView>
            )}
          </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  backButton1: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2f5d50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  floatingAddButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "fixed", // Use fixed positioning for web
    bottom: 24,
    right: 24,
    backgroundColor: "#2f5d50",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    gap: 8,
    zIndex: 1000, // High z-index to stay on top
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    ...Platform.select({
      web: {
        position: "fixed", // Fixed position on web
        bottom: "24px",
        right: "24px",
        boxShadow: "0px 3px 8px rgba(0, 0, 0, 0.25)",
        transition: "transform 0.2s ease-in-out, background-color 0.2s ease",
        ":hover": {
          transform: "translateY(-3px)",
          backgroundColor: "#264b40", // Slightly darker on hover
        },
      },
      default: {
        position: "absolute", // Use absolute for React Native
        bottom: 70, // Higher up on mobile to avoid bottom nav bar
      },
    }),
  },
  floatingAddButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  pageWrapper: {
    flex: 1,
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    paddingHorizontal: Platform.OS === "android" ? 14 : 42,
    paddingBottom: 32,
    ...(typeof window !== "undefined" &&
    window.innerWidth < 600 &&
    Platform.OS !== "android"
      ? { paddingHorizontal: 16 }
      : {}),
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingTop: Platform.OS === "ios" ? 34 : 18,
    alignItems: "center",
    borderBottomWidth: 1,
    // borderBottomColor will be set dynamically
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    width: "100%",
  },
  headerBackButton: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLeftSlot: {
    width: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerRightSlot: {
    width: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  headerBackSpacer: {
    width: 34,
    height: 34,
  },
  headerTitlePlaceholder: {
    flex: 1,
  },
  headerCompactTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.2,
    textAlign: "left",
    marginLeft: 10,
  },
  headerCompactQuestRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 10,
  },
  headerMenuButton: {
    marginLeft: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    // color will be set dynamically
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    // color will be set dynamically
    textAlign: "center",
    opacity: 0.8,
  },
  outerScrollContainer: {
    flex: 1,
    ...(Platform.OS === "web" && {
      overflow: "hidden",
    }),
  },
    scrollContainer: {
    flex: 1,
    ...(Platform.OS === "web" && {
      overflowY: "auto",
      scrollbarWidth: "thin",
    }),
    },

  scrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  optionsContainer: {
    gap: 20,
  },
  creatorCard: {
    borderRadius: 18,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  disabledCard: {
    opacity: 0.6,
  },
  cardGradient: {
    borderRadius: 18,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 116,
  },
  cardContent: {
    flex: 1,
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    // backgroundColor will be set dynamically
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: "800",
    // color will be set dynamically
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  cardDescription: {
    fontSize: 14,
    fontWeight: "500",
    // color will be set dynamically
    lineHeight: 21,
  },
  cardArrow: {
    marginLeft: 16,
  },
  formWrapper: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    // borderBottomColor will be set dynamically
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2f5d50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  cancelButton: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff1f1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#ff7b7b",
  },
  cancelButtonText: {
    color: "#b30000",
    fontWeight: "600",
    fontSize: 14,
  },
  formTitle: {
    fontSize: 25,
    fontWeight: "800",
    // color will be set dynamically
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  createNewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d9f5ee",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2acde6",
  },
  createNewText: {
    // color will be set dynamically
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 4,
  },
   formScroll: {
    flex: 1,
    paddingHorizontal: 4,
    ...(Platform.OS === "web" && {
      overflowY: "auto",
      scrollbarWidth: "thin",
      paddingRight: 6,
    }),
   },
    webScrollableForm: {
      ...(Platform.OS === "web" && {
        maxHeight: "calc(100vh - 260px)",
      }),
    },
    webScrollableManageSubjects: {
      ...(Platform.OS === "web" && {
        maxHeight: "calc(100vh - 320px)",
        paddingRight: 6,
      }),
    },
    webScrollableAssignStudents: {
      ...(Platform.OS === "web" && {
        maxHeight: "calc(100vh - 320px)",
        paddingRight: 6,
      }),
    },
  inputGroup: {
    marginBottom: Platform.OS === "web" ? 24 : 20,
  },
  quizBankCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: Platform.OS === "web" ? 22 : 18,
  },
  quizBankHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  quizBankTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  quizBankSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  quizBankActionsRow: {
    gap: 8,
  },
  quizBankActionButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  quizBankActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: Platform.OS === "web" ? 16 : 15,
    fontWeight: "700",
    // color will be set dynamically
    marginBottom: 10,
    letterSpacing: 0.15,
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "transparent",
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  },
  contextMenu: {
    position: "absolute",
    top: 42,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 200,
    zIndex: 1000,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    ...(Platform.OS === "web" ? { cursor: "default" } : {}),
  },
  contextMenuHeader: {
    top: 48,
    right: 0,
  },
  contextMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  },
  contextMenuText: {
    fontSize: 14,
    fontWeight: "500",
  },
  textInput: {
    // backgroundColor will be handled by react-native-paper theme
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#D0DBE8",
  },
  textInputContent: {
    paddingTop: 12,
    paddingLeft: 12,
    textAlignVertical: "top",
  },
  textArea: {
    minHeight: 100,
  },
  codeArea: {
    minHeight: 150,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  difficultyContainer: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  difficultyButton: {
    flex: 1,
    minWidth: 100,
    padding: 13,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    // backgroundColor and borderColor will be set dynamically
  },
  selectedDifficulty: {
    // backgroundColor will be set dynamically
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: "600",
    // color will be set dynamically
  },
  levelDisplay: {
    // backgroundColor and borderColor will be set dynamically
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  levelText: {
    fontSize: 18,
    fontWeight: "bold",
    // color will be set dynamically
  },
  levelDescription: {
    fontSize: 14,
    // color will be set dynamically
    opacity: 0.9,
    lineHeight: 20,
  },
  questionTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  questionTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 2,
    borderColor: "transparent",
    minWidth: 120,
  },
  selectedQuestionType: {
    borderColor: CREATOR_COLORS.coral,
    backgroundColor: "rgba(255, 127, 80, 0.1)",
  },
  questionTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: CREATOR_COLORS.white,
    marginLeft: 8,
  },
  optionContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  optionInput: {
    flex: 1,
    marginRight: 12,
  },
  correctButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCorrect: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    borderRadius: 20,
  },
  createButton: {
    marginTop: 24,
    borderRadius: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    width: "100%",
    minWidth: 0,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    // color now set dynamically via inline styles
    flexShrink: 1,
    textAlign: "center",
  },
  // Subject Code Styles
  subjectCodeContainer: {
    marginTop: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  subjectCodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  subjectCodeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  subjectCodeBox: {
    backgroundColor: CREATOR_COLORS.darkBlue,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  subjectCodeText: {
    fontSize: 20,
    fontWeight: "bold",
    color: CREATOR_COLORS.white,
    letterSpacing: 2,
  },
  copyButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#14B8A6",
  },
  subjectCodeHelp: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    fontStyle: "italic",
  },
  // Student List Styles
  studentList: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  studentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#5fd2cd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  studentInitial: {
    fontSize: 16,
    fontWeight: "bold",
    color: CREATOR_COLORS.navyBlue,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: CREATOR_COLORS.white,
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 14,
    color: CREATOR_COLORS.warmBeige,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  activeStatus: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
  },
  pendingStatus: {
    backgroundColor: "rgba(255, 152, 0, 0.2)",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: CREATOR_COLORS.white,
  },
  removeButton: {
    padding: 4,
  },
  emptyStudentList: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: CREATOR_COLORS.warmBeige,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: CREATOR_COLORS.warmBeige,
    opacity: 0.7,
    textAlign: "center",
    marginTop: 4,
  },
  // Section Creator Specific Styles
  studentSearchContainer: {
    position: "relative",
    marginBottom: 16,
  },
  studentDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: CREATOR_COLORS.darkBlue,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  availableStudentsContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    padding: 18,
    marginTop: 16,
    maxHeight: 400,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  availableStudentsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 16,
  },
  availableStudentsList: {
    height: 300,
  },
  studentDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  noResultsSubtext: {
    fontSize: 12,
    color: CREATOR_COLORS.warmBeige,
    opacity: 0.6,
    textAlign: "center",
    marginTop: 4,
  },
  selectedStudentsList: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    height: 300,
  },
  selectedStudentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  noResultsContainer: {
    padding: 16,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 14,
    color: CREATOR_COLORS.warmBeige,
    opacity: 0.7,
  },
  // Additional Loading and State Styles
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: CREATOR_COLORS.warmBeige,
  },
  disabledButton: {
    opacity: 0.6,
  },
  noStudentsContainer: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    marginTop: 10,
  },
  noStudentsText: {
    fontSize: 16,
    fontWeight: "600",
    color: CREATOR_COLORS.warmBeige,
    textAlign: "center",
  },
  noStudentsSubtext: {
    fontSize: 14,
    color: CREATOR_COLORS.warmBeige,
    opacity: 0.7,
    textAlign: "center",
    marginTop: 4,
  },
  // Step Indicator Styles
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    marginBottom: 20,
  },
  stepContainer: {
    alignItems: "center",
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  activeStep: {
    backgroundColor: "#5fd2cd",
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
  },
  activeStepText: {
    color: CREATOR_COLORS.navyBlue,
  },
  stepLabel: {
    fontSize: 12,
    color: "#0F172A",
    textAlign: "center",
  },
  activeStepLabel: {
    color: "#0F172A",
    fontWeight: "600",
  },
  stepConnector: {
    width: 50,
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 10,
  },
  stepContent: {
    flex: 1,
  },
  // Section Selection Styles
  sectionDropdownContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 8,
    maxHeight: 200,
  },
  sectionList: {
    gap: 8,
  },
  sectionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedSectionItem: {
    borderColor: CREATOR_COLORS.success,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontSize: 16,
    fontWeight: "600",
    color: CREATOR_COLORS.white,
    marginBottom: 4,
  },
  sectionMeta: {
    fontSize: 12,
    color: CREATOR_COLORS.warmBeige,
    opacity: 0.8,
  },
  noSectionsContainer: {
    padding: 20,
    alignItems: "center",
  },
  noSectionsText: {
    fontSize: 16,
    color: CREATOR_COLORS.warmBeige,
    textAlign: "center",
    marginBottom: 12,
  },
  createFirstSectionButton: {
    backgroundColor: "#2acde6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createFirstSectionText: {
    fontSize: 14,
    fontWeight: "600",
    color: CREATOR_COLORS.navyBlue,
  },
  // Subject Management Tabs
  sectionTabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  sectionTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  activeSectionTab: {
    backgroundColor: "#2f5d50",
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  activeSectionTabText: {
    color: "#FFFFFF",
  },
  divisionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    paddingBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: "rgba(148, 163, 184, 0.45)",
    gap: 12,
  },
  divisionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0F172A",
    flex: 1,
  },
  dropdownContainer: {
    marginBottom: 20,
    position: "relative",
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderColor: "rgba(148, 163, 184, 0.35)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  dropdownText: {
    fontSize: 16,
    // color now set dynamically via inline styles
    flex: 1,
  },
  sectionDropdownList: {
    // backgroundColor and borderColor now set dynamically via inline styles
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  sectionDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    // borderBottomWidth and borderBottomColor now set dynamically via inline styles
  },
  sectionDropdownItemSelected: {
    // backgroundColor now set dynamically via inline styles
  },
  sectionDropdownItemText: {
    fontSize: 16,
    // color now set dynamically via inline styles
    flex: 1,
  },
  sectionDropdownItemTextSelected: {
    // color and fontWeight now set dynamically via inline styles
    fontWeight: "600",
  },
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  // Subject Modal Styles
    modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    },
    subjectModalContainer: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? 560 : 720,
    maxHeight: "80%",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    },
  subjectModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  subjectModalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  subjectModalBody: {
    flexGrow: 1,
    flexShrink: 1,
  },
  subjectListContent: {
    paddingBottom: 12,
  },
  subjectListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  subjectListItemText: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  // Navigation Buttons
  skipButton: {
    marginTop: 16,
    padding: 12,
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 16,
    color: CREATOR_COLORS.coral,
    fontWeight: "600",
  },
  backToStepButton: {
    marginTop: 20,
    padding: 12,
    alignItems: "center",
  },
  backToStepText: {
    fontSize: 16,
    color: CREATOR_COLORS.warmBeige,
    fontWeight: "600",
  },
  // Cyber Quest Map Styles
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    // backgroundColor now set dynamically via inline styles
    padding: 8,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    // color now set dynamically via inline styles
    fontSize: 12,
    fontWeight: "600",
  },
  questionContainer: {
    // backgroundColor and borderColor now set dynamically via inline styles
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: "600",
    // color now set dynamically via inline styles
  },
  removeQuestionButton: {
    padding: 4,
    backgroundColor: "rgba(244, 67, 54, 0.2)",
    borderRadius: 4,
  },
  questionInput: {
    marginBottom: 16,
    minHeight: 80,
  },
  choicesContainer: {
    gap: 8,
  },
  choicesLabel: {
    fontSize: 14,
    fontWeight: "600",
    // color now set dynamically via inline styles
    marginBottom: 8,
  },
  choiceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  correctIndicator: {
    padding: 4,
  },
  correctIndicatorSelected: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    borderRadius: 12,
  },
  choiceInput: {
    flex: 1,
    minHeight: 40,
  },
  removeChoiceButton: {
    padding: 4,
    backgroundColor: "rgba(244, 67, 54, 0.2)",
    borderRadius: 4,
  },
  addChoiceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    backgroundColor: "#92eacc",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2acde6",
    borderStyle: "dashed",
    gap: 4,
    marginTop: 4,
  },
  addChoiceText: {
    color: "#4a7c59",
    fontSize: 12,
    fontWeight: "500",
  },
  categorySelector: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  categorySelectorButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 30,
  },
  categorySelectorButtonSelected: {
    backgroundColor: "rgba(25, 118, 210, 0.2)",
    borderColor: "#1976d2",
  },
  categorySelectorText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Question Type Selection Styles
    questionTypeModal: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: "#2acde6",
    },
    questionTypeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4a7c59",
    textAlign: "center",
    marginBottom: 20,
  },
  questionTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
    questionTypeCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    minHeight: 120,
    justifyContent: "center",
    },
    questionTypeIcon: {
    marginBottom: 8,
  },
    questionTypeLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: CREATOR_COLORS.navyBlue,
    textAlign: "center",
    marginBottom: 4,
    },
    questionTypeDescription: {
    fontSize: 12,
    color: "#475569",
    textAlign: "center",
    lineHeight: 16,
    },
  cancelQuestionType: {
    backgroundColor: "rgba(244, 67, 54, 0.2)",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center",
  },
  cancelQuestionTypeText: {
    color: CREATOR_COLORS.error,
    fontSize: 14,
    fontWeight: "bold",
  },

  // Question Header with Badge
  questionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  questionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  questionTypeBadgeText: {
    color: CREATOR_COLORS.navyBlue,
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  // Code Missing Styles
  codeMissingContainer: {
    gap: 12,
  },
  codeInput: {
    fontFamily: "monospace",
    fontSize: 14,
    minHeight: 100,
  },

  // Fill in Blanks Styles
  fillBlanksContainer: {
    gap: 12,
  },
  blankNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4a7c59",
    minWidth: 30,
  },

  // Code Ordering Styles
  codeOrderingContainer: {
    gap: 12,
  },

  validationMessage: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "left",
    marginVertical: 12,
    fontWeight: "600",
    lineHeight: 20,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.55)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: CREATOR_COLORS.white,
    borderRadius: 12,
    minWidth: 300,
    maxWidth: 400,
    marginHorizontal: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Platform.OS === "web" ? 20 : 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    gap: 8,
  },
  modalTitle: {
    // color now set dynamically via inline styles
    fontSize: Platform.OS === "web" ? 20 : 18,
    fontWeight: "600",
  },
  modalBody: {
    padding: 16,
  },
  modalMessage: {
    // color now set dynamically via inline styles
    fontSize: 16,
    lineHeight: 22,
  },
  modalFooter: {
    padding: 16,
    alignItems: "center",
  },
  modalActionsContainer: {
    flexDirection: "column",
    gap: 8,
    width: "100%",
  },
  modalActionButton: {
    width: "100%",
    marginBottom: 8,
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  modalButtonText: {
    // color now set dynamically via inline styles
    fontSize: 16,
    fontWeight: "600",
  },

  // Info container styles
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#92eacc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: "#2acde6",
  },
  infoText: {
    fontSize: 14,
    color: "#fffff",
    flex: 1,
    lineHeight: 20,
  },

  // My Subjects styles
  noSubjectsContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noSubjectsText: {
    fontSize: 18,
    fontWeight: "600",
    color: CREATOR_COLORS.warmBeige,
    marginTop: 16,
  },
  noSubjectsSubtext: {
    fontSize: 14,
    color: CREATOR_COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  createFirstButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2acde6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  createFirstButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: CREATOR_COLORS.navyBlue,
  },
  subjectsList: {
    gap: 16,
  },
  subjectCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2acde6",
  },
  subjectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  subjectInfo: {
    flex: 1,
    marginRight: 16,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: "600",
    color: CREATOR_COLORS.white,
    marginBottom: 4,
  },
  subjectDescription: {
    fontSize: 14,
    color: CREATOR_COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  subjectStudents: {
    fontSize: 12,
    color: CREATOR_COLORS.lightBlue,
    fontWeight: "500",
  },
  subjectActions: {
    alignItems: "flex-end",
  },
  subjectCodeDisplay: {
    alignItems: "center",
  },
  codeLabel: {
    fontSize: 12,
    color: CREATOR_COLORS.warmBeige,
    marginBottom: 4,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CREATOR_COLORS.darkBlue,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#2acde6",
    gap: 8,
  },
  codeText: {
    fontSize: 16,
    fontWeight: "bold",
    color: CREATOR_COLORS.white,
    letterSpacing: 1,
  },
  copyCodeButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: "#2acde6",
  },
  subjectActionButtons: {
    flexDirection: "column",
    marginTop: 8,
    gap: 8,
  },
  editSubjectButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  editSubjectButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  instructorsSubjectButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  instructorsSubjectButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deleteSubjectButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  deleteSubjectButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  archiveSubjectButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  archiveSubjectButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  archiveFilterContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    marginBottom: 8,
  },
  archiveToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  archiveToggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  subjectNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  archivedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    gap: 3,
  },
  archivedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  // Examples container styles
  examplesContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  examplesTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  exampleItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  exampleLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  // Subject selection modal styles
  subjectSelectModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  subjectSelectModalContainer: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "80%",
    borderRadius: 16,
    paddingVertical: 8,
    overflow: "hidden",
  },
  subjectSelectModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  subjectSelectModalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  subjectSelectCloseButton: {
    padding: 4,
    borderRadius: 16,
  },
  subjectSelectList: {
    paddingHorizontal: 12,
  },
  subjectSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 10,
    marginVertical: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    gap: 12,
  },
  subjectSelectItemSelected: {
    backgroundColor: "#92eacc",
    borderWidth: 1,
    borderColor: "#2acde6",
  },
  subjectSelectItemInfo: {
    flex: 1,
  },
  subjectSelectItemText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  subjectSelectItemSub: {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 4,
  },
  subjectSelectItemMeta: {
    fontSize: 11,
    opacity: 0.6,
  },
  // View More Button Styles
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 8,
  },
  // Modal Styles

  modalContent: {
    width:
      Platform.OS === "web"
        ? Math.min(Dimensions.get("window").width * 0.9, 600)
        : "90%",
    maxWidth: Platform.OS === "web" ? 600 : undefined,
    height:
      Platform.OS === "web"
        ? Math.min(Dimensions.get("window").height * 0.85, 700)
        : "80%",
    maxHeight: Platform.OS === "web" ? 700 : undefined,
    borderRadius: 12,
    paddingVertical: 20,
  },

  modalCloseButton: {
    padding: 4,
  },
  modalList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Edit modal styles
  editModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Platform.OS === "web" ? 20 : 10,
  },
  editModalContent: {
    width:
      Platform.OS === "web"
        ? Math.min(Dimensions.get("window").width * 0.9, 600)
        : "95%",
    maxWidth: 600,
    maxHeight: Platform.OS === "web" ? "85%" : "90%",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    ...(Platform.OS !== "web" && {
      minHeight: 400,
    }),
  },
  editModalBody: {
    padding: Platform.OS === "web" ? 24 : 20,
    flexGrow: 1,
    flexShrink: 1,
  },
  editModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  editModalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Platform.OS === "web" ? 14 : 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  editModalCancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  editModalSaveButton: {
    backgroundColor: "#2acde6",
  },
  editModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  editTextInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "web" ? 14 : 12,
    fontSize: 16,
    fontFamily: Platform.select({
      ios: "System",
      android: "Roboto",
      default: "System",
    }),
  },
  editTextArea: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: "top",
  },

  // Instructors Modal Styles
  instructorsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Platform.OS === "web" ? 20 : 10,
  },
  instructorsModalContent: {
    width:
      Platform.OS === "web"
        ? Math.min(Dimensions.get("window").width * 0.9, 700)
        : "95%",
    maxWidth: 700,
    height:
      Platform.OS === "web"
        ? Math.min(Dimensions.get("window").height * 0.85, 800)
        : "90%",
    maxHeight: 800,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalSubHeader: {
    paddingHorizontal: Platform.OS === "web" ? 24 : 16,
    paddingVertical: Platform.OS === "web" ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalSubTitle: {
    fontSize: Platform.OS === "web" ? 15 : 14,
    fontWeight: "500",
  },
  instructorsSection: {
    marginBottom: Platform.OS === "web" ? 28 : 20,
  },
  instructorsListContainer: {
    maxHeight: Platform.OS === "web" ? 300 : 250,
  },
  instructorsSectionTitle: {
    fontSize: Platform.OS === "web" ? 18 : 16,
    fontWeight: "700",
    marginBottom: Platform.OS === "web" ? 16 : 12,
  },
  instructorSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Platform.OS === "web" ? 16 : 12,
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    zIndex: 1,
  },
  instructorSearchInput: {
    flex: 1,
    paddingVertical: Platform.OS === "web" ? 12 : 10,
    paddingLeft: 40,
    paddingRight: 40,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: Platform.OS === "web" ? 15 : 14,
  },
  clearSearchButton: {
    position: "absolute",
    right: 12,
    zIndex: 1,
  },
  instructorItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Platform.OS === "web" ? 16 : 12,
    marginBottom: Platform.OS === "web" ? 12 : 8,
    borderRadius: Platform.OS === "web" ? 10 : 8,
    borderWidth: 1,
  },
  instructorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0, // Allows text to truncate properly
  },
  instructorIconContainer: {
    width: Platform.OS === "web" ? 48 : 40,
    height: Platform.OS === "web" ? 48 : 40,
    borderRadius: Platform.OS === "web" ? 24 : 20,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Platform.OS === "web" ? 16 : 12,
    flexShrink: 0, // Prevent icon from shrinking
  },
  instructorDetails: {
    flex: 1,
    minWidth: 0, // Allows text to truncate
    marginRight: 8,
  },
  instructorName: {
    fontSize: Platform.OS === "web" ? 15 : 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  instructorEmail: {
    fontSize: Platform.OS === "web" ? 13 : 12,
  },
  primaryBadge: {
    fontSize: Platform.OS === "web" ? 13 : 12,
    fontWeight: "700",
  },
  removeInstructorButton: {
    padding: Platform.OS === "web" ? 10 : 8,
    borderRadius: Platform.OS === "web" ? 8 : 6,
    borderWidth: 1,
    flexShrink: 0, // Prevent button from shrinking
  },
  addInstructorButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Platform.OS === "web" ? 8 : 6,
    paddingHorizontal: Platform.OS === "web" ? 12 : 10,
    borderRadius: Platform.OS === "web" ? 8 : 6,
    borderWidth: 1,
    gap: 4,
    flexShrink: 0, // Prevent button from shrinking
  },
  addInstructorButtonText: {
    fontSize: Platform.OS === "web" ? 13 : 12,
    fontWeight: "600",
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Platform.OS === "web" ? 48 : 32,
  },
  emptyStateText: {
    fontSize: Platform.OS === "web" ? 15 : 14,
    marginTop: Platform.OS === "web" ? 12 : 8,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Platform.OS === "web" ? 60 : 40,
  },
  loadingText: {
    fontSize: Platform.OS === "web" ? 15 : 14,
    marginTop: Platform.OS === "web" ? 16 : 12,
  },

  // Minimalistic Toast Modal styles
  toastModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    elevation: 10,
  },
  toastModalContainer: {
    minWidth: 300,
    maxWidth: 400,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 15,
    overflow: "hidden",
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 20,
    gap: 12,
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  toastMessage: {
    color: "white",
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  toastButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  toastButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  // Instructions Modal Styles
  instructionsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  instructionsModalContainer: {
    width: "100%",
    maxWidth: 700,
    maxHeight: "90%",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  instructionsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  instructionsModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
  },
  instructionsCloseButton: {
    padding: 4,
  },
    instructionsModalContent: {
    padding: 20,
    ...(Platform.OS === 'web' && {
      '::-webkit-scrollbar': {
        width: '8px',
      },
      '::-webkit-scrollbar-track': {
        background: 'rgba(0,0,0,0.1)',
        borderRadius: '4px',
      },
      '::-webkit-scrollbar-thumb': {
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '4px',
      },
      '::-webkit-scrollbar-thumb:hover': {
        background: 'rgba(0,0,0,0.5)',
      },
      scrollbarWidth: 'auto',
      scrollbarColor: 'rgba(0,0,0,0.3) rgba(0,0,0,0.1)',
    }),
  },
  instructionsSection: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  instructionsBold: {
    fontWeight: "bold",
    fontSize: 16,
  },
  instructionsCode: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    padding: 2,
    borderRadius: 4,
  },
});
