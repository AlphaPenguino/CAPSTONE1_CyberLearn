import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView, Animated, ActivityIndicator, ScrollView, Platform } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router'; // Add this import

import COLORS from '@/constants/custom-colors';
import styles from '../../assets/styles/games.styles.js';
import { API_URL } from '@/constants/api';

export default function Game() {

  const router = useRouter(); // Initialize router for navigation
  // Auth context to get user token
  const { user, token } = useAuthStore();
  
  // Game state
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [lives, setLives] = useState(5);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState('start');
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [dialogue, setDialogue] = useState('');
  const [characterState, setCharacterState] = useState('idle');
  const [enemyState, setEnemyState] = useState('idle');
  const [showDialogue, setShowDialogue] = useState(true);
  
  // Quickplay states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [completedQuizzes, setCompletedQuizzes] = useState([]);
  const [quickplayQuestions, setQuickplayQuestions] = useState([]);
  const [gameMode, setGameMode] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Animation references
  const heartScale = useRef(new Animated.Value(1)).current;
  const scoreScale = useRef(new Animated.Value(1)).current;
  const enemyPosition = useRef(new Animated.Value(0)).current;
  const playerPosition = useRef(new Animated.Value(0)).current;
  const dialogueOpacity = useRef(new Animated.Value(1)).current;
  const loadingProgressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Enemy data for different levels
  const enemies = [
    {
      id: 1,
      name: "Phishing Phantom",
      image: require('../../assets/images/enemy1.png'),
      intro: "I am the Phishing Phantom! Your data will be mine!",
      taunt: ["Think you can outsmart me?", "Your security is weak!", "Give up your passwords!"],
      defeat: "How... did you see through my deception?",
      victory: "Haha! Your data belongs to me now!",
    },
    {
      id: 2,
      name: "Malware Monster",
      image: require('../../assets/images/enemy2.png'),
      intro: "I'll corrupt all your files! Prepare to be infected!",
      taunt: ["Your antivirus is useless!", "I'll encrypt everything!", "Feel the power of ransomware!"],
      defeat: "No! My code has been neutralized...",
      victory: "Your system is now mine to control!",
    },
    {
      id: 3,
      name: "Cyber Overlord",
      image: require('../../assets/images/enemy3.png'),
      intro: "I am the master of the digital realm! Bow before me!",
      taunt: ["Your knowledge is pathetic!", "The internet bends to my will!", "You cannot defeat me!"],
      defeat: "Impossible! How could a mere user defeat me?",
      victory: "As expected. The cyber realm remains mine!",
    }
  ];

  const currentEnemy = enemies[currentLevel - 1] || enemies[0];
  
  // Start entrance animations
  useEffect(() => {
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
  }, []);

  // Initialize with intro dialogue
  useEffect(() => {
    if (gameState === 'playing' && showDialogue) {
      setDialogue(currentEnemy.intro);
      animateEnemyEntrance();
      
      // Auto-dismiss intro dialogue after 3 seconds
      setTimeout(() => {
        fadeOutDialogue();
      }, 3000);
    }
  }, [gameState]);

  // Animation methods
  const animateEnemyEntrance = () => {
    setEnemyState('idle');
    Animated.sequence([
      Animated.timing(enemyPosition, {
        toValue: 20,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(enemyPosition, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(enemyPosition, {
        toValue: 10,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(enemyPosition, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
  };

  const animateEnemyAttack = () => {
    setEnemyState('attack');
    Animated.sequence([
      Animated.timing(enemyPosition, {
        toValue: -30,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(enemyPosition, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      setTimeout(() => setEnemyState('idle'), 500);
    });
  };

  const animateEnemyHurt = () => {
    setEnemyState('hurt');
    Animated.sequence([
      Animated.timing(enemyPosition, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(enemyPosition, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(enemyPosition, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(enemyPosition, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true
      })
    ]).start(() => {
      setTimeout(() => setEnemyState('idle'), 300);
    });
  };

  const animatePlayerAttack = () => {
    setCharacterState('attack');
    Animated.sequence([
      Animated.timing(playerPosition, {
        toValue: 30,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(playerPosition, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      setTimeout(() => setCharacterState('idle'), 500);
    });
  };

  const animatePlayerHurt = () => {
    setCharacterState('hurt');
    Animated.sequence([
      Animated.timing(playerPosition, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(playerPosition, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(playerPosition, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(playerPosition, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true
      })
    ]).start(() => {
      setTimeout(() => setCharacterState('idle'), 300);
    });
  };

  const fadeOutDialogue = () => {
    Animated.timing(dialogueOpacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true
    }).start(() => {
      setShowDialogue(false);
      dialogueOpacity.setValue(1);
    });
  };

  const showEnemyTaunt = () => {
    const randomTaunt = currentEnemy.taunt[Math.floor(Math.random() * currentEnemy.taunt.length)];
    setDialogue(randomTaunt);
    setShowDialogue(true);
    
    // Animate a small movement
    Animated.sequence([
      Animated.timing(enemyPosition, {
        toValue: 5,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(enemyPosition, {
        toValue: -5,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(enemyPosition, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      })
    ]).start();
    
    setTimeout(() => {
      fadeOutDialogue();
    }, 2000);
  };
  
  // Timer effect
  useEffect(() => {
    let interval;
    
    if (gameState === 'playing' && !showDialogue) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            clearInterval(interval);
            setGameState('gameOver');
            return 0;
          }
          
          // Random enemy taunt
          if (time % 20 === 0) {
            showEnemyTaunt();
          }
          
          return time - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [gameState, showDialogue]);


  const questions = [
    {
      id: 1,
      question: "If you wanted to launch a viral TikTok campaign to raise awareness for a social cause using digital tools, which of the following would be the most effective first step?",
      options: [
        "Post random videos and hope they go viral",
        "Use a popular filter without a clear message",
        "Identify your target audience and create a content strategy",
        "Wait for someone else to start the trend and just copy it"
      ],
      correctAnswer: 2, // Index of correct answer (0-based)
      explanation: "Creating a strategy based on your target audience is essential for effective social campaigns."
    },
    {
      id: 2,
      question: "Which of these is the most secure password?",
      options: [
        "password123",
        "MyDog'sName!2023",
        "qwerty",
        "12345678"
      ],
      correctAnswer: 1,
      explanation: "A strong password combines uppercase, lowercase, numbers, and special characters."
    },
  ];

  // --- CHANGES START HERE ---

  // Instead of a flat array, store all questions grouped by quiz
  const [allQuizQuestions, setAllQuizQuestions] = useState([]); // [{quizTitle, questions: [...]}, ...]
  const [quizIndex, setQuizIndex] = useState(0); // Which quiz is being played
  const [questionIndex, setQuestionIndex] = useState(0); // Which question in the current quiz

  // Fetch all completed quizzes and their questions, grouped by quiz
  const fetchCompletedQuizzes = async () => {
    setIsLoading(true);
    setLoadingProgress(0);
    setError(null);

    try {
      animateLoading();

      const response = await fetch(`${API_URL}/progress/completed-quizzes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`Error: ${response.status}`);

      const data = await response.json();

      if (data && data.length > 0) {
        // Group questions by quiz, preserving quiz order
        const quizzesWithQuestions = data
          .filter(quiz => quiz.questions && quiz.questions.length > 0)
          .map(quiz => ({
            quizTitle: quiz.title,
            questions: quiz.questions
              .filter(q => q.questionType === 'multipleChoice')
              .map(question => {
                const options = question.options.map(opt => opt.text);
                const correctAnswerIndex = question.options.findIndex(opt => opt.isCorrect);
                return {
                  id: question._id,
                  question: question.question,
                  options,
                  correctAnswer: correctAnswerIndex,
                  explanation: question.explanation || "Good job!",
                  category: quiz.title,
                  difficulty: question.difficulty || "medium"
                };
              })
          }))
          .filter(qz => qz.questions.length > 0);

        setAllQuizQuestions(quizzesWithQuestions);
        setQuizIndex(0);
        setQuestionIndex(0);

        setLoadingProgress(100);
        setTimeout(() => {
          setIsLoading(false);
          startQuickplay();
        }, 500);
      } else {
        setLoadingProgress(100);
        setTimeout(() => {
          setIsLoading(false);
          alert("You haven't completed any quizzes yet! Complete some quizzes to unlock Quickplay.");
        }, 500);
      }
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
      alert("Failed to load quizzes. Please try again later.");
    }
  };

  // Start quickplay: reset quiz and question indices
  const startQuickplay = () => {
    if (!allQuizQuestions.length) {
      alert("No questions available. Complete some quizzes first!");
      return;
    }
    setQuizIndex(0);
    setQuestionIndex(0);
    setLives(5);
    setScore(0);
    setTimeLeft(60);
    setGameMode('quickplay');
    setGameState('playing');
    setSelectedAnswer(null);
    setIsCorrect(null);
    setCharacterState('idle');
    setEnemyState('idle');
    setShowDialogue(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Get current question object
  const getCurrentQuestionObj = () => {
    if (
      gameMode === 'quickplay' &&
      allQuizQuestions[quizIndex] &&
      allQuizQuestions[quizIndex].questions[questionIndex]
    ) {
      return allQuizQuestions[quizIndex].questions[questionIndex];
    }
    // fallback to default demo question
    return questions[0];
  };

  // Get total questions for progress bar
  const getTotalQuestions = () =>
    gameMode === 'quickplay'
      ? allQuizQuestions.reduce((sum, qz) => sum + qz.questions.length, 0)
      : questions.length;

  // Get current question number (for progress bar)
  const getCurrentQuestionNumber = () => {
    if (gameMode !== 'quickplay') return currentQuestion + 1;
    let num = 1;
    for (let i = 0; i < quizIndex; i++) num += allQuizQuestions[i].questions.length;
    return num + questionIndex;
  };

  // Handle answer selection for all quizzes
  const handleAnswerSelect = (index) => {
    if (selectedAnswer !== null || showDialogue) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync();

    const qObj = getCurrentQuestionObj();
    setSelectedAnswer(index);
    const correct = index === qObj.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      animatePlayerAttack();
      setTimeout(() => animateEnemyHurt(), 300);
      setDialogue("Take that! The correct answer strikes true!");
      setShowDialogue(true);
      Animated.sequence([
        Animated.timing(scoreScale, { toValue: 1.5, duration: 300, useNativeDriver: true }),
        Animated.timing(scoreScale, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
      setScore(score + 100);

      setTimeout(() => {
        fadeOutDialogue();
        setTimeout(() => {
          // Move to next question or quiz
          if (gameMode === 'quickplay') {
            const currentQuiz = allQuizQuestions[quizIndex];
            if (questionIndex < currentQuiz.questions.length - 1) {
              setQuestionIndex(questionIndex + 1);
            } else if (quizIndex < allQuizQuestions.length - 1) {
              setQuizIndex(quizIndex + 1);
              setQuestionIndex(0);
            } else {
              setDialogue(currentEnemy.defeat);
              setShowDialogue(true);
              setEnemyState('defeated');
              setCharacterState('victory');
              setTimeout(() => {
                fadeOutDialogue();
                setTimeout(() => setGameState('win'), 500);
              }, 2000);
            }
          } else {
            // fallback for demo mode
            if (currentQuestion < questions.length - 1) {
              setCurrentQuestion(currentQuestion + 1);
            } else {
              setDialogue(currentEnemy.defeat);
              setShowDialogue(true);
              setEnemyState('defeated');
              setCharacterState('victory');
              setTimeout(() => {
                fadeOutDialogue();
                setTimeout(() => setGameState('win'), 500);
              }, 2000);
            }
          }
          setSelectedAnswer(null);
          setIsCorrect(null);
        }, 500);
      }, 2000);

    } else {
      animateEnemyAttack();
      setTimeout(() => animatePlayerHurt(), 300);
      setDialogue("Ha! Your knowledge fails you!");
      setShowDialogue(true);
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 1.5, duration: 300, useNativeDriver: true }),
        Animated.timing(heartScale, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
      setLives(lives - 1);

      setTimeout(() => {
        fadeOutDialogue();
        setTimeout(() => {
          if (lives <= 1) {
            setDialogue(currentEnemy.victory);
            setShowDialogue(true);
            setCharacterState('hurt');
            setTimeout(() => {
              fadeOutDialogue();
              setTimeout(() => setGameState('gameOver'), 500);
            }, 2000);
          } else {
            // Move to next question or quiz
            if (gameMode === 'quickplay') {
              const currentQuiz = allQuizQuestions[quizIndex];
              if (questionIndex < currentQuiz.questions.length - 1) {
                setQuestionIndex(questionIndex + 1);
              } else if (quizIndex < allQuizQuestions.length - 1) {
                setQuizIndex(quizIndex + 1);
                setQuestionIndex(0);
              } else {
                setDialogue(currentEnemy.defeat);
                setShowDialogue(true);
                setEnemyState('defeated');
                setCharacterState('victory');
                setTimeout(() => {
                  fadeOutDialogue();
                  setTimeout(() => setGameState('win'), 500);
                }, 2000);
              }
            } else {
              if (currentQuestion < questions.length - 1) {
                setCurrentQuestion(currentQuestion + 1);
              } else {
                setDialogue(currentEnemy.defeat);
                setShowDialogue(true);
                setEnemyState('defeated');
                setCharacterState('victory');
                setTimeout(() => {
                  fadeOutDialogue();
                  setTimeout(() => setGameState('win'), 500);
                }, 2000);
              }
            }
            setSelectedAnswer(null);
            setIsCorrect(null);
          }
        }, 500);
      }, 2000);
    }
  };

  // Restart game
  const restartGame = () => {
    setCurrentQuestion(0);
    setLives(5);
    setScore(0);
    setTimeLeft(60);
    setGameState('playing');
    setSelectedAnswer(null);
    setIsCorrect(null);
    setCharacterState('idle');
    setEnemyState('idle');
    setShowDialogue(true);
    
    // Provide haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // Animate loading progress
  const animateLoading = () => {
    loadingProgressAnim.setValue(0);
    Animated.timing(loadingProgressAnim, {
      toValue: 100,
      duration: 1500,
      useNativeDriver: false
    }).start();
    
    // Update loading progress state for visual feedback
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        return newProgress > 90 ? 90 : newProgress;
      });
    }, 200);
    
    setTimeout(() => clearInterval(interval), 1500);
  };
  
  // Get current questions based on mode
  const getCurrentQuestions = () => {
    return gameMode === 'quickplay' ? quickplayQuestions : questions;
  };

  // Format time display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Start screen with loading overlay
  if (gameState === 'start') {
    return (
      <SafeAreaView style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingTitle}>PREPARING CYBER BATTLE</Text>
            <Image 
              source={require('../../assets/images/character1.png')}
              style={styles.loadingCharacter}
            />
            <View style={styles.loadingBarContainer}>
              <Animated.View 
                style={[
                  styles.loadingBar,
                  { width: `${loadingProgress}%` }
                ]}
              />
            </View>
            <Text style={styles.loadingText}>
              Loading your personal cyber challenges...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={60} color={COLORS.error} />
            <Text style={styles.errorText}>Failed to load game data: {error}</Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={() => {
                setError(null);
                setGameState('start');
              }}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View 
            style={[
              styles.startScreen, 
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.gameTitle}>CYBER BATTLE</Text>
            
            <View style={styles.charactersRow}>
              <Image 
                source={require('../../assets/images/character1.png')}
                style={[styles.characterImageSmall, { transform: [{ scaleX: -1 }] }]}
              />
              <Image 
                source={enemies[0].image}
                style={styles.characterImageSmall}
              />
            </View>
            
            <LinearGradient
              colors={['#FF5722', '#FF9800']}
              style={styles.battleBanner}
            >
              <Text style={styles.bannerText}>CHOOSE YOUR BATTLE</Text>
            </LinearGradient>
            
            <Text style={styles.instructions}>
              Evil cyber threats are attacking! Use your knowledge to defeat them!
            </Text>
            
            <View style={styles.modeSelection}>
              <TouchableOpacity 
                style={styles.modeButton}
                onPress={() => fetchCompletedQuizzes()}
              >
                <LinearGradient
                  colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
                  style={styles.modeIconContainer}
                >
                  <Ionicons name="flash" size={32} color="#FFD700" />
                </LinearGradient>
                <Text style={styles.modeTitle}>QUICKPLAY</Text>
                <Text style={styles.modeDescription}>
                  Challenge with randomized questions from quizzes you&apos;ve already mastered!
                </Text>
                <View style={styles.modeDifficultyContainer}>
                  <Text style={styles.modeDifficulty}>PERSONALIZED</Text>
                  
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modeButton, styles.modeButtonMultiplayer]}
                onPress={() => {
                  // Navigate to the multiplayer game screen (e.g., multiplayer.jsx)
                  router.push('../../multiplayer'); // Use router to navigate
                }}
              >
                <LinearGradient
                  colors={['rgba(30, 136, 229, 0.2)', 'rgba(30, 136, 229, 0.1)']}
                  style={[styles.modeIconContainer, styles.multiplayerIcon]}
                >
                  <Ionicons name="people" size={32} color="#1E88E5" />
                </LinearGradient>
                <Text style={styles.modeTitle}>MULTIPLAYER</Text>
                <Text style={styles.modeDescription}>
                  Team up with friends to tackle cooperative challenges against other team!
                </Text>
                <View style={styles.modeDifficultyContainer}>
                  <Text style={[styles.modeDifficulty, styles.multiplayerText]}>COOP</Text>
                  <View style={styles.difficultyStars}>
                    
                  </View>
                </View>
                
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </SafeAreaView>
    );
  }
  
  // Game over screen
  if (gameState === 'gameOver') {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View 
          style={[
            styles.completionContainer, 
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.completionCard}>
            <MaterialCommunityIcons name="trophy-broken" size={80} color="#C0C0C0" />
            <Text style={styles.gameOverText}>Defeated!</Text>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreText}>Score: {score}</Text>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.statLabel}>
                  Questions: {currentQuestion + 1}/{getCurrentQuestions().length}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="clock" size={20} color="#FF9800" />
                <Text style={styles.statLabel}>
                  Time: {formatTime(60 - timeLeft)}
                </Text>
              </View>
            </View>
            
            <Text style={styles.defeatMessage}>
              The cyber threat has prevailed this time...
            </Text>
            
            <View style={styles.completionActions}>
              <TouchableOpacity 
                style={styles.retryQuizButton}
                onPress={restartGame}
              >
                <LinearGradient
                  colors={['#FF9800', '#F57C00']}
                  style={styles.retryQuizButtonGradient}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color="#ffffff" />
                  <Text style={styles.retryQuizButtonText}>Try Again</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }
  
  // Win screen
  if (gameState === 'win') {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View 
          style={[
            styles.completionContainer, 
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.completionCard}>
            <MaterialCommunityIcons name="trophy" size={80} color="#FFD700" />
            <Text style={styles.winText}>Victory!</Text>
            
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreText}>Score: {score}</Text>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="heart" size={20} color="#F44336" />
                <Text style={styles.statLabel}>Lives Left: {lives}</Text>
              </View>
              
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="clock" size={20} color="#FF9800" />
                <Text style={styles.statLabel}>
                  Time: {formatTime(60 - timeLeft)}
                </Text>
              </View>
            </View>
            
            <Text style={styles.victoryMessage}>
              You&apos;ve successfully defended against the cyber attack!
            </Text>
            
            <View style={styles.completionActions}>
              <TouchableOpacity 
                style={styles.nextLevelButton}
                onPress={() => {
                  setCurrentLevel(currentLevel < 3 ? currentLevel + 1 : 1);
                  restartGame();
                }}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark || '#1565C0']}
                  style={styles.nextLevelButtonGradient}
                >
                  <Text style={styles.nextLevelButtonText}>Next Challenge</Text>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="#ffffff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }
  
  // Main gameplay (battle screen)
  const qObj = getCurrentQuestionObj();
  return (
    <SafeAreaView style={styles.battleContainer}>
      {/* Game HUD */}
      <View style={styles.quizProgressHeader}>
        <View style={styles.progressInfo}>
          <View style={styles.livesContainer}>
            {Array(lives).fill().map((_, i) => (
              <Animated.View
                key={i}
                style={{ transform: [{ scale: i === lives - 1 ? heartScale : 1 }] }}
              >
                <MaterialCommunityIcons name="heart" size={24} color="#F44336" />
              </Animated.View>
            ))}
          </View>
          <Animated.View style={[styles.scoreDisplay, { transform: [{ scale: scoreScale }] }]}>
            <Text style={styles.scoreText}>Score: {score}</Text>
          </Animated.View>
          <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${(getCurrentQuestionNumber() / getTotalQuestions()) * 100}%` }
            ]}
          />
        </View>
      </View>

      {/* Battle Scene */}
      <View style={styles.battleScene}>
        {/* Player Character - On the left */}
        <View style={styles.playerArea}>
          <Text style={styles.playerName}>Cyber Defender</Text>
          <Animated.Image 
            source={require('../../assets/images/character1.png')}
            style={[
              styles.playerImage,
              {transform: [{translateX: playerPosition}]},
              characterState === 'attack' && styles.playerAttacking,
              characterState === 'hurt' && styles.playerHurt,
              characterState === 'victory' && styles.playerVictory
            ]}
            resizeMode="contain"
          />
        </View>
        
        {/* Enemy Character - On the right */}
        <View style={styles.enemyArea}>
          <Text style={styles.enemyName}>{currentEnemy.name}</Text>
          
          {/* Enemy Speech Bubble */}
          {showDialogue && (
            <Animated.View style={[styles.enemySpeechBubble, {opacity: dialogueOpacity}]}>
              <Text style={styles.enemySpeechText}>{dialogue}</Text>
              <View style={styles.speechBubbleArrow} />
            </Animated.View>
          )}
          
          <Animated.Image 
            source={currentEnemy.image}
            style={[
              styles.enemyImage,
              {transform: [{translateX: enemyPosition}]},
              enemyState === 'attack' && styles.enemyAttacking,
              enemyState === 'hurt' && styles.enemyHurt,
              enemyState === 'defeated' && styles.enemyDefeated
            ]}
            resizeMode="contain"
          />
        </View>
      </View>
      
      {/* Question Container */}
      <Animated.View
        style={[
          styles.questionContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.questionBadge}>
          <Text style={styles.questionBadgeText}>{getCurrentQuestionNumber()}</Text>
        </View>
        <Text style={styles.questionCategory}>
          {gameMode === 'quickplay'
            ? `QUIZ: ${allQuizQuestions[quizIndex]?.quizTitle || "CYBER SECURITY"}`
            : "CYBER SECURITY"}
        </Text>
        <ScrollView style={styles.questionScrollView}>
          <Text style={styles.questionText}>
            {qObj?.question}
          </Text>
        </ScrollView>
      </Animated.View>

      {/* Answer options */}
      <View style={styles.optionsContainer}>
        {qObj?.options?.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              selectedAnswer === index && (
                index === qObj.correctAnswer
                  ? styles.correctOption
                  : styles.incorrectOption
              )
            ]}
            onPress={() => handleAnswerSelect(index)}
            disabled={selectedAnswer !== null || showDialogue}
          >
            <View style={styles.optionContent}>
              <View style={[
                styles.optionRadio,
                selectedAnswer === index && (
                  index === qObj.correctAnswer
                    ? styles.correctOptionRadio
                    : styles.incorrectOptionRadio
                )
              ]}>
                {selectedAnswer === index && (
                  <MaterialCommunityIcons
                    name={index === qObj.correctAnswer ? "check" : "close"}
                    size={16}
                    color="#ffffff"
                  />
                )}
              </View>
              <Text
                style={[
                  styles.optionText,
                  selectedAnswer === index && (
                    index === qObj.correctAnswer
                      ? styles.correctOptionText
                      : styles.incorrectOptionText
                  )
                ]}
              >
                {option}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}


