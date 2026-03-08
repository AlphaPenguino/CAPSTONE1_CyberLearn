import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import COLORS from "@/constants/custom-colors";

const securityTerms = [
  {
    id: 1,
    term: "Phishing",
    definition:
      "Fraudulent attempts to obtain sensitive information by disguising as a trustworthy entity",
  },
  {
    id: 2,
    term: "Zero Trust",
    definition:
      "Security model that requires verification for every user and device before granting access",
  },
  {
    id: 3,
    term: "DDoS",
    definition:
      "Attack that overwhelms a system with traffic from multiple sources to make it unavailable",
  },
  {
    id: 4,
    term: "Malware",
    definition:
      "Malicious software designed to damage, disrupt, or gain unauthorized access to systems",
  },
  {
    id: 5,
    term: "Firewall",
    definition:
      "Network security system that monitors and controls incoming and outgoing network traffic",
  },
  {
    id: 6,
    term: "Encryption",
    definition:
      "Process of converting information into a secret code to prevent unauthorized access",
  },
  {
    id: 7,
    term: "Two-Factor Authentication",
    definition:
      "Security process that requires two different authentication factors to verify identity",
  },
  {
    id: 8,
    term: "Ransomware",
    definition:
      "Malicious software that encrypts files and demands payment for the decryption key",
  },
  {
    id: 9,
    term: "Social Engineering",
    definition:
      "Manipulation techniques used to trick people into revealing confidential information",
  },
  {
    id: 10,
    term: "VPN",
    definition:
      "Encrypted connection that provides secure communication over an unsecured network",
  },
];

