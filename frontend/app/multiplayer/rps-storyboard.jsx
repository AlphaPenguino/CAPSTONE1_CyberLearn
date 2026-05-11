import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Dimensions,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Animatable from "react-native-animatable";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "@/store/authStore";
import RPSAPI from "@/services/rpsAPI";

const WEB_VIEWPORT_WIDTH =
  Platform.OS === "web" ? Dimensions.get("window").width : 1024;
const IS_WEB_NARROW = Platform.OS === "web" && WEB_VIEWPORT_WIDTH <= 520;
const WEB_UI_SCALE = IS_WEB_NARROW ? 0.86 : 1;
const scaleWeb = (value) =>
  Platform.OS === "web" ? Math.round(value * WEB_UI_SCALE) : value;

const AnimatedView = Animatable.createAnimatableComponent(View);
const AnimatedText = Animatable.createAnimatableComponent(Text);
const AnimatedTouchableOpacity =
  Animatable.createAnimatableComponent(TouchableOpacity);
const AnimatedLinearGradient = Animatable.createAnimatableComponent(LinearGradient);
const AnimatedIcon = Animatable.createAnimatableComponent(MaterialCommunityIcons);

const PHASES = {
  ROOM_SETUP: "room_setup",
  TEAM_SELECTION: "team_selection",
  GAME_RULES: "game_rules",
  PLAYING: "playing",
  FINISHED: "finished",
};

const PLAY_STAGE = {
  QUESTION: "question_display",
  VOTING: "voting",
  REVEAL: "reveal",
  ANSWERING: "answering",
  REBOUND: "rebound",
};

const RPS_CHOICES = {
  ROCK: "rock",
  PAPER: "paper",
  SCISSORS: "scissors",
};

const RPS_CHOICE_ICONS = {
  rock: { icon: "rock", emoji: "🪨", name: "Rock" },
  paper: { icon: "file-document", emoji: "📄", name: "Paper" },
  scissors: { icon: "scissors-cutting", emoji: "✂️", name: "Scissors" },
};

const SAMPLE_QUESTIONS = [
  {
    id: 1,
    question: "What does MERN stand for?",
    options: [
      "MongoDB, Express, React, Node",
      "MySQL, Express, React, Node",
      "MongoDB, Ember, React, Node",
      "MongoDB, Express, Ruby, Node",
    ],
    correct: 0,
  },
  {
    id: 2,
    question: "Which of these is a NoSQL database?",
    options: ["PostgreSQL", "MongoDB", "MySQL", "SQLite"],
    correct: 1,
  },
  {
    id: 3,
    question: "What does REST stand for?",
    options: [
      "Representational State Transfer",
      "Rapid Server Technology",
      "Remote Server Transfer",
      "Resource Stack Transfer",
    ],
    correct: 0,
  },
  {
    id: 4,
    question: "Which JavaScript method removes the last element?",
    options: ["shift()", "pop()", "unshift()", "push()"],
    correct: 1,
  },
  {
    id: 5,
    question: "What is React primarily used for?",
    options: [
      "Database management",
      "Building user interfaces",
      "Server management",
      "Authentication",
    ],
    correct: 1,
  },
];

const COLORS = {
  primary: "#38bdf8",
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#fbbf24",
  dark: "#0f172a",
};

const TEAMS = {
  A: { name: "Team Red", color: "#ef4444", accent: "#fb7185", icon: "alpha-a-box" },
  B: { name: "Team Blue", color: "#3b82f6", accent: "#60a5fa", icon: "alpha-b-box" },
};

const MAX_POINTS = 5;
const VOTE_SECONDS = 10;
const STEAL_SECONDS = 5;

const GAME_RULES_TEXT =
  "A question appears, then both teams get 10 seconds to vote Rock, Paper, or Scissors. The hand with the most votes is played. If a team vote is tied, the hand is chosen randomly from the tied options. The winning team gets first shot at the question. A correct answer scores 1 point. If they miss, the other team gets 5 seconds to steal. First to 5 points wins.";

const createEmptyVoteTally = () => ({
  A: { rock: 0, paper: 0, scissors: 0 },
  B: { rock: 0, paper: 0, scissors: 0 },
});

const cloneVoteTally = (voteTally) => ({
  A: { ...voteTally.A },
  B: { ...voteTally.B },
});

