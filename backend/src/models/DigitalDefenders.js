import mongoose from "mongoose";

// Question Card Schema for MongoDB storage
const digitalDefendersQuestionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    correctAnswer: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    difficulty: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    wave: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: false, // Make section optional for global questions
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Answer Card Schema for MongoDB storage
const digitalDefendersAnswerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: null,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DigitalDefendersQuestion",
      default: null, // Optional for backwards compatibility
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: false, // Make section optional for global answers
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Game Statistics Schema
const digitalDefendersStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },
    gamesPlayed: {
      type: Number,
      default: 0,
    },
    gamesWon: {
      type: Number,
      default: 0,
    },
    totalWavesCompleted: {
      type: Number,
      default: 0,
    },
    highestWaveReached: {
      type: Number,
      default: 0,
    },
    totalCardsPlayed: {
      type: Number,
      default: 0,
    },
    totalCorrectAnswers: {
      type: Number,
      default: 0,
    },
    bestCompletionTime: {
      type: Number,
      default: null, // in seconds
    },
    lastPlayed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Predefined Tool Cards (non-editable)
const TOOL_CARDS = [
  {
    id: "tool_overclock",
    name: "Overclock",
    description: "Reset countdown to 30",
    type: "tool",
    effect: "reset_countdown",
    image: null,
  },
  {
    id: "tool_slow_down",
    name: "Slow Down",
    description: "Freeze countdown for next 2 turns",
    type: "tool",
    effect: "freeze_countdown",
    image: null,
  },
  {
    id: "tool_super_shuffle",
    name: "Super Shuffle",
    description: "Shuffle all players' cards",
    type: "tool",
    effect: "super_shuffle",
    image: null,
  },
  {
    id: "tool_heal",
    name: "Heal",
    description: "Regain 2 PC HP",
    type: "tool",
    effect: "heal",
    image: null,
  },
  {
    id: "tool_pass",
    name: "Pass",
    description: "Skip current question (card and question removed)",
    type: "tool",
    effect: "pass_question",
    image: null,
  },
];

// Digital Defenders Game Class for multiplayer real-time game logic
class DigitalDefendersGame {
  constructor(roomId, creatorSocketId, creatorName, maxPlayers = 4) {
    this.roomId = roomId;
    this.creatorSocketId = creatorSocketId;
    this.maxPlayers = maxPlayers;
    this.gameState = "lobby"; // lobby, turnOrder, playing, gameOver, victory
    this.currentWave = 1;
    this.pcHealth = 5;
    this.countdown = 30;
    this.currentTurn = 0;
    this.questionsForWaves = []; // Array of question objects for each wave
    this.answersFromDatabase = []; // Array of answer cards loaded from database
    this.currentQuestion = null;
    this.currentQuestionIndex = 0;
    this.freezeCountdown = 0;

    // Players management
    this.players = new Map(); // socketId -> player object
    this.playerOrder = []; // Array of socketIds for turn order
    this.playersReady = new Set(); // Set of socketIds that are ready for turn order

    // Turn order selection
    this.turnOrderSelections = new Map(); // socketId -> selectedTurnPosition (1-based)
    this.turnOrderLocked = false; // Prevents changes during selection resolution

    // Cards management
    this.deck = []; // Shared deck for all players
    this.usedCards = []; // Cards that have been permanently discarded
    this.playerHands = new Map(); // socketId -> array of 3 cards
    this.playerActionsLeft = new Map(); // socketId -> number of actions left

    // Game timing
    this.gameStartTime = null;
    this.turnStartTime = null;

    // Add creator to players
    this.addPlayer(creatorSocketId, creatorName, true);
  }

  addPlayer(socketId, playerName, isCreator = false) {
    if (this.players.size >= this.maxPlayers) {
      return { success: false, message: "Room is full" };
    }

    if (this.gameState !== "lobby") {
      return { success: false, message: "Game already in progress" };
    }

    const player = {
      socketId,
      name: playerName,
      isCreator,
      isReady: false,
      cardsInHand: [],
      actionsLeft: 2,
    };

    this.players.set(socketId, player);

    return {
      success: true,
      player,
      playerId: socketId,
    };
  }

  removePlayer(socketId) {
    if (this.players.has(socketId)) {
      this.players.delete(socketId);
      this.playerHands.delete(socketId);
      this.playerActionsLeft.delete(socketId);

      // Remove from player order if present
      this.playerOrder = this.playerOrder.filter((id) => id !== socketId);
      this.playersReady.delete(socketId);

      // If creator left, assign new creator
      if (socketId === this.creatorSocketId && this.players.size > 0) {
        const newCreator = this.players.keys().next().value;
        this.creatorSocketId = newCreator;
        this.players.get(newCreator).isCreator = true;
      }

      return { success: true };
    }
    return { success: false, message: "Player not found" };
  }

  isCreator(socketId) {
    return socketId === this.creatorSocketId;
  }

  canStartGame() {
    return this.players.size >= 2 && this.gameState === "lobby";
  }

  canStartTurnOrderSelection() {
    return this.players.size >= 2 && this.gameState === "lobby";
  }

  startTurnOrderSelection() {
    if (!this.canStartTurnOrderSelection()) {
      return { success: false, message: "Cannot start turn order selection" };
    }

    this.gameState = "turnOrder";
    this.turnOrderSelections.clear();
    this.playersReady.clear();
    this.turnOrderLocked = false;

    return { success: true };
  }

