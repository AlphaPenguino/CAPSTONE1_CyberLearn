import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import COLORS from "@/constants/custom-colors";
import quizShowdownSocket from "@/services/quizShowdownSocket";
import quizShowdownApi from "@/services/quizShowdownApi";
import { useAuthStore } from "@/store/authStore";
import { useSettings } from "@/contexts/SettingsContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { GameNotificationService } from "@/services/gameNotificationService";

// Mock questions with multiple choice format - Updated with comprehensive cybersecurity and ICT questions
const sampleQuestions = [
  {
    id: 1,
    question: "What does ICT stand for?",
    choices: [
      "Information and Communication Technology",
      "International Communication Tool",
      "Internet and Computer Technology",
      "Information for Computer Training",
    ],
    correctAnswer: 0,
    category: "ICT Fundamentals",
    points: 1,
  },
  {
    id: 2,
    question: "Which port is commonly used for HTTPS communication?",
    choices: ["80", "443", "8080", "3000"],
    correctAnswer: 1,
    category: "Network Security",
    points: 1,
  },
  {
    id: 3,
    question: "What does DDoS stand for in cybersecurity?",
    choices: [
      "Direct Denial of Service",
      "Distributed Denial of Service",
      "Dynamic Denial of Service",
      "Digital Denial of Service",
    ],
    correctAnswer: 1,
    category: "Cybersecurity",
    points: 2,
  },
  {
    id: 4,
    question: "Which of the following is NOT a programming language?",
    choices: ["Python", "JavaScript", "HTML", "Java"],
    correctAnswer: 2,
    category: "Programming",
    points: 1,
  },
  {
    id: 5,
    question: "What is the primary purpose of a firewall in network security?",
    choices: [
      "To cool down the computer",
      "To prevent unauthorized network access",
      "To speed up internet connection",
      "To store backup data",
    ],
    correctAnswer: 1,
    category: "Network Security",
    points: 2,
  },
  {
    id: 6,
    question:
      "Which protocol is used for secure file transfer over the internet?",
    choices: ["FTP", "HTTP", "SFTP", "SMTP"],
    correctAnswer: 2,
    category: "Network Protocols",
    points: 2,
  },
  {
    id: 7,
    question: "What does CPU stand for in computer hardware?",
    choices: [
      "Computer Processing Unit",
      "Central Processing Unit",
      "Central Program Unit",
      "Computer Program Unit",
    ],
    correctAnswer: 1,
    category: "Computer Hardware",
    points: 1,
  },
  {
    id: 8,
    question: "Which of these is a type of malicious software (malware)?",
    choices: ["Cookie", "Cache", "Trojan Horse", "Browser"],
    correctAnswer: 2,
    category: "Cybersecurity",
    points: 2,
  },
  {
    id: 9,
    question: "What does SQL stand for in database management?",
    choices: [
      "Structured Query Language",
      "Standard Question Language",
      "Simple Query Logic",
      "System Query Library",
    ],
    correctAnswer: 0,
    category: "Database",
    points: 1,
  },
  {
    id: 10,
    question:
      "Which authentication method requires two different verification factors?",
    choices: [
      "Single Sign-On (SSO)",
      "Two-Factor Authentication (2FA)",
      "Password Authentication",
      "Biometric Authentication",
    ],
    correctAnswer: 1,
    category: "Authentication",
    points: 2,
  },
  {
    id: 11,
    question: "What is phishing in cybersecurity?",
    choices: [
      "A type of computer virus",
      "A method of data encryption",
      "A social engineering attack to steal sensitive information",
      "A network monitoring tool",
    ],
    correctAnswer: 2,
    category: "Social Engineering",
    points: 2,
  },
  {
    id: 12,
    question: "Which of the following is the most secure password practice?",
    choices: [
      "Using the same password for all accounts",
      "Using a mix of uppercase, lowercase, numbers, and symbols",
      "Using only numbers for easy remembering",
      "Using personal information like birthdate",
    ],
    correctAnswer: 1,
    category: "Authentication",
    points: 1,
  },
  {
    id: 13,
    question: "What does VPN stand for in network security?",
    choices: [
      "Virtual Private Network",
      "Very Personal Network",
      "Verified Private Network",
      "Virtual Public Network",
    ],
    correctAnswer: 0,
    category: "Network Security",
    points: 1,
  },
  {
    id: 14,
    question:
      "Which device connects multiple computers to form a local network?",
    choices: ["Monitor", "Keyboard", "Router", "Printer"],
    correctAnswer: 2,
    category: "Computer Hardware",
    points: 1,
  },
  {
    id: 15,
    question: "What is ransomware in cybersecurity?",
    choices: [
      "Software that improves computer performance",
      "Malware that encrypts files and demands payment for decryption",
      "A tool for backing up important data",
      "A program for managing network connections",
    ],
    correctAnswer: 1,
    category: "Cybersecurity",
    points: 3,
  },
];

// Sample JSON structure for Quiz Showdown questions
const SAMPLE_QS_QUESTIONS = [
  {
    question: "What is the purpose of encryption in cybersecurity?",
    options: [
      "To speed up data transmission",
      "To protect data by converting it into unreadable code",
      "To compress data files",
      "To delete data permanently",
    ],
    correct: 1,
    category: "Cybersecurity",
    difficulty: "Medium",
    points: 2,
  },
  {
    question:
      "Which of the following is an example of multi-factor authentication?",
    options: [
      "Password only",
      "Password + SMS code",
      "PIN only",
      "Security question only",
    ],
    correct: 1,
    category: "Authentication",
    difficulty: "Easy",
    points: 1,
  },
  {
    question: "Which of these is a common hashing algorithm?",
    options: ["AES", "RSA", "SHA-256", "TLS"],
    correct: 2,
    category: "Cryptography",
    difficulty: "Medium",
    points: 2,
  },
  {
    question: "What does the principle of least privilege mean?",
    options: [
      "Users should have admin rights",
      "Users should get access only to what they need",
      "All users share the same permissions",
      "Developers should have production access",
    ],
    correct: 1,
    category: "Access Control",
    difficulty: "Hard",
    points: 3,
  },
  {
    question: "Which protocol adds security to HTTP?",
    options: ["FTP", "HTTPS", "TCP", "UDP"],
    correct: 1,
    category: "Web Security",
    difficulty: "Easy",
    points: 1,
  },
];

// Mock room data - sample rooms for reference
const PREMIUM_GRADIENT = ["#caf1c8", "#5fd2cd"];

