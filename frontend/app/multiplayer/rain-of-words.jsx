import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Platform,
  Dimensions,
  useWindowDimensions,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  ImageBackground,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Animatable from "react-native-animatable";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { Asset } from "expo-asset";
import { AudioContext } from "react-native-audio-api";
import Video, { VideoRef } from "react-native-video";
import { useAuthStore } from "@/store/authStore";
import RainOfWordsSocket from "@/services/rainOfWordsSocket";

const WEB_VIEWPORT_HEIGHT =
  Platform.OS === "web" ? Dimensions.get("window").height : 800;
const WEB_VIEWPORT_WIDTH =
  Platform.OS === "web" ? Dimensions.get("window").width : 390;
const IS_COMPACT_LAYOUT = WEB_VIEWPORT_WIDTH < 768;

const AnimatedView = Animatable.createAnimatableComponent(View);
const AnimatedText = Animatable.createAnimatableComponent(Text);
const AnimatedLinearGradient = Animatable.createAnimatableComponent(LinearGradient);
const AnimatedTouchableOpacity = Animatable.createAnimatableComponent(TouchableOpacity);

const GAME_FONT_DISPLAY = Platform.select({
  ios: "Courier-Bold",
  android: "monospace",
  web: "monospace",
  default: "monospace",
});
const GAME_FONT_BODY = Platform.select({
  ios: "Courier",
  android: "monospace",
  web: "monospace",
  default: "monospace",
});
const TYPER_BACKGROUND = require("../../assets/images/typer/typer_bg.jpg");
const TYPER_BACKGROUND_VIDEO = require("../../assets/video/typer_bg_vid.mp4");
const QUESTION_BACKGROUND = require("../../assets/images/typer/question_background.png");
const TYPER_BG_MUSIC = require("../../assets/sounds/typer/typer_bg.mp3");
const SFX_ASSETS = {
  correct: require("../../assets/sounds/typer/typer_correct_ans.wav"),
  incorrect: require("../../assets/sounds/typer/typer_incorrect_ans.wav"),
  typing: require("../../assets/sounds/typer/typer_typing_se.wav"),
  correctFall: require("../../assets/sounds/typer/typer_correct_ans_fell.wav"),
  gameover: require("../../assets/sounds/typer/typer_gameover.wav"),
};
void VideoRef;

const WORD_TOKEN_COLORS = ["#00d4ff", "#4CAF50", "#9c27b0", "#FFB74D"];
const BACKDROP_ORBS = [
  { top: "8%", left: "8%", size: 140, color: "rgba(0, 212, 255, 0.14)" },
  { top: "20%", right: "6%", size: 110, color: "rgba(76, 175, 80, 0.12)" },
  { bottom: "12%", left: "12%", size: 90, color: "rgba(156, 39, 176, 0.12)" },
  { bottom: "22%", right: "18%", size: 70, color: "rgba(255, 183, 77, 0.12)" },
];

const MAX_QUESTIONS_PER_GAME = 10;
const SCREEN_HEIGHT = WEB_VIEWPORT_HEIGHT || 800;
const GAME_AREA_HEIGHT = Math.max(
  210,
  SCREEN_HEIGHT - (IS_COMPACT_LAYOUT ? 380 : 250)
); // Account for UI elements
const FALLING_SPEED_SLOW = 30000; // ms to fall
const FALLING_SPEED_MEDIUM = 25000;
const FALLING_SPEED_FAST = 10000;

// Sample questions for testing
const SAMPLE_QUESTIONS = [
  {
    id: 1,
    question: "What does SQL stand for?",
    answers: ["Structured Query Language", "Standard Query Language", "Simple Query Logic", "System Query Library"],
    correct: "Structured Query Language",
  },
  {
    id: 2,
    question: "Which port is commonly used for HTTPS?",
    answers: ["80", "443", "8080", "3000"],
    correct: "443",
  },
  {
    id: 3,
    question: "What does DDoS stand for?",
    answers: ["Distributed", "Digital", "Direct", "Denial"],
    correct: "Distributed",
  },
  {
    id: 4,
    question: "Which is a NoSQL database?",
    answers: ["PostgreSQL", "MongoDB", "MySQL", "SQLite"],
    correct: "MongoDB",
  },
  {
    id: 5,
    question: "What does CPU stand for?",
    answers: ["Central", "Computer", "Control", "Central Processing Unit"],
    correct: "Central Processing Unit",
  },
  {
    id: 6,
    question: "What is phishing?",
    answers: ["Fishing", "Social engineering attack", "Virus", "Malware"],
    correct: "Social engineering attack",
  },
  {
    id: 7,
    question: "What does VPN stand for?",
    answers: ["Virtual Private Network", "Virtual Public Network", "Very Personal Network", "Verified Private Network"],
    correct: "Virtual Private Network",
  },
  {
    id: 8,
    question: "Which protocol is secure?",
    answers: ["HTTP", "FTP", "HTTPS", "SMTP"],
    correct: "HTTPS",
  },
  {
    id: 9,
    question: "What does SQL stand for?",
    answers: ["Structured Query Language", "Standard Query Language", "Simple Query Logic", "System Query Library"],
    correct: "Structured Query Language",
  },
  {
    id: 10,
    question: "What is ransomware?",
    answers: ["Random software", "Malware that encrypts files", "Antivirus", "Firewall"],
    correct: "Malware that encrypts files",
  },
];

