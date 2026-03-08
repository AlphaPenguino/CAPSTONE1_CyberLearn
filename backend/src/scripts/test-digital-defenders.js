#!/usr/bin/env node

/**
 * Digital Defenders Backend Test Suite
 *
 * Comprehensive testing for Digital Defenders backend functionality including:
 * - Database models and operations
 * - Game logic and state management
 * - REST API endpoints
 * - Socket.IO real-time functionality
 *
 * Usage: node test-digital-defenders.js
 */

import mongoose from "mongoose";
import "dotenv/config";
import {
  DigitalDefendersGame,
  DigitalDefendersQuestion,
  DigitalDefendersAnswer,
  DigitalDefendersStats,
  TOOL_CARDS,
} from "../models/DigitalDefenders.js";
import Section from "../models/Section.js";
import User from "../models/Users.js";

// Test configuration
const TEST_CONFIG = {
  MONGO_URI: process.env.MONGO_URI,
  TEST_TIMEOUT: 30000, // 30 seconds
};

// Test data
const testData = {
  section: null,
  user: null,
  question: null,
  answer: null,
  stats: null,
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
};

// Utility functions
function log(message, type = "info") {
  const timestamp = new Date().toISOString();
  const prefix =
    {
      info: "ℹ️ ",
      success: "✅",
      error: "❌",
      warning: "⚠️ ",
      test: "🧪",
    }[type] || "📝";

  console.log(`${prefix} [${timestamp}] ${message}`);
}

function assert(condition, message) {
  if (condition) {
    testResults.passed++;
    log(`PASS: ${message}`, "success");
    return true;
  } else {
    testResults.failed++;
    testResults.errors.push(message);
    log(`FAIL: ${message}`, "error");
    return false;
  }
}

async function connectDB() {
  try {
    await mongoose.connect(TEST_CONFIG.MONGO_URI);
    log("Connected to MongoDB for testing", "success");
  } catch (error) {
    log(`MongoDB connection error: ${error.message}`, "error");
    process.exit(1);
  }
}

async function disconnectDB() {
  try {
    await mongoose.disconnect();
    log("Disconnected from MongoDB", "info");
  } catch (error) {
    log(`MongoDB disconnection error: ${error.message}`, "error");
  }
}

// Test suites
async function testModels() {
  log("Testing Digital Defenders Models", "test");

  try {
    // Test Section and User (prerequisites)
    const section = await Section.findOne({ isActive: true });
    assert(section !== null, "Found active section for testing");
    testData.section = section;

    const user = await User.findOne({ privilege: "admin" });
    assert(user !== null, "Found admin user for testing");
    testData.user = user;

    // Test Question Model
    const questionData = {
      text: "Test question: What is cybersecurity?",
      correctAnswer: "Information security",
      description: "Test question for Digital Defenders",
      difficulty: 3,
      wave: 2,
      createdBy: user._id,
      section: section._id,
    };

    const question = new DigitalDefendersQuestion(questionData);
    await question.save();
    assert(question._id !== undefined, "Created Digital Defenders question");
    testData.question = question;

    // Test Answer Model
    const answerData = {
      name: "Test Answer Card",
      text: "Information security",
      description: "Test answer card for Digital Defenders",
      createdBy: user._id,
      section: section._id,
    };

    const answer = new DigitalDefendersAnswer(answerData);
    await answer.save();
    assert(answer._id !== undefined, "Created Digital Defenders answer card");
    testData.answer = answer;

    // Test Stats Model
    const statsData = {
      userId: user._id,
      section: section._id,
      gamesPlayed: 5,
      gamesWon: 3,
      totalWavesCompleted: 35,
      highestWaveReached: 8,
      totalCardsPlayed: 45,
      totalCorrectAnswers: 28,
      bestCompletionTime: 1200, // 20 minutes
    };

    const stats = new DigitalDefendersStats(statsData);
    await stats.save();
    assert(stats._id !== undefined, "Created Digital Defenders stats");
    testData.stats = stats;

    // Test Tool Cards
    assert(TOOL_CARDS.length === 5, "Tool cards array has correct length");
    assert(
      TOOL_CARDS[0].effect === "reset_countdown",
      "First tool card has correct effect"
    );
  } catch (error) {
    log(`Model test error: ${error.message}`, "error");
    testResults.failed++;
    testResults.errors.push(`Model test error: ${error.message}`);
  }
}

