import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { io } from "socket.io-client";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useAuthStore } from "@/store/authStore";
import { API_URL } from "@/constants/api";
import knowledgeRelayAPI from "@/services/knowledgeRelayAPI";
import { useSettings } from "@/contexts/SettingsContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { GameNotificationService } from "@/services/gameNotificationService";
import COLORS from "@/constants/custom-colors";

// Team configurations
const TEAMS = {
  A: { name: "Team Alpha", color: "#ef4444", icon: "alpha-a-circle" },
  B: { name: "Team Beta", color: "#3b82f6", icon: "alpha-b-circle" },
  C: { name: "Team Charlie", color: "#10b981", icon: "alpha-c-circle" },
  D: { name: "Team Delta", color: "#2acde6", icon: "alpha-d-circle" },
};

// Game phases enum
const PHASES = {
  ROOM_SETUP: "room_setup",
  TEAM_SELECTION: "team_selection",
  GAME_RULES: "game_rules",
  PLAYING: "playing",
  FINISHED: "finished",
  INSTRUCTOR_EDITOR: "instructor_editor",
};

// Sample JSON structure for Knowledge Relay questions
const SAMPLE_KR_QUESTIONS = [
  {
    question: "What does HTTPS stand for?",
    options: [
      "HyperText Transfer Protocol Standard",
      "Hyperlink Transfer Protocol Secure",
      "High Transfer Text Protocol Secure",
      "HyperText Transfer Protocol Secure",
    ],
    correctAnswer: 3,
    category: "Web Security",
    difficulty: "Easy",
    points: 1,
  },
  {
    question: "Which of the following is a strong password?",
    options: ["password123", "P@55w0rd!", "qwerty", "12345678"],
    correctAnswer: 1,
    category: "Authentication",
    difficulty: "Medium",
    points: 2,
  },
  {
    question: "What is phishing?",
    options: [
      "A type of malware",
      "A social engineering attack to trick users into revealing information",
      "A firewall technique",
      "An encryption algorithm",
    ],
    correctAnswer: 1,
    category: "Social Engineering",
    difficulty: "Easy",
    points: 1,
  },
  {
    question: "Which protocol is used to securely transfer files?",
    options: ["FTP", "SFTP", "HTTP", "SMTP"],
    correctAnswer: 1,
    category: "Networking",
    difficulty: "Medium",
    points: 2,
  },
  {
    question: "What does 2FA provide in cybersecurity?",
    options: [
      "Two-Factor Authentication for enhanced security",
      "Two-File Access for data management",
      "Two-Firewall Access for network protection",
      "Two-Feature Application for software design",
    ],
    correctAnswer: 0,
    category: "Authentication",
    difficulty: "Easy",
    points: 1,
  },
];

