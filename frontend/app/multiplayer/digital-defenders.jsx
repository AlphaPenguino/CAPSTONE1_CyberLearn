import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
  Vibration,
  Platform,
  TextInput,
  ImageBackground,
} from "react-native";
// Removed unused AsyncStorage import
// import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import COLORS from "@/constants/custom-colors";
import digitalDefendersSocket from "@/services/digitalDefendersSocket";
import digitalDefendersAPI from "@/services/digitalDefendersAPI";
import { useAuthStore } from "@/store/authStore";
import { useSettings } from "@/contexts/SettingsContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { GameNotificationService } from "@/services/gameNotificationService";
import { useNavigationLock } from "@/contexts/NavigationLockContext";

// Note: We do NOT early-return before hooks (would violate rules-of-hooks). We just track platform.
const IS_UNSUPPORTED_PLATFORM = Platform.OS === "ios";
if (IS_UNSUPPORTED_PLATFORM) {
  console.warn(
    "Digital Defenders is only supported on Android and Web platforms"
  );
}

const { width: screenWidth } = Dimensions.get("window");

const PREMIUM_GRADIENT = ["#caf1c8", "#5fd2cd"];
const DEFENDERS_BG = require("../../assets/images/defendersbg.png");
const DEFENDERS_BG_GRADIENT = ["rgba(0,0,0,0.68)", "rgba(0,0,0,0.5)"];
const PREMIUM_SURFACE = "rgba(255, 255, 255, 0.92)";
const PREMIUM_SURFACE_ALT = "rgba(255, 255, 255, 0.85)";
const PREMIUM_TEXT = "#0f172a";
const PREMIUM_MUTED = "#334155";
const PREMIUM_ACCENT = "#1f8f6a";
const PREMIUM_ACCENT_DARK = "#0f6b50";

// Dummy data for testing
const DUMMY_QUESTION_CARDS = [
  {
    id: 1,
    text: "What does HTML stand for?",
    image: null,
    difficulty: "easy",
    correctAnswer: "HyperText Markup Language",
  },
  {
    id: 2,
    text: "Which protocol is used for secure web browsing?",
    image: null,
    difficulty: "medium",
    correctAnswer: "HTTPS",
  },
  {
    id: 3,
    text: "What is the main purpose of a firewall?",
    image: null,
    difficulty: "medium",
    correctAnswer: "Network Security",
  },
  {
    id: 4,
    text: "Which programming language is primarily used for web development?",
    image: null,
    difficulty: "easy",
    correctAnswer: "JavaScript",
  },
  {
    id: 5,
    text: "What does CSS stand for?",
    image: null,
    difficulty: "easy",
    correctAnswer: "Cascading Style Sheets",
  },
];

const DUMMY_ANSWER_CARDS = [
  {
    id: 1,
    text: "HyperText Markup Language",
    name: "HTML Definition",
    description: "The standard markup language for web pages",
    questionId: 1,
  },
  {
    id: 2,
    text: "HTTPS",
    name: "Secure Protocol",
    description: "HTTP Secure protocol",
    questionId: 2,
  },
  {
    id: 3,
    text: "Network Security",
    name: "Firewall Purpose",
    description: "Protection against unauthorized access",
    questionId: 3,
  },
  {
    id: 4,
    text: "JavaScript",
    name: "Web Language",
    description: "Programming language for web interactivity",
    questionId: 4,
  },
  {
    id: 5,
    text: "Cascading Style Sheets",
    name: "CSS Definition",
    description: "Language for styling web pages",
    questionId: 5,
  },
  {
    id: 6,
    text: "SQL",
    name: "Database Language",
    description: "Structured Query Language",
    questionId: 1,
  },
  {
    id: 7,
    text: "Python",
    name: "Programming Language",
    description: "High-level programming language",
    questionId: 2,
  },
  {
    id: 8,
    text: "TCP/IP",
    name: "Network Protocol",
    description: "Transmission Control Protocol",
    questionId: 3,
  },
  {
    id: 9,
    text: "API",
    name: "Interface",
    description: "Application Programming Interface",
    questionId: 4,
  },
  {
    id: 10,
    text: "Database",
    name: "Data Storage",
    description: "Organized collection of data",
    questionId: 5,
  },
];

const TOOL_CARDS = [
  {
    id: "tool1",
    type: "tool",
    name: "Overclock",
    description: "Reset countdown to 30",
    icon: "clock-fast",
  },
  {
    id: "tool2",
    type: "tool",
    name: "Slow Down",
    description: "Freeze countdown for next 2 turns",
    icon: "clock-time-eight",
  },
  {
    id: "tool3",
    type: "tool",
    name: "Super Shuffle",
    description: "Shuffle all players' cards",
    icon: "shuffle",
  },
  {
    id: "tool4",
    type: "tool",
    name: "Heal",
    description: "Regain 2 PC HP",
    icon: "heart-plus",
  },
  {
    id: "tool5",
    type: "tool",
    name: "Pass",
    description: "Skip current question",
    icon: "skip-next",
  },
];

// Sample JSON structure for Digital Defenders questions
const SAMPLE_DD_QUESTIONS = [
  {
    question: "What does HTTPS stand for?",
    correctAnswer: "HyperText Transfer Protocol Secure",
    difficulty: "Easy",
    wave: 1,
    description: "Basic web security protocol",
  },
  {
    question: "What is phishing?",
    correctAnswer: "A social engineering attack to steal information",
    difficulty: "Medium",
    wave: 1,
    description: "Common cybersecurity threat",
  },
  {
    question: "What does VPN stand for?",
    correctAnswer: "Virtual Private Network",
    difficulty: "Medium",
    wave: 2,
    description: "Network security tool",
  },
  {
    question: "What is the purpose of a firewall?",
    correctAnswer: "To block unauthorized network access",
    difficulty: "Easy",
    wave: 2,
    description: "Network security defense",
  },
  {
    question: "What is malware?",
    correctAnswer: "Malicious software designed to harm computers",
    difficulty: "Hard",
    wave: 3,
    description: "Cybersecurity threat category",
  },
];

