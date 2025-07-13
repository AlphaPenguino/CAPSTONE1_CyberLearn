import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView, Animated } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@/constants/custom-colors';
import styles from '../../assets/styles/games.styles.js';
export default function Game() {
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
  const [characterState, setCharacterState] = useState('idle'); // idle, attack, hurt, victory
  const [enemyState, setEnemyState] = useState('idle'); // idle, attack, hurt, defeated
  const [showDialogue, setShowDialogue] = useState(true);
  
  // Animation references
  const heartScale = useRef(new Animated.Value(1)).current;
  const scoreScale = useRef(new Animated.Value(1)).current;
  const enemyPosition = useRef(new Animated.Value(0)).current;
  const playerPosition = useRef(new Animated.Value(0)).current;
  const dialogueOpacity = useRef(new Animated.Value(1)).current;
  
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
    
    // Animate a small movement without changing state to "attack"
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
    // Add more questions as needed
  ];
  // Handle answer selection
  const handleAnswerSelect = (index) => {
    if (selectedAnswer !== null || showDialogue) return;
    
    setSelectedAnswer(index);
    const correct = index === questions[currentQuestion].correctAnswer;
    setIsCorrect(correct);
    
    if (correct) {
      // Animate player attack and enemy hurt
      animatePlayerAttack();
      setTimeout(() => animateEnemyHurt(), 300);
      
      // Player dialogue on correct answer
      setDialogue("Take that! The correct answer strikes true!");
      setShowDialogue(true);
      
      // Score animation
      Animated.sequence([
        Animated.timing(scoreScale, {
          toValue: 1.5,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(scoreScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
      
      setScore(score + 100);
      
      // Auto-dismiss dialogue and continue
      setTimeout(() => {
        fadeOutDialogue();
        
        setTimeout(() => {
          if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
          } else {
            // Just go directly to win state when all questions are answered
            setDialogue(currentEnemy.defeat);
            setShowDialogue(true);
            setEnemyState('defeated');
            setCharacterState('victory');
            
            setTimeout(() => {
              fadeOutDialogue();
              setTimeout(() => setGameState('win'), 500);
            }, 2000);
          }
          setSelectedAnswer(null);
          setIsCorrect(null);
        }, 500);
      }, 2000);
      
    } else {
      // Animate enemy attack and player hurt
      animateEnemyAttack();
      setTimeout(() => animatePlayerHurt(), 300);
      
      setDialogue("Ha! Your knowledge fails you!");
      setShowDialogue(true);
      
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.5,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
      
      setLives(lives - 1);
      
      // Auto-dismiss dialogue and continue
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
  };
  
  // Start screen
  if (gameState === 'start') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.startScreen}>
          <Text style={styles.gameTitle}>CyberLearn Quickplay</Text>
          <Image 
            source={require('../../assets/images/character1.png')}
            style={styles.characterImage}
          />
          <Text style={styles.instructions}>
            Evil cyber threats are attacking! Use your knowledge to defeat them!
            You have 5 lives and limited time. Can you save the digital world?
          </Text>
          <TouchableOpacity 
            style={styles.startButton}
            onPress={() => setGameState('playing')}
          >
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Game over screen
  if (gameState === 'gameOver') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gameOverScreen}>
          <Text style={styles.gameOverText}>Defeated!</Text>
          <Image 
            source={require('../../assets/images/player-defeated.png')}
            style={styles.defeatImage}
          />
          <Text style={styles.finalScore}>Score: {score}</Text>
          <Text style={styles.defeatMessage}>
            The cyber threat has prevailed this time...
          </Text>
          <TouchableOpacity 
            style={styles.restartButton}
            onPress={restartGame}
          >
            <Text style={styles.restartButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Win screen
  if (gameState === 'win') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.winScreen}>
          <Text style={styles.winText}>Victory!</Text>
          <Image 
            source={require('../../assets/images/player-victory.png')}
            style={styles.victoryImage}
          />
          <Text style={styles.finalScore}>Score: {score}</Text>
          <Text style={styles.victoryMessage}>
            You&apos;ve successfully defended against the cyber attack!
          </Text>
          <TouchableOpacity 
            style={styles.nextLevelButton}
            onPress={() => {
              setCurrentLevel(currentLevel + 1);
              restartGame();
            }}
          >
            <Text style={styles.nextLevelButtonText}>Next Challenge</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Main gameplay (battle screen)
  return (
    <SafeAreaView style={styles.battleContainer}>
      {/* Game HUD */}
      <View style={styles.gameHeader}>
        <View style={styles.livesContainer}>
          {Array(lives).fill().map((_, i) => (
            <Animated.View 
              key={i} 
              style={{transform: [{scale: i === lives - 1 ? heartScale : 1}]}}
            >
              <Ionicons name="heart" size={24} color={'#ff0000'} />
            </Animated.View>
          ))}
        </View>
        
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={24} color={COLORS.textSecondary} />
          <Text style={styles.timerText}>{timeLeft}</Text>
        </View>
        
        <Animated.View 
          style={[styles.scoreContainer, {transform: [{scale: scoreScale}]}]}
        >
          <Text style={styles.scoreText}>Score: {score}</Text>
        </Animated.View>
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
      
      {/* Question Container - Now always show when in game */}
      <View style={styles.questionContainer}>
        <View style={styles.questionBadge}>
          <Text style={styles.questionBadgeText}>{currentQuestion + 1}</Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              {width: `${((currentQuestion + 1) / questions.length) * 100}%`}
            ]} 
          />
        </View>
        
        <Text style={styles.questionCategory}>
          CYBER SECURITY
        </Text>
        <Text style={styles.questionText}>
          {questions[currentQuestion].question}
        </Text>
      </View>

      {/* Answer options - Now always show when in game */}
      <View style={styles.optionsContainer}>
        {questions[currentQuestion].options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              selectedAnswer === index && (
                index === questions[currentQuestion].correctAnswer 
                  ? styles.correctOption 
                  : styles.incorrectOption
              )
            ]}
            onPress={() => handleAnswerSelect(index)}
            disabled={selectedAnswer !== null || showDialogue}  // Disable while dialogue is showing
          >
            <Text 
              style={[
                styles.optionText,
                selectedAnswer === index && (
                  index === questions[currentQuestion].correctAnswer
                    ? styles.correctOptionText
                    : styles.incorrectOptionText
                )
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}