  selectTurnOrder(socketId, selectedPosition) {
    if (this.gameState !== "turnOrder") {
      return { success: false, message: "Not in turn order selection phase" };
    }

    if (this.turnOrderLocked) {
      return {
        success: false,
        message: "Turn order selection is being processed",
      };
    }

    if (!this.players.has(socketId)) {
      return { success: false, message: "Player not found" };
    }

    // Validate position (1-based, within range)
    if (selectedPosition < 1 || selectedPosition > this.players.size) {
      return {
        success: false,
        message: `Position must be between 1 and ${this.players.size}`,
      };
    }

    // Check if position is already taken by another player
    for (const [playerId, position] of this.turnOrderSelections) {
      if (playerId !== socketId && position === selectedPosition) {
        return {
          success: false,
          message: `Position ${selectedPosition} is already taken`,
        };
      }
    }

    this.turnOrderSelections.set(socketId, selectedPosition);
    this.playersReady.add(socketId);

    return {
      success: true,
      selectedPosition,
      readyPlayers: this.playersReady.size,
      totalPlayers: this.players.size,
    };
  }

  allPlayersSelectedTurnOrder() {
    return this.playersReady.size === this.players.size;
  }

  finalizeTurnOrder() {
    if (!this.allPlayersSelectedTurnOrder()) {
      return {
        success: false,
        message: "Not all players have selected their turn order",
      };
    }

    // Lock to prevent race conditions
    this.turnOrderLocked = true;

    // Create an array of [socketId, position] pairs and sort by position
    const sortedSelections = Array.from(
      this.turnOrderSelections.entries()
    ).sort((a, b) => a[1] - b[1]); // Sort by position (second element)

    // Extract socketIds in turn order
    this.playerOrder = sortedSelections.map(([socketId]) => socketId);

    // Clear temporary selection data
    this.turnOrderSelections.clear();
    this.playersReady.clear();
    this.turnOrderLocked = false;

    return {
      success: true,
      playerOrder: this.playerOrder.map((id) => ({
        socketId: id,
        playerName: this.players.get(id)?.name,
      })),
    };
  }

  canInitializeGame() {
    return (
      this.players.size >= 2 &&
      this.gameState === "turnOrder" &&
      this.playerOrder.length === this.players.size
    );
  }

  async loadQuestions() {
    try {
      // Load global questions first (no section restriction)
      let questions = await DigitalDefendersQuestion.find({
        section: null, // Global questions only
        isActive: true,
      }).lean();

      // If no global questions exist, try to auto-seed them
      if (!questions || questions.length === 0) {
        console.log("🌱 No global questions found, attempting to auto-seed...");
        try {
          // Import and run the seeding function
          const { seedGlobalQuestions } = await import(
            "../scripts/seed-global-questions.js"
          );

          // Note: We need to avoid infinite recursion in seeding
          // This is a simple check to prevent that
          const mongoose = await import("mongoose");
          if (mongoose.default.connection.readyState === 1) {
            await seedGlobalQuestions();

            // Re-fetch the newly created questions
            questions = await DigitalDefendersQuestion.find({
              section: null,
              isActive: true,
            }).lean();

            console.log(
              `✅ Auto-seeded and loaded ${questions.length} global questions`
            );
          }
        } catch (seedError) {
          console.error("❌ Error auto-seeding questions:", seedError);
        }
      }

      if (questions && questions.length > 0) {
        // Use database questions and organize by wave
        this.questionsForWaves = questions.map((q) => ({
          id: q._id.toString(),
          text: q.text,
          correctAnswer: q.correctAnswer,
          difficulty: q.difficulty,
          wave: q.wave || 1,
          image: q.image,
        }));

        console.log(
          `✅ Loaded ${questions.length} global questions from database for Digital Defenders`
        );

        // Log wave distribution for debugging
        for (let wave = 1; wave <= 10; wave++) {
          const waveQuestions = this.questionsForWaves.filter(
            (q) => q.wave === wave
          );
          console.log(`🌊 Wave ${wave}: ${waveQuestions.length} questions`);
        }
      } else {
        // Final fallback to default questions if everything else fails
        console.log(
          "⚠️ No global questions found even after seeding attempt, using hardcoded default questions for Digital Defenders"
        );
        this.questionsForWaves = this.generateDefaultQuestions();
      }
    } catch (error) {
      console.error("❌ Error loading questions from database:", error);
      // Fallback to default questions on error
      this.questionsForWaves = this.generateDefaultQuestions();
    }
  }

  async loadAnswers() {
    try {
      // Load global answer cards from database (section = null)
      let answers = await DigitalDefendersAnswer.find({
        section: null, // Global answers only
        isActive: true,
      }).lean();

      if (answers && answers.length > 0) {
        // Use database answers
        this.answersFromDatabase = answers.map((a) => ({
          id: a._id.toString(),
          text: a.text,
          name: a.name,
          description: a.description,
          type: "answer",
          questionId: a.questionId ? a.questionId.toString() : null,
        }));

        console.log(
          `✅ Loaded ${answers.length} global answer cards from database for Digital Defenders`
        );
      } else {
        // Fallback to empty array - will use defaults
        console.log(
          "⚠️ No global answer cards found in database, will use default answers for Digital Defenders"
        );
        this.answersFromDatabase = [];
      }
    } catch (error) {
      console.error("❌ Error loading answers from database:", error);
      // Fallback to empty array
      this.answersFromDatabase = [];
    }
  }

