import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
  StyleSheet,
  TextInput,    
  Pressable    
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/constants/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import COLORS from '@/constants/custom-colors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import styles from '../../assets/styles/quiz.styles.js'; // Adjust the path as necessary
const { width, height } = Dimensions.get('window');

export default function QuizPage() {
  const { id } = useLocalSearchParams(); // This is the quizId
  const { token, user } = useAuthStore();
  const router = useRouter();
  
  // Quiz state
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  
  const [fillInBlanksInputs, setFillInBlanksInputs] = useState({});
  const [codeInput, setCodeInput] = useState('');
  const [orderedCodeBlocks, setOrderedCodeBlocks] = useState({});
  const [draggedBlock, setDraggedBlock] = useState(null);  

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Timer ref
  const timerRef = useRef(null);

  useEffect(() => {
    fetchQuizData();
    
    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();

  

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [id]);

      // Add these helper functions before your main return statement
    const getQuestionTypeIcon = (type) => {
      switch (type) {
        case 'multipleChoice': return 'format-list-bulleted-square';
        case 'fillInBlanks': return 'format-text';
        case 'codeSimulation': return 'play-circle-outline';
        case 'codeImplementation': return 'code-braces';
        case 'codeOrdering': return 'sort';
        default: return 'help-circle';
      }
    };
    
    const getQuestionTypeLabel = (type) => {
      switch (type) {
        case 'multipleChoice': return 'Multiple Choice';
        case 'fillInBlanks': return 'Fill in the Blanks';
        case 'codeSimulation': return 'Code Simulation';
        case 'codeImplementation': return 'Code Implementation';
        case 'codeOrdering': return 'Code Ordering';
        default: return 'Unknown';
      }
    };

        // Add this function before your main return statement
    const renderQuestionType = (question, questionIndex) => {
      switch (question.questionType) {
        case 'multipleChoice':
          return renderMultipleChoice(question, questionIndex);
        case 'fillInBlanks':
          return renderFillInBlanks(question, questionIndex);
        case 'codeSimulation':
          return renderCodeSimulation(question, questionIndex);
        case 'codeImplementation':
          return renderCodeImplementation(question, questionIndex);
        case 'codeOrdering':
          return renderCodeOrdering(question, questionIndex);
        default:
          return <Text style={styles.errorText}>Unknown question type</Text>;
      }
    };
    
    // ✅ Multiple Choice Component
    const renderMultipleChoice = (question, questionIndex) => (
      <View style={styles.optionsContainer}>
        {question.options?.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              userAnswers[questionIndex] === option.text && styles.selectedOption
            ]}
            onPress={() => handleAnswerSelect(questionIndex, option.text)}
          >
            <View style={styles.optionContent}>
              <View style={[
                styles.optionRadio,
                userAnswers[questionIndex] === option.text && styles.selectedRadio
              ]}>
                {userAnswers[questionIndex] === option.text && (
                  <MaterialCommunityIcons name="check" size={16} color="#ffffff" />
                )}
              </View>
              <Text style={[
                styles.optionText,
                userAnswers[questionIndex] === option.text && styles.selectedOptionText
              ]}>
                {option.text}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
    
    // ✅ Fill in the Blanks Component
    const renderFillInBlanks = (question, questionIndex) => {
      const blanks = question.blanks || [];
      
      // ✅ Split question text by blank placeholders
      const questionParts = question.question.split(/____/g);
      
      return (
        <View style={styles.fillBlanksContainer}>
          <View style={styles.questionTextContainer}>
            <View style={styles.questionPart}>
              {questionParts.map((part, partIndex) => (
                <React.Fragment key={partIndex}>
                  <Text style={styles.questionPartText}>{part}</Text>
                  {partIndex < questionParts.length - 1 && (
                    <TextInput
                      style={styles.blankInput}
                      placeholder={`Answer ${partIndex + 1}`}
                      placeholderTextColor="#999"
                      value={fillInBlanksInputs[questionIndex]?.[partIndex] || ''}
                      onChangeText={(text) => {
                        const newInputs = { ...fillInBlanksInputs[questionIndex] };
                        newInputs[partIndex] = text;
                        setFillInBlanksInputs(prev => ({
                          ...prev,
                          [questionIndex]: newInputs
                        }));
                        handleAnswerSelect(questionIndex, newInputs, 'fillInBlanks');
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
          
          {/* Show expected answers for reference */}
          <View style={styles.blanksHelpContainer}>
            <Text style={styles.blanksHelpTitle}>Fill in the blanks above</Text>
            <Text style={styles.blanksHelpText}>
              Total blanks to fill: {blanks.length}
            </Text>
            
          </View>
        </View>
      );
    };
    
    // ✅ Code Simulation Component
    const renderCodeSimulation = (question, questionIndex) => (
      <View style={styles.codeContainer}>
        {/* Code Template Display */}
        {question.codeTemplate && (
          <View style={styles.codeTemplateContainer}>
            <Text style={styles.codeTemplateTitle}>Code Template:</Text>
            <ScrollView style={styles.codeTemplateScroll} horizontal>
              <Text style={styles.codeTemplateText}>{question.codeTemplate}</Text>
            </ScrollView>
          </View>
        )}
        
        {/* Expected Output Display */}
        {question.expectedOutput && (
          <View style={styles.expectedOutputContainer}>
            <Text style={styles.expectedOutputTitle}>Expected Output:</Text>
            <Text style={styles.expectedOutputText}>{question.expectedOutput}</Text>
          </View>
        )}
        
        {/* User Input Area */}
        <View style={styles.codeInputContainer}>
          <Text style={styles.codeInputTitle}>Your Answer:</Text>
          <TextInput
            style={styles.codeInput}
            placeholder="Enter your code here..."
            placeholderTextColor="#999"
            value={userAnswers[questionIndex] || ''}
            onChangeText={(text) => handleAnswerSelect(questionIndex, text, 'code')}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
            fontFamily={Platform.OS === 'ios' ? 'Menlo' : 'monospace'}
          />
        </View>
      </View>
    );
    
    // ✅ Code Implementation Component
    const renderCodeImplementation = (question, questionIndex) => (
      <View style={styles.codeContainer}>
        {/* Question Instructions */}
        <View style={styles.codeInstructionsContainer}>
          <Text style={styles.codeInstructionsTitle}>Implementation Task:</Text>
          <Text style={styles.codeInstructionsText}>
            Complete the following code implementation based on the requirements.
          </Text>
        </View>
        
        {/* Code Template (if provided) */}
        {question.codeTemplate && (
          <View style={styles.codeTemplateContainer}>
            <Text style={styles.codeTemplateTitle}>Starting Code:</Text>
            <ScrollView style={styles.codeTemplateScroll} horizontal>
              <Text style={styles.codeTemplateText}>{question.codeTemplate}</Text>
            </ScrollView>
          </View>
        )}
        
        {/* Expected Output */}
        {question.expectedOutput && (
          <View style={styles.expectedOutputContainer}>
            <Text style={styles.expectedOutputTitle}>Expected Result:</Text>
            <Text style={styles.expectedOutputText}>{question.expectedOutput}</Text>
          </View>
        )}
        
        {/* Implementation Area */}
        <View style={styles.codeInputContainer}>
          <Text style={styles.codeInputTitle}>Your Implementation:</Text>
          <TextInput
            style={[styles.codeInput, styles.implementationInput]}
            placeholder="Write your complete implementation here..."
            placeholderTextColor="#999"
            value={userAnswers[questionIndex] || ''}
            onChangeText={(text) => handleAnswerSelect(questionIndex, text, 'code')}
            multiline
            numberOfLines={12}
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
            fontFamily={Platform.OS === 'ios' ? 'Menlo' : 'monospace'}
          />
        </View>
      </View>
    );
    
    // ✅ Code Ordering Component
    const renderCodeOrdering = (question, questionIndex) => {
      const codeBlocks = question.codeBlocks || [];
      
      // ✅ Initialize with random order if not already set
      const initializeRandomOrder = () => {
        if (!orderedCodeBlocks[questionIndex]) {
          // Create array of indices and shuffle them
          const indices = codeBlocks.map((_, index) => index);
          
          // Fisher-Yates shuffle algorithm
          for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
          }
          
          // Set the shuffled order
          setOrderedCodeBlocks(prev => ({
            ...prev,
            [questionIndex]: indices
          }));
          
          return indices;
        }
        return orderedCodeBlocks[questionIndex];
      };
      
      const currentOrder = initializeRandomOrder();
      
      const moveBlock = (fromIndex, toIndex) => {
        const newOrder = [...currentOrder];
        const [movedItem] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, movedItem);
        
        setOrderedCodeBlocks(prev => ({
          ...prev,
          [questionIndex]: newOrder
        }));
        
        handleAnswerSelect(questionIndex, newOrder, 'codeOrdering');
      };
      
      return (
        <View style={styles.codeOrderingContainer}>
          <Text style={styles.codeOrderingTitle}>
            Drag to reorder the code blocks in the correct sequence:
          </Text>
          
          <ScrollView style={styles.codeBlocksList}>
            {currentOrder.map((blockIndex, position) => {
              const block = codeBlocks[blockIndex];
              return (
                <View key={`${questionIndex}-${blockIndex}`} style={styles.codeBlockWrapper}>
                  <View style={styles.codeBlock}>
                    <View style={styles.codeBlockHeader}>
                      <Text style={styles.codeBlockPosition}>{position + 1}</Text>
                      <View style={styles.codeBlockControls}>
                        <TouchableOpacity
                          style={[styles.moveButton, position === 0 && styles.disabledMoveButton]}
                          onPress={() => position > 0 && moveBlock(position, position - 1)}
                          disabled={position === 0}
                        >
                          <MaterialCommunityIcons name="chevron-up" size={20} color="#ffffff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.moveButton, position === currentOrder.length - 1 && styles.disabledMoveButton]}
                          onPress={() => position < currentOrder.length - 1 && moveBlock(position, position + 1)}
                          disabled={position === currentOrder.length - 1}
                        >
                          <MaterialCommunityIcons name="chevron-down" size={20} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <ScrollView horizontal style={styles.codeBlockScroll}>
                      <Text style={styles.codeBlockText}>{block?.code}</Text>
                    </ScrollView>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          
          <View style={styles.orderingHint}>
            <MaterialCommunityIcons name="information" size={20} color="#666" />
            <Text style={styles.orderingHintText}>
              Use the up/down arrows to reorder the code blocks
            </Text>
          </View>
        </View>
      );
    };


  // Fetch quiz data
  const fetchQuizData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/quiz/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load quiz');
      }

      const quizData = await response.json();
      setQuiz(quizData);
      setTimeRemaining(quizData.timeLimit);
      
      // Initialize user answers
      const initialAnswers = {};
      quizData.questions.forEach((_, index) => {
        initialAnswers[index] = null;
      });
      setUserAnswers(initialAnswers);
      
    } catch (err) {
      console.error('Error fetching quiz:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Start quiz timer
  const startQuiz = () => {
    setQuizStarted(true);
    
    // Provide haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Start countdown timer
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle time up
  const handleTimeUp = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    Alert.alert(
      "Time's Up!",
      "The quiz time has expired. Your answers will be submitted automatically.",
      [{ text: "OK", onPress: submitQuiz }]
    );
  };

  // Handle answer selection
  const handleAnswerSelect = (questionIndex, answer, answerType = 'default') => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
    
    // Handle specific answer types
    switch (answerType) {
      case 'fillInBlanks':
        setFillInBlanksInputs(prev => ({
          ...prev,
          [questionIndex]: answer
        }));
        break;
      case 'code':
        setCodeInput(answer);
        break;
      case 'codeOrdering':
        setOrderedCodeBlocks(prev => ({
          ...prev,
          [questionIndex]: answer
        }));
        break;
    }
    
    // Provide haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  };

  // Navigate to next question
  const nextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      
      // Animate transition
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  };

  // Navigate to previous question
  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      
      // Animate transition
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  };

  // Submit quiz
  const submitQuiz = async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Calculate score
      let correctAnswers = 0;
      const totalQuestions = quiz.questions.length;
      
      quiz.questions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        
        // Check answer based on question type
        switch (question.questionType) {
          case 'multipleChoice':
            const correctOption = question.options?.find(opt => opt.isCorrect);
            if (userAnswer === correctOption?.text) {
              correctAnswers++;
            }
            break;
            
          case 'fillInBlanks':
            const blanks = question.blanks || [];
            const userBlanks = fillInBlanksInputs[index] || {};
            let correctBlanks = 0;
            
            blanks.forEach((blank, blankIndex) => {
              if (userBlanks[blankIndex]?.toLowerCase().trim() === blank.answer?.toLowerCase().trim()) {
                correctBlanks++;
              }
            });
            
            // Award points if all blanks are correct
            if (correctBlanks === blanks.length && blanks.length > 0) {
              correctAnswers++;
            }
            break;
            
          case 'codeSimulation':
          case 'codeImplementation':
            // For code questions, this would typically require server-side evaluation
            // For now, we'll do a simple string comparison (you might want to implement more sophisticated checking)
            if (userAnswer?.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim()) {
              correctAnswers++;
            }
            break;
            
          case 'codeOrdering':
            const correctOrder = question.codeBlocks?.map((_, index) => index).sort((a, b) => {
              return question.codeBlocks[a].correctPosition - question.codeBlocks[b].correctPosition;
            });
            const userOrder = orderedCodeBlocks[index];
            
            if (JSON.stringify(userOrder) === JSON.stringify(correctOrder)) {
              correctAnswers++;
            }
            break;
        }
      });
      
      const finalScore = Math.round((correctAnswers / totalQuestions) * 100);
      setScore(finalScore);
      
      // ✅ Submit to backend with better error handling
      console.log('📤 Submitting quiz...', {
        quizId: id,
        score: finalScore,
        totalQuestions,
        correctAnswers
      });
      
      const response = await fetch(`${API_URL}/progress/quiz/${id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: userAnswers,
          fillInBlanksAnswers: fillInBlanksInputs,
          codeOrderingAnswers: orderedCodeBlocks,
          score: finalScore,
          correctAnswers,
          totalQuestions,
          timeSpent: quiz.timeLimit - timeRemaining,
          completedAt: new Date().toISOString()
        }),
      });

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Server error:', errorData);
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Quiz submission successful:', result);

      setQuizCompleted(true);
      
      // Provide success haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
    } catch (error) {
      console.error('❌ Error submitting quiz:', error);
      Alert.alert(
        'Submission Error', 
        `Failed to submit quiz: ${error.message}. Please try again.`,
        [
          { text: 'OK', style: 'default' }
        ]
      );
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your challenge...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-octagon" size={60} color={COLORS.error} />
        <Text style={styles.errorText}>Failed to load quiz: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchQuizData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Quiz completion screen
if (quizCompleted) {
  // Calculate questions answered correctly
  const totalQuestions = quiz.questions.length;
  const questionsCorrect = Math.round((score / 100) * totalQuestions);
  
  return (
    <View style={styles.completionContainer}>
      <Animated.View style={[styles.completionCard, { opacity: fadeAnim }]}>
        <MaterialCommunityIcons 
          name={score >= quiz.passingScore ? "trophy" : "medal"} 
          size={80} 
          color={score >= quiz.passingScore ? "#FFD700" : "#C0C0C0"} 
        />
        <Text style={styles.completionTitle}>
          {score >= quiz.passingScore ? "Quest Completed!" : "Quest Failed"}
        </Text>
        
        {/* ✅ Updated Score Display */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{score}%</Text>
          <Text style={styles.scoreBreakdown}>
            {questionsCorrect} out of {totalQuestions} questions correct
          </Text>
        </View>
        
        {/* Additional Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
            <Text style={styles.statLabel}>Correct: {questionsCorrect}</Text>
          </View>
          
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="close-circle" size={20} color="#F44336" />
            <Text style={styles.statLabel}>Incorrect: {totalQuestions - questionsCorrect}</Text>
          </View>
          
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clock" size={20} color="#FF9800" />
            <Text style={styles.statLabel}>
              Time: {formatTime(quiz.timeLimit - timeRemaining)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.passingScoreText}>
          Passing Score: {quiz.passingScore}%
        </Text>
        
        {/* ✅ Conditional Message Based on Performance */}
        <View style={styles.performanceMessageContainer}>
          {score >= quiz.passingScore ? (
            <View style={styles.successMessage}>
              <MaterialCommunityIcons name="star" size={16} color="#4CAF50" />
              <Text style={styles.successMessageText}>
                Excellent work! You&apos;ve mastered this topic.
              </Text>
            </View>
          ) : (
            <View style={styles.failMessage}>
              <MaterialCommunityIcons name="information" size={16} color="#FF9800" />
              <Text style={styles.failMessageText}>
                Keep practicing! Review the material and try again.
              </Text>
            </View>
          )}
        </View>
        
        {/* ✅ Action Buttons */}
        <View style={styles.completionActions}>
          {score < quiz.passingScore && (
            <TouchableOpacity 
              style={styles.retryQuizButton}
              onPress={() => {
                // Reset quiz state for retry
                setQuizCompleted(false);
                setQuizStarted(false);
                setCurrentQuestionIndex(0);
                setUserAnswers({});
                setFillInBlanksInputs({});
                setOrderedCodeBlocks({}); // ✅ Clear ordered blocks for fresh randomization
                setScore(0);
                setTimeRemaining(quiz.timeLimit);
                
                // Initialize answers
                const initialAnswers = {};
                quiz.questions.forEach((_, index) => {
                  initialAnswers[index] = null;
                });
                setUserAnswers(initialAnswers);
              }}
            >
              <MaterialCommunityIcons name="refresh" size={20} color="#ffffff" />
              <Text style={styles.retryQuizButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.backToModuleButton}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#ffffff" />
            <Text style={styles.backToModuleButtonText}>Return to Quest</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

  // Quiz start screen
  if (!quizStarted) {
    return (
      <ScrollView style={styles.container}>
        <Animated.View style={[styles.startContainer, { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }]}>
          <View style={styles.quizHeader}>
            <MaterialCommunityIcons name="sword-cross" size={60} color={COLORS.primary} />
            <Text style={styles.quizTitle}>{quiz.title}</Text>
            <Text style={styles.quizDescription}>{quiz.description}</Text>
          </View>
          
          <View style={styles.quizInfo}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#FF9800" />
              <Text style={styles.infoText}>Time: {formatTime(quiz.timeLimit)}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="help-circle-outline" size={24} color="#4CAF50" />
              <Text style={styles.infoText}>Questions: {quiz.questions.length}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="target" size={24} color="#F44336" />
              <Text style={styles.infoText}>Passing: {quiz.passingScore}%</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.startButton} onPress={startQuiz}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark || '#1565C0']}
              style={styles.startButtonGradient}
            >
              <Text style={styles.startButtonText}>Begin Quest</Text>
              <MaterialCommunityIcons name="sword" size={24} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    );
  }

  // Quiz questions screen
  const currentQuestion = quiz.questions[currentQuestionIndex];
  
  return (
    <View style={styles.container}>
      {/* Quiz Header */}
      <View style={styles.quizProgressHeader}>
        <View style={styles.progressInfo}>
          <Text style={styles.questionCounter}>
            {currentQuestionIndex + 1} / {quiz.questions.length}
          </Text>
          <Text style={styles.timer}>{formatTime(timeRemaining)}</Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }
            ]} 
          />
        </View>
      </View>

      {/* Question Content */}
<Animated.View style={[styles.questionContainer, {
  opacity: fadeAnim,
  transform: [{ translateY: slideAnim }]
}]}>
  <ScrollView style={styles.questionScrollContainer} showsVerticalScrollIndicator={false}>
    <View style={styles.questionHeader}>
      <View style={styles.questionTypeIndicator}>
        <MaterialCommunityIcons 
          name={getQuestionTypeIcon(currentQuestion.questionType)} 
          size={24} 
          color={COLORS.primary} 
        />
        <Text style={styles.questionTypeText}>
          {getQuestionTypeLabel(currentQuestion.questionType)}
        </Text>
      </View>
      <Text style={styles.questionPoints}>
        {currentQuestion.points || 1} {(currentQuestion.points || 1) === 1 ? 'point' : 'points'}
      </Text>
    </View>
    
    <Text style={styles.questionText}>{currentQuestion.question}</Text>
    
    {/* Render appropriate question type */}
    {renderQuestionType(currentQuestion, currentQuestionIndex)}
  </ScrollView>
</Animated.View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity 
          style={[styles.navButton, currentQuestionIndex === 0 && styles.disabledButton]}
          onPress={previousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color="#ffffff" />
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>
        
        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <TouchableOpacity style={styles.submitButton} onPress={submitQuiz}>
            <LinearGradient
              colors={['#4CAF50', '#388E3C']}
              style={styles.submitButtonGradient}
            >
              <Text style={styles.submitButtonText}>Submit Quiz</Text>
              <MaterialCommunityIcons name="check" size={24} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navButton} onPress={nextQuestion}>
            <Text style={styles.navButtonText}>Next</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}


