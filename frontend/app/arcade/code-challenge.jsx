import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  Animated,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import COLORS from "@/constants/custom-colors";

const { width } = Dimensions.get("window");

const codeSnippets = [
  {
    id: 1,
    title: "Missing Semicolon",
    code: "let password = 'secretPassword123'⬜\nconsole.log(password);",
    options: [";", ",", ":", "'"],
    correct: 0,
    explanation:
      "JavaScript statements should end with a semicolon (;) for best practices and to avoid automatic semicolon insertion issues.",
  },
  {
    id: 2,
    title: "Incorrect Function Declaration",
    code: "⬜ validatePassword(password) {\n  return password.length >= 8;\n}",
    options: ["function", "var", "let", "const"],
    correct: 0,
    explanation:
      "Functions in JavaScript are declared using the 'function' keyword followed by the function name and parameters.",
  },
  {
    id: 3,
    title: "Missing Closing Bracket",
    code: "if (user.isAuthenticated) {\n  console.log('Access granted');\n⬜",
    options: ["}", ")", "]", ";"],
    correct: 0,
    explanation:
      "Every opening curly brace { must have a corresponding closing curly brace } to properly close code blocks.",
  },
  {
    id: 4,
    title: "Wrong Comparison Operator",
    code: "if (password.length ⬜ 8) {\n  alert('Password too short');\n}",
    options: ["<", "=", "==", "=>"],
    correct: 0,
    explanation:
      "To check if a value is less than another, use the < operator. The = operator is for assignment, not comparison.",
  },
  {
    id: 5,
    title: "Missing Array Declaration",
    code: "⬜ users = ['admin', 'user1', 'guest'];\nconsole.log(users[0]);",
    options: ["let", "function", "if", "for"],
    correct: 0,
    explanation:
      "Variables in JavaScript should be declared with 'let', 'const', or 'var' before being assigned a value.",
  },
  {
    id: 6,
    title: "Incorrect String Concatenation",
    code: "let message = 'Hello ' ⬜ username;\nconsole.log(message);",
    options: ["+", "&", "*", "|"],
    correct: 0,
    explanation:
      "In JavaScript, strings are concatenated using the + operator to join two or more strings together.",
  },
  {
    id: 7,
    title: "Missing Return Statement",
    code: "function encrypt(data) {\n  let encrypted = data.split('').reverse().join('');\n  ⬜ encrypted;\n}",
    options: ["return", "print", "echo", "output"],
    correct: 0,
    explanation:
      "Functions use the 'return' keyword to send a value back to the caller. Without it, the function returns undefined.",
  },
  {
    id: 8,
    title: "Wrong Loop Syntax",
    code: "⬜ (let i = 0; i < 10; i++) {\n  console.log(i);\n}",
    options: ["for", "while", "if", "switch"],
    correct: 0,
    explanation:
      "This is a for loop syntax, which requires the 'for' keyword followed by initialization, condition, and increment in parentheses.",
  },
];