  generateDefaultQuestions() {
    const defaultQuestions = [
      {
        id: 1,
        text: "What does HTTP stand for?",
        correctAnswer: "HyperText Transfer Protocol",
        wave: 1,
      },
      {
        id: 2,
        text: "What port does HTTPS typically use?",
        correctAnswer: "443",
        wave: 1,
      },
      {
        id: 3,
        text: "What does SQL stand for?",
        correctAnswer: "Structured Query Language",
        wave: 2,
      },
      {
        id: 4,
        text: "What is the most common web server software?",
        correctAnswer: "Apache",
        wave: 2,
      },
      {
        id: 5,
        text: "What does API stand for?",
        correctAnswer: "Application Programming Interface",
        wave: 3,
      },
      {
        id: 6,
        text: "What is the default port for SSH?",
        correctAnswer: "22",
        wave: 3,
      },
      {
        id: 7,
        text: "What does DNS stand for?",
        correctAnswer: "Domain Name System",
        wave: 4,
      },
      {
        id: 8,
        text: "What is the most secure encryption algorithm?",
        correctAnswer: "AES",
        wave: 4,
      },
      {
        id: 9,
        text: "What does VPN stand for?",
        correctAnswer: "Virtual Private Network",
        wave: 5,
      },
      {
        id: 10,
        text: "What is a common SQL injection prevention method?",
        correctAnswer: "Parameterized Queries",
        wave: 5,
      },
    ];

    return defaultQuestions.map((q, index) => ({
      ...q,
      id: `question_${index + 1}`,
    }));
  }

  generateDefaultAnswers() {
    return [
      {
        id: "answer_1",
        name: "HTTP Answer",
        text: "HyperText Transfer Protocol",
        type: "answer",
      },
      { id: "answer_2", name: "Port 443", text: "443", type: "answer" },
      {
        id: "answer_3",
        name: "SQL Answer",
        text: "Structured Query Language",
        type: "answer",
      },
      { id: "answer_4", name: "Apache Server", text: "Apache", type: "answer" },
      {
        id: "answer_5",
        name: "API Answer",
        text: "Application Programming Interface",
        type: "answer",
      },
      { id: "answer_6", name: "SSH Port", text: "22", type: "answer" },
      {
        id: "answer_7",
        name: "DNS Answer",
        text: "Domain Name System",
        type: "answer",
      },
      { id: "answer_8", name: "AES Encryption", text: "AES", type: "answer" },
      {
        id: "answer_9",
        name: "VPN Answer",
        text: "Virtual Private Network",
        type: "answer",
      },
      {
        id: "answer_10",
        name: "SQL Prevention",
        text: "Parameterized Queries",
        type: "answer",
      },
    ];
  }

  generateGameDeck() {
    // Create a strategic deck that includes answer cards for all waves
    // Prioritize current wave, but include answers for all waves

    let deckAnswers = [];

    // First, try to use answer cards from database
    if (this.answersFromDatabase && this.answersFromDatabase.length > 0) {
      deckAnswers = [...this.answersFromDatabase];
      console.log(`🎴 Using ${deckAnswers.length} answer cards from database`);
    }

    // If we don't have enough answer cards from database, supplement with default answers
    if (deckAnswers.length < 12) {
      // Increased from 10 to 12 for more answer cards
      const defaultAnswers = this.generateDefaultAnswers();

      // Add default answers that are not already present (by text comparison)
      for (const defaultAnswer of defaultAnswers) {
        const alreadyExists = deckAnswers.some(
          (existing) =>
            existing.text.toLowerCase().trim() ===
            defaultAnswer.text.toLowerCase().trim()
        );

        if (!alreadyExists) {
          deckAnswers.push(defaultAnswer);
        }

        // Stop when we have 12 answer cards total
        if (deckAnswers.length >= 12) break;
      }

      console.log(
        `🎴 Supplemented with default answers, total: ${deckAnswers.length} answer cards`
      );
    }

    // Ensure we have at least some answer cards that can answer current wave questions
    this.ensureWaveAnswersInDeck(deckAnswers);

    // Add multiple copies of answer cards for early waves to increase chances
    this.addDuplicateAnswerCards(deckAnswers);

    return deckAnswers.slice(0, 12); // Limit to 12 answer cards total (increased from 10)
  }

  addDuplicateAnswerCards(deckAnswers) {
    // Add duplicate copies of answer cards for waves 1-3 to increase winning chances
    const earlyWaveQuestions = this.questionsForWaves.filter(
      (q) => q.wave <= 3
    );
    const maxDuplicates = 3; // Maximum number of duplicate cards to add
    let duplicatesAdded = 0;

    for (const question of earlyWaveQuestions) {
      if (duplicatesAdded >= maxDuplicates) break;

      // Find matching answer card in the deck
      const matchingAnswer = deckAnswers.find(
        (answer) =>
          answer.text.toLowerCase().trim() ===
          question.correctAnswer.toLowerCase().trim()
      );

      if (matchingAnswer) {
        // Create a duplicate with a different ID
        const duplicateCard = {
          ...matchingAnswer,
          id: `${matchingAnswer.id}_duplicate_${duplicatesAdded + 1}`,
          name: `${matchingAnswer.name} (Backup)`,
        };

        deckAnswers.push(duplicateCard);
        duplicatesAdded++;
        console.log(
          `🎯 Added duplicate answer card for better chances: "${question.correctAnswer}"`
        );
      }
    }

    console.log(`🎯 Total duplicate answer cards added: ${duplicatesAdded}`);
  }