function DigitalDefenders() {
  const router = useRouter();
  const navigation = useNavigation();
  const { setNavigationLocked } = useNavigationLock();
  const isMountedRef = useRef(true);
  const isQuittingRef = useRef(false);
  const { user, token } = useAuthStore();
  const { settings } = useSettings();
  const { showNotification } = useNotifications();

  // Debug user state
  useEffect(() => {
    console.log("Digital Defenders - User state:", user);
    console.log("User fullName:", user?.fullName);
    console.log("User name:", user?.name);
    console.log("Auth token exists:", !!token);

    // Update player name when user becomes available
    if (user?.fullName && user.fullName.trim()) {
      setPlayerName(user.fullName);
    } else if (user?.name && user.name.trim()) {
      setPlayerName(user.name);
    }

    // If no user or token, ensure auth check
    if (!user || !token) {
      console.log("⚠️ No user or token found, checking auth...");
      // Re-run auth check in case app just started
      const { checkAuth } = useAuthStore.getState();
      checkAuth()
        .then(() => {
          console.log("✅ Auth check completed");
        })
        .catch((error) => {
          console.error("❌ Auth check failed:", error);
        });
    }
  }, [user, token]);

  // Early UI for unsupported platform AFTER hooks are declared
  // Removed previously unused renderUnsupportedPlatform (platform gating handled elsewhere)

  // Socket and multiplayer state
  const [isConnected, setIsConnected] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [playerName, setPlayerName] = useState(
    user?.fullName || user?.name || `Player${Math.floor(Math.random() * 1000)}`
  );
  const [roomId, setRoomId] = useState("");
  const [playerId, setPlayerId] = useState(null);
  const [isCreator, setIsCreator] = useState(false);

  // Game state
  const [gameState, setGameState] = useState("lobby"); // lobby, waiting, turnOrder, playing, gameOver, victory
      // Lock tab navigation only while a Digital Defenders match is actively running.
      useEffect(() => {
        setNavigationLocked(gameState === "playing");

        return () => {
          setNavigationLocked(false);
        };
      }, [gameState, setNavigationLocked]);

  const [currentWave, setCurrentWave] = useState(1);
  const [pcHealth, setPcHealth] = useState(5);
  const [countdown, setCountdown] = useState(30);
  const [actionsLeft, setActionsLeft] = useState(2);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [playerHand, setPlayerHand] = useState([]);
  const [deck, setDeck] = useState([]);
  const [usedCards, setUsedCards] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [showInstructorEditor, setShowInstructorEditor] = useState(false);

  // Turn order selection state
  const [turnOrderSelections, setTurnOrderSelections] = useState(new Map()); // playerId -> position
  const [mySelectedPosition, setMySelectedPosition] = useState(null);
  const [readyPlayersCount, setReadyPlayersCount] = useState(0);
  const [finalTurnOrder, setFinalTurnOrder] = useState([]); // Final order from server after selection
  // Removed redundant playerOrder state (derive directly from serverGameState.playerOrder)
  const [currentPlayerName, setCurrentPlayerName] = useState(""); // Name of current player

  // Backend data state
  const [questionCards, setQuestionCards] = useState([]);
  const [answerCards, setAnswerCards] = useState([]);

  // Edit form states
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [formData, setFormData] = useState({
    text: "",
    correctAnswer: "",
    name: "",
    description: "",
    difficulty: "easy",
    wave: 1,
  });

  // JSON Upload states
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadSuccessModalVisible, setUploadSuccessModalVisible] =
    useState(false);
  const [uploadFailureModalVisible, setUploadFailureModalVisible] =
    useState(false);
  const [showImportDocs, setShowImportDocs] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const renderImportDocsModal = () => (
    <Modal
      visible={showImportDocs}
      animationType="slide"
      transparent
      onRequestClose={() => setShowImportDocs(false)}
    >
      <View style={styles.docsOverlay}>
        <View style={styles.docsContainer}>
          <View style={styles.docsHeader}>
            <Text style={styles.docsTitle}>Question Import Guide</Text>
            <TouchableOpacity
              style={styles.docsCloseButton}
              onPress={() => setShowImportDocs(false)}
            >
              <MaterialCommunityIcons name="close" size={22} color="#3b82f6" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.docsScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.docsText}>
              {`The Cyber Learn platform supports importing custom questions via JSON for three modes:\n\n• Knowledge Relay Race\n• Quiz Showdown\n• Digital Defenders\n\nAll imported questions are globally stored and persistent across sessions.\n\nJSON Requirements\n------------------\nKnowledge Relay (array of objects)\nRequired: question (string), options (array, min 2), correctAnswer (index)\nOptional: category, difficulty, points, id\n\nQuiz Showdown\nRequired: question, options (2–4), correct (index)\nOptional: category, difficulty, points\nRules: Unique questions, valid indices, auto-pads to 4 options\n\nDigital Defenders\nRequired: question (string), correctAnswer (string)\nOptional: difficulty, wave (1–10), description\nRules: Max 5 per wave, unique, case-sensitive difficulty\n\nPoint System\nEasy: 1 | Medium: 2 | Hard: 3\nManual points allowed, defaults applied if missing\n\nBest Practices\n• Validate JSON online before upload\n• Start with small test files (3–5 questions)\n• Write clear, distinct questions\n• Keep files under 1MB, UTF-8 encoded, .json extension\n\nTroubleshooting\n• Upload fails → Check format, extension, size\n• Questions missing → Verify format & success message\n• Common errors: wrong field (correct vs correctAnswer), invalid indices, bad difficulty values, duplicate/empty questions`}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderActionsMenuModal = () => (
    <Modal
      visible={showActionsMenu}
      transparent
      animationType="fade"
      onRequestClose={() => setShowActionsMenu(false)}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setShowActionsMenu(false)}
        style={styles.actionsMenuOverlay}
      >
        <View style={styles.actionsMenuContainer}>
          <View style={styles.actionsMenuHeader}>
            <Text style={styles.actionsMenuTitle}>Menu</Text>
            <Text style={styles.actionsMenuSubtitle}>Question tools and imports</Text>
          </View>
          <TouchableOpacity
            style={styles.actionsMenuItem}
            onPress={() => {
              downloadSampleJSON();
              setShowActionsMenu(false);
            }}
          >
            <View style={styles.actionsMenuItemIcon}>
              <MaterialCommunityIcons name="download" size={18} color="#10b981" />
            </View>
            <Text style={styles.actionsMenuItemText}>Download Sample</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="rgba(15, 23, 42, 0.45)"
              style={styles.actionsMenuItemRight}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionsMenuItem}
            onPress={() => {
              pickJSONFile();
              setShowActionsMenu(false);
            }}
          >
            <View style={styles.actionsMenuItemIcon}>
              <MaterialCommunityIcons name="upload" size={18} color="#0ea5e9" />
            </View>
            <Text style={styles.actionsMenuItemText}>Upload JSON</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="rgba(15, 23, 42, 0.45)"
              style={styles.actionsMenuItemRight}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionsMenuItem}
            onPress={() => {
              setShowImportDocs(true);
              setShowActionsMenu(false);
            }}
          >
            <View style={styles.actionsMenuItemIcon}>
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={18}
                color="#6366f1"
              />
            </View>
            <Text style={styles.actionsMenuItemText}>Import Docs</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="rgba(15, 23, 42, 0.45)"
              style={styles.actionsMenuItemRight}
            />
          </TouchableOpacity>
          <View style={styles.actionsMenuDivider} />
          <TouchableOpacity
            style={[styles.actionsMenuItem, styles.actionsMenuCloseItem]}
            onPress={() => setShowActionsMenu(false)}
          >
            <View style={styles.actionsMenuItemIcon}>
              <MaterialCommunityIcons name="close" size={18} color="#ef4444" />
            </View>
            <Text style={styles.actionsMenuItemText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Intentionally unused pieces of state reserved for upcoming backend sync work:
  // userSection, sections, isDataLoading, playerStats
  const [, setToolCards] = useState(TOOL_CARDS); // state value not read yet
  const [, /* userSection */ setUserSection] = useState(null);
  const [, /* sections */ setSections] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [, /* playerStats */ setPlayerStats] = useState({});

  const [selectedCard, setSelectedCard] = useState(null);
  const [freezeCountdown, setFreezeCountdown] = useState(0);
  const [gameOverReason, setGameOverReason] = useState(null); // Track why the game ended
  const [questionAnsweredThisTurn, setQuestionAnsweredThisTurn] =
    useState(false); // Track if question was answered correctly this turn

  // Game ending data for points-based wins
  const [gameEndData, setGameEndData] = useState(null); // Store winner, scores, etc.

  // Server game state synchronization / tracking
  const [, setServerGameState] = useState(null); // store latest server state; value not directly read yet
  const [isMyTurn, setIsMyTurn] = useState(false); // turn indicator
  const [, setGameStartTime] = useState(null); // reserved for analytics (value not yet used)
  const [, setCurrentPlayerIndex] = useState(0); // turn highlighting value not directly consumed yet

  // New state for cross-platform feedback
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    isCorrect: false,
    message: "",
    title: "",
  });

  // Wave transition modal state
  const [showWaveTransition, setShowWaveTransition] = useState(false);
  const [, setQuestionsUsedInCurrentWave] = useState([]); // Track questions used this wave (value currently unused)

  // Cross-platform alert function
  const showAlert = (title, message, buttons = [{ text: "OK" }]) => {
    if (Platform.OS === "web") {
      // For web, handle multi-button alerts properly
      if (buttons.length > 1) {
        // This is a confirmation dialog, use browser confirm for multi-button
        const confirmed = window.confirm(`${title}\n\n${message}`);
        if (confirmed && buttons[1]?.onPress) {
          // Execute the action button (usually the second button)
          buttons[1].onPress();
        } else if (!confirmed && buttons[0]?.onPress) {
          // Execute the cancel button (usually the first button)
          buttons[0].onPress();
        }
      } else {
        // Single button alert - use custom modal
        const lowerTitle = title.toLowerCase();
        const isSuccess = [
          "correct",
          "success", // Will now match "Successfully" in our modified title
          "victory",
          "saved",
          "updated",
          "created",
          "wave cleared",
          "completed",
        ].some((kw) => lowerTitle.includes(kw));
        const isError = ["error", "failed", "fail", "exhausted"].some((kw) =>
          lowerTitle.includes(kw)
        );

        setFeedbackData({
          isCorrect: isSuccess && !isError,
          message,
          title,
        });
        setShowFeedback(true);

        // Auto-hide after 2 seconds for non-critical messages
        if (
          !title.toLowerCase().includes("error") &&
          !title.toLowerCase().includes("exhausted")
        ) {
          setTimeout(() => {
            setShowFeedback(false);
            // Execute button callback if provided
            if (buttons[0]?.onPress) {
              buttons[0].onPress();
            }
          }, 2000);
        }
      }
    } else {
      // Use native Alert for mobile
      Alert.alert(title, message, buttons);
    }
  };

  const isInvalidSessionPayload = useCallback((payload) => {
    const rawMessage =
      typeof payload === "string"
        ? payload
        : payload?.message || payload?.error || payload?.reason || "";

    return /invalid\s*session|session\s*invalid|session\s*expired|unauthorized|auth\s*failed|token\s*expired/i.test(
      String(rawMessage)
    );
  }, []);

  const handleInvalidSessionGameOver = useCallback(
    (payload) => {
      const message =
        (typeof payload === "string" ? payload : payload?.message || payload?.error) ||
        "Your game session is no longer valid. Please start a new match.";

      setIsConnected(false);
      setGameEndData({ message });
      setGameOverReason("invalid_session");
      setGameState("gameOver");
      showAlert("Session Invalid", message);
    },
    [showAlert]
  );

  // Backend data loading functions
  const loadGameData = useCallback(async () => {
    try {
      setIsDataLoading(true);
      console.log(
        "🎮 Digital Defenders: Loading game data without requiring section"
      );
      console.log("🔍 Current user state:", user);
      console.log("🔍 Auth store token exists:", !!token);

      // For Digital Defenders, we don't require a section - use global data
      let sectionId = null;
      let section = null;

      // Try to get user's section for stats/leaderboard purposes only
      try {
        section = await digitalDefendersAPI.getUserSection();
        setUserSection(section);

        // Load sections if user is instructor/admin
        if (user?.privilege === "instructor" || user?.privilege === "admin") {
          try {
            const sectionsData = await digitalDefendersAPI.getSections();
            setSections(sectionsData.sections || []);
          } catch (error) {
            console.warn("Could not load sections:", error);
          }
        }

        // Find section ID for stats/leaderboard only (not required for gameplay)
        if (
          section &&
          (user?.privilege === "instructor" || user?.privilege === "admin")
        ) {
          const sectionsData = await digitalDefendersAPI.getSections();
          sectionId = sectionsData.sections?.[0]?._id;
        } else if (section) {
          // For students, try to find their section ID
          try {
            const sectionsData = await digitalDefendersAPI.getSections();
            const userSectionObj = sectionsData.sections?.find(
              (s) => s.sectionCode === section || s.name === section
            );
            sectionId = userSectionObj?._id;
          } catch (error) {
            console.warn("Could not find section ID:", error);
          }
        }
      } catch (error) {
        console.warn("Could not get user section, using global data:", error);
      }

      // Load questions, answers, and tool cards - always use global data for Digital Defenders
      const [questionsResult, answersResult, toolCardsResult] =
        await Promise.all([
          digitalDefendersAPI.getQuestions(null), // Always use global questions
          digitalDefendersAPI.getAnswers(null), // Always use global answers
          digitalDefendersAPI.getToolCards(),
        ]);

      if (questionsResult.success) {
        setQuestionCards(questionsResult.questions || []);
      } else {
        console.warn("Could not load questions:", questionsResult.message);
        setQuestionCards([]);
      }

      if (answersResult.success) {
        setAnswerCards(answersResult.answers || []);
      } else {
        console.warn("Could not load answers:", answersResult.message);
        setAnswerCards([]);
      }

      if (toolCardsResult.success) {
        setToolCards(toolCardsResult.toolCards || []);
      } else {
        console.warn("Could not load tool cards:", toolCardsResult.message);
        setToolCards([]);
      }

      // Load stats only if we have a section ID
      if (sectionId) {
        try {
          const statsResult = await digitalDefendersAPI.getStats(sectionId);
          if (statsResult.success) {
            setPlayerStats(statsResult.stats);
          }
        } catch (error) {
          console.warn("Could not load stats:", error);
        }
      }
    } catch (error) {
      console.error("Error loading game data:", error);
      showAlert("Error", "Failed to load game data. Using default content.");
      // Fall back to dummy data
      setQuestionCards(DUMMY_QUESTION_CARDS);
      setAnswerCards(DUMMY_ANSWER_CARDS);
    } finally {
      setIsDataLoading(false);
    }
  }, [user, token]);

  // Load data when component mounts
  useEffect(() => {
    // Only load game data if user is authenticated
    if (user && token) {
      console.log("🎮 User authenticated, loading game data...");
      loadGameData();
    } else {
      console.log("⚠️ User not authenticated yet, skipping game data load");
      console.log("User:", user);
      console.log("Token exists:", !!token);
    }
  }, [loadGameData, user, token]);

  // Define callback functions first
  const nextQuestion = useCallback(() => {
    // This function is now primarily for local testing/fallback
    // In multiplayer mode, question progression is handled by the backend
    console.log(
      "� NextQuestion called - backend will handle question progression in multiplayer mode"
    );

    if (gameState === "playing" && questionCards.length > 0) {
      // Simple fallback for single-player testing
      const availableQuestions = questionCards.filter(
        (q) => q.wave === currentWave
      );
      if (availableQuestions.length > 0) {
        const randomIndex = Math.floor(
          Math.random() * availableQuestions.length
        );
        setCurrentQuestion(availableQuestions[randomIndex]);
        setCountdown(Math.max(15, 30 - currentWave));
        setQuestionAnsweredThisTurn(false);
      }
    }
  }, [questionCards, currentWave, gameState]);

  const handleCountdownExpired = useCallback(() => {
    setPcHealth((prev) => {
      const newHealth = prev - 1;
      if (newHealth <= 0) {
        setGameOverReason("health_depleted");
        setGameState("gameOver");
      } else {
        nextQuestion();
      }
      return newHealth;
    });
  }, [nextQuestion]);

  const initializeGame = useCallback(() => {
    // Create deck with 12 answer cards + 3 tool cards (15 total) - improved deck composition
    const answerCards = DUMMY_ANSWER_CARDS.slice(0, 12).map((card) => ({
      ...card,
      type: "answer",
    }));

    // Reduced tool cards from 5 to 3 to give more space for answer cards
    const toolCards = TOOL_CARDS.slice(0, 3).map((card) => ({
      ...card,
      type: "tool",
    }));

    const allCards = [...answerCards, ...toolCards];
    const shuffledDeck = [...allCards].sort(() => Math.random() - 0.5);

    // Try to guarantee at least one answer card in initial hand for better chances
    let guaranteedAnswerCard = null;
    let initialHand = [];

    // Look for an answer card that matches early wave questions
    const firstWaveQuestions = questionCards.filter((q) => q.wave === 1);
    if (firstWaveQuestions.length > 0) {
      const firstQuestion = firstWaveQuestions[0];
      const answerIndex = shuffledDeck.findIndex(
        (card) =>
          card.type === "answer" &&
          card.text.toLowerCase().trim() ===
            firstQuestion.correctAnswer.toLowerCase().trim()
      );

      if (answerIndex !== -1) {
        guaranteedAnswerCard = shuffledDeck.splice(answerIndex, 1)[0];
      }
    }

    // Deal initial hand
    initialHand = shuffledDeck.slice(0, guaranteedAnswerCard ? 2 : 3);
    if (guaranteedAnswerCard) {
      initialHand.push(guaranteedAnswerCard);
      // Shuffle hand so answer isn't always in same position
      initialHand.sort(() => Math.random() - 0.5);
    }

    setDeck(shuffledDeck.slice(guaranteedAnswerCard ? 2 : 3));
    setPlayerHand(initialHand);
    setUsedCards([]); // Reset used cards - they are permanently discarded each game

    // Initialize first wave
    const wave1Questions = questionCards.filter((q) => q.wave === 1);
    if (wave1Questions.length > 0) {
      const firstQuestion =
        wave1Questions[Math.floor(Math.random() * wave1Questions.length)];
      setCurrentQuestion(firstQuestion);
      setQuestionsUsedInCurrentWave([firstQuestion._id]);
    } else {
      // Fallback to any question if no wave 1 questions exist
      const fallbackQuestion = questionCards[0];
      setCurrentQuestion(fallbackQuestion);
      setQuestionsUsedInCurrentWave(
        fallbackQuestion ? [fallbackQuestion._id] : []
      );
    }

    setPcHealth(5);
    setCurrentWave(1);
    setCountdown(30);
    setActionsLeft(2);
    setCurrentTurn(0);
    setFreezeCountdown(0);
    setSelectedCard(null); // Clear any selected card
    setGameOverReason(null); // Reset game over reason
    setGameEndData(null); // Reset game ending data
    setQuestionAnsweredThisTurn(false); // Reset question answered flag
    setShowWaveTransition(false); // Reset wave transition modal
  }, [questionCards]);

  // Initialize game
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      // This will run when component unmounts
      isMountedRef.current = false;
    };
  }, []);

  // Update playerName when user data becomes available
  useEffect(() => {
    if (user?.fullName) {
      setPlayerName(user.fullName);
    }
  }, [user]);

  // Countdown timer effect
  useEffect(() => {
    if (gameState === "playing" && countdown > 0 && freezeCountdown === 0) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setCountdown((prev) => prev - 1);
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && gameState === "playing") {
      // Check if player has any way to continue before handling countdown expired
      if (deck.length === 0 && playerHand.length === 0) {
        // No cards available - trigger immediate game over
        setGameOverReason("deck_empty");
        setGameState("gameOver");
      } else {
        handleCountdownExpired();
      }
    }
  }, [
    countdown,
    gameState,
    freezeCountdown,
    handleCountdownExpired,
    deck.length,
    playerHand.length,
  ]);

  // Freeze countdown effect
  useEffect(() => {
    if (freezeCountdown > 0) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setFreezeCountdown((prev) => prev - 1);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [freezeCountdown]);

  // Sync local state with server state updates
  const syncWithServerState = useCallback(
    (serverGameState) => {
      try {
        if (!serverGameState) return;

        // Update game state
        if (serverGameState.gameState) {
          setGameState(serverGameState.gameState);
        }

        // Update countdown
        if (typeof serverGameState.countdown === "number") {
          setCountdown(serverGameState.countdown);
        }

        // Update PC health
        if (typeof serverGameState.pcHealth === "number") {
          setPcHealth(serverGameState.pcHealth);
        }

        // Update current wave
        if (typeof serverGameState.currentWave === "number") {
          setCurrentWave(serverGameState.currentWave);
        }

        // Update current question
        if (serverGameState.currentQuestion) {
          setCurrentQuestion(serverGameState.currentQuestion);
        }

        // Update turn information
        if (serverGameState.currentPlayerIndex !== undefined) {
          setCurrentPlayerIndex(serverGameState.currentPlayerIndex);
        }

        // Update current turn counter
        if (typeof serverGameState.currentTurn === "number") {
          setCurrentTurn(serverGameState.currentTurn);
        }

        // Update player order for turn indicator
        if (
          serverGameState.playerOrder &&
          Array.isArray(serverGameState.playerOrder)
        ) {
          if (
            serverGameState.playerOrder.length > 0 &&
            typeof serverGameState.currentTurn === "number"
          ) {
            const currentPlayerIndex =
              serverGameState.currentTurn % serverGameState.playerOrder.length;
            const currentPlayer =
              serverGameState.playerOrder[currentPlayerIndex];
            setCurrentPlayerName(currentPlayer || "");
          }
        }

        // Update player-specific data from direct server response
        if (serverGameState.playerHand) {
          setPlayerHand(serverGameState.playerHand);
        }

        if (typeof serverGameState.actionsLeft === "number") {
          setActionsLeft(serverGameState.actionsLeft);
        }

        // Update isMyTurn from server
        if (typeof serverGameState.isPlayerTurn === "boolean") {
          setIsMyTurn(serverGameState.isPlayerTurn);
        }

        // Update deck from server (shared deck)
        if (serverGameState.deck) {
          setDeck(serverGameState.deck);
        }

        // Fallback: Update player-specific data from players array
        if (
          serverGameState.players &&
          playerId &&
          !serverGameState.playerHand
        ) {
          const playerData = serverGameState.players.find(
            (p) => p.id === playerId
          );
          if (playerData) {
            setPlayerHand(playerData.hand || []);
            setActionsLeft(playerData.actionsLeft || 0);
          }
        }

        // Update freeze countdown
        if (typeof serverGameState.freezeCountdown === "number") {
          setFreezeCountdown(serverGameState.freezeCountdown);
        }

        // Update used cards
        if (serverGameState.usedCards) {
          setUsedCards(serverGameState.usedCards);
        }

        // Update question answered state
        if (typeof serverGameState.questionAnsweredThisTurn === "boolean") {
          setQuestionAnsweredThisTurn(serverGameState.questionAnsweredThisTurn);
        }

        // Handle game over states
        if (
          serverGameState.gameState === "gameOver" &&
          serverGameState.gameOverReason
        ) {
          setGameOverReason(serverGameState.gameOverReason);
        }
      } catch (error) {
        console.error("Error syncing with server state:", error);
      }
    },
    [playerId]
  );

  // Socket connection and event handlers
  useEffect(() => {
    // Only connect to socket if user is authenticated
    if (!user || !token) {
      console.log("⚠️ Socket connection skipped - user not authenticated");
      return;
    }

    console.log("🔌 Connecting to Digital Defenders socket...");
    // Connect to socket
    digitalDefendersSocket.connect();

    // Check connection status after a short delay
    const checkConnection = () => {
      setIsConnected(digitalDefendersSocket.isConnected());
    };

    // Check immediately and then periodically
    checkConnection();
    const connectionInterval = setInterval(checkConnection, 1000);

    // Socket event handlers
    const handleRoomCreated = (data) => {
      console.log("Room created:", data);
      setRoomData(data.room);
      setRoomId(data.room.id);
      setPlayerId(data.playerId);
      setIsCreator(true);
      setGameState("waiting");
    };

    const handleRoomJoined = (data) => {
      console.log("Room joined:", data);
      setRoomData(data.room);
      setRoomId(data.room.id);
      setPlayerId(data.playerId);
      setIsCreator(false);
      setGameState("waiting");
    };

    const handlePlayerJoined = (data) => {
      console.log("Player joined:", data);
      setRoomData(data.room);
    };

    const handleRoomUpdated = (data) => {
      console.log("Room updated:", data);
      setRoomData(data.room);
    };

    const handleGameStarted = (data) => {
      console.log("Game started:", data);
      setGameState("playing");
      setGameStartTime(Date.now());
      // Don't call initializeGame() - use server state instead
      if (data.gameState) {
        setServerGameState(data.gameState);
        syncWithServerState(data.gameState);
      }
    };

    const handleGameState = (data) => {
      console.log("Game state received:", data);
      setServerGameState(data);
      syncWithServerState(data);
    };

    const handleCardPlayed = (data) => {
      console.log("Card played:", data);
      if (data.gameState) {
        setServerGameState(data.gameState);
        syncWithServerState(data.gameState);
      }

      // Show feedback for card effects
      if (data.effect && data.effect.message) {
        const alertTitle = data.effect.questionSolved
          ? "Correct!"
          : data.effect.healthLost
          ? "Wrong Answer!"
          : "Card Effect";
        showAlert(alertTitle, data.effect.message);
      }
    };

    const handleCardReshuffled = (data) => {
      console.log("Card reshuffled:", data);

      // Show special message if answer card was guaranteed
      if (data.guaranteedAnswer) {
        showAlert(
          "Cards Reshuffled! 🎯",
          `${data.playerName} reshuffled their cards`
        );
      } else {
        showAlert(
          "Cards Reshuffled",
          `${data.playerName} reshuffled their cards`
        );
      }

      if (data.gameState) {
        setServerGameState(data.gameState);
        syncWithServerState(data.gameState);
      }
    };

    const handleTurnUpdated = (data) => {
      console.log("Turn updated:", data);
      if (data.gameState) {
        // Store previous turn state to show notification on turn change
        const wasMyTurn = isMyTurn;

        setServerGameState(data.gameState);
        syncWithServerState(data.gameState);

        // Show turn change notification after state update
        setTimeout(() => {
          if (data.gameState.isPlayerTurn && !wasMyTurn) {
            showAlert("Your Turn!", "It's your turn to play!");
          } else if (!data.gameState.isPlayerTurn && wasMyTurn) {
            const nextPlayerName = data.gameState.playerOrder
              ? data.gameState.playerOrder[
                  data.gameState.currentTurn % data.gameState.playerOrder.length
                ]
              : "Next player";
            showAlert("Turn Ended", `${nextPlayerName}'s turn now.`);
          }
        }, 100);
      }
    };

    const handleWaveAdvanced = (data) => {
      console.log("Wave advanced:", data);

      // Update current wave state
      if (data.newWave) {
        setCurrentWave(data.newWave);
      }

      // Sync with game state
      if (data.gameState) {
        setServerGameState(data.gameState);
        syncWithServerState(data.gameState);
      }

      // Show wave transition modal
      setShowWaveTransition(true);

      // Hide wave transition modal after 3 seconds
      setTimeout(() => {
        setShowWaveTransition(false);
      }, 3000);

      // Optional: Vibrate on wave transition (if supported)
      if (Platform.OS !== "web") {
        Vibration.vibrate([0, 200, 100, 200]);
      }
    };

    const handleTurnOrderSelectionStarted = (data) => {
      console.log("Turn order selection started:", data);
      setGameState("turnOrder");
      setTurnOrderSelections(new Map());
      setMySelectedPosition(null);
      setReadyPlayersCount(0);
      setFinalTurnOrder([]);
      showAlert("Turn Order Selection", "Choose your turn order position!");
    };

    const handleTurnPositionSelected = (data) => {
      console.log("Turn position selected:", data);
      const {
        playerId: selectedPlayerId,
        playerName,
        position,
        readyPlayers,
      } = data;

      setTurnOrderSelections((prev) => {
        const newSelections = new Map(prev);
        newSelections.set(selectedPlayerId, { position, playerName });
        return newSelections;
      });

      setReadyPlayersCount(readyPlayers);

      // Update my selected position if it's me
      if (selectedPlayerId === playerId) {
        setMySelectedPosition(position);
      }

      showAlert(
        "Position Selected Successfully", // Changed title to include "Successfully" keyword
        `${playerName} selected position ${position}`
      );
    };

    const handleTurnOrderFinalized = (data) => {
      console.log("Turn order finalized:", data);
      setFinalTurnOrder(data.playerOrder);
      showAlert(
        "Turn Order Set",
        "Turn order has been finalized! Game starting soon..."
      );
    };

    const handleGameOver = async (data) => {
      console.log("Game over:", data);
      setGameState("gameOver");
      setGameOverReason(data.reason || "unknown");

      // Send enhanced notification on game completion
      await GameNotificationService.sendGameCompletionNotification(
        "digital-defenders",
        { victory: false },
        showNotification,
        settings
      );

      // Store game ending data for points-based endings
      if (data.reason === "no_cards_remaining") {
        setGameEndData({
          winner: data.winner,
          isTie: data.isTie,
          tiedPlayers: data.tiedPlayers,
          playerStats: data.playerStats,
          finalWave: data.finalWave,
          finalHealth: data.finalHealth,
          message: data.message,
        });
      } else {
        setGameEndData(null);
      }

      if (data.gameState) {
        setServerGameState(data.gameState);
        syncWithServerState(data.gameState);
      }
      showAlert(
        "Game Over",
        data.message || data.reason || "The game has ended"
      );
    };

    const handleVictory = async (data) => {
      console.log("Victory:", data);
      setGameState("victory");

      // Send enhanced notification on victory
      await GameNotificationService.sendGameCompletionNotification(
        "digital-defenders",
        { victory: true },
        showNotification,
        settings
      );

      if (data.gameState) {
        setServerGameState(data.gameState);
        syncWithServerState(data.gameState);
      }
      showAlert("Victory!", data.message || "Congratulations! You won!");
    };

    const handlePlayerDisconnected = (data) => {
      console.log("Player disconnected:", data);
      setRoomData(data.room);
      showAlert("Player Left", `${data.playerName} has left the game`);
    };

    const handlePlayerLeft = (data) => {
      console.log("Player left:", data);
      setRoomData(data.room);
      showAlert("Player Left", `${data.playerName} has left the room`);
    };

    const handleSocketError = (data) => {
      console.error("Socket error:", data);
      if (isInvalidSessionPayload(data)) {
        handleInvalidSessionGameOver(data);
        return;
      }
      Alert.alert("Error", data.message || data.error || "An error occurred");
    };

    const handleSocketConnected = () => {
      console.log("Socket connected successfully");
      setIsConnected(true);
      // Clear any previous errors when we reconnect
    };

    const handleSocketDisconnected = (data) => {
      console.log("Socket disconnected:", data?.reason || "unknown reason");
      setIsConnected(false);
      if (isInvalidSessionPayload(data)) {
        handleInvalidSessionGameOver(data);
      }
      // Don't immediately clear room data, allow for reconnection
    };

    const handleSocketConnectionError = (data) => {
      console.error("Socket connection error:", data?.error || data?.message);
      if (isInvalidSessionPayload(data)) {
        handleInvalidSessionGameOver(data);
      }
    };

    const handleSocketReconnected = (data) => {
      console.log(
        "Socket reconnected after",
        data?.attemptNumber || 0,
        "attempts"
      );
      setIsConnected(true);

      // If we were in a room, try to rejoin or check if it still exists
      if (roomData?.id) {
        console.log(
          "Attempting to rejoin room after reconnection:",
          roomData.id
        );
        // The socket will automatically rejoin rooms on reconnection
      }
    };

    const handleSocketReconnectError = (data) => {
      console.error("Socket reconnection error:", data?.error);
    };

    const handleSocketReconnectFailed = () => {
      console.error("Socket failed to reconnect");
      setIsConnected(false);
      showAlert(
        "Connection Lost",
        "Unable to reconnect to server. Please refresh the app."
      );
    };

    // Register event handlers
    digitalDefendersSocket.on("room-created", handleRoomCreated);
    digitalDefendersSocket.on("room-joined", handleRoomJoined);
    digitalDefendersSocket.on("player-joined", handlePlayerJoined);
    digitalDefendersSocket.on("room-updated", handleRoomUpdated);
    digitalDefendersSocket.on("game-started", handleGameStarted);
    digitalDefendersSocket.on("game-state", handleGameState);
    digitalDefendersSocket.on("card-played", handleCardPlayed);
    digitalDefendersSocket.on("card-reshuffled", handleCardReshuffled);
    digitalDefendersSocket.on("turn-updated", handleTurnUpdated);
    digitalDefendersSocket.on("wave-advanced", handleWaveAdvanced);
    digitalDefendersSocket.on(
      "turn-order-selection-started",
      handleTurnOrderSelectionStarted
    );
    digitalDefendersSocket.on(
      "turn-position-selected",
      handleTurnPositionSelected
    );
    digitalDefendersSocket.on("turn-order-finalized", handleTurnOrderFinalized);
    digitalDefendersSocket.on("game-over", handleGameOver);
    digitalDefendersSocket.on("victory", handleVictory);
    digitalDefendersSocket.on("player-disconnected", handlePlayerDisconnected);
    digitalDefendersSocket.on("player-left", handlePlayerLeft);
    digitalDefendersSocket.on("socket-game-error", handleSocketError);
    digitalDefendersSocket.on("socket-error", handleSocketConnectionError);
    digitalDefendersSocket.on("socket-connected", handleSocketConnected);
    digitalDefendersSocket.on("socket-disconnected", handleSocketDisconnected);
    digitalDefendersSocket.on("socket-reconnected", handleSocketReconnected);
    digitalDefendersSocket.on(
      "socket-reconnect-error",
      handleSocketReconnectError
    );
    digitalDefendersSocket.on(
      "socket-reconnect-failed",
      handleSocketReconnectFailed
    );

    // Cleanup on unmount
    return () => {
      clearInterval(connectionInterval);
      digitalDefendersSocket.off("room-created", handleRoomCreated);
      digitalDefendersSocket.off("room-joined", handleRoomJoined);
      digitalDefendersSocket.off("player-joined", handlePlayerJoined);
      digitalDefendersSocket.off("room-updated", handleRoomUpdated);
      digitalDefendersSocket.off("game-started", handleGameStarted);
      digitalDefendersSocket.off("game-state", handleGameState);
      digitalDefendersSocket.off("card-played", handleCardPlayed);
      digitalDefendersSocket.off("card-reshuffled", handleCardReshuffled);
      digitalDefendersSocket.off("turn-updated", handleTurnUpdated);
      digitalDefendersSocket.off("wave-advanced", handleWaveAdvanced);
      digitalDefendersSocket.off(
        "turn-order-selection-started",
        handleTurnOrderSelectionStarted
      );
      digitalDefendersSocket.off(
        "turn-position-selected",
        handleTurnPositionSelected
      );
      digitalDefendersSocket.off(
        "turn-order-finalized",
        handleTurnOrderFinalized
      );
      digitalDefendersSocket.off("game-over", handleGameOver);
      digitalDefendersSocket.off("victory", handleVictory);
      digitalDefendersSocket.off(
        "player-disconnected",
        handlePlayerDisconnected
      );
      digitalDefendersSocket.off("player-left", handlePlayerLeft);
      digitalDefendersSocket.off("socket-game-error", handleSocketError);
      digitalDefendersSocket.off("socket-error", handleSocketConnectionError);
      digitalDefendersSocket.off("socket-connected", handleSocketConnected);
      digitalDefendersSocket.off(
        "socket-disconnected",
        handleSocketDisconnected
      );
      digitalDefendersSocket.off("socket-reconnected", handleSocketReconnected);
      digitalDefendersSocket.off(
        "socket-reconnect-error",
        handleSocketReconnectError
      );
      digitalDefendersSocket.off(
        "socket-reconnect-failed",
        handleSocketReconnectFailed
      );

      // Don't disconnect the socket here as it may be used by other components
      // digitalDefendersSocket.disconnect();
    };
  }, [
    syncWithServerState,
    isInvalidSessionPayload,
    handleInvalidSessionGameOver,
    user,
    token,
    isMyTurn,
    playerId,
    roomData?.id,
    settings,
    showNotification,
  ]);

  // Check for automatic loss condition when deck is empty
  useEffect(() => {
    if (
      gameState === "playing" &&
      deck.length === 0 &&
      playerHand.length === 0
    ) {
      // Deck is empty and no cards in hand - automatic loss
      setGameOverReason("deck_empty");
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          showAlert(
            "Deck Exhausted!",
            "All cards have been used. Your PC defenses have failed!",
            [
              {
                text: "OK",
                onPress: () => setGameState("gameOver"),
              },
            ]
          );
        }
      }, 500); // Small delay to show the empty state before triggering game over

      return () => clearTimeout(timer);
    }
  }, [deck.length, playerHand.length, gameState]);

  // Lobby action functions
  const createRoom = async () => {
    console.log(
      "Create room called, playerName:",
      playerName,
      "isConnected:",
      isConnected
    );

    if (!playerName || !playerName.trim()) {
      Alert.alert("Error", "Player name not available. Please try again.");
      return;
    }

    if (!isConnected) {
      Alert.alert("Error", "Not connected to server. Please try again.");
      return;
    }

    try {
      console.log("Creating room with player name:", playerName.trim());

      // Add a small delay to ensure socket connection is stable
      await new Promise((resolve) => setTimeout(resolve, 100));

      digitalDefendersSocket.createRoom(playerName.trim());
    } catch (error) {
      console.error("Error creating room:", error);
      Alert.alert("Error", error.message);
    }
  };

  const joinRoom = async () => {
    console.log(
      "Join room called, playerName:",
      playerName,
      "roomId:",
      roomId,
      "isConnected:",
      isConnected
    );

    if (!playerName || !playerName.trim() || !roomId || !roomId.trim()) {
      Alert.alert(
        "Error",
        "Player name not available or room ID missing. Please try again."
      );
      return;
    }

    // Validate room code format (4 letters only)
    const trimmedRoomId = roomId.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(trimmedRoomId)) {
      Alert.alert("Error", "Room code must be exactly 4 letters (A-Z only).");
      return;
    }

    if (!isConnected) {
      Alert.alert("Error", "Not connected to server. Please try again.");
      return;
    }

    try {
      console.log(
        "Joining room:",
        trimmedRoomId,
        "with player:",
        playerName.trim()
      );

      // Add a small delay to ensure socket connection is stable
      await new Promise((resolve) => setTimeout(resolve, 100));

      digitalDefendersSocket.joinRoom(trimmedRoomId, playerName.trim());
    } catch (error) {
      console.error("Error joining room:", error);
      Alert.alert("Error", error.message);
    }
  };

  const startGameMultiplayer = () => {
    if (roomData && isCreator) {
      try {
        digitalDefendersSocket.startGame(roomData.id);
      } catch (error) {
        Alert.alert("Error", error.message);
      }
    }
  };

  const leaveRoom = () => {
    // Notify backend if we're in a room
    if (roomData?.id) {
      try {
        digitalDefendersSocket.leaveRoom(roomData.id);
      } catch (error) {
        console.warn("Failed to notify backend about leaving room:", error);
      }
    }

    setRoomData(null);
    setRoomId("");
    setPlayerId(null);
    setIsCreator(false);
    setGameState("lobby");
    setNavigationLocked(false);
  };

  useEffect(() => {
    digitalDefendersSocket.setCurrentRoomCode(roomData?.id || null);
  }, [roomData?.id]);

  const performQuitAndDisconnect = useCallback(
    (onComplete) => {
      if (isQuittingRef.current) return;
      isQuittingRef.current = true;

      try {
        if (roomData?.id && digitalDefendersSocket.isConnected()) {
          digitalDefendersSocket.leaveRoom(roomData.id);
        }
      } catch (error) {
        console.warn("Failed to notify room leave during quit:", error);
      }

      try {
        digitalDefendersSocket.disconnect();
      } catch (error) {
        console.warn("Failed to disconnect socket during quit:", error);
      }

      setRoomData(null);
      setRoomId("");
      setPlayerId(null);
      setIsCreator(false);
      setIsConnected(false);
      setGameState("lobby");
      setNavigationLocked(false);

      if (typeof onComplete === "function") {
        onComplete();
      }

      setTimeout(() => {
        isQuittingRef.current = false;
      }, 300);
    },
    [roomData?.id, setNavigationLocked]
  );

  const requestQuitConfirmation = useCallback(
    (onConfirm) => {
      showAlert("Quit Match", "Are you sure you want to quit?", [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: () => performQuitAndDisconnect(onConfirm),
        },
      ]);
    },
    [performQuitAndDisconnect]
  );

  useEffect(() => {
    if (!navigation?.addListener) {
      return undefined;
    }

    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (isQuittingRef.current) {
        return;
      }

      event.preventDefault();
      requestQuitConfirmation(() => {
        navigation.dispatch(event.data.action);
      });
    });

    return unsubscribe;
  }, [navigation, requestQuitConfirmation]);

  const selectTurnPosition = (position) => {
    if (!roomData?.id || mySelectedPosition) {
      return; // Already selected or not in room
    }

    try {
      digitalDefendersSocket.selectTurnPosition(roomData.id, position);
      setMySelectedPosition(position);
    } catch (error) {
      console.error("Error selecting turn position:", error);
      Alert.alert("Error", error.message);
    }
  };

  const startGame = () => {
    setGameState("playing");
    initializeGame();
  };

  const handleCardTap = (card) => {
    // Check if it's multiplayer and not player's turn
    if (roomData && !isMyTurn) {
      showAlert("Not Your Turn", "Wait for your turn to play cards.");
      return;
    }

    if (actionsLeft <= 0) {
      showAlert("No Actions Left", "You have no actions remaining this turn.");
      return;
    }

    if (gameState !== "playing") {
      return;
    }

    // Check if player has any usable cards (not just empty hand)
    if (playerHand.length === 0) {
      showAlert(
        "No Cards Left",
        "You have no cards to play. You can only skip your turn."
      );
      return;
    }

    // If card is already selected, activate it
    if (selectedCard && selectedCard.id === card.id) {
      // Add haptic feedback for successful card play (mobile only)
      try {
        if (Platform.OS !== "web" && Vibration) {
          Vibration.vibrate(50);
        }
      } catch (_error) {
        // Ignore haptic errors on devices that don't support it
      }

      // Play card through backend if in multiplayer mode
      if (roomData && playerId) {
        try {
          digitalDefendersSocket.playCard(roomData.id, card.id);
          setSelectedCard(null); // Clear selection immediately
        } catch (error) {
          showAlert("Error", error.message || "Failed to play card");
        }
      } else {
        // Solo mode - handle locally (fallback to original logic)
        handleLocalCardPlay(card);
      }
    } else {
      // Select the card
      setSelectedCard(card);
    }
  };

  // Local card play for solo mode (fallback)
  const handleLocalCardPlay = (card) => {
    // Handle card effect first
    if (card.type === "tool") {
      handleToolCard(card);
    } else {
      handleAnswerCard(card);
    }

    // ALWAYS consume the card regardless of correctness
    const newHand = playerHand.filter((c) => c.id !== card.id);
    setUsedCards([...usedCards, card]);

    // Try to draw new card from deck
    const newCard = deck[0];
    if (newCard) {
      setPlayerHand([...newHand, newCard]);
      setDeck(deck.slice(1));
    } else {
      // No cards left in deck - just remove the used card
      setPlayerHand(newHand);
      // Note: If this results in both deck and hand being empty,
      // the useEffect will trigger automatic game over
    }

    setActionsLeft((prev) => prev - 1);
    setSelectedCard(null); // Clear selection

    // End turn if no actions left
    if (actionsLeft === 1) {
      endTurn();
    }
  };

  const handleToolCard = (card) => {
    switch (card.name) {
      case "Overclock":
        setCountdown(30);
        showAlert("Overclock Used!", "Countdown reset to 30!");
        break;
      case "Slow Down":
        setFreezeCountdown(2);
        showAlert("Slow Down Used!", "Countdown frozen for 2 turns!");
        break;
      case "Super Shuffle":
        // Only shuffle if there are cards available
        if (deck.length > 0) {
          shuffleAllCards();
          showAlert("Super Shuffle Used!", "All available cards shuffled!");
        } else {
          showAlert("Super Shuffle Failed!", "No cards available to shuffle.");
        }
        break;
      case "Heal":
        const oldHealth = pcHealth;
        setPcHealth((prev) => Math.min(5, prev + 2));
        const newHealth = Math.min(5, oldHealth + 2);
        showAlert("Heal Used!", `PC Health restored to ${newHealth}/5!`);
        break;
      case "Pass":
        setQuestionAnsweredThisTurn(true); // Mark that question was resolved (passed)
        nextQuestion();
        showAlert("Pass Used!", "Question skipped!");
        break;
      default:
        showAlert("Unknown Tool", "This tool card is not recognized.");
    }
  };

  const handleAnswerCard = (card) => {
    if (currentQuestion && card.questionId === currentQuestion._id) {
      // Correct answer - clear the question
      setQuestionAnsweredThisTurn(true); // Mark that question was answered correctly
      nextQuestion();
      showAlert("Correct!", "Question answered correctly!");
    } else {
      // Wrong answer - reduce health and show feedback
      setPcHealth((prev) => {
        const newHealth = prev - 1;
        if (newHealth <= 0) {
          setGameOverReason("health_depleted");
          setGameState("gameOver");
          showAlert("Game Over!", "Wrong answer! PC Health reached 0.");
        } else {
          showAlert(
            "Wrong Answer!",
            `Wrong answer! Lost 1 health. Health: ${newHealth}/5`
          );
        }
        return newHealth;
      });
    }
    // Note: Card consumption is handled in handleCardTap regardless of correctness
  };

  const endTurn = (isSkipped = false) => {
    // Check if player used all their actions without answering the question correctly
    // actionsLeft will be 1 when this is called after using the 2nd action
    // Don't penalize for voluntary skips
    if (actionsLeft === 1 && !questionAnsweredThisTurn && !isSkipped) {
      // Player used all actions without solving the question - lose 1 life
      setPcHealth((prev) => {
        const newHealth = prev - 1;
        if (newHealth <= 0) {
          setGameOverReason("health_depleted");
          setGameState("gameOver");
        } else {
          // Show feedback that life was lost due to using all actions
          showAlert(
            "Actions Exhausted!",
            `All actions used without solving the question. Lost 1 life! Health: ${newHealth}/5`
          );
        }
        return newHealth;
      });
    }

    const currentPlayerCount = roomData?.players?.length || 1;
    setCurrentTurn((prev) => (prev + 1) % currentPlayerCount);
    setActionsLeft(2);
    setSelectedCard(null); // Clear any selection when turn ends
    setQuestionAnsweredThisTurn(false); // Reset for next turn
    if (currentTurn === currentPlayerCount - 1) {
      // All players have taken their turn
      if (countdown > 0) {
        setCountdown((prev) => prev - 1);
      }
    }
  };

  const skipTurn = () => {
    // Check if it's multiplayer and not player's turn
    if (roomData && !isMyTurn) {
      showAlert("Not Your Turn", "Wait for your turn to skip.");
      return;
    }

    if (actionsLeft > 0) {
      setSelectedCard(null); // Clear selection when skipping turn

      // Skip turn through backend if in multiplayer mode
      if (roomData && playerId) {
        try {
          digitalDefendersSocket.skipTurn(roomData.id);
        } catch (error) {
          showAlert("Error", error.message || "Failed to skip turn");
        }
      } else {
        // Solo mode - handle locally
        setActionsLeft(0);

        // Show different message based on whether player has cards or not
        if (playerHand.length === 0 && deck.length === 0) {
          // Player has no cards left - this is their only option
          showAlert(
            "Turn Skipped",
            "No cards available - relying on teammates or countdown expiry."
          );
        }

        endTurn(true); // Pass true to indicate this is a voluntary skip
      }
    }
  };

  const shuffleAllCards = () => {
    // Only shuffle current hand back into available deck (not used cards)
    // Used cards are permanently discarded and never return
    const allAvailableCards = [...playerHand, ...deck];
    const shuffled = allAvailableCards.sort(() => Math.random() - 0.5);

    // Ensure we don't try to draw more cards than available
    const newHandSize = Math.min(3, shuffled.length);
    setPlayerHand(shuffled.slice(0, newHandSize));
    setDeck(shuffled.slice(newHandSize));
    setSelectedCard(null); // Clear any selection when shuffling
  };

  const reshuffle = () => {
    // Check if it's multiplayer and not player's turn
    if (roomData && !isMyTurn) {
      showAlert("Not Your Turn", "Wait for your turn to reshuffle cards.");
      return;
    }

    if (actionsLeft <= 0) {
      showAlert("No Actions", "You have no actions remaining this turn.");
      return;
    }

    if (playerHand.length === 0) {
      showAlert(
        "No Cards to Reshuffle",
        "You have no cards in hand to reshuffle."
      );
      return;
    }

    // Reshuffle through backend if in multiplayer mode
    if (roomData && playerId) {
      try {
        digitalDefendersSocket.reshuffleCards(roomData.id);
      } catch (error) {
        showAlert("Error", error.message || "Failed to reshuffle cards");
      }
    } else {
      // Solo mode - handle locally
      shuffleAllCards();

      setActionsLeft(actionsLeft - 1);

      // End turn if no actions left
      if (actionsLeft === 1) {
        endTurn();
      }
    }
  };

  // Utility function to convert difficulty numbers to strings
  const getDifficultyLabel = (difficulty) => {
    if (typeof difficulty === "string") return difficulty;

    switch (difficulty) {
      case 1:
      case 2:
      case 3:
        return "easy";
      case 4:
      case 5:
      case 6:
      case 7:
        return "medium";
      case 8:
      case 9:
      case 10:
        return "hard";
      default:
        return "easy";
    }
  };

  // Utility function to convert difficulty strings to numbers for backend
  const getDifficultyNumber = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return 3;
      case "medium":
        return 6;
      case "hard":
        return 9;
      default:
        return 3;
    }
  };

  // Card editing handlers
  const openEditForm = (card) => {
    console.log("🛠️ Opening edit form for:", { card });
    setEditingCard(card);
    setFormData({
      text: card.text || "",
      correctAnswer: card.correctAnswer || "",
      difficulty: getDifficultyLabel(card.difficulty) || "easy",
      wave: card.wave || 1,
      name: "",
      description: "",
    });

    setShowEditForm(true);
  };

  const openCreateForm = (type, selectedWave = 1) => {
    console.log("🆕 Opening create form for:", type, "Wave:", selectedWave);
    setEditingCard(null);
    setFormData({
      text: "",
      correctAnswer: "",
      name: "",
      description: "",
      difficulty: "easy",
      wave: selectedWave,
    });
    setShowEditForm(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.text.trim()) {
      showAlert("Error", "Text field is required");
      return;
    }

    if (!formData.correctAnswer.trim()) {
      showAlert("Error", "Correct answer is required");
      return;
    }

    // Check wave limit: maximum 5 questions per wave
    if (!editingCard) {
      const waveQuestions = questionCards.filter(
        (card) => card.wave === formData.wave
      );
      if (waveQuestions.length >= 5) {
        showAlert(
          "Wave Full",
          `Wave ${formData.wave} already has the maximum of 5 questions. Please choose a different wave or delete an existing question.`
        );
        return;
      }
    }

    try {
      // For Digital Defenders, we don't need section validation
      // Questions and answers are global and available to all sections

      // Only handle question creation/editing now
      let questionResult;

      if (editingCard) {
        // Update existing question
        questionResult = await digitalDefendersAPI.updateQuestion(
          editingCard._id,
          {
            text: formData.text,
            correctAnswer: formData.correctAnswer,
            difficulty: getDifficultyNumber(formData.difficulty),
            wave: formData.wave,
          }
        );

        // Find and update corresponding answer card
        const correspondingAnswer = answerCards.find(
          (a) => a.questionId === editingCard._id
        );
        if (correspondingAnswer) {
          await digitalDefendersAPI.updateAnswer(correspondingAnswer._id, {
            text: formData.correctAnswer,
            name: `Answer for: ${formData.text.substring(0, 30)}...`,
            description: `Correct answer for the question about ${formData.text.substring(
              0,
              50
            )}...`,
          });
        }
      } else {
        // Create new question (using global endpoint - no sectionId needed)
        questionResult = await digitalDefendersAPI.createQuestion(null, {
          text: formData.text,
          correctAnswer: formData.correctAnswer,
          difficulty: getDifficultyNumber(formData.difficulty),
          wave: formData.wave,
        });

        // Create corresponding answer card (using global endpoint - no sectionId needed)
        if (questionResult.success) {
          await digitalDefendersAPI.createAnswer(null, {
            text: formData.correctAnswer,
            name: `Answer for: ${formData.text.substring(0, 30)}...`,
            description: `Correct answer for the question about ${formData.text.substring(
              0,
              50
            )}...`,
            questionId: questionResult.question._id,
          });
        }
      }

      if (questionResult?.success) {
        showAlert(
          "Success",
          editingCard
            ? "Question updated successfully!"
            : "Question created successfully!"
        );
        // Reload data to refresh the cards
        await loadGameData();
      } else {
        showAlert(
          "Error",
          questionResult?.message || "Failed to save question"
        );
      }

      setShowEditForm(false);
    } catch (error) {
      console.error("Error saving card:", error);
      showAlert("Error", "Failed to save card. Please try again.");
    }
  };

  // JSON Upload functions
  const pickJSONFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);

        let fileContent;

        // Handle file reading differently for web vs mobile
        if (Platform.OS === "web") {
          const response = await fetch(file.uri);
          fileContent = await response.text();
        } else {
          fileContent = await FileSystem.readAsStringAsync(file.uri);
        }

        try {
          const jsonData = JSON.parse(fileContent);

          // Validate that it's an array of questions
          if (!Array.isArray(jsonData)) {
            Alert.alert(
              "Error",
              "JSON file must contain an array of questions"
            );
            return;
          }

          setUploadModalVisible(true);
        } catch (_parseError) {
          Alert.alert("Error", "Invalid JSON format. Please check your file.");
        }
      }
    } catch (error) {
      console.error("Error picking JSON file:", error);
      Alert.alert("Error", "Failed to read the JSON file. Please try again.");
    }
  };

  const uploadQuestions = async () => {
    if (!selectedFile) {
      Alert.alert("Error", "No file selected");
      return;
    }

    setIsUploading(true);

    try {
      let fileContent;

      // Read file content
      if (Platform.OS === "web") {
        const response = await fetch(selectedFile.uri);
        fileContent = await response.text();
      } else {
        fileContent = await FileSystem.readAsStringAsync(selectedFile.uri);
      }

      const jsonData = JSON.parse(fileContent);

      // Send to backend for validation and processing
      const result = await digitalDefendersAPI.uploadQuestions(jsonData);

      if (result.success) {
        // Set success data and show success modal
        setUploadResult({
          message: `Successfully uploaded ${result.count} questions! They have been added to the global question bank and corresponding answer cards were created.`,
          count: result.count,
          errors: [],
        });
        setUploadModalVisible(false);
        setSelectedFile(null);
        setUploadSuccessModalVisible(true);

        // Reload game data to show new questions
        await loadGameData();
      } else {
        // Set failure data and show failure modal
        setUploadResult({
          message: result.message,
          count: result.validCount || 0,
          errors: result.errors || [],
        });
        setUploadModalVisible(false);
        setUploadFailureModalVisible(true);
      }
    } catch (error) {
      console.error("Error uploading questions:", error);
      setUploadResult({
        message: "Failed to upload questions. Please try again.",
        count: 0,
        errors: [error.message || "Unknown error occurred"],
      });
      setUploadModalVisible(false);
      setUploadFailureModalVisible(true);
    } finally {
      setIsUploading(false);
    }
  };

  // Download sample JSON function
  const downloadSampleJSON = async () => {
    try {
      const jsonString = JSON.stringify(SAMPLE_DD_QUESTIONS, null, 2);
      const fileName = "sample-digital-defenders-questions.json";

      if (Platform.OS === "web") {
        // Web platform: create blob and download
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showAlert("Success", "Sample JSON file downloaded successfully!");
      } else {
        // Mobile platform: save to device and share
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, jsonString);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/json",
            dialogTitle: "Save Sample Digital Defenders Questions",
          });
        } else {
          showAlert("Success", `Sample JSON saved to: ${fileUri}`);
        }
      }
    } catch (error) {
      console.error("Error downloading sample JSON:", error);
      showAlert("Error", "Failed to download sample JSON file.");
    }
  };

  const handleDeleteCard = async (card, type) => {
    console.log("🗑️ Delete card requested:", card._id, type);
    showAlert(
      "Confirm Delete",
      `Are you sure you want to delete this question?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            console.log("🗑️ Delete confirmed, starting deletion...");
            try {
              console.log("🗑️ Deleting question:", card._id);
              const result = await digitalDefendersAPI.deleteQuestion(card._id);
              console.log("🗑️ Question delete result:", result);

              // Also delete corresponding answer if it exists
              const correspondingAnswer = answerCards.find(
                (a) => a.questionId === card._id
              );
              if (correspondingAnswer) {
                console.log(
                  "🗑️ Deleting corresponding answer:",
                  correspondingAnswer._id
                );
                await digitalDefendersAPI.deleteAnswer(correspondingAnswer._id);
                console.log("🗑️ Answer deleted successfully");
              }

              if (result?.success) {
                console.log("🗑️ Deletion successful, reloading data...");
                showAlert("Success", "Question deleted successfully!");
                // Reload data to refresh the cards
                await loadGameData();
                console.log("🗑️ Data reloaded after deletion");
              } else {
                console.error("🗑️ Delete failed:", result?.message);
                showAlert(
                  "Error",
                  result?.message || "Failed to delete question"
                );
              }
            } catch (error) {
              console.error("🗑️ Error deleting question:", error);
              showAlert(
                "Error",
                "Failed to delete question. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const renderLobby = () => (
    <View style={styles.lobbyContainer}>
      <ScrollView
        style={styles.lobbyScrollView}
        contentContainerStyle={styles.lobbyScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons
            name="shield-account"
            size={80}
            color="#2acde6"
          />
          <Text style={styles.gameTitle}>🛡️ Digital Defenders</Text>
          <Text style={styles.gameSubtitle}>Turn-Based Card Defense</Text>
        </View>

        {/* Connection Status */}
        <View style={styles.connectionStatus}>
          <MaterialCommunityIcons
            name={isConnected ? "wifi" : "wifi-off"}
            size={16}
            color={isConnected ? "#10b981" : "#ef4444"}
          />
          <Text
            style={[
              styles.connectionText,
              { color: isConnected ? "#10b981" : "#ef4444" },
            ]}
          >
            {isConnected ? "Connected" : "Connecting..."}
          </Text>
        </View>

        {/* Player Name Display */}
        <View style={styles.inputContainer}>

          <View style={styles.playerNameDisplay}>
            <MaterialCommunityIcons
              name="account"
              size={20}
              color="#2acde6"
              style={styles.playerIcon}
            />
            <Text style={styles.playerNameText}>
              {playerName || "Loading..."}
            </Text>
          </View>
        </View>

        {/* Create or Join Room */}
        <View style={styles.roomActions}>
          <TouchableOpacity
            style={[
              styles.lobbyActionButton,
              styles.createRoomButton,
              (!isConnected || !playerName.trim()) &&
                styles.lobbyActionButtonDisabled,
            ]}
            onPress={createRoom}
            disabled={!isConnected || !playerName.trim()}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.lobbyActionButtonText}>Create Room</Text>
          </TouchableOpacity>

          <View style={styles.joinRoomContainer}>
            <TextInput
              style={styles.roomIdInput}
              value={roomId}
              onChangeText={(text) => {
                // Only allow letters and convert to uppercase, max 4 characters
                const filteredText = text
                  .replace(/[^A-Za-z]/g, "")
                  .toUpperCase()
                  .slice(0, 4);
                setRoomId(filteredText);
              }}
              placeholder="ABCD"
              placeholderTextColor="#666"
              maxLength={4}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[
                styles.lobbyActionButton,
                styles.joinRoomButton,
                (!isConnected || !playerName.trim() || !roomId.trim()) &&
                  styles.lobbyActionButtonDisabled,
              ]}
              onPress={joinRoom}
              disabled={!isConnected || !playerName.trim() || !roomId.trim()}
            >
              <MaterialCommunityIcons name="login" size={20} color="#FFFFFF" />
              <Text style={styles.lobbyActionButtonText}>Join Room</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Solo Play Option removed per requirement */}

        {/* Game Rules */}
        <View style={styles.gameInfoContainer}>
          <Text style={styles.sectionTitle}>Game Rules</Text>
          <View style={[styles.rulesList, { opacity: 1.0 }]}>
            <Text style={styles.ruleText}>• Survive 10 waves with 5 HP</Text>
            <Text style={styles.ruleText}>
              • Match answer cards to questions
            </Text>
            <Text style={styles.ruleText}>• Use tool cards strategically</Text>
            <Text style={styles.ruleText}>• 2 actions per turn</Text>
            <Text style={styles.ruleText}>
              • Lose 1 life if countdown reaches 0
            </Text>
            <Text style={styles.ruleText}>
              • All cards are consumed when used
            </Text>
            <Text style={styles.ruleText}>
              • ⚠️ Game ends if deck is exhausted
            </Text>
          </View>
        </View>

        {/* Instructor Tools (role restricted) */}
        {(user?.privilege === "instructor" || user?.privilege === "admin") && (
          <TouchableOpacity
            style={styles.editorButton}
            onPress={() => setShowInstructorEditor(true)}
          >
            <MaterialCommunityIcons name="pencil" size={20} color="#2be472ff" />
            <Text style={styles.editorButtonText}>Edit Cards (Instructor)</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );

  const renderWaitingRoom = () => (
    <View style={styles.lobbyContainer}>
      <ScrollView
        style={styles.lobbyScrollView}
        contentContainerStyle={styles.lobbyScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons
            name="shield-account"
            size={80}
            color="#2acde6"
          />
          <Text style={styles.gameTitle}>🛡️ Digital Defenders</Text>
          <Text style={styles.gameSubtitle}>Waiting for players...</Text>
        </View>

        {/* Room Info */}
        {roomData && (
          <View style={styles.roomInfo}>
            <Text style={styles.roomIdDisplay}>Room ID: {roomData.id}</Text>
            <Text style={styles.roomStatus}>
              Players: {roomData.players?.length || 0}/4
            </Text>
            {isCreator && (
              <Text style={styles.creatorBadge}>
                👑 You are the room creator
              </Text>
            )}
          </View>
        )}

        {/* Players List */}
        {roomData?.players && (
          <View style={styles.playersContainer}>
            <Text style={styles.sectionTitle}>Players in Room</Text>
            {roomData.players.map((player, index) => (
              <View
                key={`player-${player.id}-${index}`}
                style={styles.playerItem}
              >
                <Text style={styles.playerName}>
                  {player.name}
                  {player.id === playerId && " (You)"}
                  {player.isCreator && " 👑"}
                </Text>
                <View
                  style={[styles.playerStatus, { backgroundColor: "#10b981" }]}
                >
                  <Text style={styles.playerStatusText}>Ready</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.waitingActions}>
          {isCreator && roomData?.players?.length >= 2 && (
            <TouchableOpacity
              style={[styles.lobbyActionButton, styles.startGameButton]}
              onPress={startGameMultiplayer}
            >
              <MaterialCommunityIcons name="play" size={20} color="#3b82f6" />
              <Text style={styles.lobbyActionButtonText}>Start Game</Text>
            </TouchableOpacity>
          )}

          {isCreator && roomData?.players?.length < 2 && (
            <Text style={styles.waitingText}>
              Waiting for at least 2 players to start...
            </Text>
          )}

          {!isCreator && (
            <Text style={styles.waitingText}>
              Waiting for{" "}
              {roomData?.players?.find((p) => p.isCreator)?.name ||
                "room creator"}{" "}
              to start the game...
            </Text>
          )}

          <TouchableOpacity
            style={[styles.lobbyActionButton, styles.leaveRoomButton]}
            onPress={leaveRoom}
          >
            <MaterialCommunityIcons
              name="exit-to-app"
              size={20}
              color="#ffffff"
            />
            <Text style={styles.lobbyActionButtonText}>Leave Room</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  const renderTurnOrderSelection = () => {
    const playerCount = roomData?.players?.length || 0;
    const positions = Array.from({ length: playerCount }, (_, i) => i + 1);
    const orderedSelections = Array.from(turnOrderSelections.entries()).sort(
      (a, b) => a[1].position - b[1].position
    );

    const getOrdinalLabel = (position) => {
      const mod100 = position % 100;
      if (mod100 >= 11 && mod100 <= 13) return `${position}th`;
      const mod10 = position % 10;
      if (mod10 === 1) return `${position}st`;
      if (mod10 === 2) return `${position}nd`;
      if (mod10 === 3) return `${position}rd`;
      return `${position}th`;
    };

    return (
      <View style={styles.lobbyContainer}>
        <ScrollView
          style={styles.lobbyScrollView}
          contentContainerStyle={styles.lobbyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <View style={styles.turnOrderHeroIconWrap}>
              <MaterialCommunityIcons
                name="sword-cross"
                size={46}
                color="#9af8ff"
              />
            </View>
            <Text style={styles.gameTitle}>🛡️ Digital Defenders</Text>
            <Text style={styles.gameSubtitle}>Choose Your Turn Order</Text>
            <View style={styles.turnOrderProgressChip}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={16}
                color="#e8fcff"
              />
              <Text style={styles.turnOrderProgressText}>
                {readyPlayersCount}/{playerCount} players locked in
              </Text>
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.turnOrderInstructions}>
            <Text style={styles.instructionsTitle}>Select Your Position</Text>
            <Text style={styles.instructionsText}>
              Pick when you want to take your turn. Position 1 goes first!
            </Text>
            <Text style={styles.turnOrderHelperText}>
              Locked positions cannot be claimed by another player.
            </Text>
          </View>

          {/* Position Selection Grid */}
          <View style={styles.positionGrid}>
            {positions.map((position) => {
              const isSelected = mySelectedPosition === position;
              const isTaken = Array.from(turnOrderSelections.values()).some(
                (selection) => selection.position === position
              );
              const isMySelection = mySelectedPosition === position;
              const takenBy = Array.from(turnOrderSelections.entries()).find(
                ([_, selection]) => selection.position === position
              );

              return (
                <TouchableOpacity
                  key={position}
                  style={[
                    styles.positionButton,
                    isSelected && styles.positionButtonSelected,
                    isTaken && !isMySelection && styles.positionButtonTaken,
                    mySelectedPosition &&
                      !isMySelection &&
                      styles.positionButtonDisabled,
                  ]}
                  onPress={() => selectTurnPosition(position)}
                  disabled={isTaken || (mySelectedPosition && !isMySelection)}
                  activeOpacity={0.86}
                >
                  <View style={styles.positionStateBadge}>
                    <Text style={styles.positionStateBadgeText}>
                      {isMySelection
                        ? "LOCKED"
                        : isTaken
                        ? "TAKEN"
                        : "OPEN"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.positionButtonText,
                      isSelected && styles.positionButtonTextSelected,
                      isTaken &&
                        !isMySelection &&
                        styles.positionButtonTextTaken,
                    ]}
                  >
                    {position}
                  </Text>
                  <Text
                    style={[
                      styles.positionLabel,
                      isSelected && styles.positionLabelSelected,
                      isTaken && !isMySelection && styles.positionLabelTaken,
                    ]}
                  >
                    {getOrdinalLabel(position)}
                  </Text>
                  {takenBy && (
                    <Text
                      style={[
                        styles.playerNameOnPosition,
                        isMySelection && styles.playerNameOnPositionSelected,
                      ]}
                    >
                      {isMySelection ? "You" : takenBy[1].playerName}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Current Selections Display */}
          {turnOrderSelections.size > 0 && (
            <View style={styles.currentSelections}>
              <Text style={styles.currentSelectionsTitle}>
                Current Selections:
              </Text>
              {orderedSelections.map(([selectedPlayerId, selection]) => (
                <View key={selectedPlayerId} style={styles.selectionItem}>
                  <MaterialCommunityIcons
                    name="shield-account-outline"
                    size={16}
                    color="#dffcff"
                  />
                  <Text style={styles.selectionText}>
                    Position {selection.position}: {" "}
                    {selectedPlayerId === playerId ? "You" : selection.playerName}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Final Turn Order Display */}
          {finalTurnOrder.length > 0 && (
            <View style={styles.finalTurnOrder}>
              <Text style={styles.finalTurnOrderTitle}>Final Turn Order:</Text>
              {finalTurnOrder.map((player, index) => (
                <View key={player.socketId} style={styles.finalOrderItem}>
                  <MaterialCommunityIcons
                    name="medal-outline"
                    size={16}
                    color="#dffcff"
                  />
                  <Text style={styles.finalOrderText}>
                    {index + 1}. {player.playerName}
                  </Text>
                </View>
              ))}
              <Text style={styles.gameStartingSoon}>Game starting soon...</Text>
            </View>
          )}

          {/* Leave Room Button */}
          <View style={styles.lobbyActions}>
            <TouchableOpacity
              style={[styles.lobbyActionButton, styles.leaveRoomButton]}
              onPress={leaveRoom}
            >
              <MaterialCommunityIcons
                name="exit-to-app"
                size={20}
                color="#ffffff"
              />
              <Text style={styles.lobbyActionButtonText}>Leave Room</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderGameplay = () => (
    <View style={styles.gameplayContainer}>
      {/* Game Header */}
      <View style={styles.gameHeader}>
        <View style={styles.gameStats}>
          <Text style={styles.waveText}>Wave {currentWave}/10</Text>
          <View style={styles.healthContainer}>
            {Array.from({ length: 5 }, (_, i) => (
              <MaterialCommunityIcons
                key={`heart-${i}`}
                name={i < pcHealth ? "heart" : "heart-outline"}
                size={20}
                color={i < pcHealth ? "#e74c3c" : "#666"}
              />
            ))}
          </View>
          <Text style={styles.actionsText}>Actions: {actionsLeft}/2</Text>
        </View>

        {/* Turn Indicator - Only show in multiplayer */}
        {roomData && (
          <View style={styles.turnIndicatorContainer}>
            <View
              style={[
                styles.turnIndicator,
                isMyTurn ? styles.myTurnIndicator : styles.otherTurnIndicator,
              ]}
            >
              <MaterialCommunityIcons
                name={isMyTurn ? "account" : "account-outline"}
                size={16}
                color={isMyTurn ? "#fff" : "#e2e8f0"}
              />
              <Text
                style={[
                  styles.turnIndicatorText,
                  isMyTurn ? styles.myTurnText : styles.otherTurnText,
                ]}
              >
                {isMyTurn ? "Your Turn" : `${currentPlayerName}'s Turn`}
              </Text>
            </View>
            {!isMyTurn && (
              <Text style={styles.waitingText}>Wait for your turn...</Text>
            )}
          </View>
        )}

        <View style={styles.countdownContainer}>
          <Text
            style={[
              styles.countdownText,
              countdown <= 3 && styles.countdownCritical,
              freezeCountdown > 0 && styles.countdownFrozen,
            ]}
          >
            {freezeCountdown > 0 ? `🧊 ${countdown}` : countdown}
          </Text>
          {freezeCountdown > 0 && (
            <Text style={styles.freezeText}>Frozen: {freezeCountdown}</Text>
          )}
        </View>
      </View>

      {/* Question Card Area */}
      <View style={styles.questionArea}>
        {currentQuestion && (
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{currentQuestion.text}</Text>
            {selectedCard && (
              <View style={styles.instructionIndicator}>
                <MaterialCommunityIcons
                  name="gesture-tap"
                  size={24}
                  color="#2ecc71"
                />
                <Text style={styles.instructionText}>
                  Tap selected card again to activate
                </Text>
              </View>
            )}
            {playerHand.length === 0 && deck.length === 0 && (
              <View style={styles.noCardsWarning}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={24}
                  color="#e74c3c"
                />
                <Text style={styles.noCardsText}>
                  No cards remaining - can only skip turns
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Player Hand */}
      <View style={styles.handContainer}>
        <View style={styles.handHeader}>
          <Text style={styles.handTitle}>Your Hand</Text>
          <View style={styles.deckStatus}>
            <Text style={[styles.deckCount, { opacity: 1 }]}>
              Deck: {deck.length} | Used: {usedCards.length}
            </Text>
            {deck.length === 0 && playerHand.length > 0 && (
              <Text style={[styles.deckWarning, { opacity: 1 }]}>
                ⚠️ No cards to draw
              </Text>
            )}
            {deck.length === 0 && playerHand.length === 0 && (
              <Text style={[styles.deckEmpty, { opacity: 1 }]}>
                ❌ All cards exhausted
              </Text>
            )}
          </View>
        </View>

        {/* Turn restriction overlay */}
        {roomData && !isMyTurn && (
          <View style={styles.turnRestrictionOverlay}>
            <MaterialCommunityIcons
              name="account-clock"
              size={24}
              color="#666"
            />
            <Text style={styles.turnRestrictionText}>
              Wait for {currentPlayerName}&apos;s turn to finish
            </Text>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[
            styles.handScroll,
            roomData && !isMyTurn && styles.handScrollDisabled,
          ]}
        >
          {playerHand.length === 0 ? (
            <View style={styles.emptyHandIndicator}>
              <MaterialCommunityIcons
                name="cards-outline"
                size={40}
                color="#666"
              />
              <Text style={styles.emptyHandText}>No cards left</Text>
              <Text style={styles.emptyHandSubtext}>
                {deck.length > 0
                  ? "Cards will be drawn next turn"
                  : "Deck is empty - can only skip"}
              </Text>
            </View>
          ) : (
            playerHand.map((card, index) => {
              const isSelected = selectedCard && selectedCard.id === card.id;
              const isDisabled = roomData && !isMyTurn;

              return (
                <TouchableOpacity
                  key={`hand-${card.id}-${index}`}
                  style={[
                    styles.card,
                    card.type === "tool" && styles.toolCard,
                    isSelected && styles.cardSelected, // Green highlight when selected
                    isDisabled && styles.cardDisabled, // Disabled when not player's turn
                  ]}
                  onPress={() => handleCardTap(card)}
                  activeOpacity={isDisabled ? 0.3 : 0.8}
                  disabled={isDisabled}
                >
                  <LinearGradient
                    colors={
                      card.type === "tool"
                        ? ["rgba(139, 92, 246, 0.7)", "rgba(79, 32, 166, 0.8)"]
                        : ["rgba(253, 241, 187, 1)", "rgba(248, 212, 158, 0.9)"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                  >
                    {card.type === "tool" ? (
                      // Tool cards keep their header and description
                      <>
                        <View style={styles.cardHeader}>
                          <MaterialCommunityIcons
                            name={card.icon}
                            size={16}
                            color="#2acde6"
                          />
                          <Text style={styles.cardName}>
                            {card.name || card.text}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.cardDescription,
                            isSelected && styles.cardDescriptionOnDark,
                          ]}
                        >
                          {card.description || card.text}
                        </Text>
                        <View style={styles.toolIndicator}>
                          <Text style={styles.toolText}>TOOL</Text>
                        </View>
                      </>
                    ) : (
                      // Answer cards only show the answer text, no header
                      <View style={styles.answerCardContent}>
                        <Text style={styles.answerCardText}>
                          {card.text || card.name}
                        </Text>
                      </View>
                    )}
                    {isSelected && (
                      <View style={styles.selectedIndicator}>
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={20}
                          color="#2ecc71"
                        />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            (actionsLeft === 0 || (roomData && !isMyTurn)) &&
              styles.actionButtonDisabled,
          ]}
          onPress={skipTurn}
          disabled={actionsLeft === 0 || (roomData && !isMyTurn)}
        >
          <MaterialCommunityIcons name="skip-next" size={20} color="#3b82f6" />
          <Text style={styles.actionButtonText}>
            {roomData && !isMyTurn ? "Not Your Turn" : "Skip Turn"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.reshuffleButton,
            (actionsLeft === 0 ||
              playerHand.length === 0 ||
              (roomData && !isMyTurn)) &&
              styles.actionButtonDisabled,
          ]}
          onPress={reshuffle}
          disabled={
            actionsLeft === 0 ||
            playerHand.length === 0 ||
            (roomData && !isMyTurn)
          }
        >
          <MaterialCommunityIcons name="shuffle" size={20} color="#3b82f6" />
          <Text style={styles.actionButtonText}>
            {roomData && !isMyTurn
              ? "Not Your Turn"
              : playerHand.length === 0
              ? "No Cards to Reshuffle"
              : "Reshuffle"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGameOver = () => {
    const getGameOverMessage = () => {
      switch (gameOverReason) {
        case "deck_empty":
          return {
            icon: "cards-off",
            title: "Deck Exhausted!",
            message: "All cards have been consumed! Your defenses have failed.",
            subtitle: `Cards lasted through Wave ${currentWave}/10`,
          };
        case "health_depleted":
          return {
            icon: "skull",
            title: "PC Compromised!",
            message: "Your PC health has been depleted by failed defenses.",
            subtitle: `You reached Wave ${currentWave}/10`,
          };
        case "no_cards_remaining":
          return {
            icon: "trophy",
            title: gameEndData?.isTie ? "It's a Tie!" : "Game Complete!",
            message: gameEndData?.message || "All players are out of cards!",
            subtitle: `Final Wave: ${
              gameEndData?.finalWave || currentWave
            } | Final Health: ${gameEndData?.finalHealth || pcHealth}/5`,
          };
        case "invalid_session":
          return {
            icon: "account-alert",
            title: "Session Invalid",
            message:
              gameEndData?.message ||
              "This game session is no longer valid. Start a new match to continue.",
            subtitle: "Please rejoin from the lobby.",
          };
        default:
          return {
            icon: "skull",
            title: "Game Over",
            message: "Your PC has been compromised!",
            subtitle: `You reached Wave ${currentWave}/10`,
          };
      }
    };

    const gameOverInfo = getGameOverMessage();

    return (
      <View style={styles.gameOverContainer}>
        <View style={styles.gameOverContent}>
          <MaterialCommunityIcons
            name={gameOverInfo.icon}
            size={80}
            color={
              gameOverReason === "no_cards_remaining" ? "#f39c12" : "#e74c3c"
            }
          />
          <Text style={styles.gameOverTitle}>{gameOverInfo.title}</Text>
          <Text style={styles.gameOverText}>{gameOverInfo.message}</Text>
          <Text style={styles.gameOverSubtext}>{gameOverInfo.subtitle}</Text>

          {gameOverReason === "deck_empty" && (
            <View style={styles.gameOverStats}>
              <Text style={styles.gameOverStatText}>
                Cards Used: {usedCards.length}/15
              </Text>
              <Text style={styles.gameOverStatText}>
                Final Health: {pcHealth}/5
              </Text>
            </View>
          )}

          {gameOverReason === "no_cards_remaining" && gameEndData && (
            <View style={styles.gameOverStats}>
              <Text style={styles.gameOverStatTitle}>Final Scores:</Text>
              {gameEndData.playerStats?.map((player, index) => (
                <View key={player.playerId} style={styles.playerScoreContainer}>
                  <Text
                    style={[
                      styles.playerScoreText,
                      gameEndData.winner?.playerId === player.playerId &&
                      !gameEndData.isTie
                        ? styles.winnerText
                        : null,
                    ]}
                  >
                    {index + 1}. {player.playerName}: {player.score} points
                  </Text>
                  <Text style={styles.playerScoreDetails}>
                    Waves: {player.wavesCompleted} | Health:{" "}
                    {player.healthRemaining}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.restartButton}
            onPress={() => setGameState("lobby")}
          >
            <MaterialCommunityIcons name="restart" size={20} color="#ffffff" />
            <Text style={styles.restartButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderVictory = () => (
    <View
      style={[
        styles.victoryContainer,
        Platform.OS === "web" && styles.victoryContainerWeb,
      ]}
    >
      <LinearGradient
        colors={["rgba(255,255,255,0.98)", "rgba(246,253,250,0.96)"]}
        style={[
          styles.victoryContent,
          Platform.OS === "web" && styles.victoryContentWeb,
        ]}
      >
        <View
          style={[
            styles.victoryHeroBadge,
            Platform.OS === "web" && styles.victoryHeroBadgeWeb,
          ]}
        >
          <MaterialCommunityIcons
            name="trophy"
            size={Platform.OS === "web" ? 52 : 42}
            color="#f59e0b"
          />
        </View>

        <Text style={styles.victoryTitle}>Mission Complete</Text>
        <Text
          style={[
            styles.victoryText,
            Platform.OS === "web" && styles.victoryTextWeb,
          ]}
        >
          You successfully defended your system through all 10 waves.
        </Text>

        <View
          style={[
            styles.victoryStatsRow,
            Platform.OS === "web" && styles.victoryStatsRowWeb,
          ]}
        >
          <View style={styles.victoryStatCard}>
            <MaterialCommunityIcons
              name="heart-pulse"
              size={18}
              color={PREMIUM_ACCENT_DARK}
            />
            <Text style={styles.victoryStatLabel}>Final HP</Text>
            <Text style={styles.victoryStatValue}>{pcHealth}/5</Text>
          </View>
          <View style={styles.victoryStatCard}>
            <MaterialCommunityIcons
              name="shield-check"
              size={18}
              color={PREMIUM_ACCENT_DARK}
            />
            <Text style={styles.victoryStatLabel}>Waves Cleared</Text>
            <Text style={styles.victoryStatValue}>10/10</Text>
          </View>
        </View>

        <View style={styles.victoryTagRow}>
          <View style={styles.victoryTagChip}>
            <MaterialCommunityIcons
              name="star-four-points"
              size={14}
              color="#f8fafc"
            />
            <Text style={styles.victoryTagText}>Perfect Defense Run</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.victoryRestartButton,
            Platform.OS === "web" && styles.victoryRestartButtonWeb,
          ]}
          onPress={() => setGameState("lobby")}
        >
          <MaterialCommunityIcons name="restart" size={19} color="#f8fafc" />
          <Text style={styles.victoryRestartButtonText}>Play Again</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  const renderInstructorEditor = () => {
    const editorBody = (
      <>
        {renderImportDocsModal?.()}
        {renderActionsMenuModal?.()}
        <View style={styles.editorHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowInstructorEditor(false)}
          >
            <MaterialCommunityIcons
              name="close"
              size={24}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
          <View style={styles.editorTitleBlock}>
            <Text style={styles.editorTitle}>Edit Cards</Text>
            <Text style={styles.editorSubtitle}>Digital Defenders Question Manager</Text>
          </View>
          <TouchableOpacity
            style={styles.moreMenuButton}
            onPress={() => setShowActionsMenu(true)}
          >
            <MaterialCommunityIcons
              name="dots-vertical"
              size={26}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.editorContent}>
            <Text style={styles.editorSectionTitle}>
              Question Cards by Wave
            </Text>
            <Text style={styles.editorSectionSubtitle}>
              Organize questions by waves (max 5 questions per wave, max 10
              waves). You can also upload questions via JSON file using the
              Upload JSON button above.
            </Text>

            {/* Render waves 1-10 */}
            {Array.from({ length: 10 }, (_, waveIndex) => {
              const waveNumber = waveIndex + 1;
              const waveQuestions = questionCards.filter(
                (card) => card.wave === waveNumber
              );

              return (
                <View key={`wave-${waveNumber}`} style={styles.waveSection}>
                  <View style={styles.waveSectionHeader}>
                    <Text style={styles.waveSectionTitle}>
                      🌊 Wave {waveNumber}
                    </Text>
                    <Text style={styles.waveSectionCounter}>
                      {waveQuestions.length}/5 questions
                    </Text>
                  </View>

                  {waveQuestions.length < 5 && (
                    <TouchableOpacity
                      style={styles.createCardButton}
                      onPress={() => openCreateForm("question", waveNumber)}
                    >
                      <MaterialCommunityIcons
                        name="plus"
                        size={20}
                        color="#2acde6"
                      />
                      <Text style={styles.createCardButtonText}>
                        Add Question to Wave {waveNumber}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {waveQuestions.length >= 5 && (
                    <View style={styles.waveFullNotice}>
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={16}
                        color="#4CAF50"
                      />
                      <Text style={styles.waveFullText}>
                        Wave {waveNumber} is full (5/5 questions)
                      </Text>
                    </View>
                  )}

                  {waveQuestions.map((card, index) => (
                    <View
                      key={`question-${card.id}-${index}`}
                      style={styles.editorCard}
                    >
                      <Text style={styles.editorCardTitle}>
                        Question {index + 1}
                      </Text>
                      <Text style={styles.editorCardText}>{card.text}</Text>
                      <Text style={styles.editorCardAnswer}>
                        Answer: {card.correctAnswer}
                      </Text>
                      <Text style={styles.editorCardMeta}>
                        Difficulty: {getDifficultyLabel(card.difficulty)}
                      </Text>
                      <View style={styles.cardActionButtons}>
                        <TouchableOpacity
                          style={styles.editCardButton}
                          onPress={() => openEditForm(card)}
                        >
                          <MaterialCommunityIcons
                            name="pencil"
                            size={16}
                            color="#2acde6"
                          />
                          <Text style={styles.editCardButtonText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteCardButton}
                          onPress={() => handleDeleteCard(card, "question")}
                        >
                          <MaterialCommunityIcons
                            name="delete"
                            size={16}
                            color="#ef4444"
                          />
                          <Text style={styles.deleteCardButtonText}>
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {waveQuestions.length === 0 && (
                    <View style={styles.emptyWaveNotice}>
                      <Text style={styles.emptyWaveText}>
                        No questions in this wave yet
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            <Text style={[styles.editorSectionTitle, { marginTop: 30 }]}>
              Tool Cards (Non-editable)
            </Text>
            {TOOL_CARDS.map((card) => (
              <View
                key={`tool-${card.id}`}
                style={[styles.editorCard, styles.editorCardDisabled]}
              >
                <View style={styles.toolCardHeader}>
                  <MaterialCommunityIcons
                    name={card.icon}
                    size={20}
                    color="#666"
                  />
                  <Text
                    style={[
                      styles.editorCardTitle,
                      styles.editorCardTitleDisabled,
                    ]}
                  >
                    {card.name}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.editorCardDescription,
                    styles.editorCardDescriptionDisabled,
                  ]}
                >
                  {card.description}
                </Text>
              </View>
            ))}
        </ScrollView>
      </>
    );

    return (
      <Modal
        visible={showInstructorEditor}
        animationType={Platform.OS === "web" ? "fade" : "slide"}
        transparent={Platform.OS === "web"}
        onRequestClose={() => setShowInstructorEditor(false)}
      >
        {Platform.OS === "web" ? (
          <View style={styles.editorWebModalOverlay}>
            <TouchableWithoutFeedback onPress={() => setShowInstructorEditor(false)}>
              <View style={styles.editorWebModalBackdrop} />
            </TouchableWithoutFeedback>

            <LinearGradient colors={PREMIUM_GRADIENT} style={styles.editorWebModalCard}>
              <SafeAreaView style={styles.safeArea}>{editorBody}</SafeAreaView>
            </LinearGradient>
          </View>
        ) : (
          <LinearGradient colors={PREMIUM_GRADIENT} style={styles.container}>
            <SafeAreaView style={styles.safeArea}>{editorBody}</SafeAreaView>
          </LinearGradient>
        )}
      </Modal>
    );
  };

  // Edit form modal
  const renderEditForm = () => {
    const difficultyMeta = {
      easy: { label: "Easy", icon: "leaf" },
      medium: { label: "Medium", icon: "sword-cross" },
      hard: { label: "Hard", icon: "shield-alert" },
    };

    const editFormBody = (
      <SafeAreaView style={styles.editFormSafeArea}>
        <View style={styles.editFormHeader}>
          <TouchableOpacity
            style={styles.editFormCloseButton}
            onPress={() => setShowEditForm(false)}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={PREMIUM_TEXT} />
          </TouchableOpacity>

          <View style={styles.editFormTitleBlock}>
            <Text style={styles.editFormTitle}>{editingCard ? "Edit Question" : "Create Question"}</Text>
            <Text style={styles.editFormSubtitle}>Digital Defenders Question Builder</Text>
          </View>

          <View style={styles.editFormHeaderBadge}>
            <MaterialCommunityIcons name="shield-sword" size={18} color={PREMIUM_ACCENT_DARK} />
          </View>
        </View>

        <ScrollView
          style={styles.editFormScroll}
          contentContainerStyle={styles.editFormScrollContent}
          showsVerticalScrollIndicator
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.98)", "rgba(246,253,250,0.96)"]}
            style={styles.editFormHeroCard}
          >
            <Text style={styles.editFormHeroTitle}>Craft a polished challenge card</Text>
            <Text style={styles.editFormHeroText}>
              Keep wording clear and concise so players can answer quickly during turns.
            </Text>
          </LinearGradient>

          <View style={styles.editFormFieldCard}>
            <Text style={styles.editFormLabel}>Question Text *</Text>
            <Text style={styles.editFormLabelHint}>This appears to players during battle.</Text>
            <TextInput
              style={[styles.editFormInput, styles.editFormInputMultiline]}
              value={formData.text}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, text }))}
              placeholder="Enter the question..."
              placeholderTextColor="rgba(51, 65, 85, 0.6)"
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.editFormFieldCard}>
            <Text style={styles.editFormLabel}>Correct Answer *</Text>
            <Text style={styles.editFormLabelHint}>Accepted answer that validates the card.</Text>
            <TextInput
              style={styles.editFormInput}
              value={formData.correctAnswer}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, correctAnswer: text }))
              }
              placeholder="Enter the correct answer..."
              placeholderTextColor="rgba(51, 65, 85, 0.6)"
            />
          </View>

          <View style={styles.editFormFieldCard}>
            <Text style={styles.editFormLabel}>Difficulty Tier</Text>
            <View style={styles.editFormDifficultyRow}>
              {["easy", "medium", "hard"].map((level) => {
                const isSelected = formData.difficulty === level;
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.editFormDifficultyButton,
                      isSelected && styles.editFormDifficultyButtonSelected,
                    ]}
                    onPress={() => setFormData((prev) => ({ ...prev, difficulty: level }))}
                  >
                    <MaterialCommunityIcons
                      name={difficultyMeta[level].icon}
                      size={16}
                      color={isSelected ? "#f8fafc" : PREMIUM_ACCENT_DARK}
                    />
                    <Text
                      style={[
                        styles.editFormDifficultyButtonText,
                        isSelected && styles.editFormDifficultyButtonTextSelected,
                      ]}
                    >
                      {difficultyMeta[level].label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.editFormNoteCard}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={PREMIUM_ACCENT_DARK} />
            <Text style={styles.editFormNoteText}>
              Saving this entry auto-generates the answer card pair. Wave assignment follows the active editor section.
            </Text>
          </View>

          <View style={styles.editFormButtonContainer}>
            <TouchableOpacity
              style={styles.editFormCancelButton}
              onPress={() => setShowEditForm(false)}
            >
              <Text style={styles.editFormCancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.editFormSubmitButton} onPress={handleFormSubmit}>
              <MaterialCommunityIcons name="content-save-outline" size={18} color="#f8fafc" />
              <Text style={styles.editFormSubmitButtonText}>{editingCard ? "Update" : "Create"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );

    return (
      <Modal
        visible={showEditForm}
        animationType={Platform.OS === "web" ? "fade" : "slide"}
        transparent={Platform.OS === "web"}
        onRequestClose={() => setShowEditForm(false)}
      >
        {Platform.OS === "web" ? (
          <View style={styles.editFormWebModalOverlay}>
            <TouchableWithoutFeedback onPress={() => setShowEditForm(false)}>
              <View style={styles.editFormWebModalBackdrop} />
            </TouchableWithoutFeedback>
            <LinearGradient colors={PREMIUM_GRADIENT} style={styles.editFormWebModalCard}>
              {editFormBody}
            </LinearGradient>
          </View>
        ) : (
          <LinearGradient colors={PREMIUM_GRADIENT} style={styles.container}>
            {editFormBody}
          </LinearGradient>
        )}
      </Modal>
    );
  };

  // Cross-platform feedback modal
  const renderFeedbackModal = () => (
    <Modal visible={showFeedback} transparent animationType="fade">
      <View style={styles.feedbackOverlay}>
        <View style={styles.feedbackContainer}>
          <MaterialCommunityIcons
            name={feedbackData.isCorrect ? "check-circle" : "close-circle"}
            size={60}
            color={feedbackData.isCorrect ? "#4CAF50" : "#FF6B6B"}
          />
          <Text
            style={[
              styles.feedbackTitle,
              { color: feedbackData.isCorrect ? "#4CAF50" : "#FF6B6B" },
            ]}
          >
            {feedbackData.title}
          </Text>
          <Text style={styles.feedbackMessage}>{feedbackData.message}</Text>
          <TouchableOpacity
            style={[
              styles.feedbackButton,
              {
                backgroundColor: feedbackData.isCorrect ? "#4CAF50" : "#FF6B6B",
              },
            ]}
            onPress={() => setShowFeedback(false)}
          >
            <Text style={styles.feedbackButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Wave transition modal
  const renderWaveTransitionModal = () => (
    <Modal visible={showWaveTransition} transparent animationType="fade">
      <View style={styles.waveTransitionOverlay}>
        <View style={styles.waveTransitionContainer}>
          <MaterialCommunityIcons
            name="shield-sword-outline"
            size={100}
            color="#2acde6"
          />
          <Text style={styles.waveTransitionTitle}>
            WAVE {currentWave - 1} COMPLETE!
          </Text>
          <View style={styles.waveTransitionDivider} />
          <MaterialCommunityIcons
            name="sword-cross"
            size={60}
            color="#00E5FF"
          />
          <Text style={styles.waveTransitionSubtitle}>
            Entering Wave {currentWave}
          </Text>
          <Text style={styles.waveTransitionDescription}>
            New challenges await!
          </Text>
          <View style={styles.waveTransitionProgress}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((currentWave - 1) / 10) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentWave - 1}/10 Waves Complete
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Upload modal for JSON file selection
  const renderUploadModal = () => (
    <Modal
      visible={uploadModalVisible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.uploadModalOverlay}>
        <View style={styles.uploadModalContainer}>
          <Text style={styles.uploadModalTitle}>Upload Questions</Text>

          {selectedFile && (
            <View style={styles.fileInfoContainer}>
              <Text style={styles.fileInfoText}>File: {selectedFile.name}</Text>
              <Text style={styles.fileInfoDetails}>
                Size: {(selectedFile.size / 1024).toFixed(2)} KB
              </Text>
            </View>
          )}

          <Text style={styles.uploadModalDescription}>
            This will add the questions from your JSON file to the global
            Digital Defenders question bank. Make sure your JSON file contains
            an array of question objects with the following format:
          </Text>

          <View style={styles.formatExample}>
            <Text style={styles.formatExampleText}>
              {`[
  {
    "question": "Your question text",
    "correctAnswer": "The correct answer",
    "difficulty": "Easy/Medium/Hard",
    "wave": 1,
    "description": "Optional description"
  }
]`}
            </Text>
          </View>

          <View style={styles.uploadModalActions}>
            <TouchableOpacity
              style={[styles.uploadModalButton, styles.uploadModalCancelButton]}
              onPress={() => {
                setUploadModalVisible(false);
                setSelectedFile(null);
              }}
            >
              <Text style={styles.uploadModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.uploadModalButton,
                styles.uploadModalUploadButton,
                isUploading && styles.uploadModalButtonDisabled,
              ]}
              onPress={uploadQuestions}
              disabled={isUploading}
            >
              <Text style={styles.uploadModalButtonText}>
                {isUploading ? "Uploading..." : "Upload"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Success modal for upload results
  const renderUploadSuccessModal = () => (
    <Modal
      visible={uploadSuccessModalVisible}
      animationType="fade"
      transparent={true}
    >
      <View style={styles.uploadResultOverlay}>
        <View style={styles.uploadResultContainer}>
          <MaterialCommunityIcons
            name="check-circle"
            size={80}
            color="#4CAF50"
          />
          <Text style={styles.uploadResultTitle}>Upload Successful!</Text>
          <Text style={styles.uploadResultMessage}>
            {uploadResult?.message}
          </Text>
          <TouchableOpacity
            style={styles.uploadResultButton}
            onPress={() => setUploadSuccessModalVisible(false)}
          >
            <Text style={styles.uploadResultButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Failure modal for upload errors
  const renderUploadFailureModal = () => (
    <Modal
      visible={uploadFailureModalVisible}
      animationType="fade"
      transparent={true}
    >
      <View style={styles.uploadResultOverlay}>
        <View style={styles.uploadResultContainer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={80}
            color="#f44336"
          />
          <Text style={styles.uploadResultTitle}>Upload Issues</Text>
          <Text style={styles.uploadResultMessage}>
            {uploadResult?.message}
          </Text>

          {uploadResult?.errors && uploadResult.errors.length > 0 && (
            <ScrollView
              style={styles.errorScrollView}
              showsVerticalScrollIndicator
            >
              <Text style={styles.errorTitle}>Errors found:</Text>
              {uploadResult.errors.map((error, index) => (
                <Text key={index} style={styles.errorText}>
                  • {error}
                </Text>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.uploadResultButton}
            onPress={() => setUploadFailureModalVisible(false)}
          >
            <Text style={styles.uploadResultButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <ImageBackground
      source={DEFENDERS_BG}
      style={styles.container}
      resizeMode="cover"
      imageStyle={Platform.OS === "web" ? styles.defendersBackgroundImageWeb : undefined}
    >
      <LinearGradient colors={DEFENDERS_BG_GRADIENT} style={styles.defendersBackgroundOverlay}>
      <SafeAreaView style={styles.safeArea}>
        {renderImportDocsModal?.()}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                requestQuitConfirmation(() => router.push("/(tabs)/game"))
              }
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color="#f8fafc"
              />
            </TouchableOpacity>
            <Text style={styles.title}>🛡️ Digital Defenders</Text>
          </View>
        </View>

        {/* Loading / auth states */}
        {(!user || !token) && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>🔐 Authenticating...</Text>
            <Text style={styles.waitingText}>
              User: {user ? "✅" : "❌"} | Token: {token ? "✅" : "❌"}
            </Text>
          </View>
        )}
        {user && token && isDataLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>🎮 Loading game data...</Text>
          </View>
        )}
        {/* Show game content when ready */}
        {user && token && !isDataLoading && (
          <>
            {gameState === "lobby" && renderLobby()}
            {gameState === "waiting" && renderWaitingRoom()}
            {gameState === "turnOrder" && renderTurnOrderSelection()}
            {gameState === "playing" && renderGameplay()}
            {gameState === "gameOver" && renderGameOver()}
            {gameState === "victory" && renderVictory()}
          </>
        )}

        {renderInstructorEditor()}
        {renderEditForm()}
        {renderFeedbackModal()}
        {renderWaveTransitionModal()}
        {renderUploadModal()}
        {renderUploadSuccessModal()}
        {renderUploadFailureModal()}
      </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

// Wrap with memo for performance optimization
export default memo(DigitalDefenders);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  defendersBackgroundImageWeb: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  defendersBackgroundOverlay: {
    flex: 1,
    ...Platform.select({
      web: {
        alignItems: "center",
      },
      default: {},
    }),
  },
  safeArea: {
    flex: 1,
    width: "100%",
    ...Platform.select({
      web: {
        maxWidth: 1200,
        alignSelf: "center",
      },
      default: {},
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 6,
    borderBottomWidth: 0,
    position: "relative",
    justifyContent: "center",
    minHeight: 48,
    backgroundColor: "transparent",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
    paddingHorizontal: 4,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginRight: 10,
    borderRadius: 0,
    backgroundColor: "transparent",
  },
  debugButton: {
    padding: 5,
    position: "absolute", // Position absolutely
    right: 10, // Align to right edge with padding
    zIndex: 10, // Ensure it's above other elements
    alignSelf: "center", // Vertical center
    backgroundColor: "rgba(74, 124, 89, 0.2)",
    borderRadius: 15,
  },
  title: {
    fontSize: 23,
    fontWeight: "800",
    color: "#f8fafc",
    textAlign: "left",
    alignSelf: "flex-start",
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: "#f8fafc",
    textAlign: "center",
    marginBottom: 10,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
  },

  // Lobby Styles
  lobbyContainer: {
    flex: 1,
  },
  lobbyScrollView: {
    flex: 1,
  },
  lobbyScrollContent: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
    alignSelf: Platform.OS === "web" ? "center" : undefined,
    width: Platform.OS === "web" ? 800 : "100%",
    maxWidth: "100%",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  gameTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#f8fafc",
    marginTop: 15,
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gameSubtitle: {
    fontSize: 16,
    color: "#dbeafe",
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  lobbyErrorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  playerCountContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 15,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  playerCountButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
  },
  playerCountButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(74, 124, 89, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(74, 124, 89, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  playerCountButtonActive: {
    backgroundColor: "#2acde6",
    borderColor: "#2acde6",
  },
  playerCountText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  playerCountTextActive: {
    color: COLORS.textPrimary,
  },
  gameInfoContainer: {
    marginBottom: 30,
  },
  rulesList: {
    backgroundColor: PREMIUM_SURFACE,
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  ruleText: {
    color: PREMIUM_MUTED,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  buttonContainer: {
    gap: 15,
  },
  startButton: {
    backgroundColor: PREMIUM_ACCENT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 15,
    gap: 10,
    shadowColor: PREMIUM_ACCENT_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  startButtonText: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
  },
  editorButton: {
    backgroundColor: "rgba(15, 23, 42, 0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.22)",
    gap: 8,
  },
  editorButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  // New Lobby Styles
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    gap: 8,
  },
  connectionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: PREMIUM_TEXT,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: PREMIUM_SURFACE,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: PREMIUM_TEXT,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.14)",
  },
  playerNameDisplay: {
    backgroundColor: PREMIUM_SURFACE,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.14)",
  },
  playerIcon: {
    marginRight: 12,
  },
  playerNameText: {
    color: PREMIUM_TEXT,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  roomActions: {
    marginBottom: 30,
    gap: 15,
  },
  lobbyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
  },
  lobbyActionButtonDisabled: {
    opacity: 0.5,
  },
  lobbyActionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  createRoomButton: {
    backgroundColor: PREMIUM_ACCENT,
  },
  joinRoomContainer: {
    flexDirection: "row",
    gap: 10,
  },
  roomIdInput: {
    flex: 1,
    backgroundColor: PREMIUM_SURFACE,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: PREMIUM_TEXT,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.14)",
    textAlign: "center",
    textTransform: "uppercase",
  },
  joinRoomButton: {
    backgroundColor: PREMIUM_ACCENT_DARK,
    paddingHorizontal: 20,
  },
  // soloPlayContainer, orText, soloPlayButton removed (Play Solo feature deprecated)

  // Waiting Room Styles
  roomInfo: {
    backgroundColor: PREMIUM_SURFACE,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  roomIdDisplay: {
    fontSize: 24,
    fontWeight: "800",
    color: PREMIUM_TEXT,
    marginBottom: 8,
  },
  roomStatus: {
    fontSize: 16,
    color: PREMIUM_MUTED,
    marginBottom: 8,
  },
  creatorBadge: {
    fontSize: 14,
    color: "#f1c40f",
    fontWeight: "600",
  },
  playersContainer: {
    marginBottom: 30,
  },
  playerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: PREMIUM_SURFACE,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  playerName: {
    fontSize: 16,
    color: PREMIUM_TEXT,
    fontWeight: "700",
  },
  playerStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  playerStatusText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  waitingActions: {
    gap: 15,
  },
  startGameButton: {
    backgroundColor: "#10b981",
  },
  leaveRoomButton: {
    backgroundColor: "#ef4444",
  },
  waitingText: {
    fontSize: 16,
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 15,
    fontStyle: "italic",
  },

  // Gameplay Styles
  gameplayContainer: {
    flex: 1,
    padding: 15,
    alignSelf: Platform.OS === "web" ? "center" : undefined,
    width: Platform.OS === "web" ? 800 : "100%",
  },
  gameHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  gameStats: {
    alignItems: "flex-start",
  },
  waveText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f8fafc",
    marginBottom: 5,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  healthContainer: {
    flexDirection: "row",
    marginBottom: 5,
  },
  actionsText: {
    fontSize: 14,
    color: "#dbeafe",
  },
  countdownContainer: {
    alignItems: "center",
  },
  countdownText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#2ecc71",
    textAlign: "center",
  },
  countdownCritical: {
    color: "#e74c3c",
  },
  countdownFrozen: {
    color: "#3498db",
  },
  freezeText: {
    fontSize: 12,
    color: "#3498db",
    marginTop: 5,
  },

  // Turn Indicator Styles
  turnIndicatorContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: 10,
  },
  turnIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 4,
  },
  myTurnIndicator: {
    backgroundColor: "#2acde6",
    borderColor: "#2acde6",
  },
  otherTurnIndicator: {
    backgroundColor: "rgba(15, 23, 42, 0.46)",
    borderColor: "rgba(191, 219, 254, 0.5)",
  },
  turnIndicatorText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  myTurnText: {
    color: "#fff",
  },
  otherTurnText: {
    color: "#e2e8f0",
  },
  waitingTurnText: {
    fontSize: 10,
    color: "#999",
    fontStyle: "italic",
  },

  // Question Area
  questionArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  questionCard: {
    backgroundColor: PREMIUM_SURFACE,
    borderRadius: 20,
    padding: 25,
    minHeight: 150,
    width: Platform.OS === "web" ? 700 : screenWidth - 60,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(15, 23, 42, 0.12)",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 4,
  },
  questionText: {
    fontSize: 18,
    color: PREMIUM_TEXT,
    textAlign: "center",
    fontWeight: "700",
  },
  instructionIndicator: {
    position: "absolute",
    bottom: 15,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(46, 204, 113, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(46, 204, 113, 0.3)",
  },
  instructionText: {
    fontSize: 12,
    color: "#2ecc71",
    fontWeight: "600",
  },
  noCardsWarning: {
    position: "absolute",
    bottom: 15,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(231, 76, 60, 0.3)",
  },
  noCardsText: {
    fontSize: 12,
    color: "#e74c3c",
    fontWeight: "600",
  },

  // Hand Styles
  handContainer: {
    marginBottom: 20,
  },
  handHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  handTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f8fafc",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  deckStatus: {
    alignItems: "flex-end",
  },
  deckCount: {
    fontSize: 12,
    color: "#dbeafe",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  deckWarning: {
    fontSize: 10,
    color: "#f39c12",
    fontWeight: "bold",
    marginTop: 2,
  },
  deckEmpty: {
    fontSize: 10,
    color: "#e74c3c",
    fontWeight: "bold",
    marginTop: 2,
  },
  handScroll: {
    maxHeight: 200, // Increased from 120px to 200px to accommodate taller cards
  },
  handScrollDisabled: {
    opacity: 0.6,
  },
  turnRestrictionOverlay: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  turnRestrictionText: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  emptyHandIndicator: {
    backgroundColor: "rgba(74, 124, 89, 0.15)",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: screenWidth - 60,
    minHeight: 100,
    borderWidth: 1,
    borderColor: "rgba(74, 124, 89, 0.2)",
    borderStyle: "dashed",
  },
  emptyHandText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
    marginTop: 10,
    marginBottom: 5,
  },
  emptyHandSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(255, 253, 197, 1)",
    borderRadius: 12,
    padding: 15,
    marginRight: 10,
    width: 140,
    minHeight: 180, // Increased height for vertical rectangle
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 1)",
    position: "relative", // Enable z-index layering
    opacity: 1, // Ensure full opacity
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  cardGradient: {
    flex: 1,
    borderRadius: 11, // Slightly smaller than card to prevent edge artifacts
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  toolCard: {
    borderColor: "#2acde6",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  cardSelected: {
    borderColor: "#2ecc71",
    backgroundColor: "rgba(46, 204, 113, 0.7)",
    shadowColor: "#2ecc71",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  cardDisabled: {
    opacity: 0.4,
    backgroundColor: "rgba(128, 128, 128, 0.1)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 5,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#f8fafc",
    flex: 1,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: "#dbeafe",
    lineHeight: 16,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardDescriptionOnDark: {
    color: "#e2e8f0",
    textShadowColor: "rgba(0, 0, 0, 0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  answerCardContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  answerCardText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
    lineHeight: 18,
  },
  toolIndicator: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "#2acde6",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  toolText: {
    fontSize: 8,
    color: COLORS.textPrimary,
    fontWeight: "bold",
  },
  selectedIndicator: {
    position: "absolute",
    top: 5,
    left: 5,
    backgroundColor: "rgba(46, 204, 113, 1)",
    borderRadius: 10,
    padding: 2,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 15,
  },
  actionButton: {
    backgroundColor: "#34495e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    flex: 1,
  },
  actionButtonDisabled: {
    backgroundColor: "#2c3e50",
    opacity: 0.5,
  },
  reshuffleButton: {
    backgroundColor: "#2acde6",
  },
  actionButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },

  // Game Over/Victory Styles
  gameOverContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  gameOverContent: {
    alignItems: "center",
    backgroundColor: PREMIUM_SURFACE,
    borderRadius: 20,
    padding: 40,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    width: Platform.OS === "web" ? 700 : "auto",
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#e74c3c",
    marginTop: 20,
    marginBottom: 15,
  },
  gameOverText: {
    fontSize: 16,
    color: PREMIUM_MUTED,
    textAlign: "center",
    marginBottom: 10,
  },
  gameOverSubtext: {
    fontSize: 14,
    color: "#95a5a6",
    textAlign: "center",
    marginBottom: 20,
  },
  gameOverStats: {
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "rgba(15, 23, 42, 0.06)",
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(231, 76, 60, 0.2)",
  },
  gameOverStatText: {
    fontSize: 12,
    color: "#e74c3c",
    marginBottom: 3,
    fontWeight: "bold",
  },
  gameOverStatTitle: {
    fontSize: 16,
    color: "#f39c12",
    marginBottom: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  playerScoreContainer: {
    marginBottom: 8,
    alignItems: "center",
  },
  playerScoreText: {
    fontSize: 14,
    color: PREMIUM_TEXT,
    fontWeight: "bold",
    textAlign: "center",
  },
  winnerText: {
    color: "#f1c40f",
    fontSize: 16,
  },
  playerScoreDetails: {
    fontSize: 12,
    color: PREMIUM_MUTED,
    textAlign: "center",
    marginTop: 2,
  },
  victoryContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  victoryContainerWeb: {
    paddingHorizontal: 26,
    paddingVertical: 24,
  },
  victoryContent: {
    alignItems: "center",
    width: "100%",
    maxWidth: Platform.OS === "web" ? 760 : 460,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: "rgba(15, 111, 80, 0.24)",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  victoryContentWeb: {
    maxWidth: 900,
    paddingHorizontal: 34,
    paddingVertical: 30,
    borderRadius: 28,
  },
  victoryHeroBadge: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 158, 11, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.34)",
    marginBottom: 14,
  },
  victoryHeroBadgeWeb: {
    width: 94,
    height: 94,
    borderRadius: 47,
    marginBottom: 16,
  },
  victoryTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: PREMIUM_TEXT,
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  victoryText: {
    fontSize: 15,
    color: PREMIUM_MUTED,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 14,
    fontWeight: "600",
  },
  victoryTextWeb: {
    fontSize: 17,
    lineHeight: 25,
    maxWidth: 680,
    marginBottom: 18,
  },
  victoryStatsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  victoryStatsRowWeb: {
    maxWidth: 640,
    gap: 14,
    marginBottom: 18,
  },
  victoryStatCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(15, 111, 80, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(15, 111, 80, 0.24)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  victoryStatLabel: {
    marginTop: 6,
    fontSize: 12,
    color: PREMIUM_MUTED,
    fontWeight: "700",
  },
  victoryStatValue: {
    marginTop: 2,
    fontSize: 20,
    color: PREMIUM_TEXT,
    fontWeight: "900",
  },
  victoryTagRow: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  victoryTagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: PREMIUM_ACCENT,
  },
  victoryTagText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  victoryRestartButton: {
    backgroundColor: PREMIUM_ACCENT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 14,
    gap: 8,
    minWidth: Platform.OS === "web" ? 220 : 180,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  victoryRestartButtonWeb: {
    minWidth: 280,
    paddingVertical: 14,
    borderRadius: 16,
  },
  victoryRestartButtonText: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "900",
  },
  restartButton: {
    backgroundColor: PREMIUM_ACCENT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    gap: 10,
  },
  restartButtonText: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
  },

  // Editor Styles
  editorWebModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  editorWebModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.6)",
  },
  editorWebModalCard: {
    width: "100%",
    maxWidth: 1180,
    height: "92%",
    maxHeight: "92%",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.16)",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 26,
    elevation: 10,
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15, 23, 42, 0.1)",
    backgroundColor: PREMIUM_SURFACE_ALT,
  },
  closeButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  editorTitleBlock: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  editorTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: PREMIUM_TEXT,
    letterSpacing: 0.2,
  },
  editorSubtitle: {
    fontSize: 12,
    marginTop: 2,
    color: PREMIUM_MUTED,
    fontWeight: "600",
  },
  editorContent: {
    flex: 1,
    padding: 20,
    width: Platform.OS === "web" ? 900 : "100%",
    alignSelf: Platform.OS === "web" ? "center" : undefined,
  },
  editorSectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: PREMIUM_TEXT,
    marginTop: 20,
    marginBottom: 15,
  },
  editorCard: {
    backgroundColor: PREMIUM_SURFACE,
    borderRadius: 14,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.1)",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  editorCardDisabled: {
    opacity: 0.72,
    backgroundColor: "rgba(241, 245, 249, 0.92)",
  },
  editorCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: PREMIUM_TEXT,
    marginBottom: 8,
  },
  editorCardTitleDisabled: {
    color: "#64748b",
  },
  editorCardText: {
    fontSize: 14,
    color: PREMIUM_MUTED,
    marginBottom: 5,
    lineHeight: 20,
  },
  editorCardAnswer: {
    fontSize: 14,
    color: PREMIUM_TEXT,
    marginBottom: 10,
    fontWeight: "700",
  },
  editorCardDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  editorCardDescriptionDisabled: {
    color: "#666",
  },
  toolCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  editCardButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(15, 111, 80, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15, 111, 80, 0.28)",
    gap: 5,
  },
  editCardButtonText: {
    color: PREMIUM_ACCENT_DARK,
    fontSize: 12,
    fontWeight: "800",
  },

  // New editor styles
  editorSectionSubtitle: {
    fontSize: 14,
    color: PREMIUM_MUTED,
    marginBottom: 15,
    lineHeight: 20,
    fontWeight: "500",
  },
  createCardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(15, 111, 80, 0.08)",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(15, 111, 80, 0.32)",
    borderStyle: "dashed",
    marginBottom: 20,
    gap: 8,
  },
  createCardButtonText: {
    color: PREMIUM_ACCENT_DARK,
    fontSize: 14,
    fontWeight: "800",
  },
  cardActionButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  deleteCardButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    gap: 5,
  },
  deleteCardButtonText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "bold",
  },
  editorCardMeta: {
    fontSize: 12,
    color: PREMIUM_MUTED,
    marginTop: 5,
    marginBottom: 10,
    fontWeight: "600",
  },

  editFormWebModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  editFormWebModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.6)",
  },
  editFormWebModalCard: {
    width: "100%",
    maxWidth: 820,
    height: "90%",
    maxHeight: "90%",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.16)",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 26,
    elevation: 10,
  },
  editFormSafeArea: {
    flex: 1,
  },
  editFormHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15, 23, 42, 0.12)",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  editFormCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  editFormHeaderBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 111, 80, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(15, 111, 80, 0.25)",
  },
  editFormTitleBlock: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  editFormTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: PREMIUM_TEXT,
    letterSpacing: 0.2,
  },
  editFormSubtitle: {
    fontSize: 12,
    marginTop: 2,
    color: PREMIUM_MUTED,
    fontWeight: "600",
  },
  editFormScroll: {
    flex: 1,
  },
  editFormScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 12,
  },
  editFormHeroCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 111, 80, 0.2)",
    padding: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  editFormHeroTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: PREMIUM_TEXT,
    marginBottom: 4,
  },
  editFormHeroText: {
    fontSize: 13,
    color: PREMIUM_MUTED,
    lineHeight: 19,
    fontWeight: "600",
  },
  editFormFieldCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.1)",
    padding: 14,
  },
  editFormLabel: {
    fontSize: 15,
    color: PREMIUM_TEXT,
    fontWeight: "800",
    marginBottom: 4,
  },
  editFormLabelHint: {
    fontSize: 12,
    color: PREMIUM_MUTED,
    marginBottom: 8,
    fontWeight: "600",
  },
  editFormInput: {
    backgroundColor: "rgba(248, 250, 252, 0.95)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: PREMIUM_TEXT,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.32)",
    minHeight: 48,
    fontWeight: "600",
  },
  editFormInputMultiline: {
    minHeight: 110,
  },
  editFormDifficultyRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  editFormDifficultyButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 111, 80, 0.3)",
    backgroundColor: "rgba(15, 111, 80, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  editFormDifficultyButtonSelected: {
    backgroundColor: PREMIUM_ACCENT,
    borderColor: PREMIUM_ACCENT,
  },
  editFormDifficultyButtonText: {
    color: PREMIUM_ACCENT_DARK,
    fontSize: 13,
    fontWeight: "800",
  },
  editFormDifficultyButtonTextSelected: {
    color: "#f8fafc",
  },
  editFormNoteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(15, 111, 80, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 111, 80, 0.24)",
    padding: 12,
  },
  editFormNoteText: {
    flex: 1,
    color: PREMIUM_ACCENT_DARK,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  editFormButtonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
    marginBottom: 6,
  },
  editFormCancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.2)",
    backgroundColor: "rgba(248, 250, 252, 0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  editFormCancelButtonText: {
    color: PREMIUM_TEXT,
    fontSize: 15,
    fontWeight: "800",
  },
  editFormSubmitButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: PREMIUM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  editFormSubmitButtonText: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "900",
  },

  // Form styles
  formLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    backgroundColor: "rgba(74, 124, 89, 0.2)",
    borderRadius: 8,
    padding: 12,
    color: COLORS.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(74, 124, 89, 0.3)",
    marginBottom: 8,
    minHeight: 50,
  },
  difficultyContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  difficultyButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(74, 124, 89, 0.2)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(74, 124, 89, 0.3)",
  },
  difficultyButtonSelected: {
    backgroundColor: "#2acde6",
    borderColor: "#2acde6",
  },
  difficultyButtonText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "600",
  },
  difficultyButtonTextSelected: {
    color: COLORS.textPrimary,
  },
  formNote: {
    fontSize: 14,
    color: "#1a5344",
    fontStyle: "italic",
    marginTop: 10,
    padding: 12,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
  },
  formButtonContainer: {
    flexDirection: "row",
    gap: 15,
    marginTop: 30,
    marginBottom: 20,
  },
  formCancelButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: "rgba(74, 124, 89, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(74, 124, 89, 0.3)",
    alignItems: "center",
  },
  formCancelButtonText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "bold",
  },
  formSubmitButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: "#2acde6",
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#1a5344",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  formSubmitButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "bold",
  },

  // Feedback Modal Styles
  feedbackOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  feedbackContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    maxWidth: 300,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  feedbackTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
    textAlign: "center",
  },
  feedbackMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  feedbackButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
  },
  feedbackButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },

  // Wave Transition Modal Styles
  waveTransitionOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  waveTransitionContainer: {
    backgroundColor: "rgba(26, 44, 74, 0.95)",
    borderRadius: 25,
    padding: 40,
    alignItems: "center",
    maxWidth: 350,
    marginHorizontal: 20,
    borderWidth: 2,
    borderColor: "#2acde6",
    shadowColor: "#2acde6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  waveTransitionTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2acde6",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
    textShadowColor: "rgba(42, 205, 230, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  waveTransitionSubtitle: {
    fontSize: 24,
    color: "#00E5FF",
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 229, 255, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  waveTransitionDescription: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 25,
    fontStyle: "italic",
  },
  waveTransitionDivider: {
    width: 60,
    height: 2,
    backgroundColor: "#2acde6",
    marginVertical: 15,
    borderRadius: 1,
  },
  waveTransitionProgress: {
    alignItems: "center",
    width: "100%",
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(74, 124, 89, 0.3)",
    borderRadius: 4,
    marginBottom: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2acde6",
    borderRadius: 4,
  },
  waveProgressText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },

  // Turn Order Selection Styles
  turnOrderInstructions: {
    backgroundColor: "rgba(7, 29, 40, 0.72)",
    borderRadius: 18,
    padding: 22,
    marginBottom: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(150, 243, 252, 0.35)",
  },
  turnOrderHeroIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: "rgba(145, 242, 247, 0.62)",
    backgroundColor: "rgba(8, 41, 53, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 8,
  },
  turnOrderProgressChip: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(5, 48, 60, 0.75)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(140, 239, 246, 0.4)",
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f7feff",
    marginBottom: 8,
    textAlign: "center",
  },
  instructionsText: {
    fontSize: 16,
    color: "rgba(240, 252, 255, 0.96)",
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 12,
  },
  turnOrderHelperText: {
    fontSize: 14,
    color: "rgba(219, 246, 251, 0.92)",
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "600",
  },
  turnOrderProgressText: {
    fontSize: 13,
    color: "#f0feff",
    fontWeight: "700",
  },
  positionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
    marginBottom: 30,
  },
  positionButton: {
    width: Platform.OS === "web" ? 136 : 126,
    minHeight: Platform.OS === "web" ? 142 : 128,
    borderRadius: 24,
    backgroundColor: "rgba(8, 32, 45, 0.78)",
    borderWidth: 2,
    borderColor: "rgba(145, 242, 247, 0.34)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  positionButtonSelected: {
    backgroundColor: "rgba(40, 187, 214, 0.26)",
    borderColor: "#8cf2ff",
    shadowColor: "#2acde6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.44,
    shadowRadius: 10,
    elevation: 10,
  },
  positionButtonTaken: {
    backgroundColor: "rgba(33, 53, 66, 0.62)",
    borderColor: "rgba(116, 151, 171, 0.42)",
  },
  positionButtonDisabled: {
    opacity: 0.62,
  },
  positionStateBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(11, 62, 77, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(141, 239, 246, 0.34)",
  },
  positionStateBadgeText: {
    fontSize: 10,
    letterSpacing: 0.4,
    color: "#e7fdff",
    fontWeight: "800",
  },
  positionButtonText: {
    fontSize: 34,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 5,
  },
  positionButtonTextSelected: {
    color: "#ffffff",
  },
  positionButtonTextTaken: {
    color: "rgba(218, 237, 247, 0.9)",
  },
  positionLabel: {
    fontSize: 13,
    color: "rgba(232, 247, 254, 0.95)",
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  positionLabelSelected: {
    color: "#ffffff",
  },
  positionLabelTaken: {
    color: "rgba(204, 222, 233, 0.88)",
  },
  playerNameOnPosition: {
    fontSize: 12,
    color: "#effdff",
    marginTop: 7,
    textAlign: "center",
    backgroundColor: "rgba(7, 44, 56, 0.8)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    overflow: "hidden",
    maxWidth: "90%",
  },
  playerNameOnPositionSelected: {
    color: "#ffffff",
    fontWeight: "800",
  },
  currentSelections: {
    backgroundColor: "rgba(6, 31, 44, 0.72)",
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(145, 242, 247, 0.28)",
  },
  currentSelectionsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f6feff",
    marginBottom: 15,
    textAlign: "center",
  },
  selectionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: "rgba(10, 49, 62, 0.72)",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(150, 230, 238, 0.24)",
  },
  selectionText: {
    flex: 1,
    fontSize: 15,
    color: "#ffffff",
    textAlign: "left",
    fontWeight: "600",
  },
  finalTurnOrder: {
    backgroundColor: "rgba(13, 36, 51, 0.78)",
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(150, 244, 252, 0.62)",
  },
  finalTurnOrderTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f6feff",
    marginBottom: 15,
    textAlign: "center",
  },
  finalOrderItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "rgba(10, 49, 62, 0.8)",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(154, 236, 244, 0.26)",
  },
  finalOrderText: {
    flex: 1,
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "700",
    textAlign: "left",
  },
  gameStartingSoon: {
    fontSize: 16,
    color: "#e3fdff",
    fontWeight: "700",
    textAlign: "center",
    marginTop: 15,
    fontStyle: "italic",
  },

  // Wave Section Styles
  waveSection: {
    marginBottom: 25,
    backgroundColor: PREMIUM_SURFACE_ALT,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.09)",
  },
  waveSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15, 23, 42, 0.1)",
  },
  waveSectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: PREMIUM_TEXT,
  },
  waveSectionCounter: {
    fontSize: 14,
    color: PREMIUM_MUTED,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    overflow: "hidden",
    fontWeight: "700",
  },
  waveFullNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  waveFullText: {
    fontSize: 14,
    color: "#4CAF50",
    marginLeft: 8,
    fontWeight: "600",
  },
  emptyWaveNotice: {
    backgroundColor: "rgba(241, 245, 249, 0.9)",
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.16)",
    borderStyle: "dashed",
  },
  emptyWaveText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    fontStyle: "italic",
  },

  // Upload button styles
  headerButtonsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2acde6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    justifyContent: "center",
  },
  uploadButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    justifyContent: "center",
  },
  downloadButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },

  // Upload modal styles
  uploadModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  uploadModalContainer: {
    backgroundColor: "#92eacc",
    borderRadius: 20,
    padding: 25,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 700 : 500,
    maxHeight: "80%",
  },
  uploadModalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 20,
  },
  fileInfoContainer: {
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#1a5344",
  },
  fileInfoText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 5,
  },
  fileInfoDetails: {
    fontSize: 14,
    color: "#aaa",
  },
  uploadModalDescription: {
    fontSize: 16,
    color: "#e2e8f0",
    lineHeight: 24,
    marginBottom: 20,
  },
  formatExample: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "rgba(74, 124, 89, 0.2)",
  },
  formatExampleText: {
    fontSize: 13,
    color: "#a1a1aa",
    fontFamily: "monospace",
    lineHeight: 18,
  },
  uploadModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  uploadModalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  uploadModalCancelButton: {
    backgroundColor: "rgba(239, 68, 68, 0.8)",
  },
  uploadModalUploadButton: {
    backgroundColor: "#2acde6",
  },
  uploadModalButtonDisabled: {
    backgroundColor: "rgba(139, 92, 246, 0.5)",
  },
  uploadModalButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Upload result modal styles
  uploadResultOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  uploadResultContainer: {
    backgroundColor: "#92eacc",
    borderRadius: 20,
    padding: 25,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 550 : 400,
    alignItems: "center",
    maxHeight: "80%",
    alignSelf: "center",
  },
  uploadResultTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginVertical: 15,
  },
  uploadResultMessage: {
    fontSize: 16,
    color: "#e2e8f0",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  errorScrollView: {
    maxHeight: 200,
    width: "100%",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f44336",
    marginBottom: 10,
  },
  uploadErrorText: {
    fontSize: 14,
    color: "#ffab91",
    marginBottom: 5,
    lineHeight: 18,
  },
  uploadResultButton: {
    backgroundColor: "#2acde6",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  uploadResultButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  moreMenuButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.12)",
  },
  actionsMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.58)",
    justifyContent: "flex-end",
    padding: 20,
    ...Platform.select({
      web: {
        alignItems: "center",
      },
      default: {},
    }),
  },
  actionsMenuContainer: {
    backgroundColor: PREMIUM_SURFACE,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 520 : undefined,
    alignSelf: Platform.OS === "web" ? "center" : "auto",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.12)",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  actionsMenuHeader: {
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  actionsMenuTitle: {
    color: PREMIUM_TEXT,
    fontSize: 17,
    fontWeight: "800",
  },
  actionsMenuSubtitle: {
    marginTop: 2,
    color: PREMIUM_MUTED,
    fontSize: 12,
    fontWeight: "600",
  },
  actionsMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 12,
    backgroundColor: "rgba(248, 250, 252, 0.72)",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  actionsMenuItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
  },
  actionsMenuItemRight: {
    marginLeft: "auto",
  },
  actionsMenuItemText: {
    color: PREMIUM_TEXT,
    fontSize: 15,
    fontWeight: "700",
  },
  actionsMenuDivider: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(15, 23, 42, 0.12)",
  },
  actionsMenuCloseItem: {
    marginTop: 10,
    backgroundColor: "rgba(254, 226, 226, 0.78)",
    borderColor: "rgba(239, 68, 68, 0.22)",
  },
  // Docs styles
  docsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366f1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    justifyContent: "center",
    marginRight: 4,
  },
  docsButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  docsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  docsContainer: {
    backgroundColor: "#92eacc",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 560,
    maxHeight: "85%",
  },
  docsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  docsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  docsCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  docsScroll: {
    marginTop: 4,
  },
  docsText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    paddingBottom: 12,
  },
});
