import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Animatable from "react-native-animatable";
import { AudioContext } from "react-native-audio-api";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

import COLORS from "@/constants/custom-colors";
import quickPlayApi from "@/services/quickPlayApi";
import { useNavigationLock } from "@/contexts/NavigationLockContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuthStore } from "@/store/authStore";

const WEB_UI_SCALE = 1.15;
const webScale = (value) =>
  Platform.OS === "web" ? Math.round(value * WEB_UI_SCALE) : value;

const AnimatableTile = Animatable.createAnimatableComponent(TouchableOpacity);
const AnimatableView = Animatable.createAnimatableComponent(View);

const IMAGE_CONTENT_PREFIX = "__img__::";
const QUICKPLAY_SOUND_ASSETS = {
  bg: require("../../assets/sounds/quickplay/quickplay-bg.mp3"),
  correct: require("../../assets/sounds/quickplay/quickplay-correct-ans.wav"),
  incorrect: require("../../assets/sounds/quickplay/quickplay-incorrect-ans.wav"),
  gameover: require("../../assets/sounds/quickplay/quickplay-gameover-bg.wav"),
};

const QUICKPLAY_SOUND_VOLUME = {
  bg: 0.34,
  correct: 0.45,
  incorrect: 0.45,
  gameover: 0.4,
};

const PANEL_BACKGROUND = "rgba(7, 10, 24, 0.88)";
const PANEL_BORDER = "rgba(99, 102, 241, 0.24)";
const SOFT_BORDER = "rgba(148, 163, 184, 0.18)";

const DEFAULT_PAIR_BANK = [
  {
    definition: "Phishing",
    answer: "A fake message that tricks someone into revealing private information.",
  },
  {
    definition: "Malware",
    answer: "Software designed to damage, spy on, or steal data from a device.",
  },
  {
    definition: "Firewall",
    answer: "A filter that blocks unauthorized traffic between networks.",
  },
  {
    definition: "Two-factor authentication",
    answer: "A login method that requires two proof steps before access is granted.",
  },
  {
    definition: "Password reuse",
    answer: "Using the same password on multiple accounts, which increases risk.",
  },
  {
    definition: "Secure browsing",
    answer: "Checking for HTTPS and trusting only legitimate websites.",
  },
  {
    definition: "Data encryption",
    answer: "Scrambling information so only authorized people can read it.",
  },
  {
    definition: "Social engineering",
    answer: "Manipulating a person into giving away access or sensitive details.",
  },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);
const getParamValue = (value) => (Array.isArray(value) ? value[0] : value);

const readImageAsDataUrl = async (uri, mimeType = "image/jpeg") => {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error("Unable to read the selected image on web.");
    }

    const blob = await response.blob();
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        const base64 = typeof result === "string" ? result.split(",")[1] : "";
        resolve(base64 || "");
      };
      reader.onerror = () => reject(new Error("Unable to convert image to base64."));
      reader.readAsDataURL(blob);
    });

    return `data:${mimeType};base64,${base64Data}`;
  }

  const base64Data = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return `data:${mimeType};base64,${base64Data}`;
};

const parseJSONParam = (value) => {
  const raw = getParamValue(value);
  if (!raw || typeof raw !== "string") return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const normalizeContent = (value, fallbackText = "") => {
  if (value == null) {
    return { type: "text", text: fallbackText };
  }

  if (typeof value === "string") {
    if (value.startsWith(IMAGE_CONTENT_PREFIX)) {
      return { type: "image", uri: value.slice(IMAGE_CONTENT_PREFIX.length) };
    }

    return { type: "text", text: value };
  }

  if (typeof value === "object") {
    const contentType = value.type || value.kind;
    if (contentType === "image") {
      return {
        type: "image",
        uri: value.uri || value.imageUri || value.source || value.value || "",
      };
    }

    if (contentType === "text") {
      return {
        type: "text",
        text: String(value.text || value.value || value.label || fallbackText || ""),
      };
    }

    if (value.uri || value.imageUri || value.source) {
      return {
        type: "image",
        uri: value.uri || value.imageUri || value.source,
      };
    }

    if (value.text || value.value || value.label) {
      return {
        type: "text",
        text: String(value.text || value.value || value.label || fallbackText || ""),
      };
    }
  }

  return { type: "text", text: String(value) };
};

const normalizePair = (pair, index) => {
  if (!pair) return null;

  const definitionSource =
    pair.definition ?? pair.prompt ?? pair.question ?? pair.term ?? pair.left ?? pair.front;
  const answerSource =
    pair.answer ?? pair.match ?? pair.value ?? pair.right ?? pair.back ?? pair.definitionAnswer;

  const definition = normalizeContent(definitionSource, `Definition ${index + 1}`);
  const answer = normalizeContent(answerSource, `Answer ${index + 1}`);

  if (definition.type === "text" && !definition.text.trim()) return null;
  if (answer.type === "text" && !answer.text.trim()) return null;
  if (definition.type === "image" && !definition.uri) return null;
  if (answer.type === "image" && !answer.uri) return null;

  return {
    id: String(pair.id || index + 1),
    definition,
    answer,
    title: pair.title || pair.label || `Pair ${index + 1}`,
  };
};

const normalizeQuestionToPair = (question, index) => {
  if (!question?.question) return null;

  let answerText = "";
  switch (question.type) {
    case "multipleChoice":
      answerText =
        question.options?.[question.correctAnswer] ?? String(question.correctAnswer ?? "");
      break;
    case "fillInBlanks":
      answerText = Array.isArray(question.blanks)
        ? question.blanks.join(" / ")
        : "";
      break;
    case "codeMissing":
      answerText = String(question.correctAnswer || "");
      break;
    case "codeOrdering":
      answerText = Array.isArray(question.codeBlocks)
        ? question.codeBlocks.map((block) => block.code).filter(Boolean).join("\n")
        : "";
      break;
    case "sorting":
      answerText = Array.isArray(question.items)
        ? question.items.map((item) => item.label || item.text || item.name).filter(Boolean).join(", ")
        : "";
      break;
    default:
      answerText = "";
  }

  if (!answerText.trim()) return null;

  return {
    id: `question-${question.id || index + 1}`,
    definition: normalizeContent(question.question, `Question ${index + 1}`),
    answer: normalizeContent(answerText, `Answer ${index + 1}`),
    title: question.category || "Cyber Quest",
  };
};

const buildTilesFromPairs = (pairs) =>
  pairs.flatMap((pair) => [
    {
      id: `${pair.id}-definition`,
      pairId: pair.id,
      side: "definition",
      content: pair.definition,
    },
    {
      id: `${pair.id}-answer`,
      pairId: pair.id,
      side: "answer",
      content: pair.answer,
    },
  ]);

const formatClock = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
};