  ensureWaveAnswersInDeck(deckAnswers) {
    // Get questions for first 7 waves (increased from 5 to cover more waves)
    const earlyWaveQuestions = this.questionsForWaves.filter(
      (q) => q.wave <= 7
    );
    let addedCards = 0;
    const maxAdditions = 8; // Increased from 5 to allow more additions

    // Prioritize waves 1-5 for guaranteed coverage
    for (let wave = 1; wave <= 5; wave++) {
      const waveQuestions = earlyWaveQuestions.filter((q) => q.wave === wave);

      for (const question of waveQuestions) {
        if (addedCards >= maxAdditions) break;

        const hasMatchingAnswer = deckAnswers.some(
          (answer) =>
            answer.text.toLowerCase().trim() ===
            question.correctAnswer.toLowerCase().trim()
        );

        if (!hasMatchingAnswer) {
          // Create an answer card for this question if missing
          const newAnswer = {
            id: `generated_${question.id}`,
            name: `Answer for Wave ${question.wave}`,
            text: question.correctAnswer,
            type: "answer",
            questionId: question.id,
          };

          // Replace a default answer card to maintain deck size
          if (deckAnswers.length >= 12) {
            // Updated to match new deck size
            // Find and replace a default answer that doesn't match any question
            let replaceIndex = -1;
            for (let i = 0; i < deckAnswers.length; i++) {
              const cardMatches = this.questionsForWaves.some(
                (q) =>
                  q.correctAnswer.toLowerCase().trim() ===
                  deckAnswers[i].text.toLowerCase().trim()
              );
              if (!cardMatches) {
                replaceIndex = i;
                break;
              }
            }

            // If no unused card found, replace a random one
            if (replaceIndex === -1) {
              replaceIndex = Math.floor(Math.random() * deckAnswers.length);
            }

            deckAnswers[replaceIndex] = newAnswer;
          } else {
            deckAnswers.push(newAnswer);
          }

          addedCards++;
          console.log(
            `🎯 Added missing answer card for wave ${question.wave}: "${question.correctAnswer}"`
          );
        }
      }
    }

    // Add some answers for waves 6-7 if we have room
    if (addedCards < maxAdditions) {
      const laterWaveQuestions = earlyWaveQuestions.filter(
        (q) => q.wave >= 6 && q.wave <= 7
      );

      for (const question of laterWaveQuestions) {
        if (addedCards >= maxAdditions) break;

        const hasMatchingAnswer = deckAnswers.some(
          (answer) =>
            answer.text.toLowerCase().trim() ===
            question.correctAnswer.toLowerCase().trim()
        );

        if (!hasMatchingAnswer) {
          const newAnswer = {
            id: `generated_${question.id}`,
            name: `Answer for Wave ${question.wave}`,
            text: question.correctAnswer,
            type: "answer",
            questionId: question.id,
          };

          // Replace an unused default answer
          let replaceIndex = -1;
          for (let i = 0; i < deckAnswers.length; i++) {
            const cardMatches = this.questionsForWaves.some(
              (q) =>
                q.correctAnswer.toLowerCase().trim() ===
                deckAnswers[i].text.toLowerCase().trim()
            );
            if (!cardMatches) {
              replaceIndex = i;
              break;
            }
          }

          if (replaceIndex !== -1) {
            deckAnswers[replaceIndex] = newAnswer;
            addedCards++;
            console.log(
              `🎯 Added missing answer card for wave ${question.wave}: "${question.correctAnswer}"`
            );
          }
        }
      }
    }

    if (addedCards > 0) {
      console.log(
        `🎯 Total answer cards ensured for early waves: ${addedCards}`
      );
    }
  }

  refreshDeckForNewWave(newWave) {
    // Get questions for the new wave
    const newWaveQuestions = this.questionsForWaves.filter(
      (q) => q.wave === newWave
    );
    let addedCards = 0;

    // Check if we need to add answer cards for the new wave to the deck
    for (const question of newWaveQuestions) {
      const hasMatchingAnswer = this.deck.some(
        (card) =>
          card.type === "answer" &&
          card.text.toLowerCase().trim() ===
            question.correctAnswer.toLowerCase().trim()
      );

      if (!hasMatchingAnswer && addedCards < 5) {
        // Increased from 3 to 5 new cards per wave
        // Create an answer card for this question and add it to the deck
        const newAnswer = {
          id: `wave_${newWave}_${question.id}`,
          name: `Answer for Wave ${newWave}`,
          text: question.correctAnswer,
          type: "answer",
          questionId: question.id,
        };

        this.deck.push(newAnswer);
        addedCards++;
        console.log(
          `🎯 Added answer card to deck for wave ${newWave}: "${question.correctAnswer}"`
        );

        // Add a second copy of the same answer card for better chances
        if (addedCards < 5) {
          const duplicateAnswer = {
            ...newAnswer,
            id: `${newAnswer.id}_duplicate`,
            name: `${newAnswer.name} (Extra)`,
          };
          this.deck.push(duplicateAnswer);
          addedCards++;
          console.log(
            `🎯 Added duplicate answer card to deck for wave ${newWave}: "${question.correctAnswer}"`
          );
        }
      }
    }

    // Shuffle deck to distribute new cards
    this.shuffleDeck();

    console.log(
      `🔄 Refreshed deck for wave ${newWave}, added ${addedCards} answer cards, deck now has ${this.deck.length} cards`
    );
  }

