#!/usr/bin/env node

/**
 * Test Wave Transitions in Digital Defenders
 * This script tests the wave alignment and transition system
 */

import mongoose from "mongoose";
import {
  DigitalDefendersGame,
  DigitalDefendersQuestion,
} from "./src/models/DigitalDefenders.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/cyberlearn";

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}

async function createTestQuestions() {
  console.log("\n🎯 Creating test questions for wave testing...");

  // Create a dummy user ID for testing
  const dummyUserId = new mongoose.Types.ObjectId();

  const testQuestions = [
    {
      text: "What does HTTP stand for?",
      correctAnswer: "HyperText Transfer Protocol",
      wave: 1,
      difficulty: 1,
      createdBy: dummyUserId,
    },
    {
      text: "What is the default SSH port?",
      correctAnswer: "22",
      wave: 1,
      difficulty: 1,
      createdBy: dummyUserId,
    },
    {
      text: "What does HTTPS use for encryption?",
      correctAnswer: "TLS",
      wave: 2,
      difficulty: 2,
      createdBy: dummyUserId,
    },
    {
      text: "What is SQL injection?",
      correctAnswer: "Code injection technique",
      wave: 2,
      difficulty: 2,
      createdBy: dummyUserId,
    },
    {
      text: "What is two-factor authentication?",
      correctAnswer: "2FA",
      wave: 3,
      difficulty: 3,
      createdBy: dummyUserId,
    },
    {
      text: "What does VPN stand for?",
      correctAnswer: "Virtual Private Network",
      wave: 3,
      difficulty: 3,
      createdBy: dummyUserId,
    },
    {
      text: "What is phishing?",
      correctAnswer: "Social engineering attack",
      wave: 4,
      difficulty: 3,
      createdBy: dummyUserId,
    },
    {
      text: "What is malware?",
      correctAnswer: "Malicious software",
      wave: 4,
      difficulty: 3,
      createdBy: dummyUserId,
    },
    {
      text: "What is ransomware?",
      correctAnswer: "Encryption malware",
      wave: 5,
      difficulty: 4,
      createdBy: dummyUserId,
    },
    {
      text: "What is zero-day vulnerability?",
      correctAnswer: "Unknown security flaw",
      wave: 5,
      difficulty: 4,
      createdBy: dummyUserId,
    },
  ];

  // Clear existing questions
  await DigitalDefendersQuestion.deleteMany({});

  // Insert test questions
  for (const q of testQuestions) {
    await DigitalDefendersQuestion.create(q);
  }

  console.log(
    `✅ Created ${testQuestions.length} test questions across 5 waves`
  );
}

async function testWaveTransitions() {
  console.log("\n🌊 Testing wave transition logic...");

  // Create a test game
  const game = new DigitalDefendersGame(
    "TEST_ROOM",
    "player1",
    "Test Player",
    2
  );

  // Add a second player
  game.addPlayer("player2", "Player 2");

  // Set turn order to enable game start
  game.playerOrder = ["player1", "player2"];
  game.gameState = "turnOrder";

  // Initialize the game (this should load questions from DB)
  await game.initializeGame();

  console.log(
    `🎮 Game initialized with ${game.questionsForWaves.length} questions`
  );

  // Test wave distribution
  for (let wave = 1; wave <= 10; wave++) {
    const waveQuestions = game.questionsForWaves.filter((q) => q.wave === wave);
    console.log(`🌊 Wave ${wave}: ${waveQuestions.length} questions`);
  }

  // Test setCurrentQuestion method
  console.log("\n🔄 Testing question progression...");

  // Start with wave 1
  console.log(`Current wave: ${game.currentWave}`);
  game.setCurrentQuestion();
  console.log(`Current question: ${game.currentQuestion?.text || "None"}`);

  // Simulate answering all questions in wave 1
  const wave1Questions = game.questionsForWaves.filter((q) => q.wave === 1);
  for (let i = 0; i < wave1Questions.length; i++) {
    console.log(`Answering question ${i + 1} of wave 1...`);
    game.currentQuestionIndex++;
    const result = game.setCurrentQuestion();

    if (result?.waveAdvanced) {
      console.log(`🎉 WAVE ADVANCED! Now on wave ${result.newWave}`);
    }

    console.log(
      `Current wave: ${game.currentWave}, Question: ${
        game.currentQuestion?.text || "None"
      }`
    );
  }

  console.log("\n✅ Wave transition test completed!");
}

async function testAnswerCard() {
  console.log("\n🃏 Testing answer card logic...");

  const game = new DigitalDefendersGame(
    "TEST_ROOM2",
    "player1",
    "Test Player",
    1
  );
  game.playerOrder = ["player1"];
  game.gameState = "turnOrder";

  await game.initializeGame();

  if (game.currentQuestion) {
    console.log(`Current question: ${game.currentQuestion.text}`);
    console.log(`Expected answer: ${game.currentQuestion.correctAnswer}`);

    // Test correct answer
    const correctAnswerCard = { text: game.currentQuestion.correctAnswer };
    const result = game.tryAnswerQuestion(correctAnswerCard);

    console.log(`Answer result:`, result);

    if (result.waveAdvanced) {
      console.log(`🎉 Wave advanced to ${result.newWave}!`);
    }
  }
}

async function main() {
  console.log("🧪 Digital Defenders Wave Transition Test");
  console.log("==========================================");

  await connectDB();
  await createTestQuestions();
  await testWaveTransitions();
  await testAnswerCard();

  console.log("\n✅ All tests completed!");
  process.exit(0);
}

// Error handling
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled rejection:", error);
  process.exit(1);
});

// Run the test
main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