export default function KnowledgeRelay() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { settings } = useSettings();
  const { showNotification } = useNotifications();
  const socketRef = useRef(null);

  // Game state
  const [gamePhase, setGamePhase] = useState(PHASES.ROOM_SETUP);
  const [roomId, setRoomId] = useState("");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  // Use logged user's full name
  const playerName = user?.fullName || "Anonymous";

  // Game data
  const [gameData, setGameData] = useState({
    roomId: "",
    players: [],
    teams: {},
    currentQuestion: 0,
    currentQuestionIndex: 0,
    questions: [],
    currentTeam: "A",
    currentPlayerIndex: 0,
    timer: 30,
    isTimerActive: false,
    phase: PHASES.ROOM_SETUP,
  });

  // UI state
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  // Track if the last submitted answer was correct so we only reveal the correct answer when appropriate
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(null);
  // Track the question index that was just answered so we don't highlight on a new question
  const answeredQuestionIndexRef = useRef(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Socket.IO connection
  useEffect(() => {
    const serverUrl = API_URL.replace("/api", "");
    socketRef.current = io(serverUrl);

    // Set up socket event listeners
    const socket = socketRef.current;

    socket.on("kr-room-joined", (data) => {
      console.log("Room joined:", data);
      setGameData(data.gameState);
      setIsCreator(data.isCreator);
      setGamePhase(PHASES.TEAM_SELECTION);
      setIsConnecting(false);
    });

    socket.on("kr-team-selected", (data) => {
      console.log("Team selected:", data);
      setGameData(data.gameState);
    });

    socket.on("kr-game-started", (data) => {
      console.log("Game started:", data);
      setGameData(data.gameState);
      setGamePhase(PHASES.PLAYING);
    });

    socket.on("kr-answer-result", (data) => {
      console.log("Answer result:", data);
      // Store the question index that was answered BEFORE applying new game state
      answeredQuestionIndexRef.current = gameData.currentQuestionIndex;
      setGameData(data.gameState);
      setShowResult(true);
      setLastAnswerCorrect(data.correct === true);

      // Track game completion if game is finished
      if (data.gameFinished && data.finalResults) {
        console.log("Game finished, tracking completion...");

        // Find the player's team result
        const playerTeamResult = data.finalResults.rankings?.find((team) =>
          team.players?.some((player) => player.name === playerName)
        );

        const trackingData = {
          gameResult: data.finalResults,
          teamResult: playerTeamResult,
          finalScore: playerTeamResult?.score || 0,
          gameType: "knowledgeRelay",
          timestamp: new Date().toISOString(),
        };

        // Track completion asynchronously
        knowledgeRelayAPI
          .trackGameCompletion(trackingData)
          .then((result) => {
            console.log("Game completion tracked:", result);
          })
          .catch((error) => {
            console.error("Failed to track game completion:", error);
          });
      }

      // Reset answer selection after showing result
      setTimeout(() => {
        setSelectedAnswer(null);
        setShowResult(false);
        setLastAnswerCorrect(null);
        answeredQuestionIndexRef.current = null;
      }, 2000);
    });

    socket.on("kr-pass-used", (data) => {
      console.log("Pass used:", data);
      setGameData(data.gameState);
    });

    socket.on("kr-timer-update", (data) => {
      setGameData((prev) => ({ ...prev, timer: data.timer }));
    });

    socket.on("kr-timeout-occurred", (data) => {
      console.log("Timeout occurred:", data);
      setGameData(data.gameState);
    });

    socket.on("kr-leaderboard", (data) => {
      console.log("Leaderboard update:", data);
      setGameData(data.gameState);
    });

    socket.on("kr-player-joined", (data) => {
      console.log("Player joined:", data);
      setGameData(data.gameState);
    });

    socket.on("kr-player-disconnected", (data) => {
      console.log("Player disconnected:", data);
      setGameData(data.gameState);
    });

    socket.on("kr-player-left", (data) => {
      console.log("Player left:", data);
      if (data?.gameState) setGameData(data.gameState);
    });

    socket.on("kr-game-ended", async (data) => {
      console.log("Game ended:", data);
      setGameData(data.gameState);
      setGamePhase(PHASES.FINISHED);

      // Send enhanced notification on game completion
      const winner =
        data.gameState?.finalResults?.rankings?.[0]?.teamName ||
        data.finalResults?.rankings?.[0]?.teamName;

      await GameNotificationService.sendGameCompletionNotification(
        "knowledge-relay",
        { winner },
        showNotification,
        settings
      );

      // Track game completion if we have final results
      if (data.finalResults || data.gameState?.finalResults) {
        console.log("Game ended, tracking completion...");

        const finalResults = data.finalResults || data.gameState.finalResults;

        // Find the player's team result
        const playerTeamResult = finalResults.rankings?.find((team) =>
          team.players?.some((player) => player.name === playerName)
        );

        const trackingData = {
          gameResult: finalResults,
          teamResult: playerTeamResult,
          finalScore: playerTeamResult?.score || 0,
          gameType: "knowledgeRelay",
          timestamp: new Date().toISOString(),
        };

        // Track completion asynchronously
        knowledgeRelayAPI
          .trackGameCompletion(trackingData)
          .then((result) => {
            console.log("Game completion tracked:", result);
          })
          .catch((error) => {
            console.error("Failed to track game completion:", error);
          });
      }
    });

    socket.on("kr-error", (data) => {
      console.error("Socket error:", data.message);
      setErrorMessage(data.message);
      setIsConnecting(false);
      Alert.alert("Error", data.message);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [playerName, settings, showNotification]);

  // Monitor game completion
  useEffect(() => {
    if (
      gamePhase === PHASES.PLAYING &&
      gameData.questions &&
      gameData.questions.length > 0
    ) {
      const questionIndex =
        gameData.currentQuestionIndex !== undefined
          ? gameData.currentQuestionIndex
          : gameData.currentQuestion;

      if (questionIndex >= gameData.questions.length) {
        setGamePhase(PHASES.FINISHED);
      }
    }
  }, [
    gameData.currentQuestion,
    gameData.currentQuestionIndex,
    gameData.questions,
    gamePhase,
  ]);

  // Load global questions on component mount for instructor mode
  useEffect(() => {
    const loadInitialGlobalQuestions = async () => {
      try {
        const response = await fetch(
          `${API_URL}/knowledge-relay/global-questions`
        );
        const data = await response.json();

        if (data.success && data.questions.length > 0) {
          console.log(
            `[KnowledgeRelay] Loaded ${data.questions.length} global questions from ${data.source} on mount`
          );
          // Only update if we don't have any custom questions already
          setInstructorQuestions(data.questions);
        }
      } catch (error) {
        console.error(
          "[KnowledgeRelay] Error loading global questions on mount:",
          error
        );
        // Keep the default hardcoded questions as fallback
      }
    };

    loadInitialGlobalQuestions();
  }, []);

  const joinRoom = () => {
    if (!roomId.trim()) {
      Alert.alert("Error", "Please enter a Room ID");
      return;
    }

    if (!socketRef.current) {
      Alert.alert("Error", "Connection not established");
      return;
    }

    setIsConnecting(true);
    setErrorMessage("");

    socketRef.current.emit("kr-join-room", {
      roomId: roomId.trim(),
      playerName: playerName,
    });
  };

  const createNewRoom = async () => {
    try {
      // Get a new room ID from the backend
      const response = await fetch(
        `${API_URL}/knowledge-relay/generate-room-id`
      );
      const data = await response.json();

      if (data.success) {
        setRoomId(data.roomId);
      } else {
        // Fallback to random generation
        const newRoomId = Math.floor(
          100000 + Math.random() * 900000
        ).toString();
        setRoomId(newRoomId);
      }
    } catch (error) {
      console.error("Error generating room ID:", error);
      // Fallback to random generation
      const newRoomId = Math.floor(100000 + Math.random() * 900000).toString();
      setRoomId(newRoomId);
    }
  };

  const selectTeam = (teamKey) => {
    if (!socketRef.current) {
      Alert.alert("Error", "Connection not established");
      return;
    }

    setSelectedTeam(teamKey);

    socketRef.current.emit("kr-select-team", {
      teamId: teamKey,
    });
  };

  const startGame = () => {
    if (!socketRef.current) {
      Alert.alert("Error", "Connection not established");
      return;
    }

    if (!isCreator) {
      Alert.alert("Error", "Only the room creator can start the game");
      return;
    }

    socketRef.current.emit("kr-start-game", {});
  };

  const handleAnswerSelect = (answerIndex) => {
    if (selectedAnswer !== null || showResult) return;
    if (!socketRef.current) return;

    setSelectedAnswer(answerIndex);

    socketRef.current.emit("kr-submit-answer", {
      answerIndex: answerIndex,
    });
  };

  const usePass = () => {
    if (!socketRef.current) return;

    socketRef.current.emit("kr-use-pass", {});
  };

  // Leave current game room and return to setup
  const leaveGame = () => {
    try {
      if (socketRef.current) {
        socketRef.current.emit("kr-leave-game");
      }
    } catch (e) {
      console.warn("Failed to emit leave-game:", e);
    } finally {
      // Reset local state back to setup
      setSelectedTeam(null);
      setRoomId("");
      setGameData({
        roomId: "",
        players: [],
        teams: {},
        currentQuestion: 0,
        currentQuestionIndex: 0,
        questions: [],
        currentTeam: "A",
        currentPlayerIndex: 0,
        timer: 30,
        isTimerActive: false,
        phase: PHASES.ROOM_SETUP,
      });
      setGamePhase(PHASES.ROOM_SETUP);
    }
  };

  // Sample questions for instructor editor
  const [instructorQuestions, setInstructorQuestions] = useState([
    {
      id: 1,
      question: "What does HTTPS stand for?",
      options: [
        "Hypertext Transfer Protocol Secure",
        "Hypertext Transport Protocol Safe",
        "High Transfer Text Protocol Secure",
        "Hyperlink Transfer Protocol Secure",
      ],
      correctAnswer: 0,
      category: "Web Security",
      difficulty: "Easy",
      points: 1,
    },
    {
      id: 2,
      question: "What is the primary purpose of a firewall?",
      options: [
        "To speed up internet connection",
        "To block unauthorized access to networks",
        "To encrypt data transmission",
        "To backup important files",
      ],
      correctAnswer: 1,
      category: "Network Security",
      difficulty: "Easy",
      points: 1,
    },
    {
      id: 3,
      question:
        "Which of the following is NOT a strong password characteristic?",
      options: [
        "Contains uppercase and lowercase letters",
        "Uses personal information like birthdate",
        "Includes special characters",
        "Is at least 8 characters long",
      ],
      correctAnswer: 1,
      category: "Authentication",
      difficulty: "Medium",
      points: 2,
    },
    {
      id: 4,
      question: "What does 2FA stand for in cybersecurity?",
      options: [
        "Two-Factor Authentication",
        "Two-File Authorization",
        "Twice-Failed Access",
        "Two-Firewall Architecture",
      ],
      correctAnswer: 0,
      category: "Authentication",
      difficulty: "Easy",
      points: 1,
    },
    {
      id: 5,
      question: "What is a DDoS attack?",
      options: [
        "Direct Database Operation System",
        "Distributed Denial of Service",
        "Dynamic Data Override Security",
        "Dedicated Domain Operation Service",
      ],
      correctAnswer: 1,
      category: "Network Security",
      difficulty: "Medium",
      points: 2,
    },
    {
      id: 6,
      question:
        "Which encryption method is considered most secure for Wi-Fi networks?",
      options: ["WEP", "WPA", "WPA2", "WPA3"],
      correctAnswer: 3,
      category: "Network Security",
      difficulty: "Hard",
      points: 3,
    },
    {
      id: 7,
      question: "What is phishing?",
      options: [
        "A type of computer virus",
        "A method to catch fish using technology",
        "A social engineering attack to steal sensitive information",
        "A way to speed up internet connection",
      ],
      correctAnswer: 2,
      category: "Social Engineering",
      difficulty: "Easy",
      points: 1,
    },
    {
      id: 8,
      question: "What does S/MIME stand for in email security?",
      options: [
        "Secure/Multipurpose Internet Mail Extensions",
        "Simple/Multiple Internet Message Exchange",
        "Secure/Multiple Internet Message Encryption",
        "Standard/Multipurpose Internet Mail Encryption",
      ],
      correctAnswer: 0,
      category: "Email Security",
      difficulty: "Hard",
      points: 3,
    },
  ]);

  // Question editing state
  const [isQuestionModalVisible, setIsQuestionModalVisible] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(-1);
  const [editingQuestionData, setEditingQuestionData] = useState({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    category: "",
    difficulty: "Easy",
    points: 1,
  });

  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  // Upload result modals
  const [uploadSuccessModalVisible, setUploadSuccessModalVisible] =
    useState(false);
  const [uploadFailureModalVisible, setUploadFailureModalVisible] =
    useState(false);
  const [uploadResult, setUploadResult] = useState({
    message: "",
    count: 0,
    errors: [],
  });

  // Load to game state
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
          <Text style={styles.actionsMenuTitle}>Actions</Text>
          <TouchableOpacity
            style={styles.actionsMenuItem}
            onPress={() => {
              loadQuestionsToGame();
              setShowActionsMenu(false);
            }}
          >
            <MaterialCommunityIcons name="upload" size={20} color="#1a5344" />
            <Text style={styles.actionsMenuItemText}>Load To Game</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionsMenuItem}
            onPress={() => {
              loadGlobalQuestionsForInstructor();
              setShowActionsMenu(false);
            }}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#10b981" />
            <Text style={styles.actionsMenuItemText}>Refresh Global</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionsMenuItem}
            onPress={() => {
              pickJSONFile();
              setShowActionsMenu(false);
            }}
          >
            <MaterialCommunityIcons
              name="file-upload"
              size={20}
              color="#3b82f6"
            />
            <Text style={styles.actionsMenuItemText}>Upload JSON</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionsMenuItem}
            onPress={() => {
              downloadSampleJSON();
              setShowActionsMenu(false);
            }}
          >
            <MaterialCommunityIcons
              name="file-download"
              size={20}
              color="#10b981"
            />
            <Text style={styles.actionsMenuItemText}>Download Sample</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionsMenuItem}
            onPress={() => {
              setShowImportDocs(true);
              setShowActionsMenu(false);
            }}
          >
            <MaterialCommunityIcons
              name="book-open-page-variant"
              size={20}
              color="#6366f1"
            />
            <Text style={styles.actionsMenuItemText}>Import Docs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionsMenuItem, styles.actionsMenuCloseItem]}
            onPress={() => setShowActionsMenu(false)}
          >
            <MaterialCommunityIcons name="close" size={20} color="#f87171" />
            <Text style={styles.actionsMenuItemText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
  const [loadSuccessModalVisible, setLoadSuccessModalVisible] = useState(false);
  const [loadFailureModalVisible, setLoadFailureModalVisible] = useState(false);
  const [loadResult, setLoadResult] = useState({
    message: "",
    count: 0,
    errors: [],
  });

  // Load global questions from database for instructor mode
  const loadGlobalQuestionsForInstructor = async () => {
    try {
      console.log(
        "[KnowledgeRelay] Loading global questions for instructor mode..."
      );
      const response = await fetch(
        `${API_URL}/knowledge-relay/global-questions`
      );
      const data = await response.json();

      if (data.success && data.questions.length > 0) {
        console.log(
          `[KnowledgeRelay] Loaded ${data.questions.length} global questions from ${data.source}`
        );
        setInstructorQuestions(data.questions);
      } else {
        console.log(
          "[KnowledgeRelay] No global questions found, keeping default questions"
        );
      }
    } catch (error) {
      console.error("[KnowledgeRelay] Error loading global questions:", error);
      // Keep the default hardcoded questions as fallback
    }
  };

  // Function to enter instructor mode with global questions loaded
  const enterInstructorMode = async () => {
    setGamePhase(PHASES.INSTRUCTOR_EDITOR);
    await loadGlobalQuestionsForInstructor();
  };

  // Instructor functions
  const openQuestionEditor = (index = -1) => {
    if (index >= 0) {
      // Edit existing question
      setEditingQuestionIndex(index);
      setEditingQuestionData({ ...instructorQuestions[index] });
    } else {
      // Create new question
      setEditingQuestionIndex(-1);
      setEditingQuestionData({
        question: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        category: "",
        difficulty: "Easy",
        points: 1,
      });
    }
    setIsQuestionModalVisible(true);
  };

  const saveQuestion = () => {
    if (
      !editingQuestionData.question.trim() ||
      !editingQuestionData.category.trim()
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (editingQuestionData.options.some((option) => !option.trim())) {
      Alert.alert("Error", "Please fill in all answer options");
      return;
    }

    const questionToSave = {
      ...editingQuestionData,
      id:
        editingQuestionIndex >= 0
          ? instructorQuestions[editingQuestionIndex].id
          : Date.now(),
    };

    if (editingQuestionIndex >= 0) {
      // Update existing question
      const updatedQuestions = [...instructorQuestions];
      updatedQuestions[editingQuestionIndex] = questionToSave;
      setInstructorQuestions(updatedQuestions);
    } else {
      // Add new question
      setInstructorQuestions([...instructorQuestions, questionToSave]);
    }

    setIsQuestionModalVisible(false);
  };

  const deleteQuestion = (index) => {
    Alert.alert(
      "Delete Question",
      "Are you sure you want to delete this question?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedQuestions = instructorQuestions.filter(
              (_, i) => i !== index
            );
            setInstructorQuestions(updatedQuestions);
          },
        },
      ]
    );
  };

  const updateOptionText = (index, text) => {
    const updatedOptions = [...editingQuestionData.options];
    updatedOptions[index] = text;
    setEditingQuestionData({ ...editingQuestionData, options: updatedOptions });
  };

  const loadQuestionsToGame = async () => {
    if (instructorQuestions.length === 0) {
      Alert.alert("Error", "No questions available to load");
      return;
    }

    const performLoad = async () => {
      try {
        console.log(
          "[KnowledgeRelay] Loading questions globally:",
          instructorQuestions.length
        );
        const response = await fetch(
          `${API_URL}/knowledge-relay/load-questions-global`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              questions: instructorQuestions,
              persist: true, // ensure backend saves to DB
            }),
          }
        );

        const data = await response.json();
        console.log("[KnowledgeRelay] Load response:", data);

        if (data.success) {
          // Re-fetch global questions to confirm
          try {
            const gRes = await fetch(
              `${API_URL}/knowledge-relay/global-questions`
            );
            const gData = await gRes.json();
            if (gData.success) {
              setGameData({
                ...gameData,
                questions: gData.questions,
              });
            }
          } catch (e) {
            console.warn("Failed to refresh global questions", e);
          }

          setLoadResult({
            message: data.message,
            count: data.count,
            errors: [],
          });
          setLoadSuccessModalVisible(true);
        } else {
          setLoadResult({
            message: data.message || "Failed to load questions globally",
            count: 0,
            errors: data.errors || [],
          });
          setLoadFailureModalVisible(true);
        }
      } catch (error) {
        console.error("Error loading questions globally:", error);
        setLoadResult({
          message: "Network error: Failed to connect to server",
          count: 0,
          errors: [error.message],
        });
        setLoadFailureModalVisible(true);
      } finally {
      }
    };

    if (Platform.OS === "web") {
      // window.confirm for web (Alert prompt isn't supported consistently)
      const confirmed = window.confirm(
        `Load ${instructorQuestions.length} questions globally to all rooms?`
      );
      if (confirmed) performLoad();
    } else {
      Alert.alert(
        "Load Questions",
        `Load ${instructorQuestions.length} questions globally to all rooms?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Load", onPress: performLoad },
        ]
      );
    }
  };

  // File upload functions
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
      const response = await fetch(
        `${API_URL}/knowledge-relay/upload-questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ questions: jsonData }),
        }
      );

      const result = await response.json();

      if (result.success) {
        // Append the new questions to existing ones
        const newQuestions = result.questions.map((q, index) => ({
          ...q,
          id: instructorQuestions.length + index + 1,
        }));

        setInstructorQuestions([...instructorQuestions, ...newQuestions]);

        // Set success data and show success modal
        setUploadResult({
          message: `Successfully uploaded ${result.count} questions! They have been added to your question bank.`,
          count: result.count,
          errors: [],
        });
        setUploadModalVisible(false);
        setSelectedFile(null);
        setUploadSuccessModalVisible(true);
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
      const jsonString = JSON.stringify(SAMPLE_KR_QUESTIONS, null, 2);
      const fileName = "sample-knowledge-relay-questions.json";

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

        Alert.alert("Success", "Sample JSON file downloaded successfully!");
      } else {
        // Mobile platform: save to device and share
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, jsonString);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/json",
            dialogTitle: "Save Sample Knowledge Relay Questions",
          });
        } else {
          Alert.alert("Success", `Sample JSON saved to: ${fileUri}`);
        }
      }
    } catch (error) {
      console.error("Error downloading sample JSON:", error);
      Alert.alert("Error", "Failed to download sample JSON file.");
    }
  };

  const renderUploadModal = () => {
    return (
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
                <Text style={styles.fileInfoText}>
                  File: {selectedFile.name}
                </Text>
                <Text style={styles.fileInfoDetails}>
                  Size: {(selectedFile.size / 1024).toFixed(2)} KB
                </Text>
              </View>
            )}

            <Text style={styles.uploadModalDescription}>
              This will add the questions from your JSON file to the existing
              question bank. Make sure your JSON file contains an array of
              question objects with the following format:
            </Text>

            <View style={styles.formatExample}>
              <Text style={styles.formatExampleText}>
                {`[
  {
    "question": "Your question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "category": "Category Name",
    "difficulty": "Easy/Medium/Hard",
    "points": 1
  }
]`}
              </Text>
            </View>

            <View style={styles.uploadModalActions}>
              <TouchableOpacity
                style={[
                  styles.uploadModalButton,
                  styles.uploadModalCancelButton,
                ]}
                onPress={() => {
                  setUploadModalVisible(false);
                  setSelectedFile(null);
                }}
              >
                <Text style={styles.uploadModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.uploadModalButton,
                  styles.uploadModalConfirmButton,
                ]}
                onPress={uploadQuestions}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.uploadModalConfirmText}>Upload</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Upload Success Modal
  const renderUploadSuccessModal = () => {
    return (
      <Modal
        visible={uploadSuccessModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.uploadModalOverlay}>
          <View style={styles.resultModalContainer}>
            <View style={styles.successIconContainer}>
              <MaterialCommunityIcons
                name="check-circle"
                size={60}
                color="#10b981"
              />
            </View>

            <Text style={styles.resultModalTitle}>Upload Successful!</Text>

            <Text style={styles.resultModalMessage}>
              {uploadResult.message}
            </Text>

            <View style={styles.resultModalActions}>
              <TouchableOpacity
                style={[
                  styles.resultModalButton,
                  { backgroundColor: "#10b981" },
                ]}
                onPress={() => setUploadSuccessModalVisible(false)}
              >
                <Text style={styles.resultModalButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Upload Failure Modal
  const renderUploadFailureModal = () => {
    return (
      <Modal
        visible={uploadFailureModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.uploadModalOverlay}>
          <View style={styles.resultModalContainer}>
            <View style={styles.errorIconContainer}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={60}
                color="#ef4444"
              />
            </View>

            <Text style={styles.resultModalTitle}>Upload Failed</Text>

            <Text style={styles.resultModalMessage}>
              {uploadResult.message}
            </Text>

            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <ScrollView style={styles.errorListContainer}>
                <Text style={styles.errorListTitle}>Errors:</Text>
                {uploadResult.errors.map((error, index) => (
                  <Text key={index} style={styles.errorListItem}>
                    • {error}
                  </Text>
                ))}
              </ScrollView>
            )}

            <View style={styles.resultModalActions}>
              <TouchableOpacity
                style={[styles.resultModalButton, styles.retryButton]}
                onPress={() => {
                  setUploadFailureModalVisible(false);
                  setUploadModalVisible(true);
                }}
              >
                <Text style={styles.resultModalButtonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resultModalButton, styles.cancelButton]}
                onPress={() => {
                  setUploadFailureModalVisible(false);
                  setSelectedFile(null);
                }}
              >
                <Text style={styles.resultModalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Load to Game Success Modal
  const renderLoadSuccessModal = () => {
    return (
      <Modal
        visible={loadSuccessModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.uploadModalOverlay}>
          <View style={styles.resultModalContainer}>
            <View style={styles.successIconContainer}>
              <MaterialCommunityIcons
                name="check-circle"
                size={60}
                color="#10b981"
              />
            </View>

            <Text style={styles.resultModalTitle}>Load Successful!</Text>

            <Text style={styles.resultModalMessage}>{loadResult.message}</Text>

            <View style={styles.resultModalActions}>
              <TouchableOpacity
                style={[
                  styles.resultModalButton,
                  { backgroundColor: "#10b981" },
                ]}
                onPress={() => {
                  setLoadSuccessModalVisible(false);
                  setGamePhase(PHASES.ROOM_SETUP);
                }}
              >
                <Text style={styles.resultModalButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Load to Game Failure Modal
  const renderLoadFailureModal = () => {
    return (
      <Modal
        visible={loadFailureModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.uploadModalOverlay}>
          <View style={styles.resultModalContainer}>
            <View style={styles.errorIconContainer}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={60}
                color="#ef4444"
              />
            </View>

            <Text style={styles.resultModalTitle}>Load Failed</Text>

            <Text style={styles.resultModalMessage}>{loadResult.message}</Text>

            {loadResult.errors && loadResult.errors.length > 0 && (
              <ScrollView style={styles.errorListContainer}>
                <Text style={styles.errorListTitle}>Errors:</Text>
                {loadResult.errors.map((error, index) => (
                  <Text key={index} style={styles.errorListItem}>
                    • {error}
                  </Text>
                ))}
              </ScrollView>
            )}

            <View style={styles.resultModalActions}>
              <TouchableOpacity
                style={[styles.resultModalButton, styles.retryButton]}
                onPress={() => {
                  setLoadFailureModalVisible(false);
                  loadQuestionsToGame();
                }}
              >
                <Text style={styles.resultModalButtonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resultModalButton, styles.cancelButton]}
                onPress={() => {
                  setLoadFailureModalVisible(false);
                }}
              >
                <Text style={styles.resultModalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Instructor Editor Render Function
  const renderInstructorEditor = () => {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            {renderImportDocsModal?.()}
            {renderActionsMenuModal?.()}
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setGamePhase(PHASES.ROOM_SETUP)}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={24}
                  color="#2acde6"
                />
              </TouchableOpacity>
              <Text style={styles.title}>Question Editor</Text>
              <Text style={styles.subtitle}>
                Create, edit, and manage quiz questions
              </Text>
            </View>

            {/* More Menu Trigger */}
            <View style={{ alignItems: "flex-end", marginBottom: 20 }}>
              <TouchableOpacity
                style={styles.moreMenuButton}
                onPress={() => setShowActionsMenu(true)}
              >
                <MaterialCommunityIcons
                  name="dots-vertical"
                  size={26}
                  color="#3b82f6"
                />
              </TouchableOpacity>
            </View>

            {/* Add New Question Button */}
            <TouchableOpacity
              style={styles.addQuestionButton}
              onPress={() => openQuestionEditor()}
            >
              <MaterialCommunityIcons
                name="plus-circle"
                size={24}
                color="#f8fafc"
              />
              <Text style={styles.addQuestionText}>Add New Question</Text>
            </TouchableOpacity>

            {/* Questions List */}
            <ScrollView style={styles.questionsContainer}>
              {instructorQuestions.map((question, index) => (
                <View key={question.id} style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <View style={styles.questionInfoHeader}>
                      <Text style={styles.questionTitle} numberOfLines={2}>
                        {question.question}
                      </Text>
                      <View style={styles.questionMeta}>
                        <Text style={styles.categoryText}>
                          {question.category}
                        </Text>
                        <Text style={styles.difficultyText}>
                          {question.points} pts
                        </Text>
                      </View>
                    </View>
                    <View style={styles.questionActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => openQuestionEditor(index)}
                      >
                        <MaterialCommunityIcons
                          name="pencil"
                          size={20}
                          color="#3b82f6"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteQuestion(index)}
                      >
                        <MaterialCommunityIcons
                          name="delete"
                          size={20}
                          color="#ef4444"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Show options preview */}
                  <View style={styles.optionsPreview}>
                    {question.options.map((option, optIndex) => (
                      <Text
                        key={optIndex}
                        style={[
                          styles.optionPreview,
                          optIndex === question.correctAnswer &&
                            styles.correctOptionPreview,
                        ]}
                      >
                        {String.fromCharCode(65 + optIndex)}. {option}
                      </Text>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Question Editor Modal */}
            <Modal
              visible={isQuestionModalVisible}
              animationType="slide"
              presentationStyle="pageSheet"
            >
              <View style={styles.modalContainer}>
                <LinearGradient
                  colors={["#caf1c8", "#5fd2cd"]}
                  style={styles.gradient}
                >
                  <SafeAreaView style={styles.modalSafeArea}>
                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                      <TouchableOpacity
                        style={styles.modalBackButton}
                        onPress={() => setIsQuestionModalVisible(false)}
                      >
                        <MaterialCommunityIcons
                          name="close"
                          size={24}
                          color="#2acde6"
                        />
                      </TouchableOpacity>
                      <Text style={styles.modalTitle}>
                        {editingQuestionIndex >= 0
                          ? "Edit Question"
                          : "Add New Question"}
                      </Text>
                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={saveQuestion}
                      >
                        <Text style={styles.saveButtonText}>Save</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                      {/* Question Text */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.label}>Question *</Text>
                        <TextInput
                          style={[styles.textInput, styles.questionInput]}
                          placeholder="Enter your question here..."
                          placeholderTextColor="#64748b"
                          value={editingQuestionData.question}
                          onChangeText={(text) =>
                            setEditingQuestionData({
                              ...editingQuestionData,
                              question: text,
                            })
                          }
                          multiline
                        />
                      </View>

                      {/* Category */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.label}>Category *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g., Web Security, Network Security"
                          placeholderTextColor="#64748b"
                          value={editingQuestionData.category}
                          onChangeText={(text) =>
                            setEditingQuestionData({
                              ...editingQuestionData,
                              category: text,
                            })
                          }
                        />
                      </View>



                      {/* Answer Options */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.label}>Answer Options *</Text>
                        {editingQuestionData.options.map((option, index) => (
                          <View key={index} style={styles.optionContainer}>
                            <TouchableOpacity
                              style={[
                                styles.correctAnswerButton,
                                editingQuestionData.correctAnswer === index &&
                                  styles.selectedCorrectAnswer,
                              ]}
                              onPress={() =>
                                setEditingQuestionData({
                                  ...editingQuestionData,
                                  correctAnswer: index,
                                })
                              }
                            >
                              <MaterialCommunityIcons
                                name={
                                  editingQuestionData.correctAnswer === index
                                    ? "check-circle"
                                    : "circle-outline"
                                }
                                size={20}
                                color={
                                  editingQuestionData.correctAnswer === index
                                    ? "#10b981"
                                    : "#64748b"
                                }
                              />
                            </TouchableOpacity>
                            <TextInput
                              style={[styles.textInput, styles.optionInput]}
                              placeholder={`Option ${String.fromCharCode(
                                65 + index
                              )}`}
                              placeholderTextColor="#64748b"
                              value={option}
                              onChangeText={(text) =>
                                updateOptionText(index, text)
                              }
                            />
                          </View>
                        ))}
                        <Text style={styles.helperText}>
                          Tap the circle to mark the correct answer
                        </Text>
                      </View>
                    </ScrollView>
                  </SafeAreaView>
                </LinearGradient>
              </View>
            </Modal>

            {/* Upload Modal */}
            {renderUploadModal()}
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  };

  // Helper functions for UI
  const getCurrentQuestion = () => {
    if (!gameData.questions || gameData.questions.length === 0) return null;
    const questionIndex =
      gameData.currentQuestionIndex !== undefined
        ? gameData.currentQuestionIndex
        : gameData.currentQuestion;

    // Check if game should end
    if (questionIndex >= gameData.questions.length) {
      if (gamePhase !== PHASES.FINISHED) {
        setGamePhase(PHASES.FINISHED);
      }
      return null;
    }

    return gameData.questions[questionIndex];
  };

  const getCurrentPlayer = () => {
    // Use the currentPlayer from backend if available
    if (gameData.currentPlayer) {
      return gameData.currentPlayer;
    }
    // Fallback to local calculation
    const currentTeam = gameData.teams[gameData.currentTeam];
    if (!currentTeam || !currentTeam.players) return null;
    return currentTeam.players[currentTeam.currentPlayerIndex];
  };

  const getTeamStats = () => {
    return Object.entries(gameData.teams).map(([teamId, team]) => ({
      teamId,
      name: team.name,
      color: team.color,
      players: team.players || [],
      score: team.score || 0,
      passesRemaining: team.passesRemaining || 0,
    }));
  };

  const getWinningTeam = () => {
    const teamStats = getTeamStats();
    if (teamStats.length === 0) return null;

    // Sort teams by score in descending order
    const sortedTeams = teamStats.sort((a, b) => b.score - a.score);
    return sortedTeams[0];
  };

  const getPlayerTeam = () => {
    for (const [teamId, team] of Object.entries(gameData.teams)) {
      if (team.players && team.players.some((p) => p.name === playerName)) {
        return { teamId, ...team };
      }
    }
    return null;
  };

  const isMyTurn = () => {
    const currentPlayer = getCurrentPlayer();
    return currentPlayer && currentPlayer.name === playerName;
  };

  // Render functions
  const renderRoomSetup = () => (
    <View style={styles.container}>
      <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/(tabs)/game")}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color="#2acde6"
              />
            </TouchableOpacity>
            <Text style={styles.title}>Knowledge Relay</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.pageTitle}>Join a Game Room</Text>
            <View style={styles.setupCard}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Room ID</Text>
                <TextInput
                  style={styles.textInput}
                  value={roomId}
                  onChangeText={setRoomId}
                  placeholder="Enter Room ID"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Player Name</Text>
                <Text style={styles.playerNameDisplay}>{playerName}</Text>
              </View>

              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  isConnecting && styles.disabledButton,
                ]}
                onPress={joinRoom}
                disabled={isConnecting}
              >
                <Text style={styles.primaryButtonText}>
                  {isConnecting ? "Joining..." : "Join Room"}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <Text style={styles.dividerText}>OR</Text>
              </View>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={createNewRoom}
              >
                <Text style={styles.secondaryButtonText}>Generate Room ID</Text>
              </TouchableOpacity>
            </View>

            {(user?.privilege === "instructor" ||
              user?.privilege === "admin") && (
              <View style={styles.instructorModeContainer}>
                <TouchableOpacity
                  style={styles.instructorButton}
                  onPress={enterInstructorMode}
                >
                  <MaterialCommunityIcons
                    name="school"
                    size={20}
                    color="#d9cc03"
                  />
                  <Text style={styles.instructorButtonText}>
                    Instructor Mode
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );

  const renderTeamSelection = () => (
    <View style={styles.container}>
      <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={leaveGame}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color="#2acde6"
              />
            </TouchableOpacity>
            <Text style={styles.title}>Select Your Team</Text>
            <Text style={styles.subtitle}>Room ID: {gameData.roomId}</Text>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.teamsGrid}>
              {Object.entries(TEAMS).map(([teamKey, team]) => {
                const teamData = gameData.teams[teamKey] || { players: [] };
                const isSelected = selectedTeam === teamKey;

                return (
                  <TouchableOpacity
                    key={teamKey}
                    style={[
                      styles.teamCard,
                      { borderColor: team.color },
                      isSelected && { borderWidth: 3 },
                    ]}
                    onPress={() => selectTeam(teamKey)}
                  >
                    <LinearGradient
                      colors={[`${team.color}20`, `${team.color}10`]}
                      style={styles.teamCardGradient}
                    >
                      <MaterialCommunityIcons
                        name={team.icon}
                        size={40}
                        color={team.color}
                      />
                      <Text style={[styles.teamName, { color: team.color }]}>
                        {team.name}
                      </Text>
                      <Text style={styles.playerCount}>
                        {teamData.players.length} players
                      </Text>

                      {teamData.players.length > 0 && (
                        <View style={styles.playerList}>
                          {teamData.players.map((player, index) => (
                            <Text key={index} style={styles.playerName}>
                              {player.name}
                            </Text>
                          ))}
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ marginTop: 10 }}>
              {isCreator && (
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={startGame}
                >
                  <Text style={styles.startButtonText}>Start Game</Text>
                </TouchableOpacity>
              )}
              {/* Leave button visible to everyone */}
              <TouchableOpacity
                style={[styles.leaveRoomButton, { marginTop: 12 }]}
                onPress={leaveGame}
              >
                <MaterialCommunityIcons
                  name="exit-to-app"
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.leaveRoomButtonText}>Leave Room</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );

  const renderGameplay = () => {
    const currentQuestion = getCurrentQuestion();
    const currentPlayer = getCurrentPlayer();
    const myTurn = isMyTurn();

    if (!currentQuestion) {
      return (
        <View style={styles.container}>
          <LinearGradient
            colors={["#caf1c8", "#5fd2cd"]}
            style={styles.gradient}
          >
            <SafeAreaView style={styles.safeArea}>
              <Text style={styles.title}>Loading...</Text>
            </SafeAreaView>
          </LinearGradient>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            {/* Game Header */}
            <View style={styles.gameHeader}>
              <View style={styles.questionInfo}>
                <Text style={styles.questionNumber}>
                  Question{" "}
                  {(gameData.currentQuestionIndex !== undefined
                    ? gameData.currentQuestionIndex
                    : gameData.currentQuestion) + 1}{" "}
                  of {gameData.questions.length}
                </Text>
                <Text style={styles.questionCategory}>
                  {currentQuestion.category}
                </Text>
              </View>

              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>{gameData.timer}s</Text>
              </View>
            </View>

            {/* Current Player */}
            <View
              style={[
                styles.currentPlayerContainer,
                myTurn && styles.myTurnContainer,
              ]}
            >
              <Text
                style={[styles.currentPlayerText, myTurn && styles.myTurnText]}
              >
                {myTurn ? "Your Turn!" : `${currentPlayer?.name}'s Turn`}
              </Text>
              <Text
                style={[
                  styles.currentTeamText,
                  myTurn && styles.myTurnTeamText,
                ]}
              >
                {gameData.teams[gameData.currentTeam]?.name}
              </Text>
            </View>

            {/* Question */}
            <View style={styles.questionContainer}>
              <Text style={styles.questionText}>
                {currentQuestion.question}
              </Text>
            </View>

            {/* Answer Options */}
            {/* Answer Options */}
            <View style={styles.optionsGridContainer}>
              {currentQuestion.options.map((option, index) => {
                // Updated option colors with white text and 100% opacity backgrounds
                const optionColors = {
                  0: {
                    background: "#f59e0b", // Yellow background
                    border: "#f59e0b", // Yellow border
                    text: "#FFFFFF", // White text
                  },
                  1: {
                    background: "#3b82f6", // Blue background
                    border: "#3b82f6", // Blue border
                    text: "#FFFFFF", // White text
                  },
                  2: {
                    background: "#8b5cf6", // Purple background
                    border: "#8b5cf6", // Purple border
                    text: "#FFFFFF", // White text
                  },
                  3: {
                    background: "#ef4444", // Red background
                    border: "#ef4444", // Red border
                    text: "#FFFFFF", // White text
                  },
                };

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionButtonGrid,
                      {
                        backgroundColor: optionColors[index].background,
                        borderColor: optionColors[index].border,
                      },
                      selectedAnswer === index && styles.selectedOption,
                      // Only highlight the correct answer if the last submitted answer was correct
                      showResult &&
                        lastAnswerCorrect &&
                        answeredQuestionIndexRef.current ===
                          (gameData.currentQuestionIndex !== undefined
                            ? gameData.currentQuestionIndex
                            : gameData.currentQuestion) &&
                        index === currentQuestion.correctAnswer &&
                        styles.correctOption,
                      showResult &&
                        selectedAnswer === index &&
                        index !== currentQuestion.correctAnswer &&
                        styles.wrongOption,
                    ]}
                    onPress={() => handleAnswerSelect(index)}
                    disabled={!myTurn || selectedAnswer !== null}
                  >
                    <Text
                      style={[
                        styles.optionTextGrid,
                        { color: optionColors[index].text },
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Game Controls */}
            <View style={styles.gameControls}>
              <TouchableOpacity
                style={styles.passButton}
                onPress={usePass}
                disabled={!myTurn}
              >
                <Text style={styles.passButtonText}>Use Pass</Text>
                <Text style={styles.passesRemaining}>
                  {gameData.teams[gameData.currentTeam]?.passesRemaining || 0}{" "}
                  left
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.leaderboardButton}
                onPress={() => setShowLeaderboard(true)}
              >
                <MaterialCommunityIcons
                  name="trophy"
                  size={20}
                  color="#2acde6"
                />
                <Text style={styles.leaderboardButtonText}>Leaderboard</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  };

  const renderFinished = () => {
    const winningTeam = getWinningTeam();
    const playerTeam = getPlayerTeam();
    const isWinner =
      playerTeam && winningTeam && playerTeam.teamId === winningTeam.teamId;
    const teamStats = getTeamStats().sort((a, b) => b.score - a.score);

    return (
      <View style={styles.container}>
        <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.finishedContainer}>
              {/* Game Over Header */}
              <View style={styles.gameOverHeader}>
                <MaterialCommunityIcons
                  name="flag-checkered"
                  size={60}
                  color={isWinner ? "#10b981" : "#2acde6"}
                />
                <Text style={styles.gameOverTitle}>Game Over!</Text>
              </View>

              {/* Winner/Loser Message */}
              <View style={styles.resultMessageContainer}>
                {isWinner ? (
                  <View style={styles.winnerMessage}>
                    <MaterialCommunityIcons
                      name="trophy"
                      size={40}
                      color="#2acde6"
                    />
                    <Text style={styles.congratsText}>Congratulations!</Text>
                    <Text style={styles.winnerText}>
                      🎉 {playerTeam.name} Won! 🎉
                    </Text>
                    <Text style={styles.finalScoreText}>
                      Final Score: {playerTeam.score} points
                    </Text>
                  </View>
                ) : (
                  <View style={styles.loserMessage}>
                    <MaterialCommunityIcons
                      name="emoticon-sad"
                      size={40}
                      color="#64748b"
                    />
                    <Text style={styles.lostText}>
                      Your team didn&apos;t win this time
                    </Text>
                    <Text style={styles.winnerAnnouncementText}>
                      🏆 {winningTeam?.name} Won! 🏆
                    </Text>
                    <Text style={styles.encouragementText}>
                      Better luck next time!
                    </Text>
                    {playerTeam && (
                      <Text style={styles.yourScoreText}>
                        Your team score: {playerTeam.score} points
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* Final Leaderboard */}
              <View style={styles.finalLeaderboard}>
                <Text style={styles.leaderboardTitle}>Final Rankings</Text>
                {teamStats.map((team, index) => (
                  <View
                    key={team.teamId}
                    style={[
                      styles.finalTeamRow,
                      playerTeam &&
                        team.teamId === playerTeam.teamId &&
                        index !== 0 &&
                        index !== 1 &&
                        styles.highlightedTeamRow,
                    ]}
                  >
                    <View style={styles.rankContainer}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                      {index === 0 && (
                        <MaterialCommunityIcons
                          name="crown"
                          size={20}
                          color="#2acde6"
                        />
                      )}
                    </View>
                    <View
                      style={[
                        styles.teamColorIndicator,
                        { backgroundColor: team.color },
                      ]}
                    />
                    <Text style={styles.finalTeamName}>{team.name}</Text>
                    <Text style={styles.finalTeamScore}>{team.score} pts</Text>
                  </View>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={styles.finishedActions}>
                <TouchableOpacity
                  style={styles.playAgainButton}
                  onPress={() => {
                    setGamePhase(PHASES.ROOM_SETUP);
                    setRoomId("");
                    setSelectedTeam(null);
                    setGameData({
                      roomId: "",
                      players: [],
                      teams: {},
                      currentQuestion: 0,
                      currentQuestionIndex: 0,
                      questions: [],
                      currentTeam: "A",
                      currentPlayerIndex: 0,
                      timer: 30,
                      isTimerActive: false,
                      phase: PHASES.ROOM_SETUP,
                    });
                  }}
                >
                  <MaterialCommunityIcons
                    name="refresh"
                    size={20}
                    color="#92eacc"
                  />
                  <Text style={styles.playAgainText}>Play Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backToMenuButton}
                  onPress={() => router.push("/(tabs)/game")}
                >
                  <MaterialCommunityIcons
                    name="home"
                    size={20}
                    color="#f8fafc"
                  />
                  <Text style={styles.backToMenuText}>Back to Menu</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  };

  // Leaderboard Modal
  const renderLeaderboardModal = () => {
    const teamStats = getTeamStats().sort((a, b) => b.score - a.score);
    const playerTeam = getPlayerTeam();

    return (
      <Modal
        visible={showLeaderboard}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLeaderboard(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={["#caf1c8", "#5fd2cd"]}
            style={styles.gradient}
          >
            <SafeAreaView style={styles.modalSafeArea}>
              {/* Modal Header */}
              <View style={styles.leaderboardModalHeader}>
                <TouchableOpacity
                  style={styles.modalBackButton}
                  onPress={() => setShowLeaderboard(false)}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color="#2acde6"
                  />
                </TouchableOpacity>
                <Text style={styles.leaderboardModalTitle}>
                  Live Leaderboard
                </Text>
                <View style={styles.headerSpacer} />
              </View>

              {/* Leaderboard Content */}
              <ScrollView style={styles.leaderboardModalContent}>
                <View style={styles.leaderboardContainer}>
                  <Text style={styles.leaderboardSubtitle}>
                    Current Team Rankings
                  </Text>

                  {teamStats.map((team, index) => (
                    <View
                      key={team.teamId}
                      style={[
                        styles.leaderboardTeamRow,
                        playerTeam &&
                          team.teamId === playerTeam.teamId &&
                          index !== 0 &&
                          index !== 1 &&
                          styles.highlightedLeaderboardRow,
                        index === 0 && styles.winningTeamRow,
                      ]}
                    >
                      <View style={styles.leaderboardRankContainer}>
                        <Text style={styles.leaderboardRankText}>
                          #{index + 1}
                        </Text>
                        {index === 0 && (
                          <MaterialCommunityIcons
                            name="crown"
                            size={20}
                            color="#2acde6"
                          />
                        )}
                      </View>

                      <View
                        style={[
                          styles.leaderboardTeamColorIndicator,
                          { backgroundColor: team.color },
                        ]}
                      />

                      <View style={styles.leaderboardTeamInfo}>
                        <Text style={styles.leaderboardTeamName}>
                          {team.name}
                        </Text>
                        <Text style={styles.leaderboardPlayerCount}>
                          {team.players.length} player
                          {team.players.length !== 1 ? "s" : ""}
                        </Text>
                      </View>

                      <View style={styles.leaderboardScoreContainer}>
                        <Text style={styles.leaderboardScore}>
                          {team.score}
                        </Text>
                        <Text style={styles.leaderboardScoreLabel}>points</Text>
                      </View>

                      <View style={styles.leaderboardPassesContainer}>
                        <Text style={styles.leaderboardPasses}>
                          {team.passesRemaining}
                        </Text>
                        <Text style={styles.leaderboardPassesLabel}>
                          passes
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Your Team Info */}
                {playerTeam && (
                  <View style={styles.yourTeamContainer}>
                    <Text style={styles.yourTeamTitle}>Your Team</Text>
                    <View style={styles.yourTeamInfo}>
                      <View
                        style={[
                          styles.yourTeamColorIndicator,
                          { backgroundColor: playerTeam.color },
                        ]}
                      />
                      <Text style={styles.yourTeamName}>{playerTeam.name}</Text>
                      <Text style={styles.yourTeamScore}>
                        {playerTeam.score || 0} points
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </LinearGradient>
        </View>
      </Modal>
    );
  };

  // Main render
  const mainRender = () => {
    switch (gamePhase) {
      case PHASES.ROOM_SETUP:
        return renderRoomSetup();
      case PHASES.TEAM_SELECTION:
        return renderTeamSelection();
      case PHASES.PLAYING:
        return renderGameplay();
      case PHASES.FINISHED:
        return renderFinished();
      case PHASES.INSTRUCTOR_EDITOR:
        return renderInstructorEditor();
      default:
        return renderRoomSetup();
    }
  };

  return (
    <>
      {mainRender()}
      {renderLeaderboardModal()}
      {renderUploadSuccessModal()}
      {renderUploadFailureModal()}
      {renderLoadSuccessModal()}
      {renderLoadFailureModal()}
    </>
  );
}

// Styles
const styles = StyleSheet.create({
  optionsGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
    width: "100%",
    ...Platform.select({
      web: {
        maxWidth: 600, // Reduced from 800 to make container smaller
        marginHorizontal: "auto",
        justifyContent: "center", // Center the grid items
        gap: 16, // Add some consistent spacing between items
      },
      default: {},
    }),
  },
  optionButtonGrid: {
    width: "48%", // Just under 50% to allow for spacing
    aspectRatio: 1, // Make it square
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    ...Platform.select({
      web: {
        transition: "0.2s all ease",
        cursor: "pointer",
        maxWidth: 220, // Limit the maximum width on web
        maxHeight: 220, // Limit the maximum height on web
        width: "calc(40% - 8px)", // Make them smaller, with space between
        marginHorizontal: 8, // Add horizontal margin for spacing
      },
      default: {},
    }),
  },
  optionTextGrid: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    ...Platform.select({
      web: {
        maxWidth: "100%", // Ensure text doesn't overflow
        overflow: "hidden", // Hide overflowing text
      },
      default: {},
    }),
  },
  currentPlayerContainer: {
    backgroundColor: "#f1fffb",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    ...Platform.select({
      web: {
        maxWidth: 800,
        marginHorizontal: "auto",
        transition: "all 0.3s ease", // Smooth transition for web
      },
      default: {},
    }),
  },
  myTurnContainer: {
    backgroundColor: "#4ade80", // Bright green background
    borderWidth: 2,
    borderColor: "#16a34a", // Darker green border
  },
  myTurnText: {
    color: "#ffffff", // White text for better contrast on green
    fontWeight: "bold",
    fontSize: 20, // Larger size
  },
  myTurnTeamText: {
    color: "#ffffff", // White text for better contrast on green
    fontWeight: "500",
  },
  container: {
    flex: 1,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: "100%",
      },
      default: {},
    }),
  },
  gradient: {
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
    padding: 20,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 1200,
      },
      default: {},
    }),
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
    width: "100%",
  },
  backButton: {
    position: "absolute",
    left: 0,
    top: 10,
    padding: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  content: {
    flex: 1,
    width: "100%",
    ...Platform.select({
      web: {
        maxWidth: 800,
        alignSelf: "center",
      },
      default: {},
    }),
  },
  setupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 30,
    alignItems: "center",
    ...Platform.select({
      web: {
        width: 600,
        maxWidth: "90%",
        marginHorizontal: "auto",
        minWidth: 480, // Ensure minimum width on web
      },
      default: {},
    }),
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#f8fafc",
    marginBottom: 30,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a5344",
    textAlign: "center",
    marginBottom: 20,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 20,
    ...Platform.select({
      web: {
        maxWidth: 500,
      },
      default: {},
    }),
  },
  label: {
    fontSize: 16,
    color: "#258977",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "rgba(146, 234, 204, 0.8)",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: "#1a5344",
    borderWidth: 1,
    borderColor: "#475569",
    ...Platform.select({
      web: {
        minWidth: "100%",
      },
      default: {},
    }),
  },
  playerNameDisplay: {
    backgroundColor: "rgba(146, 234, 204, 0.6)",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: "#94a3b8",
    borderWidth: 1,
    borderColor: "#475569",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: "#aae021",
    borderRadius: 10,
    padding: 15,
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
    ...Platform.select({
      web: {
        maxWidth: 500,
      },
      default: {},
    }),
  },
  disabledButton: {
    backgroundColor: "#64748b",
  },
  primaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
    width: "100%",
    ...Platform.select({
      web: {
        maxWidth: 500,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  dividerText: {
    color: "#64748b",
    marginHorizontal: 15,
    textAlign: "center",
    alignSelf: "center",
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: "#2acde6",
    borderRadius: 10,
    padding: 15,
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
    ...Platform.select({
      web: {
        maxWidth: 500,
        // Center horizontally on wide screens (e.g., Select Your Team view)
        marginHorizontal: "auto",
        alignSelf: "center",
      },
      default: {},
    }),
  },
  secondaryButtonText: {
    color: "#2acde6",
    fontSize: 16,
    fontWeight: "bold",
  },
  instructorButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    justifyContent: "center",
    backgroundColor: "#1d1f0a",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    // Constrain width and center it
    alignSelf: "center",
    ...Platform.select({
      web: {
        maxWidth: 260,
        width: "100%",
      },
      default: {
        minWidth: 180,
      },
    }),
  },
  instructorButtonText: {
    color: "#d9cc03",
    fontSize: 16,
    marginLeft: 8,
    textAlign: "center",
    fontWeight: "600",
  },
  instructorModeContainer: {
    // Simplified container so excess background panel is removed
    marginTop: 20,
    alignItems: "center",
    padding: 0,
    backgroundColor: "transparent",
    borderRadius: 0,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 800,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  teamsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    ...Platform.select({
      web: {
        justifyContent: "center",
        gap: 16,
      },
      default: {},
    }),
  },
  teamCard: {
    width: "48%",
    marginBottom: 20,
    borderRadius: 15,
    borderWidth: 2,
    overflow: "hidden",
    ...Platform.select({
      web: {
        width: 300,
        maxWidth: "45%",
      },
      default: {},
    }),
  },
  teamCardGradient: {
    // Make gradient background fully responsive to content & parent size
    backgroundColor: "#f1fffb",
    padding: 20,
    alignItems: "center",
    minHeight: 120,
    borderRadius: 13,
    // Ensure it stretches when border width / content height changes
    width: "100%",
    alignSelf: "stretch",
    flexGrow: 1,
    flexShrink: 1,
  },
  teamName: {
    fontSize: 16,
    color: "#3cbda2",
    fontWeight: "bold",
    marginTop: 10,
  },
  playerCount: {
    fontSize: 12,
    color: "#3cbda2",
    marginTop: 5,
  },
  playerList: {
    marginTop: 10,
    alignItems: "center",
  },
  playerName: {
    fontSize: 12,
    // Use dark text for better readability on light team card background
    color: "#1a5344",
    marginVertical: 2,
  },
  startButton: {
    backgroundColor: "#10b981",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    marginTop: 20,
    ...Platform.select({
      web: {
        maxWidth: 400,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  startButtonText: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "bold",
  },
  leaveRoomButton: {
    flexDirection: "row",
    backgroundColor: "#e11d48", // Bright red color for better visibility
    borderRadius: 15,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    // Add shadow for better visibility
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    ...Platform.select({
      web: {
        maxWidth: 400,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  leaveRoomButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  gameHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  questionInfo: {
    flex: 1,
  },
  questionNumber: {
    fontSize: 14,
    color: "#3cbda2",
  },
  questionCategory: {
    fontSize: 16,
    color: "#3cbda2",
    fontWeight: "bold",
  },
  timerContainer: {
    backgroundColor: "#ef4444",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  timerText: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "bold",
  },

  currentPlayerText: {
    fontSize: 18,
    color: "#3cbda2",
    fontWeight: "bold",
  },
  currentTeamText: {
    fontSize: 14,
    color: "#3cbda2",
    marginTop: 5,
  },
  questionContainer: {
    backgroundColor: "#f1fffb",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    ...Platform.select({
      web: {
        maxWidth: 800,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  questionText: {
    fontSize: 18,
    color: "#3cbda2",
    textAlign: "center",
    lineHeight: 24,
  },
  optionsContainer: {
    flex: 1,
    marginBottom: 20,
    width: "100%",
    ...Platform.select({
      web: {
        maxWidth: 800,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  optionButton: {
    backgroundColor: "#f1fffb",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
    ...Platform.select({
      web: {
        transition: "0.2s all ease",
        cursor: "pointer",
      },
      default: {},
    }),
  },
  selectedOption: {
    borderColor: "#3cbda2",
  },
  correctOption: {
    backgroundColor: "rgba(16, 185, 129, 0.3)",
    borderColor: "#10b981",
  },
  wrongOption: {
    backgroundColor: "rgba(239, 68, 68, 0.3)",
    borderColor: "#ef4444",
  },
  optionText: {
    fontSize: 16,
    color: "#3cbda2",
    textAlign: "center",
  },
  gameControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    ...Platform.select({
      web: {
        maxWidth: 800,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  passButton: {
    backgroundColor: "#8b5cf6",
    borderRadius: 10,
    padding: 15,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  passButtonText: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "bold",
  },
  passesRemaining: {
    color: "#e2e8f0",
    fontSize: 12,
    marginTop: 2,
  },
  leaderboardButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  leaderboardButtonText: {
    color: "#1a5344",
    fontSize: 16,
    marginLeft: 8,
  },
  // Instructor Editor Styles
  editorActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginBottom: 20,
    gap: 12,
    ...Platform.select({
      web: {
        maxWidth: 1000,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  loadQuestionsButton: {
    flexGrow: 1,
    flexBasis: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a5344",
    borderRadius: 10,
    padding: 12,
    justifyContent: "center",
  },
  loadQuestionsText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  uploadQuestionsButton: {
    flexGrow: 1,
    flexBasis: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    padding: 12,
    justifyContent: "center",
  },
  uploadQuestionsText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  downloadQuestionsButton: {
    flexGrow: 1,
    flexBasis: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    borderRadius: 10,
    padding: 12,
    justifyContent: "center",
  },
  downloadQuestionsText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  refreshQuestionsButton: {
    flexGrow: 1,
    flexBasis: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    borderRadius: 10,
    padding: 12,
    justifyContent: "center",
    marginHorizontal: 5,
  },
  refreshQuestionsText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  disabledButtonAlt: {
    opacity: 0.6,
  },
  // Upload Modal Styles
  uploadModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadModalContainer: {
    backgroundColor: "#92eacc",
    borderRadius: 15,
    padding: 20,
    margin: 20,
    maxWidth: 400,
    width: "90%",
  },
  uploadModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f8fafc",
    marginBottom: 15,
    textAlign: "center",
  },
  uploadModalDescription: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 15,
    lineHeight: 20,
  },
  fileInfoContainer: {
    backgroundColor: "#92eacc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  fileInfoText: {
    fontSize: 14,
    color: "#f8fafc",
    fontWeight: "600",
  },
  fileInfoDetails: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  formatExample: {
    backgroundColor: "#92eacc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  formatExampleText: {
    fontSize: 12,
    color: "#10b981",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  uploadModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  uploadModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  uploadModalCancelButton: {
    backgroundColor: "#64748b",
  },
  uploadModalConfirmButton: {
    backgroundColor: "#10b981",
  },
  uploadModalCancelText: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "600",
  },
  uploadModalConfirmText: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "600",
  },

  // Result Modal Styles (Success/Failure)
  resultModalContainer: {
    backgroundColor: "#92eacc",
    borderRadius: 15,
    padding: 30,
    margin: 20,
    maxWidth: 400,
    width: "90%",
    alignItems: "center",
  },
  successIconContainer: {
    marginBottom: 20,
  },
  errorIconContainer: {
    marginBottom: 20,
  },
  resultModalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#f8fafc",
    marginBottom: 15,
    textAlign: "center",
  },
  resultModalMessage: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  errorListContainer: {
    maxHeight: 150,
    width: "100%",
    marginBottom: 20,
  },
  errorListTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ef4444",
    marginBottom: 8,
  },
  errorListItem: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 4,
    paddingLeft: 8,
  },
  resultModalActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    width: "100%",
  },
  resultModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 100,
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  retryButton: {
    backgroundColor: "#3b82f6",
  },
  cancelButton: {
    backgroundColor: "#64748b",
  },
  resultModalButtonText: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "600",
  },

  addQuestionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    justifyContent: "center",
    ...Platform.select({
      web: {
        maxWidth: 600,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  addQuestionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  questionsContainer: {
    flex: 1,
    width: "100%",
    borderRadius: 12,
    padding: 15,
    ...Platform.select({
      web: {
        maxWidth: 1000,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  questionCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  questionInfoHeader: {
    flex: 1,
    marginRight: 10,
  },
  questionTitle: {
    fontSize: 16,
    color: "#1a5344",
    fontWeight: "bold",
    marginBottom: 5,
  },
  questionMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryText: {
    fontSize: 12,
    color: "#1a5344",
    backgroundColor: "rgba(146, 234, 204, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  questionActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    padding: 8,
    marginRight: 5,
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  deleteButton: {
    padding: 8,
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  optionsPreview: {
    marginTop: 10,
  },
  optionPreview: {
    fontSize: 12,
    color: "#1a5344",
    marginBottom: 2,
    paddingLeft: 10,
  },
  correctOptionPreview: {
    color: "#10b981",
    fontWeight: "bold",
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    ...Platform.select({
      web: {
        width: "100%",
      },
      default: {},
    }),
  },
  modalSafeArea: {
    flex: 1,
    padding: 20,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 1200,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#475569",
    width: "100%",
  },
  modalBackButton: {
    padding: 5,
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "#10b981",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  modalContent: {
    flex: 1,
    width: "100%",
  },
  questionInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    ...Platform.select({
      web: {
        maxWidth: 800,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  halfContainer: {
    flex: 0.48,
  },
  pickerContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(146, 234, 204, 0.8)",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#475569",
  },
  pickerOption: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  selectedPicker: {
    backgroundColor: "#2acde6",
  },
  pickerText: {
    fontSize: 14,
    color: "#e2e8f0",
  },
  selectedPickerText: {
    color: "#92eacc",
    fontWeight: "bold",
  },
  pointsDisplay: {
    backgroundColor: "rgba(146, 234, 204, 0.8)",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#475569",
  },
  pointsText: {
    fontSize: 18,
    color: "#2acde6",
    fontWeight: "bold",
  },
  optionContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  correctAnswerButton: {
    marginRight: 10,
    padding: 5,
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  selectedCorrectAnswer: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: 15,
  },
  optionInput: {
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
    marginTop: 5,
  },
  // Finished screen styles
  finishedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 800,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  gameOverHeader: {
    alignItems: "center",
    marginBottom: 30,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#f8fafc",
    marginTop: 10,
    textAlign: "center",
  },
  resultMessageContainer: {
    alignItems: "center",
    marginBottom: 30,
    width: "100%",
    ...Platform.select({
      web: {
        maxWidth: 600,
      },
      default: {},
    }),
  },
  winnerMessage: {
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: "#10b981",
    width: "100%",
  },
  loserMessage: {
    alignItems: "center",
    backgroundColor: "rgba(100, 116, 139, 0.1)",
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: "#64748b",
    width: "100%",
  },
  congratsText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10b981",
    marginTop: 10,
  },
  winnerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2acde6",
    marginTop: 10,
    textAlign: "center",
  },
  lostText: {
    fontSize: 18,
    color: "#94a3b8",
    marginTop: 10,
    textAlign: "center",
  },
  winnerAnnouncementText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2acde6",
    marginTop: 10,
    textAlign: "center",
  },
  encouragementText: {
    fontSize: 16,
    color: "#e2e8f0",
    marginTop: 5,
    textAlign: "center",
  },
  finalScoreText: {
    fontSize: 16,
    color: "#10b981",
    marginTop: 10,
    fontWeight: "600",
  },
  yourScoreText: {
    fontSize: 16,
    color: "#94a3b8",
    marginTop: 10,
    fontWeight: "600",
  },
  finalLeaderboard: {
    width: "100%",
    backgroundColor: "#e8faee",
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ...Platform.select({
      web: {
        maxWidth: 600,
      },
      default: {},
    }),
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#23cf90",
    textAlign: "center",
    marginBottom: 15,
  },
  finalTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#e8faee",
  },
  highlightedTeamRow: {
    backgroundColor: "#c2ffdc",
    borderWidth: 1,
    borderColor: "#10b981",
  },
  rankContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 40,
  },
  rankText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#23cf90",
    marginRight: 5,
  },
  teamColorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 15,
  },
  finalTeamName: {
    flex: 1,
    fontSize: 16,
    color: "#23cf90",
    fontWeight: "600",
  },
  finalTeamScore: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#23cf90",
  },
  finishedActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 15,
    ...Platform.select({
      web: {
        maxWidth: 600,
      },
      default: {},
    }),
  },
  playAgainButton: {
    flex: 1,
    backgroundColor: "#2acde6",
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  playAgainText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#92eacc",
    marginLeft: 5,
  },
  backToMenuButton: {
    flex: 1,
    backgroundColor: "rgba(146, 234, 204, 0.8)",
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#475569",
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  backToMenuText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f8fafc",
    marginLeft: 5,
  },
  // Leaderboard Modal Styles
  leaderboardModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  leaderboardModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a5344",
  },
  headerSpacer: {
    width: 40,
  },
  leaderboardModalContent: {
    flex: 1,
    padding: 20,
  },
  leaderboardContainer: {
    marginBottom: 20,
  },
  leaderboardSubtitle: {
    fontSize: 16,
    color: "#23cf90",
    textAlign: "center",
    marginBottom: 20,
  },
  leaderboardTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8faee",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  highlightedLeaderboardRow: {
    backgroundColor: "#c2ffdc",
    borderColor: "#10b981",
    borderWidth: 1,
  },
  winningTeamRow: {
    backgroundColor: "#c2ffdc",
    borderColor: "#10b981",
  },
  leaderboardRankContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 50,
  },
  leaderboardRankText: {
    fontSize: 18,
    fontWeight: "bold",
    // Changed from white to dark color for improved contrast / readability
    color: "#1a5344",
    marginRight: 5,
  },
  leaderboardTeamColorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 15,
  },
  leaderboardTeamInfo: {
    flex: 1,
  },
  leaderboardTeamName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#23cf90",
  },
  leaderboardPlayerCount: {
    fontSize: 12,
    color: "#23cf90",
    marginTop: 2,
  },
  leaderboardScoreContainer: {
    alignItems: "center",
    marginRight: 15,
  },
  leaderboardScore: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#23cf90",
  },
  leaderboardScoreLabel: {
    fontSize: 10,
    color: "#23cf90",
  },
  leaderboardPassesContainer: {
    alignItems: "center",
    width: 50,
  },
  leaderboardPasses: {
    fontSize: 16,
    fontWeight: "600",
    color: "#23cf90",
  },
  leaderboardPassesLabel: {
    fontSize: 10,
    color: "#23cf90",
  },
  yourTeamContainer: {
    backgroundColor: "#e8faee",
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ...Platform.select({
      web: {
        maxWidth: 600,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  yourTeamTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#23cf90",
    marginBottom: 10,
    textAlign: "center",
  },
  yourTeamInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  yourTeamColorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  yourTeamName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#23cf90",
    marginRight: 10,
  },
  yourTeamScore: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#23cf90",
  },
  // Docs styles
  docsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366f1",
    borderRadius: 10,
    padding: 12,
    justifyContent: "center",
    flexGrow: 1,
    flexBasis: "48%",
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  docsButtonText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  docsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  docsContainer: {
    backgroundColor: "#92eacc",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 540,
    maxHeight: "85%",
  },
  docsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  docsTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  docsCloseButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  docsScroll: {
    marginTop: 4,
  },
  docsText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  moreMenuButton: {
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  actionsMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
    padding: 20,
  },
  actionsMenuContainer: {
    backgroundColor: "#92eacc",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    width: "100%",
    ...Platform.select({
      web: {
        maxWidth: 600,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  actionsMenuTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  actionsMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 12,
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  actionsMenuItemText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
  actionsMenuCloseItem: {
    marginTop: 6,
    backgroundColor: "rgba(248,113,113,0.08)",
  },
});
