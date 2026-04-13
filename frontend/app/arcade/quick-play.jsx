import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "@/constants/custom-colors";
import { useSettings } from "@/contexts/SettingsContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { GameNotificationService } from "@/services/gameNotificationService";
import AnswerFeedbackModal from "@/components/ui/AnswerFeedbackModal";
import { useTheme } from "@/contexts/ThemeContext";

// Local fallback data for different question types (used only if API not available)
const FALLBACK_QUESTIONS = [
  // Multiple Choice Questions
  {
    id: 1,
    type: "multipleChoice",
    question: "What does HTML stand for?",
    options: [
      "Hyper Text Markup Language",
      "High Tech Modern Language",
      "Home Tool Markup Language",
      "Hyperlink and Text Markup Language",
    ],
    correctAnswer: 0,
    difficulty: "easy",
    category: "Web Development",
  },
  {
    id: 2,
    type: "multipleChoice",
    question: "Which of the following is NOT a programming language?",
    options: ["Python", "JavaScript", "HTML", "Java"],
    correctAnswer: 2,
    difficulty: "medium",
    category: "Programming",
  },
  {
    id: 3,
    type: "multipleChoice",
    question: "What is the primary function of CSS?",
    options: [
      "To add interactivity to web pages",
      "To structure web content",
      "To style and layout web pages",
      "To store data",
    ],
    correctAnswer: 2,
    difficulty: "easy",
    category: "Web Development",
  },

  // Fill in the Blanks Questions
  {
    id: 4,
    type: "fillInBlanks",
    question:
      "The ____ tag is used to create hyperlinks in HTML, and it uses the ____ attribute to specify the destination URL.",
    blanks: ["<a>", "href"],
    difficulty: "medium",
    category: "Web Development",
  },
  {
    id: 5,
    type: "fillInBlanks",
    question:
      "In JavaScript, ____ is used to declare variables that cannot be reassigned, while ____ allows reassignment.",
    blanks: ["const", "let"],
    difficulty: "medium",
    category: "Programming",
  },
  {
    id: 6,
    type: "fillInBlanks",
    question: "CSS stands for ____ ____ ____.",
    blanks: ["Cascading", "Style", "Sheets"],
    difficulty: "easy",
    category: "Web Development",
  },

  // Code Missing Questions
  {
    id: 7,
    type: "codeMissing",
    question:
      "Complete the JavaScript function to calculate the area of a rectangle:",
    codeTemplate: `function calculateArea(length, width) {
    return ____;
}`,
    correctAnswer: "length * width",
    difficulty: "easy",
    category: "Programming",
  },
  {
    id: 8,
    type: "codeMissing",
    question: "Complete the HTML structure for a basic webpage:",
    codeTemplate: `<!DOCTYPE html>
<html>
<head>
    <title>My Page</title>
</head>
<____>
    <h1>Welcome</h1>
</____>
</html>`,
    correctAnswer: "body",
    difficulty: "easy",
    category: "Web Development",
  },

  // Code Ordering Questions
  {
    id: 9,
    type: "codeOrdering",
    question:
      "Arrange these CSS properties in the correct order to create a centered box:",
    codeBlocks: [
      { id: 1, code: "margin: 0 auto;", position: 2 },
      { id: 2, code: "width: 300px;", position: 0 },
      { id: 3, code: "text-align: center;", position: 3 },
      { id: 4, code: "display: block;", position: 1 },
    ],
    difficulty: "hard",
    category: "Web Development",
  },
  {
    id: 10,
    type: "codeOrdering",
    question:
      "Arrange these JavaScript statements to create a proper function:",
    codeBlocks: [
      { id: 1, code: "return result;", position: 2 },
      { id: 2, code: "function addNumbers(a, b) {", position: 0 },
      { id: 3, code: "}", position: 3 },
      { id: 4, code: "let result = a + b;", position: 1 },
    ],
    difficulty: "medium",
    category: "Programming",
  },
];

const WEB_UI_SCALE = 1.2;
const webScale = (value) =>
  Platform.OS === "web" ? Math.round(value * WEB_UI_SCALE) : value;

