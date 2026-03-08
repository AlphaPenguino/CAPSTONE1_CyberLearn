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

export default function QuickPlay() {
  const router = useRouter();
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
      <View style={styles.gameInfo}>
        <View style={styles.textSection}>
          <Text style={styles.description}>
            Solo practice with randomized questions from all levels
          </Text>
          <Text style={styles.infoText}>
            • Randomized questions from all available levels
          </Text>
          <Text style={styles.infoText}>
            • Time-based challenges (30 seconds per question)
          </Text>
          <Text style={styles.infoText}>• 3 lives system</Text>
          <Text style={styles.infoText}>• Multiple question types</Text>
          <Text style={styles.infoText}>• High score tracking</Text>
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
            style={styles.playButton}
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
        <View style={styles.gameHUD}>
          <View style={styles.hudItem}>
            <Ionicons name="heart" size={20} color={COLORS.error} />
            <Text style={styles.hudText}>{lives}</Text>
          </View>
          <View style={styles.hudItem}>
            <Ionicons name="time" size={20} color={COLORS.primary} />
            <Text style={styles.hudText}>{timeLeft}s</Text>
          </View>
          <View style={styles.hudItem}>
            <Ionicons name="trophy" size={20} color={COLORS.primary} />
            <Text style={styles.hudText}>{score}</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} of {shuffledQuestions.length}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    ((currentQuestionIndex + 1) / shuffledQuestions.length) *
                    100
                  }%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Question */}
        <View style={styles.questionContainer}>
          <View style={styles.questionHeader}>
            <Text style={styles.questionType}>
              {currentQuestion.type
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())}
            </Text>
            <Text style={styles.difficulty}>
              {currentQuestion.difficulty.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>

          {renderQuestionContent(currentQuestion)}
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={submitAnswer}>
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
        <Text style={styles.helperText}>Fill in the blanks:</Text>
        {question.blanks.map((_, index) => (
          <View key={index} style={styles.blankContainer}>
            <Text style={styles.blankLabel}>Blank {index + 1}:</Text>
            <TextInput
              style={styles.blankInput}
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
      <Text style={styles.helperText}>Complete the missing code:</Text>
      <View style={styles.codeContainer}>
        <Text style={styles.codeText}>{question.codeTemplate}</Text>
      </View>
      <TextInput
        style={styles.codeInput}
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
        <Text style={styles.helperText}>
          Drag and arrange the code blocks in the correct order:
        </Text>

        {/* Ordered blocks */}
        <View style={styles.orderedBlocksContainer}>
          <Text style={styles.sectionTitle}>Your Order:</Text>
          {userOrder.map((blockId, index) => {
            const block = question.codeBlocks.find((b) => b.id === blockId);
            return (
              <View key={index} style={styles.orderedBlock}>
                <Text style={styles.codeBlockText}>
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
                    size={20}
                    color={COLORS.error}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Available blocks */}
        <View style={styles.availableBlocksContainer}>
          <Text style={styles.sectionTitle}>Available Blocks:</Text>
          {availableBlocks.map((block) => (
            <TouchableOpacity
              key={block.id}
              style={styles.availableBlock}
              onPress={() => {
                const newOrder = [...userOrder, block.id];
                setAnswers({ ...answers, codeOrder: newOrder });
              }}
            >
              <Text style={styles.codeBlockText}>{block.code}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderResultsScreen = () => (
    <View style={styles.content}>
      <View style={styles.resultsContainer}>
        <Ionicons name="trophy" size={64} color={COLORS.primary} />
        <Text style={styles.resultsTitle}>Game Complete!</Text>
        <Text style={styles.finalScore}>Final Score: {score}</Text>
        <Text style={styles.resultsDetails}>
          Questions Answered: {currentQuestionIndex + 1}
        </Text>
        <Text style={styles.resultsDetails}>
          Accuracy:{" "}
          {Math.round((score / (10 * (currentQuestionIndex + 1))) * 100)}%
        </Text>

        <View style={styles.resultsButtons}>
          <TouchableOpacity style={styles.playAgainButton} onPress={startGame}>
            <Text style={styles.playAgainButtonText}>PLAY AGAIN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backToMenuButton}
            onPress={() => setGameState("menu")}
          >
            <Text style={styles.backToMenuButtonText}>BACK TO MENU</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Quick Play</Text>
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
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 30,
    textAlign: "left",
  },
  gameInfo: {
    backgroundColor: COLORS.cardBackground,
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },
  textSection: {
    flex: 1,
    paddingRight: 20,
  },
  imageSection: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 8,
    lineHeight: 20,
  },
  playButton: {
    backgroundColor: "#d0ea4a",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  playButtonText: {
    color: "#03894d",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Image inside gameInfo
  imageContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  menuImage: {
    width: Platform.OS === "web" ? 200 : 160,
    height: Platform.OS === "web" ? 200 : 160,
  },

  // Game Screen Styles
  gameContent: {
    flex: 1,
    paddingHorizontal: 20,
    alignSelf: Platform.OS === "web" ? "center" : undefined,
    width: Platform.OS === "web" ? 800 : "100%",
    maxWidth: "100%",
  },

  gameHUD: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: COLORS.cardBackground,
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2acde6",
  },
  hudItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  hudText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "bold",
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 4,
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
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2acde6",
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
    fontSize: 16,
    color: COLORS.textPrimary,
    lineHeight: 24,
    marginBottom: 20,
  },

  // Multiple Choice Styles
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: "#92eacc",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2acde6",
  },
  selectedOption: {
    backgroundColor: "#4a7c59",
    borderColor: "#2acde6",
  },
  optionText: {
    fontSize: 14,
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
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    marginBottom: 10,
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
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "bold",
    marginBottom: 10,
  },
  orderedBlocksContainer: {
    gap: 10,
  },
  orderedBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
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
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 30,
    marginTop: 10,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Results Screen Styles
  resultsContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  },
  finalScore: {
    fontSize: 24,
    color: COLORS.textPrimary,
    fontWeight: "bold",
    marginBottom: 20,
  },
  resultsDetails: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  resultsButtons: {
    width: "100%",
    gap: 15,
    marginTop: 30,
    maxWidth: Platform.OS === "web" ? 500 : "100%",
    alignSelf: "center",
     },
  playAgainButton: {
    backgroundColor: "#45db8b",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
  },
  playAgainButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  backToMenuButton: {
    backgroundColor: "#45db8b",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2acde6",
  },
  backToMenuButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