async function testGameLogic() {
  log("Testing Digital Defenders Game Logic", "test");

  try {
    // Create a new game
    const game = new DigitalDefendersGame(
      "TEST001",
      "socket1",
      "TestPlayer1",
      4
    );
    assert(game.roomId === "TEST001", "Game created with correct room ID");
    assert(game.players.size === 1, "Game has initial player");
    assert(game.gameState === "lobby", "Game starts in lobby state");

    // Test adding players
    const result1 = game.addPlayer("socket2", "TestPlayer2");
    assert(result1.success === true, "Successfully added second player");
    assert(game.players.size === 2, "Game has 2 players after addition");

    const result2 = game.addPlayer("socket3", "TestPlayer3");
    assert(result2.success === true, "Successfully added third player");

    // Test game start conditions
    assert(game.canStartGame() === true, "Game can start with 2+ players");

    // Test game initialization
    await game.loadQuestions();
    const initResult = game.initializeGame();
    assert(initResult.success === true, "Game initialization successful");
    assert(game.gameState === "playing", "Game state changed to playing");
    assert(game.deck.length > 0, "Game deck has cards");

    // Test player hands
    assert(game.playerHands.size === 3, "All players have hands");
    const hand1 = game.playerHands.get("socket1");
    assert(hand1.length === 3, "Player 1 has 3 cards in hand");

    // Test turn management
    assert(
      game.isPlayerTurn("socket1") === true,
      "First player's turn is correct"
    );
    assert(
      game.getPlayerActionsLeft("socket1") === 2,
      "Player has 2 actions initially"
    );

    // Test card playing
    const playerHand = game.playerHands.get("socket1");
    if (playerHand && playerHand.length > 0) {
      const cardToPlay = playerHand[0];
      const playResult = game.playCard("socket1", cardToPlay.id);
      assert(playResult.success === true, "Card played successfully");
      assert(
        game.getPlayerActionsLeft("socket1") === 1,
        "Player actions decreased after card play"
      );
    }

    // Test skip turn
    const skipResult = game.skipTurn("socket1");
    assert(skipResult.success === true, "Turn skipped successfully");

    // Test turn advancement
    const nextTurnResult = game.nextTurn();
    assert(nextTurnResult.success === true, "Turn advanced successfully");
    assert(game.isPlayerTurn("socket2") === true, "Turn moved to next player");

    // Test tool card effects
    const healCard = { id: "tool_heal", type: "tool", effect: "heal" };
    const healResult = game.applyToolEffect(healCard, "socket2");
    assert(healResult.success === true, "Heal tool card applied successfully");
    assert(game.pcHealth === 5, "PC health at maximum after heal"); // Should be at max

    const resetCard = {
      id: "tool_overclock",
      type: "tool",
      effect: "reset_countdown",
    };
    game.countdown = 5; // Set countdown low
    const resetResult = game.applyToolEffect(resetCard, "socket2");
    assert(
      resetResult.success === true,
      "Reset countdown tool applied successfully"
    );
    assert(game.countdown === 30, "Countdown reset to 30");

    // Test game state retrieval
    const publicState = game.getPublicGameState();
    assert(
      publicState.roomId === "TEST001",
      "Public state has correct room ID"
    );
    assert(publicState.players.length === 3, "Public state shows all players");

    const playerState = game.getPlayerGameState("socket1");
    assert(
      playerState.playerId === "socket1",
      "Player state has correct player ID"
    );
    assert(Array.isArray(playerState.playerHand), "Player state includes hand");
  } catch (error) {
    log(`Game logic test error: ${error.message}`, "error");
    testResults.failed++;
    testResults.errors.push(`Game logic test error: ${error.message}`);
  }
}