export default function QuickPlay() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const { settings } = useSettings();
  const { showNotification } = useNotifications();
  const [gameState, setGameState] = useState("menu"); // menu, playing, results
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [lives, setLives] = useState(3);
  const [gameComplete, setGameComplete] = useState(false);

  // Modal state for answer feedback
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({
    isCorrect: false,
    title: "",
    message: "",
    onContinue: () => {},
  });

  // Initialize game
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const iconSize = (value) =>
    Platform.OS === "web" ? Math.round(value * WEB_UI_SCALE) : value;
  const highlightColor = isDarkMode ? colors.primary : colors.textPrimary;
  const trainingPrimaryText = isDarkMode ? "#f8fafc" : "#0f172a";
  const trainingSecondaryText = isDarkMode ? "#cbd5e1" : "#334155";
  const screenGradient = isDarkMode ? ["#0f172a", "#111827"] : ["#caf1c8", "#5fd2cd"];
  const premiumCard = {
    backgroundColor: isDarkMode
      ? "rgba(15, 23, 42, 0.74)"
      : "rgba(255, 255, 255, 0.86)",
    borderColor: isDarkMode
      ? "rgba(148, 163, 184, 0.24)"
      : "rgba(148, 163, 184, 0.34)",
  };

  const startGame = async () => {
    setLoading(true);
    setError(null);
    try {
      // Dynamically import to avoid circular issues & only load when needed
      const quickPlayApi = (await import("@/services/quickPlayApi")).default;
      const { questions } = await quickPlayApi.fetchQuestions(10);
      const normalized = questions.map((q, idx) => {
        // Normalize field names to those expected by component logic
        if (q.type === "multipleChoice") {
          return {
            id: q.id || idx,
            type: q.type,
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correctAnswer, // index
            difficulty: q.difficulty || "medium",
            category: q.category || "General",
          };
        }
        return {
          id: q.id || idx,
          type: q.type,
          // unify property names
          question: q.question,
          options: q.options,
          blanks: q.blanks,
          codeTemplate: q.codeTemplate,
          codeBlocks: q.codeBlocks,
          correctAnswer: q.correctAnswer,
          difficulty: q.difficulty || "medium",
          category: q.category || "General",
        };
      });
      const shuffled = [...normalized].sort(() => Math.random() - 0.5);
      setShuffledQuestions(shuffled);
    } catch (err) {
      console.log("QuickPlay API failed, using fallback questions", err);
      setError("Using fallback questions (no created questions available)");
      const shuffled = [...FALLBACK_QUESTIONS].sort(() => Math.random() - 0.5);
      setShuffledQuestions(shuffled);
    } finally {
      setCurrentQuestionIndex(0);
      setAnswers({});
      setScore(0);
      setTimeLeft(30);
      setLives(3);
      setGameComplete(false);
      setGameState("playing");
      setLoading(false);
    }
  };

  const endGame = useCallback(async () => {
    setGameComplete(true);
    setGameState("results");

    // Send enhanced notification on game completion
    await GameNotificationService.sendGameCompletionNotification(
      "quickplay",
      { score },
      showNotification,
      settings
    );
  }, [score, showNotification, settings]);

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setTimeLeft(30);
      setAnswers({});
    } else {
      endGame();
    }
  }, [currentQuestionIndex, shuffledQuestions.length, endGame]);

  // Timer effect
  useEffect(() => {
    const handleTimeUp = () => {
      setLives(lives - 1);
      if (lives <= 1) {
        endGame();
      } else {
        nextQuestion();
      }
    };

    if (gameState === "playing" && timeLeft > 0 && !gameComplete) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === "playing") {
      handleTimeUp();
    }
  }, [timeLeft, gameState, gameComplete, lives, endGame, nextQuestion]);

  const submitAnswer = () => {
    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    let isCorrect = false;

    switch (currentQuestion.type) {
      case "multipleChoice":
        isCorrect = answers.selectedOption === currentQuestion.correctAnswer;
        break;
      case "fillInBlanks":
        const userAnswers = answers.blanks || [];
        isCorrect = currentQuestion.blanks.every(
          (blank, index) =>
            userAnswers[index] &&
            userAnswers[index].toLowerCase().trim() ===
              blank.toLowerCase().trim()
        );
        break;
      case "codeMissing":
        isCorrect =
          answers.codeAnswer &&
          answers.codeAnswer.toLowerCase().trim() ===
            currentQuestion.correctAnswer.toLowerCase().trim();
        break;
      case "codeOrdering":
        const userOrder = answers.codeOrder || [];
        isCorrect = currentQuestion.codeBlocks.every(
          (block, index) => userOrder[block.position] === block.id
        );
        break;
    }

    if (isCorrect) {
      setScore(score + 10);
      setModalData({
        isCorrect: true,
        title: "Correct!",
        message: "Well done! +10 points",
        onContinue: () => {
          setModalVisible(false);
          nextQuestion();
        },
      });
      setModalVisible(true);
    } else {
      setLives(lives - 1);
      if (lives <= 1) {
        setModalData({
          isCorrect: false,
          title: "Game Over",
          message: "You've run out of lives!",
          onContinue: () => {
            setModalVisible(false);
            endGame();
          },
        });
        setModalVisible(true);
      } else {
        setModalData({
          isCorrect: false,
          title: "Incorrect",
          message: `You lost a life! ${lives - 1} lives remaining`,
          onContinue: () => {
            setModalVisible(false);
            nextQuestion();
          },
        });
        setModalVisible(true);
      }
    }
  };

  const renderMenuScreen = () => (
    <View style={styles.gameContent}>
      <View style={[styles.gameInfo, premiumCard]}>
        <View style={styles.textSection}>
          <Text style={[styles.modeBadge, { color: trainingPrimaryText }]}>ARCADE TRAINING MODE</Text>
          <Text
            style={[
              styles.description,
              { color: trainingSecondaryText },
            ]}
          >
            Solo practice with randomized questions from all levels
          </Text>
          <Text style={[styles.infoText, { color: trainingPrimaryText }]}> 
            • Randomized questions from all available levels
          </Text>
          <Text style={[styles.infoText, { color: trainingPrimaryText }]}> 
            • Time-based challenges (30 seconds per question)
          </Text>
          <Text style={[styles.infoText, { color: trainingPrimaryText }]}>• 3 lives system</Text>
          <Text style={[styles.infoText, { color: trainingPrimaryText }]}>• Multiple question types</Text>
          <Text style={[styles.infoText, { color: trainingPrimaryText }]}>• High score tracking</Text>
        </View>

        <View style={styles.imageSection}>
          <View style={styles.imageContainer}>
            <Image
              source={require("../../assets/images/robot1.png")}
              style={styles.menuImage}
              resizeMode="contain"
            />
          </View>

          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: "#0f766e" }]}
            onPress={startGame}
            disabled={loading}
          >
            <Text style={styles.playButtonText}>
              {loading ? "LOADING..." : "START GAME"}
            </Text>
          </TouchableOpacity>
          {error && (
            <Text
              style={{ color: COLORS.warning, textAlign: "center", marginTop: 10 }}
            >
              {error}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const renderGameScreen = () => {
    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    if (!currentQuestion) return null;

    return (
      <ScrollView style={styles.gameContent}>
        {/* Game HUD */}
        <View style={[styles.gameHUD, premiumCard]}>
          <View style={styles.hudItem}>
            <Ionicons name="heart" size={iconSize(20)} color={COLORS.error} />
            <Text style={[styles.hudText, { color: colors.text }]}>{lives}</Text>
          </View>
          <View style={styles.hudItem}>
            <Ionicons name="time" size={iconSize(20)} color={COLORS.primary} />
            <Text style={[styles.hudText, { color: colors.text }]}>{timeLeft}s</Text>
          </View>
          <View style={styles.hudItem}>
            <Ionicons name="trophy" size={iconSize(20)} color={COLORS.primary} />
            <Text style={[styles.hudText, { color: colors.text }]}>{score}</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}> 
            Question {currentQuestionIndex + 1} of {shuffledQuestions.length}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: isDarkMode ? "rgba(30,41,59,0.8)" : "rgba(226,232,240,0.9)", borderColor: premiumCard.borderColor }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    ((currentQuestionIndex + 1) / shuffledQuestions.length) *
                    100
                  }%`,
                  backgroundColor: highlightColor,
                },
              ]}
            />
          </View>
        </View>

        {/* Question */}
        <View style={[styles.questionContainer, premiumCard]}>
          <View style={styles.questionHeader}>
            <Text style={[styles.questionType, { color: colors.textSecondary }]}> 
              {currentQuestion.type
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())}
            </Text>
            <Text style={[styles.difficulty, { color: highlightColor, borderColor: highlightColor, backgroundColor: isDarkMode ? "rgba(15,23,42,0.8)" : "rgba(241,245,249,0.9)" }]}> 
              {currentQuestion.difficulty.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.questionText, { color: colors.text }]}>{currentQuestion.question}</Text>

          {renderQuestionContent(currentQuestion)}
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={[styles.submitButton, { backgroundColor: "#0f766e" }]} onPress={submitAnswer}>
          <Text style={styles.submitButtonText}>SUBMIT ANSWER</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderQuestionContent = (question) => {
    switch (question.type) {
      case "multipleChoice":
        return renderMultipleChoice(question);
      case "fillInBlanks":
        return renderFillInBlanks(question);
      case "codeMissing":
        return renderCodeMissing(question);
      case "codeOrdering":
        return renderCodeOrdering(question);
      default:
        return null;
    }
  };

  const renderMultipleChoice = (question) => (
    <View style={styles.optionsContainer}>
      {question.options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.optionButton,
            answers.selectedOption === index && styles.selectedOption,
          ]}
          onPress={() => setAnswers({ ...answers, selectedOption: index })}
        >
          <Text
            style={[
              styles.optionText,
              answers.selectedOption === index && styles.selectedOptionText,
            ]}
          >
            {String.fromCharCode(65 + index)}. {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFillInBlanks = (question) => {
    const userBlanks =
      answers.blanks || new Array(question.blanks.length).fill("");

    return (
      <View style={styles.fillInBlanksContainer}>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>Fill in the blanks:</Text>
        {question.blanks.map((_, index) => (
          <View key={index} style={styles.blankContainer}>
            <Text style={[styles.blankLabel, { color: colors.text }]}>Blank {index + 1}:</Text>
            <TextInput
              style={[styles.blankInput, { color: colors.text, borderColor: premiumCard.borderColor, backgroundColor: isDarkMode ? "rgba(30,41,59,0.75)" : "rgba(241,245,249,0.92)" }]}
              value={userBlanks[index]}
              onChangeText={(text) => {
                const newBlanks = [...userBlanks];
                newBlanks[index] = text;
                setAnswers({ ...answers, blanks: newBlanks });
              }}
              placeholder={`Enter answer for blank ${index + 1}`}
              placeholderTextColor={COLORS.placeholderText}
            />
          </View>
        ))}
      </View>
    );
  };

  const renderCodeMissing = (question) => (
    <View style={styles.codeMissingContainer}>
      <Text style={[styles.helperText, { color: colors.textSecondary }]}>Complete the missing code:</Text>
      <View style={[styles.codeContainer, { borderColor: premiumCard.borderColor, backgroundColor: isDarkMode ? "rgba(30,41,59,0.75)" : "rgba(241,245,249,0.92)" }]}>
        <Text style={[styles.codeText, { color: colors.text }]}>{question.codeTemplate}</Text>
      </View>
      <TextInput
        style={[styles.codeInput, { color: colors.text, borderColor: premiumCard.borderColor, backgroundColor: isDarkMode ? "rgba(30,41,59,0.75)" : "rgba(241,245,249,0.92)" }]}
        value={answers.codeAnswer || ""}
        onChangeText={(text) => setAnswers({ ...answers, codeAnswer: text })}
        placeholder="Enter the missing code..."
        placeholderTextColor={COLORS.placeholderText}
        multiline
      />
    </View>
  );

  const renderCodeOrdering = (question) => {
    const userOrder = answers.codeOrder || [];
    const availableBlocks = question.codeBlocks.filter(
      (block) => !userOrder.includes(block.id)
    );

    return (
      <View style={styles.codeOrderingContainer}>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}> 
          Drag and arrange the code blocks in the correct order:
        </Text>

        {/* Ordered blocks */}
        <View style={styles.orderedBlocksContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Order:</Text>
          {userOrder.map((blockId, index) => {
            const block = question.codeBlocks.find((b) => b.id === blockId);
            return (
              <View key={index} style={[styles.orderedBlock, { backgroundColor: "rgba(15,118,110,0.14)", borderColor: "rgba(15,118,110,0.34)" }]}>
                <Text style={[styles.codeBlockText, { color: colors.text }]}> 
                  {index + 1}. {block?.code}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const newOrder = [...userOrder];
                    newOrder.splice(index, 1);
                    setAnswers({ ...answers, codeOrder: newOrder });
                  }}
                >
                  <Ionicons
                    name="close-circle"
                    size={iconSize(20)}
                    color={COLORS.error}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Available blocks */}
        <View style={styles.availableBlocksContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Blocks:</Text>
          {availableBlocks.map((block) => (
            <TouchableOpacity
              key={block.id}
              style={[styles.availableBlock, { borderColor: premiumCard.borderColor, backgroundColor: isDarkMode ? "rgba(30,41,59,0.75)" : "rgba(241,245,249,0.92)" }]}
              onPress={() => {
                const newOrder = [...userOrder, block.id];
                setAnswers({ ...answers, codeOrder: newOrder });
              }}
            >
              <Text style={[styles.codeBlockText, { color: colors.text }]}>{block.code}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderResultsScreen = () => (
    <View style={styles.content}>
      <View style={[styles.resultsContainer, premiumCard]}>
        <Ionicons name="trophy" size={iconSize(64)} color={COLORS.primary} />
        <Text style={[styles.resultsTitle, { color: colors.text }]}>Game Complete!</Text>
        <Text style={[styles.finalScore, { color: highlightColor }]}>Final Score: {score}</Text>
        <Text style={[styles.resultsDetails, { color: colors.textSecondary }]}> 
          Questions Answered: {currentQuestionIndex + 1}
        </Text>
        <Text style={[styles.resultsDetails, { color: colors.textSecondary }]}> 
          Accuracy:{" "}
          {Math.round((score / (10 * (currentQuestionIndex + 1))) * 100)}%
        </Text>

        <View style={styles.resultsButtons}>
          <TouchableOpacity style={[styles.playAgainButton, { backgroundColor: "#0f766e" }]} onPress={startGame}>
            <Text style={styles.playAgainButtonText}>PLAY AGAIN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.backToMenuButton, { backgroundColor: isDarkMode ? "rgba(30,41,59,0.88)" : "rgba(241,245,249,0.95)", borderColor: premiumCard.borderColor }]}
            onPress={() => setGameState("menu")}
          >
            <Text style={[styles.backToMenuButtonText, { color: colors.text }]}>BACK TO MENU</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={screenGradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/(tabs)/game")}
          >
            <Ionicons name="arrow-back" size={iconSize(24)} color={highlightColor} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: highlightColor }]}>Quick Play</Text>
            <Text style={[styles.titleSubtitle, { color: colors.textSecondary }]}> 
              Solo training mode
            </Text>
          </View>
        </View>

        {gameState === "menu" && renderMenuScreen()}
        {gameState === "playing" && renderGameScreen()}
        {gameState === "results" && renderResultsScreen()}

        {/* Answer Feedback Modal */}
        <AnswerFeedbackModal
          visible={modalVisible}
          isCorrect={modalData.isCorrect}
          title={modalData.title}
          message={modalData.message}
          onContinue={modalData.onContinue}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: webScale(20),
    paddingVertical: webScale(14),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.28)",
  },
  backButton: {
    marginRight: webScale(16),
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: webScale(24),
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: 0.4,
  },
  titleSubtitle: {
    marginTop: webScale(2),
    fontSize: webScale(13),
    fontWeight: "500",
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: webScale(20),
    paddingTop: webScale(20),
    alignSelf: Platform.OS === "web" ? "center" : undefined,
    width: Platform.OS === "web" ? webScale(980) : "100%",
    maxWidth: "100%",
  },
  modeBadge: {
    alignSelf: "flex-start",
    fontSize: webScale(11),
    fontWeight: "800",
    letterSpacing: 1.2,
    borderWidth: 1,
    borderColor: "rgba(15,118,110,0.45)",
    backgroundColor: "rgba(15,118,110,0.12)",
    paddingHorizontal: webScale(10),
    paddingVertical: webScale(6),
    borderRadius: 999,
    marginBottom: webScale(12),
  },
  description: {
    fontSize: Platform.OS === "web" ? webScale(18) : 16,
    color: COLORS.textSecondary,
    marginBottom: webScale(30),
    textAlign: "left",
    lineHeight: webScale(26),
  },
  gameInfo: {
    backgroundColor: COLORS.cardBackground,
    padding: Platform.OS === "web" ? webScale(28) : 20,
    borderRadius: webScale(16),
    marginBottom: webScale(30),
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: webScale(16),
    elevation: 4,
    ...Platform.select({
      android: {
        flexDirection: "column",
        alignItems: "stretch",
        padding: 14,
      },
      default: {},
    }),
  },
  textSection: {
    flex: 1,
    paddingRight: webScale(20),
    ...Platform.select({
      android: {
        flex: 0,
        width: "100%",
        paddingRight: 0,
        marginBottom: 10,
      },
      default: {},
    }),
  },
  imageSection: {
    alignItems: "flex-start",
    justifyContent: "center",
    ...Platform.select({
      android: {
        alignItems: "center",
        width: "100%",
        marginTop: 4,
      },
      default: {},
    }),
  },
  infoText: {
    fontSize: Platform.OS === "web" ? webScale(16) : 14,
    color: COLORS.textPrimary,
    marginBottom: webScale(10),
    lineHeight: webScale(22),
  },
  playButton: {
    backgroundColor: "#d0ea4a",
    paddingVertical: webScale(16),
    paddingHorizontal: Platform.OS === "web" ? webScale(28) : 16,
    minWidth: Platform.OS === "web" ? webScale(220) : undefined,
    borderRadius: webScale(12),
    alignItems: "center",
    marginBottom: webScale(20),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: webScale(14),
    elevation: 5,
    ...Platform.select({
      android: {
        width: "100%",
        marginBottom: 8,
      },
      default: {},
    }),
  },
  playButtonText: {
    color: "#f8fafc",
    fontSize: webScale(16),
    fontWeight: "bold",
    letterSpacing: 0.8,
  },

  // Image inside gameInfo
  imageContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  menuImage: {
    width: Platform.OS === "web" ? webScale(260) : 160,
    height: Platform.OS === "web" ? webScale(260) : 160,
    ...Platform.select({
      android: {
        width: 128,
        height: 128,
      },
      default: {},
    }),
  },

  // Game Screen Styles
  gameContent: {
    flex: 1,
    paddingHorizontal: webScale(20),
    alignSelf: Platform.OS === "web" ? "center" : undefined,
    width: Platform.OS === "web" ? webScale(980) : "100%",
    maxWidth: "100%",
  },

  gameHUD: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: COLORS.cardBackground,
    padding: webScale(15),
    borderRadius: webScale(14),
    marginBottom: webScale(20),
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
  },
  hudItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: webScale(6),
    paddingHorizontal: webScale(10),
    paddingVertical: webScale(6),
    borderRadius: webScale(10),
    backgroundColor: "rgba(15,118,110,0.1)",
  },
  hudText: {
    color: COLORS.textPrimary,
    fontSize: webScale(16),
    fontWeight: "bold",
  },
  progressContainer: {
    marginBottom: webScale(20),
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: webScale(14),
    marginBottom: webScale(8),
    textAlign: "center",
  },
  progressBar: {
    height: webScale(8),
    backgroundColor: COLORS.cardBackground,
    borderRadius: webScale(4),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2acde6",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.textPrimary,
  },

  // Question Styles
  questionContainer: {
    backgroundColor: COLORS.cardBackground,
    padding: webScale(20),
    borderRadius: webScale(14),
    marginBottom: webScale(20),
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  questionType: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  difficulty: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: "bold",
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  questionText: {
    fontSize: webScale(16),
    color: COLORS.textPrimary,
    lineHeight: webScale(24),
    marginBottom: webScale(20),
  },

  // Multiple Choice Styles
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: "rgba(241, 245, 249, 0.92)",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.34)",
  },
  selectedOption: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e",
  },
  optionText: {
    fontSize: webScale(14),
    color: COLORS.textPrimary,
  },
  selectedOptionText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  // Fill in Blanks Styles
  fillInBlanksContainer: {
    gap: 15,
  },
  helperText: {
    fontSize: webScale(14),
    color: COLORS.textSecondary,
    fontStyle: "italic",
    marginBottom: webScale(10),
  },
  blankContainer: {
    gap: 8,
  },
  blankLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "bold",
  },
  blankInput: {
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: "#2acde6",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  // Code Missing Styles
  codeMissingContainer: {
    gap: 15,
  },
  codeContainer: {
    backgroundColor: COLORS.inputBackground,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2acde6",
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  codeInput: {
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: "#2acde6",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: "monospace",
    minHeight: 60,
  },

  // Code Ordering Styles
  codeOrderingContainer: {
    gap: 20,
  },
  sectionTitle: {
    fontSize: webScale(16),
    color: COLORS.textPrimary,
    fontWeight: "bold",
    marginBottom: webScale(10),
  },
  orderedBlocksContainer: {
    gap: 10,
  },
  orderedBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(15,118,110,0.16)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(15,118,110,0.34)",
  },
  availableBlocksContainer: {
    gap: 10,
  },
  availableBlock: {
    backgroundColor: COLORS.inputBackground,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2acde6",
    marginBottom: 8,
  },
  codeBlockText: {
    fontFamily: "monospace",
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },

  // Submit Button
  submitButton: {
    backgroundColor: "#0f766e",
    paddingVertical: webScale(16),
    paddingHorizontal: webScale(32),
    borderRadius: webScale(12),
    alignItems: "center",
    marginBottom: webScale(30),
    marginTop: webScale(10),
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: webScale(12),
    elevation: 4,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: webScale(16),
    fontWeight: "bold",
    letterSpacing: 0.8,
  },

  // Results Screen Styles
  resultsContainer: {
    alignItems: "center",
    paddingVertical: webScale(40),
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    borderRadius: webScale(16),
    paddingHorizontal: webScale(20),
    marginTop: webScale(12),
    width: "100%",
    maxWidth: Platform.OS === "web" ? webScale(980) : "100%",
    alignSelf: "center",
  },
  resultsTitle: {
    fontSize: webScale(28),
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: webScale(20),
    marginBottom: webScale(10),
  },
  finalScore: {
    fontSize: webScale(24),
    color: COLORS.textPrimary,
    fontWeight: "bold",
    marginBottom: webScale(20),
  },
  resultsDetails: {
    fontSize: webScale(16),
    color: COLORS.textSecondary,
    marginBottom: webScale(8),
  },
  resultsButtons: {
    width: "100%",
    gap: webScale(15),
    marginTop: webScale(30),
    maxWidth: Platform.OS === "web" ? webScale(500) : "100%",
    alignSelf: "center",
     },
  playAgainButton: {
    backgroundColor: "#0f766e",
    paddingVertical: webScale(16),
    paddingHorizontal: webScale(32),
    borderRadius: webScale(12),
    alignItems: "center",
  },
  playAgainButtonText: {
    color: "#FFF",
    fontSize: webScale(16),
    fontWeight: "bold",
    letterSpacing: 0.7,
  },
  backToMenuButton: {
    backgroundColor: "#f1f5f9",
    paddingVertical: webScale(16),
    paddingHorizontal: webScale(32),
    borderRadius: webScale(12),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.34)",
  },
  backToMenuButtonText: {
    color: COLORS.textPrimary,
    fontSize: webScale(16),
    fontWeight: "bold",
    letterSpacing: 0.7,
  },
});
