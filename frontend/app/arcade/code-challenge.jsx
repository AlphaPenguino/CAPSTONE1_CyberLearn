import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Dimensions,
  Platform,
  Animated as RNAnimated,
  Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
  useAnimatedGestureHandler,
  FadeIn,
  FadeInDown,
  ZoomIn,
  BounceIn
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/authStore';
import COLORS from '@/constants/custom-colors';
// Removed the unsupported library import
// import Highlighter from 'react-native-highlight-words';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Mock challenges database - in a real app, fetch from API
const codeChallenges = [
  {
    id: 1,
    title: 'Fix the Login Function',
    description: 'Repair the broken login function by dragging the correct code snippets into position.',
    language: 'javascript',
    difficulty: 'easy',
    timeLimit: 120, // seconds
    baseCode: `function loginUser(username, password) {
  // Check if username and password are provided
  if (!username || !password) {
    return { success: false, message: "Username and password required" };
  }
  
  // CODE_BLOCK_1
  
  // Hash the password for security
  const hashedPassword = hashPassword(password);
  
  // CODE_BLOCK_2
  
  // Return success if credentials match
  if (user && user.password === hashedPassword) {
    return { success: true, user: { id: user.id, name: user.name } };
  } else {
    // CODE_BLOCK_3
  }
}`,
    codeBlocks: [
      {
        id: 'block1',
        correctPosition: 'CODE_BLOCK_1',
        code: `// Find the user in the database
const user = findUserByUsername(username);`,
        isCorrect: true,
      },
      {
        id: 'block2',
        correctPosition: 'CODE_BLOCK_1',
        code: `// Delete the user from database
deleteUserByUsername(username);`,
        isCorrect: false,
      },
      {
        id: 'block3',
        correctPosition: 'CODE_BLOCK_2',
        code: `// Validate the user exists
if (!user) {
  return { success: false, message: "User not found" };
}`,
        isCorrect: true,
      },
      {
        id: 'block4',
        correctPosition: 'CODE_BLOCK_2',
        code: `// Create a new user
createUser(username, password);`,
        isCorrect: false,
      },
      {
        id: 'block5',
        correctPosition: 'CODE_BLOCK_3',
        code: `// Return failure if credentials don't match
return { success: false, message: "Invalid credentials" };`,
        isCorrect: true,
      },
      {
        id: 'block6',
        correctPosition: 'CODE_BLOCK_3',
        code: `// Delete all users
deleteAllUsers();`,
        isCorrect: false,
      },
    ],
    hints: [
      "Look for code that would logically follow each comment",
      "For block 1, we need to find the user after validating inputs",
      "For block 3, we need to handle authentication failure"
    ]
  },
  {
    id: 2,
    title: 'Debug the Array Sorter',
    description: 'Fix the broken array sorting algorithm by placing the correct code blocks.',
    language: 'javascript',
    difficulty: 'medium',
    timeLimit: 180, // seconds
    baseCode: `function customSort(array) {
  // Check if input is an array
  if (!Array.isArray(array)) {
    throw new Error("Input must be an array");
  }
  
  // Handle empty arrays
  if (array.length === 0) {
    return [];
  }
  
  // CODE_BLOCK_1
  
  // Perform the sorting algorithm
  for (let i = 0; i < array.length; i++) {
    // CODE_BLOCK_2
    
    for (let j = 0; j < array.length - i - 1; j++) {
      // CODE_BLOCK_3
    }
  }
  
  return sortedArray;
}`,
    codeBlocks: [
      {
        id: 'block1',
        correctPosition: 'CODE_BLOCK_1',
        code: `// Create a copy of the array to avoid mutating input
const sortedArray = [...array];`,
        isCorrect: true,
      },
      {
        id: 'block2',
        correctPosition: 'CODE_BLOCK_1',
        code: `// Delete all elements in the array
array = [];`,
        isCorrect: false,
      },
      {
        id: 'block3',
        correctPosition: 'CODE_BLOCK_2',
        code: `// Track position for current iteration
let currentMinIndex = i;`,
        isCorrect: false,
      },
      {
        id: 'block4',
        correctPosition: 'CODE_BLOCK_2',
        code: `// Track if any swaps are made in this pass
let swapped = false;`,
        isCorrect: true,
      },
      {
        id: 'block5',
        correctPosition: 'CODE_BLOCK_3',
        code: `// Compare adjacent elements and swap if needed
if (sortedArray[j] > sortedArray[j + 1]) {
  [sortedArray[j], sortedArray[j + 1]] = [sortedArray[j + 1], sortedArray[j]];
  swapped = true;
}`,
        isCorrect: true,
      },
      {
        id: 'block6',
        correctPosition: 'CODE_BLOCK_3',
        code: `// Delete the current element
delete sortedArray[j];`,
        isCorrect: false,
      },
    ],
    hints: [
      "We need to sort without modifying the original array",
      "Bubble sort requires tracking if swaps were made",
      "For each adjacent pair, compare and swap if needed"
    ]
  }
];