async function testAnswerMatching() {
  log("Testing Answer Matching Logic", "test");

  try {
    const game = new DigitalDefendersGame(
      "TEST002",
      "socket1",
      "TestPlayer",
      2
    );
    await game.loadQuestions();
    game.initializeGame();

    // Test correct answer matching
    const currentQuestion = game.currentQuestion;
    if (currentQuestion) {
      const correctAnswerCard = {
        id: "answer_test",
        type: "answer",
        text: currentQuestion.correctAnswer,
      };

      const answerResult = game.tryAnswerQuestion(correctAnswerCard);
      assert(answerResult.success === true, "Correct answer was accepted");
      assert(answerResult.questionSolved === true, "Question marked as solved");

      // Test wrong answer
      const wrongAnswerCard = {
        id: "answer_wrong",
        type: "answer",
        text: "Wrong Answer",
      };

      // Set a new question manually for testing and store initial health
      game.currentQuestion = {
        id: "test_q",
        text: "Test question?",
        correctAnswer: "Correct Answer",
      };
      const initialHealth = game.pcHealth;

      const wrongResult = game.tryAnswerQuestion(wrongAnswerCard);
      assert(wrongResult.success === true, "Wrong answer handling works");
      assert(
        wrongResult.questionSolved === false,
        "Wrong answer doesn't solve question"
      );
      assert(
        wrongResult.healthLost === true,
        "Health was lost due to wrong answer"
      );
      assert(
        game.pcHealth === initialHealth - 1,
        "PC health decreased by 1 after wrong answer"
      );
      assert(
        wrongResult.currentHealth === game.pcHealth,
        "Returned health matches current health"
      );
    }

    // Test case-insensitive matching
    game.currentQuestion = {
      id: "test_case",
      text: "Case test?",
      correctAnswer: "Test Answer",
    };

    const caseTestCard = {
      id: "answer_case",
      type: "answer",
      text: "TEST ANSWER", // Different case
    };

    const caseResult = game.tryAnswerQuestion(caseTestCard);
    assert(
      caseResult.success === true,
      "Case-insensitive answer matching works"
    );
    assert(
      caseResult.questionSolved === true,
      "Case-insensitive answer solves question"
    );

    // Test game over condition due to wrong answers
    log("Testing game over due to wrong answers...", "info");

    // Create a fresh game for game over test
    const gameOverTest = new DigitalDefendersGame("OVER001");
    await gameOverTest.initializeGame();

    // Set health to 1 so next wrong answer causes game over
    gameOverTest.pcHealth = 1;
    gameOverTest.currentQuestion = {
      id: "game_over_test",
      text: "Game over test question?",
      correctAnswer: "Correct Answer",
    };

    const wrongCard = {
      id: "answer_game_over",
      type: "answer",
      text: "Wrong Answer",
    };

    const gameOverResult = gameOverTest.tryAnswerQuestion(wrongCard);
    assert(gameOverResult.success === true, "Game over result is successful");
    assert(gameOverResult.healthLost === true, "Health was lost");
    assert(gameOverResult.gameOver === true, "Game over flag is set");
    assert(gameOverTest.pcHealth === 0, "PC health is 0");
    assert(gameOverTest.gameState === "gameOver", "Game state is gameOver");

    log("Game over test passed!", "success");
  } catch (error) {
    log(`Answer matching test error: ${error.message}`, "error");
    testResults.failed++;
    testResults.errors.push(`Answer matching test error: ${error.message}`);
  }
}

async function testDatabaseOperations() {
  log("Testing Database Operations", "test");

  try {
    if (!testData.section || !testData.user) {
      log("Skipping database tests - prerequisites not available", "warning");
      return;
    }

    // Test question queries
    const questions = await DigitalDefendersQuestion.find({
      section: testData.section._id,
      isActive: true,
    });
    assert(questions.length > 0, "Found questions for section");

    // Test answer queries
    const answers = await DigitalDefendersAnswer.find({
      section: testData.section._id,
      isActive: true,
    });
    assert(answers.length > 0, "Found answer cards for section");

    // Test stats queries
    const stats = await DigitalDefendersStats.findOne({
      userId: testData.user._id,
      section: testData.section._id,
    });
    assert(stats !== null, "Found stats for user and section");

    // Test question update
    if (testData.question) {
      testData.question.difficulty = 5;
      await testData.question.save();

      const updatedQuestion = await DigitalDefendersQuestion.findById(
        testData.question._id
      );
      assert(updatedQuestion.difficulty === 5, "Question update successful");
    }

    // Test stats update
    if (testData.stats) {
      testData.stats.gamesPlayed += 1;
      testData.stats.gamesWon += 1;
      await testData.stats.save();

      const updatedStats = await DigitalDefendersStats.findById(
        testData.stats._id
      );
      assert(updatedStats.gamesPlayed === 6, "Stats update successful");
    }
  } catch (error) {
    log(`Database operations test error: ${error.message}`, "error");
    testResults.failed++;
    testResults.errors.push(`Database operations test error: ${error.message}`);
  }
}