export default function QuizShowdown() {
  const router = useRouter();
  const isMountedRef = useRef(true);
  // Properly manage mounted state so interval-based timers (countdown, buzzer, question) aren't blocked.
  // Previously, isMountedRef was set to false inside an effect cleanup that re-ran whenever dependencies changed,
  // causing timers to early-return and freeze (e.g., countdown stuck at 3). We isolate mount/unmount lifecycle here.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const { user } = useAuthStore(); // Get the logged user
  const { settings } = useSettings();
  const { showNotification } = useNotifications();

  // Refs for accessing current state in event handlers
  const playerNameRef = useRef("");
  const selectedTeamRef = useRef(null);
  const gameStateRef = useRef(null);
  const gamePhaseRef = useRef("lobby");
  const settingsRef = useRef(settings);
  const showNotificationRef = useRef(showNotification);
  const questionTimeoutSentRef = useRef(false);

  // Socket connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Game states
  const [gamePhase, setGamePhase] = useState("lobby"); // lobby, teamSelect, countdown, buzzer, question, answered, results, instructor
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState(user?.fullName || ""); // Use logged user's full name
  const [isCreator, setIsCreator] = useState(false);

  // Backend game state
  const [gameState, setGameState] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);

  // Team and player data
  const [teams, setTeams] = useState({
    // Updated default team colors per spec (Team A yellow, Team B violet)
    teamA: {
      name: "Team A",
      players: [],
      color: "#ffdd23", // header color
      bodyColor: "#fffecd",
      textColor: "#167a63",
      score: 0,
    },
    teamB: {
      name: "Team B",
      players: [],
      color: "#a29bec", // header color
      bodyColor: "#f5fff3",
      textColor: "#12765d",
      score: 0,
    },
  });
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Game mechanics
  const [roundNumber, setRoundNumber] = useState(1);
  const [countdown, setCountdown] = useState(3);
  const [buzzerTimer, setBuzzerTimer] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(15);
  const [canBuzz, setCanBuzz] = useState(false);
  const [buzzedTeam, setBuzzedTeam] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerResult, setAnswerResult] = useState(null); // To track answer correctness
  // Role based instructor privilege (only instructor/admin)
  const instructorPrivilege =
    user?.privilege === "instructor" || user?.privilege === "admin";
  const [isInstructor, setIsInstructor] = useState(false);
  const [showImportDocs, setShowImportDocs] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const renderImportDocsModal = () => (
    <Modal
      visible={showImportDocs}
      animationType="slide"
      transparent={true}
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
          <Text style={styles.actionsMenuTitle}>Question Manager</Text>
          <Text style={styles.actionsMenuSubtitle}>Quick tools for your question bank</Text>
          <TouchableOpacity
            style={styles.actionsMenuItem}
            onPress={() => {
              createNewQuestion();
              setShowActionsMenu(false);
            }}
          >
            <MaterialCommunityIcons name="plus-circle" size={20} color="#0f766e" />
            <Text style={styles.actionsMenuItemText}>Create Question</Text>
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
              color="#2563eb"
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
              color="#0f766e"
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
              color="#4f46e5"
            />
            <Text style={styles.actionsMenuItemText}>Import Docs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionsMenuItem, styles.actionsMenuCloseItem]}
            onPress={() => setShowActionsMenu(false)}
          >
            <MaterialCommunityIcons name="close" size={20} color="#dc2626" />
            <Text style={styles.actionsMenuItemText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // UI states
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showLeaveGameModal, setShowLeaveGameModal] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isJoiningTeam, setIsJoiningTeam] = useState(null); // Track which team is being joined
  const [isRestartingGame, setIsRestartingGame] = useState(false);

  // File upload states for instructor mode
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessModalVisible, setUploadSuccessModalVisible] =
    useState(false);
  const [uploadFailureModalVisible, setUploadFailureModalVisible] =
    useState(false);
  const [uploadResult, setUploadResult] = useState({
    message: "",
    count: 0,
    errors: [],
  });

  // Helper function to determine player's team from game state
  const determinePlayerTeam = (game, playerNameValue) => {
    if (!game || !playerNameValue) {
      console.log("determinePlayerTeam: Missing game or playerName", {
        game: !!game,
        playerName: playerNameValue,
      });
      return null;
    }

    // Check if player is in Team A
    const isInTeamA = game.teamA?.members?.some(
      (member) => member.name === playerNameValue
    );
    if (isInTeamA) {
      console.log("determinePlayerTeam: Player found in Team A");
      return "Team A";
    }

    // Check if player is in Team B
    const isInTeamB = game.teamB?.members?.some(
      (member) => member.name === playerNameValue
    );
    if (isInTeamB) {
      console.log("determinePlayerTeam: Player found in Team B");
      return "Team B";
    }

    console.log("determinePlayerTeam: Player not found in any team");
    return null;
  };

  // Helper function to update teams from game state
  const updateTeamsFromGameStateRef = useRef();
  updateTeamsFromGameStateRef.current = (game) => {
    if (!game) {
      console.log("updateTeamsFromGameState: No game data provided");
      return;
    }

    console.log("updateTeamsFromGameState: Game state received:", {
      teamA: game.teamA,
      teamB: game.teamB,
      currentPlayerName: playerNameRef.current,
      currentSelectedTeam: selectedTeamRef.current,
    });

    // Auto-recover selectedTeam if it's undefined but player is in a team
    if (!selectedTeamRef.current && playerNameRef.current) {
      const recoveredTeam = determinePlayerTeam(game, playerNameRef.current);
      if (recoveredTeam) {
        console.log(
          "updateTeamsFromGameState: Recovering selectedTeam to:",
          recoveredTeam
        );
        setSelectedTeam(recoveredTeam);
      }
    }

    const newTeamsState = {
      teamA: {
        name: "Team A",
        players: (game.teamA?.members || []).map((member) => member.name),
        color: "#ffdd23", // header
        bodyColor: "#fffecd",
        textColor: "#167a63",
        score: game.teamA?.score || 0,
      },
      teamB: {
        name: "Team B",
        players: (game.teamB?.members || []).map((member) => member.name),
        color: "#a29bec", // header
        bodyColor: "#f5fff3",
        textColor: "#12765d",
        score: game.teamB?.score || 0,
      },
    };

    console.log(
      "updateTeamsFromGameState: Setting new teams state:",
      newTeamsState
    );
    setTeams(newTeamsState);
  };

  const updateTeamsFromGameState = useCallback((game) => {
    updateTeamsFromGameStateRef.current(game);
  }, []);

  // Update refs when state changes
  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);

  useEffect(() => {
    selectedTeamRef.current = selectedTeam;
  }, [selectedTeam]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);

  useEffect(() => {
    if (gamePhase === "question") {
      questionTimeoutSentRef.current = false;
    }
  }, [gamePhase, roundNumber]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    showNotificationRef.current = showNotification;
  }, [showNotification]);

  // Update player name when user is loaded
  useEffect(() => {
    if (user?.fullName && !playerName) {
      setPlayerName(user.fullName);
    }
  }, [user?.fullName, playerName]);

  // Track the most recent room for reconnection purposes
  const lastRoomRef = useRef({ id: null, playerName: null });

  // Keep latest room data for reconnect flow.
  useEffect(() => {
    if (currentRoom?.id && playerName) {
      lastRoomRef.current = {
        id: currentRoom.id,
        playerName,
      };
    }
  }, [currentRoom?.id, playerName]);

  // Animations
  // Initialize socket connection and load questions
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await quizShowdownApi.getQuestions();
        if (response.success) {
          const rows = response.data || [];
          if (rows.length === 0) {
            setQuestions(sampleQuestions);
          } else {
            const convertedQuestions = rows.map((question) => ({
              ...question,
              choices: question.options,
              correctAnswer: question.correct,
              points: question.points || 1,
            }));
            setQuestions(convertedQuestions);
          }
        } else {
          setQuestions(sampleQuestions);
        }
      } catch (fetchErr) {
        console.error("Question fetch failed, using samples:", fetchErr);
        setQuestions(sampleQuestions);
      }
    };

    // Setup socket event listeners
    const handleSocketConnected = () => {
      setIsConnected(true);
      setConnectionError(null);

      const lastRoom = lastRoomRef.current;
      if (
        lastRoom?.id &&
        lastRoom?.playerName &&
        gamePhaseRef.current === "lobby"
      ) {
        setTimeout(() => {
          try {
            quizShowdownSocket.joinRoom(lastRoom.id, lastRoom.playerName);
          } catch (error) {
            console.error("Failed to auto-rejoin room:", error);
          }
        }, 600);
      }
    };

    const handleSocketDisconnected = () => {
      setIsConnected(false);
    };

    const handleSocketError = (data) => {
      setConnectionError(data.error);
    };

    const handleRoomCreated = (data) => {
      console.log("Room created successfully:", data);
      setCurrentRoom({ id: data.roomId, name: `Room ${data.roomId}` });
      setIsCreator(data.isCreator);
      setGameState(data.game);
      updateTeamsFromGameState(data.game);
      setGamePhase("teamSelect");

      // Update last room reference for reconnection support
      lastRoomRef.current = {
        id: data.roomId,
        playerName: playerNameRef.current,
      };
    };

    const handleRoomJoined = (data) => {
      console.log("Room joined successfully:", data);
      setCurrentRoom({ id: data.roomId, name: `Room ${data.roomId}` });
      setIsCreator(data.isCreator);
      setGameState(data.game);
      updateTeamsFromGameState(data.game);
      setGamePhase("teamSelect");
      setIsJoiningRoom(false); // Reset joining state

      // Update last room reference for reconnection support
      lastRoomRef.current = {
        id: data.roomId,
        playerName: playerNameRef.current,
      };
    };

    const handlePlayerJoined = (data) => {
      setGameState(data.game);
      updateTeamsFromGameState(data.game);
    };

    const handleTeamUpdated = (data) => {
      console.log("Team updated event received:", data);

      // Update game state first
      setGameState(data.game);

      // Then update teams display
      setTimeout(() => {
        updateTeamsFromGameState(data.game);
      }, 0);
    };

    const handleTeamJoined = (data) => {
      console.log("Team joined event received:", data);

      // Clear joining state
      setIsJoiningTeam(null);

      // Ensure we update selectedTeam first
      setSelectedTeam(data.teamName);

      // Then update game state and teams
      setGameState(data.game);

      // Force update teams from the new game state
      setTimeout(() => {
        updateTeamsFromGameState(data.game);
      }, 0);
    };

    const handleGameStarted = (data) => {
      setGameState(data.game);
      setGamePhase("countdown");
      setCountdown(3);
      updateCurrentQuestion(data.game);
    };

    const handleBuzzerActivated = (data) => {
      setGameState(data.game);
      setGamePhase("buzzer");
      setCanBuzz(true);
      setBuzzerTimer(10);
    };

    const handleTeamBuzzed = (data) => {
      setGameState(data.game);
      setBuzzedTeam(data.buzzedTeam);
      setCanBuzz(false);

      // Update teams first (this will auto-recover selectedTeam if needed)
      updateTeamsFromGameState(data.game);

      // Re-get selectedTeam after potential recovery
      let currentSelectedTeam = selectedTeamRef.current;
      if (!currentSelectedTeam && playerNameRef.current) {
        currentSelectedTeam = determinePlayerTeam(
          data.game,
          playerNameRef.current
        );
        if (currentSelectedTeam) {
          setSelectedTeam(currentSelectedTeam);
        }
      }

      // Ensure we're comparing the exact same team names
      const normalizedSelectedTeam = currentSelectedTeam?.trim();
      const normalizedBuzzedTeam = data.buzzedTeam?.trim();

      // Additional safety check - ensure both teams are valid
      if (!normalizedSelectedTeam || !normalizedBuzzedTeam) {
        // Don't return here - still set phase to show the game continues
        setGamePhase("answered");
        return;
      }

      if (normalizedBuzzedTeam === normalizedSelectedTeam) {
        setGamePhase("question");
        setQuestionTimer(15);
        setSelectedAnswer(null); // Reset any previous answer selection
      } else {
        setGamePhase("answered");
      }
    };

    const handleAnswerSubmitted = (data) => {
      setGameState(data.game);
      updateTeamsFromGameState(data.game);

      // Store the answer result to display in the UI
      const isCorrect = data.correct;
      const answeredIndex = data.answerIndex;
      const correctAnswerIndex = currentQuestion?.correctAnswer;

      // Update state to show the answer result
      setAnswerResult({
        isCorrect,
        answeredIndex,
        correctAnswerIndex,
        message: data.message,
      });

      // Set the game phase to "answered" to show the answer result
      setGamePhase("answered");

      // Reset selected answer after submission
      setSelectedAnswer(null);

      if (data.gameFinished) {
        // Show answer result for a moment before going to results screen
        setTimeout(() => {
          setGamePhase("results");
        }, 2000);
      } else if (data.nextQuestion) {
        // Move to next question after showing answer result
        setTimeout(() => {
          setBuzzedTeam(null);
          setCanBuzz(false);
          setAnswerResult(null); // Clear answer result
          setGamePhase("countdown");
          setCountdown(3);
          updateCurrentQuestion(data.game);
        }, 2000);
      } else if (data.nextTeam) {
        // Other team gets a chance to answer
        setBuzzedTeam(data.nextTeam);

        // Auto-recover selectedTeam if needed
        let currentSelectedTeam = selectedTeamRef.current;
        if (!currentSelectedTeam && playerNameRef.current) {
          currentSelectedTeam = determinePlayerTeam(
            data.game,
            playerNameRef.current
          );
          if (currentSelectedTeam) {
            setSelectedTeam(currentSelectedTeam);
          }
        }

        if (data.nextTeam?.trim() === currentSelectedTeam?.trim()) {
          setTimeout(() => {
            setGamePhase("question");
            setQuestionTimer(15);
            setSelectedAnswer(null); // Reset any previous answer selection
          }, 2000);
        }
      }
    };

    const handleTeamTurn = (data) => {
      setGameState(data.game);
      updateTeamsFromGameState(data.game);

      // Re-get selectedTeam after potential recovery
      let currentSelectedTeam = selectedTeamRef.current;
      if (!currentSelectedTeam && playerNameRef.current) {
        currentSelectedTeam = determinePlayerTeam(
          data.game,
          playerNameRef.current
        );
        if (currentSelectedTeam) {
          setSelectedTeam(currentSelectedTeam);
        }
      }

      // Set the team that should answer
      setBuzzedTeam(data.answeringTeam);

      if (data.answeringTeam?.trim() === currentSelectedTeam?.trim()) {
        setGamePhase("question");
        setQuestionTimer(15);
        setSelectedAnswer(null); // Reset any previous answer selection
      } else {
        setGamePhase("answered");
      }
    };

    const handleNextQuestion = (data) => {
      setGameState(data.game);
      setGamePhase("countdown");
      setCountdown(3);
      updateCurrentQuestion(data.game);
      setBuzzedTeam(null);
      setSelectedAnswer(null);
      setAnswerResult(null); // Clear answer result
      setCanBuzz(false);
    };

    const handleGameFinished = async (data) => {
      setGameState(data.game);
      setGamePhase("results");
      setIsRestartingGame(false);

      // Send enhanced notification on game completion
      const winner = data.game?.winner;

      await GameNotificationService.sendGameCompletionNotification(
        "quiz-showdown",
        { winner },
        showNotificationRef.current,
        settingsRef.current
      );
    };

    const handleGameRestarted = (data) => {
      setIsRestartingGame(false);
      setGameState(data.game);
      updateTeamsFromGameState(data.game);
      updateCurrentQuestion(data.game);
      setCurrentQuestion(null);
      setRoundNumber(1);
      setCountdown(3);
      setBuzzerTimer(0);
      setQuestionTimer(15);
      setCanBuzz(false);
      setBuzzedTeam(null);
      setSelectedAnswer(null);
      setAnswerResult(null);
      setGamePhase("teamSelect");
    };

    const handleSocketGameError = (data) => {
      console.error("Socket game error:", data);
      setIsRestartingGame(false);

      // Clear joining states on error
      setIsJoiningTeam(null);
      setIsJoiningRoom(false);

      // Provide specific error messages based on error type
      let errorMessage = data.message || "An unknown error occurred";

      if (
        data.message?.includes("Room not found") ||
        data.message?.includes("not exist")
      ) {
        errorMessage =
          "Room not found. Please check the room code and try again.";
      } else if (data.message?.includes("Room is full")) {
        errorMessage = "Room is full. Cannot join this room.";
      } else if (data.message?.includes("Game already started")) {
        errorMessage = "Cannot join. Game has already started.";
      } else if (data.message?.includes("Player name")) {
        errorMessage = "Invalid player name. Please try again.";
      } else if (data.message?.includes("Invalid session")) {
        errorMessage = "Session expired. Please rejoin the room.";
      } else if (data.message?.includes("Team is full")) {
        errorMessage = "This team is full. Try joining the other team.";
      }

      Alert.alert("Error", errorMessage);
    };

    // Register event listeners
    quizShowdownSocket.on("socket-connected", handleSocketConnected);
    quizShowdownSocket.on("socket-disconnected", handleSocketDisconnected);
    quizShowdownSocket.on("socket-error", handleSocketError);
    quizShowdownSocket.on("room-created", handleRoomCreated);
    quizShowdownSocket.on("room-joined", handleRoomJoined);
    quizShowdownSocket.on("player-joined", handlePlayerJoined);
    quizShowdownSocket.on("team-updated", handleTeamUpdated);
    quizShowdownSocket.on("team-joined", handleTeamJoined);
    quizShowdownSocket.on("game-started", handleGameStarted);
    quizShowdownSocket.on("buzzer-activated", handleBuzzerActivated);
    quizShowdownSocket.on("team-buzzed", handleTeamBuzzed);
    quizShowdownSocket.on("answer-submitted", handleAnswerSubmitted);
    quizShowdownSocket.on("team-turn", handleTeamTurn);
    quizShowdownSocket.on("next-question", handleNextQuestion);
    quizShowdownSocket.on("game-finished", handleGameFinished);
    quizShowdownSocket.on("game-restarted", handleGameRestarted);
    quizShowdownSocket.on("socket-game-error", handleSocketGameError);

    try {
      quizShowdownSocket.connect();
      setIsConnected(quizShowdownSocket.isConnected());
    } catch (error) {
      console.error("Failed to initialize socket:", error);
      setConnectionError(error.message);
    }

    loadQuestions();

    return () => {
      // Cleanup event listeners
      quizShowdownSocket.off("socket-connected", handleSocketConnected);
      quizShowdownSocket.off("socket-disconnected", handleSocketDisconnected);
      quizShowdownSocket.off("socket-error", handleSocketError);
      quizShowdownSocket.off("room-created", handleRoomCreated);
      quizShowdownSocket.off("room-joined", handleRoomJoined);
      quizShowdownSocket.off("player-joined", handlePlayerJoined);
      quizShowdownSocket.off("team-updated", handleTeamUpdated);
      quizShowdownSocket.off("team-joined", handleTeamJoined);
      quizShowdownSocket.off("game-started", handleGameStarted);
      quizShowdownSocket.off("buzzer-activated", handleBuzzerActivated);
      quizShowdownSocket.off("team-buzzed", handleTeamBuzzed);
      quizShowdownSocket.off("answer-submitted", handleAnswerSubmitted);
      quizShowdownSocket.off("team-turn", handleTeamTurn);
      quizShowdownSocket.off("next-question", handleNextQuestion);
      quizShowdownSocket.off("game-finished", handleGameFinished);
      quizShowdownSocket.off("game-restarted", handleGameRestarted);
      quizShowdownSocket.off("socket-game-error", handleSocketGameError);

      quizShowdownSocket.disconnect();
    };
  }, [updateTeamsFromGameState]);

  // Helper function to determine if player can select answers
  const canSelectAnswer = () => {
    if (gamePhase !== "question") return false;

    let currentSelectedTeam = selectedTeamRef.current;
    if (!currentSelectedTeam && playerNameRef.current && gameStateRef.current) {
      currentSelectedTeam = determinePlayerTeam(
        gameStateRef.current,
        playerNameRef.current
      );
    }

    return buzzedTeam?.trim() === currentSelectedTeam?.trim();
  };

  // Helper function to update current question
  const updateCurrentQuestion = (game) => {
    if (
      !game ||
      !game.questions ||
      game.currentQuestionIndex >= game.questions.length
    ) {
      return;
    }

    const question = game.questions[game.currentQuestionIndex];

    const formattedQuestion = {
      id: question.id,
      question: question.question,
      choices: question.options,
      correctAnswer: question.correct,
      category: question.category || "General",
      points: 1,
    };

    setCurrentQuestion(formattedQuestion);
    setRoundNumber(game.currentQuestionIndex + 1);
  };

  // Timer effects for UI countdown display
  useEffect(() => {
    let interval;

    if (gamePhase === "countdown" && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (!isMountedRef.current) return prev;
          if (prev > 0) {
            console.log("[QuizShowdown] Countdown tick", prev - 1);
          }

          if (prev <= 1) {
            setGamePhase("buzzer");
            setCanBuzz(true);
            setBuzzerTimer(10); // 10 seconds to buzz
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gamePhase, countdown]);

  // Dev safeguard: if countdown phase persists >5s without decrementing below 3, force restart.
  useEffect(() => {
    if (gamePhase !== "countdown") return;
    const start = Date.now();
    const check = setInterval(() => {
      if (!isMountedRef.current) {
        clearInterval(check);
        return;
      }
      if (countdown === 3 && Date.now() - start > 5500) {
        console.warn(
          "[QuizShowdown] Countdown appeared stuck at 3. Auto-resetting."
        );
        setCountdown(2); // kickstart
        clearInterval(check);
      }
      if (countdown !== 3) {
        clearInterval(check);
      }
    }, 1000);
    return () => clearInterval(check);
  }, [gamePhase, countdown]);

  // Timer effect for buzzer phase
  useEffect(() => {
    let interval;

    if (gamePhase === "buzzer" && buzzerTimer > 0 && !buzzedTeam) {
      interval = setInterval(() => {
        setBuzzerTimer((prev) => {
          if (!isMountedRef.current) return prev;

          if (prev <= 1) {
            // Time's up, move to next question or end game
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gamePhase, buzzerTimer, buzzedTeam]);

  // Timer effect for question phase
  useEffect(() => {
    let interval;

    if (gamePhase === "question" && questionTimer > 0) {
      interval = setInterval(() => {
        setQuestionTimer((prev) => {
          if (!isMountedRef.current) return prev;

          if (prev <= 1) {
            // Time's up for the answering team - let backend advance turn.
            const myTeam = selectedTeamRef.current?.trim();
            const answeringTeam = buzzedTeam?.trim();
            const isMyTurn = Boolean(myTeam && answeringTeam && myTeam === answeringTeam);

            if (
              isMyTurn &&
              !questionTimeoutSentRef.current &&
              currentRoom?.id &&
              isConnected
            ) {
              questionTimeoutSentRef.current = true;
              try {
                quizShowdownSocket.questionTimeExpired(currentRoom.id, myTeam);
              } catch (error) {
                console.error("Failed to send question timeout event:", error);
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gamePhase, questionTimer, buzzedTeam, currentRoom?.id, isConnected]);

  // Room management
  const createRoom = async () => {
    if (!playerNameRef.current?.trim()) {
      Alert.alert("Error", "Player name not available. Please try again.");
      return;
    }

    if (!isConnected) {
      Alert.alert("Error", "Not connected to server");
      return;
    }

    try {
      quizShowdownSocket.createRoom(playerNameRef.current);
    } catch (error) {
      console.error("Failed to create room:", error);
      Alert.alert("Error", "Failed to create room. Please try again.");
    }
  };

  const joinRoom = async (roomId) => {
    if (!playerNameRef.current?.trim()) {
      Alert.alert("Error", "Player name not available. Please try again.");
      return;
    }

    if (!isConnected) {
      Alert.alert("Error", "Not connected to server");
      return;
    }

    if (isJoiningRoom) {
      return; // Prevent multiple join attempts
    }

    try {
      setIsJoiningRoom(true);
      console.log(
        "Attempting to join room:",
        roomId,
        "with player:",
        playerNameRef.current
      );
      quizShowdownSocket.joinRoom(roomId, playerNameRef.current);

      // Set a timeout to handle case where no response is received
      const joinTimeout = setTimeout(() => {
        setIsJoiningRoom(false);
        Alert.alert(
          "Error",
          "Room join timeout. The room might not exist or be full."
        );
      }, 10000); // 10 second timeout

      // Clear timeout if we successfully join
      const clearTimeoutOnJoin = () => {
        clearTimeout(joinTimeout);
        setIsJoiningRoom(false);
        quizShowdownSocket.off("room-joined", clearTimeoutOnJoin);
        quizShowdownSocket.off("socket-game-error", clearTimeoutOnJoin);
      };

      quizShowdownSocket.on("room-joined", clearTimeoutOnJoin);
      quizShowdownSocket.on("socket-game-error", clearTimeoutOnJoin);
    } catch (error) {
      console.error("Failed to join room:", error);
      setIsJoiningRoom(false);
      Alert.alert("Error", "Failed to join room. Please try again.");
    }
  };

  const joinRoomByCode = () => {
    const normalizedRoomId = roomCode.trim().toUpperCase();

    if (!normalizedRoomId) {
      Alert.alert("Error", "Please enter a room code");
      return;
    }

    // Validate room ID format (6 alphanumeric characters)
    if (!/^[A-Z0-9]{6}$/.test(normalizedRoomId)) {
      Alert.alert(
        "Error",
        "Room ID must be exactly 6 letters and numbers"
      );
      return;
    }

    setRoomCode(normalizedRoomId);
    console.log("Joining room by code:", normalizedRoomId);
    joinRoom(normalizedRoomId);
  };

  // Team management
  const joinTeam = async (team) => {
    console.log(
      "Attempting to join team:",
      team,
      "Player:",
      playerNameRef.current
    );
    console.log(
      "Current state - isConnected:",
      isConnected,
      "currentRoom:",
      currentRoom,
      "gameState:",
      gameStateRef.current
    );

    if (!playerNameRef.current?.trim()) {
      Alert.alert("Error", "Please enter your name first");
      return;
    }

    if (!currentRoom || !isConnected) {
      Alert.alert("Error", "Not connected or no room selected");
      return;
    }

    // Check if socket is actually connected
    if (!quizShowdownSocket.isConnected()) {
      Alert.alert("Error", "Socket not connected. Please try again.");
      return;
    }

    // Prevent multiple simultaneous team joins
    if (isJoiningTeam) {
      console.log("Already joining a team, ignoring request");
      return;
    }

    try {
      const teamName = team === "A" ? "Team A" : "Team B";
      console.log("Sending join-team event:", {
        roomId: currentRoom.id,
        teamName,
      });

      // Set joining state
      setIsJoiningTeam(team);

      // Provide immediate UI feedback
      console.log("Setting selectedTeam immediately to:", teamName);
      setSelectedTeam(teamName);

      quizShowdownSocket.joinTeam(currentRoom.id, teamName);

      // Set a timeout to reset joining state if no response
      setTimeout(() => {
        if (isJoiningTeam === team) {
          console.log("Team join timeout - resetting joining state");
          setIsJoiningTeam(null);
        }
      }, 5000);
    } catch (error) {
      console.error("Failed to join team:", error);
      // Reset states on error
      setSelectedTeam(null);
      setIsJoiningTeam(null);
      Alert.alert("Error", "Failed to join team. Please try again.");
    }
  };

  const startGame = async () => {
    if (!isCreator) {
      Alert.alert("Error", "Only the room creator can start the game");
      return;
    }

    if (!currentRoom || !isConnected) {
      Alert.alert("Error", "Not connected or no room selected");
      return;
    }

    if (
      !gameState ||
      gameState.teamA.members.length === 0 ||
      gameState.teamB.members.length === 0
    ) {
      Alert.alert("Error", "Both teams need at least one player");
      return;
    }

    try {
      quizShowdownSocket.startGame(currentRoom.id);
    } catch (error) {
      console.error("Failed to start game:", error);
      Alert.alert("Error", "Failed to start game. Please try again.");
    }
  };

  const handleBuzz = async () => {
    if (
      !canBuzz ||
      buzzedTeam ||
      !selectedTeam ||
      !currentRoom ||
      !isConnected
    ) {
      return;
    }

    try {
      quizShowdownSocket.buzz(currentRoom.id, selectedTeam);
    } catch (error) {
      console.error("Failed to buzz:", error);
      Alert.alert("Error", "Failed to buzz. Please try again.");
    }
  };

  const selectAnswer = (answerIndex) => {
    // Only allow answer selection in question phase
    if (gamePhase !== "question") {
      return;
    }

    // Auto-recover selectedTeam if needed
    let currentSelectedTeam = selectedTeam;
    if (!currentSelectedTeam && playerName && gameState) {
      currentSelectedTeam = determinePlayerTeam(gameState, playerName);
      if (currentSelectedTeam) {
        setSelectedTeam(currentSelectedTeam);
      }
    }

    // Use normalized comparison for team names
    const normalizedBuzzedTeam = buzzedTeam?.trim();
    const normalizedSelectedTeam = currentSelectedTeam?.trim();

    if (normalizedBuzzedTeam !== normalizedSelectedTeam) {
      return;
    }

    setSelectedAnswer(answerIndex);
  };

  const submitAnswer = async () => {
    if (selectedAnswer === null) {
      Alert.alert("Error", "Please select an answer");
      return;
    }

    // Auto-recover selectedTeam if needed
    let currentSelectedTeam = selectedTeam;
    if (!currentSelectedTeam && playerName && gameState) {
      currentSelectedTeam = determinePlayerTeam(gameState, playerName);
      if (currentSelectedTeam) {
        setSelectedTeam(currentSelectedTeam);
      }
    }

    if (!currentRoom || !isConnected || !currentSelectedTeam) {
      Alert.alert("Error", "Not connected or invalid state");
      return;
    }

    if (gamePhase !== "question") {
      Alert.alert("Error", "Cannot submit answer in current game phase");
      return;
    }

    if (buzzedTeam?.trim() !== currentSelectedTeam?.trim()) {
      Alert.alert("Error", "It&apos;s not your team&apos;s turn to answer");
      return;
    }

    try {
      quizShowdownSocket.submitAnswer(
        currentRoom.id,
        currentSelectedTeam,
        selectedAnswer
      );
      // Don't reset selectedAnswer here - let the server response handle it
    } catch (error) {
      console.error("Failed to submit answer:", error);
      Alert.alert("Error", "Failed to submit answer. Please try again.");
    }
  };

  const resetGame = () => {
    if (!isCreator) {
      Alert.alert("Host Only", "Only the host can start a rematch.");
      return;
    }

    if (!currentRoom?.id) {
      Alert.alert("Error", "Room not found.");
      return;
    }

    if (!isConnected) {
      Alert.alert("Error", "Not connected to server");
      return;
    }

    try {
      setIsRestartingGame(true);
      quizShowdownSocket.restartGame(currentRoom.id);
    } catch (_error) {
      setIsRestartingGame(false);
      Alert.alert("Error", "Failed to restart game. Please try again.");
    }
  };

  const returnToLobbyState = () => {
    // Intentional leave should not trigger auto-rejoin.
    lastRoomRef.current = { id: null, playerName: null };

    setGamePhase("lobby");
    setCurrentRoom(null);
    setSelectedTeam(null);
    setGameState(null);
    setIsCreator(false);
    setIsJoiningRoom(false);
    setIsJoiningTeam(null);
    setShowLeaveGameModal(false);

    if (!quizShowdownSocket.isConnected()) {
      try {
        quizShowdownSocket.connect();
      } catch (error) {
        console.warn("Reconnect after leave failed:", error);
      }
    }
  };

  const leaveGame = () => {
    // On results screen the confirmation modal isn't rendered, so perform immediate leave
    if (gamePhase === "results") {
      try {
        if (currentRoom?.id) {
          quizShowdownSocket.leaveRoom();
        }
      } catch (e) {
        console.warn("Room leave on results screen failed:", e);
      }
      returnToLobbyState();
      return;
    }
    setShowLeaveGameModal(true);
  };

  const confirmLeaveGame = () => {
    try {
      if (currentRoom?.id) {
        quizShowdownSocket.leaveRoom();
      }
    } catch (error) {
      console.warn("Room leave failed:", error);
    }
    returnToLobbyState();
  };

  // Question management for instructor mode
  const [selectedCorrectAnswer, setSelectedCorrectAnswer] = useState(0);

  const addNewQuestion = async (questionData) => {
    try {
      const response = await quizShowdownApi.createQuestion({
        question: questionData.question,
        options: questionData.choices,
        correct: questionData.correctAnswer,
      });

      if (response.success) {
        // Reload questions
        const updatedResponse = await quizShowdownApi.getQuestions();
        if (updatedResponse.success) {
          const convertedQuestions = (updatedResponse.data || []).map(
            (question) => ({
              ...question,
              choices: question.options,
              correctAnswer: question.correct,
              points: question.points || 1,
            })
          );
          setQuestions(
            convertedQuestions.length ? convertedQuestions : sampleQuestions
          );
        } else {
          setQuestions(sampleQuestions);
        }
        Alert.alert("Success", "Question added successfully!");
        setEditingQuestion(null);
      }
    } catch (error) {
      console.error("Failed to add question:", error);
      Alert.alert("Error", "Failed to add question. Please try again.");
    }
  };

  const updateExistingQuestion = async (questionId, questionData) => {
    try {
      const response = await quizShowdownApi.updateQuestion(questionId, {
        question: questionData.question,
        options: questionData.choices,
        correct: questionData.correctAnswer,
      });

      if (response.success) {
        // Reload questions
        const updatedResponse = await quizShowdownApi.getQuestions();
        if (updatedResponse.success) {
          const convertedQuestions = (updatedResponse.data || []).map(
            (question) => ({
              ...question,
              choices: question.options,
              correctAnswer: question.correct,
              points: question.points || 1,
            })
          );
          setQuestions(
            convertedQuestions.length ? convertedQuestions : sampleQuestions
          );
        } else {
          setQuestions(sampleQuestions);
        }
        Alert.alert("Success", "Question updated successfully!");
        setEditingQuestion(null);
      }
    } catch (error) {
      console.error("Failed to update question:", error);
      Alert.alert("Error", "Failed to update question. Please try again.");
    }
  };

  const deleteQuestion = async (questionId) => {
    try {
      const response = await quizShowdownApi.deleteQuestion(questionId);

      if (response.success) {
        // Reload questions
        const updatedResponse = await quizShowdownApi.getQuestions();
        if (updatedResponse.success) {
          const convertedQuestions = (updatedResponse.data || []).map(
            (question) => ({
              ...question,
              choices: question.options,
              correctAnswer: question.correct,
              points: question.points || 1,
            })
          );
          setQuestions(
            convertedQuestions.length ? convertedQuestions : sampleQuestions
          );
        } else {
          setQuestions(sampleQuestions);
        }
        Alert.alert("Success", "Question deleted successfully!");
      }
    } catch (error) {
      console.error("Failed to delete question:", error);
      Alert.alert("Error", "Failed to delete question. Please try again.");
    }
  };

  // Set correct answer when editing a question
  useEffect(() => {
    if (editingQuestion) {
      setSelectedCorrectAnswer(editingQuestion.correctAnswer || 0);
    }
  }, [editingQuestion]);

  // Instructor functions
  const createNewQuestion = () => {
    const newQuestion = {
      id: Date.now(), // Use timestamp for unique ID
      question: "",
      choices: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: 0,
      points: 1,
    };
    setEditingQuestion(newQuestion);
  };

  const saveQuestion = async () => {
    if (!editingQuestion) return;

    // Validation
    if (!editingQuestion.question.trim()) {
      Alert.alert("Error", "Please enter a question");
      return;
    }

    const hasEmptyOptions = editingQuestion.choices.some(
      (option) => !option.trim()
    );
    if (hasEmptyOptions) {
      Alert.alert("Error", "Please fill in all answer options");
      return;
    }

    try {
      // Check if this is an existing question from backend (has _id) or new one
      const isBackendQuestion =
        editingQuestion._id ||
        questions.find((q) => q._id && q._id === editingQuestion.id);

      const questionData = {
        question: editingQuestion.question,
        choices: editingQuestion.choices,
        correctAnswer: selectedCorrectAnswer,
        points: editingQuestion.points || 1,
      };

      if (isBackendQuestion) {
        // Update existing question via API
        await updateExistingQuestion(
          editingQuestion._id || editingQuestion.id,
          questionData
        );
      } else {
        // Create new question via API
        await addNewQuestion(questionData);
      }
    } catch (error) {
      console.error("Failed to save question:", error);
      Alert.alert("Error", "Failed to save question. Please try again.");
    }
  };

  const updateEditingQuestion = (field, value) => {
    setEditingQuestion((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateEditingQuestionOption = (index, value) => {
    setEditingQuestion((prev) => ({
      ...prev,
      choices: prev.choices.map((choice, i) => (i === index ? value : choice)),
    }));
  };

  // File upload functions for JSON questions
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

      // Send to backend for validation and processing using API service
      const result = await quizShowdownApi.uploadQuestions(jsonData);

      if (result.success) {
        // Reload questions from backend to get updated list
        const updatedResponse = await quizShowdownApi.getQuestions();
        if (updatedResponse.success) {
          const convertedQuestions = (updatedResponse.data || []).map(
            (question) => ({
              ...question,
              choices: question.options,
              correctAnswer: question.correct,
              points: question.points || 1,
            })
          );
          setQuestions(
            convertedQuestions.length ? convertedQuestions : sampleQuestions
          );
        } else {
          setQuestions(sampleQuestions);
        }

        // Set success data and show success modal
        setUploadResult({
          message: `Successfully uploaded ${result.count} questions! They have been added to your question bank.`,
          count: result.count,
          errors: result.errors || [],
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
      const jsonString = JSON.stringify(SAMPLE_QS_QUESTIONS, null, 2);
      const fileName = "sample-quiz-showdown-questions.json";

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
            dialogTitle: "Save Sample Quiz Showdown Questions",
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

  // Render different phases
  if (gamePhase === "lobby") {
    return (
      <LobbyScreen
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        playerName={playerName}
        createRoom={createRoom}
        joinRoomByCode={joinRoomByCode}
        isInstructor={isInstructor}
        setIsInstructor={setIsInstructor}
        setGamePhase={setGamePhase}
        router={router}
        isConnected={isConnected}
        connectionError={connectionError}
        isJoiningRoom={isJoiningRoom}
        instructorPrivilege={instructorPrivilege}
        quizShowdownSocket={quizShowdownSocket}
      />
    );
  }
  if (gamePhase === "teamSelect") {
    return (
      <TeamSelectScreen
        currentRoom={currentRoom}
        teams={teams}
        playerName={playerName}
        selectedTeam={selectedTeam}
        joinTeam={joinTeam}
        startGame={startGame}
        leaveGame={leaveGame}
        isCreator={isCreator}
        gameState={gameState}
        isConnected={isConnected}
        isJoiningTeam={isJoiningTeam}
        showLeaveGameModal={showLeaveGameModal}
        setShowLeaveGameModal={setShowLeaveGameModal}
        confirmLeaveGame={confirmLeaveGame}
      />
    );
  }

  if (gamePhase === "instructor") {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={PREMIUM_GRADIENT} style={styles.gradient}>
          {renderImportDocsModal?.()}
          {renderActionsMenuModal?.()}
          <View style={styles.editorContainer}>
            <View style={styles.editorHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setGamePhase("lobby")}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={24}
                  color="#3b82f6"
                />
              </TouchableOpacity>
              <View style={styles.editorHeaderMeta}>
                <Text style={styles.editorTitle}>Question Manager</Text>
                <Text style={styles.editorSubtitle}>
                  Build your question set for Quiz Showdown
                </Text>
                <Text style={styles.editorStatsText}>
                  Number of Questions: {(questions || []).length}
                </Text>
              </View>
              <View style={styles.editorHeaderActions}>

                <TouchableOpacity
                  style={styles.moreMenuButton}
                  onPress={() => setShowActionsMenu(true)}
                >
                  <MaterialCommunityIcons
                    name="dots-vertical"
                    size={22}
                    color="#0f172a"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.questionsList}
              showsVerticalScrollIndicator={Platform.OS === "web"}
            >
              {(questions || []).map((question, index) => (
                <TouchableOpacity
                  key={question._id || question.id}
                  style={styles.questionItem}
                  onPress={() => {
                    // Ensure question has proper format for editing
                    const editableQuestion = {
                      ...question,
                      choices: question.choices ||
                        question.options || ["", "", "", ""],
                      correctAnswer:
                        question.correctAnswer || question.correct || 0,
                    };
                    setEditingQuestion(editableQuestion);
                  }}
                >
                  <View style={styles.questionHeader}>
                    <Text style={styles.questionNumber}>Q{index + 1}</Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() =>
                        deleteQuestion(question._id || question.id)
                      }
                    >
                      <MaterialCommunityIcons
                        name="delete"
                        size={16}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.questionPreview} numberOfLines={2}>
                    {question.question}
                  </Text>
                  <Text style={styles.questionMetaText}>
                    {question.points || 1} pt{(question.points || 1) > 1 ? "s" : ""}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.createQuestionCard}
                onPress={createNewQuestion}
              >
                <View style={styles.createQuestionIconWrap}>
                  <MaterialCommunityIcons
                    name="plus"
                    size={30}
                    color="#ffffff"
                  />
                </View>
                <Text style={styles.createQuestionText}>
                  Create New Question
                </Text>
                <Text style={styles.createQuestionSubtext}>
                  Add a fresh challenge to your quiz bank
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Question Edit Modal */}
          <Modal
            visible={editingQuestion !== null}
            animationType={Platform.OS === "web" ? "fade" : "slide"}
            transparent={Platform.OS === "web"}
            presentationStyle={Platform.OS === "web" ? undefined : "pageSheet"}
          >
            {editingQuestion && (
              <View style={Platform.OS === "web" ? styles.editorWebModalOverlay : styles.modalContainer}>
                <LinearGradient
                  colors={["#ecfeff", "#f0fdfa", "#eef2ff"]}
                  style={[
                    styles.gradient,
                    Platform.OS === "web" && styles.editorWebModalCard,
                  ]}
                >
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setEditingQuestion(null)}>
                      <MaterialCommunityIcons
                        name="close"
                        size={24}
                        color="#3b82f6"
                      />
                    </TouchableOpacity>
                    <Text style={[styles.modalTitle, styles.modalHeaderTitle]}>
                      {questions.find(
                        (q) =>
                          (q._id || q.id) ===
                          (editingQuestion._id || editingQuestion.id)
                      )
                        ? "Edit Question"
                        : "Create Question"}
                    </Text>
                    <TouchableOpacity onPress={saveQuestion}>
                      <Text style={styles.saveButton}>Save</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.editForm}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Question</Text>
                      <TextInput
                        style={styles.textArea}
                        value={editingQuestion.question}
                        onChangeText={(text) =>
                          updateEditingQuestion("question", text)
                        }
                        multiline
                        placeholder="Enter question text..."
                        placeholderTextColor="#64748b"
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Points</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editingQuestion.points?.toString() || "1"}
                        onChangeText={(text) =>
                          updateEditingQuestion("points", parseInt(text) || 1)
                        }
                        placeholder="1"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Answer Options</Text>
                      {(editingQuestion.choices || []).map((choice, index) => (
                        <View key={index} style={styles.optionRow}>
                          <TouchableOpacity
                            style={[
                              styles.radioButton,
                              selectedCorrectAnswer === index &&
                                styles.radioButtonSelected,
                            ]}
                            onPress={() => setSelectedCorrectAnswer(index)}
                          >
                            {selectedCorrectAnswer === index && (
                              <View style={styles.radioButtonInner} />
                            )}
                          </TouchableOpacity>
                          <View style={styles.optionInputContainer}>
                            <Text style={styles.optionLabel}>
                              {String.fromCharCode(65 + index)}
                            </Text>
                            <TextInput
                              style={styles.optionInput}
                              value={choice}
                              onChangeText={(text) =>
                                updateEditingQuestionOption(index, text)
                              }
                              placeholder={`Enter option ${String.fromCharCode(
                                65 + index
                              )}...`}
                              placeholderTextColor="#64748b"
                            />
                          </View>
                        </View>
                      ))}
                    </View>

                    <View style={styles.correctAnswerInfo}>
                      <MaterialCommunityIcons
                        name="information-outline"
                        size={16}
                        color="#60a5fa"
                      />
                      <Text style={styles.correctAnswerDisplayText}>
                        Select the radio button next to the correct answer
                      </Text>
                    </View>
                  </ScrollView>
                </LinearGradient>
              </View>
            )}
          </Modal>

          {/* Upload Questions Modal */}
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
                  This will add the questions from your JSON file to the
                  existing question bank. Make sure your JSON file contains an
                  array of question objects with the following format:
                </Text>

                <View style={styles.formatExample}>
                  <Text style={styles.formatExampleText}>
                    {`[
  {
    "question": "Your question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
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

          {/* Upload Success Modal */}
          <Modal
            visible={uploadSuccessModalVisible}
            animationType="fade"
            transparent={true}
          >
            <View style={styles.uploadModalOverlay}>
              <View style={styles.uploadResultContainer}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={64}
                  color="#10b981"
                />
                <Text style={styles.uploadResultTitle}>Upload Successful!</Text>
                <Text style={styles.uploadResultMessage}>
                  {uploadResult.message}
                </Text>
                {uploadResult.count > 0 && (
                  <Text style={styles.uploadResultCount}>
                    {uploadResult.count} questions added to your question bank
                  </Text>
                )}
                {uploadResult.errors.length > 0 && (
                  <View style={styles.errorList}>
                    <Text style={styles.errorTitle}>Warnings:</Text>
                    {uploadResult.errors.slice(0, 5).map((error, index) => (
                      <Text key={index} style={styles.errorText}>
                        • {error}
                      </Text>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <Text style={styles.errorText}>
                        ... and {uploadResult.errors.length - 5} more
                      </Text>
                    )}
                  </View>
                )}
                <TouchableOpacity
                  style={styles.uploadResultButton}
                  onPress={() => setUploadSuccessModalVisible(false)}
                >
                  <Text style={styles.uploadResultButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Upload Failure Modal */}
          <Modal
            visible={uploadFailureModalVisible}
            animationType="fade"
            transparent={true}
          >
            <View style={styles.uploadModalOverlay}>
              <View style={styles.uploadResultContainer}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={64}
                  color="#ef4444"
                />
                <Text style={styles.uploadResultTitle}>Upload Failed</Text>
                <Text style={styles.uploadResultMessage}>
                  {uploadResult.message}
                </Text>
                {uploadResult.errors.length > 0 && (
                  <View style={styles.errorList}>
                    <Text style={styles.errorTitle}>Errors:</Text>
                    {uploadResult.errors.slice(0, 5).map((error, index) => (
                      <Text key={index} style={styles.errorText}>
                        • {error}
                      </Text>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <Text style={styles.errorText}>
                        ... and {uploadResult.errors.length - 5} more
                      </Text>
                    )}
                  </View>
                )}
                <TouchableOpacity
                  style={styles.uploadResultButton}
                  onPress={() => setUploadFailureModalVisible(false)}
                >
                  <Text style={styles.uploadResultButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (gamePhase === "countdown") {
    return (
      <CountdownScreen
        countdown={countdown}
        currentQuestion={currentQuestion}
        roundNumber={roundNumber}
      />
    );
  }

  if (gamePhase === "results") {
    return (
      <ResultsScreen
        teams={teams}
        resetGame={resetGame}
        leaveGame={leaveGame}
        isCreator={isCreator}
        isRestartingGame={isRestartingGame}
      />
    );
  }

  // Main game screen (buzzer and question phases)
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={PREMIUM_GRADIENT} style={styles.gradient}>
        {/* Header - Fixed */}
        <View style={styles.gameHeader}>
          <TouchableOpacity style={styles.backButton} onPress={leaveGame}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color="#3b82f6"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quiz Showdown</Text>
          <View style={styles.roundContainer}>
            <Text style={styles.roundText}>Round {roundNumber}</Text>
          </View>
        </View>

        {/* Timer Bar - Fixed */}
        {gamePhase === "buzzer" && (
          <View style={styles.timerBarContainer}>
            <View
              style={[
                styles.timerBar,
                { width: `${Math.max(0, buzzerTimer * 10)}%` },
              ]}
            />
            <Text style={styles.timerText}>{buzzerTimer}s</Text>
          </View>
        )}

        {/* Scrollable Content */}
        <ScrollView
          style={styles.gameContent}
          contentContainerStyle={styles.gameContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Team Scores */}
          <View style={styles.scoresContainer}>
            <TeamScoreCard
              team={teams.teamA}
              isMyTeam={selectedTeam?.trim() === "Team A"}
              buzzedTeam={buzzedTeam?.trim() === "Team A"}
            />
            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
            </View>
            <TeamScoreCard
              team={teams.teamB}
              isMyTeam={selectedTeam?.trim() === "Team B"}
              buzzedTeam={buzzedTeam?.trim() === "Team B"}
            />
          </View>

          {/* Question Display - Show in buzzer, question, and answered phases */}
          {(gamePhase === "buzzer" ||
            gamePhase === "question" ||
            gamePhase === "answered") &&
            currentQuestion && (
              <View style={styles.questionContainer}>
                <View style={styles.questionHeader}>
                  <Text style={styles.pointsText}>
                    {currentQuestion.points} pts
                  </Text>
                </View>
                <Text style={styles.questionText}>
                  {currentQuestion.question}
                </Text>

                {/* Multiple Choice Options */}
                <View style={styles.choicesContainer}>
                  {(currentQuestion.choices || []).map((choice, index) => {
                    // Define color scheme based on index
                    const colorScheme = {
                      0: { bg: "#FF9F40", border: "#FF8C00", text: "#FFFFFF" }, // Orange
                      1: { bg: "#5B9BD5", border: "#2E75B6", text: "#FFFFFF" }, // Blue
                      2: { bg: "#A278ED", border: "#7C4DFF", text: "#FFFFFF" }, // Purple
                      3: { bg: "#F06060", border: "#DC3545", text: "#FFFFFF" }, // Red
                    }[index] || {
                      bg: "#35d091",
                      border: "rgba(74, 124, 89, 0.2)",
                      text: "#FFFFFF",
                    };

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.choiceButton,
                          {
                            backgroundColor: colorScheme.bg,
                            borderColor: colorScheme.border,
                          },
                          // Handle selection in question phase
                          selectedAnswer === index &&
                            gamePhase === "question" &&
                            styles.selectedChoice,
                          // Handle display in answered phase
                          gamePhase === "answered" &&
                            answerResult &&
                            answerResult.correctAnswerIndex === index &&
                            styles.correctChoice,
                          gamePhase === "answered" &&
                            answerResult &&
                            answerResult.answeredIndex === index &&
                            !answerResult.isCorrect &&
                            styles.incorrectChoice,
                          // Disable styling
                          !canSelectAnswer() && styles.disabledChoice,
                        ]}
                        onPress={() => selectAnswer(index)}
                        disabled={!canSelectAnswer()}
                      >
                        <Text
                          style={[
                            styles.choiceLabel,
                            { color: colorScheme.text },
                          ]}
                        >
                          {String.fromCharCode(65 + index)}
                        </Text>
                        <Text
                          style={[
                            styles.choiceText,
                            { color: colorScheme.text },
                            selectedAnswer === index &&
                              gamePhase === "question" &&
                              styles.selectedChoiceText,
                            gamePhase === "answered" &&
                              answerResult &&
                              answerResult.correctAnswerIndex === index &&
                              styles.correctChoiceText,
                            gamePhase === "answered" &&
                              answerResult &&
                              answerResult.answeredIndex === index &&
                              !answerResult.isCorrect &&
                              styles.incorrectChoiceText,
                          ]}
                        >
                          {choice}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Submit Button - Only show if this team buzzed and it's question phase */}
                {canSelectAnswer() && (
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={submitAnswer}
                  >
                    <Text style={styles.submitButtonText}>Submit Answer</Text>
                  </TouchableOpacity>
                )}

                {/* Result feedback - Show in answered phase for everyone */}
                {gamePhase === "answered" && (
                  <View style={styles.answerFeedbackContainer}>
                    {answerResult ? (
                      <View
                        style={[
                          styles.answerResultContainer,
                          answerResult.isCorrect
                            ? styles.correctAnswerContainer
                            : styles.incorrectAnswerContainer,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={
                            answerResult.isCorrect
                              ? "check-circle"
                              : "close-circle"
                          }
                          size={32}
                          color={
                            answerResult.isCorrect ? "#ffffffff" : "#ef4444"
                          }
                        />
                        <Text
                          style={[
                            styles.answerResultText,
                            answerResult.isCorrect
                              ? styles.correctAnswerText
                              : styles.incorrectAnswerText,
                          ]}
                        >
                          {answerResult.isCorrect ? "Correct!" : "Incorrect!"}
                        </Text>
                        {answerResult.message && (
                          <Text style={styles.answerMessageText}>
                            {answerResult.message}
                          </Text>
                        )}
                        <Text style={styles.waitingText}>
                          Wait for next question...
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.answerResultContainer}>
                        <Text style={styles.waitingText}>
                          {(() => {
                            let currentSelectedTeam = selectedTeam;
                            if (
                              !currentSelectedTeam &&
                              playerName &&
                              gameState
                            ) {
                              currentSelectedTeam = determinePlayerTeam(
                                gameState,
                                playerName
                              );
                            }
                            return buzzedTeam?.trim() ===
                              currentSelectedTeam?.trim()
                              ? "Waiting for your team to answer..."
                              : `Waiting for ${buzzedTeam} to answer...`;
                          })()}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Timer - Only show in question phase */}
                {gamePhase === "question" && (
                  <View style={styles.questionTimerContainer}>
                    <Text style={styles.questionTimerText}>
                      Time: {questionTimer}s
                    </Text>
                  </View>
                )}
              </View>
            )}

          {/* Buzzer */}
          {gamePhase === "buzzer" && (
            <View style={styles.buzzerContainer}>
              <Text style={styles.statusText}>
                {buzzedTeam
                  ? `${
                      teams[buzzedTeam?.trim() === "Team A" ? "teamA" : "teamB"]
                        .name
                    } buzzed in first!`
                  : "First to buzz gets to answer!"}
              </Text>

              {!buzzedTeam && (
                <View style={styles.buzzer}>
                  <TouchableOpacity
                    style={[
                      styles.buzzerButton,
                      !canBuzz && styles.buzzerDisabled,
                    ]}
                    onPress={handleBuzz}
                    disabled={!canBuzz || Boolean(buzzedTeam)}
                  >
                    <MaterialCommunityIcons
                      name="bell"
                      size={48}
                      color={canBuzz ? "white" : "#666"}
                    />
                    <Text style={styles.buzzerText}>
                      {canBuzz ? "BUZZ IN!" : "GET READY..."}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Show who buzzed and that they're selecting answer */}
              {buzzedTeam && (
                <View style={styles.buzzedTeamContainer}>
                  <Text style={styles.buzzedTeamText}>
                    {
                      teams[buzzedTeam?.trim() === "Team A" ? "teamA" : "teamB"]
                        .name
                    }{" "}
                    is selecting their answer...
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </LinearGradient>

      {/* Leave Game Confirmation Modal */}
      <Modal visible={showLeaveGameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, styles.leaveModalTitle]}>Leave Game</Text>
            <Text style={styles.modalDescription}>
              Are you sure you want to leave? Your progress in this game will be
              lost.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowLeaveGameModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalCreateButton,
                  { backgroundColor: "#ef4444" },
                ]}
                onPress={confirmLeaveGame}
              >
                <Text style={styles.modalCreateText}>Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Component Screens
const LobbyScreen = ({
  roomCode,
  setRoomCode,
  playerName,
  createRoom,
  joinRoomByCode,
  isInstructor,
  setIsInstructor,
  setGamePhase,
  router,
  isConnected,
  connectionError,
  isJoiningRoom,
  instructorPrivilege,
}) => (
  <SafeAreaView style={styles.container}>
    <LinearGradient colors={PREMIUM_GRADIENT} style={styles.gradient}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.lobbyScrollContent}
      >
        <View style={styles.lobbyHeader}>
          <TouchableOpacity
            style={styles.lobbyBackButton}
            onPress={() => router.push("/(tabs)/game")}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <View style={styles.lobbyHeroIconWrap}>
              <MaterialCommunityIcons name="lightning-bolt" size={34} color="#0f766e" />
            </View>
            <Text style={styles.lobbyTitle}>Quiz Showdown</Text>
            <Text style={styles.lobbySubtitle}>Competitive Team Quiz Battle</Text>
          </View>
        </View>

        <Text style={styles.pageTitle}>Join a Game Room</Text>

        <View style={styles.setupCard}>
          <View style={styles.connectionStatusRow}>
            <View
              style={[
                styles.connectionIndicator,
                isConnected
                  ? styles.connectionIndicatorOnline
                  : styles.connectionIndicatorOffline,
              ]}
            >
              <MaterialCommunityIcons
                name={isConnected ? "wifi" : "wifi-off"}
                size={16}
                color={isConnected ? "#0f766e" : "#dc2626"}
              />
              <Text
                style={[
                  styles.connectionText,
                  isConnected ? styles.connectionTextOnline : styles.connectionTextOffline,
                ]}
              >
                {isConnected ? "Connected" : "Disconnected"}
              </Text>
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Room ID</Text>
            <TextInput
              style={styles.roomCodeInput}
              value={roomCode}
              onChangeText={(text) =>
                setRoomCode(text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
              }
              placeholder="Enter Room ID"
              placeholderTextColor="#64748b"
              maxLength={6}
              autoCapitalize="characters"
              editable={!isJoiningRoom}
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Player Name</Text>
            <View style={styles.playerNameDisplay}>
              <MaterialCommunityIcons
                name="account-circle"
                size={20}
                color="#0f766e"
                style={styles.playerIcon}
              />
              <Text style={styles.playerNameText}>{playerName || "Loading..."}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.joinCodeButton,
              (isJoiningRoom || !isConnected) && styles.disabledButton,
            ]}
            onPress={joinRoomByCode}
            disabled={isJoiningRoom || !isConnected}
          >
            <Text style={styles.joinCodeText}>{isJoiningRoom ? "Joining..." : "Join Room"}</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <Text style={styles.dividerText}>OR</Text>
          </View>

          <TouchableOpacity
            style={[styles.createRoomButton, (!isConnected || isJoiningRoom) && styles.disabledButton]}
            onPress={createRoom}
            disabled={!isConnected || isJoiningRoom}
          >
            <Text style={styles.createRoomText}>Generate Room ID</Text>
          </TouchableOpacity>

          {connectionError ? <Text style={styles.errorText}>{connectionError}</Text> : null}

          {instructorPrivilege && (
            <View style={styles.instructorSection}>
              <TouchableOpacity
              style={[
                styles.instructorToggle,
                isInstructor && styles.instructorToggleActive,
              ]}
              onPress={() => setIsInstructor(!isInstructor)}
            >
              <MaterialCommunityIcons
                name={isInstructor ? "school" : "account"}
                size={18}
                color={isInstructor ? "#ffffff" : "#334155"}
              />
              <Text
                style={[
                  styles.instructorToggleText,
                  isInstructor && styles.instructorToggleTextActive,
                ]}
              >
                {isInstructor ? "Instructor Mode" : "Student Mode"}
              </Text>
            </TouchableOpacity>

            {isInstructor && (
              <TouchableOpacity
                style={styles.editQuestionsButton}
                onPress={() => setGamePhase("instructor")}
              >
                <MaterialCommunityIcons name="pencil" size={18} color="#ffffff" />
                <Text style={styles.editQuestionsText}>Manage Questions</Text>
              </TouchableOpacity>
            )}
            </View>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  </SafeAreaView>
);

const TeamSelectScreen = ({
  currentRoom,
  teams,
  playerName,
  selectedTeam,
  joinTeam,
  startGame,
  leaveGame,
  isCreator,
  gameState,
  isConnected,
  isJoiningTeam,
  showLeaveGameModal,
  setShowLeaveGameModal,
  confirmLeaveGame,
}) => (
  <SafeAreaView style={styles.container}>
    <LinearGradient colors={PREMIUM_GRADIENT} style={styles.gradient}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={leaveGame}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#3b82f6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Room: {currentRoom?.name}</Text>
        <Text style={styles.headerSubtitle}>#{currentRoom?.id}</Text>
        {!isConnected && (
          <Text style={styles.disconnectedText}>⚠️ Disconnected</Text>
        )}
      </View>

      <View style={styles.nameInputContainer}>
        <View style={styles.playerNameDisplay}>
          <MaterialCommunityIcons
            name="account"
            size={20}
            color="#3cbda2"
            style={styles.playerIcon}
          />
          <Text style={styles.playerNameDisplayText}>
            {playerName || "Loading..."}
          </Text>
        </View>
      </View>

      <View style={styles.teamSelectContainer}>
        <Text style={styles.teamSelectTitle}>Choose Your Team</Text>
        <Text style={styles.teamSelectHint}>Tap a team card to lock in before the match starts.</Text>

        <View style={styles.teamsContainer}>
          <TouchableOpacity
            style={[
              styles.teamSelectCard,
              {
                borderColor: teams.teamA.color,
                backgroundColor: teams.teamA.bodyColor,
              },
              selectedTeam?.trim() === "Team A" && styles.selectedTeamCard,
              isJoiningTeam === "A" && { opacity: 0.7 },
            ]}
            onPress={() => joinTeam("A")}
            disabled={isJoiningTeam === "A"}
          >
            <View
              style={[
                styles.teamHeader,
                { backgroundColor: teams.teamA.color },
              ]}
            >
              <MaterialCommunityIcons name="shield" size={24} color="#ffffff" />
              <Text
                style={[
                  styles.teamSelectName,
                  { color: teams.teamA.textColor },
                ]}
              >
                {teams.teamA.name}
                {isJoiningTeam === "A" && " (Joining...)"}
              </Text>
            </View>
            <View style={styles.teamPlayersContainer}>
              <Text
                style={[
                  styles.teamPlayersCount,
                  { color: teams.teamA.textColor },
                ]}
              >
                {(teams.teamA.players || []).length}/4 Players
              </Text>
              {(teams.teamA.players || []).map((player, index) => (
                <Text
                  key={`teamA-${player}-${index}`}
                  style={[
                    styles.teamPlayerName,
                    { color: teams.teamA.textColor },
                  ]}
                >
                  {player}
                </Text>
              ))}
            </View>
            <Text style={[styles.teamScore, { color: teams.teamA.textColor }]}>
              Score: {teams.teamA.score}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.teamSelectCard,
              {
                borderColor: teams.teamB.color,
                backgroundColor: teams.teamB.bodyColor,
              },
              selectedTeam?.trim() === "Team B" && styles.selectedTeamCard,
              isJoiningTeam === "B" && { opacity: 0.7 },
            ]}
            onPress={() => joinTeam("B")}
            disabled={isJoiningTeam === "B"}
          >
            <View
              style={[
                styles.teamHeader,
                { backgroundColor: teams.teamB.color },
              ]}
            >
              <MaterialCommunityIcons name="shield" size={24} color="#ffffff" />
              <Text
                style={[
                  styles.teamSelectName,
                  { color: teams.teamB.textColor },
                ]}
              >
                {teams.teamB.name}
                {isJoiningTeam === "B" && " (Joining...)"}
              </Text>
            </View>
            <View style={styles.teamPlayersContainer}>
              <Text
                style={[
                  styles.teamPlayersCount,
                  { color: teams.teamB.textColor },
                ]}
              >
                {(teams.teamB.players || []).length}/4 Players
              </Text>
              {(teams.teamB.players || []).map((player, index) => (
                <Text
                  key={`teamB-${player}-${index}`}
                  style={[
                    styles.teamPlayerName,
                    { color: teams.teamB.textColor },
                  ]}
                >
                  {player}
                </Text>
              ))}
            </View>
            <Text style={[styles.teamScore, { color: teams.teamB.textColor }]}>
              Score: {teams.teamB.score}
            </Text>
          </TouchableOpacity>
        </View>

        {isCreator &&
          gameState &&
          gameState.teamA.members.length > 0 &&
          gameState.teamB.members.length > 0 && (
            <TouchableOpacity
              style={[
                styles.startGameButton,
                !isConnected && styles.disabledButton,
              ]}
              onPress={startGame}
              disabled={!isConnected}
            >
              <MaterialCommunityIcons name="play" size={24} color="#ffffff" />
              <Text style={styles.startGameText}>Start Game</Text>
            </TouchableOpacity>
          )}
        {isCreator &&
          gameState &&
          (gameState.teamA.members.length === 0 || gameState.teamB.members.length === 0) && (
            <Text style={styles.waitingText}>At least 1 player is needed on each team to begin.</Text>
          )}
      </View>

      {/* Leave Game Confirmation Modal (Team Select Phase) */}
      <Modal visible={showLeaveGameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, styles.leaveModalTitle]}>Leave Room</Text>
            <Text style={styles.modalDescription}>
              Are you sure you want to leave this room and return to the Quiz
              Showdown lobby?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowLeaveGameModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalCreateButton,
                  { backgroundColor: "#ef4444" },
                ]}
                onPress={confirmLeaveGame}
              >
                <Text style={styles.modalCreateText}>Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  </SafeAreaView>
);

const CountdownScreen = ({ countdown, currentQuestion, roundNumber }) => (
  <SafeAreaView style={styles.container}>
    <LinearGradient colors={PREMIUM_GRADIENT} style={styles.gradient}>
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownRound}>Round {roundNumber}</Text>
        <Text style={styles.countdownSubtext}>
          Read the question carefully...
        </Text>

        {/* Display the question and choices during countdown */}
        {currentQuestion && (
          <View style={styles.questionDisplayContainer}>
            <View style={styles.questionHeader}>
              <Text style={styles.pointsText}>
                {currentQuestion.points} pts
              </Text>
            </View>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>

            {/* Multiple Choice Options */}
          </View>
        )}

        <View style={styles.countdownCircle}>
          <Text style={styles.countdownNumber}>
            {countdown > 0 ? countdown : "BUZZ IN!"}
          </Text>
        </View>

        <Text style={styles.countdownInstructions}>
          {countdown > 0
            ? "Get ready to buzz!"
            : "First to buzz gets to answer!"}
        </Text>
      </View>
    </LinearGradient>
  </SafeAreaView>
);

const ResultsScreen = ({
  teams,
  resetGame,
  leaveGame,
  isCreator,
  isRestartingGame,
}) => {
  const winner =
    teams.teamA.score > teams.teamB.score
      ? teams.teamA
      : teams.teamB.score > teams.teamA.score
      ? teams.teamB
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={PREMIUM_GRADIENT} style={styles.gradient}>
        <View style={styles.resultsContainer}>
          <MaterialCommunityIcons name="trophy" size={80} color="#2acde6" />
          <Text style={styles.resultsTitle}>
            {winner ? `${winner.name} Wins!` : "It's a Tie!"}
          </Text>

          <View style={styles.finalScoresContainer}>
            <View style={styles.finalTeamScore}>
              <Text
                style={[styles.finalTeamName, { color: teams.teamA.color }]}
              >
                {teams.teamA.name}
              </Text>
              <Text style={styles.finalTeamPoints}>{teams.teamA.score}</Text>
            </View>

            <Text style={styles.finalVs}>VS</Text>

            <View style={styles.finalTeamScore}>
              <Text
                style={[styles.finalTeamName, { color: teams.teamB.color }]}
              >
                {teams.teamB.name}
              </Text>
              <Text style={styles.finalTeamPoints}>{teams.teamB.score}</Text>
            </View>
          </View>

          <View style={styles.resultsButtons}>
            {isCreator ? (
              <TouchableOpacity
                style={[styles.playAgainButton, isRestartingGame && styles.disabledButton]}
                onPress={resetGame}
                disabled={isRestartingGame}
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={24}
                  color="#3b82f6"
                />
                <Text style={styles.playAgainText}>
                  {isRestartingGame ? "Starting..." : "Play Again"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.waitingMessage}>
                <Text style={styles.waitingText}>
                  Waiting for the host to start a rematch...
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.backToLobbyButton}
              onPress={leaveGame}
            >
              <MaterialCommunityIcons name="home" size={24} color="#3b82f6" />
              <Text style={styles.backToLobbyText}>Back to Lobby</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const TeamScoreCard = ({ team, isMyTeam, buzzedTeam }) => {
  return (
    <View
      style={[
        styles.teamCard,
        { opacity: 0.9 }, // Added 90% opacity
        isMyTeam && styles.myTeamCard,
        buzzedTeam && styles.buzzedTeamCard,
      ]}
    >
      <View style={[styles.teamHeader, { backgroundColor: team.color }]}>
        <MaterialCommunityIcons
          name={isMyTeam ? "account-star" : "shield"}
          size={20}
          color="#ffffff"
        />
        <Text style={styles.teamName}>{team.name}</Text>
      </View>

      <View style={styles.scoreContainer}>
        <Text style={styles.scoreText}>{team.score}</Text>
      </View>

      <View style={styles.playersContainer}>
        <Text style={styles.playersLabel}>
          {(team.players || []).length} Player
          {(team.players || []).length !== 1 ? "s" : ""}
        </Text>
        {(team.players || []).slice(0, 3).map((player, index) => (
          <Text key={`player-${player}-${index}`} style={styles.playerText}>
            {player}
          </Text>
        ))}
        {(team.players || []).length > 3 && (
          <Text style={styles.playerText}>
            +{(team.players || []).length - 3} more
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  playerNameDisplay: {
    backgroundColor: "rgba(248, 250, 252, 0.95)",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    width: "100%",
    ...Platform.select({
      web: {
        maxWidth: 400, // Limit max width on web
        marginHorizontal: "auto", // Center on web
      },
      default: {},
    }),
  },
  reconnectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  reconnectButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },

  playerIcon: {
    marginRight: 12,
    color: "#0f766e",
  },
  playerNameDisplayText: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    ...Platform.select({
      web: {
        width: "100%",
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
  scrollView: {
    flex: 1,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 900, // Wider fixed width for web
      },
      default: {},
    }),
  },
  lobbyScrollContent: {
    paddingBottom: 28,
  },

  // Game content containers
  gameContent: {
    flex: 1,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 900, // Wider fixed width for web
      },
      default: {},
    }),
  },
  gameContentContainer: {
    flexGrow: 1,
    paddingBottom: 40,
    ...Platform.select({
      web: {
        width: "100%",
      },
      default: {},
    }),
  },

  // Lobby screen specific styles
  lobbyHeader: {
    position: "relative",
    paddingTop: 12,
    paddingBottom: 18,
    paddingHorizontal: 20,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 900,
      },
      default: {},
    }),
  },
  titleContainer: {
    alignItems: "center",
    marginTop: 10,
    alignSelf: "center",
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 600,
      },
      default: {},
    }),
  },
  inputSection: {
    paddingHorizontal: 0,
    marginBottom: 20,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: "100%",
        alignSelf: "center",
      },
      default: {},
    }),
  },
  setupCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    padding: 20,
    marginHorizontal: 20,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 700,
        alignSelf: "center",
      },
      default: {},
    }),
  },
  lobbyHeroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(13, 148, 136, 0.12)",
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 16,
  },
  connectionStatusRow: {
    alignItems: "center",
    marginBottom: 14,
  },
  instructorSection: {
    marginTop: 12,
    gap: 10,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: "100%",
        alignSelf: "center",
      },
      default: {},
    }),
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 30,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 600,
        alignSelf: "center",
      },
      default: {},
    }),
  },

  // Team select screen styles
  teamSelectContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 900,
      },
      default: {},
    }),
  },
  teamsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 30,
    ...Platform.select({
      web: {
        maxWidth: 900, // Increased from 800px
        marginHorizontal: "auto",
        justifyContent: "center",
      },
      default: {},
    }),
  },
  teamSelectCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "rgba(15, 23, 42, 0.08)",
    minHeight: 200,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    ...Platform.select({
      web: {
        minWidth: 400, // Increased from 300px
        maxWidth: "45%",
      },
      default: {},
    }),
  },
  selectedTeamCard: {
    borderColor: "#0f766e",
    shadowOpacity: 0.2,
  },

  // Question container styles
  questionContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 900,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  questionDisplayContainer: {
    backgroundColor: "rgba(74, 124, 89, 0.15)",
    borderRadius: 16,
    padding: 20,
    marginVertical: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(74, 124, 89, 0.2)",
    ...Platform.select({
      web: {
        maxWidth: 800,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },
  choicesContainer: {
    gap: 8,
    marginBottom: 16,
    ...Platform.select({
      web: {
        maxWidth: 900, // Increased from 700px
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },

  // Buzzer styles
  buzzerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    minHeight: 180,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 600,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },

  // Team scores section
  scoresContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    ...Platform.select({
      web: {
        maxWidth: 900, // Wider container
        marginHorizontal: "auto",
        paddingHorizontal: 0, // Remove padding on web to maximize width
      },
      default: {},
    }),
  },

  // Modal styles
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    ...Platform.select({
      web: {
        maxWidth: 550, // Wider modal on web
      },
      default: {},
    }),
  },

  // Question Editor Styles
  editorContainer: {
    flex: 1,
    paddingTop: 16,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 1100,
      },
      default: {},
    }),
  },
  questionsList: {
    flex: 1,
    paddingHorizontal: 20,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 1000,
        overflowY: "scroll",
        scrollbarWidth: "thin",
      },
      default: {},
    }),
  },
  questionItem: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.28)",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
    ...Platform.select({
      web: {
        marginHorizontal: 0,
      },
      default: {},
    }),
  },
  editForm: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    ...Platform.select({
      web: {
        maxWidth: 800,
        marginHorizontal: "auto",
        width: "100%",
      },
      default: {},
    }),
  },

  // Results screen
  resultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 900,
      },
      default: {},
    }),
  },
  finalScoresContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 40,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 700,
      },
      default: {},
    }),
  },
  resultsButtons: {
    width: "100%",
    gap: 16,
    ...Platform.select({
      web: {
        maxWidth: 500,
      },
      default: {},
    }),
  },

  // Countdown Screen
  countdownContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 1000,
      },
      default: {},
    }),
  },

  // Upload related styles
  uploadModalContainer: {
    backgroundColor: "#92eacc",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    ...Platform.select({
      web: {
        maxWidth: 600, // Wider on web
      },
      default: {},
    }),
  },
  uploadResultContainer: {
    backgroundColor: "#92eacc",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    ...Platform.select({
      web: {
        maxWidth: 600, // Wider on web
      },
      default: {},
    }),
  },

  // Docs styles
  docsContainer: {
    backgroundColor: "#92eacc",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 520,
    maxHeight: "85%",
    ...Platform.select({
      web: {
        maxWidth: 700, // Wider on web
      },
      default: {},
    }),
  },

  actionsMenuContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.34)",
    ...Platform.select({
      web: {
        maxWidth: 600,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },

  // Header styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 900,
      },
      default: {},
    }),
  },
  gameHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: 900,
        marginHorizontal: "auto",
      },
      default: {},
    }),
  },

  lobbyBackButton: {
    position: "absolute",
    top: 20,
    left: 20,
    padding: 8,
    zIndex: 1,
  },

  lobbyTitle: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
  },
  lobbySubtitle: {
    color: "#475569",
    fontSize: 15,
    marginTop: 4,
  },

  inputLabel: {
    color: "#0f766e",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "rgba(74, 124, 89, 0.2)",
    borderRadius: 12,
    padding: 16,
    color: "#ffffff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  playerNameText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },

  // Connection Status Styles
  connectionStatus: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  connectionIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  connectionIndicatorOnline: {
    backgroundColor: "rgba(16, 185, 129, 0.14)",
  },
  connectionIndicatorOffline: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  connectionText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  connectionTextOnline: {
    color: "#0f766e",
  },
  connectionTextOffline: {
    color: "#dc2626",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
  },
  robotSection: {
    alignItems: "center",
  },
  lobbyRobotImage: {
    width: 360,
    height: 240,
  },
  disconnectedText: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  waitingMessage: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: "center",
  },
  waitingText: {
    color: "#475569",
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 10,
  },
  instructorToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(241, 245, 249, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  instructorToggleActive: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  instructorToggleText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  instructorToggleTextActive: {
    color: "#ffffff",
  },
  editQuestionsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f766e",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  editQuestionsText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },

  createRoomButton: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
  },
  createRoomText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    alignItems: "center",
    marginVertical: 14,
  },
  dividerText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  joinRoomContainer: {
    flexDirection: "row",
    gap: 12,
  },
  roomCodeInput: {
    flex: 1,
    backgroundColor: "rgba(241, 245, 249, 0.95)",
    borderRadius: 12,
    padding: 16,
    color: "#0f172a",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.5)",
    textAlign: "center",
    textTransform: "uppercase",
  },
  joinCodeButton: {
    backgroundColor: "#0f766e",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  joinCodeText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  roomsSection: {
    paddingHorizontal: 20,
  },
  roomsTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  roomCard: {
    backgroundColor: "rgba(74, 124, 89, 0.15)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(74, 124, 89, 0.2)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomCardDisabled: {
    opacity: 0.6,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  roomCode: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  roomStats: {
    alignItems: "flex-end",
  },
  roomPlayers: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  roomStatus: {
    backgroundColor: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roomStatusPlaying: {
    backgroundColor: "#ef4444",
  },
  roomStatusText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },

  // Team Select Screen Styles
  nameInputContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  playerNameInput: {
    backgroundColor: "rgba(74, 124, 89, 0.2)",
    borderRadius: 12,
    padding: 16,
    color: "#ffffff",
    fontSize: 18,
    borderWidth: 2,
    borderColor: "#2acde6",
    textAlign: "center",
  },

  teamSelectTitle: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  teamSelectHint: {
    color: "#475569",
    textAlign: "center",
    fontSize: 13,
    marginBottom: 18,
  },

  teamSelectName: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  teamPlayersContainer: {
    flex: 1,
    marginVertical: 16,
  },
  teamPlayersCount: {
    color: "#d1f2d5",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  teamPlayerName: {
    color: "#d1f2d5",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  teamScore: {
    color: "#d1f2d5",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  startGameButton: {
    backgroundColor: "#0f766e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 16,
    marginTop: 20,
  },
  startGameText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
  },

  // Countdown Screen Styles

  countdownRound: {
    color: "#ffffffff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  countdownSubtext: {
    color: COLORS.textSecondary,
    fontSize: 18,
    marginBottom: 40,
  },
  countdownCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#2acde6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2acde6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  countdownNumber: {
    color: "#ffffff",
    fontSize: 48,
    fontWeight: "bold",
  },
  countdownInstructions: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: "500",
    marginTop: 20,
    textAlign: "center",
  },

  buzzedTeamContainer: {
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#60a5fa",
  },
  buzzedTeamText: {
    color: "#60a5fa",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },

  // Results Screen Styles

  resultsTitle: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
  },

  finalTeamScore: {
    alignItems: "center",
    flex: 1,
  },
  finalTeamName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  finalTeamPoints: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "bold",
  },
  finalVs: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 20,
  },

  playAgainButton: {
    backgroundColor: "#10b981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
  },
  playAgainText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  backToLobbyButton: {
    backgroundColor: "rgba(74, 124, 89, 0.2)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  backToLobbyText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },

  // Common Styles

  backButton: {
    padding: 8,
  },
  addButton: {
    padding: 8,
  },
  headerTitle: {
    color: "#000",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 16,
    flex: 1,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  roundContainer: {
    backgroundColor: "rgba(245, 158, 11, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#b88b2cff",
  },
  roundText: {
    color: "#0f383fff",
    fontSize: 14,
    fontWeight: "bold",
  },

  // Game Screen Styles
  timerBarContainer: {
    position: "relative",
    height: 6,
    backgroundColor: "rgba(74, 124, 89, 0.2)",
    marginHorizontal: 20,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  timerBar: {
    height: "100%",
    backgroundColor: "#2acde6",
  },
  timerText: {
    position: "absolute",
    right: 0,
    top: -25,
    color: "#2acde6",
    fontSize: 14,
    fontWeight: "bold",
  },

  teamCard: {
    flex: 1,
    backgroundColor: "rgba(74, 124, 89, 0.2)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: "transparent",
    ...Platform.select({
      web: {
        minWidth: 400, // Wider team cards
        padding: 16, // Larger padding for better visual
      },
      default: {},
    }),
  },
  myTeamCard: {
    borderColor: "#10b981",
  },
  buzzedTeamCard: {
    borderColor: "#24b187ff",
    backgroundColor: "#24b187ff",
  },
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  teamName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 4,
  },
  scoreContainer: {
    alignItems: "center",
    marginBottom: 8,
    ...Platform.select({
      web: {
        marginVertical: 10, // Add more space for scores on web
      },
      default: {},
    }),
  },
  scoreText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "bold",
    ...Platform.select({
      web: {
        fontSize: 32, // Larger score text on web
      },
      default: {},
    }),
  },
  playersContainer: {
    alignItems: "center",
  },
  playersLabel: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  playerText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "500",
  },
  vsContainer: {
    marginHorizontal: 12,
    alignItems: "center",
    ...Platform.select({
      web: {
        marginHorizontal: 20, // More spacing between teams on web
      },
      default: {},
    }),
  },
  vsText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
    ...Platform.select({
      web: {
        fontSize: 20, // Larger VS text on web
      },
      default: {},
    }),
  },
  statusText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },

  // Question Display Styles

  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  pointsText: {
    color: "rgba(19, 78, 87, 1), 61, 68, 1)ff",
    fontSize: 12,
    fontWeight: "bold",
  },
  questionText: {
    color: COLORS.textPrimary,
    fontSize: 22, // Smaller font size for mobile
    fontWeight: "600",
    lineHeight: 30, // Adjusted line height for mobile
    textAlign: "center",
    marginBottom: 30,
    ...Platform.select({
      web: {
        fontSize: 30, // Keep larger font size for web
        maxWidth: "90%",
        marginHorizontal: "auto",
        lineHeight: 42,
      },
      default: {},
    }),
  },
  choiceButton: {
    backgroundColor: "#35d091",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(74, 124, 89, 0.2)",
    ...Platform.select({
      web: {
        width: 600, // Fixed width for web platforms
        minHeight: 60,
        paddingHorizontal: 16,
        marginHorizontal: "auto", // Center the button
      },
      default: {},
    }),
  },
  selectedChoice: {
    backgroundColor: "rgba(103, 221, 152, 1)",
    borderColor: "#10b981",
  },
  correctChoice: {
    backgroundColor: "rgba(52, 255, 187, 0.9)",
    borderColor: "#10b981",
  },
  incorrectChoice: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "#ef4444",
  },
  disabledChoice: {
    opacity: 0.5,
  },
  choiceLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    width: 28,
    textAlign: "center",
    marginRight: 12,
  },
  choiceText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    lineHeight: 18,
  },
  selectedChoiceText: {
    color: COLORS.textPrimary,
    fontWeight: "bold",
  },
  correctChoiceText: {
    color: "#10b981",
    fontWeight: "bold",
  },
  incorrectChoiceText: {
    color: "#ef4444",
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  questionTimerContainer: {
    alignItems: "center",
  },
  questionTimerText: {
    color: "#12464eff",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Answer Result Styles
  answerFeedbackContainer: {
    marginTop: 12,
    width: "100%",
  },
  answerResultContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },
  correctAnswerContainer: {
    backgroundColor: "rgba(48, 196, 114, 1)",
    borderWidth: 1,
    borderColor: "rgba(48, 196, 114, 1)",
  },
  incorrectAnswerContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  answerResultText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
  },
  correctAnswerText: {
    color: "#ffffffff",
  },
  incorrectAnswerText: {
    color: "#ef4444",
  },
  answerMessageText: {
    color: "#ffffff",
    textAlign: "center",
    marginTop: 8,
  },

  // Buzzer Styles

  buzzer: {
    alignItems: "center",
  },
  buzzerButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#ffc21f",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#ffc21f",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  },
  buzzerDisabled: {
    backgroundColor: "#666",
    shadowColor: "#666",
  },
  buzzerText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 6,
  },

  // Instructor Screen Styles

  questionListItem: {
    backgroundColor: "rgba(74, 124, 89, 0.15)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(74, 124, 89, 0.2)",
  },
  questionListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  questionListNumber: {
    color: "#2acde6",
    fontSize: 16,
    fontWeight: "bold",
  },
  questionListPoints: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "bold",
  },
  questionListText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  questionListAnswer: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontStyle: "italic",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  modalDescription: {
    color: "#94a3b8",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  fieldLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
  },
  questionTextInput: {
    backgroundColor: "rgba(74, 124, 89, 0.2)",
    borderRadius: 12,
    padding: 16,
    color: "#ffffff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    minHeight: 80,
    textAlignVertical: "top",
  },
  choiceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  correctAnswerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(74, 124, 89, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  correctAnswerButtonActive: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  choiceInputLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  choiceTextInput: {
    flex: 1,
    backgroundColor: "rgba(74, 124, 89, 0.2)",
    borderRadius: 12,
    padding: 12,
    color: "#ffffff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  questionMetaContainer: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
  },
  questionMetaField: {
    flex: 1,
  },
  metaInput: {
    backgroundColor: "rgba(74, 124, 89, 0.2)",
    borderRadius: 12,
    padding: 12,
    color: "#ffffff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#9ca3af",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#9ca3af",
  },
  modalCancelText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalCreateButton: {
    flex: 1,
    backgroundColor: "#10b981",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCreateText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  leaveModalTitle: {
    color: "#000000",
  },

  // Question Editor Styles (from Knowledge Relay)

  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 16,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.3)",
  },
  editorHeaderMeta: {
    flex: 1,
    marginLeft: 8,
  },
  editorHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editorTitle: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "800",
  },
  editorSubtitle: {
    color: "#475569",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
  },
  editorStatsText: {
    color: "#0f766e",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },
  questionCountBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(15,118,110,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15,118,110,0.35)",
  },
  questionCountText: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "800",
  },
  createQuestionButton: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: 8,
    padding: 8,
  },

  questionNumber: {
    color: "#0f766e",
    fontSize: 16,
    fontWeight: "800",
  },
  deleteButton: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderRadius: 8,
    padding: 6,
  },
  questionPreview: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  questionMetaText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  createQuestionCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  createQuestionIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0f766e",
    alignItems: "center",
    justifyContent: "center",
  },
  createQuestionText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },
  createQuestionSubtext: {
    color: "#64748b",
    marginTop: 4,
    fontSize: 13,
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
  },
  editorWebModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  editorWebModalCard: {
    width: "100%",
    maxWidth: 980,
    maxHeight: "90%",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.35)",
  },
  // Specific adjustments when modalTitle is used inside modalHeader
  modalHeaderTitle: {
    flex: 1,
    marginBottom: 0, // override generic modalTitle vertical spacing
    marginHorizontal: "10vw", // provide horizontal spacing between buttons
  },
  saveButton: {
    color: "#0f766e",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12, // spacing from the title on web
  },

  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: "rgba(248,250,252,0.96)",
    borderRadius: 8,
    padding: 12,
    color: "#0f172a",
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.45)",
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  formHalf: {
    flex: 1,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#94a3b8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioButtonSelected: {
    borderColor: "#10b981",
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
  },
  optionInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  optionLabel: {
    color: "#0f766e",
    fontSize: 16,
    fontWeight: "bold",
    width: 24,
    textAlign: "center",
    marginRight: 8,
  },
  optionInput: {
    flex: 1,
    backgroundColor: "rgba(248,250,252,0.96)",
    borderRadius: 8,
    padding: 12,
    color: "#0f172a",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.45)",
  },
  correctAnswerInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  correctAnswerDisplayText: {
    color: "#60a5fa",
    fontSize: 14,
    marginLeft: 8,
  },

  // Upload related styles
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  uploadQuestionsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  uploadQuestionsText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "600",
  },
  downloadQuestionsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  downloadQuestionsText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "600",
  },
  uploadModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  uploadModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f8fafc",
    textAlign: "center",
    marginBottom: 16,
  },
  fileInfoContainer: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  fileInfoText: {
    color: "#60a5fa",
    fontSize: 14,
    fontWeight: "600",
  },
  fileInfoDetails: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
  },
  uploadModalDescription: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: "center",
  },
  formatExample: {
    backgroundColor: "#92eacc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  formatExampleText: {
    color: "#94a3b8",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    lineHeight: 14,
  },
  uploadModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  uploadModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  uploadModalCancelButton: {
    backgroundColor: "#374151",
  },
  uploadModalUploadButton: {
    backgroundColor: "#10b981",
  },
  uploadModalButtonDisabled: {
    backgroundColor: "#6b7280",
    opacity: 0.6,
  },
  uploadModalButtonText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "600",
  },

  uploadResultTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f8fafc",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  uploadResultMessage: {
    color: "#cbd5e1",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  uploadResultCount: {
    color: "#10b981",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  errorList: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: "100%",
  },
  errorTitle: {
    color: "#fca5a5",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  uploadErrorText: {
    // renamed duplicate
    color: "#f87171",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  uploadResultButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
  },
  uploadResultButtonText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  // Docs styles
  docsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366f1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  docsButtonText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "600",
  },
  docsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(248,250,252,0.95)",
    marginLeft: 2,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionsMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
    padding: 20,
  },

  actionsMenuTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  actionsMenuSubtitle: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  actionsMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 12,
    backgroundColor: "rgba(248,250,252,0.9)",
    marginBottom: 4,
  },
  actionsMenuItemText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "600",
  },
  actionsMenuCloseItem: {
    marginTop: 4,
    backgroundColor: "rgba(248,113,113,0.14)",
  },
});
