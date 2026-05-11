import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  StyleSheet,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Animatable from "react-native-animatable";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import RainOfWordsApi from "@/services/rainOfWordsApi";

const AnimatedView = Animatable.createAnimatableComponent(View);
const AnimatedText = Animatable.createAnimatableComponent(Text);

export default function RainOfWordsInstructor() {
  const router = useRouter();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    question: "",
    answers: ["", "", "", ""],
    correct: "",
    category: "General",
  });

  // Load questions on mount
  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await RainOfWordsApi.getQuestions();
      setQuestions(response.data || []);
    } catch (error) {
      Alert.alert("Error", "Failed to load questions: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      question: "",
      answers: ["", "", "", ""],
      correct: "",
      category: "General",
    });
    setEditingId(null);
  };

  const handleSaveQuestion = async () => {
    // Validation
    if (!formData.question.trim()) {
      Alert.alert("Error", "Question cannot be empty");
      return;
    }

    const nonEmptyAnswers = formData.answers.filter((a) => a.trim());
    if (nonEmptyAnswers.length !== 4) {
      Alert.alert("Error", "All 4 answer options are required");
      return;
    }

    if (!formData.correct.trim()) {
      Alert.alert("Error", "Please select a correct answer");
      return;
    }

    if (!nonEmptyAnswers.includes(formData.correct)) {
      Alert.alert("Error", "Correct answer must be one of the options");
      return;
    }

    try {
      setLoading(true);

      if (editingId) {
        // Update existing question
        await RainOfWordsApi.updateQuestion(editingId, formData);
        setQuestions(
          questions.map((q) =>
            q.id === editingId
              ? { ...q, ...formData, id: editingId }
              : q
          )
        );
        Alert.alert("Success", "Question updated successfully");
      } else {
        // Create new question
        const response = await RainOfWordsApi.createQuestion(formData);
        setQuestions([...questions, response.data]);
        Alert.alert("Success", "Question created successfully");
      }

      resetForm();
      setShowAddModal(false);
    } catch (error) {
      Alert.alert("Error", "Failed to save question: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuestion = (question) => {
    setFormData({
      question: question.question,
      answers: question.answers,
      correct: question.correct,
      category: question.category || "General",
    });
    setEditingId(question.id);
    setShowAddModal(true);
  };

  const handleDeleteQuestion = (id) => {
    Alert.alert("Delete Question", "Are you sure?", [
      { text: "Cancel", onPress: () => {}, style: "cancel" },
      {
        text: "Delete",
        onPress: async () => {
          try {
            setLoading(true);
            await RainOfWordsApi.deleteQuestion(id);
            setQuestions(questions.filter((q) => q.id !== id));
            Alert.alert("Success", "Question deleted successfully");
          } catch (error) {
            Alert.alert("Error", "Failed to delete question: " + error.message);
          } finally {
            setLoading(false);
          }
        },
        style: "destructive",
      },
    ]);
  };

  const filteredQuestions = questions.filter(
    (q) =>
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answers.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderQuestion = (question) => (
    <Animatable.View key={question.id} animation="fadeInUp" style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionText} numberOfLines={2}>
          {question.question}
        </Text>
        <View style={styles.questionActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleEditQuestion(question)}
          >
            <MaterialCommunityIcons name="pencil" size={20} color="#00d4ff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleDeleteQuestion(question.id)}
          >
            <MaterialCommunityIcons name="trash-can" size={20} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.answersContainer}>
        {question.answers.map((answer, index) => (
          <View
            key={index}
            style={[
              styles.answerBadge,
              answer === question.correct && styles.answerBadgeCorrect,
            ]}
          >
            <Text
              style={[
                styles.answerText,
                answer === question.correct && styles.answerTextCorrect,
              ]}
              numberOfLines={1}
            >
              {answer === question.correct && "✓ "}
              {answer}
            </Text>
          </View>
        ))}
      </View>

      {question.category && (
        <Text style={styles.categoryBadge}>{question.category}</Text>
      )}
    </Animatable.View>
  );

  return (
    <LinearGradient colors={["#1a1a2e", "#16213e"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#00d4ff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Questions</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Stats */}
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>Total Questions: {questions.length}</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search questions..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Questions List */}
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map(renderQuestion)
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="inbox" size={48} color="#444" />
              <Text style={styles.emptyText}>No questions found</Text>
            </View>
          )}
        </ScrollView>

        {/* Add Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <LinearGradient colors={["#00d4ff", "#0099cc"]} style={styles.fabGradient}>
            <MaterialCommunityIcons name="plus" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Add/Edit Modal */}
        <Modal visible={showAddModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <SafeAreaView style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <MaterialCommunityIcons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {editingId ? "Edit Question" : "Add Question"}
                </Text>
                <View style={{ width: 28 }} />
              </View>

              <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
                {/* Question Input */}
                <Text style={styles.label}>Question</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter question text"
                  placeholderTextColor="#666"
                  value={formData.question}
                  onChangeText={(text) =>
                    setFormData({ ...formData, question: text })
                  }
                  multiline
                  numberOfLines={3}
                />

                {/* Category Input */}
                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Cybersecurity, Network"
                  placeholderTextColor="#666"
                  value={formData.category}
                  onChangeText={(text) =>
                    setFormData({ ...formData, category: text })
                  }
                />

                {/* Answers Input */}
                <Text style={styles.label}>Answer Options</Text>
                {formData.answers.map((answer, index) => (
                  <View key={index} style={styles.answerInputRow}>
                    <TextInput
                      style={styles.answerInput}
                      placeholder={`Answer ${index + 1}`}
                      placeholderTextColor="#666"
                      value={answer}
                      onChangeText={(text) => {
                        const newAnswers = [...formData.answers];
                        newAnswers[index] = text;
                        setFormData({ ...formData, answers: newAnswers });
                      }}
                    />
                    <TouchableOpacity
                      style={[
                        styles.correctButton,
                        answer === formData.correct && styles.correctButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, correct: answer })}
                    >
                      <MaterialCommunityIcons
                        name={answer === formData.correct ? "check-circle" : "circle-outline"}
                        size={24}
                        color={answer === formData.correct ? "#4CAF50" : "#666"}
                      />
                    </TouchableOpacity>
                  </View>
                ))}

                <Text style={styles.helperText}>Tap the circle to mark correct answer</Text>

                {/* Save Button */}
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveQuestion}
                  disabled={loading}
                >
                  <LinearGradient colors={["#4CAF50", "#2e7d32"]} style={styles.buttonGradient}>
                    <Text style={styles.saveButtonText}>
                      {loading ? "Saving..." : editingId ? "Update Question" : "Add Question"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    resetForm();
                    setShowAddModal(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  statsBar: {
    backgroundColor: "rgba(0, 212, 255, 0.1)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  statsText: {
    color: "#00d4ff",
    fontSize: 14,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16213e",
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  questionCard: {
    backgroundColor: "#16213e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  questionText: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 10,
  },
  questionActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  answersContainer: {
    flexDirection: "column",
    gap: 8,
    marginBottom: 10,
  },
  answerBadge: {
    backgroundColor: "rgba(0, 212, 255, 0.1)",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#00d4ff",
  },
  answerBadgeCorrect: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderLeftColor: "#4CAF50",
  },
  answerText: {
    color: "#aaa",
    fontSize: 13,
  },
  answerTextCorrect: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  categoryBadge: {
    color: "#9c27b0",
    fontSize: 12,
    fontWeight: "500",
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#666",
    fontSize: 16,
    marginTop: 12,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    borderRadius: 60,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabGradient: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  label: {
    color: "#00d4ff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#16213e",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
    marginBottom: 12,
  },
  answerInputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  answerInput: {
    flex: 1,
    backgroundColor: "#16213e",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
  },
  correctButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 50,
  },
  correctButtonActive: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    borderRadius: 8,
  },
  helperText: {
    color: "#666",
    fontSize: 12,
    marginBottom: 20,
  },
  saveButton: {
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});