export default function CodeChallenge() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { gameId } = useLocalSearchParams();
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [challenge, setChallenge] = useState(codeChallenges[0]);
  const [gameState, setGameState] = useState('ready'); // ready, playing, success, failed
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(challenge.timeLimit);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [placedBlocks, setPlacedBlocks] = useState({});
  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [codeBlockTargets, setCodeBlockTargets] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  
  // Animation values
  const headerY = useSharedValue(-50);
  const timerProgress = useSharedValue(1);
  const timerOpacity = useSharedValue(1);
  const hintScale = useSharedValue(1);
  const successScale = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);
  const codePanelY = useSharedValue(50);
  
  // Timer ref
  const timerRef = useRef(null);
  
  // Initialize game
  useEffect(() => {
    headerY.value = withSpring(0);
    codePanelY.value = withSpring(0);
    
    if (challenge) {
      // Shuffle available blocks
      const blocks = [...challenge.codeBlocks];
      // Fisher-Yates shuffle
      for (let i = blocks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      }
      setAvailableBlocks(blocks);
      setTimeLeft(challenge.timeLimit);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [challenge]);
  
  // Format the base code by replacing placeholders with placed blocks or empty slots
  const getFormattedCode = () => {
    let formattedCode = challenge.baseCode;
    
    // Replace CODE_BLOCK placeholders with either placed blocks or empty slots
    ['CODE_BLOCK_1', 'CODE_BLOCK_2', 'CODE_BLOCK_3'].forEach((placeholder) => {
      const blockId = Object.keys(placedBlocks).find(
        (id) => placedBlocks[id] === placeholder
      );
      
      const block = blockId 
        ? availableBlocks.find((b) => b.id === blockId)
        : null;
      
      if (block) {
        formattedCode = formattedCode.replace(
          placeholder,
          block.code
        );
      } else {
        formattedCode = formattedCode.replace(
          placeholder,
          `// Drop code here for ${placeholder}`
        );
      }
    });
    
    return formattedCode;
  };
  
  // Start the game
  const startGame = () => {
    setGameState('playing');
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleGameOver();
          return 0;
        }
        
        // Update timer progress animation
        timerProgress.value = withTiming(prev / challenge.timeLimit);
        
        // Flash timer when low on time
        if (prev <= 10) {
          timerOpacity.value = withSequence(
            withTiming(0.3, { duration: 300 }),
            withTiming(1, { duration: 300 })
          );
        }
        
        return prev - 1;
      });
    }, 1000);
  };
  
  // Handle game over (time expired)
  const handleGameOver = () => {
    setGameState('failed');
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Animation for failure
    timerOpacity.value = withTiming(0.3);
  };
  
  // Check if all placed blocks are correct
  const checkSolution = () => {
    let allCorrect = true;
    let blockCount = 0;
    
    // Count placed blocks and check if they're all in correct positions
    Object.entries(placedBlocks).forEach(([blockId, position]) => {
      const block = availableBlocks.find((b) => b.id === blockId);
      if (block && (block.correctPosition !== position || !block.isCorrect)) {
        allCorrect = false;
      }
      blockCount++;
    });
    
    // Ensure all placeholder positions have blocks
    const requiredPositions = ['CODE_BLOCK_1', 'CODE_BLOCK_2', 'CODE_BLOCK_3'];
    if (blockCount < requiredPositions.length) {
      return false;
    }
    
    return allCorrect;
  };
  
  // Submit solution
  const submitSolution = () => {
    const isCorrect = checkSolution();
    
    if (isCorrect) {
      // Success!
      clearInterval(timerRef.current);
      setGameState('success');
      
      // Calculate score based on time left and hints used
      const timeBonus = Math.floor(timeLeft / 2);
      const hintPenalty = hintsUsed * 5;
      const newScore = 100 + timeBonus - hintPenalty;
      setScore((prevScore) => prevScore + newScore);
      
      // Success animations
      successScale.value = withSpring(1);
      confettiOpacity.value = withTiming(1);
      
      // After delay, show next challenge button
      setTimeout(() => {
        if (currentChallengeIndex < codeChallenges.length - 1) {
          // More challenges available
        } else {
          // Game complete
        }
      }, 2000);
    } else {
      // Incorrect solution - shake the code panel
      codePanelY.value = withSequence(
        withTiming(10, { duration: 100 }),
        withTiming(-10, { duration: 100 }),
        withTiming(5, { duration: 100 }),
        withTiming(-5, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
    }
  };
  
  // Show next hint
  const showNextHint = () => {
    if (currentHint < challenge.hints.length - 1) {
      setCurrentHint(currentHint + 1);
    } else {
      setCurrentHint(0);
    }
    
    setHintsUsed(hintsUsed + 1);
    setShowHint(true);
    
    // Animate hint button
    hintScale.value = withSequence(
      withTiming(1.2, { duration: 200 }),
      withTiming(1, { duration: 200 })
    );
  };
  
  // Go to next challenge
  const nextChallenge = () => {
    if (currentChallengeIndex < codeChallenges.length - 1) {
      setCurrentChallengeIndex(currentChallengeIndex + 1);
      setChallenge(codeChallenges[currentChallengeIndex + 1]);
      setGameState('ready');
      setPlacedBlocks({});
      setShowHint(false);
      setCurrentHint(0);
      setHintsUsed(0);
      successScale.value = 0;
      confettiOpacity.value = 0;
    } else {
      // Game complete - return to arcade
      router.replace('/arcade');
    }
  };
  
  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle block placement
  const handleBlockPlacement = (blockId, target) => {
    // If the block was already placed somewhere, remove it from that position
    const previousPosition = placedBlocks[blockId];
    if (previousPosition) {
      // Update state to remove the block from its previous position
      setPlacedBlocks((prev) => {
        const newPlaced = { ...prev };
        delete newPlaced[blockId];
        return newPlaced;
      });
    }
    
    // If another block is in the target position, swap it back to available
    const existingBlock = Object.keys(placedBlocks).find(
      (id) => placedBlocks[id] === target
    );
    
    if (existingBlock) {
      setPlacedBlocks((prev) => {
        const newPlaced = { ...prev };
        delete newPlaced[existingBlock];
        newPlaced[blockId] = target;
        return newPlaced;
      });
    } else {
      // Place the block in the target position
      setPlacedBlocks((prev) => ({
        ...prev,
        [blockId]: target,
      }));
    }
  };
  
  // Record drop zone locations
  const recordDropZoneLayout = (position, layout) => {
    setCodeBlockTargets((prev) => ({
      ...prev,
      [position]: {
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
      },
    }));
  };
  
  // Gesture handler for draggable code blocks
  const createGestureHandler = (blockId) => {
    return useAnimatedGestureHandler({
      onStart: (_, ctx) => {
        ctx.startX = 0;
        ctx.startY = 0;
        runOnJS(setDraggedItem)(blockId);
      },
      onActive: (event, ctx) => {
        ctx.translateX = event.translationX;
        ctx.translateY = event.translationY;
      },
      onEnd: (event, ctx) => {
        // Check if dropped on a valid target
        let droppedOnTarget = null;
        Object.entries(codeBlockTargets).forEach(([position, layout]) => {
          // Calculate pointer position relative to drop zone
          const pointerX = event.absoluteX;
          const pointerY = event.absoluteY;
          
          if (
            pointerX >= layout.x &&
            pointerX <= layout.x + layout.width &&
            pointerY >= layout.y &&
            pointerY <= layout.y + layout.height
          ) {
            droppedOnTarget = position;
          }
        });
        
        if (droppedOnTarget) {
          // Place block in the target position
          runOnJS(handleBlockPlacement)(blockId, droppedOnTarget);
        }
        
        // Reset dragged item
        runOnJS(setDraggedItem)(null);
      },
    });
  };
  
  // Animated styles
  const timerBarStyle = useAnimatedStyle(() => {
    return {
      width: `${timerProgress.value * 100}%`,
      opacity: timerOpacity.value,
      backgroundColor: 
        timerProgress.value > 0.6 ? '#4CAF50' : 
        timerProgress.value > 0.3 ? '#FF9800' : 
        '#F44336',
    };
  });
  
  const hintButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: hintScale.value }],
    };
  });
  
  const successStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: successScale.value }],
      opacity: successScale.value,
    };
  });
  
  const confettiStyle = useAnimatedStyle(() => {
    return {
      opacity: confettiOpacity.value,
    };
  });
  
  const codePanelStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: codePanelY.value }],
    };
  });
  
  const headerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: headerY.value }],
    };
  });
  
  // Create draggable code blocks
