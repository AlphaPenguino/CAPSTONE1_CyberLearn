import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  StyleSheet 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@/constants/custom-colors';

export default function ModuleDetail() {
  const { id } = useLocalSearchParams();
  const { token } = useAuthStore();
  const [module, setModule] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  
  useEffect(() => {
    fetchModuleDetails();
  }, [id]);
  
  const fetchModuleDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch module details
      const moduleRes = await fetch(`${API_URL}/modules/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!moduleRes.ok) {
        throw new Error('Failed to load module details');
      }
      
      const moduleData = await moduleRes.json();
      setModule(moduleData);
      
      // Fetch quizzes for this module
      const quizzesRes = await fetch(`${API_URL}/quiz?module=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!quizzesRes.ok) {
        throw new Error('Failed to load quizzes');
      }
      
      const quizzesData = await quizzesRes.json();
      setQuizzes(quizzesData.quizzes || []);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const navigateToQuiz = (quizId) => {
    router.push(`/quiz/${quizId}`);
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading module content...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={40} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchModuleDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      {/* Module Header */}
      <View style={styles.header}>
        <Image 
          source={{ uri: module?.image }} 
          style={styles.moduleImage} 
        />
        <View style={styles.headerContent}>
          <Text style={styles.title}>{module?.title}</Text>
          <Text style={styles.description}>{module?.description}</Text>
        </View>
      </View>
      
      {/* Quizzes Section */}
      <View style={styles.quizzesSection}>
        <Text style={styles.sectionTitle}>Available Quizzes</Text>
        
        {quizzes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={40} color={COLORS.textSecondary} />
            <Text style={styles.emptyStateText}>No quizzes available yet</Text>
          </View>
        ) : (
          quizzes.map((quiz) => (
            <TouchableOpacity 
              key={quiz._id} 
              style={styles.quizCard}
              onPress={() => navigateToQuiz(quiz._id)}
            >
              <View style={styles.quizHeader}>
                <Ionicons 
                  name="help-circle" 
                  size={24} 
                  color={COLORS.primary} 
                  style={styles.quizIcon}
                />
                <View style={styles.quizInfo}>
                  <Text style={styles.quizTitle}>{quiz.title}</Text>
                  <Text style={styles.quizDescription} numberOfLines={2}>
                    {quiz.description}
                  </Text>
                </View>
              </View>
              
              <View style={styles.quizMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.metaText}>
                    {Math.floor(quiz.timeLimit / 60)}m {quiz.timeLimit % 60}s
                  </Text>
                </View>
                
                <View style={styles.metaItem}>
                  <Ionicons name="list-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.metaText}>
                    {quiz.totalQuestions} questions
                  </Text>
                </View>
                
                <View style={styles.difficultyBadge}>
                  <Text style={styles.difficultyText}>
                    {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.startQuizButton}>
                <Text style={styles.startQuizText}>Start Quiz</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorText: {
    color: COLORS.error,
    marginTop: 12,
    marginBottom: 24,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  header: {
    padding: 16,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  moduleImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  headerContent: {
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  quizzesSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyStateText: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  quizCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  quizHeader: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  quizIcon: {
    marginRight: 12,
  },
  quizInfo: {
    flex: 1,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  quizDescription: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  quizMeta: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginLeft: 4,
  },
  difficultyBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  difficultyText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  startQuizButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  startQuizText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginRight: 8,
  },
});