const buildQuizCode = (title, pairCount, timerSeconds) => {
  const base = `${title || "QP"}-${pairCount}-${timerSeconds}`
    .replace(/[^a-z0-9]+/gi, "")
    .toUpperCase();
  return `${base.slice(0, 4) || "QP"}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
};

const buildDeterministicCode = (title, pairCount, timerSeconds) => {
  const base = `${title || "QUICKPLAY"}-${pairCount}-${timerSeconds}`
    .replace(/[^a-z0-9]+/gi, "")
    .toUpperCase();
  const prefix = (base.slice(0, 4) || "QP").padEnd(4, "X");
  const checksum = (base.length * 97 + pairCount * 31 + timerSeconds)
    .toString(36)
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, "0");
  return `${prefix}-${checksum}`;
};

const createEmptyInstructorPair = (index = 0) => ({
  id: `instructor-${Date.now()}-${index}`,
  definitionType: "text",
  definition: "",
  answerType: "text",
  answer: "",
});

const toInstructorPair = (pair, index) => {
  const definition = normalizeContent(pair?.definition, "");
  const answer = normalizeContent(pair?.answer, "");

  return {
    id: String(pair?.id || `pair-${index + 1}`),
    definitionType: definition.type === "image" ? "image" : "text",
    definition: definition.type === "image" ? definition.uri || "" : definition.text || "",
    answerType: answer.type === "image" ? "image" : "text",
    answer: answer.type === "image" ? answer.uri || "" : answer.text || "",
  };
};

const buildPairsFromInstructor = (pairs) =>
  (pairs || [])
    .map((pair, index) => {
      const definitionValue =
        pair.definitionType === "image"
          ? `${IMAGE_CONTENT_PREFIX}${(pair.definition || "").trim()}`
          : (pair.definition || "").trim();
      const answerValue =
        pair.answerType === "image"
          ? `${IMAGE_CONTENT_PREFIX}${(pair.answer || "").trim()}`
          : (pair.answer || "").trim();

      return normalizePair(
        {
          id: pair.id || `instructor-${index + 1}`,
          definition: definitionValue,
          answer: answerValue,
          title: `Pair ${index + 1}`,
        },
        index
      );
    })
    .filter(Boolean);

export default function QuickPlay() {
  const router = useRouter();
  const navigation = useNavigation();
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const { setNavigationLocked } = useNavigationLock();
  const params = useLocalSearchParams();
  const { user } = useAuthStore();

  const isWeb = Platform.OS === "web";
  const isCompactWeb = isWeb && viewportWidth <= 920;
  const highlightColor = isDarkMode ? colors.primary : "#FF7070";
  const canAccessInstructorMode = user?.privilege === "admin" || user?.privilege === "instructor";
  const screenGradient = isDarkMode
    ? ["#050814", "#0A1024", "#09050E"]
    : ["#07111F", "#111A2F", "#070A12"];

  const rawConfigParam = getParamValue(params.config);
  const rawTileSetParam = getParamValue(params.tileSet);
  const rawRoundParam = getParamValue(params.round);
  const rawQuizCodeParam = getParamValue(params.quizCode) || getParamValue(params.code) || "";
  const rawTimerParam = getParamValue(params.timerSeconds) || getParamValue(params.timer) || "";
  const rawPairCountParam = getParamValue(params.pairCount) || getParamValue(params.pairs) || "";
  const rawTitleParam = getParamValue(params.title) || "";
  const rawDescriptionParam = getParamValue(params.description) || "";

  const parsedConfig = useMemo(
    () =>
      parseJSONParam(rawConfigParam) ||
      parseJSONParam(rawTileSetParam) ||
      parseJSONParam(rawRoundParam) ||
      null,
    [rawConfigParam, rawTileSetParam, rawRoundParam]
  );

  const roundParamSignature = useMemo(
    () =>
      [
        rawConfigParam || "",
        rawTileSetParam || "",
        rawRoundParam || "",
        rawQuizCodeParam || "",
        rawTimerParam || "",
        rawPairCountParam || "",
        rawTitleParam || "",
        rawDescriptionParam || "",
      ].join("||"),
    [
      rawConfigParam,
      rawDescriptionParam,
      rawPairCountParam,
      rawQuizCodeParam,
      rawRoundParam,
      rawTileSetParam,
      rawTimerParam,
      rawTitleParam,
    ]
  );

  const [phase, setPhase] = useState("menu");
  const [roundDefinition, setRoundDefinition] = useState(null);
  const [loadingRound, setLoadingRound] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [selectedTileIds, setSelectedTileIds] = useState([]);
  const [matchedPairIds, setMatchedPairIds] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [initialTimer, setInitialTimer] = useState(0);
  const [gameResult, setGameResult] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [boardSeed, setBoardSeed] = useState(0);
  const [editingCodePill, setEditingCodePill] = useState(false);
  const [codeInputValue, setCodeInputValue] = useState("");
  const [instructorConfig, setInstructorConfig] = useState(() => ({
    title: "Quick Play",
    description: "Match each definition tile with its answer tile before the timer hits zero.",
    timerSeconds: 90,
    pairCount: 6,
    quizCode: "",
    pairs: DEFAULT_PAIR_BANK.slice(0, 6).map((pair, index) => toInstructorPair(normalizePair(pair, index), index)),
  }));

  const allowNavigationRef = useRef(false);
  const isExitPromptOpenRef = useRef(false);
  const hasEndedRef = useRef(false);
  const resolutionTimeoutRef = useRef(null);
  const bgMusicContextRef = useRef(null);
  const bgMusicSourceRef = useRef(null);
  const gameOverContextRef = useRef(null);
  const gameOverSourceRef = useRef(null);
  const sfxContextRef = useRef(null);
  const audioBufferCacheRef = useRef({});
  const lastPreparedSignatureRef = useRef("");

  const roundParams = useMemo(() => {
    const config = parsedConfig;

    return {
      config,
      quizCode: rawQuizCodeParam,
      timerSeconds: clamp(
        Number(rawTimerParam || config?.timerSeconds || 90),
        15,
        3600
      ),
      pairCount: clamp(
        Number(rawPairCountParam || config?.pairCount || config?.pairs?.length || 6),
        4,
        8
      ),
      title: rawTitleParam || config?.title || "Quick Play",
      description:
        rawDescriptionParam ||
        config?.description ||
        "Match each definition tile with its answer tile before the timer hits zero.",
    };
  }, [
    parsedConfig,
    rawDescriptionParam,
    rawPairCountParam,
    rawQuizCodeParam,
    rawTimerParam,
    rawTitleParam,
  ]);

  const stopAudioChannel = useCallback(async (sourceRef, contextRef) => {
    const source = sourceRef.current;
    sourceRef.current = null;

    if (source) {
      try {
        source.stop();
      } catch {
        // Ignore sources that already ended.
      }

      try {
        source.disconnect();
      } catch {
        // Ignore disconnect failures during cleanup.
      }
    }

    const context = contextRef.current;
    contextRef.current = null;

    if (context) {
      try {
        await context.close();
      } catch {
        // Ignore close failures during cleanup.
      }
    }
  }, []);

  const loadDecodedBuffer = useCallback(async (context, soundKey) => {
    if (!audioBufferCacheRef.current[soundKey]) {
      audioBufferCacheRef.current[soundKey] = context.decodeAudioData(
        QUICKPLAY_SOUND_ASSETS[soundKey]
      );
    }

    return audioBufferCacheRef.current[soundKey];
  }, []);

  const playLoopTrack = useCallback(
    async (soundKey, sourceRef, contextRef, shouldLoop = true) => {
      await stopAudioChannel(sourceRef, contextRef);

      const context = new AudioContext();
      contextRef.current = context;

      const buffer = await loadDecodedBuffer(context, soundKey);
      if (!buffer) return;

      const source = context.createBufferSource();
      const gainNode = context.createGain?.();
      source.buffer = buffer;
      source.loop = shouldLoop;

      const volume = QUICKPLAY_SOUND_VOLUME[soundKey] ?? 0.35;
      if (gainNode) {
        gainNode.gain.value = volume;
        source.connect(gainNode);
        gainNode.connect(context.destination);
      } else {
        source.connect(context.destination);
      }

      source.onended = () => {
        if (!shouldLoop) {
          sourceRef.current = null;
          if (contextRef.current === context) {
            contextRef.current = null;
          }
          context.close().catch(() => {
            // Ignore close failures during teardown.
          });
        }
      };

      source.start(context.currentTime);
      sourceRef.current = source;
    },
    [loadDecodedBuffer, stopAudioChannel]
  );

  const playSfx = useCallback(
    async (soundKey) => {
      try {
        let context = sfxContextRef.current;
        if (!context) {
          context = new AudioContext();
          sfxContextRef.current = context;
        }

        const buffer = await loadDecodedBuffer(context, soundKey);
        if (!buffer) return;

        const source = context.createBufferSource();
        const gainNode = context.createGain?.();
        source.buffer = buffer;

        const volume = QUICKPLAY_SOUND_VOLUME[soundKey] ?? 0.35;
        if (gainNode) {
          gainNode.gain.value = volume;
          source.connect(gainNode);
          gainNode.connect(context.destination);
        } else {
          source.connect(context.destination);
        }

        source.start(context.currentTime);
      } catch (error) {
        console.warn(`Quick Play audio failed (${soundKey})`, error);
      }
    },
    [loadDecodedBuffer]
  );

  const clearResolutionTimer = useCallback(() => {
    if (resolutionTimeoutRef.current) {
      clearTimeout(resolutionTimeoutRef.current);
      resolutionTimeoutRef.current = null;
    }
  }, []);

  const stopAllAudio = useCallback(async () => {
    await Promise.all([
      stopAudioChannel(bgMusicSourceRef, bgMusicContextRef),
      stopAudioChannel(gameOverSourceRef, gameOverContextRef),
    ]);
  }, [stopAudioChannel]);

  const finalizeRound = useCallback(
    (won) => {
      if (hasEndedRef.current) return;
      hasEndedRef.current = true;
      clearResolutionTimer();

      const resolvedTimer = Math.max(0, timer);
      const timeTaken = Math.max(0, initialTimer - resolvedTimer);

      setGameResult({
        won,
        timeTaken,
        mistakes,
        mismatchedTiles: mistakes * 2,
        moves,
        matchedPairs: matchedPairIds.length,
        totalPairs: roundDefinition?.pairs?.length || 0,
        quizCode: roundDefinition?.quizCode || roundParams.quizCode || "",
      });

      setPhase("results");
      setIsResolving(false);
      setSelectedTileIds([]);
      setNavigationLocked(false);
    },
    [clearResolutionTimer, initialTimer, mistakes, matchedPairIds.length, moves, roundDefinition, roundParams.quizCode, setNavigationLocked, timer]
  );

  const prepareRound = useCallback(async () => {
    if (lastPreparedSignatureRef.current === roundParamSignature && roundDefinition) {
      return;
    }

    lastPreparedSignatureRef.current = roundParamSignature;
    setLoadingRound(true);
    setLoadError(null);

    try {
      const configPairs = Array.isArray(roundParams.config?.pairs)
        ? roundParams.config.pairs
        : Array.isArray(roundParams.config?.tiles)
        ? roundParams.config.tiles
        : Array.isArray(roundParams.config?.cards)
        ? roundParams.config.cards
        : [];

      let pairs = configPairs.map(normalizePair).filter(Boolean);
      let roundSource = roundParams.config ? "instructor" : "generated";

      if (pairs.length < 4) {
        try {
          const { questions } = await quickPlayApi.fetchQuestions(roundParams.pairCount * 2);
          const apiPairs = (questions || [])
            .map(normalizeQuestionToPair)
            .filter(Boolean)
            .slice(0, roundParams.pairCount);

          if (apiPairs.length >= 4) {
            pairs = apiPairs;
            roundSource = "api";
          }
        } catch (apiError) {
          console.log("Quick Play API fallback unavailable", apiError);
        }
      }

      if (pairs.length < 4) {
        pairs = DEFAULT_PAIR_BANK.slice(0, roundParams.pairCount).map(normalizePair).filter(Boolean);
        roundSource = "demo";
      }

      const pairCount = clamp(pairs.length, 4, 8);
      const normalizedPairs = pairs.slice(0, pairCount);
      const quizCode =
        roundParams.quizCode ||
        roundParams.config?.quizCode ||
        roundParams.config?.code ||
        buildDeterministicCode(roundParams.title, pairCount, roundParams.timerSeconds);

      setRoundDefinition({
        title: roundParams.title,
        description: roundParams.description,
        quizCode,
        timerSeconds: roundParams.timerSeconds,
        pairCount,
        pairs: normalizedPairs,
        source: roundSource,
      });

      setInstructorConfig({
        title: roundParams.title,
        description: roundParams.description,
        timerSeconds: roundParams.timerSeconds,
        pairCount,
        quizCode,
        pairs: normalizedPairs.map((pair, index) => toInstructorPair(pair, index)),
      });
    } catch (error) {
      console.error("Quick Play round preparation failed", error);
      setLoadError(error?.message || "Failed to prepare quick play round.");
    } finally {
      setLoadingRound(false);
    }
  }, [roundDefinition, roundParamSignature, roundParams]);

  const openInstructorMode = useCallback(() => {
    if (!canAccessInstructorMode) return;
    setPhase("instructor");
  }, [canAccessInstructorMode]);

  const updateInstructorConfig = useCallback((key, value) => {
    setInstructorConfig((current) => ({ ...current, [key]: value }));
  }, []);

  const addInstructorPair = useCallback(() => {
    setInstructorConfig((current) => {
      if (current.pairs.length >= 8) return current;
      const nextPairs = [...current.pairs, createEmptyInstructorPair(current.pairs.length)];
      return {
        ...current,
        pairs: nextPairs,
        pairCount: clamp(nextPairs.length, 4, 8),
      };
    });
  }, []);

  const removeInstructorPair = useCallback((pairIndex) => {
    setInstructorConfig((current) => {
      if (current.pairs.length <= 4) return current;
      const nextPairs = current.pairs.filter((_, index) => index !== pairIndex);
      return {
        ...current,
        pairs: nextPairs,
        pairCount: clamp(nextPairs.length, 4, 8),
      };
    });
  }, []);

  const updateInstructorPair = useCallback((pairIndex, key, value) => {
    setInstructorConfig((current) => ({
      ...current,
      pairs: current.pairs.map((pair, index) =>
        index === pairIndex
          ? {
              ...pair,
              [key]: value,
            }
          : pair
      ),
    }));
  }, []);

  const generateInstructorCode = useCallback(() => {
    setInstructorConfig((current) => ({
      ...current,
      quizCode: buildQuizCode(current.title, current.pairCount, current.timerSeconds),
    }));
  }, []);

  const pickImageContentValue = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        return null;
      }

      const asset = result.assets[0];
      const mimeType = asset.mimeType || "image/jpeg";
      const imageDataUrl = await readImageAsDataUrl(asset.uri, mimeType);

      return `${IMAGE_CONTENT_PREFIX}${imageDataUrl}`;
    } catch (error) {
      Alert.alert("Image Import Failed", `Could not import image: ${error.message}`);
      return null;
    }
  }, []);

  const saveInstructorRound = useCallback(() => {
    const cleanedPairs = buildPairsFromInstructor(instructorConfig.pairs).slice(0, 8);

    if (cleanedPairs.length < 4) {
      Alert.alert("Need More Tiles", "Please provide at least 4 valid definition-answer pairs.");
      return;
    }

    const pairCount = clamp(
      Number(instructorConfig.pairCount || cleanedPairs.length),
      4,
      Math.min(8, cleanedPairs.length)
    );
    const pairsForRound = cleanedPairs.slice(0, pairCount);
    const timerSeconds = clamp(Number(instructorConfig.timerSeconds || 90), 15, 3600);
    const title = (instructorConfig.title || "Quick Play").trim() || "Quick Play";
    const description =
      (instructorConfig.description || "").trim() ||
      "Match each definition tile with its answer tile before the timer hits zero.";
    const quizCode =
      (instructorConfig.quizCode || "").trim() ||
      buildQuizCode(title, pairCount, timerSeconds);

    setRoundDefinition({
      title,
      description,
      quizCode,
      timerSeconds,
      pairCount,
      pairs: pairsForRound,
      source: "instructor",
    });

    setInstructorConfig((current) => ({
      ...current,
      title,
      description,
      timerSeconds,
      pairCount,
      quizCode,
      pairs: pairsForRound.map((pair, index) => toInstructorPair(pair, index)),
    }));

    setLoadError(null);
    setLoadingRound(false);
    setPhase("menu");
  }, [instructorConfig]);

  useEffect(() => {
    prepareRound();
  }, [prepareRound]);

  const startGame = useCallback(() => {
    if (!roundDefinition?.pairs?.length) return;

    clearResolutionTimer();
    hasEndedRef.current = false;
    setBoardSeed((value) => value + 1);
    setSelectedTileIds([]);
    setMatchedPairIds([]);
    setMistakes(0);
    setMoves(0);
    setGameResult(null);
    setTimer(roundDefinition.timerSeconds);
    setInitialTimer(roundDefinition.timerSeconds);
    setIsResolving(false);
    setTiles(shuffle(buildTilesFromPairs(roundDefinition.pairs)));
    setPhase("playing");
  }, [clearResolutionTimer, roundDefinition]);

  useEffect(() => {
    const shouldPlayBackground = phase === "playing";
    const shouldPlayGameOver = phase === "results";

    const syncAudio = async () => {
      if (shouldPlayBackground) {
        await stopAudioChannel(gameOverSourceRef, gameOverContextRef);
        await playLoopTrack("bg", bgMusicSourceRef, bgMusicContextRef, true);
        return;
      }

      if (shouldPlayGameOver) {
        await stopAudioChannel(bgMusicSourceRef, bgMusicContextRef);
        await playLoopTrack("gameover", gameOverSourceRef, gameOverContextRef, false);
        return;
      }

      await stopAllAudio();
    };

    syncAudio();
  }, [phase, playLoopTrack, stopAllAudio, stopAudioChannel]);

  useEffect(() => {
    return () => {
      clearResolutionTimer();
      stopAllAudio();
      hasEndedRef.current = true;
    };
  }, [clearResolutionTimer, stopAllAudio]);

  useEffect(() => {
    setNavigationLocked(phase === "playing");
    return () => setNavigationLocked(false);
  }, [phase, setNavigationLocked]);

  useEffect(() => {
    const beforeRemove = navigation.addListener("beforeRemove", (event) => {
      if (allowNavigationRef.current) {
        allowNavigationRef.current = false;
        return;
      }

      if (phase !== "playing") {
        return;
      }

      event.preventDefault();

      if (isExitPromptOpenRef.current) {
        return;
      }

      isExitPromptOpenRef.current = true;

      const confirmExit = () => {
        isExitPromptOpenRef.current = false;
        allowNavigationRef.current = true;
        void stopAllAudio();
        navigation.dispatch(event.data.action);
      };

      const cancelExit = () => {
        isExitPromptOpenRef.current = false;
      };

      if (Platform.OS === "web" && typeof window !== "undefined") {
        if (window.confirm("Are you sure you want to quit the game?")) {
          confirmExit();
        } else {
          cancelExit();
        }
        return;
      }

      Alert.alert("Quit Game", "Are you sure you want to quit the game?", [
        { text: "No", style: "cancel", onPress: cancelExit },
        { text: "Yes", style: "destructive", onPress: confirmExit },
      ]);
    });

    return beforeRemove;
  }, [navigation, phase, stopAllAudio]);

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;

    const backSubscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (phase !== "playing") {
        return false;
      }

      if (isExitPromptOpenRef.current) {
        return true;
      }

      isExitPromptOpenRef.current = true;

      Alert.alert("Quit Game", "Are you sure you want to quit the game?", [
        {
          text: "No",
          style: "cancel",
          onPress: () => {
            isExitPromptOpenRef.current = false;
          },
        },
        {
          text: "Yes",
          style: "destructive",
          onPress: () => {
            isExitPromptOpenRef.current = false;
            void stopAllAudio();
            router.replace("/(tabs)/game");
          },
        },
      ]);

      return true;
    });

    return () => backSubscription.remove();
  }, [phase, router, stopAllAudio]);

  useEffect(() => {
    if (phase !== "playing") {
      return undefined;
    }

    if (timer <= 0) {
      finalizeRound(false);
      return undefined;
    }

    const timeout = setTimeout(() => {
      setTimer((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [finalizeRound, phase, timer]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (!roundDefinition?.pairs?.length) return;
    if (matchedPairIds.length === roundDefinition.pairs.length) {
      finalizeRound(true);
    }
  }, [finalizeRound, matchedPairIds.length, phase, roundDefinition]);

  const tileMap = useMemo(() => new Map(tiles.map((tile) => [tile.id, tile])), [tiles]);
  const matchedPairSet = useMemo(() => new Set(matchedPairIds), [matchedPairIds]);
  const selectedOrderMap = useMemo(
    () => new Map(selectedTileIds.map((tileId, index) => [tileId, index])),
    [selectedTileIds]
  );

  const handleTilePress = useCallback(
    (tileId) => {
      if (phase !== "playing" || isResolving || hasEndedRef.current) return;
      if (matchedPairSet.has(tileMap.get(tileId)?.pairId)) return;
      if (selectedTileIds.includes(tileId)) return;

      const nextSelection = [...selectedTileIds, tileId];
      setSelectedTileIds(nextSelection);

      if (nextSelection.length < 2) return;

      const firstTile = tileMap.get(nextSelection[0]);
      const secondTile = tileMap.get(nextSelection[1]);
      if (!firstTile || !secondTile) {
        setSelectedTileIds([]);
        return;
      }

      setMoves((value) => value + 1);
      setIsResolving(true);
      clearResolutionTimer();

      const isMatch = firstTile.pairId === secondTile.pairId;

      if (isMatch) {
        void playSfx("correct");
        resolutionTimeoutRef.current = setTimeout(() => {
          setMatchedPairIds((current) =>
            current.includes(firstTile.pairId) ? current : [...current, firstTile.pairId]
          );
          setSelectedTileIds([]);
          setIsResolving(false);
        }, 420);
      } else {
        void playSfx("incorrect");
        setMistakes((value) => value + 1);
        resolutionTimeoutRef.current = setTimeout(() => {
          setSelectedTileIds([]);
          setIsResolving(false);
        }, 650);
      }
    },
    [clearResolutionTimer, isResolving, matchedPairSet, phase, playSfx, selectedTileIds, tileMap]
  );

  const handleExitPress = useCallback(() => {
    if (phase === "playing") {
      if (isExitPromptOpenRef.current) return;

      isExitPromptOpenRef.current = true;
      const cancelExit = () => {
        isExitPromptOpenRef.current = false;
      };
      const confirmExit = () => {
        isExitPromptOpenRef.current = false;
        void stopAllAudio();
        router.replace("/(tabs)/game");
      };

      if (Platform.OS === "web" && typeof window !== "undefined") {
        if (window.confirm("Are you sure you want to quit the game?")) {
          confirmExit();
        } else {
          cancelExit();
        }
        return;
      }

      Alert.alert("Quit Game", "Are you sure you want to quit the game?", [
        { text: "No", style: "cancel", onPress: cancelExit },
        { text: "Yes", style: "destructive", onPress: confirmExit },
      ]);
      return;
    }

    void stopAllAudio();
    router.replace("/(tabs)/game");
  }, [phase, router, stopAllAudio]);

  const handleReplay = useCallback(() => {
    clearResolutionTimer();
    hasEndedRef.current = false;
    setGameResult(null);
    setSelectedTileIds([]);
    setMatchedPairIds([]);
    setMistakes(0);
    setMoves(0);
    setIsResolving(false);
    setPhase("menu");
  }, [clearResolutionTimer]);

  const getTileState = useCallback(
    (tile) => {
      if (matchedPairSet.has(tile.pairId)) return "matched";
      const selectionIndex = selectedOrderMap.get(tile.id);
      if (selectionIndex === 0) return "first";
      if (selectionIndex === 1) return "second";
      return "hidden";
    },
    [matchedPairSet, selectedOrderMap]
  );

  const renderTileFace = (content, isFaceUp) => {
    if (!isFaceUp) {
      return (
        <View style={styles.tileBackContent}>
          <Ionicons name="help" size={webScale(20)} color="rgba(248,250,252,0.8)" />
          <Text style={styles.tileBackText}>TAP</Text>
        </View>
      );
    }

    if (content.type === "image") {
      return (
        <Image
          source={{ uri: content.uri }}
          resizeMode="cover"
          style={styles.tileImage}
        />
      );
    }

    return (
      <Text style={styles.tileFrontText} numberOfLines={4}>
        {content.text}
      </Text>
    );
  };

  const renderMenuScreen = () => (
    <View style={styles.screenWrap}>
      <AnimatableView animation="fadeInUp" duration={500} style={styles.menuCard}>
        <View style={styles.menuHeaderRow}>
          <View>
            <Text style={styles.menuEyebrow}>QUICK PLAY</Text>
            <Text style={styles.menuTitle}>{roundDefinition?.title || roundParams.title}</Text>
            <Text style={styles.menuSubtitle}>{roundDefinition?.description || roundParams.description}</Text>
          </View>
          <TouchableOpacity
            style={styles.codePill}
            onPress={() => {
              setEditingCodePill(true);
              setCodeInputValue(roundDefinition?.quizCode || roundParams.quizCode || "");
            }}
            activeOpacity={0.9}
          >
            {!editingCodePill ? (
              <>
                <Text style={styles.codePillLabel}>CODE</Text>
                <Text style={styles.codePillValue} numberOfLines={1}>
                  {roundDefinition?.quizCode || roundParams.quizCode || "AUTO"}
                </Text>
              </>
            ) : (
              <TextInput
                autoFocus
                value={codeInputValue}
                onChangeText={setCodeInputValue}
                placeholder="Enter code"
                placeholderTextColor="#7A879B"
                style={styles.codePillInput}
                onBlur={() => {
                  const nextCode = codeInputValue.trim();
                  if (nextCode) {
                    router.setParams({ quizCode: nextCode });
                  }
                  setEditingCodePill(false);
                }}
                onSubmitEditing={() => {
                  const nextCode = codeInputValue.trim();
                  if (nextCode) {
                    router.setParams({ quizCode: nextCode });
                  }
                  setEditingCodePill(false);
                }}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.heroFrame}>
          <AnimatableView animation="pulse" iterationCount="infinite" duration={1600} style={styles.heroOrb} />
          <View style={styles.heroInner}>
            <Ionicons name="grid-outline" size={webScale(44)} color="#FF6B6B" />
            <Text style={styles.heroHeadline}>Memory Match Mode</Text>
            <Text style={styles.heroCopy}>
              Flip two tiles at a time. Match every definition with the correct answer before the clock reaches zero.
            </Text>
          </View>
        </View>

        <View style={styles.menuStatsRow}>
          <View style={styles.menuStatCard}>
            <Text style={styles.menuStatValue}>
              {roundDefinition?.pairCount || roundParams.pairCount}
            </Text>
            <Text style={styles.menuStatLabel}>Pairs</Text>
          </View>
          <View style={styles.menuStatCard}>
            <Text style={styles.menuStatValue}>{formatClock(roundDefinition?.timerSeconds || roundParams.timerSeconds)}</Text>
            <Text style={styles.menuStatLabel}>Timer</Text>
          </View>
          <View style={styles.menuStatCard}>
            <Text style={styles.menuStatValue}>{roundDefinition?.source || "demo"}</Text>
            <Text style={styles.menuStatLabel}>Source</Text>
          </View>
        </View>

        {loadError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={webScale(18)} color="#FB7185" />
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : null}

        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={startGame}
            disabled={loadingRound || !roundDefinition}
          >
            <Text style={styles.primaryButtonText}>
              {loadingRound ? "PREPARING..." : "ENTER GAME"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleExitPress}>
            <Text style={styles.secondaryButtonText}>BACK</Text>
          </TouchableOpacity>
        </View>

        {canAccessInstructorMode ? (
          <TouchableOpacity style={styles.instructorEntryButton} onPress={openInstructorMode}>
            <Text style={styles.instructorEntryText}>INSTRUCTOR MODE</Text>
          </TouchableOpacity>
        ) : null}
      </AnimatableView>
    </View>
  );

  const renderInstructorScreen = () => {
    const pairCountHint = `${instructorConfig.pairs.length}/8 pairs`;

    return (
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.playContent,
          {
            paddingTop: webScale(18) + insets.top * 0.15,
            paddingBottom: webScale(24) + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.editorCard}>
          <Text style={styles.editorTitle}>Instructor Tile Editor</Text>
          <Text style={styles.editorSubtitle}>
            Build custom definition-answer tiles, set timer and pair count, then generate a quiz code.
          </Text>

          <View style={styles.editorField}>
            <Text style={styles.editorLabel}>Round Title</Text>
            <TextInput
              value={instructorConfig.title}
              onChangeText={(text) => updateInstructorConfig("title", text)}
              style={styles.editorInput}
              placeholder="Quick Play"
              placeholderTextColor="#7A879B"
            />
          </View>

          <View style={styles.editorField}>
            <Text style={styles.editorLabel}>Description</Text>
            <TextInput
              value={instructorConfig.description}
              onChangeText={(text) => updateInstructorConfig("description", text)}
              style={[styles.editorInput, styles.editorTextArea]}
              multiline
              placeholder="Explain the matching objective"
              placeholderTextColor="#7A879B"
            />
          </View>

          <View style={styles.editorRow}>
            <View style={[styles.editorField, styles.editorHalf]}>
              <Text style={styles.editorLabel}>Timer (seconds)</Text>
              <TextInput
                value={String(instructorConfig.timerSeconds)}
                onChangeText={(text) => updateInstructorConfig("timerSeconds", text.replace(/[^0-9]/g, ""))}
                style={styles.editorInput}
                keyboardType="number-pad"
                placeholder="90"
                placeholderTextColor="#7A879B"
              />
            </View>

            <View style={[styles.editorField, styles.editorHalf]}>
              <Text style={styles.editorLabel}>Pair Count</Text>
              <TextInput
                value={String(instructorConfig.pairCount)}
                onChangeText={(text) => updateInstructorConfig("pairCount", text.replace(/[^0-9]/g, ""))}
                style={styles.editorInput}
                keyboardType="number-pad"
                placeholder="6"
                placeholderTextColor="#7A879B"
              />
            </View>
          </View>

          <View style={styles.editorCodeRow}>
            <View style={styles.editorCodePill}>
              <Text style={styles.editorCodeLabel}>QUIZ CODE</Text>
              <Text style={styles.editorCodeValue}>{instructorConfig.quizCode || "NOT GENERATED"}</Text>
            </View>
            <TouchableOpacity style={styles.smallActionButton} onPress={generateInstructorCode}>
              <Text style={styles.smallActionButtonText}>GENERATE</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.editorSectionHeader}>
            <Text style={styles.editorLabel}>Tiles ({pairCountHint})</Text>
            <TouchableOpacity
              style={styles.smallActionButton}
              onPress={addInstructorPair}
              disabled={instructorConfig.pairs.length >= 8}
            >
              <Text style={styles.smallActionButtonText}>ADD PAIR</Text>
            </TouchableOpacity>
          </View>

          {instructorConfig.pairs.map((pair, index) => (
            <View key={pair.id || `${index}`} style={styles.pairEditorCard}>
              <View style={styles.pairEditorHeader}>
                <Text style={styles.pairEditorTitle}>Pair {index + 1}</Text>
                <TouchableOpacity
                  style={styles.deletePairButton}
                  onPress={() => removeInstructorPair(index)}
                  disabled={instructorConfig.pairs.length <= 4}
                >
                  <Text style={styles.deletePairButtonText}>DELETE</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.editorMiniLabel}>Definition Type</Text>
              <View style={styles.typeToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.typeToggle,
                    pair.definitionType === "text" && styles.typeToggleActive,
                  ]}
                  onPress={() => updateInstructorPair(index, "definitionType", "text")}
                >
                  <Text style={styles.typeToggleText}>TEXT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeToggle,
                    pair.definitionType === "image" && styles.typeToggleActive,
                  ]}
                  onPress={() => updateInstructorPair(index, "definitionType", "image")}
                >
                  <Text style={styles.typeToggleText}>IMAGE</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWithButtonRow}>
                <TextInput
                  value={pair.definition}
                  onChangeText={(text) => updateInstructorPair(index, "definition", text)}
                  style={[styles.editorInput, styles.inputWithButtonFlex]}
                  placeholder={pair.definitionType === "image" ? "Import an image file" : "Enter definition"}
                  placeholderTextColor="#7A879B"
                />
                {pair.definitionType === "image" ? (
                  <TouchableOpacity
                    style={styles.imageImportButton}
                    onPress={async () => {
                      const imageValue = await pickImageContentValue();
                      if (imageValue) {
                        updateInstructorPair(index, "definition", imageValue);
                      }
                    }}
                  >
                    <Ionicons name="image-outline" size={webScale(18)} color="#93C5FD" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={[styles.editorMiniLabel, { marginTop: webScale(10) }]}>Answer Type</Text>
              <View style={styles.typeToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.typeToggle,
                    pair.answerType === "text" && styles.typeToggleActive,
                  ]}
                  onPress={() => updateInstructorPair(index, "answerType", "text")}
                >
                  <Text style={styles.typeToggleText}>TEXT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeToggle,
                    pair.answerType === "image" && styles.typeToggleActive,
                  ]}
                  onPress={() => updateInstructorPair(index, "answerType", "image")}
                >
                  <Text style={styles.typeToggleText}>IMAGE</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWithButtonRow}>
                <TextInput
                  value={pair.answer}
                  onChangeText={(text) => updateInstructorPair(index, "answer", text)}
                  style={[styles.editorInput, styles.inputWithButtonFlex]}
                  placeholder={pair.answerType === "image" ? "Import an image file" : "Enter matching answer"}
                  placeholderTextColor="#7A879B"
                />
                {pair.answerType === "image" ? (
                  <TouchableOpacity
                    style={styles.imageImportButton}
                    onPress={async () => {
                      const imageValue = await pickImageContentValue();
                      if (imageValue) {
                        updateInstructorPair(index, "answer", imageValue);
                      }
                    }}
                  >
                    <Ionicons name="image-outline" size={webScale(18)} color="#93C5FD" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}

          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={saveInstructorRound}>
              <Text style={styles.primaryButtonText}>SAVE & USE ROUND</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setPhase("menu")}>
              <Text style={styles.secondaryButtonText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderGameplayScreen = () => {
    const pairCount = roundDefinition?.pairs?.length || 0;
    const matchedCount = matchedPairIds.length;
    const tileColumns = pairCount <= 4 ? 2 : pairCount <= 6 ? 3 : 4;
    const tileWidth = `${100 / tileColumns - 1.25}%`;
    const timerPulse = timer <= 10 && phase === "playing";

    return (
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.playContent,
          {
            paddingTop: webScale(18) + insets.top * 0.15,
            paddingBottom: webScale(24) + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hudBar}>
          <View style={styles.hudItem}>
            <Ionicons name="time-outline" size={webScale(18)} color="#FF7070" />
            <Text style={[styles.hudValue, timerPulse && styles.hudValueUrgent]}>{formatClock(timer)}</Text>
          </View>
          <View style={styles.hudItem}>
            <Ionicons name="layers-outline" size={webScale(18)} color="#60A5FA" />
            <Text style={styles.hudValue}>{matchedCount}/{pairCount}</Text>
          </View>
          <View style={styles.hudItem}>
            <Ionicons name="alert-circle-outline" size={webScale(18)} color="#F59E0B" />
            <Text style={styles.hudValue}>{mistakes}</Text>
          </View>
          <View style={styles.hudItem}>
            <Ionicons name="repeat-outline" size={webScale(18)} color="#34D399" />
            <Text style={styles.hudValue}>{moves}</Text>
          </View>
        </View>

        <View style={styles.progressWrap}>
          <Text style={styles.progressLabel}>MATCH PROGRESS</Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${pairCount ? (matchedCount / pairCount) * 100 : 0}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.boardShell}>
          <View style={styles.boardHeader}>
            <Text style={styles.boardTitle}>Flip two tiles</Text>
            <Text style={styles.boardHint}>Red = first pick, blue = second pick, green = match</Text>
          </View>

          <View key={boardSeed} style={styles.boardGrid}>
            {tiles.map((tile, index) => {
              const tileState = getTileState(tile);
              const isFaceUp = tileState !== "hidden";
              const animation =
                tileState === "matched"
                  ? "pulse"
                  : tileState === "first"
                  ? "flipInY"
                  : tileState === "second"
                  ? "flipInY"
                  : "fadeIn";

              const tileTone =
                tileState === "matched"
                  ? styles.tileMatched
                  : tileState === "first"
                  ? styles.tileFirst
                  : tileState === "second"
                  ? styles.tileSecond
                  : styles.tileHidden;

              return (
                <AnimatableTile
                  key={`${tile.id}-${tileState}-${index}`}
                  animation={animation}
                  duration={380}
                  useNativeDriver
                  style={[styles.tileWrapper, { width: tileWidth }]}
                  onPress={() => handleTilePress(tile.id)}
                  activeOpacity={0.92}
                  disabled={phase !== "playing" || isResolving || tileState === "matched"}
                >
                  <View style={[styles.tileCard, tileTone]}>
                    <View style={styles.tileFace}>{renderTileFace(tile.content, isFaceUp)}</View>
                  </View>
                </AnimatableTile>
              );
            })}
          </View>
        </View>

        <View style={styles.footerHintBar}>
          <Text style={styles.footerHintText}>
            {isResolving ? "Checking pair..." : "Keep matching until every tile is cleared."}
          </Text>
        </View>
      </ScrollView>
    );
  };

  const renderResultsScreen = () => {
    const summary = gameResult || {
      won: false,
      timeTaken: 0,
      mistakes: 0,
      mismatchedTiles: 0,
      moves: 0,
      matchedPairs: 0,
      totalPairs: roundDefinition?.pairCount || 0,
      quizCode: roundDefinition?.quizCode || roundParams.quizCode || "",
    };

    const accuracy = summary.moves ? Math.round((summary.matchedPairs / summary.moves) * 100) : 0;

    return (
      <View style={styles.screenWrap}>
        <AnimatableView animation="bounceIn" duration={550} style={styles.resultCard}>
          <View style={styles.resultIconWrap}>
            <Ionicons
              name={summary.won ? "trophy-outline" : "skull-outline"}
              size={webScale(64)}
              color={summary.won ? "#FDE68A" : "#FB7185"}
            />
          </View>

          <Text style={styles.resultTitle}>{summary.won ? "Completed!" : "Game Over"}</Text>
          <Text style={styles.resultSubtitle}>
            {summary.won ? "All pairs matched." : "The timer reached zero."}
          </Text>

          <View style={styles.resultStatsGrid}>
            <View style={styles.resultStatCard}>
              <Text style={styles.resultStatValue}>{formatClock(summary.timeTaken)}</Text>
              <Text style={styles.resultStatLabel}>Time Taken</Text>
            </View>
            <View style={styles.resultStatCard}>
              <Text style={styles.resultStatValue}>{summary.mistakes}</Text>
              <Text style={styles.resultStatLabel}>Mistakes</Text>
            </View>
            <View style={styles.resultStatCard}>
              <Text style={styles.resultStatValue}>{summary.mismatchedTiles}</Text>
              <Text style={styles.resultStatLabel}>Mismatched Tiles</Text>
            </View>
            <View style={styles.resultStatCard}>
              <Text style={styles.resultStatValue}>{accuracy}%</Text>
              <Text style={styles.resultStatLabel}>Accuracy</Text>
            </View>
          </View>

          <View style={styles.resultMetaRow}>
            <View style={styles.resultMetaPill}>
              <Text style={styles.resultMetaLabel}>PAIRS</Text>
              <Text style={styles.resultMetaValue}>{summary.matchedPairs}/{summary.totalPairs}</Text>
            </View>
            <View style={styles.resultMetaPill}>
              <Text style={styles.resultMetaLabel}>CODE</Text>
              <Text style={styles.resultMetaValue}>{summary.quizCode || "AUTO"}</Text>
            </View>
          </View>

          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleReplay}>
              <Text style={styles.primaryButtonText}>PLAY AGAIN</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleReplay}>
              <Text style={styles.secondaryButtonText}>RETURN TO LOBBY</Text>
            </TouchableOpacity>
          </View>
        </AnimatableView>
      </View>
    );
  };

  return (
    <LinearGradient colors={screenGradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.header,
            {
              paddingTop: webScale(12) + insets.top * 0.2,
              paddingHorizontal: isCompactWeb ? webScale(14) : webScale(20),
            },
          ]}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleExitPress}>
            <Ionicons name="arrow-back" size={webScale(24)} color={highlightColor} />
          </TouchableOpacity>

          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: highlightColor }]}>Quick Play</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Singleplayer tile-matching challenge</Text>
          </View>

          <View style={styles.headerChip}>
            <Text style={styles.headerChipLabel}>WEB / ANDROID</Text>
          </View>
        </View>

        {phase === "menu" && renderMenuScreen()}
        {phase === "instructor" && renderInstructorScreen()}
        {phase === "playing" && renderGameplayScreen()}
        {phase === "results" && renderResultsScreen()}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050814",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: webScale(14),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.18)",
  },
  backButton: {
    marginRight: webScale(14),
    width: webScale(40),
    height: webScale(40),
    borderRadius: webScale(20),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: webScale(24),
    fontWeight: "800",
    letterSpacing: 0.5,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    marginTop: webScale(3),
    fontSize: webScale(13),
    color: COLORS.textSecondary,
  },
  headerChip: {
    paddingHorizontal: webScale(10),
    paddingVertical: webScale(7),
    borderRadius: 999,
    backgroundColor: "rgba(255, 107, 107, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.3)",
  },
  headerChipLabel: {
    color: "#FCA5A5",
    fontSize: webScale(10),
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  screenWrap: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: webScale(14),
    paddingVertical: webScale(18),
  },
  scrollArea: {
    flex: 1,
  },
  playContent: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? webScale(1040) : "100%",
    alignSelf: "center",
    paddingHorizontal: webScale(14),
  },
  menuCard: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? webScale(980) : "100%",
    backgroundColor: PANEL_BACKGROUND,
    borderRadius: webScale(26),
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    padding: webScale(18),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  menuHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: webScale(12),
    marginBottom: webScale(16),
  },
  menuEyebrow: {
    color: "#FB7185",
    fontSize: webScale(11),
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: webScale(8),
  },
  menuTitle: {
    color: "#F8FAFC",
    fontSize: webScale(28),
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  menuSubtitle: {
    color: "#CBD5E1",
    marginTop: webScale(8),
    fontSize: webScale(14),
    lineHeight: webScale(21),
    maxWidth: webScale(540),
  },
  codePill: {
    minWidth: webScale(110),
    alignItems: "center",
    paddingHorizontal: webScale(12),
    paddingVertical: webScale(10),
    borderRadius: webScale(16),
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.26)",
  },
  codePillLabel: {
    color: "#94A3B8",
    fontSize: webScale(10),
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: webScale(4),
  },
  codePillValue: {
    color: "#FDE68A",
    fontSize: webScale(18),
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  codePillInput: {
    minWidth: webScale(84),
    color: "#FDE68A",
    fontSize: webScale(16),
    fontWeight: "900",
    paddingVertical: 0,
  },
  heroFrame: {
    minHeight: webScale(250),
    borderRadius: webScale(24),
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.2)",
    backgroundColor: "rgba(9, 12, 24, 0.92)",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: webScale(16),
  },
  heroOrb: {
    position: "absolute",
    top: webScale(18),
    left: webScale(18),
    width: webScale(28),
    height: webScale(28),
    borderRadius: webScale(14),
    backgroundColor: "#FF6B6B",
    shadowColor: "#FF6B6B",
    shadowOpacity: 0.65,
    shadowRadius: 18,
  },
  heroInner: {
    alignItems: "center",
    maxWidth: webScale(520),
    paddingHorizontal: webScale(18),
  },
  heroHeadline: {
    marginTop: webScale(10),
    color: "#F8FAFC",
    fontSize: webScale(22),
    fontWeight: "900",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  heroCopy: {
    marginTop: webScale(10),
    color: "#CBD5E1",
    fontSize: webScale(14),
    lineHeight: webScale(21),
    textAlign: "center",
  },
  menuStatsRow: {
    flexDirection: "row",
    gap: webScale(10),
    marginBottom: webScale(16),
  },
  menuStatCard: {
    flex: 1,
    paddingVertical: webScale(14),
    paddingHorizontal: webScale(12),
    borderRadius: webScale(18),
    backgroundColor: "rgba(15, 23, 42, 0.76)",
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    alignItems: "center",
  },
  menuStatValue: {
    color: "#F8FAFC",
    fontSize: webScale(18),
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  menuStatLabel: {
    marginTop: webScale(5),
    color: "#94A3B8",
    fontSize: webScale(10),
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: webScale(8),
    paddingHorizontal: webScale(12),
    paddingVertical: webScale(10),
    marginBottom: webScale(16),
    borderRadius: webScale(14),
    borderWidth: 1,
    borderColor: "rgba(251, 113, 133, 0.3)",
    backgroundColor: "rgba(251, 113, 133, 0.08)",
  },
  errorText: {
    flex: 1,
    color: "#FCA5A5",
    fontSize: webScale(12),
    lineHeight: webScale(17),
  },
  ctaRow: {
    flexDirection: "row",
    gap: webScale(10),
  },
  primaryButton: {
    flex: 1,
    minHeight: webScale(52),
    borderRadius: webScale(16),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B6B",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#FF6B6B",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  primaryButtonText: {
    color: "#0B1020",
    fontSize: webScale(15),
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  secondaryButton: {
    width: webScale(140),
    minHeight: webScale(52),
    borderRadius: webScale(16),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.86)",
    borderWidth: 1,
    borderColor: SOFT_BORDER,
  },
  secondaryButtonText: {
    color: "#E2E8F0",
    fontSize: webScale(14),
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  instructorEntryButton: {
    marginTop: webScale(12),
    alignSelf: "center",
    paddingHorizontal: webScale(14),
    paddingVertical: webScale(10),
    borderRadius: webScale(14),
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.45)",
    backgroundColor: "rgba(30, 41, 59, 0.88)",
  },
  instructorEntryText: {
    color: "#93C5FD",
    fontSize: webScale(12),
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  editorCard: {
    width: "100%",
    borderRadius: webScale(24),
    backgroundColor: PANEL_BACKGROUND,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    padding: webScale(16),
  },
  editorTitle: {
    color: "#F8FAFC",
    fontSize: webScale(24),
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  editorSubtitle: {
    color: "#CBD5E1",
    marginTop: webScale(6),
    marginBottom: webScale(14),
    fontSize: webScale(13),
    lineHeight: webScale(18),
  },
  editorField: {
    marginBottom: webScale(10),
  },
  editorLabel: {
    color: "#C7D2FE",
    fontSize: webScale(11),
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: webScale(6),
    textTransform: "uppercase",
  },
  editorInput: {
    minHeight: webScale(44),
    borderRadius: webScale(12),
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    color: "#F8FAFC",
    fontSize: webScale(14),
    paddingHorizontal: webScale(12),
    paddingVertical: webScale(10),
  },
  editorTextArea: {
    minHeight: webScale(84),
    textAlignVertical: "top",
  },
  editorRow: {
    flexDirection: "row",
    gap: webScale(10),
  },
  editorHalf: {
    flex: 1,
  },
  inputWithButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: webScale(8),
  },
  inputWithButtonFlex: {
    flex: 1,
  },
  imageImportButton: {
    width: webScale(44),
    height: webScale(44),
    borderRadius: webScale(10),
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.4)",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  editorCodeRow: {
    marginTop: webScale(6),
    marginBottom: webScale(12),
    flexDirection: "row",
    alignItems: "center",
    gap: webScale(10),
  },
  editorCodePill: {
    flex: 1,
    borderRadius: webScale(12),
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    paddingHorizontal: webScale(12),
    paddingVertical: webScale(9),
  },
  editorCodeLabel: {
    color: "#94A3B8",
    fontSize: webScale(10),
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  editorCodeValue: {
    color: "#FDE68A",
    fontSize: webScale(14),
    fontWeight: "900",
    marginTop: webScale(3),
  },
  smallActionButton: {
    minHeight: webScale(40),
    paddingHorizontal: webScale(12),
    borderRadius: webScale(12),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59, 130, 246, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.45)",
  },
  smallActionButtonText: {
    color: "#BFDBFE",
    fontSize: webScale(11),
    fontWeight: "800",
    letterSpacing: 1,
  },
  editorSectionHeader: {
    marginTop: webScale(4),
    marginBottom: webScale(8),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pairEditorCard: {
    borderRadius: webScale(14),
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    padding: webScale(12),
    marginBottom: webScale(10),
  },
  pairEditorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: webScale(8),
  },
  pairEditorTitle: {
    color: "#F8FAFC",
    fontSize: webScale(13),
    fontWeight: "800",
  },
  deletePairButton: {
    paddingHorizontal: webScale(10),
    paddingVertical: webScale(7),
    borderRadius: webScale(10),
    backgroundColor: "rgba(127, 29, 29, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.4)",
  },
  deletePairButtonText: {
    color: "#FCA5A5",
    fontSize: webScale(10),
    fontWeight: "800",
    letterSpacing: 1,
  },
  editorMiniLabel: {
    color: "#A5B4FC",
    fontSize: webScale(10),
    fontWeight: "700",
    marginBottom: webScale(6),
    letterSpacing: 0.6,
  },
  typeToggleRow: {
    flexDirection: "row",
    gap: webScale(8),
    marginBottom: webScale(8),
  },
  typeToggle: {
    flex: 1,
    minHeight: webScale(34),
    borderRadius: webScale(10),
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    backgroundColor: "rgba(15,23,42,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  typeToggleActive: {
    borderColor: "rgba(96,165,250,0.6)",
    backgroundColor: "rgba(30, 64, 175, 0.35)",
  },
  typeToggleText: {
    color: "#DBEAFE",
    fontSize: webScale(11),
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  hudBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: webScale(10),
    justifyContent: "space-between",
    marginBottom: webScale(14),
  },
  hudItem: {
    minWidth: webScale(86),
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: webScale(8),
    paddingVertical: webScale(11),
    paddingHorizontal: webScale(12),
    borderRadius: webScale(16),
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1,
    borderColor: SOFT_BORDER,
  },
  hudValue: {
    color: "#F8FAFC",
    fontSize: webScale(14),
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  hudValueUrgent: {
    color: "#FB7185",
  },
  progressWrap: {
    marginBottom: webScale(14),
  },
  progressLabel: {
    color: "#94A3B8",
    fontSize: webScale(10),
    fontWeight: "800",
    letterSpacing: 1.8,
    marginBottom: webScale(8),
  },
  progressTrack: {
    height: webScale(10),
    borderRadius: webScale(999),
    backgroundColor: "rgba(15, 23, 42, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: webScale(999),
    backgroundColor: "#34D399",
  },
  boardShell: {
    padding: webScale(14),
    borderRadius: webScale(24),
    backgroundColor: PANEL_BACKGROUND,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  boardHeader: {
    marginBottom: webScale(12),
  },
  boardTitle: {
    color: "#F8FAFC",
    fontSize: webScale(18),
    fontWeight: "900",
    letterSpacing: 0.4,
    marginBottom: webScale(4),
  },
  boardHint: {
    color: "#94A3B8",
    fontSize: webScale(12),
    lineHeight: webScale(17),
  },
  boardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: webScale(10),
    justifyContent: "space-between",
  },
  tileWrapper: {
    minWidth: webScale(74),
    aspectRatio: 1,
  },
  tileCard: {
    flex: 1,
    borderRadius: webScale(18),
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  tileHidden: {
    backgroundColor: "rgba(54, 28, 84, 0.92)",
    borderColor: "rgba(139, 92, 246, 0.28)",
  },
  tileFirst: {
    backgroundColor: "rgba(239, 68, 68, 0.96)",
    borderColor: "rgba(248, 113, 113, 0.85)",
  },
  tileSecond: {
    backgroundColor: "rgba(37, 99, 235, 0.96)",
    borderColor: "rgba(96, 165, 250, 0.85)",
  },
  tileMatched: {
    backgroundColor: "rgba(34, 197, 94, 0.96)",
    borderColor: "rgba(110, 231, 183, 0.9)",
  },
  tileFace: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: webScale(10),
  },
  tileBackContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  tileBackText: {
    marginTop: webScale(4),
    color: "rgba(248,250,252,0.72)",
    fontSize: webScale(11),
    fontWeight: "900",
    letterSpacing: 1.8,
  },
  tileFrontText: {
    color: "#F8FAFC",
    textAlign: "center",
    fontSize: webScale(12),
    fontWeight: "800",
    lineHeight: webScale(15),
  },
  tileImage: {
    width: "100%",
    height: "100%",
    borderRadius: webScale(16),
  },
  footerHintBar: {
    marginTop: webScale(14),
    paddingVertical: webScale(10),
    paddingHorizontal: webScale(12),
    borderRadius: webScale(14),
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    alignItems: "center",
  },
  footerHintText: {
    color: "#CBD5E1",
    fontSize: webScale(12),
    textAlign: "center",
  },
  resultCard: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? webScale(560) : "100%",
    padding: webScale(22),
    borderRadius: webScale(28),
    backgroundColor: PANEL_BACKGROUND,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  resultIconWrap: {
    width: webScale(104),
    height: webScale(104),
    borderRadius: webScale(52),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: webScale(10),
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    borderWidth: 1,
    borderColor: SOFT_BORDER,
  },
  resultTitle: {
    color: "#F8FAFC",
    fontSize: webScale(28),
    fontWeight: "900",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  resultSubtitle: {
    marginTop: webScale(8),
    color: "#CBD5E1",
    fontSize: webScale(14),
    textAlign: "center",
  },
  resultStatsGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: webScale(10),
    marginTop: webScale(18),
  },
  resultStatCard: {
    width: "48.5%",
    paddingVertical: webScale(14),
    paddingHorizontal: webScale(12),
    borderRadius: webScale(18),
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    alignItems: "center",
  },
  resultStatValue: {
    color: "#F8FAFC",
    fontSize: webScale(18),
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  resultStatLabel: {
    marginTop: webScale(5),
    color: "#94A3B8",
    fontSize: webScale(10),
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  resultMetaRow: {
    flexDirection: "row",
    gap: webScale(10),
    marginTop: webScale(16),
    marginBottom: webScale(12),
  },
  resultMetaPill: {
    paddingVertical: webScale(10),
    paddingHorizontal: webScale(12),
    borderRadius: webScale(16),
    backgroundColor: "rgba(15, 23, 42, 0.76)",
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    alignItems: "center",
    minWidth: webScale(104),
  },
  resultMetaLabel: {
    color: "#94A3B8",
    fontSize: webScale(10),
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: webScale(4),
  },
  resultMetaValue: {
    color: "#FDE68A",
    fontSize: webScale(14),
    fontWeight: "900",
  },
});