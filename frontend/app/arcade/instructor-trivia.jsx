import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
} from "react-native";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import COLORS from "@/constants/custom-colors";
import { useAuthStore } from "@/store/authStore";

const instructorTriviaQuestions = [
  {
    id: 1,
    question: "What does 'CIA' stand for in cybersecurity?",
    options: [
      "Central Intelligence Agency",
      "Confidentiality, Integrity, Availability",
      "Computer Information Access",
      "Cyber Investigation Authority",
    ],
    correct: 1,
    explanation:
      "In cybersecurity, CIA refers to the three pillars: Confidentiality, Integrity, and Availability. This is a fundamental concept that every cybersecurity professional should understand.",
    difficulty: "easy",
    category: "Fundamentals",
  },
  {
    id: 2,
    question: "Which encryption algorithm is considered quantum-resistant?",
    options: ["RSA", "AES", "Lattice-based cryptography", "DES"],
    correct: 2,
    explanation:
      "Lattice-based cryptography is considered one of the quantum-resistant encryption methods because it relies on mathematical problems that are believed to be hard even for quantum computers.",
    difficulty: "hard",
    category: "Cryptography",
  },
  {
    id: 3,
    question:
      "What is the most common type of cyber attack targeting individuals?",
    options: ["DDoS attacks", "Phishing", "SQL injection", "Buffer overflow"],
    correct: 1,
    explanation:
      "Phishing is the most common cyber attack targeting individuals, where attackers try to trick people into revealing sensitive information through deceptive emails or websites.",
    difficulty: "medium",
    category: "Social Engineering",
  },
  {
    id: 4,
    question: "What does HTTPS stand for?",
    options: [
      "HyperText Transfer Protocol Secure",
      "High Transfer Protocol System",
      "HyperText Transport Protection Service",
      "HyperText Transmission Protocol Security",
    ],
    correct: 0,
    explanation:
      "HTTPS stands for HyperText Transfer Protocol Secure. It's the secure version of HTTP that encrypts data between your browser and the website.",
    difficulty: "easy",
    category: "Web Security",
  },
  {
    id: 5,
    question: "Which of these is NOT a strong password characteristic?",
    options: [
      "Contains uppercase and lowercase letters",
      "Uses personal information like birthdate",
      "Includes special characters",
      "Is at least 12 characters long",
    ],
    correct: 1,
    explanation:
      "Using personal information like birthdates makes passwords weak because this information can often be found on social media or through social engineering.",
    difficulty: "easy",
    category: "Password Security",
  },
];