  async initializeGame() {
    if (!this.canInitializeGame()) {
      return {
        success: false,
        message: "Cannot start game - turn order not set",
      };
    }

    this.gameState = "playing";
    this.gameStartTime = Date.now();
    this.currentWave = 1;
    this.pcHealth = 5;
    this.countdown = 30;
    this.currentTurn = 0;
    this.freezeCountdown = 0;

    // Load questions and answers from database
    await this.loadQuestions();
    await this.loadAnswers();

    // Player order should already be set from turn order selection
    // this.playerOrder = Array.from(this.players.keys()); // Removed

    // Initialize deck with answer cards + tool cards
    const answerCards = this.generateGameDeck();
    // Reduce tool cards from 5 to 3 to give more space for answer cards
    const toolCards = TOOL_CARDS.slice(0, 3).map((card) => ({ ...card }));
    this.deck = [...answerCards, ...toolCards];
    this.shuffleDeck();

    // Deal initial hands (3 cards each)
    this.playerHands.clear();
    this.playerActionsLeft.clear();

    for (const socketId of this.playerOrder) {
      this.dealInitialHand(socketId);
      this.playerActionsLeft.set(socketId, 2);
    }

    // Set first question
    this.setCurrentQuestion();

    return { success: true };
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  dealInitialHand(socketId) {
    const targetHandSize = 3; // Always deal exactly 3 cards

    // First, try to deal one answer card to increase chances
    let guaranteedAnswerCard = null;

    // Look for an answer card that matches early wave questions (waves 1-3)
    const earlyWaveQuestions = this.questionsForWaves.filter(
      (q) => q.wave <= 3
    );

    for (const question of earlyWaveQuestions) {
      const answerIndex = this.deck.findIndex(
        (card) =>
          card.type === "answer" &&
          card.text.toLowerCase().trim() ===
            question.correctAnswer.toLowerCase().trim()
      );

      if (answerIndex !== -1) {
        guaranteedAnswerCard = this.deck.splice(answerIndex, 1)[0];
        console.log(
          `🎯 Guaranteed answer card in initial hand for ${
            this.players.get(socketId)?.name
          }: "${guaranteedAnswerCard.text}"`
        );
        break;
      }
    }

    // Deal remaining cards - always ensure we have exactly 3 cards total
    const remainingSlots = guaranteedAnswerCard
      ? targetHandSize - 1
      : targetHandSize;

    // Ensure we have enough cards in deck
    while (this.deck.length < remainingSlots) {
      // If deck is running low, add more cards
      const availableAnswerCards = this.generateGameDeck().slice(0, 5);
      const availableToolCards = TOOL_CARDS.slice(0, 2);
      this.deck.push(...availableAnswerCards, ...availableToolCards);
      this.shuffleDeck();
      console.log(
        `🔄 Replenished deck for initial hand - now has ${this.deck.length} cards`
      );
    }

    const hand = this.deck.splice(0, remainingSlots);

    // Add guaranteed answer card if found
    if (guaranteedAnswerCard) {
      hand.push(guaranteedAnswerCard);

      // Shuffle the hand so the answer isn't always in the same position
      for (let i = hand.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [hand[i], hand[j]] = [hand[j], hand[i]];
      }
    }

    // Ensure the hand is exactly 3 cards
    if (hand.length !== targetHandSize) {
      console.log(
        `⚠️ Initial hand size mismatch: expected ${targetHandSize}, got ${hand.length}`
      );
    }

    this.playerHands.set(socketId, hand);
  }

  drawCard(socketId) {
    // Ensure we have cards available in the deck
    if (this.deck.length === 0) {
      // Replenish deck when empty
      const availableAnswerCards = this.generateGameDeck().slice(0, 8); // Get 8 answer cards
      const availableToolCards = TOOL_CARDS.slice(0, 3); // Get 3 tool cards
      this.deck.push(...availableAnswerCards, ...availableToolCards);
      this.shuffleDeck();
      console.log(
        `🔄 Deck was empty, replenished with ${this.deck.length} cards`
      );
    }

    if (this.deck.length === 0) {
      console.log("⚠️ Unable to replenish deck - no cards available");
      return null;
    }

    const card = this.deck.shift();
    const hand = this.playerHands.get(socketId) || [];
    hand.push(card);
    this.playerHands.set(socketId, hand);

    return card;
  }

  setCurrentQuestion() {
    // Get questions for ONLY the current wave (not cumulative)
    const questionsForCurrentWave = this.questionsForWaves.filter(
      (q) => q.wave === this.currentWave
    );

    if (questionsForCurrentWave.length > this.currentQuestionIndex) {
      this.currentQuestion = questionsForCurrentWave[this.currentQuestionIndex];
    } else {
      // Current wave complete, check for next wave
      if (this.currentWave >= 10) {
        this.gameState = "victory";
        return;
      }

      // Check if next wave has questions
      const nextWave = this.currentWave + 1;
      const nextWaveQuestions = this.questionsForWaves.filter(
        (q) => q.wave === nextWave
      );

      if (nextWaveQuestions.length > 0) {
        // Advance to next wave
        this.currentWave = nextWave;
        this.currentQuestionIndex = 0;
        this.countdown = Math.max(20, 30 - this.currentWave); // Decrease countdown for higher waves

        // Refresh deck to ensure answer cards for the new wave are available
        this.refreshDeckForNewWave(nextWave);

        this.setCurrentQuestion();
        return { waveAdvanced: true, newWave: this.currentWave };
      } else {
        // No more waves with questions, victory!
        this.gameState = "victory";
        return;
      }
    }

    return { waveAdvanced: false };
  }

  playCard(socketId, cardId, targetQuestionId = null) {
    if (this.gameState !== "playing") {
      return { success: false, message: "Game not in playing state" };
    }

    if (!this.isPlayerTurn(socketId)) {
      return { success: false, message: "Not your turn" };
    }

    if (this.getPlayerActionsLeft(socketId) <= 0) {
      return { success: false, message: "No actions left" };
    }

    const hand = this.playerHands.get(socketId) || [];
    const cardIndex = hand.findIndex((card) => card.id === cardId);

    if (cardIndex === -1) {
      return { success: false, message: "Card not in hand" };
    }

    const card = hand[cardIndex];

    // Remove card from hand and add to used cards
    hand.splice(cardIndex, 1);
    this.usedCards.push(card);
    this.playerHands.set(socketId, hand);

    // Use one action
    this.usePlayerAction(socketId);

    // Apply card effect
    const result = this.applyCardEffect(card, socketId);

    // Draw replacement card if deck has cards
    if (this.deck.length > 0) {
      this.drawCard(socketId);
    }

    // Check if game should end due to no cards remaining
    const gameEndCheck = this.checkNoCardsGameEnd();

    return {
      success: true,
      card,
      effect: result,
      actionsLeft: this.getPlayerActionsLeft(socketId),
      gameEndCheck: gameEndCheck,
    };
  }

  applyCardEffect(card, socketId) {
    if (card.type === "answer") {
      return this.tryAnswerQuestion(card);
    } else if (card.type === "tool") {
      return this.applyToolEffect(card, socketId);
    }

    return { success: false, message: "Unknown card type" };
  }

  tryAnswerQuestion(answerCard) {
    if (!this.currentQuestion) {
      return { success: false, message: "No current question" };
    }

    // Check if answer matches (case-insensitive)
    const answerMatches =
      answerCard.text.toLowerCase().trim() ===
      this.currentQuestion.correctAnswer.toLowerCase().trim();

    if (answerMatches) {
      // Correct answer - move to next question
      this.currentQuestionIndex++;
      const questionResult = this.setCurrentQuestion();
      this.countdown = Math.max(20, 30 - this.currentWave); // Reset countdown

      return {
        success: true,
        message: "Correct answer!",
        questionSolved: true,
        nextQuestion: this.currentQuestion,
        waveAdvanced: questionResult?.waveAdvanced || false,
        newWave: questionResult?.newWave,
      };
    } else {
      // Wrong answer - reduce health
      this.pcHealth--;

      // Check if game over due to health depletion
      if (this.pcHealth <= 0) {
        this.gameState = "gameOver";
        return {
          success: true,
          message: `Wrong answer! Health depleted. Game Over!`,
          questionSolved: false,
          healthLost: true,
          gameOver: true,
          currentHealth: this.pcHealth,
        };
      }

      return {
        success: true,
        message: `Wrong answer! Lost 1 health. Health: ${this.pcHealth}/5`,
        questionSolved: false,
        healthLost: true,
        currentHealth: this.pcHealth,
      };
    }
  }

  applyToolEffect(toolCard, socketId) {
    switch (toolCard.effect) {
      case "reset_countdown":
        this.countdown = 30;
        return {
          success: true,
          message: "Countdown reset to 30!",
          effect: "countdown_reset",
        };

      case "freeze_countdown":
        this.freezeCountdown = 2;
        return {
          success: true,
          message: "Countdown frozen for 2 turns!",
          effect: "countdown_frozen",
        };

      case "super_shuffle":
        this.shuffleAllPlayerHands();
        return {
          success: true,
          message: "All players' hands shuffled!",
          effect: "hands_shuffled",
        };

      case "heal":
        this.pcHealth = Math.min(5, this.pcHealth + 2);
        return {
          success: true,
          message: `Healed 2 HP! Current: ${this.pcHealth}/5`,
          effect: "healed",
        };

      case "pass_question":
        this.currentQuestionIndex++;
        this.setCurrentQuestion();
        this.countdown = Math.max(20, 30 - this.currentWave);
        return {
          success: true,
          message: "Question skipped!",
          effect: "question_passed",
          nextQuestion: this.currentQuestion,
        };

      default:
        return { success: false, message: "Unknown tool effect" };
    }
  }

  shuffleAllPlayerHands() {
    // Collect all cards from all hands
    const allCards = [];
    const handSizes = new Map();

    this.playerHands.forEach((hand, socketId) => {
      handSizes.set(socketId, hand.length);
      allCards.push(...hand);
    });

    // Find correct answer card for current question
    let correctAnswerCard = null;
    if (this.currentQuestion) {
      const correctAnswerIndex = allCards.findIndex(
        (card) =>
          card.type === "answer" &&
          card.text.toLowerCase().trim() ===
            this.currentQuestion.correctAnswer.toLowerCase().trim()
      );

      if (correctAnswerIndex !== -1) {
        correctAnswerCard = allCards.splice(correctAnswerIndex, 1)[0];
        console.log(
          `🎯 Reserved correct answer card for Super Shuffle: "${correctAnswerCard.text}"`
        );
      }
    }

    // Shuffle remaining cards
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }

    // Redistribute cards to players
    let cardIndex = 0;
    let playerIndex = 0;
    const playerIds = Array.from(this.playerHands.keys());

    this.playerHands.forEach((hand, socketId) => {
      const handSize = handSizes.get(socketId);
      let cardsToTake = handSize;

      // Give the correct answer card to a random player (if found)
      let newHand = [];
      if (
        correctAnswerCard &&
        playerIndex === Math.floor(Math.random() * playerIds.length)
      ) {
        newHand.push(correctAnswerCard);
        cardsToTake -= 1;
        correctAnswerCard = null; // Mark as used
        console.log(
          `🎯 Gave correct answer card to player: ${
            this.players.get(socketId)?.name
          }`
        );
      }

      // Fill rest of hand with shuffled cards
      const remainingCards = allCards.slice(cardIndex, cardIndex + cardsToTake);
      newHand.push(...remainingCards);

      this.playerHands.set(socketId, newHand);
      cardIndex += cardsToTake;
      playerIndex++;
    });

    // If correct answer card wasn't distributed (no players), add it to deck
    if (correctAnswerCard) {
      this.deck.push(correctAnswerCard);
      this.shuffleDeck();
      console.log(`🎯 Added unused correct answer card back to deck`);
    }
  }