const CyberMatch = () => {
  const router = useRouter();

  // Game state
  const [currentTerms, setCurrentTerms] = useState([]);
  const [shuffledDefinitions, setShuffledDefinitions] = useState([]);
  const [matches, setMatches] = useState({});
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(90);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastMatchCorrect, setLastMatchCorrect] = useState(false);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // Animations
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Timer effect
  useEffect(() => {
    let timer;
    if (gameStarted && !gameOver && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameStarted, gameOver, timeLeft]);

  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const startGame = () => {
    const gameTerms = shuffleArray(securityTerms).slice(0, 6); // Use 6 terms per round
    setCurrentTerms(gameTerms);
    setShuffledDefinitions(shuffleArray([...gameTerms]));
    setMatches({});
    setGameStarted(true);
    setScore(0);
    setLives(3);
    setTimeLeft(90);
    setGameOver(false);
    setCorrectStreak(0);
    setSelectedTerm(null);
  };

  const handleTermSelect = (term) => {
    setSelectedTerm(term);
  };

  const handleDefinitionSelect = (definition) => {
    if (!selectedTerm) return;

    const isCorrect = selectedTerm.id === definition.id;
    setLastMatchCorrect(isCorrect);

    if (isCorrect) {
      // Correct match
      setMatches((prev) => ({ ...prev, [selectedTerm.id]: definition.id }));
      setCorrectStreak((prev) => prev + 1);

      const basePoints = 50;
      const streakMultiplier = correctStreak >= 3 ? 1.2 : 1.0;
      const points = Math.floor(basePoints * streakMultiplier);
      setScore((prev) => prev + points);
      setTimeLeft((prev) => prev + 3); // Time bonus

      setFeedbackMessage("✔️ Correct!");

      // Pulse animation for correct answer
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Check if all matches are completed
      const newMatches = { ...matches, [selectedTerm.id]: definition.id };
      if (Object.keys(newMatches).length === currentTerms.length) {
        setTimeout(() => setGameOver(true), 1000);
      }
    } else {
      // Wrong match
      setCorrectStreak(0);
      setLives((prev) => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameOver(true);
        }
        return newLives;
      });
      setTimeLeft((prev) => Math.max(prev - 5, 0)); // Time penalty

      setFeedbackMessage(`❌ No, that's ${definition.term}`);

      // Shake animation for wrong answer
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    setSelectedTerm(null);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 1500);
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameOver(false);
    setShowFeedback(false);
    setSelectedTerm(null);
    setMatches({});
    setScore(0);
    setLives(3);
    setTimeLeft(90);
    setCorrectStreak(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderGameHeader = () => (
    <View style={styles.gameHeader}>
      <View style={styles.statContainer}>
        <MaterialCommunityIcons name="trophy" size={20} color="#FFD700" />
        <Text style={styles.statText}>{score}</Text>
      </View>

      <Animated.View
        style={[
          styles.statContainer,
          { transform: [{ scale: pulseAnimation }] },
        ]}
      >
        <MaterialCommunityIcons
          name="clock-outline"
          size={20}
          color={timeLeft <= 10 ? "#FF6B6B" : COLORS.primary}
        />
        <Text
          style={[
            styles.statText,
            { color: timeLeft <= 10 ? "#FF6B6B" : COLORS.textPrimary },
          ]}
        >
          {formatTime(timeLeft)}
        </Text>
      </Animated.View>

      <View style={styles.livesContainer}>
        {[...Array(3)].map((_, index) => (
          <MaterialCommunityIcons
            key={index}
            name="heart"
            size={20}
            color={index < lives ? "#FF6B6B" : "#333"}
          />
        ))}
      </View>
    </View>
  );

  const renderMatchingGame = () => (
    <View style={styles.gameContent}>
      <Text style={styles.gameInstructionText}>
        {selectedTerm
          ? `Selected: ${selectedTerm.term} - Now tap a definition`
          : "Tap a term, then tap its matching definition"}
      </Text>

      <View style={styles.matchingContainer}>
        {/* Terms Column */}
        <View style={styles.termsColumn}>
          <Text style={styles.columnTitle}>Terms</Text>
          {currentTerms.map((term) => (
            <TouchableOpacity
              key={term.id}
              style={[
                styles.termButton,
                selectedTerm?.id === term.id && styles.selectedTerm,
                matches[term.id] && styles.matchedTerm,
              ]}
              onPress={() => !matches[term.id] && handleTermSelect(term)}
              disabled={!!matches[term.id]}
            >
              <Text
                style={[
                  styles.termText,
                  matches[term.id] && styles.matchedText,
                ]}
              >
                {term.term}
              </Text>
              {matches[term.id] && (
                <MaterialCommunityIcons
                  name="check"
                  size={20}
                  color="#4CAF50"
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Definitions Column */}
        <Animated.View
          style={[
            styles.definitionsColumn,
            { transform: [{ translateX: shakeAnimation }] },
          ]}
        >
          <Text style={styles.columnTitle}>Definitions</Text>
          {shuffledDefinitions.map((definition) => {
            const isMatched = Object.values(matches).includes(definition.id);
            return (
              <TouchableOpacity
                key={definition.id}
                style={[
                  styles.definitionButton,
                  isMatched && styles.matchedDefinition,
                ]}
                onPress={() => !isMatched && handleDefinitionSelect(definition)}
                disabled={isMatched}
              >
                <Text
                  style={[
                    styles.definitionText,
                    isMatched && styles.matchedText,
                  ]}
                >
                  {definition.definition}
                </Text>
                {isMatched && (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color="#4CAF50"
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>

      {showFeedback && (
        <View style={styles.feedbackBar}>
          <Text
            style={[
              styles.feedbackText,
              { color: lastMatchCorrect ? "#4CAF50" : "#FF6B6B" },
            ]}
          >
            {feedbackMessage}
          </Text>
        </View>
      )}
    </View>
  );

  const renderGameOver = () => {
    const finalScore = score + timeLeft; // Bonus points for remaining time
    const completedMatches = Object.keys(matches).length;

    return (
      <View style={styles.gameOverContainer}>
        <MaterialCommunityIcons
          name="flag-checkered"
          size={80}
          color={COLORS.primary}
        />
        <Text style={styles.gameOverTitle}>Game Over!</Text>
        <Text style={styles.finalScoreText}>Final Score: {finalScore}</Text>
        <Text style={styles.statsText}>
          Matches: {completedMatches}/{currentTerms.length}
        </Text>
        <Text style={styles.statsText}>Best Streak: {correctStreak}</Text>

        <View style={styles.gameOverButtons}>
          <TouchableOpacity style={styles.playAgainButton} onPress={resetGame}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resultBackButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back to Arcade</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderWelcomeScreen = () => (
    <ScrollView style={styles.welcomeContainer}>
      <View style={styles.welcomeHeader}>
        <MaterialCommunityIcons
          name="card-account-details-outline"
          size={80}
          color={COLORS.primary}
        />
        <Text style={styles.welcomeTitle}>Cyber Match</Text>
        <Text style={styles.welcomeSubtitle}>
          Match security terms with their definitions!
        </Text>
      </View>

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>How to Play:</Text>

        <View style={styles.instructionItem}>
          <MaterialCommunityIcons
            name="target"
            size={24}
            color={COLORS.primary}
          />
          <Text style={styles.instructionText}>
            Tap a term, then tap its matching definition to pair them
          </Text>
        </View>

        <View style={styles.instructionItem}>
          <MaterialCommunityIcons
            name="clock-fast"
            size={24}
            color={COLORS.primary}
          />
          <Text style={styles.instructionText}>
            You have 90 seconds. Correct matches add 3 seconds, wrong ones
            subtract 5
          </Text>
        </View>

        <View style={styles.instructionItem}>
          <MaterialCommunityIcons
            name="heart-multiple"
            size={24}
            color="#FF6B6B"
          />
          <Text style={styles.instructionText}>
            You have 3 lives. Lose them all and the game ends
          </Text>
        </View>

        <View style={styles.instructionItem}>
          <MaterialCommunityIcons name="trophy" size={24} color="#FFD700" />
          <Text style={styles.instructionText}>
            50 points per match + streak bonus (4 in a row = ×1.2 multiplier)
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={startGame}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.startButtonGradient}
        >
          <Text style={styles.startButtonText}>Start Matching</Text>
          <MaterialCommunityIcons name="play" size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  if (!gameStarted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cyber Match</Text>
          <View style={styles.headerSpacer} />
        </View>
        {renderWelcomeScreen()}
      </SafeAreaView>
    );
  }

  if (gameOver) {
    return (
      <SafeAreaView style={styles.container}>{renderGameOver()}</SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.safeArea}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cyber Match</Text>
          <View style={styles.headerSpacer} />
        </View>
        {renderGameHeader()}
        <ScrollView style={styles.scrollContainer}>
          {renderMatchingGame()}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40, // Same width as back button to center the title
  },
  welcomeContainer: {
    flex: 1,
    padding: 20,
  },
  welcomeHeader: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 20,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  instructionsContainer: {
    marginBottom: 40,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 20,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  instructionText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: 16,
    flex: 1,
  },
  startButton: {
    marginBottom: 20,
  },
  startButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginRight: 8,
  },
  gameHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBackground,
  },
  statContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statText: {
    color: COLORS.textPrimary,
    fontWeight: "bold",
    marginLeft: 6,
  },
  livesContainer: {
    flexDirection: "row",
    gap: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  gameContent: {
    flex: 1,
    padding: 20,
  },
  gameInstructionText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  matchingContainer: {
    flexDirection: "row",
    flex: 1,
    gap: 16,
  },
  termsColumn: {
    flex: 1,
  },
  definitionsColumn: {
    flex: 1,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 12,
    textAlign: "center",
  },
  termButton: {
    backgroundColor: COLORS.cardBackground,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedTerm: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}20`,
  },
  matchedTerm: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  termText: {
    color: COLORS.textPrimary,
    fontWeight: "bold",
    fontSize: 14,
    flex: 1,
  },
  matchedText: {
    color: "#FFFFFF",
  },
  definitionButton: {
    backgroundColor: COLORS.cardBackground,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
    minHeight: 60,
    justifyContent: "center",
  },
  matchedDefinition: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  definitionText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 16,
  },
  feedbackBar: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  finalScoreText: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 16,
  },
  statsText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  gameOverButtons: {
    flexDirection: "row",
    gap: 16,
    marginTop: 32,
  },
  playAgainButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  playAgainText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  resultBackButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default CyberMatch;
