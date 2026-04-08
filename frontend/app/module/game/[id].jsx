import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  ActivityIndicator,
  ImageBackground,
  TextInput,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { API_URL } from "@/constants/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import COLORS from "@/constants/custom-colors";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CharacterSprite from "../../../components/CharacterSprite.jsx";
import {
  cyborg_sprites,
  cyborg_frames,
  enemy_easy_sprites,
  enemy_easy_frames,
  enemy_medium_sprites,
  enemy_medium_frames,
  enemy_hard_sprites,
  enemy_hard_frames,
} from "../../../components/spriteSets.js";
const battlefieldImages = [
  require("../../../assets/backgrounds/battlefield.png"),
  require("../../../assets/backgrounds/city.png"),
  require("../../../assets/backgrounds/slum.png"),
  require("../../../assets/backgrounds/Battleground4.png"),
];

// 🔧 DEVELOPMENT TOGGLE - Set to true to use dummy data for testing
const USE_DUMMY_GAME_DATA = false;

export default function ModuleGameQuest() {
  const { id, returnSubjectId, returnModuleId } = useLocalSearchParams(); // Module ID + map return context
  const { token } = useAuthStore();
  const router = useRouter();
  const normalizedReturnSubjectId = Array.isArray(returnSubjectId)
    ? returnSubjectId[0]
    : returnSubjectId;
  const normalizedReturnModuleId = Array.isArray(returnModuleId)
    ? returnModuleId[0]
    : returnModuleId;
  const normalizedCurrentModuleId = Array.isArray(id) ? id[0] : id;

  const navigateToAdventureMap = useCallback(() => {
    const focusModuleId = normalizedReturnModuleId || normalizedCurrentModuleId;

    if (normalizedReturnSubjectId) {
      router.replace({
        pathname: "/(tabs)/",
        params: {
          subjectId: normalizedReturnSubjectId,
          focusModuleId: focusModuleId || "",
        },
      });
      return;
    }

    router.replace({
      pathname: "/(tabs)/",
      params: {
        focusModuleId: focusModuleId || "",
      },
    });
  }, [
    router,
    normalizedReturnSubjectId,
    normalizedReturnModuleId,
    normalizedCurrentModuleId,
  ]);

  // Game state
  const [module, setModule] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [completionInProgress, setCompletionInProgress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Battle animations
  const [playerHealth, setPlayerHealth] = useState(100);
  const [enemyHealth, setEnemyHealth] = useState(100);
  const [playerAttackAnim, setPlayerAttackAnim] = useState(false);
  const [enemyAttackAnim, setEnemyAttackAnim] = useState(false);
  const [playerAction, setPlayerAction] = useState("idle");
  const [enemyAction, setEnemyAction] = useState("idle");
  const [battleMessage, setBattleMessage] = useState("");
  const [answerLocked, setAnswerLocked] = useState(false); // Lock answers after selection

  // Death animations and completion states
  const [showDeathAnimation, setShowDeathAnimation] = useState(false);
  const [deathAnimationComplete, setDeathAnimationComplete] = useState(false);
  const [starRating, setStarRating] = useState(0);
  const [isPlayerDefeated, setIsPlayerDefeated] = useState(false);

  // Score tracking
  const [score, setScore] = useState(0);
  const [questProgress, setQuestProgress] = useState(0);
  const [correctAnswerCount, setCorrectAnswerCount] = useState(0);
  const [incorrectAnswerCount, setIncorrectAnswerCount] = useState(0);

  // XP and Level tracking
  const [xpEarned, setXpEarned] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelUp, setLevelUp] = useState(false);

  // State for different question types
  const [userInput, setUserInput] = useState(""); // For codeMissing and fillInBlanks
  const [selectedBlanks, setSelectedBlanks] = useState([]); // For fillInBlanks
  const [orderedBlocks, setOrderedBlocks] = useState([]); // For codeOrdering

  // State for sorting questions
  const [sortingAnswers, setSortingAnswers] = useState([]); // Array of arrays for each category
  const [availableItems, setAvailableItems] = useState([]); // Items not yet sorted

  // State for cipher questions
  const [cipherAnswer, setCipherAnswer] = useState("");

  // State for hint functionality
  const [showHintModal, setShowHintModal] = useState(false);

  // Dynamic background based on current module/level
  const [currentBackground, setCurrentBackground] = useState(
    battlefieldImages[0] // Default to first background
  );

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const battleAnim = useRef(new Animated.Value(0)).current;
  const deathAnim = useRef(new Animated.Value(0)).current;

  // Helper function to get background for current module/level
  const getBackgroundForLevel = (moduleId) => {
    // Extract level number from module ID (e.g., "dummy-0" -> 0, "dummy-1" -> 1)
    let levelIndex = 0;
    if (moduleId && moduleId.includes("dummy-")) {
      levelIndex = parseInt(moduleId.split("-")[1]) || 0;
    } else if (moduleId) {
      // For non-dummy IDs, create a simple hash to get consistent background
      levelIndex = moduleId.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    }

    const backgroundIndex = levelIndex % battlefieldImages.length;
    const backgroundNames = ["battlefield", "city", "slum", "battleground4"];

    console.log(
      `Level ${moduleId} -> Background Index: ${backgroundIndex} (${backgroundNames[backgroundIndex]})`
    );

    return battlefieldImages[backgroundIndex];
  };

  // Calculate star rating based on score percentage (matching main screen thresholds)
  const calculateStarRating = (scorePercentage) => {
    console.log(`Star Rating Calculation: Score: ${scorePercentage}%`);

    if (scorePercentage >= 90) {
      return 3; // 90%+ = 3 stars
    } else if (scorePercentage >= 65) {
      return 2; // 65-89% = 2 stars
    } else if (scorePercentage >= 34) {
      return 1; // 34-64% = 1 star
    } else {
      return 0; // Below 34% = 0 stars (failure)
    }
  };

  // Helper function to get enemy sprites based on difficulty
  const getEnemySprites = () => {
    const difficulty = module?.difficulty || "easy";

    switch (difficulty.toLowerCase()) {
      case "hard":
        return {
          sprites: enemy_hard_sprites,
          frames: enemy_hard_frames,
          name: "Grunt Boss",
        };
      case "medium":
        return {
          sprites: enemy_medium_sprites,
          frames: enemy_medium_frames,
          name: "Grunt Leader",
        };
      case "easy":
      default:
        return {
          sprites: enemy_easy_sprites,
          frames: enemy_easy_frames,
          name: "Grunt Minion",
        };
    }
  };

  // Helper function to trigger death animations
  const triggerDeathAnimation = useCallback(
    (isPlayerDead, isEnemyDead) => {
      // Prevent multiple triggers
      if (showDeathAnimation) return;

      console.log(
        `🎭 Death Animation Triggered: Player Dead: ${isPlayerDead}, Enemy Dead: ${isEnemyDead}`
      );

      setShowDeathAnimation(true);
      setDeathAnimationComplete(false);

      if (isPlayerDead) {
        console.log("💀 Setting player action to 'dead'");
        setPlayerAction("dead");
        setBattleMessage("💀 You have been defeated! The darkness wins...");
      }

      if (isEnemyDead) {
        console.log("⚡ Setting enemy action to 'dead'");
        setEnemyAction("dead");
        setBattleMessage("⚡ Victory! The enemy falls before your might!");
      }

      // Reset and start death animation sequence
      deathAnim.setValue(0);
      Animated.sequence([
        Animated.timing(deathAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(deathAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setDeathAnimationComplete(true);
      });
    },
    [deathAnim, showDeathAnimation]
  );

  const retryLoading = () => {
    setError(null);
    setLoading(true);
    // Trigger re-fetch by reloading the component
    if (typeof window !== "undefined" && window.location?.reload) {
      window.location.reload();
    } else {
      router.replace(`/module/game/${id}`);
    }
  };

  useEffect(() => {
    // Create dummy quest data for testing
    const createDummyQuestData = () => {
      // Parse the level number from module ID (e.g., "dummy-0" -> 1, "dummy-1" -> 2)
      const levelNumber = id.includes("dummy-")
        ? parseInt(id.split("-")[1]) + 1
        : Math.floor(Math.random() * 10) + 1;

      const dummyModule = {
        _id: id,
        title: `Cyber Quest ${levelNumber}`,
        description: `Embark on Level ${levelNumber} cybersecurity adventure! Battle through challenges and prove your worth as a cyber defender.`,
        image:
          "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=300&fit=crop&crop=center",
      };

      const dummyQuizzes = [
        {
          _id: "dummy-quiz-1",
          title: "Password Security Challenge",
          description: "Test your knowledge about creating secure passwords",
          questions: [
            {
              _id: "q1",
              questionText: "Which of the following is the strongest password?",
              questionType: "multipleChoice",
              hint: "Strong passwords have uppercase, lowercase, numbers, and special characters",
              options: [
                { text: "password123", isCorrect: false },
                { text: "MyP@ssw0rd!2023", isCorrect: true },
                { text: "123456789", isCorrect: false },
                { text: "qwerty", isCorrect: false },
              ],
            },
            {
              _id: "q2",
              questionText: "What is two-factor authentication?",
              questionType: "multipleChoice",
              hint: "Think about adding an extra layer of security beyond just a password",
              options: [
                { text: "Using two passwords", isCorrect: false },
                {
                  text: "An additional security layer beyond password",
                  isCorrect: true,
                },
                { text: "Having two usernames", isCorrect: false },
                { text: "Logging in twice", isCorrect: false },
              ],
            },
          ],
          isUnlocked: true,
          difficulty: "easy",
        },
        {
          _id: "dummy-quiz-2",
          title: "Network Security Battle",
          description: "Defend against network attacks and intrusions",
          questions: [
            {
              _id: "q3",
              questionText: "What does a firewall do?",
              questionType: "multipleChoice",
              hint: "Think about network security and controlling access to your computer",
              options: [
                { text: "Prevents computer overheating", isCorrect: false },
                { text: "Blocks unauthorized network access", isCorrect: true },
                { text: "Speeds up internet connection", isCorrect: false },
                { text: "Stores user passwords", isCorrect: false },
              ],
            },
            {
              _id: "q4",
              questionText: "Which protocol is used for secure web browsing?",
              questionType: "multipleChoice",
              // No hint - will show "No hint available for this question"
              options: [
                { text: "HTTP", isCorrect: false },
                { text: "FTP", isCorrect: false },
                { text: "HTTPS", isCorrect: true },
                { text: "SMTP", isCorrect: false },
              ],
            },
            {
              _id: "q5",
              questionText: "Complete the missing code to hash a password:",
              questionType: "codeMissing",
              codeTemplate: `const bcrypt = require('bcrypt');
const saltRounds = 10;

function hashPassword(password) {
    return bcrypt.______(password, saltRounds);
}`,
              correctAnswer: "hash",
            },
            {
              _id: "q6",
              questionText:
                "The ____ protocol encrypts data transmission, while ____ is used for secure file transfer.",
              questionType: "fillInBlanks",
              blanks: ["HTTPS", "SFTP"],
            },
            {
              _id: "q7",
              questionText:
                "Arrange these firewall configuration steps in the correct order:",
              questionType: "codeOrdering",
              codeBlocks: [
                { id: 1, code: "Define network zones", position: 0 },
                { id: 2, code: "Create firewall rules", position: 1 },
                { id: 3, code: "Test firewall configuration", position: 2 },
                { id: 4, code: "Deploy to production", position: 3 },
              ],
            },
          ],
          isUnlocked: true,
          difficulty: "medium",
        },
      ];

      return { dummyModule, dummyQuizzes };
    };
    const fetchModuleQuestData = async () => {
      try {
        setLoading(true);

        if (USE_DUMMY_GAME_DATA) {
          // Use dummy data for testing
          const { dummyModule, dummyQuizzes } = createDummyQuestData();
          setModule(dummyModule);
          setQuizzes(dummyQuizzes);
          setLoading(false);
          return;
        }

        // First try to fetch as a cyber-quest
        try {
          const cyberQuestRes = await fetch(`${API_URL}/cyber-quests/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (cyberQuestRes.ok) {
            const cyberQuestData = await cyberQuestRes.json();

            if (cyberQuestData.success && cyberQuestData.cyberQuest) {
              const cyberQuest = cyberQuestData.cyberQuest;

              // Transform cyber-quest data to module format
              const moduleData = {
                _id: cyberQuest._id,
                title: cyberQuest.title,
                description:
                  cyberQuest.description || "A challenging cyber quest awaits!",
                difficulty: cyberQuest.difficulty || "medium",
                type: "cyber-quest",
              };

              // Transform cyber-quest questions to quiz format
              const quizData = {
                _id: cyberQuest._id,
                title: cyberQuest.title,
                description:
                  cyberQuest.description ||
                  "Test your cybersecurity knowledge!",
                questions: cyberQuest.questions.map((question, index) => {
                  const baseQuestion = {
                    _id: `cq-${cyberQuest._id}-q${index}`,
                    questionText: question.text,
                    questionType: question.type || "multipleChoice",
                    hint: question.hint || "", // Include hint field
                  };

                  // Handle different question types based on your create.jsx structure
                  switch (question.type) {
                    case "multipleChoice":
                      return {
                        ...baseQuestion,
                        options:
                          question.choices?.map((choice, choiceIndex) => ({
                            text: choice,
                            isCorrect: choiceIndex === question.correct_index,
                          })) || [],
                      };

                    case "codeMissing":
                      return {
                        ...baseQuestion,
                        codeTemplate: question.codeTemplate,
                        correctAnswer: question.correctAnswer,
                      };

                    case "fillInBlanks":
                      return {
                        ...baseQuestion,
                        blanks: question.blanks,
                      };

                    case "codeOrdering":
                      return {
                        ...baseQuestion,
                        codeBlocks: question.codeBlocks,
                      };

                    case "sorting":
                      return {
                        ...baseQuestion,
                        categories: question.categories,
                        items: question.items,
                      };

                    case "cipher":
                      return {
                        ...baseQuestion,
                        answer: question.answer,
                        scrambledHint: question.scrambledHint,
                      };

                    default:
                      // Fallback for old format or unknown types
                      return {
                        ...baseQuestion,
                        questionType: "multipleChoice",
                        options:
                          question.choices?.map((choice, choiceIndex) => ({
                            text: choice,
                            isCorrect: choiceIndex === question.correct_index,
                          })) || [],
                      };
                  }
                }),
                isUnlocked: true,
                difficulty: cyberQuest.difficulty || "medium",
              };

              setModule(moduleData);
              setQuizzes([quizData]);
              setLoading(false);
              return;
            }
          }
        } catch (_cyberQuestError) {
          console.log("Not a cyber-quest, trying regular module...");
        }

        // If not a cyber-quest, try fetching as a regular module
        const moduleRes = await fetch(`${API_URL}/modules/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!moduleRes.ok) {
          throw new Error("Failed to load module details");
        }

        const moduleData = await moduleRes.json();
        setModule(moduleData);

        // Fetch quizzes for this module
        const quizzesRes = await fetch(
          `${API_URL}/progress/module/${id}/quizzes`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!quizzesRes.ok) {
          throw new Error("Failed to load quizzes");
        }

        const quizzesData = await quizzesRes.json();
        setQuizzes(quizzesData.filter((quiz) => quiz.isUnlocked));
      } catch (err) {
        console.error("Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const initializeGame = async () => {
      await fetchModuleQuestData();

      // Start entrance animations
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
        }),
      ]).start();
    };

    initializeGame();
  }, [id, token, fadeAnim, slideAnim]);

  // Update background when module loads (set background based on level)
  useEffect(() => {
    if (id) {
      const newBackground = getBackgroundForLevel(id);
      setCurrentBackground(newBackground);
    }
  }, [id]);

  // Monitor player health for automatic defeat detection
  useEffect(() => {
    if (
      playerHealth <= 0 &&
      gameStarted &&
      !gameCompleted &&
      !isPlayerDefeated &&
      !showDeathAnimation
    ) {
      setIsPlayerDefeated(true);
      setTimeout(() => {
        triggerDeathAnimation(true, false);
      }, 500);
    }
  }, [
    playerHealth,
    gameStarted,
    gameCompleted,
    isPlayerDefeated,
    showDeathAnimation,
    triggerDeathAnimation,
  ]);

  // Monitor death animation completion
  useEffect(() => {
    if (deathAnimationComplete && !gameCompleted) {
      setTimeout(() => {
        setGameCompleted(true);
      }, 500);
    }
  }, [deathAnimationComplete, gameCompleted]);

  // Debug current question and initialize question states
  useEffect(() => {
    // Inline the getCurrentQuestion logic to avoid circular dependency
    const currentQuestion =
      quizzes[currentQuizIndex]?.questions[currentQuestionIndex] || null;
    console.log("🔍 DEBUG: Current question changed:", currentQuestion);

    if (currentQuestion) {
      console.log("🔍 DEBUG: Question type:", currentQuestion.questionType);

      // Reset all question-specific states
      setUserInput("");
      setSelectedBlanks([]);
      setOrderedBlocks([]);
      setSortingAnswers([]);
      setAvailableItems([]);
      setCipherAnswer("");

      // Initialize states based on question type
      if (
        currentQuestion.questionType === "fillInBlanks" &&
        currentQuestion.blanks
      ) {
        console.log(
          "🔍 DEBUG: Initializing fillInBlanks with blanks:",
          currentQuestion.blanks
        );
        setSelectedBlanks(new Array(currentQuestion.blanks.length).fill(""));
      }

      if (
        currentQuestion.questionType === "codeOrdering" &&
        currentQuestion.codeBlocks
      ) {
        console.log(
          "🔍 DEBUG: Initializing codeOrdering with blocks:",
          currentQuestion.codeBlocks
        );
        setOrderedBlocks([]); // Start with empty array for code ordering
      }

      if (
        currentQuestion.questionType === "sorting" &&
        currentQuestion.categories &&
        currentQuestion.items
      ) {
        console.log(
          "🔍 DEBUG: Initializing sorting question with categories:",
          currentQuestion.categories,
          "and items:",
          currentQuestion.items
        );
        // Initialize empty arrays for each category
        const emptyCategoryArrays = new Array(currentQuestion.categories.length)
          .fill([])
          .map(() => []);
        setSortingAnswers(emptyCategoryArrays);
        // Set all items as available initially
        setAvailableItems([...currentQuestion.items]);
      }

      if (currentQuestion.questionType === "cipher") {
        console.log("🔍 DEBUG: Initializing cipher question");
        setCipherAnswer("");
      }
    }
  }, [currentQuizIndex, currentQuestionIndex, quizzes]);

  const startQuest = () => {
    setGameStarted(true);
    setAnswerLocked(false); // Ensure answers are unlocked when starting
    setBattleMessage("The quest begins! Prepare for battle!");
    setCorrectAnswerCount(0);
    setIncorrectAnswerCount(0);

    // Ensure animations are at full visibility for game content
    fadeAnim.setValue(1);
    slideAnim.setValue(0);

    // Start battle animation
    Animated.timing(battleAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  };

  const handleAnswer = (selectedAnswer) => {
    // Prevent multiple selections for the same question
    if (answerLocked) {
      console.log("Answer already selected, ignoring additional clicks");
      return;
    }

    // Lock answers immediately to prevent double-clicking
    setAnswerLocked(true);

    const currentQuiz = quizzes[currentQuizIndex];
    const currentQuestion = currentQuiz.questions[currentQuestionIndex];
    const isCorrect = selectedAnswer.isCorrect;

    // Store user answer
    const answerKey = `${currentQuiz._id}-${currentQuestion._id}`;
    // Create updated answers object immediately (for synchronous access)
    const updatedAnswers = {
      ...userAnswers,
      [answerKey]: { answer: selectedAnswer, isCorrect },
    };
    setUserAnswers(updatedAnswers);
    if (isCorrect) {
      setCorrectAnswerCount((prev) => prev + 1);
    } else {
      setIncorrectAnswerCount((prev) => prev + 1);
    }

    // Haptic feedback
    if (Platform.OS !== "web") {
      Haptics.impactAsync(
        isCorrect
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Light
      );
    }

    // Calculate damage based on total number of questions
    const totalQuestions = quizzes.reduce(
      (acc, quiz) => acc + quiz.questions.length,
      0
    );
    const damagePerQuestion = Math.round(100 / totalQuestions);

    // Battle animations and health changes
    if (isCorrect) {
      setPlayerAction("attack");
      setPlayerAttackAnim(true);
      setBattleMessage("🗡️ Critical Hit! You damaged the enemy!");
      let newEnemyHealth = Math.max(0, enemyHealth - damagePerQuestion);

      // Check if this is the last question and all previous were correct
      const isLastQuestion =
        currentQuestionIndex === currentQuiz.questions.length - 1 &&
        currentQuizIndex === quizzes.length - 1;

      if (isLastQuestion) {
        // Count total correct answers including this one (use updatedAnswers)
        const totalCorrect = Object.values(updatedAnswers).filter(
          (a) => a.isCorrect
        ).length;
        // If all answers are correct (perfect score), force enemy HP to 0
        if (totalCorrect === totalQuestions) {
          newEnemyHealth = 0;
          console.log(
            "💯 Perfect Score! All answers correct - Enemy HP forced to 0"
          );
        }
      }

      setEnemyHealth(newEnemyHealth);
      setEnemyAction("hurt");
      setScore((prev) => prev + 100);

      setTimeout(() => {
        setPlayerAttackAnim(false);
        setPlayerAction("idle");
        setEnemyAction("idle");
      }, 600);

      // Check if enemy is defeated immediately after taking damage
      if (newEnemyHealth <= 0) {
        // Enemy defeated - complete the quest
        setTimeout(() => {
          if (currentQuestionIndex < currentQuiz.questions.length - 1) {
            // Next question in current quiz
            setCurrentQuestionIndex((prev) => prev + 1);
            setAnswerLocked(false);
          } else if (currentQuizIndex < quizzes.length - 1) {
            // Next quiz
            setCurrentQuizIndex((prev) => prev + 1);
            setCurrentQuestionIndex(0);
            setAnswerLocked(false);
            setBattleMessage(
              `Quest ${
                currentQuizIndex + 2
              } unlocked! Continuing the adventure...`
            );
          } else {
            // Quest completed - trigger ONCE with updated answers
            if (!completionInProgress) {
              setCompletionInProgress(true);
              setTimeout(() => completeQuest(updatedAnswers), 800);
            }
          }

          // Update progress
          const totalQuestions = quizzes.reduce(
            (acc, quiz) => acc + quiz.questions.length,
            0
          );
          const answeredQuestions = Object.keys(userAnswers).length + 1;
          setQuestProgress((answeredQuestions / totalQuestions) * 100);
        }, 100); // Short delay to ensure answer is saved

        return; // Stop processing the normal flow
      }
    } else {
      setEnemyAction("attack");
      setEnemyAttackAnim(true);
      setBattleMessage("💥 Enemy strikes back! You took damage!");
      const newPlayerHealth = Math.max(0, playerHealth - damagePerQuestion);
      setPlayerHealth(newPlayerHealth);
      setPlayerAction("hurt");

      setTimeout(() => {
        setEnemyAttackAnim(false);
        setEnemyAction("idle");
        setPlayerAction("idle");
      }, 600);

      // Check if player is defeated (health below 50%)
      if (newPlayerHealth < 50) {
        console.log(
          `💀 Player health dropped to ${newPlayerHealth}%! Triggering player defeat sequence...`
        );
        setIsPlayerDefeated(true);
        setBattleMessage(
          "💀 Defeat! You have been overwhelmed by the darkness..."
        );

        // Trigger player death animation immediately
        setTimeout(() => {
          console.log("🎭 Calling triggerDeathAnimation for player death...");
          triggerDeathAnimation(true, false);

          // Wait for death animation to complete before showing defeat screen
          setTimeout(async () => {
            console.log(
              "🏁 Recording XP for failed attempt and setting game completed after player death"
            );
            // Record completion and XP even for failed attempts (use updatedAnswers)
            const correctAnswers = Object.values(updatedAnswers).filter(
              (answer) => answer.isCorrect
            ).length;
            const totalQuestions = quizzes.reduce(
              (acc, quiz) => acc + quiz.questions.length,
              0
            );
            const failedScore = Math.round(
              (correctAnswers / totalQuestions) * 100
            );
            await markModuleCompleted(id, failedScore, updatedAnswers, {
              correctAnswers,
              incorrectAnswers: Math.max(totalQuestions - correctAnswers, 0),
              totalQuestions,
              questLevel: module?.level || module?.questLevel || 1,
            });
            setGameCompleted(true);
          }, 2500);
        }, 800);
        return; // Stop processing if player is defeated
      }
    }

    // Progress to next question or quiz
    setTimeout(() => {
      // No need to check enemy health here anymore since we check immediately after damage

      if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        // Next question in current quiz
        setCurrentQuestionIndex((prev) => prev + 1);
        setAnswerLocked(false); // Unlock answers for next question
      } else if (currentQuizIndex < quizzes.length - 1) {
        // Next quiz
        setCurrentQuizIndex((prev) => prev + 1);
        setCurrentQuestionIndex(0);
        setAnswerLocked(false); // Unlock answers for next quiz
        setBattleMessage(
          `Quest ${currentQuizIndex + 2} unlocked! Continuing the adventure...`
        );
      } else {
        // Quest completed - immediately call completeQuest with updated answers
        setCompletionInProgress(true);
        setTimeout(() => completeQuest(updatedAnswers), 200);
        return; // Exit early to prevent further processing
      }

      // Update progress
      const totalQuestions = quizzes.reduce(
        (acc, quiz) => acc + quiz.questions.length,
        0
      );
      const answeredQuestions = Object.keys(updatedAnswers).length;
      setQuestProgress((answeredQuestions / totalQuestions) * 100);

      // Check for low health states
      if (playerHealth <= 20 && playerHealth > 0) {
        setTimeout(() => {
          if (playerAction === "idle") setPlayerAction("hurt");
        }, 800);
      }
      if (enemyHealth <= 20 && enemyHealth > 0) {
        setTimeout(() => {
          if (enemyAction === "idle") setEnemyAction("hurt");
        }, 800);
      }
    }, 1500);
  };

  // Handle answers for different question types
  const handleCodeMissingAnswer = (answer) => {
    const currentQuiz = quizzes[currentQuizIndex];
    const currentQuestion = currentQuiz.questions[currentQuestionIndex];
    const isCorrect =
      answer.trim().toLowerCase() ===
      currentQuestion.correctAnswer.trim().toLowerCase();

    const selectedAnswer = { text: answer, isCorrect };
    handleAnswer(selectedAnswer);
  };

  const handleFillInBlanksAnswer = (blanks) => {
    const currentQuiz = quizzes[currentQuizIndex];
    const currentQuestion = currentQuiz.questions[currentQuestionIndex];

    // Check if all blanks are filled correctly
    const isCorrect = currentQuestion.blanks.every(
      (correctBlank, index) =>
        blanks[index] &&
        blanks[index].trim().toLowerCase() === correctBlank.trim().toLowerCase()
    );

    // Store individual blank answers for backend processing
    const blankAnswers = {};
    blanks.forEach((blank, index) => {
      blankAnswers[index] = blank || "";
    });

    const selectedAnswer = {
      text: blanks.join(", "), // For display purposes
      isCorrect,
      blanks: blankAnswers, // For backend submission
    };
    handleAnswer(selectedAnswer);
  };

  const handleCodeOrderingAnswer = (orderedBlocks) => {
    const currentQuiz = quizzes[currentQuizIndex];
    const currentQuestion = currentQuiz.questions[currentQuestionIndex];

    // Check if the order is correct
    const userOrder = orderedBlocks.map((block) => block.id);

    // Create the correct order based on position field
    const correctOrder = currentQuestion.codeBlocks
      .sort((a, b) => a.position - b.position) // Sort by position field
      .map((block) => block.id); // Get IDs in correct order

    // Check if user order matches correct order
    const isCorrect =
      userOrder.length === correctOrder.length &&
      userOrder.every((id, index) => id === correctOrder[index]);

    console.log("🔍 DEBUG: User order:", userOrder);
    console.log("🔍 DEBUG: Correct order:", correctOrder);
    console.log("🔍 DEBUG: Is correct:", isCorrect);

    // Store the ordered blocks data for backend submission
    const selectedAnswer = {
      text: "Code ordering",
      isCorrect,
      orderedBlocks: userOrder, // Store the ordered block IDs for backend
    };
    handleAnswer(selectedAnswer);
  };

  // Handle sorting/categorization answers
  const handleSortingAnswer = (categoryAnswers) => {
    const currentQuiz = quizzes[currentQuizIndex];
    const currentQuestion = currentQuiz.questions[currentQuestionIndex];

    console.log("🔍 DEBUG: Sorting - categoryAnswers:", categoryAnswers);
    console.log(
      "🔍 DEBUG: Sorting - currentQuestion.items:",
      currentQuestion.items
    );

    // Create itemPlacements object that maps item ID to category ID
    const itemPlacements = {};

    // Go through each category and map items to their category IDs
    categoryAnswers.forEach((categoryItems, categoryIndex) => {
      categoryItems.forEach((item) => {
        console.log(
          `🔍 DEBUG: Mapping item ${item.id} -> category ${categoryIndex}`
        );
        itemPlacements[item.id] = categoryIndex;
      });
    });

    console.log("🔍 DEBUG: Final itemPlacements:", itemPlacements);

    // Check if all items are correctly categorized
    let isCorrect = true;
    currentQuestion.items.forEach((item) => {
      const userPlacement = itemPlacements[item.id];
      console.log(
        `🔍 DEBUG: Item ${item.id} placed in ${userPlacement}, should be in ${item.categoryId}`
      );
      if (userPlacement !== item.categoryId) {
        isCorrect = false;
      }
    });

    const selectedAnswer = {
      text: "Categorization",
      isCorrect,
      itemPlacements, // Store item placements for backend (item ID -> category ID mapping)
    };
    handleAnswer(selectedAnswer);
  };

  // Handle cipher answers
  const handleCipherAnswer = (answer) => {
    const currentQuiz = quizzes[currentQuizIndex];
    const currentQuestion = currentQuiz.questions[currentQuestionIndex];

    const isCorrect =
      answer.trim().toLowerCase() ===
      currentQuestion.answer.trim().toLowerCase();

    const selectedAnswer = { text: answer, isCorrect };
    handleAnswer(selectedAnswer);
  };

  // Helper function for sorting questions
  const removeSortedItem = (categoryIndex, itemIndex) => {
    const newSortingAnswers = [...sortingAnswers];
    const removedItem = newSortingAnswers[categoryIndex][itemIndex];
    newSortingAnswers[categoryIndex].splice(itemIndex, 1);
    setSortingAnswers(newSortingAnswers);
    setAvailableItems([...availableItems, removedItem]);
  };

  const moveItemToCategory = (item, categoryIndex) => {
    // Remove item from available items
    const newAvailableItems = availableItems.filter(
      (availableItem) => availableItem !== item
    );
    setAvailableItems(newAvailableItems);

    // Add item to the selected category
    const newSortingAnswers = [...sortingAnswers];
    if (!newSortingAnswers[categoryIndex]) {
      newSortingAnswers[categoryIndex] = [];
    }
    newSortingAnswers[categoryIndex].push(item);
    setSortingAnswers(newSortingAnswers);
  };

  // Reset interactive question states
  const resetQuestionStates = useCallback(() => {
    setUserInput("");
    setSelectedBlanks([]);
    setOrderedBlocks([]);
    setSortingAnswers([]);
    setAvailableItems([]);
    setCipherAnswer("");

    // Initialize states based on current question (inline logic to avoid circular dependency)
    const currentQuestion =
      quizzes[currentQuizIndex]?.questions[currentQuestionIndex] || null;
    if (currentQuestion) {
      if (
        currentQuestion.questionType === "fillInBlanks" &&
        currentQuestion.blanks
      ) {
        setSelectedBlanks(new Array(currentQuestion.blanks.length).fill(""));
      }
      if (
        currentQuestion.questionType === "codeOrdering" &&
        currentQuestion.codeBlocks
      ) {
        // Initialize with empty order (user will build the order themselves like in quick-play)
        setOrderedBlocks([]);
      }
      if (
        currentQuestion.questionType === "sorting" &&
        currentQuestion.categories &&
        currentQuestion.items
      ) {
        // Initialize empty arrays for each category
        setSortingAnswers(currentQuestion.categories.map(() => []));
        // Initialize available items (all items start as available)
        setAvailableItems([...currentQuestion.items]);
      }
      if (currentQuestion.questionType === "cipher") {
        setCipherAnswer("");
      }
    }
  }, [quizzes, currentQuizIndex, currentQuestionIndex]);

  // Reset states when question changes
  useEffect(() => {
    resetQuestionStates();
  }, [currentQuizIndex, currentQuestionIndex, resetQuestionStates]);

  const completeQuest = async (answersToUse = null) => {
    if (gameCompleted || completionInProgress || showDeathAnimation) return;

    setCompletionInProgress(true);

    // Use provided answers or fall back to state
    // This ensures we include the most recent answer that may not be in state yet
    const finalAnswers = answersToUse || userAnswers;

    console.log(
      "🏁 COMPLETE QUEST CALLED - Calculating final score for submission"
    );
    console.log("📋 userAnswers object:", finalAnswers);
    console.log("📋 userAnswers count:", Object.keys(finalAnswers).length);

    const correctAnswers = Object.values(finalAnswers).filter(
      (answer) => answer.isCorrect
    ).length;
    const totalQuestions = quizzes.reduce(
      (acc, quiz) => acc + quiz.questions.length,
      0
    );
    const incorrectAnswers = Math.max(totalQuestions - correctAnswers, 0);

    setCorrectAnswerCount(correctAnswers);
    setIncorrectAnswerCount(incorrectAnswers);

    console.log(
      `📊 Score Calculation in completeQuest: ${correctAnswers} correct / ${totalQuestions} total questions`
    );

    // Calculate final score as percentage
    const finalScore = Math.round((correctAnswers / totalQuestions) * 100);

    console.log(`🎯 FINAL SCORE TO SUBMIT TO BACKEND: ${finalScore}%`);

    // PERFECT VICTORY: If all answers correct (100%), ensure enemy HP is exactly 0
    if (finalScore === 100) {
      setEnemyHealth(0);
      console.log("💯 Perfect Score! Enemy HP set to 0");
    }

    // Calculate stars based on score percentage (matching main screen: 34/65/90)
    const stars = calculateStarRating(finalScore);

    console.log(
      `Final Results: ${correctAnswers}/${totalQuestions} correct, ${finalScore}% score, ${playerHealth}% health remaining, ${stars} stars`
    );

    setStarRating(stars);

    // Update quest progress to show completion
    setQuestProgress(100);

    // Player wins if they have 50% or more health, defeated if below 50%
    const playerSurvived = playerHealth >= 50;

    if (playerSurvived) {
      // Player wins - enemy dies
      setBattleMessage(
        playerHealth === 100
          ? "🎉 Flawless Victory! No damage taken!"
          : playerHealth > 75
          ? "🎉 Excellent Victory! Minimal damage sustained!"
          : playerHealth >= 50
          ? "⚔️ Victory achieved! You survived the battle!"
          : "⚔️ Hard-fought Victory! You barely survived!"
      );

      // Trigger enemy death animation
      triggerDeathAnimation(false, true);

      // Wait for death animation to display (2.5s), then show loading while saving
      setTimeout(async () => {
        // Hide death animation first
        setShowDeathAnimation(false);

        // Small delay before showing loading screen
        setTimeout(async () => {
          // Show loading screen while saving
          setCompletionInProgress(true);

          // Record completion and XP with final answers
          await markModuleCompleted(id, finalScore, finalAnswers, {
            correctAnswers,
            incorrectAnswers,
            totalQuestions,
            questLevel: module?.level || module?.questLevel || 1,
          });

          // Hide loading and show completion screen
          setCompletionInProgress(false);
          setGameCompleted(true);
        }, 300);
      }, 2500);
    } else {
      // Player loses - player dies
      setBattleMessage(
        "💀 Defeat! You have been overwhelmed by the darkness..."
      );
      setIsPlayerDefeated(true);

      // Trigger player death animation
      triggerDeathAnimation(true, false);

      // Wait for death animation to display (2.5s), then show loading while saving
      setTimeout(async () => {
        // Hide death animation first
        setShowDeathAnimation(false);

        // Small delay before showing loading screen
        setTimeout(async () => {
          // Show loading screen while saving
          setCompletionInProgress(true);

          // Record completion and XP even for failed attempts with final answers
          await markModuleCompleted(id, finalScore, finalAnswers, {
            correctAnswers,
            incorrectAnswers,
            totalQuestions,
            questLevel: module?.level || module?.questLevel || 1,
          });

          // Hide loading and show completion screen
          setCompletionInProgress(false);
          setGameCompleted(true);
        }, 300);
      }, 2500);
    }
  };

  // Function to mark module as completed and unlock next one
  const markModuleCompleted = async (
    moduleId,
    score,
    answersToUse = null,
    attemptSummary = null
  ) => {
    try {
      // Use provided answers or fall back to state
      const finalAnswers = answersToUse || userAnswers;

      if (USE_DUMMY_GAME_DATA) {
        // For dummy data, store completion in AsyncStorage
        const completionData = {
          moduleId,
          score,
          correctAnswers: attemptSummary?.correctAnswers ?? null,
          incorrectAnswers: attemptSummary?.incorrectAnswers ?? null,
          questLevel: attemptSummary?.questLevel ?? module?.level ?? module?.questLevel ?? null,
          completedAt: new Date().toISOString(),
        };

        // Get existing completion data
        const existingDataString = await AsyncStorage.getItem(
          "moduleCompletions"
        );
        const existingData = existingDataString
          ? JSON.parse(existingDataString)
          : [];

        // Add or update completion for this module
        const updatedData = existingData.filter(
          (item) => item.moduleId !== moduleId
        );
        updatedData.push(completionData);

        await AsyncStorage.setItem(
          "moduleCompletions",
          JSON.stringify(updatedData)
        );
        console.log("Module completion saved locally:", completionData);
        return;
      }

      // Check if this is a cyber-quest or regular module
      if (module?.type === "cyber-quest") {
        console.log("Submitting cyber-quest:", module._id);
        console.log("Module data:", module);
        console.log("User answers object:", finalAnswers);
        const questLevel =
          attemptSummary?.questLevel || module?.level || module?.questLevel || 1;
        const correctAnswers =
          attemptSummary?.correctAnswers ??
          Object.values(finalAnswers).filter((answer) => answer.isCorrect).length;
        const totalQuestions =
          attemptSummary?.totalQuestions ??
          quizzes.reduce((acc, quiz) => acc + quiz.questions.length, 0);
        const incorrectAnswers =
          attemptSummary?.incorrectAnswers ??
          Math.max(totalQuestions - correctAnswers, 0);

        // Check if this is dummy data (ID starts with "dummy-")
        if (moduleId.includes("dummy-")) {
          console.log("Dummy cyber-quest detected, skipping API submission");
          return; // Don't make API calls for dummy data
        }

        // Submit cyber-quest attempt
        const answers = [];

        // Transform user answers to cyber-quest format
        const currentQuiz = quizzes[0]; // Cyber quest should have only one quiz
        console.log("Current quiz data:", currentQuiz);
        if (currentQuiz) {
          currentQuiz.questions.forEach((question, index) => {
            const answerKey = `${currentQuiz._id}-${question._id}`;
            const userAnswer = finalAnswers[answerKey];

            console.log(
              `Processing question ${index}, type: ${
                question.questionType || question.type
              }`
            );
            console.log(`User answer for question ${index}:`, userAnswer);

            // Handle different question types
            switch (question.questionType || question.type) {
              case "multipleChoice":
                if (userAnswer && userAnswer.answer) {
                  // For multiple choice, find the selected choice index
                  // Use 'options' instead of 'choices' to match the question structure
                  const selectedChoiceIndex = question.options?.findIndex(
                    (option) => option.text === userAnswer.answer.text
                  );

                  console.log(
                    `Question ${index}: Selected "${userAnswer.answer.text}" -> Index ${selectedChoiceIndex}`
                  );
                  answers.push({
                    selectedChoiceIndex:
                      selectedChoiceIndex >= 0 ? selectedChoiceIndex : -1,
                  });
                } else {
                  // No answer selected, send -1 to mark as incorrect
                  console.log(
                    `Question ${index}: No answer selected, sending -1 (unanswered)`
                  );
                  answers.push({ selectedChoiceIndex: -1 });
                }
                break;

              case "codeMissing":
                if (userAnswer && userAnswer.answer) {
                  // For code missing questions, send the text answer
                  console.log(
                    `Question ${index}: Code missing answer "${userAnswer.answer.text}"`
                  );
                  answers.push({
                    answer: userAnswer.answer.text,
                  });
                } else {
                  // No answer, send empty string
                  console.log(
                    `Question ${index}: No code missing answer, sending empty string`
                  );
                  answers.push({ answer: "" });
                }
                break;

              case "fillInBlanks":
                if (
                  userAnswer &&
                  userAnswer.answer &&
                  userAnswer.answer.blanks
                ) {
                  // For fill in blanks, send the answers object
                  console.log(
                    `Question ${index}: Fill in blanks answers:`,
                    userAnswer.answer.blanks
                  );
                  answers.push({
                    answers: userAnswer.answer.blanks,
                  });
                } else {
                  // No answers, send empty object
                  console.log(
                    `Question ${index}: No fill in blanks answers, sending empty object`
                  );
                  answers.push({ answers: {} });
                }
                break;

              case "codeOrdering":
                if (
                  userAnswer &&
                  userAnswer.answer &&
                  userAnswer.answer.orderedBlocks
                ) {
                  // For code ordering, send the ordered blocks
                  console.log(
                    `Question ${index}: Code ordering blocks:`,
                    userAnswer.answer.orderedBlocks
                  );
                  answers.push({
                    orderedBlocks: userAnswer.answer.orderedBlocks,
                  });
                } else {
                  // No ordering, send empty array
                  console.log(
                    `Question ${index}: No code ordering, sending empty array`
                  );
                  answers.push({ orderedBlocks: [] });
                }
                break;

              case "sorting":
                if (
                  userAnswer &&
                  userAnswer.answer &&
                  userAnswer.answer.itemPlacements
                ) {
                  // For sorting questions, send the item placements
                  console.log(
                    `Question ${index}: Sorting answer:`,
                    userAnswer.answer.itemPlacements
                  );
                  answers.push({
                    itemPlacements: userAnswer.answer.itemPlacements,
                  });
                } else {
                  // No sorting, send empty object
                  console.log(
                    `Question ${index}: No sorting answer, sending empty object`
                  );
                  answers.push({ itemPlacements: {} });
                }
                break;

              case "cipher":
                if (userAnswer && userAnswer.answer) {
                  // For cipher questions, send the decoded answer
                  console.log(
                    `Question ${index}: Cipher answer "${userAnswer.answer.text}"`
                  );
                  answers.push({
                    answer: userAnswer.answer.text,
                  });
                } else {
                  // No answer, send empty string
                  console.log(
                    `Question ${index}: No cipher answer, sending empty string`
                  );
                  answers.push({ answer: "" });
                }
                break;

              default:
                console.warn(
                  `Unknown question type: ${
                    question.questionType || question.type
                  }, defaulting to multiple choice`
                );
                answers.push({ selectedChoiceIndex: 0 });
                break;
            }
          });
        }

        const response = await fetch(
          `${API_URL}/cyber-quests/${module._id}/submit`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              answers,
              correctAnswers,
              incorrectAnswers,
              questLevel,
              totalQuestions,
            }),
          }
        );

        console.log("Cyber quest submission response status:", response.status);
        console.log(
          "Cyber quest submission URL:",
          `${API_URL}/cyber-quests/${module._id}/submit`
        );
        console.log("Cyber quest submission answers:", answers);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Cyber quest submission error details:", errorText);
          throw new Error(
            `Failed to submit cyber quest: ${response.status} - ${errorText}`
          );
        }

        const result = await response.json();
        console.log("Cyber quest submission result:", result);

        // Handle XP and level information
        if (result.success && result.result) {
          const {
            xpEarned: earned,
            totalXP: total,
            currentLevel: level,
          } = result.result;

          setXpEarned(earned || 0);
          setTotalXP(total || 0);
          setCurrentLevel(level || 1);

          console.log(
            `🎯 XP Earned: ${earned}, Total XP: ${total}, Current Level: ${level}`
          );
          console.log(
            `📊 CyberQuest attempt summary: Correct ${correctAnswers}, Incorrect ${incorrectAnswers}, Level ${questLevel}`
          );
        }

        // Handle level progression
        if (result.success && result.result.levelProgression) {
          const { levelProgression } = result.result;
          console.log("Level progression info:", levelProgression);

          if (levelProgression.levelProgressed) {
            setLevelUp(true);
            console.log(
              `🎉 Level up! You've reached Level ${levelProgression.newLevel}!`
            );
            // You can show a level up notification here
            // showLevelUpNotification(levelProgression.newLevel);
          }

          console.log(`Current level: ${levelProgression.currentLevel}`);
          console.log(`Max level reached: ${levelProgression.maxLevelReached}`);
        }
      } else {
        // Real API call for regular modules

        // Check if this is dummy data (ID starts with "dummy-")
        if (moduleId.includes("dummy-")) {
          console.log("Dummy module detected, skipping API submission");
          return; // Don't make API calls for dummy data
        }

        const response = await fetch(`${API_URL}/progress/complete-module`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            moduleId,
            score,
            questType: "module",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save completion");
        }

        const result = await response.json();
        console.log("Module completion result:", result);

        // Handle XP and level information
        if (result.xpEarned !== undefined) {
          setXpEarned(result.xpEarned || 0);
          setTotalXP(result.totalXP || 0);
          setCurrentLevel(result.currentLevel || 1);
          setLevelUp(result.levelUp || false);

          console.log(
            `🎯 Module XP Earned: ${result.xpEarned}, Total XP: ${result.totalXP}, Current Level: ${result.currentLevel}`
          );
        }

        console.log("Module completion saved to server");
      }
    } catch (error) {
      console.error("Error saving module completion:", error);
      // Don't break the user experience if saving fails
    }
  };

  const getCurrentQuestion = useCallback(() => {
    if (!quizzes[currentQuizIndex]) return null;
    return quizzes[currentQuizIndex].questions[currentQuestionIndex];
  }, [quizzes, currentQuizIndex, currentQuestionIndex]);

  const isGameFinished = () => {
    // Check if we've gone beyond all available questions
    if (currentQuizIndex >= quizzes.length) return true;
    const currentQuiz = quizzes[currentQuizIndex];
    if (!currentQuiz) return true;
    return currentQuestionIndex >= currentQuiz.questions.length;
  };

  const formatProgress = () => {
    const totalQuestions = quizzes.reduce(
      (acc, quiz) => acc + quiz.questions.length,
      0
    );
    const currentPosition =
      currentQuizIndex * (quizzes[currentQuizIndex]?.questions.length || 0) +
      currentQuestionIndex +
      1;
    return `${currentPosition}/${totalQuestions}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your quest...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons
          name="alert-octagon"
          size={60}
          color={COLORS.error}
        />
        <Text style={styles.errorText}>Quest failed: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={retryLoading}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!gameStarted) {
    return (
      <ImageBackground source={currentBackground} style={styles.container}>
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.5)"]}
          style={styles.overlay}
        >
          <Animated.View
            style={[
              styles.questIntro,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <MaterialCommunityIcons
              name="sword-cross"
              size={80}
              color="#FFD700"
            />
            <Text style={styles.questTitle}>{module?.title}</Text>
            <Text style={styles.questDescription}>{module?.description}</Text>

            <View style={styles.questStats}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons
                  name="shield-sword"
                  size={24}
                  color="#4CAF50"
                />
                <Text style={styles.statText}>{quizzes.length} Battles</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons
                  name="target"
                  size={24}
                  color="#FF9800"
                />
                <Text style={styles.statText}>
                  {quizzes.reduce(
                    (acc, quiz) => acc + quiz.questions.length,
                    0
                  )}{" "}
                  Challenges
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons
                  name="trophy"
                  size={24}
                  color="#FFD700"
                />
                <Text style={styles.statText}>Epic Rewards</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.startQuestButton}
              onPress={startQuest}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark || "#1565C0"]}
                style={styles.buttonGradient}
              >
                <MaterialCommunityIcons name="play" size={24} color="#ffffff" />
                <Text style={styles.startQuestText}>Begin Epic Quest</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={navigateToAdventureMap}
            >
              <Text style={styles.backButtonText}>← Back to Adventure Map</Text>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
      </ImageBackground>
    );
  }

  if (gameCompleted) {
    console.log("🎮 GAME COMPLETED SCREEN - Calculating final display score");
    console.log("📋 userAnswers object:", userAnswers);
    console.log("📋 userAnswers count:", Object.keys(userAnswers).length);

    const correctAnswers = Object.values(userAnswers).filter(
      (answer) => answer.isCorrect
    ).length;
    const totalQuestions = quizzes.reduce(
      (acc, quiz) => acc + quiz.questions.length,
      0
    );

    console.log(
      `📊 Score Calculation: ${correctAnswers} correct / ${totalQuestions} total questions`
    );

    const finalScore = Math.round((correctAnswers / totalQuestions) * 100);

    console.log(`🎯 FINAL SCORE FOR DISPLAY: ${finalScore}%`);

    // Calculate stars based on finalScore (matching main screen: 34/65/90)
    const displayStars = calculateStarRating(finalScore);

    // Render star icons
    const renderStars = () => {
      const stars = [];
      for (let i = 0; i < 3; i++) {
        stars.push(
          <MaterialCommunityIcons
            key={i}
            name={i < displayStars ? "star" : "star-outline"}
            size={30}
            color={i < displayStars ? "#FFD700" : "#666666"}
            style={{ marginHorizontal: 2 }}
          />
        );
      }
      return stars;
    };

    return (
      <ImageBackground source={currentBackground} style={styles.container}>
        <LinearGradient
          colors={["rgba(0,0,0,0.8)", "rgba(0,0,0,0.6)"]}
          style={styles.overlay}
        >
          <View style={styles.questComplete}>
            {/* Result Icon */}
            <MaterialCommunityIcons
              name={
                isPlayerDefeated
                  ? "skull"
                  : starRating === 3
                  ? "trophy"
                  : starRating >= 1
                  ? "shield-check"
                  : "shield"
              }
              size={100}
              color={
                isPlayerDefeated
                  ? "#FF4444"
                  : starRating === 3
                  ? "#FFD700"
                  : starRating >= 1
                  ? "#4CAF50"
                  : "#FF9800"
              }
            />

            {/* Title */}
            <Text style={styles.questCompleteTitle}>
              {isPlayerDefeated
                ? "Defeated!"
                : starRating === 3
                ? "Perfect Victory!"
                : starRating === 2
                ? "Excellent!"
                : starRating === 1
                ? "Victory!"
                : "Quest Completed!"}
            </Text>

            {/* Star Rating */}
            <View style={styles.starRatingContainer}>{renderStars()}</View>

            {/* Score and Stats */}
            <Text style={styles.questCompleteScore}>
              {isPlayerDefeated ? "Score: 0%" : `Score: ${finalScore}%`}
            </Text>
            <Text style={styles.questCompleteStats}>
              {correctAnswers}/{totalQuestions} challenges conquered
            </Text>

            {/* Progress Bar showing final progress */}
            <View style={styles.finalProgressContainer}>
              <Text style={styles.finalProgressText}>
                Quest Progress:{" "}
                {isPlayerDefeated
                  ? "0/4"
                  : `${Math.min(4, Math.ceil((finalScore / 100) * 4))}/4`}
              </Text>
              <View style={styles.finalProgressBar}>
                <View
                  style={[
                    styles.finalProgressFill,
                    { width: isPlayerDefeated ? "0%" : `${questProgress}%` },
                  ]}
                />
              </View>
            </View>

            {/* Rewards Section */}
            <View style={styles.rewardsSection}>
              <Text style={styles.rewardsTitle}>
                {isPlayerDefeated ? "No Rewards Earned" : "Rewards Earned:"}
              </Text>
              {!isPlayerDefeated && (
                <View style={styles.rewardsList}>
                  <View style={styles.rewardItem}>
                    <MaterialCommunityIcons
                      name="star"
                      size={20}
                      color="#FFD700"
                    />
                    <Text style={styles.rewardText}>
                      {xpEarned > 0
                        ? `${xpEarned} XP Points`
                        : `${score} XP Points`}
                    </Text>
                  </View>
                  {levelUp && (
                    <View style={styles.rewardItem}>
                      <MaterialCommunityIcons
                        name="trophy"
                        size={20}
                        color="#4CAF50"
                      />
                      <Text
                        style={[
                          styles.rewardText,
                          { color: "#4CAF50", fontWeight: "bold" },
                        ]}
                      >
                        🎉 Level Up! Level {currentLevel}
                      </Text>
                    </View>
                  )}
                  <View style={styles.rewardItem}>
                    <MaterialCommunityIcons
                      name="medal"
                      size={20}
                      color="#FF9800"
                    />
                    <Text style={styles.rewardText}>
                      {starRating === 3
                        ? "Legendary Badge"
                        : starRating === 2
                        ? "Epic Badge"
                        : starRating === 1
                        ? "Quest Badge"
                        : "Participation Badge"}
                    </Text>
                  </View>
                  {starRating === 3 && (
                    <View style={styles.rewardItem}>
                      <MaterialCommunityIcons
                        name="crown"
                        size={20}
                        color="#FFD700"
                      />
                      <Text style={styles.rewardText}>Perfect Crown</Text>
                    </View>
                  )}
                  {totalXP >= 0 && (
                    <View style={styles.rewardItem}>
                      <MaterialCommunityIcons
                        name="chart-line"
                        size={20}
                        color="#2196F3"
                      />
                      <Text style={styles.rewardText}>
                        Total XP: {totalXP} (Level {currentLevel})
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              {isPlayerDefeated ? (
                <>
                  <TouchableOpacity
                    style={styles.defeatRetryButton}
                    onPress={() => {
                      // Reset game state for retry
                      setGameCompleted(false);
                      setCompletionInProgress(false);
                      setGameStarted(false);
                      setIsPlayerDefeated(false);
                      setShowDeathAnimation(false);
                      setDeathAnimationComplete(false);
                      setPlayerHealth(100);
                      setEnemyHealth(100);
                      setPlayerAction("idle");
                      setEnemyAction("idle");
                      setCurrentQuizIndex(0);
                      setCurrentQuestionIndex(0);
                      setUserAnswers({});
                      setScore(0);
                      setQuestProgress(0);
                      setStarRating(0);
                      setBattleMessage("");
                    }}
                  >
                    <MaterialCommunityIcons
                      name="restart"
                      size={20}
                      color="#ffffff"
                    />
                    <Text style={styles.defeatRetryButtonText}>Try Again</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.backToMapButton}
                    onPress={navigateToAdventureMap}
                  >
                    <Text style={styles.backToMapButtonText}>
                      ← Back to Adventure Map
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.continueButton}
                    onPress={() => {
                      // Handle navigation for different data types
                      if (id.includes("dummy-")) {
                        // Dummy data navigation
                        const currentLevelNumber = parseInt(id.split("-")[1]);
                        const nextLevelId = `dummy-${currentLevelNumber + 1}`;

                        // Check if next level exists (assuming we have up to 20 levels)
                        if (currentLevelNumber < 19) {
                          router.push({
                            pathname: `/module/game/${nextLevelId}`,
                            params: {
                              returnSubjectId: normalizedReturnSubjectId || "",
                              returnModuleId: nextLevelId,
                            },
                          });
                        } else {
                          navigateToAdventureMap();
                        }
                      } else {
                        // Real data navigation - just go back to map
                        // The map will show the updated progress and next available level
                        navigateToAdventureMap();
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name={(() => {
                        if (id.includes("dummy-")) {
                          const currentLevelNumber = parseInt(id.split("-")[1]);
                          return currentLevelNumber < 19
                            ? "arrow-right"
                            : "trophy";
                        } else {
                          return "home";
                        }
                      })()}
                      size={20}
                      color="#ffffff"
                    />
                    <Text style={styles.continueButtonText}>
                      {(() => {
                        if (id.includes("dummy-")) {
                          const currentLevelNumber = parseInt(id.split("-")[1]);
                          return currentLevelNumber < 19
                            ? "Next Level"
                            : "Adventure Complete";
                        } else {
                          return "Return to Map";
                        }
                      })()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.backToMapButton}
                    onPress={navigateToAdventureMap}
                  >
                    <Text style={styles.backToMapButtonText}>
                      ← Back to Adventure Map
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    );
  }

  const currentQuestion = getCurrentQuestion();

  // If we've finished all questions but game isn't marked complete yet, trigger completion
  if (
    isGameFinished() &&
    !gameCompleted &&
    !completionInProgress &&
    gameStarted
  ) {
    setCompletionInProgress(true);
    setTimeout(() => {
      completeQuest();
    }, 100);
  }

  // Only show loading if we're not finished and don't have a current question
  if (
    !currentQuestion &&
    !gameCompleted &&
    !isGameFinished() &&
    !completionInProgress
  ) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading next challenge...</Text>
      </View>
    );
  }

  // If we somehow get here without a question but should be completed, show completion screen
  if (!currentQuestion && !gameCompleted && isGameFinished()) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Completing quest...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={currentBackground}
      style={styles.container}
      resizeMode={Platform.OS === "web" ? "cover" : "cover"}
      imageStyle={
        Platform.OS === "web"
          ? {
              width: "100%",
              height: "100%",
              resizeMode: "cover",
            }
          : undefined
      }
    >
      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.4)"]}
        style={styles.overlay}
      >
        {/* Battle Header */}
        <View style={styles.battleHeader}>
          <View style={styles.progressSection}>
            <Text style={styles.questProgressText}>
              Quest Progress: {formatProgress()}
            </Text>
            {module?.type === "cyber-quest" && (
              <Text style={styles.questProgressText}>
                Correct: {correctAnswerCount} • Incorrect: {incorrectAnswerCount} • Level: {module?.level || module?.questLevel || 1}
              </Text>
            )}
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${questProgress}%` }]}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.exitButton}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Battle Message - Moved to top */}
        <View style={styles.battleMessageContainer}>
          <Text style={styles.battleMessage}>{battleMessage}</Text>
        </View>

        {/* Battle Arena */}
        <View style={styles.battleArena}>
          {/* Player Character - Cyborg */}
          <Animated.View
            style={[
              styles.playerCharacter,
              { transform: [{ scale: playerAttackAnim ? 1.05 : 1 }] },
            ]}
          >
            <CharacterSprite
              spriteSet={cyborg_sprites}
              frames={cyborg_frames}
              action={playerAction}
              size={Platform.OS === "web" ? 96 : 120}
              flipped={false}
              speed={150}
              style={[
                styles.characterSprite,
                { alignSelf: "center", marginLeft: -10 },
              ]}
            />
            <View style={styles.healthBarContainer}>
              <Text style={styles.healthLabel}>Player</Text>
              <View style={styles.healthBar}>
                <View
                  style={[
                    styles.healthFill,
                    styles.playerHealthFill,
                    { width: `${playerHealth}%` },
                  ]}
                />
              </View>
              <Text style={styles.healthPoints}>{playerHealth}/100</Text>
            </View>
          </Animated.View>

          {/* Enemy Character - Difficulty Based */}
          <Animated.View
            style={[
              styles.enemyCharacter,
              { transform: [{ scale: enemyAttackAnim ? 1.05 : 1 }] },
            ]}
          >
            <CharacterSprite
              spriteSet={getEnemySprites().sprites}
              frames={getEnemySprites().frames}
              action={enemyAction}
              size={Platform.OS === "web" ? 96 : 120}
              flipped={true}
              speed={150}
              style={[
                styles.characterSprite,
                { alignSelf: "center", marginLeft: 10 },
              ]}
            />
            <View style={styles.healthBarContainer}>
              <Text style={styles.healthLabel}>{getEnemySprites().name}</Text>
              <View style={styles.healthBar}>
                <View
                  style={[
                    styles.healthFill,
                    styles.enemyHealthFill,
                    { width: `${enemyHealth}%` },
                  ]}
                />
              </View>
              <Text style={styles.healthPoints}>{enemyHealth}/100</Text>
            </View>
          </Animated.View>
        </View>

        {/* Question Section */}
        {currentQuestion && !showDeathAnimation && (
          <Animated.View
            style={[styles.questionSection, { opacity: fadeAnim }]}
          >
            <ScrollView
              style={styles.questionScrollContainer}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <View style={styles.questionHeader}>
                <MaterialCommunityIcons
                  name="sword"
                  size={24}
                  color={COLORS.primary}
                />
                <Text style={styles.currentQuizTitle}>
                  {quizzes[currentQuizIndex]?.title}
                </Text>
                {/* Hint Button */}
                <TouchableOpacity
                  style={styles.hintButton}
                  onPress={() => setShowHintModal(true)}
                >
                  <MaterialCommunityIcons
                    name="information"
                    size={20}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.questionText}>
                {currentQuestion.questionText}
              </Text>

              {/* Render different question types */}
              {currentQuestion.questionType === "multipleChoice" &&
                currentQuestion.options && (
                  <ScrollView
                    style={styles.optionsScrollContainer}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    <View style={styles.optionsContainer}>
                      {currentQuestion.options.map((option, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.optionButton,
                            (answerLocked || showDeathAnimation) &&
                              styles.optionButtonDisabled,
                          ]}
                          onPress={() => handleAnswer(option)}
                          activeOpacity={
                            answerLocked || showDeathAnimation ? 1 : 0.8
                          }
                          disabled={answerLocked || showDeathAnimation}
                        >
                          <LinearGradient
                            colors={
                              answerLocked || showDeathAnimation
                                ? [
                                    "rgba(128,128,128,0.3)",
                                    "rgba(128,128,128,0.1)",
                                  ]
                                : [
                                    "rgba(255,255,255,0.1)",
                                    "rgba(255,255,255,0.05)",
                                  ]
                            }
                            style={styles.optionGradient}
                          >
                            <Text
                              style={[
                                styles.optionLetter,
                                (answerLocked || showDeathAnimation) &&
                                  styles.optionTextDisabled,
                              ]}
                            >
                              {String.fromCharCode(65 + index)}
                            </Text>
                            <Text
                              style={[
                                styles.optionText,
                                (answerLocked || showDeathAnimation) &&
                                  styles.optionTextDisabled,
                              ]}
                            >
                              {option.text}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}

              {/* Code Missing Question */}
              {currentQuestion.questionType === "codeMissing" && (
                <View style={styles.codeQuestionContainer}>
                  <Text style={styles.helperText}>
                    Complete the missing code:
                  </Text>

                  <ScrollView
                    style={styles.codeContentScrollView}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                  >
                    <View style={styles.codeTemplateContainer}>
                      <Text style={styles.codeTemplateLabel}>
                        Code Template:
                      </Text>
                      <ScrollView
                        style={styles.codeTemplateScrollContainer}
                        nestedScrollEnabled
                      >
                        <Text style={styles.codeTemplateText}>
                          {currentQuestion.codeTemplate}
                        </Text>
                      </ScrollView>
                    </View>

                    <View style={styles.codeInputContainer}>
                      <Text style={styles.inputLabel}>Your Answer:</Text>
                      <TextInput
                        value={userInput}
                        onChangeText={setUserInput}
                        placeholder="Enter the missing code..."
                        style={styles.codeInput}
                        placeholderTextColor="#999"
                        editable={!answerLocked && !showDeathAnimation}
                        multiline
                      />
                    </View>
                  </ScrollView>

                  {/* Submit button outside scroll view - always visible */}
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (!userInput.trim() ||
                        answerLocked ||
                        showDeathAnimation) &&
                        styles.submitButtonDisabled,
                    ]}
                    onPress={() => handleCodeMissingAnswer(userInput)}
                    disabled={
                      !userInput.trim() || answerLocked || showDeathAnimation
                    }
                  >
                    <Text style={styles.submitButtonText}>Submit Answer</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Fill in Blanks Question */}
              {currentQuestion.questionType === "fillInBlanks" && (
                <View style={styles.fillBlanksContainer}>
                  <Text style={styles.helperText}>Fill in the blanks:</Text>

                  <ScrollView
                    style={styles.fillBlanksScrollView}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled
                  >
                    {currentQuestion.blanks.map((_, index) => (
                      <View key={index} style={styles.blankInputContainer}>
                        <Text style={styles.blankNumber}>
                          Blank #{index + 1}:
                        </Text>
                        <TextInput
                          value={selectedBlanks[index] || ""}
                          onChangeText={(text) => {
                            const newBlanks = [...selectedBlanks];
                            newBlanks[index] = text;
                            setSelectedBlanks(newBlanks);
                          }}
                          placeholder={`Enter answer for blank ${index + 1}...`}
                          style={styles.blankInput}
                          placeholderTextColor="#999"
                          editable={!answerLocked && !showDeathAnimation}
                        />
                      </View>
                    ))}
                  </ScrollView>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (selectedBlanks.length < currentQuestion.blanks.length ||
                        selectedBlanks.some((blank) => !blank?.trim()) ||
                        answerLocked ||
                        showDeathAnimation) &&
                        styles.submitButtonDisabled,
                    ]}
                    onPress={() => handleFillInBlanksAnswer(selectedBlanks)}
                    disabled={
                      selectedBlanks.length < currentQuestion.blanks.length ||
                      selectedBlanks.some((blank) => !blank?.trim()) ||
                      answerLocked ||
                      showDeathAnimation
                    }
                  >
                    <Text style={styles.submitButtonText}>Submit Answers</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Code Ordering Question */}
              {currentQuestion.questionType === "codeOrdering" &&
                (() => {
                  console.log("🔍 DEBUG: Rendering Code Ordering Question");
                  console.log("🔍 DEBUG: Current Question:", currentQuestion);
                  console.log(
                    "🔍 DEBUG: Code Blocks Array:",
                    currentQuestion.codeBlocks
                  );
                  console.log("🔍 DEBUG: Ordered Blocks State:", orderedBlocks);
                  return true;
                })() && (
                  <View style={styles.codeOrderingContainer}>
                    <Text style={styles.inputLabel}>
                      Arrange the code blocks in the correct order:
                    </Text>

                    <ScrollView
                      style={styles.codeOrderingScrollView}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled
                    >
                      {/* Ordered blocks section */}
                      <View style={styles.orderedBlocksContainer}>
                        <Text style={styles.sectionTitle}>Your Order:</Text>
                        <ScrollView
                          style={styles.orderedBlocksScrollView}
                          showsVerticalScrollIndicator={true}
                          nestedScrollEnabled
                        >
                          {orderedBlocks.map((blockId, index) => {
                            const block = currentQuestion.codeBlocks?.find(
                              (b) => b.id === blockId
                            );
                            console.log(
                              "🔍 DEBUG: Ordered block:",
                              blockId,
                              block
                            );
                            return (
                              <View key={index} style={styles.orderedBlock}>
                                <ScrollView
                                  horizontal
                                  showsHorizontalScrollIndicator={false}
                                  style={styles.orderedBlockScrollView}
                                >
                                  <Text style={styles.codeBlockText}>
                                    {index + 1}.{" "}
                                    {block?.code || "NO CODE FOUND"}
                                  </Text>
                                </ScrollView>
                                <TouchableOpacity
                                  onPress={() => {
                                    if (!answerLocked && !showDeathAnimation) {
                                      const newOrder = [...orderedBlocks];
                                      newOrder.splice(index, 1);
                                      setOrderedBlocks(newOrder);
                                    }
                                  }}
                                  disabled={answerLocked || showDeathAnimation}
                                >
                                  <MaterialCommunityIcons
                                    name="close-circle"
                                    size={20}
                                    color="#FF4444"
                                  />
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                          {orderedBlocks.length === 0 && (
                            <Text style={styles.emptyOrderText}>
                              Tap code blocks below to add them here
                            </Text>
                          )}
                        </ScrollView>
                      </View>

                      {/* Available blocks section */}
                      <View style={styles.availableBlocksContainer}>
                        <Text style={styles.sectionTitle}>
                          Available Blocks:
                        </Text>
                        <ScrollView
                          style={styles.availableBlocksScrollView}
                          showsVerticalScrollIndicator={true}
                          nestedScrollEnabled
                        >
                          {currentQuestion.codeBlocks
                            ?.filter(
                              (block) => !orderedBlocks.includes(block.id)
                            )
                            .sort(() => Math.random() - 0.5) // Randomly shuffle the available blocks
                            .map((block) => {
                              console.log("🔍 DEBUG: Rendering block:", block);
                              console.log("🔍 DEBUG: Block code:", block?.code);

                              return (
                                <TouchableOpacity
                                  key={block.id}
                                  style={[
                                    styles.availableBlock,
                                    (answerLocked || showDeathAnimation) &&
                                      styles.codeBlockDisabled,
                                  ]}
                                  onPress={() => {
                                    if (!answerLocked && !showDeathAnimation) {
                                      console.log(
                                        "🔍 DEBUG: Block clicked:",
                                        block.id,
                                        block.code
                                      );
                                      const newOrder = [
                                        ...orderedBlocks,
                                        block.id,
                                      ];
                                      setOrderedBlocks(newOrder);
                                    }
                                  }}
                                  disabled={answerLocked || showDeathAnimation}
                                >
                                  <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.codeBlockScrollView}
                                  >
                                    <Text style={styles.codeBlockText}>
                                      {block.code || "NO CODE FOUND"}
                                    </Text>
                                  </ScrollView>
                                </TouchableOpacity>
                              );
                            })}
                        </ScrollView>
                      </View>
                    </ScrollView>

                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        (orderedBlocks.length !==
                          (currentQuestion.codeBlocks?.length || 0) ||
                          answerLocked ||
                          showDeathAnimation) &&
                          styles.submitButtonDisabled,
                      ]}
                      onPress={() =>
                        handleCodeOrderingAnswer(
                          orderedBlocks.map((id) =>
                            currentQuestion.codeBlocks?.find((b) => b.id === id)
                          )
                        )
                      }
                      disabled={
                        orderedBlocks.length !==
                          (currentQuestion.codeBlocks?.length || 0) ||
                        answerLocked ||
                        showDeathAnimation
                      }
                    >
                      <Text style={styles.submitButtonText}>Submit Order</Text>
                    </TouchableOpacity>
                  </View>
                )}

              {/* Sorting/Categorization Question */}
              {currentQuestion.questionType === "sorting" && (
                <View style={styles.sortingContainer}>
                  <Text style={styles.helperText}>
                    Drag items into the correct categories:
                  </Text>

                  <ScrollView
                    style={styles.sortingScrollView}
                    nestedScrollEnabled
                  >
                    {/* Categories */}
                    <View style={styles.categoriesContainer}>
                      {currentQuestion.categories?.map(
                        (category, categoryIndex) => (
                          <View key={categoryIndex} style={styles.categoryBox}>
                            <Text style={styles.categoryTitle}>{category}</Text>
                            <View style={styles.categoryItems}>
                              {sortingAnswers[categoryIndex]?.map(
                                (item, itemIndex) => (
                                  <TouchableOpacity
                                    key={itemIndex}
                                    style={styles.sortedItem}
                                    onPress={() => {
                                      if (
                                        !answerLocked &&
                                        !showDeathAnimation
                                      ) {
                                        removeSortedItem(
                                          categoryIndex,
                                          itemIndex
                                        );
                                      }
                                    }}
                                    disabled={
                                      answerLocked || showDeathAnimation
                                    }
                                  >
                                    <Text style={styles.sortedItemText}>
                                      {item.text}
                                    </Text>
                                  </TouchableOpacity>
                                )
                              )}
                            </View>
                          </View>
                        )
                      )}
                    </View>

                    {/* Available items to sort */}
                    <View style={styles.itemsToSortContainer}>
                      <Text style={styles.sectionTitle}>Items to Sort:</Text>
                      <View style={styles.itemsGrid}>
                        {availableItems.map((item, index) => (
                          <View key={index} style={styles.itemToSortContainer}>
                            <Text style={styles.itemText}>{item.text}</Text>
                            <View style={styles.categorySelectorButtons}>
                              {currentQuestion.categories?.map(
                                (category, catIndex) => (
                                  <TouchableOpacity
                                    key={catIndex}
                                    style={[
                                      styles.categoryButton,
                                      (answerLocked || showDeathAnimation) &&
                                        styles.itemDisabled,
                                    ]}
                                    onPress={() => {
                                      if (
                                        !answerLocked &&
                                        !showDeathAnimation
                                      ) {
                                        moveItemToCategory(item, catIndex);
                                      }
                                    }}
                                    disabled={
                                      answerLocked || showDeathAnimation
                                    }
                                  >
                                    <Text style={styles.categoryButtonText}>
                                      {catIndex + 1}
                                    </Text>
                                  </TouchableOpacity>
                                )
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  </ScrollView>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (availableItems.length > 0 ||
                        answerLocked ||
                        showDeathAnimation) &&
                        styles.submitButtonDisabled,
                    ]}
                    onPress={() => handleSortingAnswer(sortingAnswers)}
                    disabled={
                      availableItems.length > 0 ||
                      answerLocked ||
                      showDeathAnimation
                    }
                  >
                    <Text style={styles.submitButtonText}>
                      Submit Categories
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Cipher/Cryptogram Question */}
              {currentQuestion.questionType === "cipher" && (
                <View style={styles.cipherContainer}>
                  <Text style={styles.helperText}>
                    Decode the scrambled letters to find the answer:
                  </Text>

                  {currentQuestion.scrambledHint && (
                    <View style={styles.scrambledHintContainer}>
                      <Text style={styles.scrambledHintLabel}>
                        Scrambled Letters:
                      </Text>
                      <Text style={styles.scrambledHintText}>
                        {currentQuestion.scrambledHint}
                      </Text>
                    </View>
                  )}

                  <View style={styles.cipherInputContainer}>
                    <Text style={styles.inputLabel}>Your Answer:</Text>
                    <TextInput
                      value={cipherAnswer}
                      onChangeText={setCipherAnswer}
                      placeholder="Enter the decoded answer..."
                      style={styles.cipherInput}
                      placeholderTextColor="#999"
                      editable={!answerLocked && !showDeathAnimation}
                      autoCapitalize="characters"
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (!cipherAnswer.trim() ||
                        answerLocked ||
                        showDeathAnimation) &&
                        styles.submitButtonDisabled,
                    ]}
                    onPress={() => handleCipherAnswer(cipherAnswer)}
                    disabled={
                      !cipherAnswer.trim() || answerLocked || showDeathAnimation
                    }
                  >
                    <Text style={styles.submitButtonText}>Submit Answer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        )}

        {/* Show death animation overlay */}
        {showDeathAnimation && !gameCompleted && (
          <View style={styles.deathAnimationContainer}>
            <Animated.View
              style={[
                styles.deathMessageContainer,
                {
                  opacity: deathAnim,
                  transform: [
                    {
                      scale: deathAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.8, 1.2, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <MaterialCommunityIcons
                name={isPlayerDefeated ? "skull" : "trophy"}
                size={60}
                color={isPlayerDefeated ? "#FF4444" : "#FFD700"}
              />
              <Text style={styles.deathAnimationText}>
                {isPlayerDefeated
                  ? "The darkness consumes you..."
                  : "Victory! The light prevails!"}
              </Text>
            </Animated.View>
          </View>
        )}

        {/* Show completion message if no question available but not yet completed */}
        {!currentQuestion && !gameCompleted && (
          <View style={styles.questionSection}>
            <Text style={styles.questionText}>
              Preparing for the final challenge...
            </Text>
          </View>
        )}

        {/* Hint Modal */}
        {showHintModal && (
          <View style={styles.hintModalOverlay}>
            <View style={styles.hintModal}>
              <View style={styles.hintModalHeader}>
                <MaterialCommunityIcons
                  name="lightbulb"
                  size={24}
                  color={COLORS.primary}
                />
                <Text
                  style={styles.hintModalTitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.8}
                >
                  Quest Hint
                </Text>
                <TouchableOpacity
                  style={styles.hintModalCloseButton}
                  onPress={() => setShowHintModal(false)}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <Text style={styles.hintModalText}>
                {currentQuestion?.hint && currentQuestion.hint.trim() !== ""
                  ? currentQuestion.hint
                  : "No hint available for this question"}
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = {
  // Add to styles object
  healthPoints: {
    color: "#fff",
    fontSize: Platform.OS === "web" ? 14 : 12,
    marginTop: 4,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
    ...(Platform.OS === "web" && {
      width: "100vw",
      height: "100vh",
      position: "relative",
    }),
  },
  overlay: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20,
  },
  errorText: {
    color: "#ff6b6b",
    textAlign: "center",
    marginVertical: 20,
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  questIntro: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  questTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginVertical: 20,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  questDescription: {
    fontSize: 16,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 30,
  },
  questStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 40,
  },
  statItem: {
    alignItems: "center",
  },
  statText: {
    color: "#fff",
    marginTop: 5,
    fontSize: 14,
  },
  startQuestButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  startQuestText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: "#ccc",
    fontSize: 16,
  },
  battleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    ...(Platform.OS === "web" && {
      maxWidth: 800,
      alignSelf: "center",
      width: "100%",
    }),
  },
  progressSection: {
    flex: 1,
  },
  questProgressText: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 5,
    fontWeight: "bold",
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  exitButton: {
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },
  battleArena: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: Platform.OS === "web" ? 280 : 220, // Increased height for web
    marginBottom: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: "rgba(255,215,0,0.3)",
    gap: Platform.OS === "web" ? 100 : 60, // Increased gap for web
    ...(Platform.OS === "web" && {
      minWidth: 600,
      maxWidth: 800,
      alignSelf: "center",
    }),
  },
  playerCharacter: {
    alignItems: "center",
    justifyContent: "center",
    width: Platform.OS === "web" ? 160 : 120, // Increased width for web
    height: Platform.OS === "web" ? 200 : 160, // Increased height for web
    overflow: "visible",
  },
  enemyCharacter: {
    alignItems: "center",
    justifyContent: "center",
    width: Platform.OS === "web" ? 160 : 120, // Increased width for web
    height: Platform.OS === "web" ? 200 : 160, // Increased height for web
    overflow: "visible",
  },
  characterSprite: {
    marginBottom: 15,
    width: Platform.OS === "web" ? 150 : 120, // Increased width for web
    height: Platform.OS === "web" ? 150 : 120, // Increased height for web
    alignSelf: "center",
  },
  healthBarContainer: {
    alignItems: "center",
    width: Platform.OS === "web" ? 140 : 100, // Increased width for web
  },
  healthLabel: {
    color: "#fff",
    fontSize: Platform.OS === "web" ? 16 : 14, // Increased font size for web
    marginBottom: 8,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  healthBar: {
    width: Platform.OS === "web" ? 130 : 90, // Increased width for web
    height: Platform.OS === "web" ? 14 : 10, // Increased height for web
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  healthFill: {
    height: "100%",
    borderRadius: 4,
  },
  playerHealthFill: {
    backgroundColor: "#4CAF50",
  },
  enemyHealthFill: {
    backgroundColor: "#f44336",
  },
  battleMessageContainer: {
    alignItems: "center",
    marginBottom: 10,
    zIndex: 10,
  },
  battleMessage: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.5)",
    minHeight: 40,
    minWidth: 200,
  },
  questionSection: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    maxHeight: "60%", // Limit height to ensure scrollability
    ...(Platform.OS === "web" && {
      maxWidth: 800,
      alignSelf: "center",
      width: "100%",
    }),
  },
  questionScrollContainer: {
    flex: 1,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  hintButton: {
    marginLeft: "auto",
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  currentQuizTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
    flex: 1,
  },
  questionText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    lineHeight: 24,
  },
  optionsScrollContainer: {
    maxHeight: 400, // Limit height to ensure scrollability
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    borderRadius: 8,
    overflow: "hidden",
  },
  optionButtonDisabled: {
    opacity: 0.6,
  },
  optionGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  optionLetter: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 15,
    width: 20,
  },
  optionText: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
  },
  optionTextDisabled: {
    color: "#999999",
  },
  // New question type styles
  codeQuestionContainer: {
    gap: 16,
    flex: 1,
  },
  codeContentScrollView: {
    flex: 1,
    maxHeight: 400, // Limit height to ensure submit button is visible
    marginBottom: 16,
  },
  codeTemplateContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  codeTemplateScrollContainer: {
    maxHeight: 200,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 4,
    padding: 8,
  },
  codeTemplateLabel: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  codeTemplateText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    lineHeight: 20,
  },
  codeInputContainer: {
    gap: 12,
  },
  inputLabel: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    marginBottom: 10,
  },
  codeInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8, // Add bottom margin for better spacing
  },
  submitButtonDisabled: {
    backgroundColor: "#666",
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  fillBlanksContainer: {
    flex: 1,
    gap: 12,
  },
  fillBlanksScrollView: {
    flex: 1,
    maxHeight: 300, // Limit height to ensure submit button is visible
    marginBottom: 16,
  },
  blankInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  blankNumber: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "bold",
    minWidth: 80,
  },
  blankInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  codeOrderingContainer: {
    flex: 1,
    gap: 12,
  },
  codeOrderingScrollView: {
    flex: 1,
    maxHeight: 400, // Limit height to ensure submit button is visible
    marginBottom: 16,
  },
  orderedBlocksContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  orderedBlocksScrollView: {
    maxHeight: 200, // Limit height to make it scrollable
  },
  sectionTitle: {
    fontSize: 18,
    color: "#FFD700",
    fontWeight: "bold",
    marginBottom: 12,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  orderedBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyOrderText: {
    color: "#999",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    padding: 20,
  },
  availableBlocksContainer: {
    marginTop: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  availableBlocksScrollView: {
    maxHeight: 200, // Limit height to make it scrollable
  },
  availableBlock: {
    backgroundColor: "rgba(255,255,255,0.25)",
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,215,0,0.6)",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  codeBlockScrollView: {},
  orderedBlockScrollView: {
    flex: 1,
    marginRight: 10,
  },
  codeBlocksContainer: {
    maxHeight: 300,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    padding: 8,
  },
  codeBlockItem: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  codeBlockDisabled: {
    opacity: 0.5,
    backgroundColor: "rgba(128,128,128,0.3)",
  },
  codeBlockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  codeBlockNumber: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "bold",
  },
  codeBlockText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    lineHeight: 22,
    flex: 1,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  questComplete: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  questCompleteTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginVertical: 20,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  questCompleteScore: {
    fontSize: 24,
    color: "#FFD700",
    fontWeight: "bold",
    marginBottom: 10,
  },
  questCompleteStats: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 30,
  },
  rewardsSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  rewardsTitle: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 15,
  },
  rewardsList: {
    gap: 10,
  },
  rewardItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rewardText: {
    color: "#fff",
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  starRatingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 15,
  },
  finalProgressContainer: {
    width: Platform.OS === "web" ? 500 : "80%",
    marginVertical: 20,
    alignSelf: "center",
  },

  finalProgressText: {
    color: "#fff",
    fontSize: Platform.OS === "web" ? 16 : 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: Platform.OS === "web" ? 10 : 8,
  },
  finalProgressBar: {
    height: Platform.OS === "web" ? 16 : 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  finalProgressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },
  actionButtonsContainer: {
    alignItems: "center",
    gap: 15,
  },
  defeatRetryButton: {
    backgroundColor: "#FF6B35",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  defeatRetryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  backToMapButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backToMapButtonText: {
    color: "#ccc",
    fontSize: 14,
  },
  deathAnimationContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 100,
  },
  deathMessageContainer: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,215,0,0.5)",
  },
  deathAnimationText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 20,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },

  // Sorting question styles
  sortingContainer: {
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 10,
  },
  sortingScrollView: {
    maxHeight: 400,
  },
  categoriesContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  categoryBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 5,
    minHeight: 120,
  },
  categoryTitle: {
    color: "#FFD700",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    fontSize: 16,
  },
  categoryItems: {
    flex: 1,
  },
  sortedItem: {
    backgroundColor: "rgba(76, 175, 80, 0.3)",
    padding: 8,
    borderRadius: 5,
    marginBottom: 5,
  },
  sortedItemText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 12,
  },
  itemsToSortContainer: {
    marginTop: 20,
  },
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  itemToSort: {
    backgroundColor: "rgba(33, 150, 243, 0.3)",
    padding: 10,
    borderRadius: 8,
    margin: 5,
    minWidth: "40%",
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 14,
  },

  // Cipher question styles
  cipherContainer: {
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 10,
  },
  scrambledHintContainer: {
    backgroundColor: "rgba(255,152,0,0.2)",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    alignItems: "center",
  },
  scrambledHintLabel: {
    color: "#FFD700",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 10,
  },
  scrambledHintText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 4,
    fontFamily: "monospace",
  },
  cipherInputContainer: {
    marginBottom: 20,
  },
  cipherInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 15,
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  itemToSortContainer: {
    backgroundColor: "rgba(33, 150, 243, 0.3)",
    padding: 10,
    borderRadius: 8,
    margin: 5,
    minWidth: "40%",
    alignItems: "center",
  },
  categorySelectorButtons: {
    flexDirection: "row",
    marginTop: 8,
    gap: 5,
  },
  categoryButton: {
    backgroundColor: "rgba(255,215,0,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 30,
    alignItems: "center",
  },
  categoryButtonText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "bold",
  },
  // Hint Modal Styles
  hintModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: 20,
  },
  hintModal: {
    backgroundColor: "rgba(20,20,30,0.95)",
    borderRadius: 12,
    padding: 20,
    maxWidth: 400,
    minWidth: 280,
    width: "100%",
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  hintModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    width: "100%",
  },
  hintModalTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
    flex: 1,
    flexShrink: 1,
  },
  hintModalCloseButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 4,
  },
  hintModalText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    flexWrap: "wrap",
  },
};