const renderDraggableBlock = (block, index) => {
  // Skip if block is already placed
  if (placedBlocks[block.id]) return null;
  
  const isBeingDragged = draggedItem === block.id;
  
  // Use the modern Gesture API
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      runOnJS(setDraggedItem)(block.id);
    })
    .onUpdate((event) => {
      // You can use event.translationX and event.translationY here
      // if you want to move the block while dragging
    })
    .onEnd((event) => {
      // Check if dropped on a valid target
      let droppedOnTarget = null;
      Object.entries(codeBlockTargets).forEach(([position, layout]) => {
        // Calculate pointer position relative to drop zone
        const pointerX = event.absoluteX;
        const pointerY = event.absoluteY;
        
        if (
          pointerX >= layout.x &&
          pointerX <= layout.x + layout.width &&
          pointerY >= layout.y &&
          pointerY <= layout.y + layout.height
        ) {
          droppedOnTarget = position;
        }
      });
      
      if (droppedOnTarget) {
        // Place block in the target position
        runOnJS(handleBlockPlacement)(block.id, droppedOnTarget);
      }
      
      // Reset dragged item
      runOnJS(setDraggedItem)(null);
    });
  
  return (
    <Animated.View
      key={block.id}
      entering={FadeInDown.delay(100 * index).springify()}
    >
        <GestureHandlerRootView>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.codeBlock, isBeingDragged && styles.dragging]}>
          <BlurView intensity={20} style={styles.codeBlockContent}>
            <Text style={styles.codeText}>{block.code}</Text>
          </BlurView>
        </Animated.View>
      </GestureDetector>
      </GestureHandlerRootView>
    </Animated.View>
  );
};
  
  // Generate code drop zones
  const renderCodeDropZones = () => {
    const formattedCode = getFormattedCode();
    const codeLines = formattedCode.split('\n');
    
    // Find the positions of drop zones in the code
    const dropZones = {};
    codeLines.forEach((line, index) => {
      if (line.includes('Drop code here for CODE_BLOCK')) {
        const placeholder = line.match(/Drop code here for (CODE_BLOCK_\d)/)[1];
        dropZones[index] = placeholder;
      }
    });
    
    return (
      <View>
        {codeLines.map((line, index) => {
          const isDropZone = line.includes('Drop code here for CODE_BLOCK');
          const dropZonePlaceholder = isDropZone ? 
            line.match(/Drop code here for (CODE_BLOCK_\d)/)[1] : null;
          
          // Check if a block is placed here
          const placedBlockId = dropZonePlaceholder ? 
            Object.keys(placedBlocks).find(id => placedBlocks[id] === dropZonePlaceholder) : null;
          
          const placedBlock = placedBlockId ? 
            availableBlocks.find(block => block.id === placedBlockId) : null;
          
          if (isDropZone) {
            return (
              <View
                key={`line-${index}`}
                style={[styles.codeDropZone, placedBlock && styles.filledDropZone]}
                onLayout={(e) => recordDropZoneLayout(dropZonePlaceholder, e.nativeEvent.layout)}
              >
                {placedBlock ? (
                  <View style={styles.placedBlockContainer}>
                    <Text style={styles.codeText}>{placedBlock.code}</Text>
                    <TouchableOpacity
                      style={styles.removeBlockButton}
                      onPress={() => {
                        setPlacedBlocks(prev => {
                          const newPlaced = { ...prev };
                          delete newPlaced[placedBlockId];
                          return newPlaced;
                        });
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.dropZoneText}>Drop code block here</Text>
                )}
              </View>
            );
          } else {
            // Regular code line
            return (
              <Text key={`line-${index}`} style={styles.codeLine}>
                {line}
              </Text>
            );
          }
        })}
      </View>
    );
  };
  
  // Render confetti for success animation
  const renderConfetti = () => {
    const confettiElements = [];
    const colors = ['#FFEB3B', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#F44336'];
    
    for (let i = 0; i < 50; i++) {
      const size = Math.random() * 10 + 5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * width;
      const top = Math.random() * height * 0.6;
      const delay = Math.random() * 2000;
      const duration = Math.random() * 3000 + 2000;
      const rotation = Math.random() * 360;
      
      // Create falling animation for this confetti piece
      const fallAnim = RNAnimated.timing(
        new RNAnimated.Value(0),
        {
          toValue: 1,
          duration: duration,
          delay: delay,
          easing: Easing.ease,
          useNativeDriver: false
        }
      );
      
      confettiElements.push(
        <View
          key={`confetti-${i}`}
          style={[
            styles.confetti,
            {
              width: size,
              height: size * 1.5,
              backgroundColor: color,
              left: left,
              top: -30,
              transform: [{ rotate: `${rotation}deg` }],
            }
          ]}
        />
      );
    }
    
    return (
      <Animated.View style={[StyleSheet.absoluteFill, confettiStyle]}>
        {confettiElements}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar style="light" />
      
      {/* Confetti overlay */}
      {gameState === 'success' && renderConfetti()}
      
      {/* Header */}
      <Animated.View style={[styles.header, headerStyle]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        
        <Text style={styles.title}>{challenge.title}</Text>
        
        <View style={styles.headerRight}>
          <View style={styles.difficultyBadge}>
            <Text style={styles.difficultyText}>{challenge.difficulty}</Text>
          </View>
        </View>
      </Animated.View>
      
      {/* Timer bar */}
      {gameState === 'playing' && (
        <View style={styles.timerContainer}>
          <Animated.View style={[styles.timerBar, timerBarStyle]} />
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>
      )}
      
      {/* Game content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Challenge description */}
        <Animated.View 
          entering={FadeIn}
          style={styles.descriptionCard}
        >
          <Text style={styles.descriptionTitle}>{challenge.title}</Text>
          <Text style={styles.descriptionText}>{challenge.description}</Text>
          
          {/* Language badge */}
          <View style={styles.languageBadge}>
            <MaterialCommunityIcons
              name={challenge.language === 'javascript' ? 'language-javascript' : 'code-tags'}
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.languageText}>{challenge.language}</Text>
          </View>
        </Animated.View>
        
        {/* Start button for ready state */}
        {gameState === 'ready' && (
          <Animated.View 
            entering={ZoomIn.delay(300)}
            style={styles.startButtonContainer}
          >
            <TouchableOpacity style={styles.startButton} onPress={startGame}>
              <Text style={styles.startButtonText}>Start Challenge</Text>
              <Ionicons name="play" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.startHint}>
              Drag code blocks to fix the broken function
            </Text>
          </Animated.View>
        )}
        
        {/* Code panel (visible during play) */}
        {gameState === 'playing' && (
          <Animated.View style={[styles.codePanel, codePanelStyle]}>
            <Text style={styles.codePanelTitle}>Fix the Code:</Text>
            <View style={styles.codeContainer}>{renderCodeDropZones()}</View>
          </Animated.View>
        )}
        
        {/* Available code blocks (visible during play) */}
        {gameState === 'playing' && (
          <View style={styles.availableBlocksContainer}>
            <Text style={styles.availableBlocksTitle}>Available Code Blocks:</Text>
            <View style={styles.blocksGrid}>
              {availableBlocks.map((block, index) => renderDraggableBlock(block, index))}
            </View>
            
            {/* Hint button */}
            <Animated.View style={[styles.hintContainer, hintButtonStyle]}>
              <TouchableOpacity style={styles.hintButton} onPress={showNextHint}>
                <Ionicons name="bulb-outline" size={20} color="#FFFFFF" />
                <Text style={styles.hintButtonText}>Hint ({hintsUsed})</Text>
              </TouchableOpacity>
              
              {showHint && (
                <Animated.View
                  entering={FadeInDown}
                  style={styles.hintBubble}
                >
                  <Text style={styles.hintText}>{challenge.hints[currentHint]}</Text>
                  <TouchableOpacity
                    style={styles.closeHintButton}
                    onPress={() => setShowHint(false)}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </Animated.View>
              )}
            </Animated.View>
            
            {/* Submit button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={submitSolution}
            >
              <Text style={styles.submitButtonText}>Submit Solution</Text>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Success state */}
        {gameState === 'success' && (
          <Animated.View style={[styles.successContainer, successStyle]}>
            <View style={styles.successContent}>
              <View style={styles.successHeader}>
                <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
                <Text style={styles.successTitle}>Challenge Completed!</Text>
              </View>
              
              <View style={styles.scoreBreakdown}>
                <Text style={styles.scoreLabel}>Time Bonus</Text>
                <Text style={styles.scoreValue}>+{Math.floor(timeLeft / 2)}</Text>
                
                <Text style={styles.scoreLabel}>Hints Used</Text>
                <Text style={[styles.scoreValue, styles.hintPenalty]}>-{hintsUsed * 5}</Text>
                
                <View style={styles.totalScoreRow}>
                  <Text style={styles.totalScoreLabel}>Points Earned</Text>
                  <Text style={styles.totalScoreValue}>
                    {100 + Math.floor(timeLeft / 2) - (hintsUsed * 5)}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.nextButton}
                onPress={nextChallenge}
              >
                <Text style={styles.nextButtonText}>
                  {currentChallengeIndex < codeChallenges.length - 1
                    ? "Next Challenge"
                    : "Finish Game"}
                </Text>
                <Ionicons
                  name={
                    currentChallengeIndex < codeChallenges.length - 1
                      ? "arrow-forward"
                      : "checkmark-done"
                  }
                  size={20}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
        
        {/* Failure state */}
        {gameState === 'failed' && (
          <Animated.View
            entering={BounceIn}
            style={styles.failureContainer}
          >
            <View style={styles.failureContent}>
              <Ionicons name="time" size={60} color="#F44336" />
              <Text style={styles.failureTitle}>Time&apos;s Up!</Text>
              <Text style={styles.failureMessage}>
                You ran out of time before completing the challenge.
              </Text>
              
              <View style={styles.failureButtons}>
                <TouchableOpacity
                  style={[styles.failureButton, styles.retryButton]}
                  onPress={() => {
                    setGameState('ready');
                    setPlacedBlocks({});
                    setTimeLeft(challenge.timeLimit);
                    setHintsUsed(0);
                    setCurrentHint(0);
                    setShowHint(false);
                  }}
                >
                  <Text style={styles.failureButtonText}>Try Again</Text>
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.failureButton, styles.exitButton]}
                  onPress={() => router.back()}
                >
                  <Text style={styles.failureButtonText}>Exit</Text>
                  <Ionicons name="exit" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  timerContainer: {
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    marginHorizontal: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  timerText: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
    width: '100%',
    textAlign: 'center',
    zIndex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  descriptionCard: {
    backgroundColor: 'rgba(20, 30, 48, 0.9)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  descriptionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: COLORS.textDark,
    lineHeight: 22,
    marginBottom: 12,
  },
  languageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  languageText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  startButtonContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
    marginRight: 8,
  },
  startHint: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontStyle: 'italic',
  },
  codePanel: {
    backgroundColor: 'rgba(20, 30, 48, 0.9)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  codePanelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  codeContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 12,
    borderRadius: 8,
  },
  codeLine: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 20,
  },
  codeDropZone: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 8,
    minHeight: 60,
    marginVertical: 4,
    justifyContent: 'center',
  },
  filledDropZone: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    borderColor: 'rgba(33, 150, 243, 0.5)',
  },
  dropZoneText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  placedBlockContainer: {
    position: 'relative',
  },
  removeBlockButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availableBlocksContainer: {
    marginTop: 24,
  },
  availableBlocksTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  blocksGrid: {
    flexDirection: isWeb ? 'row' : 'column',
    flexWrap: isWeb ? 'wrap' : 'nowrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  codeBlock: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    minHeight: 60,
    width: isWeb ? width * 0.45 - 24 : '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  codeBlockContent: {
    padding: 12,
    flex: 1,
  },
  dragging: {
    opacity: 0.7,
    transform: [{ scale: 1.05 }],
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    color: '#E0E0E0',
    lineHeight: 20,
  },
  hintContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  hintButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  hintBubble: {
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    maxWidth: 500,
    alignSelf: 'center',
    position: 'relative',
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  closeHintButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 24,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  successContent: {
    backgroundColor: 'rgba(20, 30, 48, 0.95)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 500,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  scoreBreakdown: {
    width: '100%',
    marginBottom: 24,
  },
  scoreLabel: {
    color: COLORS.textDark,
    fontSize: 16,
  },
  scoreValue: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  hintPenalty: {
    color: '#F44336',
  },
  totalScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 12,
    marginTop: 12,
  },
  totalScoreLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  totalScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 25,
    backgroundColor: 'red',
  },
  failureContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  failureContent: {
    backgroundColor: 'rgba(20, 30, 48, 0.95)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 500,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  failureTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 12,
    marginBottom: 8,
  },
  failureMessage: {
    fontSize: 16,
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 24,
  },
  failureButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  failureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
  },
  exitButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  failureButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
});