export default function RainOfWords() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const roomCodeParam = Array.isArray(params?.roomCode)
    ? params.roomCode[0]
    : params?.roomCode;
  const spectateParam = Array.isArray(params?.spectate)
    ? params.spectate[0]
    : params?.spectate;
  const isSpectateRoute =
    typeof spectateParam === "string" &&
    ["1", "true", "yes"].includes(spectateParam.toLowerCase());
  const normalizedSpectateRoomCode =
    typeof roomCodeParam === "string" ? roomCodeParam.trim().toUpperCase() : "";
  const user = useAuthStore((state) => state.user);
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const videoResizeMode = Platform.OS === "web" ? "stretch" : "cover";

  // Game state
  const [gameState, setGameState] = useState("lobby"); // lobby, waiting, playing, finished
  const [gameMode, setGameMode] = useState("play"); // play, instructor
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState(user?.fullName || "Player");
  const [opponent, setOpponent] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);

  // Gameplay state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [fallingWords, setFallingWords] = useState([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [textInput, setTextInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackKind, setFeedbackKind] = useState("neutral");
  const [feedbackTick, setFeedbackTick] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);

  // Refs
  const socketRef = useRef(null);
  const spectateRequestedRef = useRef(false);
  const inputRef = useRef(null);
  const missedRoundTimeoutRef = useRef(null);
  const nextQuestionTimeoutRef = useRef(null);
  const rotateAnim = useRef(new Animated.Value(0));
  const rotateAnimLoopRef = useRef(null);
  const backgroundVideoRef = useRef(/** @type {VideoRef | null} */ (null));
  const bgMusicContextRef = useRef(null);
  const bgMusicSourceRef = useRef(null);
  const sfxAudioBufferCacheRef = useRef({});
  const sfxContextRef = useRef(null);
  const backgroundVideoSource =
    Platform.OS === "web"
      ? { uri: Asset.fromModule(TYPER_BACKGROUND_VIDEO).uri }
      : TYPER_BACKGROUND_VIDEO;

  const renderBackgroundVideoLayer = () => (
    <View
      pointerEvents="none"
      style={[
        styles.backgroundVideoContainer,
        { width: viewportWidth, height: viewportHeight },
      ]}
    >
      <Video
        ref={backgroundVideoRef}
        source={backgroundVideoSource}
        style={[
          styles.backgroundVideoLayer,
          { width: viewportWidth, height: viewportHeight },
          Platform.OS === "web" && styles.backgroundVideoLayerPortraitWeb,
        ]}
        paused={false}
        muted
        volume={0}
        repeat
        resizeMode={videoResizeMode}
        playInBackground={false}
        playWhenInactive={false}
        controls={false}
        onError={(error) => {
          console.error("Background video failed:", error);
        }}
      />
    </View>
  );

  const clearMissedRoundTimer = useCallback(() => {
    if (missedRoundTimeoutRef.current) {
      clearTimeout(missedRoundTimeoutRef.current);
      missedRoundTimeoutRef.current = null;
    }
  }, []);

  const showFeedback = useCallback((message, kind = "neutral") => {
    setFeedback(message);
    setFeedbackKind(kind);
    setFeedbackTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!isSpectateRoute || !normalizedSpectateRoomCode) {
      return;
    }

    setIsSpectator(true);
    setRoomCode(normalizedSpectateRoomCode);
    setGameMode("play");
  }, [isSpectateRoute, normalizedSpectateRoomCode]);

  // Background music: load & play when the game is active, cleanup on stop/unmount
  useEffect(() => {
    let cancelled = false;

    const stopBgMusic = async () => {
      try {
        if (bgMusicSourceRef.current) {
          try {
            bgMusicSourceRef.current.stop();
          } catch {}
          bgMusicSourceRef.current = null;
        }
        const ctx = bgMusicContextRef.current;
        bgMusicContextRef.current = null;
        if (ctx) {
          try {
            await ctx.close();
          } catch {}
        }
      } catch (err) {
        console.error("Error stopping BGM:", err);
      }
    };

    const startBgMusic = async () => {
      await stopBgMusic();
      if (cancelled) return;
      try {
        const audioContext = new AudioContext();

        const uri = Platform.OS === "web" ? Asset.fromModule(TYPER_BG_MUSIC).uri : Asset.fromModule(TYPER_BG_MUSIC).uri;

        const resp = await fetch(uri);
        const arrayBuffer = await resp.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        if (cancelled) {
          try {
            await audioContext.close();
          } catch {}
          return;
        }

        const playerNode = audioContext.createBufferSource();
        playerNode.buffer = audioBuffer;
        playerNode.loop = true;
        playerNode.connect(audioContext.destination);
        playerNode.start(audioContext.currentTime || 0);

        bgMusicSourceRef.current = playerNode;
        bgMusicContextRef.current = audioContext;
      } catch (err) {
        console.error("Background music failed:", err);
      }
    };

if (gameState === "playing" || gameState === "lobby") {
      startBgMusic();
    } else {
      stopBgMusic();
    }

    return () => {
      cancelled = true;
      stopBgMusic();
    };
  }, [gameState]);

  // Cleanup SFX AudioContext on unmount
  useEffect(() => {
    return () => {
      const ctx = sfxContextRef.current;
      sfxContextRef.current = null;
      if (ctx) {
        try {
          ctx.close();
        } catch {}
      }
    };
  }, []);

  // Play short sound effects (typing, correct, correct-fall, gameover)
  const playSfx = useCallback(async (key, { volume = 1, loop = false } = {}) => {
    try {
      if (!SFX_ASSETS[key]) return;

      // Ensure we have a persistent SFX AudioContext
      let context = sfxContextRef.current;
      if (!context) {
        context = new AudioContext();
        sfxContextRef.current = context;
      }

      if (!sfxAudioBufferCacheRef.current[key]) {
        const uri = Platform.OS === "web" ? Asset.fromModule(SFX_ASSETS[key]).uri : Asset.fromModule(SFX_ASSETS[key]).uri;
        const resp = await fetch(uri);
        const arrayBuffer = await resp.arrayBuffer();
        // decode using the persistent context and cache the promise
        sfxAudioBufferCacheRef.current[key] = context.decodeAudioData(arrayBuffer);
      }

      const buffer = await sfxAudioBufferCacheRef.current[key];
      if (!buffer) return;

      const source = context.createBufferSource();
      const gainNode = context.createGain?.();
      source.buffer = buffer;
      source.loop = !!loop;

      if (gainNode) {
        gainNode.gain.value = volume;
        source.connect(gainNode);
        gainNode.connect(context.destination);
      } else {
        source.connect(context.destination);
      }

      source.start(context.currentTime || 0);

      // Cleanup only the source when finished; keep context alive for reuse
      source.onended = () => {
        try {
          source.disconnect();
        } catch {}
        try {
          if (gainNode) gainNode.disconnect();
        } catch {}
      };
    } catch (err) {
      console.error("playSfx error:", err);
    }
  }, []);

  // Spawn falling words for current question
  const spawnFallingWords = useCallback((question) => {
    if (!question || !question.answers) return;

    // Build Animatable keyframe animation for each falling word
    const words = question.answers.map((answer, index) => {
      const id = `word-${Date.now()}-${index}`;
      const speed = [FALLING_SPEED_SLOW, FALLING_SPEED_MEDIUM, FALLING_SPEED_FAST, FALLING_SPEED_MEDIUM][index] || FALLING_SPEED_MEDIUM;
      const startDelay = index * 200; // stagger
      // Randomize sway amplitude and direction for underwater effect
      const swayAmplitude = 8 + Math.round(Math.random() * 14);
      const tokenColor = WORD_TOKEN_COLORS[index % WORD_TOKEN_COLORS.length];

      // Keyframe animation: fall (translateY) + horizontal sway (translateX)
      const anim = {
        0: { translateY: 0, translateX: 0 },
        0.25: { translateX: swayAmplitude },
        0.5: { translateX: -swayAmplitude },
        0.75: { translateX: swayAmplitude / 2 },
        1: { translateY: GAME_AREA_HEIGHT, translateX: 0 },
      };

      return {
        id,
        text: answer,
        speed,
        startDelay,
        isCorrect: answer === question.correct,
        tokenColor,
        anim,
      };
    });

    setFallingWords(words);
    clearMissedRoundTimer();

    // Check if word hits bottom (missed round) using the slowest word timing + delay
    const missTimeout = Math.max(...words.map((w) => w.speed + w.startDelay)) + 500;
    missedRoundTimeoutRef.current = setTimeout(() => {
      if (!gameOver && gameState === "playing") {
        try {
          RainOfWordsSocket.missedRound(roomCode);
        } catch (error) {
          console.error("Error sending missed round:", error);
        }
      }
    }, missTimeout);
  }, [clearMissedRoundTimer, gameState, gameOver, roomCode]);

  // Spawn next question
  const spawnNewQuestion = useCallback(() => {
    if (questionsAnswered >= MAX_QUESTIONS_PER_GAME) {
      setGameOver(true);
      return;
    }

    const nextIndex = questionsAnswered % SAMPLE_QUESTIONS.length;
    const question = SAMPLE_QUESTIONS[nextIndex];
    setCurrentQuestion(question);

    // Shuffle answers
    const shuffledAnswers = [...question.answers].sort(() => Math.random() - 0.5);
    const shuffledQuestion = { ...question, answers: shuffledAnswers };

    setTextInput("");
    setFeedback("");
    setFeedbackKind("neutral");
    spawnFallingWords(shuffledQuestion);
  }, [questionsAnswered, spawnFallingWords]);

  // Socket event handlers
  const handleRoomCreated = useCallback((data) => {
    const resolvedRoomCode = data?.roomId || data?.roomCode || "";
    setRoomCode(resolvedRoomCode);
    setGameState("waiting");
    console.log("Room created:", resolvedRoomCode);
  }, []);

  const handleRoomJoined = useCallback((data) => {
    const resolvedRoomCode = data?.roomId || data?.roomCode || "";
    setRoomCode(resolvedRoomCode);
    setOpponent(data.opponentName || null);
    setGameState("waiting");
    console.log("Room joined:", resolvedRoomCode);
  }, []);

  const handleOpponentJoined = useCallback((data) => {
    setOpponent(data.playerName);
    // Ensure UI updates to showing ready-to-start when opponent arrives
    setGameState("waiting");
    console.log("Opponent joined:", data.playerName);
  }, []);

  const handleGameState = useCallback(
    (data) => {
      const publicGame = data?.game || null;

      if (!publicGame) {
        return;
      }

      if (isSpectator || isSpectateRoute) {
        const players = Array.isArray(publicGame.players) ? publicGame.players : [];
        const firstPlayer = players[0] || null;
        const secondPlayer = players[1] || null;

        setGameState(publicGame.gameState || "waiting");
        setRoomCode(publicGame.roomId || normalizedSpectateRoomCode || roomCode);
        setCurrentQuestion(publicGame.currentQuestion || null);
        setCurrentQuestionIndex(publicGame.questionsAnswered || 0);
        setQuestionsAnswered(publicGame.questionsAnswered || 0);
        setPlayerScore(firstPlayer?.score || 0);
        setOpponentScore(secondPlayer?.score || 0);
        setPlayerName(firstPlayer?.name || "Player 1");
        setOpponent(secondPlayer?.name || null);

        if (publicGame.gameState === "playing" && publicGame.currentQuestion) {
          spawnFallingWords(publicGame.currentQuestion);
        }

        if (publicGame.gameState !== "playing") {
          setFallingWords([]);
        }
        return;
      }

      const players = publicGame.players || [];
      const normalizedName = (playerName || "").trim().toLowerCase();
      const opponentPlayer = players.find(
        (p) => (p?.name || "").trim().toLowerCase() !== normalizedName
      );

      if (opponentPlayer?.name) {
        setOpponent(opponentPlayer.name);
        // If game-state shows another player, ensure we reflect waiting state
        setGameState("waiting");
      }
    },
    [isSpectator, isSpectateRoute, normalizedSpectateRoomCode, playerName, roomCode, spawnFallingWords]
  );

  const handleRoomWatched = useCallback((data) => {
    const publicGame = data?.game || null;
    setIsSpectator(true);

    if (publicGame?.roomId) {
      setRoomCode(publicGame.roomId);
    } else if (data?.roomId) {
      setRoomCode(data.roomId);
    }

    if (!publicGame) {
      return;
    }

    setGameState(publicGame.gameState || "waiting");
    setCurrentQuestion(publicGame.currentQuestion || null);
    setCurrentQuestionIndex(publicGame.questionsAnswered || 0);
    setQuestionsAnswered(publicGame.questionsAnswered || 0);

    const players = Array.isArray(publicGame.players) ? publicGame.players : [];
    setPlayerScore(players[0]?.score || 0);
    setOpponentScore(players[1]?.score || 0);
    setPlayerName(players[0]?.name || "Player 1");
    setOpponent(players[1]?.name || null);

    if (publicGame.gameState === "playing" && publicGame.currentQuestion) {
      spawnFallingWords(publicGame.currentQuestion);
    }

    if (publicGame.gameState !== "playing") {
      setFallingWords([]);
    }
  }, [spawnFallingWords]);

  const handleGameStarted = useCallback((data) => {
    setGameState("playing");
    setCurrentQuestionIndex(0);
    setPlayerScore(0);
    setOpponentScore(0);
    setQuestionsAnswered(0);
    spawnNewQuestion();
    console.log("Game started");
  }, [spawnNewQuestion]);

  const handleQuestionDisplay = useCallback((data) => {
    setCurrentQuestion(data.question);
    setCurrentQuestionIndex(data.questionIndex);
    spawnFallingWords(data.question);
  }, [spawnFallingWords]);

  const handleAnswerResult = useCallback((data) => {
    if (data.isCorrect) {
      setPlayerScore(data.playerScore);
      clearMissedRoundTimer();
      showFeedback("✓ Correct!", "success");
      playSfx("correct", { volume: 0.6 });
      if (data.gameFinished) {
        setGameOver(true);
        setWinner("You");
        playSfx("gameover", { volume: 0.7 });
      }
    } else {
      showFeedback("✗ Wrong answer", "error");
    }
  }, [clearMissedRoundTimer, playSfx, showFeedback]);

  const handleOpponentAnswer = useCallback((data) => {
    setOpponentScore(data.opponentScore);
    if (data.gameFinished) {
      setGameOver(true);
      setWinner("Opponent");
    }
  }, []);

  const handleMissedRound = useCallback(() => {
    showFeedback("⏰ Missed! New question...", "warning");
    setQuestionsAnswered((prev) => prev + 1);
    // play correct-fall SFX to indicate the correct answer fell
    playSfx("correctFall", { volume: 0.6 });
    missedRoundTimeoutRef.current = setTimeout(() => {
      spawnNewQuestion();
    }, 1500);
  }, [spawnNewQuestion, playSfx, showFeedback]);

  const handleGameFinished = useCallback((data) => {
    setGameOver(true);
    setWinner(data.winner);
    setPlayerScore(data.finalScores[0]);
    setOpponentScore(data.finalScores[1]);
    // play gameover SFX
    playSfx("gameover", { volume: 0.7 });
  }, [playSfx]);

  // Initialize socket
  useEffect(() => {
    const socket = RainOfWordsSocket.connect();
    socketRef.current = socket;

    const onConnect = () => {
      console.log("Socket connected");
      setIsConnected(true);
    };

    const onDisconnect = () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    };

    const onConnectError = (data) => {
      console.error("Socket error:", data);
      setIsConnected(false);
    };

    const onServerError = (data) => {
      const message = data?.message || "Unable to process multiplayer request.";
      console.error("Server socket error:", data);
      Alert.alert("Rain of Words", message);
      setGameState("lobby");
    };

    // Reflect current state immediately in case socket is already connected.
    setIsConnected(Boolean(socket?.connected));

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("error", onServerError);

    socket.on("room-created", handleRoomCreated);
    socket.on("room-joined", handleRoomJoined);
    socket.on("room-watched", handleRoomWatched);
    socket.on("opponent-joined", handleOpponentJoined);
    socket.on("game-started", handleGameStarted);
    socket.on("question-display", handleQuestionDisplay);
    socket.on("answer-result", handleAnswerResult);
    socket.on("opponent-answer", handleOpponentAnswer);
    socket.on("missed-round", handleMissedRound);
    socket.on("game-finished", handleGameFinished);
    socket.on("game-state", handleGameState);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("error", onServerError);
      socket.off("room-created", handleRoomCreated);
      socket.off("room-joined", handleRoomJoined);
      socket.off("room-watched", handleRoomWatched);
      socket.off("opponent-joined", handleOpponentJoined);
      socket.off("game-started", handleGameStarted);
      socket.off("question-display", handleQuestionDisplay);
      socket.off("answer-result", handleAnswerResult);
      socket.off("opponent-answer", handleOpponentAnswer);
      socket.off("missed-round", handleMissedRound);
      socket.off("game-finished", handleGameFinished);
      socket.off("game-state", handleGameState);
    };
  }, [
    handleRoomCreated,
    handleRoomJoined,
    handleRoomWatched,
    handleOpponentJoined,
    handleGameStarted,
    handleQuestionDisplay,
    handleAnswerResult,
    handleOpponentAnswer,
    handleMissedRound,
    handleGameFinished,
    handleGameState,
  ]);

  useEffect(() => {
    if (isSpectator || isSpectateRoute) {
      return;
    }

    if (gameState !== "waiting" || !roomCode || !isConnected) return;

    const requestGameState = () => {
      try {
        RainOfWordsSocket.getGameState(roomCode);
      } catch (error) {
        console.error("Failed to fetch waiting game state:", error);
      }
    };

    requestGameState();
    const intervalId = setInterval(requestGameState, 1500);

    return () => clearInterval(intervalId);
  }, [gameState, roomCode, isConnected, isSpectator, isSpectateRoute]);

  useEffect(() => {
    if (!isSpectateRoute || !normalizedSpectateRoomCode || !isConnected) {
      return;
    }

    if (spectateRequestedRef.current) {
      return;
    }

    spectateRequestedRef.current = true;
    try {
      RainOfWordsSocket.watchRoom(normalizedSpectateRoomCode);
    } catch (error) {
      console.error("Failed to watch Rain of Words room:", error);
      spectateRequestedRef.current = false;
    }
  }, [isConnected, isSpectateRoute, normalizedSpectateRoomCode]);

  // Animate rotation for waiting icon and pulse the waiting text
  useEffect(() => {
    const rotateValue = rotateAnim.current;

    if (gameState === "waiting") {
      // Only start if not already running
      if (!rotateAnimLoopRef.current) {
        rotateValue.setValue(0);
        rotateAnimLoopRef.current = Animated.loop(
          Animated.timing(rotateValue, {
            toValue: 1,
            duration: 1200,
            easing: Easing.linear,
            useNativeDriver: false,
          })
        );
        rotateAnimLoopRef.current.start();
      }
    } else {
      // Stop animation when leaving waiting state
      if (rotateAnimLoopRef.current) {
        rotateAnimLoopRef.current.stop();
        rotateAnimLoopRef.current = null;
      }
      rotateValue.setValue(0);
    }

    return () => {
      if (gameState !== "waiting" && rotateAnimLoopRef.current) {
        rotateAnimLoopRef.current.stop();
        rotateAnimLoopRef.current = null;
      }
    };
  }, [gameState]);

  // Handle text input submission
  const handleSubmitAnswer = useCallback(() => {
    if (isSpectator) {
      return;
    }

    if (!textInput.trim() || !currentQuestion) return;

    const isCorrect = textInput.toLowerCase().trim() === currentQuestion.correct.toLowerCase();

    try {
      RainOfWordsSocket.submitAnswer(roomCode, textInput, isCorrect, currentQuestionIndex);
    } catch (error) {
      console.error("Error submitting answer:", error);
    }

    if (isCorrect) {
      // play correct sound
      playSfx("correct", { volume: 0.6 });
      clearMissedRoundTimer();
      setPlayerScore((prev) => prev + 1);
      setQuestionsAnswered((prev) => prev + 1);
      showFeedback("✓ Correct!", "success");

      if (playerScore + 1 >= MAX_QUESTIONS_PER_GAME) {
        setGameOver(true);
        setWinner("You");
        // play gameover too
        playSfx("gameover", { volume: 0.7 });
      } else {
        nextQuestionTimeoutRef.current = setTimeout(() => {
          spawnNewQuestion();
        }, 1500);
      }
    } else {
      playSfx("incorrect", { volume: 0.6 });
      showFeedback("✗ Try again!", "error");
    }

    setTextInput("");
  }, [clearMissedRoundTimer, isSpectator, textInput, currentQuestion, currentQuestionIndex, roomCode, playerScore, spawnNewQuestion, playSfx, showFeedback]);

  // Handle key press (Enter to submit)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Enter" && gameState === "playing" && !gameOver) {
        handleSubmitAnswer();
      }
    };

    if (Platform.OS === "web") {
      window.addEventListener("keydown", handleKeyPress);
      return () => window.removeEventListener("keydown", handleKeyPress);
    }
  }, [handleSubmitAnswer, gameState, gameOver]);

  // Create or join room
  const handleCreateRoom = () => {
    if (isSpectator) return;

    if (!playerName.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }
    if (!isConnected) {
      Alert.alert("Connecting", "Please wait while connecting to server...");
      return;
    }
    try {
      RainOfWordsSocket.createRoom(playerName);
    } catch (error) {
      Alert.alert("Error", "Failed to create room: " + error.message);
    }
  };

  const handleJoinRoom = () => {
    if (isSpectator) return;

    if (!roomCode.trim()) {
      Alert.alert("Error", "Please enter room code");
      return;
    }
    if (!playerName.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }
    if (!isConnected) {
      Alert.alert("Connecting", "Please wait while connecting to server...");
      return;
    }
    try {
      RainOfWordsSocket.joinRoom(roomCode.toUpperCase(), playerName);
    } catch (error) {
      Alert.alert("Error", "Failed to join room: " + error.message);
    }
  };

  const handleStartGame = () => {
    if (isSpectator) return;

    try {
      RainOfWordsSocket.startGame(roomCode);
    } catch (error) {
      Alert.alert("Error", "Failed to start game: " + error.message);
    }
  };

  const handleLeaveGame = () => {
    try {
      RainOfWordsSocket.leaveRoom(roomCode);
    } catch (error) {
      console.error("Error leaving room:", error);
    }

    setGameState("lobby");
    setGameMode("play");
    setRoomCode("");
    setOpponent(null);
    setCurrentQuestion(null);
    setFallingWords([]);
    setPlayerScore(0);
    setOpponentScore(0);
    setTextInput("");
    setFeedback("");
    setFeedbackKind("neutral");
    setFeedbackTick((prev) => prev + 1);
    setQuestionsAnswered(0);
    setGameOver(false);
    setWinner(null);
    setIsSpectator(false);
  };

  const handleRematch = () => {
    if (isSpectator) return;

    setGameState("waiting");
    setPlayerScore(0);
    setOpponentScore(0);
    setGameOver(false);
    setWinner(null);
    setQuestionsAnswered(0);
    try {
      RainOfWordsSocket.startGame(roomCode);
    } catch (error) {
      Alert.alert("Error", "Failed to start rematch: " + error.message);
    }
  };

  // Render falling word
  const renderFallingWord = (word, index) => {
    const wordColor = word.tokenColor || "#00d4ff";
    const inputLetters = textInput.toLowerCase().split('');
    const wordLetters = word.text.toLowerCase().split('');
    const allLettersMatched = wordLetters.length > 0 && wordLetters.every(letter => inputLetters.includes(letter));

    return (
      <AnimatedView
        key={word.id}
        animation={word.anim}
        duration={word.speed}
        delay={word.startDelay}
        easing="linear"
        iterationCount={1}
        useNativeDriver={true}
        style={[
          styles.fallingWord,
          {
            left: `${(index * 100) / (fallingWords.length || 1)}%`,
          },
          allLettersMatched && {
            shadowColor: wordColor,
            shadowOpacity: 1,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 0 },
            elevation: 25,
          },
        ]}
      >
        {/* Outer glow effect */}
        <View
          pointerEvents="none"
          style={[
            styles.wordTokenOuterGlow,
            {
              borderColor: wordColor,
              shadowColor: wordColor,
            },
            allLettersMatched && styles.wordTokenOuterGlowActive,
          ]}
        />
        
        {/* Main token container */}
        <AnimatedLinearGradient
          colors={
            allLettersMatched
              ? [wordColor + "66", wordColor + "33"]
              : [wordColor + "33", wordColor + "0a"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.wordTokenGlow,
            { borderColor: wordColor },
            allLettersMatched && [styles.wordTokenGlowActive, { borderColor: "#72ff96" }],
          ]}
        >
          {/* Top accent bar */}
          <View style={[styles.wordTokenAccent, { backgroundColor: allLettersMatched ? "#72ff96" : wordColor }]} />
          
          <View style={styles.wordTokenTopRow}>
            <View style={[styles.wordTokenDot, { backgroundColor: allLettersMatched ? "#72ff96" : wordColor, shadowColor: wordColor }]} />
            <MaterialCommunityIcons name="flash" size={14} color={allLettersMatched ? "#72ff96" : wordColor} />
          </View>
          
          {/* Character-by-character rendering with highlighting */}
          <View style={styles.wordCharacterContainer}>
            {word.text.split('').map((char, charIndex) => {
              const isMatched = inputLetters.includes(char.toLowerCase());
              return (
                <Text
                  key={charIndex}
                  style={[
                    styles.wordCharacter,
                    { color: wordColor },
                    isMatched && [styles.wordCharacterHighlighted, { shadowColor: wordColor }],
                  ]}
                >
                  {char}
                </Text>
              );
            })}
          </View>
          
          <View style={[styles.wordTokenBase, { backgroundColor: allLettersMatched ? "#72ff96" : wordColor }]} />
          {/* Bottom accent bar */}
          <View style={[styles.wordTokenAccent, { backgroundColor: allLettersMatched ? "#72ff96" : wordColor, marginTop: 6 }]} />
        </AnimatedLinearGradient>
      </AnimatedView>
    );
  };

  // LOBBY STATE
  if (isSpectateRoute && isSpectator && gameState === "lobby") {
    return (
      <ImageBackground
        source={TYPER_BACKGROUND}
        resizeMode="cover"
        style={styles.container}
        imageStyle={styles.backgroundImage}
      >
        {renderBackgroundVideoLayer()}
        <LinearGradient colors={["rgba(26,26,46,0.5)", "rgba(22,33,62,0.5)"]} style={styles.backgroundOverlay}>
          <SafeAreaView style={styles.safeArea}>
            <View style={[styles.lobbyContainer, IS_COMPACT_LAYOUT && styles.lobbyContainerCompact]}>
              <AnimatedText animation="pulse" iterationCount="infinite" style={styles.title}>
                Spectating Rain of Words
              </AnimatedText>
              <Text style={[styles.subtitle, IS_COMPACT_LAYOUT && styles.subtitleCompact]}>
                Waiting for room {roomCode || normalizedSpectateRoomCode || "..."}
              </Text>
              <AnimatedLinearGradient
                colors={["rgba(0,212,255,0.18)", "rgba(156,39,176,0.12)"]}
                style={styles.connectionStatus}
              >
                <View style={[styles.statusDot, { backgroundColor: isConnected ? "#4CAF50" : "#ff9800" }]} />
                <Text style={styles.statusText}>{isConnected ? "Connected" : "Connecting..."}</Text>
              </AnimatedLinearGradient>
              <AnimatedTouchableOpacity animation="fadeInUp" duration={450} style={[styles.backButton, IS_COMPACT_LAYOUT && styles.backButtonCompact]} onPress={handleLeaveGame}>
                <Text style={styles.backButtonText}>← Leave Spectator</Text>
              </AnimatedTouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    );
  }

  if (gameState === "lobby") {
    return (
      <ImageBackground
        source={TYPER_BACKGROUND}
        resizeMode="cover"
        style={styles.container}
        imageStyle={styles.backgroundImage}
      >
        {renderBackgroundVideoLayer()}
        <LinearGradient colors={["rgba(26,26,46,0.5)", "rgba(22,33,62,0.5)"]} style={styles.backgroundOverlay}>
        <SafeAreaView style={styles.safeArea}>
          {BACKDROP_ORBS.map((orb, index) => (
            <View
              key={`lobby-orb-${index}`}
              pointerEvents="none"
              style={[
                styles.backdropOrb,
                {
                  top: orb.top,
                  left: orb.left,
                  right: orb.right,
                  bottom: orb.bottom,
                  width: orb.size,
                  height: orb.size,
                  backgroundColor: orb.color,
                },
              ]}
            />
          ))}
          <ScrollView
            contentContainerStyle={styles.stateScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          <View style={[styles.lobbyContainer, IS_COMPACT_LAYOUT && styles.lobbyContainerCompact]}>
            <AnimatedText animation="bounceIn" style={[styles.title, IS_COMPACT_LAYOUT && styles.titleCompact]}>
              Rain of Words
            </AnimatedText>
            <Text style={[styles.subtitle, IS_COMPACT_LAYOUT && styles.subtitleCompact]}>Type fast, type right!</Text>

            {/* Connection Status */}
            <AnimatedLinearGradient
              colors={["rgba(0,212,255,0.18)", "rgba(156,39,176,0.12)"]}
              style={styles.connectionStatus}
            >
              <View style={[styles.statusDot, { backgroundColor: isConnected ? "#4CAF50" : "#ff9800" }]} />
              <Text style={styles.statusText}>
                {isConnected ? "Connected" : "Connecting..."}
              </Text>
            </AnimatedLinearGradient>

            <View style={[styles.modeSelector, IS_COMPACT_LAYOUT && styles.modeSelectorCompact]}>
              <TouchableOpacity
                style={[styles.modeButton, gameMode === "play" && styles.modeButtonActive]}
                onPress={() => setGameMode("play")}
                disabled={isSpectator}
              >
                <MaterialCommunityIcons name="gamepad-variant" size={24} color="#fff" />
                <Text style={styles.modeButtonText}>Play</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeButton, gameMode === "instructor" && styles.modeButtonActive]}
                onPress={() => {
                  if (isSpectator) return;
                  setGameMode("instructor");
                  router.push("/multiplayer/rain-of-words-instructor");
                }}
                disabled={isSpectator}
              >
                <MaterialCommunityIcons name="pencil" size={24} color="#fff" />
                <Text style={styles.modeButtonText}>Instructor</Text>
              </TouchableOpacity>
            </View>

            {gameMode === "play" && (
              <View style={[styles.playSection, IS_COMPACT_LAYOUT && styles.playSectionCompact]}>
                <TextInput
                  style={[styles.input, IS_COMPACT_LAYOUT && styles.inputCompact]}
                  placeholder="Your Name"
                  placeholderTextColor="#666"
                  value={playerName}
                  onChangeText={setPlayerName}
                  editable={!isSpectator}
                />

                <AnimatedTouchableOpacity animation="pulse" duration={700} style={styles.primaryButton} onPress={handleCreateRoom} disabled={isSpectator}>
                  <LinearGradient colors={["#00d4ff", "#0099cc"]} style={styles.buttonGradient}>
                    <Text style={styles.buttonText}>Create Room</Text>
                  </LinearGradient>
                </AnimatedTouchableOpacity>

                <Text style={styles.orText}>OR</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Room Code"
                  placeholderTextColor="#666"
                  value={roomCode}
                  onChangeText={setRoomCode}
                  maxLength={6}
                  editable={!isSpectator}
                />

                <AnimatedTouchableOpacity animation="pulse" duration={700} delay={80} style={styles.primaryButton} onPress={handleJoinRoom} disabled={isSpectator}>
                  <LinearGradient colors={["#9c27b0", "#7b1fa2"]} style={styles.buttonGradient}>
                    <Text style={styles.buttonText}>Join Room</Text>
                  </LinearGradient>
                </AnimatedTouchableOpacity>
              </View>
            )}

            <AnimatedTouchableOpacity animation="fadeInUp" duration={450} style={[styles.backButton, IS_COMPACT_LAYOUT && styles.backButtonCompact]} onPress={handleLeaveGame}>
              <Text style={styles.backButtonText}>← Back</Text>
            </AnimatedTouchableOpacity>
          </View>
          </ScrollView>
        </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    );
  }

  // WAITING STATE
  if (gameState === "waiting") {
    return (
      <ImageBackground
        source={TYPER_BACKGROUND}
        resizeMode="cover"
        style={styles.container}
        imageStyle={styles.backgroundImage}
      >
        {renderBackgroundVideoLayer()}
        <LinearGradient colors={["rgba(26,26,46,0.5)", "rgba(22,33,62,0.5)"]} style={styles.backgroundOverlay}>
        <SafeAreaView style={styles.safeArea}>
          {BACKDROP_ORBS.map((orb, index) => (
            <View
              key={`waiting-orb-${index}`}
              pointerEvents="none"
              style={[
                styles.backdropOrb,
                {
                  top: orb.top,
                  left: orb.left,
                  right: orb.right,
                  bottom: orb.bottom,
                  width: orb.size,
                  height: orb.size,
                  backgroundColor: orb.color,
                },
              ]}
            />
          ))}
          <ScrollView
            contentContainerStyle={styles.stateScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {/* Spectator Indicator */}
          {isSpectator && (
              <View style={styles.spectatorBanner}>
                <MaterialCommunityIcons name="eye-outline" size={16} color="#fff" />
                <Text style={styles.spectatorBannerText}>You are spectating - read-only mode</Text>
              </View>
          )}
          <View style={[styles.waitingContainer, IS_COMPACT_LAYOUT && styles.waitingContainerCompact]}>
            <Text style={[styles.roomCodeDisplay, IS_COMPACT_LAYOUT && styles.roomCodeDisplayCompact]}>Room: {roomCode}</Text>
            <Text style={[styles.playerName, IS_COMPACT_LAYOUT && styles.playerNameCompact]}>{isSpectator ? "Spectating" : playerName}</Text>

            {opponent ? (
              <View style={styles.opponentSection}>
                <MaterialCommunityIcons name="account-check" size={40} color="#4CAF50" />
                <Text style={styles.opponentText}>{opponent} joined!</Text>
                <AnimatedTouchableOpacity animation="jello" duration={850} style={[styles.startButton, IS_COMPACT_LAYOUT && styles.startButtonCompact]} onPress={handleStartGame} disabled={isSpectator}>
                  <LinearGradient colors={["#00d4ff", "#4CAF50"]} style={styles.buttonGradient}>
                    <Text style={styles.buttonText}>Start Game</Text>
                  </LinearGradient>
                </AnimatedTouchableOpacity>
              </View>
            ) : (
              <View style={styles.waitingIndicator}>
                  <Animated.View
                    style={{
                      transform: [
                        {
                          rotate: rotateAnim.current.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0deg", "360deg"],
                          }),
                        },
                      ],
                    }}
                  >
                    <MaterialCommunityIcons name="loading" size={40} color="#00d4ff" />
                  </Animated.View>
                  <AnimatedText animation="pulse" iterationCount="infinite" style={styles.waitingText}>
                    Waiting for opponent...
                  </AnimatedText>
                </View>
            )}

            <AnimatedTouchableOpacity animation="fadeInUp" duration={450} style={[styles.backButton, IS_COMPACT_LAYOUT && styles.backButtonCompact]} onPress={handleLeaveGame}>
              <Text style={styles.backButtonText}>{isSpectator ? "← Leave Spectator" : "← Leave"}</Text>
            </AnimatedTouchableOpacity>
          </View>
          </ScrollView>
        </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    );
  }

  // PLAYING STATE
  if (gameState === "playing" && !gameOver) {
    return (
      <ImageBackground
        source={TYPER_BACKGROUND}
        resizeMode="cover"
        style={styles.container}
        imageStyle={styles.backgroundImage}
      >
        {renderBackgroundVideoLayer()}
        <LinearGradient colors={["rgba(15,15,30,0.55)", "rgba(26,26,46,0.55)"]} style={styles.backgroundOverlay}>
        <SafeAreaView style={styles.safeArea}>
          {BACKDROP_ORBS.map((orb, index) => (
            <View
              key={`play-orb-${index}`}
              pointerEvents="none"
              style={[
                styles.backdropOrb,
                {
                  top: orb.top,
                  left: orb.left,
                  right: orb.right,
                  bottom: orb.bottom,
                  width: orb.size,
                  height: orb.size,
                  backgroundColor: orb.color,
                },
              ]}
            />
          ))}
          <ScrollView
            contentContainerStyle={styles.stateScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {/* Spectator Indicator */}
          {isSpectator && (
              <View style={styles.spectatorBanner}>
                <MaterialCommunityIcons name="eye-outline" size={16} color="#fff" />
                <Text style={styles.spectatorBannerText}>You are spectating - read-only mode</Text>
              </View>
          )}
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.gameContainer, IS_COMPACT_LAYOUT && styles.gameContainerCompact]}>
            {/* Score Bar */}
            <View style={[styles.scoreBar, IS_COMPACT_LAYOUT && styles.scoreBarCompact]}>
              <View style={styles.scoreSection}>
                <Text style={styles.scoreName}>{playerName}</Text>
                <Text style={styles.score}>{playerScore}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.scoreSection}>
                <Text style={styles.scoreName}>{opponent || "Opponent"}</Text>
                <Text style={styles.score}>{opponentScore}</Text>
              </View>
            </View>

            {/* Question Display */}
            {currentQuestion && (
              <AnimatedView animation="fadeInDown" style={[styles.questionSection, IS_COMPACT_LAYOUT && styles.questionSectionCompact]}>
                <ImageBackground
                  source={QUESTION_BACKGROUND}
                  resizeMode="cover"
                  style={styles.questionBackgroundContainer}
                  imageStyle={styles.questionBackgroundImage}
                >
                  <View style={styles.questionBadgeRow}>
                    <View style={styles.questionBadge}>
                      <MaterialCommunityIcons name="target" size={14} color="#00d4ff" />
                      <Text style={styles.questionBadgeText}>TARGET WORDS</Text>
                    </View>
                    <Text style={styles.questionStep}>Wave {questionsAnswered + 1}/{MAX_QUESTIONS_PER_GAME}</Text>
                  </View>
                  <Text style={styles.questionText}>{currentQuestion.question}</Text>
                </ImageBackground>
              </AnimatedView>
            )}

            {/* Falling Words Area */}
            <View style={[styles.gameArea, IS_COMPACT_LAYOUT && styles.gameAreaCompact]}>
              <View pointerEvents="none" style={styles.gameAreaGrid} />
              {fallingWords.map((word, index) => renderFallingWord(word, index))}

              {/* Feedback Overlay */}
              {feedback && (
                <View style={styles.feedbackOverlay}>
                  <AnimatedView
                    key={`${feedbackKind}-${feedbackTick}`}
                    animation="shake"
                    duration={600}
                    style={[
                      styles.feedbackBox,
                      feedbackKind === "success" && styles.feedbackBoxSuccess,
                      feedbackKind === "error" && styles.feedbackBoxError,
                      feedbackKind === "warning" && styles.feedbackBoxWarning,
                      IS_COMPACT_LAYOUT && styles.feedbackBoxCompact,
                    ]}
                  >
                    <View style={styles.feedbackHeaderRow}>
                      <MaterialCommunityIcons
                        name={feedbackKind === "success" ? "check-decagram" : feedbackKind === "error" ? "close-octagon" : "alert-decagram"}
                        size={28}
                        color={feedbackKind === "success" ? "#72ff96" : feedbackKind === "error" ? "#ff6b6b" : "#ffd166"}
                      />
                      <Text
                        style={[
                          styles.feedbackLabel,
                          feedbackKind === "success" && styles.feedbackLabelSuccess,
                          feedbackKind === "error" && styles.feedbackLabelError,
                          feedbackKind === "warning" && styles.feedbackLabelWarning,
                        ]}
                      >
                        {feedbackKind === "success" ? "Combo Up" : feedbackKind === "error" ? "Retry" : "Watch Out"}
                      </Text>
                    </View>
                    <Text style={styles.feedbackText}>{feedback}</Text>
                  </AnimatedView>
                </View>
              )}
            </View>

            {/* Input Section */}
              <View style={[styles.inputSection, IS_COMPACT_LAYOUT && styles.inputSectionCompact]}>
                <TextInput
                ref={inputRef}
                style={[styles.gameInput, IS_COMPACT_LAYOUT && styles.gameInputCompact]}
                placeholder="Type the answer..."
                placeholderTextColor="#666"
                value={textInput}
                onChangeText={(t) => {
                  if (isSpectator) {
                    return;
                  }
                  setTextInput(t);
                  // typing SFX for each keystroke
                  playSfx("typing", { volume: 0.50 });
                }}
                autoFocus
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => handleSubmitAnswer()}
                editable={!gameOver && !isSpectator}
              />
              <AnimatedTouchableOpacity animation="pulse" duration={650} style={[styles.submitButton, IS_COMPACT_LAYOUT && styles.submitButtonCompact]} onPress={handleSubmitAnswer} disabled={isSpectator}>
                <MaterialCommunityIcons name="send" size={24} color="#fff" />
              </AnimatedTouchableOpacity>
            </View>
          </KeyboardAvoidingView>
          </ScrollView>
        </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    );
  }

  // FINISHED STATE
  if (gameOver) {
    return (
      <ImageBackground
        source={TYPER_BACKGROUND}
        resizeMode="cover"
        style={styles.container}
        imageStyle={styles.backgroundImage}
      >
        {renderBackgroundVideoLayer()}
        <LinearGradient colors={["rgba(26,26,46,0.5)", "rgba(22,33,62,0.5)"]} style={styles.backgroundOverlay}>
        <SafeAreaView style={styles.safeArea}>
          {BACKDROP_ORBS.map((orb, index) => (
            <View
              key={`finish-orb-${index}`}
              pointerEvents="none"
              style={[
                styles.backdropOrb,
                {
                  top: orb.top,
                  left: orb.left,
                  right: orb.right,
                  bottom: orb.bottom,
                  width: orb.size,
                  height: orb.size,
                  backgroundColor: orb.color,
                },
              ]}
            />
          ))}
          <ScrollView
            contentContainerStyle={styles.stateScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          <View style={[styles.finishedContainer, IS_COMPACT_LAYOUT && styles.finishedContainerCompact]}>
            <AnimatedText animation="bounceIn" style={[styles.finishedTitle, IS_COMPACT_LAYOUT && styles.finishedTitleCompact]}>
              {winner === "You" ? "🎉 You Won! 🎉" : "Game Over"}
            </AnimatedText>

            <View style={[styles.finalScores, IS_COMPACT_LAYOUT && styles.finalScoresCompact]}>
              <View style={[styles.finalScoreCard, IS_COMPACT_LAYOUT && styles.finalScoreCardCompact]}>
                <Text style={styles.finalScoreName}>{playerName}</Text>
                <Text style={styles.finalScore}>{playerScore}</Text>
              </View>
              <Text style={[styles.vsText, IS_COMPACT_LAYOUT && styles.vsTextCompact]}>vs</Text>
              <View style={[styles.finalScoreCard, IS_COMPACT_LAYOUT && styles.finalScoreCardCompact]}>
                <Text style={styles.finalScoreName}>{opponent || "Opponent"}</Text>
                <Text style={styles.finalScore}>{opponentScore}</Text>
              </View>
            </View>

            <AnimatedTouchableOpacity animation="pulse" duration={700} style={[styles.primaryButton, IS_COMPACT_LAYOUT && styles.primaryButtonCompact]} onPress={handleRematch}>
              <LinearGradient colors={["#4CAF50", "#2e7d32"]} style={styles.buttonGradient}>
                <Text style={styles.buttonText}>Play Again</Text>
              </LinearGradient>
            </AnimatedTouchableOpacity>

            <AnimatedTouchableOpacity animation="fadeInUp" duration={450} style={[styles.secondaryButton, IS_COMPACT_LAYOUT && styles.secondaryButtonCompact]} onPress={handleLeaveGame}>
              <Text style={styles.secondaryButtonText}>Exit</Text>
            </AnimatedTouchableOpacity>
          </View>
          </ScrollView>
        </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  backgroundOverlay: {
    flex: 1,
    zIndex: 2,
  },
  backgroundImage: {
    opacity: 0.95,
    width: "100%",
    height: "100%",
  },
  backgroundVideoContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  backgroundVideoLayer: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.55,
  },
  backgroundVideoLayerPortraitWeb: {
    alignSelf: "center",
    objectFit: "fill",
  },
  safeArea: {
    flex: 1,
  },
  stateScrollContent: {
    flexGrow: 1,
    minHeight: "100%",
    justifyContent: "center",
    paddingVertical: 16,
  },
  // Lobby Styles
  lobbyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  lobbyContainerCompact: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "flex-start",
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    fontFamily: GAME_FONT_DISPLAY,
    letterSpacing: 1.6,
    color: "#00d4ff",
    textShadowColor: "rgba(0, 212, 255, 0.65)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    marginBottom: 10,
    textAlign: "center",
  },
  titleCompact: {
    fontSize: 34,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: GAME_FONT_BODY,
    letterSpacing: 0.8,
    color: "#aaa",
    marginBottom: 40,
    textAlign: "center",
  },
  subtitleCompact: {
    fontSize: 14,
    marginBottom: 18,
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 30,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    fontFamily: GAME_FONT_BODY,
    letterSpacing: 0.7,
    color: "#aaa",
    fontWeight: "500",
  },
  modeSelector: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 40,
  },
  modeSelectorCompact: {
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  modeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#444",
    alignItems: "center",
    gap: 8,
  },
  modeButtonActive: {
    borderColor: "#00d4ff",
    backgroundColor: "rgba(0, 212, 255, 0.1)",
  },
  modeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: GAME_FONT_DISPLAY,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  playSection: {
    width: "100%",
    maxWidth: 400,
    gap: 15,
    marginBottom: 30,
  },
  playSectionCompact: {
    maxWidth: 340,
    gap: 10,
    marginBottom: 18,
  },
  input: {
    backgroundColor: "#16213e",
    borderWidth: 2,
    borderColor: "#444",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
  },
  inputCompact: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  primaryButton: {
    borderRadius: 8,
    overflow: "hidden",
  },
  primaryButtonCompact: {
    minHeight: 44,
  },
  buttonGradient: {
    padding: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: GAME_FONT_DISPLAY,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    fontWeight: "600",
  },
  orText: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
    marginVertical: 10,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  backButtonCompact: {
    marginTop: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    color: "#00d4ff",
    fontSize: 16,
    fontFamily: GAME_FONT_DISPLAY,
    letterSpacing: 1,
    fontWeight: "600",
  },
  // Waiting Styles
  waitingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  waitingContainerCompact: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "flex-start",
  },
  roomCodeDisplay: {
    fontSize: 14,
    fontFamily: GAME_FONT_BODY,
    letterSpacing: 1,
    color: "#888",
    marginBottom: 10,
  },
  roomCodeDisplayCompact: {
    marginBottom: 6,
  },
  playerName: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: GAME_FONT_DISPLAY,
    letterSpacing: 1.2,
    textShadowColor: "rgba(0, 212, 255, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    color: "#00d4ff",
    marginBottom: 40,
  },
  playerNameCompact: {
    fontSize: 20,
    marginBottom: 24,
  },
  opponentSection: {
    alignItems: "center",
    gap: 20,
    marginBottom: 40,
  },
  opponentText: {
    fontSize: 18,
    fontFamily: GAME_FONT_DISPLAY,
    letterSpacing: 1,
    color: "#4CAF50",
    fontWeight: "600",
  },
  startButton: {
    borderRadius: 8,
    overflow: "hidden",
    minWidth: 200,
  },
  startButtonCompact: {
    minWidth: 170,
  },
  waitingIndicator: {
    alignItems: "center",
    gap: 15,
    marginBottom: 40,
  },
  waitingText: {
    fontSize: 16,
    fontFamily: GAME_FONT_DISPLAY,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#00d4ff",
    fontWeight: "500",
  },
  // Game Styles
  gameContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  gameContainerCompact: {
    paddingHorizontal: 10,
  },
  spectatorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "rgba(0, 212, 255, 0.16)",
    borderBottomWidth: 2,
    borderBottomColor: "rgba(0, 212, 255, 0.35)",
    borderRadius: 8,
    marginBottom: 16,
  },
  spectatorBannerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  scoreBar: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 212, 255, 0.1)",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#00d4ff",
  },
  scoreBarCompact: {
    padding: 10,
    marginBottom: 12,
  },
  scoreSection: {
    flex: 1,
    alignItems: "center",
  },
  scoreName: {
    color: "#aaa",
    fontSize: 12,
    fontFamily: GAME_FONT_BODY,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  score: {
    color: "#00d4ff",
    fontSize: 32,
    fontFamily: GAME_FONT_DISPLAY,
    letterSpacing: 1,
    textShadowColor: "rgba(0, 212, 255, 0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    fontWeight: "bold",
  },
  divider: {
    width: 2,
    height: 50,
    backgroundColor: "#444",
    marginHorizontal: 10,
  },
  questionSection: {
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#9c27b0",
    overflow: "hidden",
  },
  questionSectionCompact: {
    marginBottom: 14,
  },
  questionBackgroundContainer: {
    padding: 20,
    width: "100%",
    minHeight: 80,
    justifyContent: "center",
  },
  questionBackgroundImage: {
    borderRadius: 12,
    opacity: 0.95,
    width: "100%",
    height: "100%",
  },
  questionBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  questionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0, 212, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 212, 255, 0.35)",
  },
  questionBadgeText: {
    color: "#00d4ff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  questionStep: {
    color: "#aaa",
    fontSize: 12,
    fontFamily: GAME_FONT_BODY,
    letterSpacing: 0.7,
    fontWeight: "600",
  },
  questionText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: GAME_FONT_DISPLAY,
    letterSpacing: 0.9,
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    fontWeight: "600",
    textAlign: "center",
  },
  questionTextCompact: {
    fontSize: 16,
    lineHeight: 22,
  },
  gameArea: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
    position: "relative",
    minHeight: 220,
  },
  gameAreaCompact: {
    minHeight: 180,
    marginBottom: 14,
  },
  gameAreaGrid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  fallingWord: {
    position: "absolute",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 10,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  wordTokenOuterGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    borderWidth: 3,
    opacity: 0.4,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 15,
  },
  wordTokenOuterGlowActive: {
    opacity: 1,
    shadowOpacity: 1,
    shadowRadius: 25,
    borderWidth: 4,
    elevation: 30,
  },
  wordTokenGlow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
    borderWidth: 2,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  wordTokenGlowActive: {
    backgroundColor: "rgba(114, 255, 150, 0.15)",
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 16,
  },
  wordTokenAccent: {
    height: 2,
    width: "100%",
    borderRadius: 1,
    opacity: 0.7,
  },
  wordTokenTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
    marginTop: 4,
  },
  wordTokenDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  wordTokenLabel: {
    color: "#fff",
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "700",
    opacity: 0.85,
  },
  wordTokenBase: {
    width: 35,
    height: 4,
    borderRadius: 99,
    marginTop: 8,
    opacity: 0.95,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  wordText: {
    fontSize: 17,
    fontFamily: GAME_FONT_DISPLAY,
    letterSpacing: 0.9,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 2,
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  wordCharacterContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    marginVertical: 2,
  },
  wordCharacter: {
    fontSize: 17,
    fontFamily: GAME_FONT_DISPLAY,
    letterSpacing: 0.9,
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  wordCharacterHighlighted: {
    fontWeight: "800",
    color: "#72ff96",
    textShadowRadius: 8,
    shadowOpacity: 0.8,
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  feedbackBox: {
    backgroundColor: "rgba(0, 212, 255, 0.2)",
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#00d4ff",
    shadowColor: "#00d4ff",
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  feedbackBoxSuccess: {
    backgroundColor: "rgba(80, 255, 145, 0.16)",
    borderLeftColor: "#72ff96",
    shadowColor: "#72ff96",
  },
  feedbackBoxError: {
    backgroundColor: "rgba(255, 107, 107, 0.16)",
    borderLeftColor: "#ff6b6b",
    shadowColor: "#ff6b6b",
  },
  feedbackBoxWarning: {
    backgroundColor: "rgba(255, 209, 102, 0.16)",
    borderLeftColor: "#ffd166",
    shadowColor: "#ffd166",
  },
  feedbackBoxCompact: {
    padding: 16,
  },
  feedbackHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 4,
  },
  feedbackLabel: {
    fontSize: 14,
    fontFamily: GAME_FONT_DISPLAY,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "#00d4ff",
  },
  feedbackLabelSuccess: {
    color: "#72ff96",
  },
  feedbackLabelError: {
    color: "#ff6b6b",
  },
  feedbackLabelWarning: {
    color: "#ffd166",
  },
  feedbackText: {
    color: "#00d4ff",
    fontSize: 20,
    fontFamily: GAME_FONT_DISPLAY,
    letterSpacing: 0.7,
    fontWeight: "600",
    textAlign: "center",
  },
  inputSection: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    maxWidth: 400,
    alignSelf: "center",
  },
  inputSectionCompact: {
    gap: 8,
    marginBottom: 12,
    maxWidth: 320,
    alignSelf: "center",
  },
  gameInput: {
    width: 250,
    backgroundColor: "#16213e",
    borderWidth: 2,
    borderColor: "#00d4ff",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
  },
  gameInputCompact: {
    width: 200,
    paddingVertical: 10,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#9c27b0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  submitButtonCompact: {
    paddingHorizontal: 14,
  },
  // Finished Styles
  finishedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  finishedContainerCompact: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  finishedTitle: {
    fontSize: 42,
    fontWeight: "bold",
    fontFamily: GAME_FONT_DISPLAY,
    letterSpacing: 1.5,
    textShadowColor: "rgba(76, 175, 80, 0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    color: "#4CAF50",
    marginBottom: 40,
    textAlign: "center",
  },
  finishedTitleCompact: {
    fontSize: 32,
    marginBottom: 24,
  },
  finalScores: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 40,
  },
  finalScoresCompact: {
    gap: 12,
    marginBottom: 24,
  },
  finalScoreCard: {
    flex: 1,
    backgroundColor: "rgba(0, 212, 255, 0.1)",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#00d4ff",
  },
  finalScoreCardCompact: {
    padding: 14,
  },
  finalScoreName: {
    color: "#aaa",
    fontSize: 14,
    fontFamily: GAME_FONT_BODY,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  finalScore: {
    color: "#00d4ff",
    fontSize: 48,
    fontFamily: GAME_FONT_DISPLAY,
    letterSpacing: 1.3,
    textShadowColor: "rgba(0, 212, 255, 0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 9,
    fontWeight: "bold",
  },
  finalScoreCompact: {
    fontSize: 36,
  },
  vsText: {
    color: "#666",
    fontSize: 16,
    fontFamily: GAME_FONT_DISPLAY,
    letterSpacing: 1,
    fontWeight: "bold",
  },
  vsTextCompact: {
    fontSize: 14,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 15,
  },
  secondaryButtonCompact: {
    marginTop: 10,
  },
  secondaryButtonText: {
    color: "#666",
    fontSize: 16,
    fontFamily: GAME_FONT_DISPLAY,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  backdropOrb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 1,
  },
});
