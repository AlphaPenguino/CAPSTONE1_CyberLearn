import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";

export default function InstructorGames() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [newGame, setNewGame] = useState({
    title: "",
    description: "",
    gameType: "trivia",
    timeLimit: 30,
    difficulty: "medium",
    showAnswers: true,
    questions: [],
  });
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    explanation: "",
    difficulty: "medium",
    category: "",
  });

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = () => {
    // Load dummy data for now
    setGames([
      {
        id: 1,
        title: "Cybersecurity Fundamentals",
        description: "Basic concepts of cybersecurity for beginners",
        gameType: "trivia",
        timeLimit: 30,
        difficulty: "easy",
        showAnswers: true,
        isActive: true,
        questions: [
          {
            id: 1,
            question: "What does CIA stand for in cybersecurity?",
            options: [
              "Central Intelligence Agency",
              "Confidentiality, Integrity, Availability",
              "Computer Information Access",
              "Cyber Investigation Authority",
            ],
            correctAnswer: 1,
            explanation:
              "In cybersecurity, CIA refers to the three pillars: Confidentiality, Integrity, and Availability.",
            difficulty: "easy",
            category: "Fundamentals",
          },
          {
            id: 2,
            question: "Which of these is the strongest password?",
            options: [
              "password123",
              "P@ssw0rd!",
              "MyDog$Name2024!",
              "12345678",
            ],
            correctAnswer: 2,
            explanation:
              "A strong password should be long, contain mixed characters, and be unpredictable.",
            difficulty: "easy",
            category: "Password Security",
          },
        ],
        playCount: 45,
        avgScore: 78,
        created: "2024-01-15",
      },
      {
        id: 2,
        title: "Advanced Network Security",
        description:
          "Deep dive into network security protocols and best practices",
        gameType: "challenge",
        timeLimit: 45,
        difficulty: "hard",
        showAnswers: true,
        isActive: true,
        questions: [
          {
            id: 1,
            question:
              "Which protocol provides secure communication over a computer network?",
            options: ["HTTP", "HTTPS", "FTP", "SMTP"],
            correctAnswer: 1,
            explanation:
              "HTTPS (HTTP Secure) provides encrypted communication between client and server.",
            difficulty: "medium",
            category: "Network Security",
          },
        ],
        playCount: 23,
        avgScore: 65,
        created: "2024-01-20",
      },
    ]);
  };

  const handleCreateGame = () => {
    setEditingGame(null);
    setNewGame({
      title: "",
      description: "",
      gameType: "trivia",
      timeLimit: 30,
      difficulty: "medium",
      showAnswers: true,
      questions: [],
    });
    setModalVisible(true);
  };

  const handleEditGame = (game) => {
    setEditingGame(game);
    setNewGame({
      title: game.title,
      description: game.description,
      gameType: game.gameType,
      timeLimit: game.timeLimit,
      difficulty: game.difficulty,
      showAnswers: game.showAnswers,
      questions: game.questions || [],
    });
    setModalVisible(true);
  };

  const handleSaveGame = () => {
    if (!newGame.title.trim()) {
      Alert.alert("Error", "Please enter a game title");
      return;
    }

    if (editingGame) {
      setGames((prev) =>
        prev.map((game) =>
          game.id === editingGame.id
            ? { ...game, ...newGame, id: editingGame.id }
            : game
        )
      );
      Alert.alert("Success", "Game updated successfully!");
    } else {
      const newId = Math.max(...games.map((g) => g.id), 0) + 1;
      setGames((prev) => [
        ...prev,
        {
          ...newGame,
          id: newId,
          playCount: 0,
          avgScore: 0,
          created: new Date().toISOString().split("T")[0],
          isActive: true,
        },
      ]);
      Alert.alert("Success", "Game created successfully!");
    }

    setModalVisible(false);
  };

  const handleViewQuestions = (game) => {
    setSelectedGame(game);
    setQuestionModalVisible(true);
  };

  const handleAddQuestion = () => {
    if (!newQuestion.question.trim()) {
      Alert.alert("Error", "Please enter a question");
      return;
    }

    if (newQuestion.options.some((opt) => !opt.trim())) {
      Alert.alert("Error", "Please fill all answer options");
      return;
    }

    const questionId = selectedGame.questions.length + 1;
    const updatedQuestions = [
      ...selectedGame.questions,
      { ...newQuestion, id: questionId },
    ];

    setGames((prev) =>
      prev.map((game) =>
        game.id === selectedGame.id
          ? { ...game, questions: updatedQuestions }
          : game
      )
    );

    setSelectedGame((prev) => ({ ...prev, questions: updatedQuestions }));
    setNewQuestion({
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: "",
      difficulty: "medium",
      category: "",
    });

    Alert.alert("Success", "Question added successfully!");
  };

  const handleDeleteQuestion = (questionId) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this question?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedQuestions = selectedGame.questions.filter(
              (q) => q.id !== questionId
            );
            setGames((prev) =>
              prev.map((game) =>
                game.id === selectedGame.id
                  ? { ...game, questions: updatedQuestions }
                  : game
              )
            );
            setSelectedGame((prev) => ({
              ...prev,
              questions: updatedQuestions,
            }));
          },
        },
      ]
    );
  };

  const toggleGameStatus = (game) => {
    setGames((prev) =>
      prev.map((g) => (g.id === game.id ? { ...g, isActive: !g.isActive } : g))
    );
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
        return colors.textSecondary;
    }
  };

  const getGameTypeIcon = (type) => {
    switch (type) {
      case "trivia":
        return "help-circle";
      case "challenge":
        return "lightning-bolt";
      case "quiz":
        return "clipboard-text";
      default:
        return "gamepad-variant";
    }
  };

  // Check if user is instructor or admin
  if (user?.privilege !== "instructor" && user?.privilege !== "admin") {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={[
            styles.unauthorizedContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <MaterialCommunityIcons
            name="lock"
            size={64}
            color={colors.textSecondary}
          />
          <Text
            style={[styles.unauthorizedText, { color: colors.textSecondary }]}
          >
            This feature is only available for instructors
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Game Management
        </Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={handleCreateGame}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {games.map((game) => (
          <View
            key={game.id}
            style={[styles.gameCard, { backgroundColor: colors.card }]}
          >
            <View style={styles.gameHeader}>
              <View style={styles.gameIcon}>
                <MaterialCommunityIcons
                  name={getGameTypeIcon(game.gameType)}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.gameInfo}>
                <Text style={[styles.gameTitle, { color: colors.text }]}>
                  {game.title}
                </Text>
                <Text
                  style={[
                    styles.gameDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {game.description}
                </Text>
                <View style={styles.gameMeta}>
                  <Text
                    style={[
                      styles.difficultyTag,
                      { color: getDifficultyColor(game.difficulty) },
                    ]}
                  >
                    {game.difficulty.toUpperCase()}
                  </Text>
                  <Text style={styles.metaText}>
                    • {game.questions?.length || 0} questions
                  </Text>
                  <Text
                    style={[styles.metaText, { color: colors.textSecondary }]}
                  >
                    • {game.playCount} plays
                  </Text>
                </View>
              </View>
              <Switch
                value={game.isActive}
                onValueChange={() => toggleGameStatus(game)}
                trackColor={{ false: "#767577", true: colors.primary }}
              />
            </View>

            <View style={styles.gameActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleViewQuestions(game)}
              >
                <MaterialCommunityIcons
                  name="view-list"
                  size={16}
                  color={colors.primary}
                />
                <Text
                  style={[styles.actionButtonText, { color: colors.primary }]}
                >
                  Questions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleEditGame(game)}
              >
                <MaterialCommunityIcons
                  name="pencil"
                  size={16}
                  color={colors.primary}
                />
                <Text
                  style={[styles.actionButtonText, { color: colors.primary }]}
                >
                  Edit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Alert.alert(
                    "Preview Game",
                    `This would show a preview of "${game.title}" game`
                  );
                }}
              >
                <MaterialCommunityIcons name="play" size={16} color="#4CAF50" />
                <Text style={[styles.actionButtonText, { color: "#4CAF50" }]}>
                  Preview
                </Text>
              </TouchableOpacity>
            </View>

            {game.showAnswers && (
              <View style={styles.answersIndicator}>
                <MaterialCommunityIcons name="eye" size={14} color="#4CAF50" />
                <Text style={styles.answersText}>
                  Answers shown to students
                </Text>
              </View>
            )}
          </View>
        ))}

        {games.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="gamepad-variant-outline"
              size={64}
              color={colors.textSecondary}
            />
            <Text
              style={[styles.emptyStateText, { color: colors.textSecondary }]}
            >
              No games created yet
            </Text>
            <Text
              style={[
                styles.emptyStateSubtext,
                { color: colors.textSecondary },
              ]}
            >
              Create your first game to get started
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Game Creation/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingGame ? "Edit Game" : "Create New Game"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Game Title
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  value={newGame.title}
                  onChangeText={(text) =>
                    setNewGame((prev) => ({ ...prev, title: text }))
                  }
                  placeholder="Enter game title"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Description
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.textArea,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  value={newGame.description}
                  onChangeText={(text) =>
                    setNewGame((prev) => ({ ...prev, description: text }))
                  }
                  placeholder="Enter game description"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Game Type
                </Text>
                <View style={styles.buttonGroup}>
                  {["trivia", "challenge", "quiz"].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        newGame.gameType === type && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() =>
                        setNewGame((prev) => ({ ...prev, gameType: type }))
                      }
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          { color: colors.textSecondary },
                          newGame.gameType === type && {
                            color: "#FFFFFF",
                          },
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Difficulty
                </Text>
                <View style={styles.buttonGroup}>
                  {["easy", "medium", "hard"].map((diff) => (
                    <TouchableOpacity
                      key={diff}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        newGame.difficulty === diff && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() =>
                        setNewGame((prev) => ({ ...prev, difficulty: diff }))
                      }
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          { color: colors.textSecondary },
                          newGame.difficulty === diff && {
                            color: "#FFFFFF",
                          },
                        ]}
                      >
                        {diff.charAt(0).toUpperCase() + diff.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Time Limit (seconds)
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  value={newGame.timeLimit.toString()}
                  onChangeText={(text) =>
                    setNewGame((prev) => ({
                      ...prev,
                      timeLimit: parseInt(text) || 30,
                    }))
                  }
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.switchGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Show Answers to Students
                </Text>
                <Switch
                  value={newGame.showAnswers}
                  onValueChange={(value) =>
                    setNewGame((prev) => ({ ...prev, showAnswers: value }))
                  }
                  trackColor={{ false: "#767577", true: colors.primary }}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveGame}
              >
                <Text style={styles.saveButtonText}>
                  {editingGame ? "Update" : "Create"} Game
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Questions Management Modal */}
      <Modal visible={questionModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { maxHeight: "90%", backgroundColor: colors.card },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Questions - {selectedGame?.title}
              </Text>
              <TouchableOpacity onPress={() => setQuestionModalVisible(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.questionsContainer}>
              {/* Existing Questions */}
              {selectedGame?.questions?.map((question, index) => (
                <View
                  key={question.id}
                  style={[
                    styles.questionCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View style={styles.questionHeader}>
                    <Text
                      style={[styles.questionNumber, { color: colors.primary }]}
                    >
                      Q{index + 1}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteQuestion(question.id)}
                    >
                      <MaterialCommunityIcons
                        name="delete"
                        size={20}
                        color="#FF4444"
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.questionText, { color: colors.text }]}>
                    {question.question}
                  </Text>
                  {question.options.map((option, optIndex) => (
                    <View key={optIndex} style={styles.optionRow}>
                      <MaterialCommunityIcons
                        name={
                          optIndex === question.correctAnswer
                            ? "check-circle"
                            : "circle-outline"
                        }
                        size={16}
                        color={
                          optIndex === question.correctAnswer
                            ? "#4CAF50"
                            : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.optionText,
                          { color: colors.textSecondary },
                          optIndex === question.correctAnswer &&
                            styles.correctOption,
                        ]}
                      >
                        {option}
                      </Text>
                    </View>
                  ))}
                  {question.explanation && (
                    <View style={styles.explanationContainer}>
                      <Text style={styles.explanationLabel}>Explanation:</Text>
                      <Text style={styles.explanationText}>
                        {question.explanation}
                      </Text>
                    </View>
                  )}
                </View>
              ))}

              {/* Add New Question Form */}
              <View
                style={[
                  styles.addQuestionCard,
                  { borderColor: colors.primary, backgroundColor: colors.card },
                ]}
              >
                <Text
                  style={[styles.addQuestionTitle, { color: colors.primary }]}
                >
                  Add New Question
                </Text>

                <TextInput
                  style={[
                    styles.textInput,
                    styles.textArea,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  value={newQuestion.question}
                  onChangeText={(text) =>
                    setNewQuestion((prev) => ({ ...prev, question: text }))
                  }
                  placeholder="Enter your question"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />

                {newQuestion.options.map((option, index) => (
                  <View key={index} style={styles.optionInputRow}>
                    <TouchableOpacity
                      style={[
                        styles.correctIndicator,
                        newQuestion.correctAnswer === index &&
                          styles.correctIndicatorSelected,
                      ]}
                      onPress={() =>
                        setNewQuestion((prev) => ({
                          ...prev,
                          correctAnswer: index,
                        }))
                      }
                    >
                      <MaterialCommunityIcons
                        name={
                          newQuestion.correctAnswer === index ? "check" : "plus"
                        }
                        size={16}
                        color={
                          newQuestion.correctAnswer === index
                            ? "#FFFFFF"
                            : colors.textSecondary
                        }
                      />
                    </TouchableOpacity>
                    <TextInput
                      style={[
                        styles.textInput,
                        styles.optionInput,
                        {
                          color: colors.text,
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                        },
                      ]}
                      value={option}
                      onChangeText={(text) => {
                        const newOptions = [...newQuestion.options];
                        newOptions[index] = text;
                        setNewQuestion((prev) => ({
                          ...prev,
                          options: newOptions,
                        }));
                      }}
                      placeholder={`Option ${index + 1}`}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                ))}

                <TextInput
                  style={[
                    styles.textInput,
                    styles.textArea,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  value={newQuestion.explanation}
                  onChangeText={(text) =>
                    setNewQuestion((prev) => ({ ...prev, explanation: text }))
                  }
                  placeholder="Explanation (optional)"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />

                <TouchableOpacity
                  style={[
                    styles.addQuestionButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleAddQuestion}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.addQuestionButtonText}>Add Question</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E5E9",
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
    marginRight: 40,
  },
  createButton: {
    padding: 12,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  gameCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gameHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  gameIcon: {
    marginRight: 12,
    marginTop: 4,
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  gameMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  difficultyTag: {
    fontSize: 12,
    fontWeight: "bold",
    marginRight: 8,
  },
  metaText: {
    fontSize: 12,
    marginRight: 8,
  },
  gameActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "500",
  },
  answersIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    padding: 8,
    backgroundColor: "#E8F5E8",
    borderRadius: 6,
  },
  answersText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#388E3C",
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 500,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E5E9",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  buttonGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  optionButtonSelected: {
    // Dynamic styles applied inline
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  optionButtonTextSelected: {
    color: "#FFFFFF",
  },
  switchGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E1E5E9",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    marginLeft: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  questionsContainer: {
    padding: 20,
  },
  questionCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: "bold",
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    lineHeight: 22,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  correctOption: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  explanationContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#E3F2FD",
    borderRadius: 6,
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1976D2",
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 14,
    color: "#1976D2",
    lineHeight: 18,
  },
  addQuestionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  addQuestionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
  },
  optionInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  correctIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  correctIndicatorSelected: {
    backgroundColor: "#4CAF50",
  },
  optionInput: {
    flex: 1,
    marginBottom: 0,
  },
  addQuestionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  addQuestionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 8,
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  unauthorizedText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
  },
});