const shuffleArray = (values) => {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const otherTeam = (team) => (team === "A" ? "B" : "A");

const chooseWinningHand = (tally) => {
  const entries = Object.entries(tally);
  const highestCount = Math.max(...entries.map(([, count]) => count));
  const tied = entries
    .filter(([, count]) => count === highestCount)
    .map(([hand]) => hand);
  return tied[Math.floor(Math.random() * tied.length)] ?? "rock";
};

const decideRpsWinner = (handA, handB) => {
  if (handA === handB) {
    return null;
  }

  if (
    (handA === RPS_CHOICES.ROCK && handB === RPS_CHOICES.SCISSORS) ||
    (handA === RPS_CHOICES.PAPER && handB === RPS_CHOICES.ROCK) ||
    (handA === RPS_CHOICES.SCISSORS && handB === RPS_CHOICES.PAPER)
  ) {
    return "A";
  }

  return "B";
};

export default function RockPaperScissorsBattleRoyaleStoryboard() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [phase, setPhase] = useState(PHASES.ROOM_SETUP);
  const [stage, setStage] = useState(PLAY_STAGE.VOTING);
  const [roomCode, setRoomCode] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const pollIntervalRef = useRef(null);
  const username = user?.username || "Player";

  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [voteTimer, setVoteTimer] = useState(VOTE_SECONDS);
  const [stealTimer, setStealTimer] = useState(STEAL_SECONDS);
  const [voteTally, setVoteTally] = useState(createEmptyVoteTally());
  const [teamAVote, setTeamAVote] = useState(null);
  const [teamBVote, setTeamBVote] = useState(null);
  const [teamHandSelection, setTeamHandSelection] = useState({ A: null, B: null });
  const [rpsWinner, setRpsWinner] = useState(null);
  const [answeringTeam, setAnsweringTeam] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [flashMessage, setFlashMessage] = useState("");
  const [playerHandSelection, setPlayerHandSelection] = useState(null);

  const questionDeckRef = useRef([]);
  const votePlanRef = useRef({ A: [], B: [] });
  const voteTallyRef = useRef(createEmptyVoteTally());
  const resolveVotingRef = useRef(null);
  const votingIntervalRef = useRef(null);
  const stealIntervalRef = useRef(null);
  const transitionTimeoutRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (votingIntervalRef.current) {
      clearInterval(votingIntervalRef.current);
      votingIntervalRef.current = null;
    }
    if (stealIntervalRef.current) {
      clearInterval(stealIntervalRef.current);
      stealIntervalRef.current = null;
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Poll backend for room state updates
  useEffect(() => {
    if (!roomCode) return;

    const pollRoomState = async () => {
      try {
        const response = await RPSAPI.getRoom(roomCode);
        if (response.success && response.room) {
          // Sync room state to local state
          if (response.room.players) {
            const allPlayers = [
              ...response.room.players.A.map((p) => ({
                id: p.userId,
                username: p.username,
                team: "A",
              })),
              ...response.room.players.B.map((p) => ({
                id: p.userId,
                username: p.username,
                team: "B",
              })),
            ];
            setPlayers(allPlayers);
          }

          // Sync game state
          if (response.room.phase) setPhase(response.room.phase);
          // Note: playStage is managed locally by frontend during gameplay to control timing
          // if (response.room.playStage) setStage(response.room.playStage);
          if (response.room.scores) {
            setTeamAScore(response.room.scores.A);
            setTeamBScore(response.room.scores.B);
          }
          if (response.room.currentQuestion)
            setCurrentQuestion(response.room.currentQuestion);
          if (response.room.voteTally)
            setVoteTally(response.room.voteTally);
          if (response.room.teamVotes) {
            setTeamAVote(response.room.teamVotes.A);
            setTeamBVote(response.room.teamVotes.B);
          }
          if (response.room.rpsWinner)
            setRpsWinner(response.room.rpsWinner);
          if (response.room.answeringTeam)
            setAnsweringTeam(response.room.answeringTeam);
          if (response.room.selectedAnswer !== undefined && response.room.selectedAnswer !== null)
            setSelectedAnswer(response.room.selectedAnswer);
          if (response.room.gameHistory)
            setGameHistory(response.room.gameHistory);
        }
      } catch (err) {
        console.warn("Room sync error:", err.message);
      }
    };

    // Poll every 500ms for real-time-ish updates
    pollIntervalRef.current = setInterval(pollRoomState, 500);

    // Initial sync
    pollRoomState();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [roomCode]);

  const resetBattleFields = useCallback(() => {
    clearTimers();
    setQuestionIndex(0);
    setCurrentQuestion(null);
    setVoteTimer(VOTE_SECONDS);
    setStealTimer(STEAL_SECONDS);
    setVoteTally(createEmptyVoteTally());
    setTeamAVote(null);
    setTeamBVote(null);
    setTeamHandSelection({ A: null, B: null });
    setRpsWinner(null);
    setAnsweringTeam(null);
    setSelectedAnswer(null);
    setPlayerHandSelection(null);
    setFlashMessage("");
    setStage(PLAY_STAGE.VOTING);
    votePlanRef.current = { A: [], B: [] };
    questionDeckRef.current = [];
  }, [clearTimers]);

  const getNextQuestion = useCallback(() => {
    if (questionDeckRef.current.length === 0) {
      questionDeckRef.current = shuffleArray([
        ...SAMPLE_QUESTIONS,
        ...SAMPLE_QUESTIONS,
        ...SAMPLE_QUESTIONS,
      ]);
    }
    return questionDeckRef.current.shift() ?? SAMPLE_QUESTIONS[0];
  }, []);

  const buildVotePlan = useCallback(
    (team) => {
      const teamMembers = players.filter((player) => player.team === team);
      const choices = Object.values(RPS_CHOICES);
      return shuffleArray(
        teamMembers.map(() => choices[Math.floor(Math.random() * choices.length)])
      );
    },
    [players]
  );

  const advanceToNextRound = useCallback(() => {
    clearTimers();

    const nextQuestion = getNextQuestion();
    const nextVoteTally = createEmptyVoteTally();

    setQuestionIndex((prev) => prev + 1);
    setCurrentQuestion(nextQuestion);
    setVoteTally(nextVoteTally);
    setVoteTimer(VOTE_SECONDS);
    setStealTimer(STEAL_SECONDS);
    setTeamAVote(null);
    setTeamBVote(null);
    setTeamHandSelection({ A: null, B: null });
    setRpsWinner(null);
    setAnsweringTeam(null);
    setSelectedAnswer(null);
    setPlayerHandSelection(null);
    setFlashMessage("THE HUDDLE");
    setStage(PLAY_STAGE.VOTING);

    votePlanRef.current = {
      A: buildVotePlan("A"),
      B: buildVotePlan("B"),
    };
    questionDeckRef.current = questionDeckRef.current.length
      ? questionDeckRef.current
      : shuffleArray([...SAMPLE_QUESTIONS, ...SAMPLE_QUESTIONS]);

    // Sync question to backend so all players see it
    if (roomCode) {
      RPSAPI.updateGameState(roomCode, { currentQuestion: nextQuestion }).catch(
        (err) => console.warn("Error syncing question:", err.message)
      );
    }
  }, [buildVotePlan, clearTimers, getNextQuestion, roomCode]);

  const finishGame = useCallback(async () => {
    clearTimers();
    setStage(PLAY_STAGE.VOTING);
    setPhase(PHASES.FINISHED);
    setFlashMessage("VICTORY!");

    // Track game completion with backend
    try {
      if (roomCode) {
        const winner = teamAScore > teamBScore ? "A" : teamBScore > teamAScore ? "B" : "tie";
        await RPSAPI.completeGame(roomCode, {
          gameResult: winner,
          teamResult: { teamA: teamAScore, teamB: teamBScore },
          finalScore: { A: teamAScore, B: teamBScore },
        });
      }
    } catch (err) {
      console.warn("Error tracking game completion:", err.message);
    }
  }, [clearTimers, roomCode, teamAScore, teamBScore]);

  const finalizeQuestionRound = useCallback(
    ({ scoringTeam = null, mode, outcome }) => {
      clearTimers();

      const nextScoreA = teamAScore + (scoringTeam === "A" ? 1 : 0);
      const nextScoreB = teamBScore + (scoringTeam === "B" ? 1 : 0);

      if (scoringTeam === "A") {
        setTeamAScore(nextScoreA);
      }
      if (scoringTeam === "B") {
        setTeamBScore(nextScoreB);
      }

      setGameHistory((prev) => [
        ...prev,
        {
          round: questionIndex,
          question: currentQuestion?.question,
          answer: currentQuestion?.options?.[currentQuestion.correct],
          teamAVote,
          teamBVote,
          rpsWinner,
          answeringTeam,
          selectedAnswer,
          scoringTeam,
          mode,
          outcome,
        },
      ]);

      const reachedTarget = nextScoreA >= MAX_POINTS || nextScoreB >= MAX_POINTS;
      if (reachedTarget) {
        setFlashMessage("VICTORY!");
        transitionTimeoutRef.current = setTimeout(() => finishGame(), 1100);
        return;
      }

      setFlashMessage(outcome === "steal" ? "STEAL SUCCESS!" : outcome === "fail" ? "REBOUND!" : "SUCCESS!");
      transitionTimeoutRef.current = setTimeout(() => {
        advanceToNextRound();
      }, 1100);
    },
    [
      answeringTeam,
      advanceToNextRound,
      clearTimers,
      currentQuestion,
      finishGame,
      questionIndex,
      rpsWinner,
      selectedAnswer,
      teamAScore,
      teamAVote,
      teamBScore,
      teamBVote,
    ]
  );

  const resolveVoting = useCallback(() => {
    clearTimers();

    const handA = teamHandSelection.A ?? chooseWinningHand(voteTally.A);
    const handB = teamHandSelection.B ?? chooseWinningHand(voteTally.B);
    const rpsResult = decideRpsWinner(handA, handB);
    const winner = rpsResult ?? (Math.random() < 0.5 ? "A" : "B");

    setTeamAVote(handA);
    setTeamBVote(handB);
    setRpsWinner(winner);
    setStage(PLAY_STAGE.REVEAL);
    setFlashMessage(rpsResult === null ? "TIE BREAK!" : `${TEAMS[winner].name.toUpperCase()} STRIKES!`);

    transitionTimeoutRef.current = setTimeout(() => {
      setAnsweringTeam(winner);
      setSelectedAnswer(null);
      setStage(PLAY_STAGE.ANSWERING);
      setFlashMessage(`${TEAMS[winner].name.toUpperCase()} ANSWERING`);
    }, 1100);
  }, [clearTimers, teamHandSelection, voteTally]);

  useEffect(() => {
    resolveVotingRef.current = resolveVoting;
  }, [resolveVoting]);

  useEffect(() => {
    if (phase !== PHASES.PLAYING || stage !== PLAY_STAGE.VOTING) {
      return undefined;
    }

    const bothHandsLocked = teamHandSelection.A && teamHandSelection.B;

    if (!bothHandsLocked) {
      return undefined;
    }

    clearTimers();
    setFlashMessage("VERSUS!");
    transitionTimeoutRef.current = setTimeout(() => {
      resolveVotingRef.current?.();
    }, 300);

    return () => {};
  }, [clearTimers, phase, stage, teamHandSelection]);

  const handleGenerateRoom = useCallback(async () => {
    clearTimers();
    setIsLoading(true);
    setError("");

    try {
      const response = await RPSAPI.createRoom(username);
      if (response.success) {
        const newRoomCode = response.room.roomCode;
        setRoomCode(newRoomCode);
        setJoinRoomCode("");
          // Do not auto-assign creator to a team. Let them choose.
          const allPlayers = response.room.players
            ? [
                ...response.room.players.A.map((p) => ({ id: p.userId, username: p.username, team: "A" })),
                ...response.room.players.B.map((p) => ({ id: p.userId, username: p.username, team: "B" })),
              ]
            : [];
          setPlayers(allPlayers);
          setSelectedTeam(null);
        setGameHistory([]);
        setTeamAScore(0);
        setTeamBScore(0);
        resetBattleFields();
        setPhase(PHASES.TEAM_SELECTION);
      } else {
        setError(response.message || "Failed to create room");
      }
    } catch (err) {
      setError(err.message || "Error creating room");
    } finally {
      setIsLoading(false);
    }
  }, [clearTimers, resetBattleFields, username]);

  const handleJoinRoom = useCallback(async () => {
    if (!joinRoomCode.trim()) {
      setError("Please enter a room code");
      return;
    }
    if (joinRoomCode.trim().length !== 6) {
      setError("Room code must be 6 characters");
      return;
    }

    clearTimers();
    setIsLoading(true);
    setError("");

    try {
      const code = joinRoomCode.trim().toUpperCase();
      // Do not auto-join a team on entering a room code. Simply fetch room state
      const response = await RPSAPI.getRoom(code);
      if (response.success && response.room) {
        setRoomCode(code);
        const allPlayers = [
          ...response.room.players.A.map((p) => ({ id: p.userId, username: p.username, team: "A" })),
          ...response.room.players.B.map((p) => ({ id: p.userId, username: p.username, team: "B" })),
        ];
        setPlayers(allPlayers);
        setSelectedTeam(null);
        setGameHistory([]);
        setTeamAScore(response.room.scores?.A || 0);
        setTeamBScore(response.room.scores?.B || 0);
        resetBattleFields();
        setPhase(PHASES.TEAM_SELECTION);
      } else {
        setError(response.message || "Failed to fetch room");
      }
    } catch (err) {
      setError(err.message || "Error joining room");
    } finally {
      setIsLoading(false);
    }
  }, [clearTimers, joinRoomCode, resetBattleFields]);

  const handleSelectTeam = useCallback(
    async (team) => {
      if (!user?.username) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      if (!roomCode) {
        Alert.alert("Error", "No room selected");
        return;
      }

      if (players.find((player) => player.id === user.id)) {
        Alert.alert("Already Joined", "You've already joined this game");
        return;
      }

      const teamPlayers = players.filter((player) => player.team === team);
      if (teamPlayers.length >= 3) {
        Alert.alert("Team Full", "This team already has 3 players");
        return;
      }

      try {
        setIsLoading(true);
        const response = await RPSAPI.joinRoom(roomCode, user.username, team);
        if (response.success) {
          setSelectedTeam(team);
          // Update players from backend response
          if (response.room.players) {
            const allPlayers = [
              ...response.room.players.A.map((p) => ({
                id: p.userId,
                username: p.username,
                team: "A",
              })),
              ...response.room.players.B.map((p) => ({
                id: p.userId,
                username: p.username,
                team: "B",
              })),
            ];
            setPlayers(allPlayers);
          }
          setPhase(PHASES.TEAM_SELECTION);
        } else {
          Alert.alert("Error", response.message || "Failed to join team");
        }
      } catch (err) {
        Alert.alert("Error", err.message || "Error joining team");
      } finally {
        setIsLoading(false);
      }
    },
      [players, roomCode, user]
  );

  const handleStartGame = useCallback(async () => {
    const teamAPlayers = players.filter((player) => player.team === "A").length;
    const teamBPlayers = players.filter((player) => player.team === "B").length;

    if (teamAPlayers === 0 || teamBPlayers === 0) {
      Alert.alert("Need Both Teams", "Both teams need at least 1 player to start");
      return;
    }

    try {
      setIsLoading(true);
      const response = await RPSAPI.startGame(roomCode);
      if (response.success) {
        clearTimers();
        questionDeckRef.current = shuffleArray([
          ...SAMPLE_QUESTIONS,
          ...SAMPLE_QUESTIONS,
          ...SAMPLE_QUESTIONS,
        ]);
        votePlanRef.current = { A: [], B: [] };
        setGameHistory([]);
        setTeamAScore(0);
        setTeamBScore(0);
        setQuestionIndex(0);
        setPhase(PHASES.PLAYING);
        advanceToNextRound();
      } else {
        Alert.alert("Error", response.message || "Failed to start game");
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Error starting game");
    } finally {
      setIsLoading(false);
    }
  }, [advanceToNextRound, clearTimers, players, roomCode]);

  const handleLeaveGame = useCallback(() => {
    Alert.alert("Leave Game", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            if (roomCode) {
              await RPSAPI.leaveRoom(roomCode);
            }
          } catch (err) {
            console.warn("Error leaving room:", err.message);
          }

          clearTimers();
          setPhase(PHASES.ROOM_SETUP);
          setStage(PLAY_STAGE.QUESTION);
          setRoomCode("");
          setJoinRoomCode("");
          setSelectedTeam(null);
          setPlayers([]);
          setError("");
          setTeamAScore(0);
          setTeamBScore(0);
          setQuestionIndex(0);
          setCurrentQuestion(null);
          setVoteTimer(VOTE_SECONDS);
          setStealTimer(STEAL_SECONDS);
          setVoteTally(createEmptyVoteTally());
          setTeamAVote(null);
          setTeamBVote(null);
          setRpsWinner(null);
          setAnsweringTeam(null);
          setSelectedAnswer(null);
          setGameHistory([]);
          setFlashMessage("");
          questionDeckRef.current = [];
          votePlanRef.current = { A: [], B: [] };
        },
      },
    ]);
  }, [clearTimers, roomCode]);

  const handleAnswerChoice = useCallback(
    (optionIndex) => {
      if (phase !== PHASES.PLAYING || !currentQuestion) {
        return;
      }

      if (stage !== PLAY_STAGE.ANSWERING && stage !== PLAY_STAGE.REBOUND) {
        return;
      }

      if (stage === PLAY_STAGE.REBOUND && selectedAnswer !== null) {
        return;
      }

      setSelectedAnswer(optionIndex);

      if (optionIndex === currentQuestion.correct) {
        const scoringTeam = answeringTeam;
        finalizeQuestionRound({
          scoringTeam,
          mode: stage === PLAY_STAGE.REBOUND ? "steal" : "direct",
          outcome: stage === PLAY_STAGE.REBOUND ? "steal" : "correct",
        });
        return;
      }

      if (stage === PLAY_STAGE.ANSWERING) {
        setFlashMessage("REBOUND!");
        transitionTimeoutRef.current = setTimeout(() => {
          setSelectedAnswer(null);
          setAnsweringTeam(otherTeam(answeringTeam));
          setStage(PLAY_STAGE.REBOUND);
          setStealTimer(STEAL_SECONDS);
        }, 650);
      }
    },
    [answeringTeam, currentQuestion, finalizeQuestionRound, phase, selectedAnswer, stage]
  );

  useEffect(() => {
    if (phase !== PHASES.PLAYING || stage !== PLAY_STAGE.QUESTION) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setFlashMessage("THE HUDDLE");
      setStage(PLAY_STAGE.VOTING);
    }, 900);

    return () => clearTimeout(timeoutId);
  }, [phase, stage]);

  useEffect(() => {
    if (phase !== PHASES.PLAYING || stage !== PLAY_STAGE.REVEAL) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setAnsweringTeam(rpsWinner);
      setSelectedAnswer(null);
      setStage(PLAY_STAGE.ANSWERING);
      setFlashMessage(`${TEAMS[rpsWinner].name.toUpperCase()} ANSWERING`);
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [phase, rpsWinner, stage]);

  useEffect(() => {
    if (phase !== PHASES.PLAYING || stage !== PLAY_STAGE.VOTING) {
      return undefined;
    }

    setVoteTimer(VOTE_SECONDS);

    votingIntervalRef.current = setInterval(() => {
      setVoteTimer((previous) => {
        if (previous <= 1) {
          if (votingIntervalRef.current) {
            clearInterval(votingIntervalRef.current);
            votingIntervalRef.current = null;
          }
          transitionTimeoutRef.current = setTimeout(() => {
            resolveVotingRef.current?.();
          }, 250);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => {
      if (votingIntervalRef.current) {
        clearInterval(votingIntervalRef.current);
        votingIntervalRef.current = null;
      }
    };
  }, [phase, stage]);

  useEffect(() => {
    if (phase !== PHASES.PLAYING || stage !== PLAY_STAGE.REBOUND) {
      return undefined;
    }

    stealIntervalRef.current = setInterval(() => {
      setStealTimer((previous) => {
        if (previous <= 1) {
          if (stealIntervalRef.current) {
            clearInterval(stealIntervalRef.current);
            stealIntervalRef.current = null;
          }
          finalizeQuestionRound({
            scoringTeam: null,
            mode: "steal",
            outcome: "fail",
          });
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => {
      if (stealIntervalRef.current) {
        clearInterval(stealIntervalRef.current);
        stealIntervalRef.current = null;
      }
    };
  }, [finalizeQuestionRound, phase, stage]);

  useEffect(() => {
    voteTallyRef.current = voteTally;
  }, [voteTally]);

  const playerTeam = players.find((player) => player.id === user?.id)?.team;
  const winnerTeam = teamAScore > teamBScore ? "A" : teamBScore > teamAScore ? "B" : null;
  const playerWon = winnerTeam && playerTeam ? winnerTeam === playerTeam : null;

  const getStageCopy = () => {
    if (phase !== PHASES.PLAYING) {
      return null;
    }

    switch (stage) {
      case PLAY_STAGE.QUESTION:
        return {
          tag: "THE MATCHUP",
          title: currentQuestion?.question ?? "Loading next question...",
          subtitle: `Round ${questionIndex} of ${MAX_POINTS}`,
        };
      case PLAY_STAGE.VOTING:
        return {
          tag: "THE HUDDLE (Hand Selection)",
          title: `${voteTimer}s to choose`,
          subtitle: "Teams are locking in their hands.",
        };
      case PLAY_STAGE.REVEAL:
        return {
          tag: "THE REVEAL",
          title: `${TEAMS.A.name} vs ${TEAMS.B.name}`,
          subtitle: "Hands are on the board.",
        };
      case PLAY_STAGE.ANSWERING:
        return {
          tag: "FIRST SHOT (Answer)",
          title: currentQuestion?.question ?? "Question loading...",
          subtitle: `${TEAMS[answeringTeam]?.name ?? "Team"} answers - Correct gets 1 point.`,
        };
      case PLAY_STAGE.REBOUND:
        return {
          tag: "FAILURE & REBOUND!",
          title: `${TEAMS[answeringTeam]?.name ?? "Other team"} steals in ${stealTimer}s`,
          subtitle: "One last chance to steal the point.",
        };
      default:
        return null;
    }
  };

  const sceneCopy = getStageCopy();

  const renderQuestionOptions = (disabled = false) => (
    <View style={styles.optionsGrid}>
      {currentQuestion?.options?.map((option, index) => {
        const isSelected = selectedAnswer === index;
        const isCorrect = currentQuestion.correct === index && (stage === PLAY_STAGE.REBOUND || stage === PLAY_STAGE.ANSWERING) && selectedAnswer !== null;

        return (
          <AnimatedTouchableOpacity
            key={option}
            animation="fadeInUp"
            duration={350}
            delay={index * 40}
            style={[
              styles.optionButton,
              isSelected && styles.optionSelected,
              isCorrect && styles.optionCorrect,
            ]}
            onPress={() => handleAnswerChoice(index)}
            disabled={disabled}
            activeOpacity={0.9}
          >
            <Text style={styles.optionLabel}>{String.fromCharCode(65 + index)}</Text>
            <Text style={styles.optionText}>{option}</Text>
          </AnimatedTouchableOpacity>
        );
      })}
    </View>
  );

  const renderRoomSetup = () => (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <LinearGradient colors={["#08111f", "#0f172a", "#111827"]} style={styles.gradientBg}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()}>
              <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.pageTitle}>RPS Battle Royale</Text>
              <Text style={styles.pageSubtitle}>Comic-style multiplayer quiz showdown</Text>
            </View>
            <View style={{ width: 28 }} />
          </View>

          <AnimatedView animation="fadeInUp" duration={550} style={styles.heroPanel}>
            <Text style={styles.heroTag}>THE MATCHUP</Text>
            <Text style={styles.heroTitle}>Build the room. Start the clash.</Text>
            <Text style={styles.heroText}>
              Create a room or join one, then stack the teams and launch the battle.
            </Text>
            <MaterialCommunityIcons name="sword-cross" size={scaleWeb(66)} color={COLORS.primary} style={styles.heroIcon} />
          </AnimatedView>

          <AnimatedView animation="zoomIn" duration={500} style={styles.cardPanel}>
            <Text style={styles.cardTag}>CREATE</Text>
            <Text style={styles.cardTitle}>New Game</Text>
            <Text style={styles.cardDescription}>Generate a fresh room code and pull people in.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleGenerateRoom} activeOpacity={0.9}>
              <LinearGradient colors={[COLORS.primary, "#1d4ed8"]} style={styles.buttonGradient}>
                <MaterialCommunityIcons name="plus-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>{isLoading ? "Loading..." : "Create Room"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </AnimatedView>

          <AnimatedView animation="zoomIn" duration={500} delay={120} style={styles.cardPanel}>
            <Text style={styles.cardTag}>JOIN</Text>
            <Text style={styles.cardTitle}>Existing Game</Text>
            <Text style={styles.cardDescription}>Enter the 6-character room code from your team.</Text>
            <TextInput
              style={styles.roomInput}
              placeholder="ROOM CODE"
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={joinRoomCode}
              onChangeText={setJoinRoomCode}
              maxLength={6}
              autoCapitalize="characters"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity style={styles.secondaryButton} onPress={handleJoinRoom} activeOpacity={0.9} disabled={isLoading}>
              <LinearGradient colors={["#10b981", "#059669"]} style={styles.buttonGradient}>
                <MaterialCommunityIcons name="login" size={20} color="#fff" />
                <Text style={styles.buttonText}>{isLoading ? "Loading..." : "Join Room"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </AnimatedView>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );

  const renderTeamSelection = () => {
    const teamAPlayers = players.filter((player) => player.team === "A");
    const teamBPlayers = players.filter((player) => player.team === "B");

    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <LinearGradient colors={["#08111f", "#0f172a", "#111827"]} style={styles.gradientBg}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={handleLeaveGame}>
                <MaterialCommunityIcons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={styles.pageTitle}>Room Code</Text>
                <Text style={styles.roomCode}>{roomCode || "------"}</Text>
              </View>
              <View style={{ width: 28 }} />
            </View>

            <Text style={styles.sectionHeader}>Select Your Team</Text>

            <AnimatedView animation="slideInLeft" duration={500} style={styles.teamCard}>
              <LinearGradient colors={[TEAMS.A.color, "#991b1b"]} style={styles.teamGradient}>
                <MaterialCommunityIcons name={TEAMS.A.icon} size={scaleWeb(52)} color="#fff" />
                <Text style={styles.teamName}>{TEAMS.A.name}</Text>
                <Text style={styles.teamCount}>{teamAPlayers.length} Player{teamAPlayers.length === 1 ? "" : "s"}</Text>
                <View style={styles.playerList}>
                  {teamAPlayers.map((player) => (
                    <Text key={player.id} style={styles.playerName}>• {player.username}</Text>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.teamButton, selectedTeam === "A" && styles.teamButtonSelected]}
                  onPress={() => handleSelectTeam("A")}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <Text style={styles.teamButtonText}>{selectedTeam === "A" ? "✓ Joined" : "Join Team Red"}</Text>
                </TouchableOpacity>
              </LinearGradient>
            </AnimatedView>

            <AnimatedView animation="slideInRight" duration={500} delay={80} style={styles.teamCard}>
              <LinearGradient colors={[TEAMS.B.color, "#1d4ed8"]} style={styles.teamGradient}>
                <MaterialCommunityIcons name={TEAMS.B.icon} size={scaleWeb(52)} color="#fff" />
                <Text style={styles.teamName}>{TEAMS.B.name}</Text>
                <Text style={styles.teamCount}>{teamBPlayers.length} Player{teamBPlayers.length === 1 ? "" : "s"}</Text>
                <View style={styles.playerList}>
                  {teamBPlayers.map((player) => (
                    <Text key={player.id} style={styles.playerName}>• {player.username}</Text>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.teamButton, selectedTeam === "B" && styles.teamButtonSelected]}
                  onPress={() => handleSelectTeam("B")}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <Text style={styles.teamButtonText}>{selectedTeam === "B" ? "✓ Joined" : "Join Team Blue"}</Text>
                </TouchableOpacity>
              </LinearGradient>
            </AnimatedView>

            <TouchableOpacity
              style={[styles.launchButton, players.length < 2 && styles.disabledButton]}
              onPress={handleStartGame}
              disabled={players.length < 2 || isLoading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={
                  players.length >= 2 ? ["#fbbf24", "#f97316"] : ["#475569", "#334155"]
                }
                style={styles.buttonGradient}
              >
                <MaterialCommunityIcons name="play-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Start Battle ({players.length}/6)</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  };

  const renderRules = () => (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <LinearGradient colors={["#08111f", "#0f172a", "#111827"]} style={styles.gradientBg}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleLeaveGame}>
              <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.pageTitle}>Game Rules</Text>
            </View>
            <View style={{ width: 28 }} />
          </View>

          <AnimatedView animation="fadeInUp" duration={500} style={styles.rulesPanel}>
            <Text style={styles.cardTag}>HOW IT WORKS</Text>
            <Text style={styles.rulesText}>{GAME_RULES_TEXT}</Text>
            <View style={styles.highlightRow}>
              <MaterialCommunityIcons name="lightbulb" size={18} color="#fbbf24" />
              <Text style={styles.highlightText}>Work together. Read the room. Win the board.</Text>
            </View>
          </AnimatedView>

          <TouchableOpacity style={styles.primaryButton} onPress={handleStartGame} activeOpacity={0.9}>
            <LinearGradient colors={["#10b981", "#059669"]} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>{isLoading ? "Loading..." : "Ready to Battle"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );

  const renderHandSelection = () => {
    const userTeam = players.find((p) => p.id === user?.id)?.team;
    
    const teamAPlayers = players.filter((p) => p.team === "A");
    const teamBPlayers = players.filter((p) => p.team === "B");
    
    // Check if both teams have players
    const bothTeamsReady = teamAPlayers.length > 0 && teamBPlayers.length > 0;

    return (
      <View style={styles.votingContainer}>
        <View style={styles.teamsVotingRow}>
          {/* Team A */}
          <AnimatedView animation="slideInLeft" duration={600} style={styles.teamVotingCard}>
            <LinearGradient
              colors={["rgba(239, 68, 68, 0.15)", "rgba(239, 68, 68, 0.08)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.teamVotingGradient}
            >
              <View style={[styles.teamVotingHeader, { borderBottomColor: TEAMS.A.color }]}>
                <MaterialCommunityIcons name={TEAMS.A.icon} size={24} color={TEAMS.A.color} />
                <Text style={[styles.teamVotingName, { color: TEAMS.A.color }]}>
                  {TEAMS.A.name}
                </Text>
              </View>

              <View style={styles.handButtonGrid}>
                {Object.entries(RPS_CHOICE_ICONS).map(([choice, meta], idx) => (
                  <AnimatedView
                    key={choice}
                    animation="zoomIn"
                    duration={400}
                    delay={idx * 100}
                    style={styles.handGridItem}
                  >
                    <TouchableOpacity
                      style={[
                        styles.handGridButton,
                        userTeam === "A" && playerHandSelection === choice && styles.handGridButtonSelected,
                      ]}
                      onPress={() => {
                        if (userTeam === "A") {
                          setPlayerHandSelection(choice);
                          setTeamHandSelection((prev) => ({ ...prev, A: choice }));
                        }
                      }}
                      activeOpacity={userTeam === "A" ? 0.7 : 1}
                      disabled={userTeam !== "A"}
                    >
                      <Text style={styles.handGridEmoji}>{meta.emoji}</Text>
                      <Text style={styles.handGridLabel}>{meta.name}</Text>
                    </TouchableOpacity>
                  </AnimatedView>
                ))}
              </View>

              {userTeam === "A" && (
                <AnimatedView animation="fadeIn" duration={500} style={styles.playerIndicator}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.success} />
                  <Text style={styles.playerIndicatorText}>Your team</Text>
                </AnimatedView>
              )}
            </LinearGradient>
          </AnimatedView>

          {/* VS Badge */}
          <AnimatedView animation="bounceIn" duration={700} style={styles.vsBadgeVoting}>
            <Text style={styles.vsTextVoting}>VS</Text>
          </AnimatedView>

          {/* Team B */}
          <AnimatedView animation="slideInRight" duration={600} style={styles.teamVotingCard}>
            <LinearGradient
              colors={["rgba(59, 130, 246, 0.15)", "rgba(59, 130, 246, 0.08)"]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.teamVotingGradient}
            >
              <View style={[styles.teamVotingHeader, { borderBottomColor: TEAMS.B.color }]}>
                <MaterialCommunityIcons name={TEAMS.B.icon} size={24} color={TEAMS.B.color} />
                <Text style={[styles.teamVotingName, { color: TEAMS.B.color }]}>
                  {TEAMS.B.name}
                </Text>
              </View>

              <View style={styles.handButtonGrid}>
                {Object.entries(RPS_CHOICE_ICONS).map(([choice, meta], idx) => (
                  <AnimatedView
                    key={choice}
                    animation="zoomIn"
                    duration={400}
                    delay={idx * 100}
                    style={styles.handGridItem}
                  >
                    <TouchableOpacity
                      style={[
                        styles.handGridButton,
                        userTeam === "B" && playerHandSelection === choice && styles.handGridButtonSelected,
                      ]}
                      onPress={() => {
                        if (userTeam === "B") {
                          setPlayerHandSelection(choice);
                          setTeamHandSelection((prev) => ({ ...prev, B: choice }));
                        }
                      }}
                      activeOpacity={userTeam === "B" ? 0.7 : 1}
                      disabled={userTeam !== "B"}
                    >
                      <Text style={styles.handGridEmoji}>{meta.emoji}</Text>
                      <Text style={styles.handGridLabel}>{meta.name}</Text>
                    </TouchableOpacity>
                  </AnimatedView>
                ))}
              </View>

              {userTeam === "B" && (
                <AnimatedView animation="fadeIn" duration={500} style={styles.playerIndicator}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.success} />
                  <Text style={styles.playerIndicatorText}>Your team</Text>
                </AnimatedView>
              )}
            </LinearGradient>
          </AnimatedView>
        </View>
      </View>
    );
  };

  const renderGameplay = () => (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <LinearGradient colors={["#08111f", "#0f172a", "#111827"]} style={styles.gradientBg}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleLeaveGame}>
              <MaterialCommunityIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.pageTitle}>RPS Battle Royale</Text>
              <Text style={styles.roomCode}>{roomCode || "ROOM"}</Text>
            </View>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.scoreBoard}>
            <View style={styles.scoreTile}>
              <Text style={styles.scoreLabel}>{TEAMS.A.name}</Text>
              <Text style={[styles.scoreValue, { color: TEAMS.A.color }]}>{teamAScore}</Text>
            </View>
            <View style={styles.roundTile}>
              <Text style={styles.roundLabel}>ROUND</Text>
              <Text style={styles.roundValue}>{questionIndex}</Text>
            </View>
            <View style={styles.scoreTile}>
              <Text style={styles.scoreLabel}>{TEAMS.B.name}</Text>
              <Text style={[styles.scoreValue, { color: TEAMS.B.color }]}>{teamBScore}</Text>
            </View>
          </View>

          {flashMessage ? (
            <AnimatedView animation="pulse" iterationCount="infinite" style={styles.flashBanner}>
              <AnimatedText animation="fadeIn" style={styles.flashText}>{flashMessage}</AnimatedText>
            </AnimatedView>
          ) : null}

          {sceneCopy ? (
            <AnimatedView animation="fadeInUp" duration={450} key={stage} style={styles.storyPanel}>
              <Text style={styles.cardTag}>{sceneCopy.tag}</Text>
              <Text style={styles.storyTitle}>{sceneCopy.title}</Text>
              <Text style={styles.storySubtitle}>{sceneCopy.subtitle}</Text>

              {stage === PLAY_STAGE.QUESTION ? (
                <View style={styles.questionArtPanel}>
                  <MaterialCommunityIcons name="cards-playing-outline" size={scaleWeb(72)} color={COLORS.primary} />
                  <Text style={styles.questionText}>{currentQuestion?.question}</Text>
                </View>
              ) : null}

              {stage === PLAY_STAGE.VOTING ? (
                <View>
                  <View style={styles.voteHeaderRow}>
                    <View style={styles.voteBadge}>
                      <Text style={styles.voteBadgeText}>{voteTimer}s</Text>
                    </View>
                    <Text style={styles.voteCaption}>Choose your hand wisely!</Text>
                  </View>
                  {renderHandSelection()}
                </View>
              ) : null}

              {stage === PLAY_STAGE.REVEAL ? (
                <AnimatedView animation="pulse" duration={400} iterationCount={2} style={styles.revealRow}>
                  <AnimatedView animation="bounceIn" duration={700} style={[styles.revealCard, { borderColor: TEAMS.A.color }]}>
                    <LinearGradient
                      colors={["rgba(239, 68, 68, 0.15)", "rgba(239, 68, 68, 0.08)"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.revealCardGradient}
                    >
                      <Text style={styles.revealTeamLabel}>{TEAMS.A.name}</Text>
                      <AnimatedView animation="zoomIn" duration={600} style={styles.revealHandWrapper}>
                        <AnimatedIcon
                          animation="bounceInLeft"
                          duration={700}
                          delay={100}
                          name={RPS_CHOICE_ICONS[teamAVote]?.icon ?? "help-circle"}
                          size={scaleWeb(52)}
                          color={TEAMS.A.color}
                        />
                        <Text style={styles.revealHand}>{RPS_CHOICE_ICONS[teamAVote]?.emoji ?? "?"}</Text>
                      </AnimatedView>
                    </LinearGradient>
                  </AnimatedView>

                  <AnimatedView animation="pulse" duration={300} style={styles.vsBadge}>
                    <Text style={styles.vsText}>VS</Text>
                  </AnimatedView>

                  <AnimatedView animation="bounceIn" duration={700} delay={100} style={[styles.revealCard, { borderColor: TEAMS.B.color }]}>
                    <LinearGradient
                      colors={["rgba(59, 130, 246, 0.15)", "rgba(59, 130, 246, 0.08)"]}
                      start={{ x: 1, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.revealCardGradient}
                    >
                      <Text style={styles.revealTeamLabel}>{TEAMS.B.name}</Text>
                      <AnimatedView animation="zoomIn" duration={600} style={styles.revealHandWrapper}>
                        <AnimatedIcon
                          animation="bounceInRight"
                          duration={700}
                          delay={100}
                          name={RPS_CHOICE_ICONS[teamBVote]?.icon ?? "help-circle"}
                          size={scaleWeb(52)}
                          color={TEAMS.B.color}
                        />
                        <Text style={styles.revealHand}>{RPS_CHOICE_ICONS[teamBVote]?.emoji ?? "?"}</Text>
                      </AnimatedView>
                    </LinearGradient>
                  </AnimatedView>
                </AnimatedView>
              ) : null}

              {stage === PLAY_STAGE.ANSWERING || stage === PLAY_STAGE.REBOUND ? (
                <View>
                  <View style={styles.answerHeadRow}>
                    <View style={[styles.answerTeamChip, { borderColor: TEAMS[answeringTeam]?.color ?? COLORS.primary }]}>
                      <Text style={[styles.answerTeamChipText, { color: TEAMS[answeringTeam]?.color ?? COLORS.primary }]}>
                        {TEAMS[answeringTeam]?.name ?? "Team"}
                      </Text>
                    </View>
                    {stage === PLAY_STAGE.REBOUND ? (
                      <View style={styles.voteBadge}>
                        <Text style={styles.voteBadgeText}>{stealTimer}s</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.questionCard}>
                    <Text style={styles.questionCardTitle}>{currentQuestion?.question}</Text>
                  </View>

                  {renderQuestionOptions(false)}
                </View>
              ) : null}
            </AnimatedView>
          ) : null}

          {gameHistory.length > 0 ? (
            <View style={styles.historyPanel}>
              <Text style={styles.historyTitle}>Battle History</Text>
              {gameHistory.slice(-4).map((entry, index) => (
                <View key={`${entry.round}-${index}`} style={styles.historyRow}>
                  <Text style={styles.historyRound}>Round {entry.round}</Text>
                  <Text style={styles.historyLine}>
                    {entry.teamAVote} vs {entry.teamBVote} • {entry.scoringTeam ? `${TEAMS[entry.scoringTeam].name} +1` : "No point"}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );

  const renderFinished = () => (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <LinearGradient colors={["#08111f", "#0f172a", "#111827"]} style={styles.gradientBg}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleLeaveGame}>
              <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.pageTitle}>Victory Screen</Text>
            </View>
            <View style={{ width: 28 }} />
          </View>

          <AnimatedView animation="zoomIn" duration={700} style={styles.finishPanel}>
            <MaterialCommunityIcons
              name={winnerTeam ? "trophy" : "handshake"}
              size={scaleWeb(84)}
              color={winnerTeam ? COLORS.warning : "#d1d5db"}
              style={styles.finishIcon}
            />
            <Text style={styles.finishTitle}>
              {winnerTeam ? `${TEAMS[winnerTeam].name} Wins!` : "Draw"}
            </Text>
            <Text style={styles.finishSubtitle}>
              {playerWon === null
                ? "Final scores are locked in."
                : playerWon
                ? "You backed the winning side."
                : "Your side missed the final point."}
            </Text>
          </AnimatedView>

          <View style={styles.finalScoreRow}>
            <View style={styles.finalScoreCard}>
              <Text style={styles.scoreLabel}>{TEAMS.A.name}</Text>
              <Text style={[styles.scoreValue, { color: TEAMS.A.color }]}>{teamAScore}</Text>
            </View>
            <View style={styles.finalScoreCard}>
              <Text style={styles.scoreLabel}>{TEAMS.B.name}</Text>
              <Text style={[styles.scoreValue, { color: TEAMS.B.color }]}>{teamBScore}</Text>
            </View>
          </View>

          <View style={styles.historyPanel}>
            <Text style={styles.historyTitle}>Battle History</Text>
            {gameHistory.map((entry) => (
              <View key={entry.round} style={styles.historyRow}>
                <Text style={styles.historyRound}>Round {entry.round}</Text>
                <Text style={styles.historyLine}>
                  {RPS_CHOICE_ICONS[entry.teamAVote]?.emoji ?? "?"} vs {RPS_CHOICE_ICONS[entry.teamBVote]?.emoji ?? "?"} • {entry.mode === "steal" ? "REBOUND" : entry.scoringTeam ? "SUCCESS" : "MISS"}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleLeaveGame} activeOpacity={0.9}>
            <LinearGradient colors={[COLORS.primary, "#1d4ed8"]} style={styles.buttonGradient}>
              <MaterialCommunityIcons name="home" size={20} color="#fff" />
              <Text style={styles.buttonText}>Return to Lobby</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );

  if (phase === PHASES.ROOM_SETUP) {
    return renderRoomSetup();
  }

  if (phase === PHASES.TEAM_SELECTION) {
    return renderTeamSelection();
  }

  if (phase === PHASES.GAME_RULES) {
    return renderRules();
  }

  if (phase === PHASES.PLAYING) {
    return renderGameplay();
  }

  if (phase === PHASES.FINISHED) {
    return renderFinished();
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  gradientBg: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Platform.OS === "web" ? 28 : 18,
    paddingVertical: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  pageTitle: {
    color: "#fff",
    fontSize: scaleWeb(28),
    fontWeight: "900",
    textAlign: "center",
  },
  pageSubtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: scaleWeb(12),
    marginTop: 4,
    textAlign: "center",
  },
  roomCode: {
    color: COLORS.primary,
    fontSize: scaleWeb(24),
    fontWeight: "900",
    letterSpacing: 3,
  },
  heroPanel: {
    backgroundColor: "rgba(17, 24, 39, 0.88)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    padding: 20,
    marginBottom: 18,
    overflow: "hidden",
  },
  heroTag: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  heroTitle: {
    color: "#fff",
    fontSize: scaleWeb(28),
    fontWeight: "900",
    lineHeight: 34,
    marginBottom: 8,
  },
  heroText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: scaleWeb(14),
    lineHeight: 22,
    maxWidth: 620,
  },
  heroIcon: {
    alignSelf: "flex-end",
    opacity: 0.8,
    marginTop: -8,
  },
  cardPanel: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    padding: 18,
    marginBottom: 16,
  },
  cardTag: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  cardTitle: {
    color: "#fff",
    fontSize: scaleWeb(22),
    fontWeight: "900",
    marginBottom: 6,
  },
  cardDescription: {
    color: "rgba(255,255,255,0.7)",
    fontSize: scaleWeb(14),
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  secondaryButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 12,
  },
  launchButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.55,
  },
  buttonGradient: {
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: scaleWeb(16),
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  roomInput: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 14,
    color: "#fff",
    fontSize: 16,
    letterSpacing: 2,
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlign: "center",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 8,
  },
  sectionHeader: {
    color: "#fff",
    fontSize: scaleWeb(18),
    fontWeight: "900",
    marginBottom: 14,
    textAlign: "center",
  },
  teamCard: {
    marginBottom: 14,
    borderRadius: 20,
    overflow: "hidden",
  },
  teamGradient: {
    padding: 18,
    alignItems: "center",
    minHeight: 240,
  },
  teamName: {
    color: "#fff",
    fontSize: scaleWeb(22),
    fontWeight: "900",
    marginTop: 10,
  },
  teamCount: {
    color: "rgba(255,255,255,0.78)",
    marginTop: 2,
    marginBottom: 10,
  },
  playerList: {
    width: "100%",
    minHeight: 80,
    marginBottom: 14,
    paddingHorizontal: 6,
  },
  playerName: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    marginVertical: 2,
  },
  teamButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  teamButtonSelected: {
    backgroundColor: "rgba(255,255,255,0.24)",
    borderColor: "#fff",
  },
  teamButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
  rulesPanel: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    padding: 18,
    marginBottom: 16,
  },
  rulesText: {
    color: "#fff",
    fontSize: scaleWeb(14),
    lineHeight: 22,
    marginBottom: 14,
  },
  highlightRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251,191,36,0.08)",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  highlightText: {
    color: COLORS.warning,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  scoreBoard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  scoreTile: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.92)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    paddingVertical: 14,
    alignItems: "center",
  },
  roundTile: {
    width: 84,
    backgroundColor: "rgba(15,23,42,0.92)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    paddingVertical: 12,
    alignItems: "center",
  },
  scoreLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: scaleWeb(34),
    fontWeight: "900",
    lineHeight: 38,
  },
  roundLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  roundValue: {
    color: "#fff",
    fontSize: scaleWeb(28),
    fontWeight: "900",
    marginTop: 2,
  },
  flashBanner: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(17,24,39,0.85)",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 14,
  },
  flashText: {
    color: COLORS.warning,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  storyPanel: {
    backgroundColor: "rgba(15,23,42,0.96)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    padding: 16,
    marginBottom: 14,
  },
  storyTitle: {
    color: "#fff",
    fontSize: scaleWeb(24),
    fontWeight: "900",
    lineHeight: 30,
    marginBottom: 6,
  },
  storySubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: scaleWeb(13),
    marginBottom: 16,
  },
  questionArtPanel: {
    borderRadius: 18,
    backgroundColor: "rgba(30,41,59,0.86)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
  },
  questionText: {
    marginTop: 14,
    color: "#fff",
    textAlign: "center",
    fontSize: scaleWeb(20),
    fontWeight: "900",
    lineHeight: 28,
  },
  voteHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  voteBadge: {
    backgroundColor: COLORS.warning,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  voteBadgeText: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 15,
  },
  voteCaption: {
    color: "rgba(255,255,255,0.7)",
    flex: 1,
    textAlign: "right",
    fontSize: 13,
  },
  teamGrid: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    gap: 12,
  },
  teamSceneCard: {
    flex: 1,
    minHeight: 170,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "rgba(15,23,42,0.92)",
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  teamSceneName: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 8,
  },
  meterWrap: {
    width: "100%",
    marginTop: 12,
    gap: 8,
  },
  meterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  meterLabel: {
    width: 72,
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
  },
  meterTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  meterFill: {
    height: 10,
    borderRadius: 999,
  },
  meterCount: {
    color: "#fff",
    width: 18,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "900",
  },
  revealRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  revealCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 170,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "rgba(15,23,42,0.92)",
    padding: 14,
  },
  revealTeamLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10,
  },
  revealHand: {
    color: "#fff",
    fontSize: scaleWeb(36),
    fontWeight: "900",
    marginTop: 10,
  },
  vsBadge: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: COLORS.warning,
    alignItems: "center",
    justifyContent: "center",
  },
  vsText: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 18,
  },
  answerHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  answerTeamChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  answerTeamChipText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  questionCard: {
    borderRadius: 18,
    backgroundColor: "rgba(30,41,59,0.92)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    padding: 16,
    marginBottom: 12,
  },
  questionCardTitle: {
    color: "#fff",
    fontSize: scaleWeb(18),
    fontWeight: "900",
    lineHeight: 26,
  },
  optionsGrid: {
    gap: 10,
  },
  optionButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    backgroundColor: "rgba(15,23,42,0.96)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionSelected: {
    borderColor: COLORS.warning,
    backgroundColor: "rgba(251,191,36,0.12)",
  },
  optionCorrect: {
    borderColor: COLORS.success,
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  optionLabel: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: "#fff",
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "900",
    paddingTop: 5,
  },
  optionText: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  historyPanel: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    padding: 16,
    marginBottom: 14,
  },
  historyTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },
  historyRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 10,
    marginTop: 10,
  },
  historyRound: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  historyLine: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 18,
  },
  finishPanel: {
    borderRadius: 24,
    backgroundColor: "rgba(15,23,42,0.96)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
  },
  finishIcon: {
    marginBottom: 12,
  },
  finishTitle: {
    color: "#fff",
    fontSize: scaleWeb(28),
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 6,
  },
  finishSubtitle: {
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    fontSize: scaleWeb(14),
    lineHeight: 22,
  },
  finalScoreRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  finalScoreCard: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.92)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    paddingVertical: 18,
    alignItems: "center",
  },
  handSelectionContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  handSelectionPrompt: {
    color: "#fff",
    fontSize: scaleWeb(16),
    fontWeight: "700",
    marginBottom: 14,
    textAlign: "center",
  },
  handButtonRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginBottom: 14,
  },
  handButton: {
    minWidth: 90,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(15,23,42,0.92)",
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  handButtonSelected: {
    borderColor: COLORS.warning,
    backgroundColor: "rgba(251,191,36,0.18)",
  },
  handEmoji: {
    fontSize: scaleWeb(48),
    marginBottom: 6,
  },
  handLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  teamIndicator: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontStyle: "italic",
  },
  votingContainer: {
    marginTop: 8,
    marginBottom: 14,
  },
  teamsVotingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  teamVotingCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    overflow: "hidden",
  },
  teamVotingGradient: {
    padding: 16,
    minHeight: 280,
  },
  teamVotingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 2,
    paddingBottom: 12,
    marginBottom: 16,
  },
  teamVotingName: {
    fontSize: scaleWeb(18),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  handButtonGrid: {
    gap: 10,
    marginBottom: 12,
  },
  handGridItem: {
    width: "100%",
  },
  handGridButton: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
    flexDirection: "row",
    gap: 10,
  },
  handGridButtonSelected: {
    borderColor: COLORS.warning,
    backgroundColor: "rgba(251,191,36,0.2)",
  },
  handGridEmoji: {
    fontSize: scaleWeb(28),
  },
  handGridLabel: {
    color: "#fff",
    fontSize: scaleWeb(14),
    fontWeight: "700",
    flex: 1,
    textAlign: "left",
  },
  playerIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(34,197,94,0.15)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  playerIndicatorText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "700",
  },
  vsBadgeVoting: {
    width: 50,
    height: 50,
    borderRadius: 999,
    backgroundColor: COLORS.warning,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  vsTextVoting: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  revealCardGradient: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 170,
    borderRadius: 18,
  },
  revealHandWrapper: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});