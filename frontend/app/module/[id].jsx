import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/constants/api';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import COLORS from '@/constants/custom-colors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import styles from '../../assets/styles/quiz.styles.js';
// Get screen dimensions
const { width, height } = Dimensions.get('window');

export default function ModuleDetail() {
  const { id } = useLocalSearchParams();
  const { token, user } = useAuthStore();
  const [module, setModule] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    fetchModuleDetails();
    
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
    
    // Start bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
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
      const quizzesRes = await fetch(`${API_URL}/progress/module/${id}/quizzes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!quizzesRes.ok) {
        throw new Error('Failed to load quizzes or module is locked');
      }
      
      const quizzesData = await quizzesRes.json();
      setQuizzes(quizzesData);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const navigateToQuiz = (quizId) => {
    // Provide haptic feedback if on mobile
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push(`/quiz/${quizId}`);
  };
  
  // Calculate user progress
  const userProgress = {
    completed: Math.floor(Math.random() * quizzes.length), // Replace with actual user progress
    total: quizzes.length,
    percentage: quizzes.length > 0 ? Math.floor((Math.random() * quizzes.length) / quizzes.length * 100) : 0
  };
  
  // Generate a random XP amount for this module
  const moduleXP = 100 * (quizzes.length || 1);
  
  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'easy': return '#4CAF50'; // green
      case 'medium': return '#FF9800'; // orange
      case 'hard': return '#F44336'; // red
      default: return COLORS.primary;
    }
  };
  const handleEditQuiz = (quiz) => {
  // Navigate to edit quiz page with quiz data
  router.push({
    pathname: '/quiz/edit',
    params: { 
      quizId: quiz._id,
      moduleId: id,
      returnTo: `/module/${id}`
    }
  });
};

const handleDeleteQuiz = async (quizId, quizTitle) => {
  // Show confirmation alert
  Alert.alert(
    "Delete Quiz",
    `Are you sure you want to delete "${quizTitle}"? This action cannot be undone.`,
    [
      {
        text: "Cancel",
        style: "cancel"
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => confirmDeleteQuiz(quizId)
      }
    ]
  );
};

const confirmDeleteQuiz = async (quizId) => {
  try {
    setLoading(true);
    
    const response = await fetch(`${API_URL}/quiz/${quizId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete quiz');
    }
    
    const result = await response.json();
    
    // Show success message
    Alert.alert("Success", "Quiz deleted successfully!");
    
    // Refresh the quizzes list
    await fetchModuleDetails();
    
    // Provide haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
  } catch (error) {
    console.error('Error deleting quiz:', error);
    Alert.alert("Error", error.message || "Failed to delete quiz");
  } finally {
    setLoading(false);
  }
};



  // Loading animation
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View 
          style={{
            transform: [{
              rotate: bounceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg']
              })
            }]
          }}
        >
          <MaterialCommunityIcons name="cog" size={60} color={COLORS.primary} />
        </Animated.View>
        <Text style={styles.loadingText}>Loading your quest...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-octagon" size={60} color={COLORS.error} />
        <Text style={styles.errorText}>Quest failed: {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={fetchModuleDetails}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Module Header - Quest Banner */}
      <Animated.View 
        style={[
          styles.questBanner,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={styles.bannerGradient}
        />
        <Image 
          source={{ uri: module?.image }} 
          style={styles.questImage}
          resizeMode="cover"
        />
        <View style={styles.questTitleContainer}>
          <View style={styles.questTitleWrapper}>
            <MaterialCommunityIcons name="map-marker" size={24} color="#FFD700" />
            <Text style={styles.questTitle}>{module?.title}</Text>
          </View>
          <View style={styles.questProgressContainer}>
            <Text style={styles.questProgressText}>{userProgress.percentage}% Complete</Text>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBar, {width: `${userProgress.percentage}%`}]} />
            </View>
          </View>
        </View>
      </Animated.View>
      
      {/* Adventure Details */}
      <Animated.View 
        style={[
          styles.adventureDetails,
          {
            opacity: fadeAnim,
            transform: [{ translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0]
            })}]
          }
        ]}
      >
        <View style={styles.adventureDescription}>
          <MaterialCommunityIcons name="information-variant" size={24} color={COLORS.primary} style={styles.descIcon} />
          <Text style={styles.description}>{module?.description}</Text>
        </View>
        
        <View style={styles.rewardsCard}>
          <Text style={styles.rewardsTitle}>Quest Rewards</Text>
          <View style={styles.rewardsContent}>
            <View style={styles.reward}>
              <MaterialCommunityIcons name="cookie" size={32} color="#FFD700" />
              <Text style={styles.rewardValue}>{moduleXP}</Text>
              <Text style={styles.rewardLabel}>Cookies</Text>
            </View>
            <View style={styles.reward}>
              <MaterialCommunityIcons name="cake" size={32} color="#1E88E5" />
              <Text style={styles.rewardValue}>{quizzes.length}</Text>
              <Text style={styles.rewardLabel}>Cakes</Text>
            </View>
            <View style={styles.reward}>
              <MaterialCommunityIcons name="trophy" size={32} color="#FF9800" />
              <Text style={styles.rewardValue}>{Math.round(moduleXP/100)}</Text>
              <Text style={styles.rewardLabel}>Achievements</Text>
            </View>
          </View>
        </View>
      </Animated.View>
      
      {/* Quizzes Section - Challenges */}
      <View style={styles.challengesSection}>
        <View style={styles.sectionTitleContainer}>
          <MaterialCommunityIcons name="code-braces-box" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Challenges</Text>
          <Text style={styles.challengeCounter}>{quizzes.length}</Text>
        </View>
        
        {quizzes.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="treasure-chest" size={60} color={COLORS.textSecondary} />
            <Text style={styles.emptyStateText}>No challenges available on this quest yet!</Text>
          </View>
        ) : (
          quizzes.map((quiz, index) => (
            <TouchableOpacity 
              key={quiz._id}
              style={[
                styles.challengeCard,
                !quiz.isUnlocked && user?.privilege !== 'admin' && styles.lockedChallenge
              ]}
              onPress={() => (quiz.isUnlocked || user?.privilege === 'admin') ? navigateToQuiz(quiz._id) : null}
              disabled={!quiz.isUnlocked && user?.privilege !== 'admin'}
              activeOpacity={0.8}
            >
              {/* Admin Action Buttons */}
              {user?.privilege === 'admin' && (
                <View style={styles.adminActions}>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleEditQuiz(quiz);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="pencil" size={16} color="#ffffff" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteQuiz(quiz._id, quiz.title);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="delete" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Show admin badge for admin users */}
              {user?.privilege === 'admin' && (
                <View style={styles.adminBadge}>
                  <MaterialCommunityIcons name="shield-crown" size={20} color="#FFD700" />
                  <Text style={styles.adminText}>ADMIN</Text>
                </View>
              )}
              
              {/* Only show lock for non-admin users */}
              {!quiz.isUnlocked && user?.privilege !== 'admin' && (
                <View style={styles.quizLockOverlay}>
                  <MaterialCommunityIcons name="lock" size={24} color="#ffffff" />
                  <Text style={styles.lockText}>Complete previous quiz to unlock</Text>
                </View>
              )}
              
              {/* Quiz Image Section */}
              {quiz.image && (
                <View style={styles.quizImageContainer}>
                  <Image 
                    source={{ uri: quiz.image }} 
                    style={styles.quizImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.3)']}
                    style={styles.quizImageGradient}
                  />
                </View>
              )}
              
              {/* Update the badge positioning based on image presence */}
              <LinearGradient
                colors={[getDifficultyColor(quiz.difficulty), getDifficultyColor(quiz.difficulty) + '60']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.challengeBadge,
                  quiz.image ? styles.challengeBadgeWithImageRight : styles.challengeBadgeNoImageRight
                ]}
              >
                <Text style={styles.challengeNumber}>#{index + 1}</Text>
              </LinearGradient>
              
              <View style={styles.challengeHeader}>
                <View style={styles.challengeTitleContainer}>
                  <MaterialCommunityIcons 
                    name="shield-star" 
                    size={28} 
                    color={COLORS.primary} 
                    style={styles.challengeIcon} 
                  />
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeTitle}>{quiz.title}</Text>
                    <Text style={styles.challengeDescription} numberOfLines={2}>
                      {quiz.description}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.challengeMeta}>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="clock-time-four" size={18} color="#FF9800" />
                  <Text style={styles.metaText}>
                    {Math.floor(quiz.timeLimit / 60)}m {quiz.timeLimit % 60}s
                  </Text>
                </View>
                
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="gesture-tap-button" size={18} color="#4CAF50" />
                  <Text style={styles.metaText}>
                    {quiz.questions?.length || 0} tasks
                  </Text>
                </View>
                
                <View style={[styles.difficultyBadge, {backgroundColor: getDifficultyColor(quiz.difficulty) + '30'}]}>
                  <MaterialCommunityIcons 
                    name={quiz.difficulty === 'easy' ? 'baby-face' : quiz.difficulty === 'medium' ? 'school' : 'shield-bug'} 
                    size={14} 
                    color={getDifficultyColor(quiz.difficulty)} 
                  />
                  <Text style={[styles.difficultyText, {color: getDifficultyColor(quiz.difficulty)}]}>
                    {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
                  </Text>
                </View>
              </View>
              
<LinearGradient
  colors={
    quiz.isPassed 
      ? ['#4CAF50', '#388E3C']  // Green for passed
      : quiz.isCompleted && !quiz.isPassed
        ? ['#FF9800', '#F57C00']  // Orange for failed
        : quiz.isUnlocked 
          ? [COLORS.primary, COLORS.primaryDark || '#1565C0']
          : ['#757575', '#424242']
  }
  style={styles.startChallengeButton}
>
  {quiz.isPassed ? (
    <>
      <Text style={styles.startChallengeText}>Passed</Text>
      <MaterialCommunityIcons name="trophy" size={20} color="#ffffff" />
    </>
  ) : quiz.isCompleted && !quiz.isPassed ? (
    <>
      <Text style={styles.startChallengeText}>Failed</Text>
      <MaterialCommunityIcons name="refresh" size={20} color="#ffffff" />
    </>
  ) : quiz.isUnlocked ? (
    <>
      <Text style={styles.startChallengeText}>Start</Text>
      <MaterialCommunityIcons name="sword" size={20} color="#ffffff" />
    </>
  ) : (
    <>
      <Text style={styles.startChallengeText}>Locked</Text>
      <MaterialCommunityIcons name="lock" size={20} color="#ffffff" />
    </>
  )}
</LinearGradient>
            </TouchableOpacity>
          ))
        )}
      </View>
      
      {/* Back to Map button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="map" size={20} color="#ffffff" />
        <Text style={styles.backButtonText}>Return to Quest Map</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