  skipTurn(socketId) {
    if (this.gameState !== "playing") {
      return { success: false, message: "Game not in playing state" };
    }

    if (!this.isPlayerTurn(socketId)) {
      return { success: false, message: "Not your turn" };
    }

    // Set actions to 0 to end turn
    this.playerActionsLeft.set(socketId, 0);

    return { success: true, message: "Turn skipped" };
  }

  reshuffleHand(socketId) {
    if (this.gameState !== "playing") {
      return { success: false, message: "Game not in playing state" };
    }

    if (!this.isPlayerTurn(socketId)) {
      return { success: false, message: "Not your turn" };
    }

    if (this.getPlayerActionsLeft(socketId) <= 0) {
      return { success: false, message: "No actions left" };
    }

    const hand = this.playerHands.get(socketId) || [];
    if (hand.length === 0) {
      return { success: false, message: "No cards to reshuffle" };
    }

    // Add hand back to deck and reshuffle
    this.deck.push(...hand);
    this.shuffleDeck();

    // GUARANTEE correct answer card in new hand - enhanced version
    let guaranteedAnswerCard = null;
    if (this.currentQuestion) {
      // First, try to find the correct answer card in the deck
      const correctAnswerIndex = this.deck.findIndex(
        (card) =>
          card.type === "answer" &&
          card.text.toLowerCase().trim() ===
            this.currentQuestion.correctAnswer.toLowerCase().trim()
      );

      if (correctAnswerIndex !== -1) {
        // Remove the correct answer card from deck to guarantee it in hand
        guaranteedAnswerCard = this.deck.splice(correctAnswerIndex, 1)[0];
        console.log(
          `🎯 Guaranteed correct answer card in reshuffled hand: "${guaranteedAnswerCard.text}"`
        );
      } else {
        // If not in deck, try to find it in other players' hands
        for (const [otherSocketId, otherHand] of this.playerHands) {
          if (otherSocketId === socketId) continue; // Skip current player

          const answerIndex = otherHand.findIndex(
            (card) =>
              card.type === "answer" &&
              card.text.toLowerCase().trim() ===
                this.currentQuestion.correctAnswer.toLowerCase().trim()
          );

          if (answerIndex !== -1) {
            // Take the answer card from another player
            guaranteedAnswerCard = otherHand.splice(answerIndex, 1)[0];
            console.log(
              `🎯 Found correct answer card in another player's hand for reshuffle: "${guaranteedAnswerCard.text}"`
            );
            break;
          }
        }

        // If still not found, create the answer card to guarantee winning chance
        if (!guaranteedAnswerCard) {
          guaranteedAnswerCard = {
            id: `reshuffle_guaranteed_${Date.now()}`,
            name: `Answer for ${this.currentQuestion.text}`,
            text: this.currentQuestion.correctAnswer,
            type: "answer",
            questionId: this.currentQuestion.id,
            isGenerated: true, // Mark as generated for tracking
          };
          console.log(
            `🎯 Created correct answer card for reshuffle to guarantee winning chance: "${guaranteedAnswerCard.text}"`
          );
        }
      }
    }

    // Deal new hand - ALWAYS 3 cards total (2 random + 1 guaranteed answer)
    const targetHandSize = 3; // Always maintain 3 cards
    const remainingSlots = guaranteedAnswerCard
      ? targetHandSize - 1
      : targetHandSize;

    // Ensure we have enough cards in deck for the new hand
    while (this.deck.length < remainingSlots) {
      // If deck is running low, add more cards by cycling through available cards
      const availableAnswerCards = this.generateGameDeck().slice(0, 5); // Get 5 answer cards
      const availableToolCards = TOOL_CARDS.slice(0, 2); // Get 2 tool cards
      this.deck.push(...availableAnswerCards, ...availableToolCards);
      this.shuffleDeck();
      console.log(
        `🔄 Replenished deck for reshuffle - now has ${this.deck.length} cards`
      );
    }

    const newHand = this.deck.splice(0, remainingSlots);

    // Add the guaranteed answer card to the hand
    if (guaranteedAnswerCard) {
      newHand.push(guaranteedAnswerCard);

      // Shuffle the new hand so the answer isn't always in the same position
      for (let i = newHand.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newHand[i], newHand[j]] = [newHand[j], newHand[i]];
      }
    }