const CodeChallenge = () => {
  const router = useRouter();

  // Game state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [comboMultiplier, setComboMultiplier] = useState(1.0);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  // Animations
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Timer effect
  useEffect(() => {
    let timer;
    if (gameStarted && !gameOver && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameStarted, gameOver, timeLeft]);

  // Initialize shuffled options when question changes
  useEffect(() => {
    if (currentQuestion < codeSnippets.length) {
      const options = [...codeSnippets[currentQuestion].options];
      setShuffledOptions(shuffleArray(options));
    }
  }, [currentQuestion]);

  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const startGame = () => {
    setGameStarted(true);
    setCurrentQuestion(0);
    setScore(0);
    setLives(3);
    setTimeLeft(60);
    setGameOver(false);
    setComboMultiplier(1.0);
    setCorrectStreak(0);
  };

  const handleAnswerSelect = (selectedOption) => {
    if (selectedAnswer !== null) return; // Prevent multiple selections

    setSelectedAnswer(selectedOption);
    const currentSnippet = codeSnippets[currentQuestion];
    const correctOption = currentSnippet.options[currentSnippet.correct];
    const isCorrect = selectedOption === correctOption;

    setLastAnswerCorrect(isCorrect);

    if (isCorrect) {
      // Correct answer
      setCorrectStreak((prev) => prev + 1);
      setComboMultiplier((prev) => Math.min(prev + 0.1, 2.0));
      const basePoints = 100;
      const bonusPoints = Math.floor(basePoints * (comboMultiplier - 1));
      setScore((prev) => prev + basePoints + bonusPoints);
      setTimeLeft((prev) => prev + 5); // Time bonus

      // Pulse animation for correct answer
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Wrong answer
      setCorrectStreak(0);
      setComboMultiplier(1.0);
      setLives((prev) => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameOver(true);
        }
        return newLives;
      });
      setTimeLeft((prev) => Math.max(prev - 3, 0)); // Time penalty

      // Shake animation for wrong answer
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    setShowFeedback(true);
  };

  const nextQuestion = () => {
    setShowFeedback(false);
    setSelectedAnswer(null);

    if (currentQuestion + 1 >= codeSnippets.length) {
      // End game - completed all questions
      setGameOver(true);
    } else {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameOver(false);
    setShowFeedback(false);
    setSelectedAnswer(null);
    setCurrentQuestion(0);
    setScore(0);
    setLives(3);
    setTimeLeft(60);
    setComboMultiplier(1.0);
    setCorrectStreak(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderGameHeader = () => (
    <View style={styles.gameHeader}>
      <View style={styles.statContainer}>
        <MaterialCommunityIcons name="trophy" size={20} color="#FFD700" />
        <Text style={styles.statText}>{score}</Text>
      </View>

      <Animated.View
        style={[
          styles.statContainer,
          { transform: [{ scale: pulseAnimation }] },
        ]}
      >
        <MaterialCommunityIcons
          name="clock-outline"
          size={20}
          color={timeLeft <= 10 ? "#FF6B6B" : COLORS.primary}
        />
        <Text
          style={[
            styles.statText,
            { color: timeLeft <= 10 ? "#FF6B6B" : COLORS.textPrimary },
          ]}
        >
          {formatTime(timeLeft)}
        </Text>
      </Animated.View>

      <View style={styles.livesContainer}>
        {[...Array(3)].map((_, index) => (
          <MaterialCommunityIcons
            key={index}
            name="heart"
            size={20}
            color={index < lives ? "#FF6B6B" : "#333"}
          />
        ))}
      </View>
    </View>
  );

  const renderCodeSnippet = () => {
    const snippet = codeSnippets[currentQuestion];
    const codeLines = snippet.code.split("\n");

    return (
      <Animated.View
        style={[
          styles.codeContainer,
          { transform: [{ translateX: shakeAnimation }] },
        ]}
      >
        <Text style={styles.questionTitle}>{snippet.title}</Text>
        <View style={styles.codeBlock}>
          {codeLines.map((line, index) => (
            <View key={index} style={styles.codeLine}>
              <Text style={styles.lineNumber}>{index + 1}</Text>
              <Text style={styles.codeText}>
                {line.includes("⬜")
                  ? line.split("⬜").map((part, partIndex) => (
                      <Text key={partIndex}>
                        {part}
                        {partIndex < line.split("⬜").length - 1 && (
                          <View style={styles.placeholder}>
                            {selectedAnswer && (
                              <Text style={styles.placeholderText}>
                                {selectedAnswer}
                              </Text>
                            )}
                          </View>
                        )}
                      </Text>
                    ))
                  : line}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>
    );
  };

  const renderOptions = () => (
    <View style={styles.optionsContainer}>
      <Text style={styles.optionsTitle}>Drag the correct fix:</Text>
      <View style={styles.optionsGrid}>
        {shuffledOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              selectedAnswer === option && styles.selectedOption,
              selectedAnswer === option &&
                lastAnswerCorrect &&
                styles.correctOption,
              selectedAnswer === option &&
                !lastAnswerCorrect &&
                styles.wrongOption,
            ]}
            onPress={() => handleAnswerSelect(option)}
            disabled={selectedAnswer !== null}
          >
            <Text
              style={[
                styles.optionText,
                selectedAnswer === option && styles.selectedOptionText,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFeedback = () => {
    const snippet = codeSnippets[currentQuestion];

    return (
      <Modal visible={showFeedback} transparent animationType="fade">
        <View style={styles.feedbackOverlay}>
          <View style={styles.feedbackContainer}>
            <MaterialCommunityIcons
              name={lastAnswerCorrect ? "check-circle" : "close-circle"}
              size={60}
              color={lastAnswerCorrect ? "#4CAF50" : "#FF6B6B"}
            />
            <Text
              style={[
                styles.feedbackTitle,
                { color: lastAnswerCorrect ? "#4CAF50" : "#FF6B6B" },
              ]}
            >
              {lastAnswerCorrect ? "Correct!" : "Incorrect"}
            </Text>

            {lastAnswerCorrect && comboMultiplier > 1.0 && (
              <Text style={styles.comboText}>
                Combo x{comboMultiplier.toFixed(1)}!
              </Text>
            )}

            <Text style={styles.explanationText}>{snippet.explanation}</Text>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={nextQuestion}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderGameOver = () => {
    const finalScore = score + timeLeft; // Bonus points for remaining time

    return (
      <View style={styles.gameOverContainer}>
        <MaterialCommunityIcons
          name="flag-checkered"
          size={80}
          color={COLORS.primary}
        />
        <Text style={styles.gameOverTitle}>Game Over!</Text>
        <Text style={styles.finalScoreText}>Final Score: {finalScore}</Text>
        <Text style={styles.statsText}>
          Questions: {currentQuestion + 1}/{codeSnippets.length}
        </Text>
        <Text style={styles.statsText}>Best Streak: {correctStreak}</Text>

        <View style={styles.gameOverButtons}>
          <TouchableOpacity style={styles.playAgainButton} onPress={resetGame}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resultBackButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back to Arcade</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderWelcomeScreen = () => (
    <ScrollView style={styles.welcomeContainer}>
      <View style={styles.welcomeHeader}>
        <MaterialCommunityIcons
          name="code-tags"
          size={80}
          color={COLORS.primary}
        />
        <Text style={styles.welcomeTitle}>Fix Broken Code</Text>
        <Text style={styles.welcomeSubtitle}>
          Race against time to fix code snippets!
        </Text>
      </View>

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>How to Play:</Text>

        <View style={styles.instructionItem}>
          <MaterialCommunityIcons
            name="target"
            size={24}
            color={COLORS.primary}
          />
          <Text style={styles.instructionText}>
            Fix broken code snippets by selecting the correct option
          </Text>
        </View>

        <View style={styles.instructionItem}>
          <MaterialCommunityIcons
            name="clock-fast"
            size={24}
            color={COLORS.primary}
          />
          <Text style={styles.instructionText}>
            You have 60 seconds. Correct answers add 5 seconds, wrong ones
            subtract 3
          </Text>
        </View>

        <View style={styles.instructionItem}>
          <MaterialCommunityIcons
            name="heart-multiple"
            size={24}
            color="#FF6B6B"
          />
          <Text style={styles.instructionText}>
            You have 3 lives. Lose them all and the game ends
          </Text>
        </View>

        <View style={styles.instructionItem}>
          <MaterialCommunityIcons name="trophy" size={24} color="#FFD700" />
          <Text style={styles.instructionText}>
            100 points per fix + combo multipliers for streaks
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={startGame}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.startButtonGradient}
        >
          <Text style={styles.startButtonText}>Start Challenge</Text>
          <MaterialCommunityIcons name="play" size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  if (!gameStarted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fix Broken Code</Text>
          <View style={styles.headerSpacer} />
        </View>
        {renderWelcomeScreen()}
      </SafeAreaView>
    );
  }

  if (gameOver) {
    return (
      <SafeAreaView style={styles.container}>{renderGameOver()}</SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.safeArea}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fix Broken Code</Text>
          <View style={styles.headerSpacer} />
        </View>
        {renderGameHeader()}

        <ScrollView style={styles.gameContent}>
          {renderCodeSnippet()}
          {renderOptions()}
        </ScrollView>

        {renderFeedback()}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40, // Same width as back button to center the title
  },
  welcomeContainer: {
    flex: 1,
    padding: 20,
  },
  welcomeHeader: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 20,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  instructionsContainer: {
    marginBottom: 40,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 20,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  instructionText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: 16,
    flex: 1,
  },
  startButton: {
    marginBottom: 20,
  },
  startButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginRight: 8,
  },
  gameHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBackground,
  },
  statContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statText: {
    color: COLORS.textPrimary,
    fontWeight: "bold",
    marginLeft: 6,
  },
  livesContainer: {
    flexDirection: "row",
    gap: 4,
  },
  gameContent: {
    flex: 1,
    padding: 20,
  },
  codeContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 12,
  },
  codeBlock: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 16,
  },
  codeLine: {
    flexDirection: "row",
    marginBottom: 4,
  },
  lineNumber: {
    color: "#666",
    fontFamily: "monospace",
    minWidth: 30,
    fontSize: 14,
  },
  codeText: {
    color: "#e6e6e6",
    fontFamily: "monospace",
    fontSize: 14,
    flex: 1,
  },
  placeholder: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginHorizontal: 2,
    minWidth: 40,
    alignItems: "center",
  },
  placeholderText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  optionButton: {
    backgroundColor: COLORS.cardBackground,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
    minWidth: width * 0.2,
    alignItems: "center",
  },
  selectedOption: {
    borderColor: COLORS.primary,
  },
  correctOption: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  wrongOption: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  optionText: {
    color: COLORS.textPrimary,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  selectedOptionText: {
    color: "#FFFFFF",
  },
  feedbackOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  feedbackContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    margin: 20,
    maxWidth: width * 0.9,
  },
  feedbackTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  comboText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 16,
  },
  explanationText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  finalScoreText: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 16,
  },
  statsText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  gameOverButtons: {
    flexDirection: "row",
    gap: 16,
    marginTop: 32,
  },
  playAgainButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  playAgainText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  resultBackButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default CodeChallenge;