async function testEdgeCases() {
  log("Testing Edge Cases", "test");

  try {
    // Test game with maximum players
    const game = new DigitalDefendersGame("TEST003", "socket1", "Player1", 4);

    // Add players to capacity
    game.addPlayer("socket2", "Player2");
    game.addPlayer("socket3", "Player3");
    game.addPlayer("socket4", "Player4");

    // Try to add one more player (should fail)
    const overCapacityResult = game.addPlayer("socket5", "Player5");
    assert(
      overCapacityResult.success === false,
      "Reject player when room is full"
    );

    // Test empty deck scenario
    game.deck = []; // Empty the deck
    const drawResult = game.drawCard("socket1");
    assert(drawResult === null, "Drawing from empty deck returns null");

    // Test invalid card play
    const invalidCardResult = game.playCard("socket1", "nonexistent_card");
    assert(invalidCardResult.success === false, "Invalid card ID rejected");

    // Test playing card when not player's turn
    await game.loadQuestions();
    game.initializeGame();
    const wrongTurnResult = game.playCard("socket2", "some_card"); // socket1's turn
    assert(
      wrongTurnResult.success === false,
      "Card play rejected when not player's turn"
    );

    // Test reshuffle with empty hand
    game.playerHands.set("socket1", []); // Empty hand
    const emptyReshuffleResult = game.reshuffleHand("socket1");
    assert(
      emptyReshuffleResult.success === false,
      "Reshuffle with empty hand rejected"
    );

    // Test countdown expiration
    game.countdown = 0;
    game.decreaseCountdown();
    assert(game.pcHealth < 5, "Health decreased when countdown expires");
  } catch (error) {
    log(`Edge cases test error: ${error.message}`, "error");
    testResults.failed++;
    testResults.errors.push(`Edge cases test error: ${error.message}`);
  }
}

async function cleanupTestData() {
  log("Cleaning up test data", "info");

  try {
    // Clean up test data
    if (testData.question) {
      await DigitalDefendersQuestion.findByIdAndDelete(testData.question._id);
    }

    if (testData.answer) {
      await DigitalDefendersAnswer.findByIdAndDelete(testData.answer._id);
    }

    if (testData.stats) {
      await DigitalDefendersStats.findByIdAndDelete(testData.stats._id);
    }

    log("Test data cleaned up", "success");
  } catch (error) {
    log(`Cleanup error: ${error.message}`, "warning");
  }
}

function printTestSummary() {
  log("=".repeat(60), "info");
  log("DIGITAL DEFENDERS BACKEND TEST SUMMARY", "info");
  log("=".repeat(60), "info");

  log(
    `Total tests passed: ${testResults.passed}`,
    testResults.passed > 0 ? "success" : "info"
  );
  log(
    `Total tests failed: ${testResults.failed}`,
    testResults.failed === 0 ? "success" : "error"
  );

  if (testResults.errors.length > 0) {
    log("\nFailed tests:", "error");
    testResults.errors.forEach((error, index) => {
      log(`${index + 1}. ${error}`, "error");
    });
  }

  const successRate = (
    (testResults.passed / (testResults.passed + testResults.failed)) *
    100
  ).toFixed(1);
  log(
    `\nSuccess rate: ${successRate}%`,
    successRate === "100.0" ? "success" : "warning"
  );

  if (testResults.failed === 0) {
    log(
      "\n🎉 All tests passed! Digital Defenders backend is ready!",
      "success"
    );
  } else {
    log(
      `\n⚠️  ${testResults.failed} test(s) failed. Please review and fix issues.`,
      "warning"
    );
  }
}

async function main() {
  const startTime = Date.now();

  log("🚀 Starting Digital Defenders Backend Test Suite", "info");
  log(`MongoDB URI: ${TEST_CONFIG.MONGO_URI}`, "info");

  await connectDB();

  try {
    // Run all test suites
    await testModels();
    await testGameLogic();
    await testAnswerMatching();
    await testDatabaseOperations();
    await testEdgeCases();
  } catch (error) {
    log(`Critical test error: ${error.message}`, "error");
    testResults.failed++;
    testResults.errors.push(`Critical error: ${error.message}`);
  } finally {
    await cleanupTestData();
    await disconnectDB();
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  log(`Test suite completed in ${duration} seconds`, "info");
  printTestSummary();

  // Exit with appropriate code
  process.exit(testResults.failed === 0 ? 0 : 1);
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    log(`Fatal error: ${error.message}`, "error");
    process.exit(1);
  });
}

export {
  testModels,
  testGameLogic,
  testAnswerMatching,
  testDatabaseOperations,
  testEdgeCases,
};