export default function InstructorTriviaGame() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameState, setGameState] = useState("playing"); // playing, answered, finished
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [isInstructorMode, setIsInstructorMode] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const isInstructor =
    user?.privilege === "instructor" || user?.privilege === "admin";

  useEffect(() => {
    if (isInstructor) {
      setIsInstructorMode(true);
    }
  }, [isInstructor]);

  useEffect(() => {
    let timer;
    if (gameState === "playing" && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === "playing") {
      handleTimeout();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, gameState, handleTimeout]);

  useEffect(() => {
    const progress = (currentQuestion + 1) / instructorTriviaQuestions.length;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentQuestion, progressAnim]);

  const handleTimeout = useCallback(() => {
    setGameState("answered");
    setAnswers([
      ...answers,
      {
        questionId: instructorTriviaQuestions[currentQuestion].id,
        answer: null,
        isCorrect: false,
      },
    ]);

    if (isInstructorMode) {
      setShowExplanation(true);
    }
  }, [answers, currentQuestion, isInstructorMode]);

  const handleAnswerSelect = (answerIndex) => {
    if (gameState !== "playing") return;

    setSelectedAnswer(answerIndex);
    setGameState("answered");

    const isCorrect =
      answerIndex === instructorTriviaQuestions[currentQuestion].correct;
    if (isCorrect) {
      setScore(score + 1);
    }

    setAnswers([
      ...answers,
      {
        questionId: instructorTriviaQuestions[currentQuestion].id,
        answer: answerIndex,
        isCorrect,
      },
    ]);

    if (isInstructorMode) {
      setShowExplanation(true);
    }

    Animated.timing(fadeAnim, {
      toValue: 0.7,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleNextQuestion = () => {
    setShowExplanation(false);
    if (currentQuestion < instructorTriviaQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setTimeLeft(30);
      setGameState("playing");

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      setGameState("finished");
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setTimeLeft(30);
    setGameState("playing");
    setShowExplanation(false);
    setAnswers([]);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const getOptionStyle = (index) => {
    if (gameState !== "answered") return styles.option;

    const correctAnswer = instructorTriviaQuestions[currentQuestion].correct;

    if (isInstructorMode) {
      // Show correct answer in green and selected wrong answer in red
      if (index === correctAnswer) {
        return [styles.option, styles.correctOption];
      } else if (index === selectedAnswer && selectedAnswer !== correctAnswer) {
        return [styles.option, styles.wrongOption];
      }
    } else {
      // Standard behavior for students
      if (index === selectedAnswer) {
        return [
          styles.option,
          index === correctAnswer ? styles.correctOption : styles.wrongOption,
        ];
      }
    }

    return [styles.option, styles.disabledOption];
  };

  const getOptionIcon = (index) => {
    if (gameState !== "answered") return null;

    const correctAnswer = instructorTriviaQuestions[currentQuestion].correct;

    if (isInstructorMode) {
      if (index === correctAnswer) {
        return (
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color="#FFFFFF"
          />
        );
      } else if (index === selectedAnswer && selectedAnswer !== correctAnswer) {
        return (
          <MaterialCommunityIcons
            name="close-circle"
            size={20}
            color="#FFFFFF"
          />
        );
      }
    } else {
      if (index === selectedAnswer) {
        return (
          <MaterialCommunityIcons
            name={index === correctAnswer ? "check-circle" : "close-circle"}
            size={20}
            color="#FFFFFF"
          />
        );
      }
    }

    return null;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return "#4CAF50";
      case "medium":
        return "#FF9800";
      case "hard":
        return "#F44336";
      default:
        return COLORS.textSecondary;
    }
  };

  const getScoreMessage = () => {
    const percentage = (score / instructorTriviaQuestions.length) * 100;
    if (percentage >= 80) return "Excellent! You're a cybersecurity expert! 🏆";
    if (percentage >= 60) return "Good job! Keep learning! 👍";
    if (percentage >= 40)
      return "Not bad, but there's room for improvement! 📚";
    return "Keep studying! Cybersecurity is important! 💪";
  };

  if (gameState === "finished") {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#1a1a2e", "#16213e"]} style={styles.gradient}>
          <View style={styles.resultContainer}>
            <View style={styles.resultHeader}>
              <MaterialCommunityIcons name="trophy" size={64} color="#FFD700" />
              <Text style={styles.resultTitle}>Game Complete!</Text>
              {isInstructorMode && (
                <View style={styles.instructorBadge}>
                  <MaterialCommunityIcons
                    name="school"
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.instructorBadgeText}>
                    Instructor Mode
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.scoreContainer}>
              <Text style={styles.finalScore}>
                {score}/{instructorTriviaQuestions.length}
              </Text>
              <Text style={styles.scorePercentage}>
                {Math.round((score / instructorTriviaQuestions.length) * 100)}%
              </Text>
              <Text style={styles.scoreMessage}>{getScoreMessage()}</Text>
            </View>

            {isInstructorMode && (
              <View style={styles.instructorSummary}>
                <Text style={styles.summaryTitle}>Question Summary</Text>
                <ScrollView style={styles.summaryList}>
                  {instructorTriviaQuestions.map((question, index) => {
                    const userAnswer = answers[index];
                    return (
                      <View key={question.id} style={styles.summaryItem}>
                        <View style={styles.summaryHeader}>
                          <Text style={styles.summaryQuestionNumber}>
                            Q{index + 1}
                          </Text>
                          <MaterialCommunityIcons
                            name={
                              userAnswer?.isCorrect
                                ? "check-circle"
                                : "close-circle"
                            }
                            size={20}
                            color={
                              userAnswer?.isCorrect ? "#4CAF50" : "#F44336"
                            }
                          />
                        </View>
                        <Text style={styles.summaryQuestion} numberOfLines={2}>
                          {question.question}
                        </Text>
                        <Text
                          style={[
                            styles.summaryCategory,
                            { color: getDifficultyColor(question.difficulty) },
                          ]}
                        >
                          {question.category} • {question.difficulty}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.restartButton}
                onPress={handleRestart}
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.restartButtonText}>Play Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.homeButton}
                onPress={() => router.back()}
              >
                <MaterialCommunityIcons
                  name="home"
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.homeButtonText}>Back to Menu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const currentQ = instructorTriviaQuestions[currentQuestion];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Cybersecurity Trivia</Text>
            {isInstructorMode && (
              <View style={styles.instructorIndicator}>
                <MaterialCommunityIcons
                  name="school"
                  size={14}
                  color="#FFD700"
                />
                <Text style={styles.instructorText}>Instructor Mode</Text>
              </View>
            )}
          </View>

          <View style={styles.scoreDisplay}>
            <Text style={styles.scoreText}>
              {score}/{instructorTriviaQuestions.length}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            Question {currentQuestion + 1} of {instructorTriviaQuestions.length}
          </Text>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <MaterialCommunityIcons name="timer" size={20} color="#FFFFFF" />
          <Text
            style={[styles.timerText, timeLeft <= 10 && styles.timerWarning]}
          >
            {timeLeft}s
          </Text>
        </View>

        {/* Question Card */}
        <Animated.View style={[styles.questionCard, { opacity: fadeAnim }]}>
          <View style={styles.questionHeader}>
            <View style={styles.questionMeta}>
              <Text
                style={[
                  styles.categoryTag,
                  { color: getDifficultyColor(currentQ.difficulty) },
                ]}
              >
                {currentQ.category}
              </Text>
              <Text
                style={[
                  styles.difficultyTag,
                  { color: getDifficultyColor(currentQ.difficulty) },
                ]}
              >
                {currentQ.difficulty.toUpperCase()}
              </Text>
            </View>
            {isInstructorMode && gameState === "answered" && (
              <View style={styles.answerIndicator}>
                <MaterialCommunityIcons name="eye" size={16} color="#4CAF50" />
                <Text style={styles.answerIndicatorText}>Answer Revealed</Text>
              </View>
            )}
          </View>

          <Text style={styles.questionText}>{currentQ.question}</Text>

          <View style={styles.optionsContainer}>
            {currentQ.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={getOptionStyle(index)}
                onPress={() => handleAnswerSelect(index)}
                disabled={gameState !== "playing"}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionText}>{option}</Text>
                  {getOptionIcon(index)}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Instructor Mode: Show Explanation */}
          {isInstructorMode && showExplanation && (
            <View style={styles.explanationContainer}>
              <View style={styles.explanationHeader}>
                <MaterialCommunityIcons
                  name="lightbulb"
                  size={20}
                  color="#FFD700"
                />
                <Text style={styles.explanationTitle}>Explanation</Text>
              </View>
              <Text style={styles.explanationText}>{currentQ.explanation}</Text>

              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNextQuestion}
              >
                <Text style={styles.nextButtonText}>
                  {currentQuestion < instructorTriviaQuestions.length - 1
                    ? "Next Question"
                    : "View Results"}
                </Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Student Mode: Show Next Button after answer */}
          {!isInstructorMode && gameState === "answered" && (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNextQuestion}
            >
              <Text style={styles.nextButtonText}>
                {currentQuestion < instructorTriviaQuestions.length - 1
                  ? "Next Question"
                  : "View Results"}
              </Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Instructor Mode Toggle */}
        {isInstructor && (
          <View style={styles.instructorControls}>
            <TouchableOpacity
              style={[
                styles.modeToggle,
                isInstructorMode && styles.modeToggleActive,
              ]}
              onPress={() => {
                setIsInstructorMode(!isInstructorMode);
                Alert.alert(
                  "Mode Changed",
                  !isInstructorMode
                    ? "Instructor mode enabled. Answers and explanations will be shown."
                    : "Student mode enabled. Standard game experience."
                );
              }}
            >
              <MaterialCommunityIcons
                name={isInstructorMode ? "school" : "account-student"}
                size={16}
                color={isInstructorMode ? "#FFD700" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.modeToggleText,
                  isInstructorMode && styles.modeToggleTextActive,
                ]}
              >
                {isInstructorMode ? "Instructor" : "Student"} Mode
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  instructorIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  instructorText: {
    fontSize: 12,
    color: "#FFD700",
    marginLeft: 4,
    fontWeight: "600",
  },
  scoreDisplay: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#00E676",
  },
  progressText: {
    color: "#FFFFFF",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    opacity: 0.8,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  timerText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  timerWarning: {
    color: "#FF5722",
  },
  questionCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  questionMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryTag: {
    fontSize: 12,
    fontWeight: "bold",
    marginRight: 12,
  },
  difficultyTag: {
    fontSize: 12,
    fontWeight: "bold",
  },
  answerIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  answerIndicatorText: {
    fontSize: 10,
    color: "#4CAF50",
    marginLeft: 4,
    fontWeight: "600",
  },
  questionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 24,
    lineHeight: 26,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e9ecef",
  },
  correctOption: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  wrongOption: {
    backgroundColor: "#F44336",
    borderColor: "#F44336",
  },
  disabledOption: {
    opacity: 0.6,
  },
  optionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionText: {
    fontSize: 16,
    color: "#1a1a2e",
    flex: 1,
    fontWeight: "500",
  },
  explanationContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FFD700",
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E65100",
    marginLeft: 8,
  },
  explanationText: {
    fontSize: 14,
    color: "#E65100",
    lineHeight: 20,
    marginBottom: 12,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  instructorControls: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modeToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  modeToggleActive: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderColor: "#FFD700",
  },
  modeToggleText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  modeToggleTextActive: {
    color: "#FFD700",
  },
  resultContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  resultHeader: {
    alignItems: "center",
    marginBottom: 30,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 16,
  },
  instructorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  instructorBadgeText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  scoreContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  finalScore: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#00E676",
  },
  scorePercentage: {
    fontSize: 24,
    color: "#FFFFFF",
    opacity: 0.8,
  },
  scoreMessage: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 12,
    opacity: 0.9,
  },
  instructorSummary: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    maxHeight: 200,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  summaryList: {
    flex: 1,
  },
  summaryItem: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  summaryQuestionNumber: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFD700",
  },
  summaryQuestion: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 4,
  },
  summaryCategory: {
    fontSize: 10,
    fontWeight: "600",
  },
  resultActions: {
    flexDirection: "row",
    gap: 12,
  },
  restartButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  restartButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  homeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  homeButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