    // Ensure the hand is exactly 3 cards
    if (newHand.length !== targetHandSize) {
      console.log(
        `⚠️ Hand size mismatch: expected ${targetHandSize}, got ${newHand.length}`
      );
    }

    this.playerHands.set(socketId, newHand);

    // Use one action
    this.usePlayerAction(socketId);

    return {
      success: true,
      message: guaranteedAnswerCard
        ? "Hand reshuffled with answer card guaranteed!"
        : "Hand reshuffled!",
      newHand,
      handSize: newHand.length,
      actionsLeft: this.getPlayerActionsLeft(socketId),
      guaranteedAnswer: !!guaranteedAnswerCard,
      answerCardSource: guaranteedAnswerCard?.isGenerated ? "created" : "found",
    };
  }

  isPlayerTurn(socketId) {
    if (this.playerOrder.length === 0) return false;
    const currentPlayerIndex = this.currentTurn % this.playerOrder.length;
    return this.playerOrder[currentPlayerIndex] === socketId;
  }

  getCurrentPlayer() {
    if (this.playerOrder.length === 0) return null;
    const currentPlayerIndex = this.currentTurn % this.playerOrder.length;
    const socketId = this.playerOrder[currentPlayerIndex];
    return this.players.get(socketId);
  }

  getPlayerActionsLeft(socketId) {
    return this.playerActionsLeft.get(socketId) || 0;
  }

  usePlayerAction(socketId) {
    const current = this.getPlayerActionsLeft(socketId);
    this.playerActionsLeft.set(socketId, Math.max(0, current - 1));
  }

  // Check if all players have no cards left and deck is empty
  checkNoCardsGameEnd() {
    // First check if deck is empty
    if (this.deck.length > 0) {
      return { shouldEnd: false };
    }

    // Check if any player has cards in hand
    for (const socketId of this.playerOrder) {
      const playerHand = this.playerHands.get(socketId) || [];
      if (playerHand.length > 0) {
        return { shouldEnd: false };
      }
    }

    // All players have no cards and deck is empty - determine winner by points
    const playerStats = new Map();

    // Calculate points for each player (could be based on cards played, correct answers, etc.)
    // For now, we'll use a simple scoring system based on correct answers and survival
    for (const socketId of this.playerOrder) {
      const player = this.players.get(socketId);
      if (player) {
        // Score based on:
        // - Current wave reached (10 points per wave)
        // - PC health remaining (5 points per health)
        // - Bonus for participation (base 10 points)
        const score = (this.currentWave - 1) * 10 + this.pcHealth * 5 + 10;
        playerStats.set(socketId, {
          playerId: socketId,
          playerName: player.name,
          score: score,
          wavesCompleted: this.currentWave - 1,
          healthRemaining: this.pcHealth,
        });
      }
    }

    // Find winner (highest score)
    let winner = null;
    let highestScore = -1;
    let isTie = false;
    let tiedPlayers = [];

    for (const [socketId, stats] of playerStats) {
      if (stats.score > highestScore) {
        highestScore = stats.score;
        winner = stats;
        isTie = false;
        tiedPlayers = [stats];
      } else if (stats.score === highestScore) {
        if (!isTie) {
          isTie = true;
          tiedPlayers = [winner, stats];
        } else {
          tiedPlayers.push(stats);
        }
      }
    }

    this.gameState = "gameOver";

    return {
      shouldEnd: true,
      reason: "no_cards_remaining",
      winner: isTie ? null : winner,
      isTie: isTie,
      tiedPlayers: isTie ? tiedPlayers : [],
      playerStats: Array.from(playerStats.values()),
      finalWave: this.currentWave,
      finalHealth: this.pcHealth,
    };
  }

  nextTurn() {
    // Check if current player has no actions left
    const currentPlayerSocketId =
      this.playerOrder[this.currentTurn % this.playerOrder.length];
    if (this.getPlayerActionsLeft(currentPlayerSocketId) > 0) {
      return { success: false, message: "Current player still has actions" };
    }

    // Move to next player
    this.currentTurn++;
    const nextPlayerSocketId =
      this.playerOrder[this.currentTurn % this.playerOrder.length];
    this.playerActionsLeft.set(nextPlayerSocketId, 2);

    // If all players have taken their turn, decrease countdown
    if (this.currentTurn % this.playerOrder.length === 0) {
      this.decreaseCountdown();
    }

    // Check if game should end due to no cards remaining
    const gameEndCheck = this.checkNoCardsGameEnd();

    return {
      success: true,
      nextPlayer: this.players.get(nextPlayerSocketId),
      currentTurn: this.currentTurn,
      gameEndCheck: gameEndCheck,
    };
  }

  decreaseCountdown() {
    if (this.freezeCountdown > 0) {
      this.freezeCountdown--;
      return;
    }

    this.countdown--;

    if (this.countdown <= 0) {
      // Countdown expired - lose health and new question
      this.pcHealth--;

      if (this.pcHealth <= 0) {
        this.gameState = "gameOver";
        return { gameOver: true };
      }

      // Move to next question
      this.currentQuestionIndex++;
      const questionResult = this.setCurrentQuestion();
      this.countdown = Math.max(20, 30 - this.currentWave);

      return {
        gameOver: false,
        waveAdvanced: questionResult?.waveAdvanced || false,
        newWave: questionResult?.newWave,
      };
    }

    return { gameOver: false };
  }

  getPublicGameState() {
    return {
      roomId: this.roomId,
      gameState: this.gameState,
      currentWave: this.currentWave,
      pcHealth: this.pcHealth,
      countdown: this.countdown,
      freezeCountdown: this.freezeCountdown,
      currentQuestion: this.currentQuestion,
      currentTurn: this.currentTurn,
      players: Array.from(this.players.values()),
      playerOrder: this.playerOrder.map((id) => this.players.get(id)?.name),
      deckSize: this.deck.length,
      usedCardsCount: this.usedCards.length,
      gameStartTime: this.gameStartTime,
    };
  }

  getPlayerGameState(socketId) {
    const publicState = this.getPublicGameState();
    const playerHand = this.playerHands.get(socketId) || [];
    const actionsLeft = this.getPlayerActionsLeft(socketId);
    const isPlayerTurn = this.isPlayerTurn(socketId);

    return {
      ...publicState,
      playerHand,
      actionsLeft,
      isPlayerTurn,
      playerId: socketId,
    };
  }
}

// MongoDB Models
const DigitalDefendersQuestion = mongoose.model(
  "DigitalDefendersQuestion",
  digitalDefendersQuestionSchema
);
const DigitalDefendersAnswer = mongoose.model(
  "DigitalDefendersAnswer",
  digitalDefendersAnswerSchema
);
const DigitalDefendersStats = mongoose.model(
  "DigitalDefendersStats",
  digitalDefendersStatsSchema
);

export {
  DigitalDefendersGame,
  DigitalDefendersQuestion,
  DigitalDefendersAnswer,
  DigitalDefendersStats,
  TOOL_CARDS,
};
