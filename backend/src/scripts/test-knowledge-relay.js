#!/usr/bin/env node

/**
 * Knowledge Relay Backend Test Suite
 *
 * This script tests the Knowledge Relay backend implementation including:
 * - Game creation and room management
 * - Team selection and player management
 * - Real-time gameplay mechanics
 * - Timer and timeout handling
 * - Pass system
 * - Scoring and leaderboards
 * - Question management
 * - Disconnection handling
 */

import { io as ioClient } from "socket.io-client";
import fetch from "node-fetch";

const SERVER_URL = "http://localhost:3000";
const API_BASE = `${SERVER_URL}/api/knowledge-relay`;

// Test configuration
const TEST_ROOM_ID = "TEST123";
const TEST_PLAYERS = [
  { name: "Alice", team: "A" },
  { name: "Bob", team: "B" },
  { name: "Charlie", team: "C" },
  { name: "Diana", team: "D" },
];

let testResults = [];
let currentTest = 0;

// Utility functions
const log = (message, type = "info") => {
  const timestamp = new Date().toISOString();
  const prefix = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️";
  console.log(`${prefix} [${timestamp}] ${message}`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const addTestResult = (testName, passed, message = "") => {
  testResults.push({ testName, passed, message });
  if (passed) {
    log(`Test ${++currentTest}: ${testName} - PASSED`, "success");
  } else {
    log(`Test ${++currentTest}: ${testName} - FAILED: ${message}`, "error");
  }
};

// API Tests
const testRESTAPI = async () => {
  log("Starting REST API tests...");

  try {
    // Test health check
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = await healthRes.json();
    addTestResult(
      "Health Check",
      healthData.success && healthData.service === "Knowledge Relay"
    );

    // Test get questions
    const questionsRes = await fetch(`${API_BASE}/questions`);
    const questionsData = await questionsRes.json();
    addTestResult(
      "Get Questions",
      questionsData.success && Array.isArray(questionsData.questions)
    );

    // Test get teams
    const teamsRes = await fetch(`${API_BASE}/teams`);
    const teamsData = await teamsRes.json();
    addTestResult(
      "Get Teams",
      teamsData.success && typeof teamsData.teams === "object"
    );

    // Test validate questions
    const validQuestions = [
      {
        question: "Test question?",
        options: ["Option 1", "Option 2", "Option 3"],
        correctAnswer: 0,
        difficulty: "Easy",
        category: "Test",
      },
    ];

    const validateRes = await fetch(`${API_BASE}/validate-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: validQuestions }),
    });
    const validateData = await validateRes.json();
    addTestResult("Validate Questions", validateData.success);

    // Test room ID generation
    const roomIdRes = await fetch(`${API_BASE}/generate-room-id`);
    const roomIdData = await roomIdRes.json();
    addTestResult(
      "Generate Room ID",
      roomIdData.success && typeof roomIdData.roomId === "string"
    );
  } catch (error) {
    log(`REST API test error: ${error.message}`, "error");
    addTestResult("REST API Tests", false, error.message);
  }
};

// Socket.IO Tests
const testSocketIO = async () => {
  log("Starting Socket.IO tests...");

  return new Promise((resolve) => {
    const clients = [];
    let completedTests = 0;
    const totalSocketTests = 8;

    // Create test clients
    TEST_PLAYERS.forEach((player, index) => {
      const client = ioClient(SERVER_URL, {
        transports: ["websocket"],
        timeout: 5000,
      });

      client.playerInfo = player;
      client.isCreator = index === 0;
      clients.push(client);

      client.on("connect", () => {
        log(`Client ${player.name} connected`);

        // Test room joining
        client.emit("kr-join-room", {
          roomId: TEST_ROOM_ID,
          playerName: player.name,
        });
      });

      client.on("kr-room-joined", (data) => {
        addTestResult(
          `Room Join - ${player.name}`,
          data.gameState && data.playerName === player.name
        );

        // Test team selection
        setTimeout(() => {
          client.emit("kr-select-team", { teamId: player.team });
        }, 500);
      });

      client.on("kr-team-selected", (data) => {
        if (data.playerName === player.name) {
          addTestResult(
            `Team Selection - ${player.name}`,
            data.teamId === player.team
          );

          // If this is the creator and last player, start the game
          if (client.isCreator && index === TEST_PLAYERS.length - 1) {
            setTimeout(() => {
              client.emit("kr-start-game");
            }, 1000);
          }
        }
      });

      client.on("kr-game-started", (data) => {
        if (client.isCreator) {
          addTestResult(
            "Game Start",
            data.gameState && data.gameState.phase === "playing"
          );

          // Test submitting an answer
          setTimeout(() => {
            client.emit("kr-submit-answer", { answerIndex: 0 });
          }, 1000);
        }
      });

      client.on("kr-answer-result", (data) => {
        if (data.answeredBy === player.name) {
          addTestResult(
            `Answer Submission - ${player.name}`,
            data.hasOwnProperty("correct")
          );
        }
      });

      client.on("kr-pass-used", (data) => {
        addTestResult("Pass Usage", data.passed === true);
      });

      client.on("kr-timer-update", (data) => {
        if (!client.timerTested) {
          addTestResult("Timer Update", typeof data.timer === "number");
          client.timerTested = true;
        }
      });

      client.on("kr-leaderboard", (data) => {
        addTestResult("Leaderboard", Array.isArray(data.leaderboard));
        completedTests++;

        if (completedTests >= totalSocketTests) {
          // Clean up and resolve
          clients.forEach((c) => c.disconnect());
          resolve();
        }
      });

      client.on("kr-error", (data) => {
        log(`Socket error for ${player.name}: ${data.message}`, "error");
      });

      client.on("disconnect", () => {
        log(`Client ${player.name} disconnected`);
      });

      // Test leaderboard after a delay
      setTimeout(() => {
        client.emit("kr-get-leaderboard");
      }, 3000);
    });

    // Test pass usage with second client
    setTimeout(() => {
      if (clients[1]) {
        clients[1].emit("kr-use-pass");
      }
    }, 2000);

    // Cleanup after timeout
    setTimeout(() => {
      clients.forEach((c) => c.disconnect());
      if (completedTests < totalSocketTests) {
        addTestResult(
          "Socket.IO Tests",
          false,
          "Timeout waiting for all tests to complete"
        );
        resolve();
      }
    }, 10000);
  });
};

// Performance Tests
const testPerformance = async () => {
  log("Starting performance tests...");

  const startTime = Date.now();

  try {
    // Test concurrent room creation
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(fetch(`${API_BASE}/generate-room-id`));
    }

    await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    addTestResult(
      "Concurrent Room Generation",
      duration < 1000,
      `Took ${duration}ms`
    );

    // Test question validation performance
    const largeQuestionSet = Array(100)
      .fill()
      .map((_, i) => ({
        question: `Test question ${i}?`,
        options: ["A", "B", "C", "D"],
        correctAnswer: 0,
        difficulty: "Easy",
      }));

    const perfStart = Date.now();
    await fetch(`${API_BASE}/validate-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: largeQuestionSet }),
    });
    const perfEnd = Date.now();

    addTestResult(
      "Large Question Set Validation",
      perfEnd - perfStart < 2000,
      `Took ${perfEnd - perfStart}ms`
    );
  } catch (error) {
    addTestResult("Performance Tests", false, error.message);
  }
};

// Game Logic Tests
const testGameLogic = async () => {
  log("Starting game logic tests...");

  const client = ioClient(SERVER_URL, {
    transports: ["websocket"],
    timeout: 5000,
  });

  return new Promise((resolve) => {
    let gameState = null;

    client.on("connect", () => {
      client.emit("kr-join-room", {
        roomId: "LOGIC_TEST",
        playerName: "LogicTester",
      });
    });

    client.on("kr-room-joined", (data) => {
      gameState = data.gameState;

      // Test initial game state
      addTestResult(
        "Initial Game State",
        gameState.phase === "team_selection" &&
          Object.keys(gameState.teams).length === 4
      );

      // Test team selection
      client.emit("kr-select-team", { teamId: "A" });
    });

    client.on("kr-team-selected", (data) => {
      // Test team membership
      addTestResult(
        "Team Membership",
        data.teamId === "A" && data.playerName === "LogicTester"
      );

      // Test game start
      client.emit("kr-start-game");
    });

    client.on("kr-game-started", (data) => {
      gameState = data.gameState;

      // Test game transition to playing
      addTestResult("Game Phase Transition", gameState.phase === "playing");

      // Test question availability
      addTestResult(
        "Current Question Available",
        data.currentQuestion && data.currentQuestion.question
      );

      // Test timer initialization
      addTestResult(
        "Timer Initialization",
        gameState.timer === 30 && gameState.isTimerActive
      );

      // Clean up and resolve
      client.disconnect();
      resolve();
    });

    client.on("kr-error", (data) => {
      addTestResult("Game Logic Error Handling", false, data.message);
      client.disconnect();
      resolve();
    });

    // Timeout protection
    setTimeout(() => {
      client.disconnect();
      resolve();
    }, 8000);
  });
};

// Main test runner
const runTests = async () => {
  log("🚀 Starting Knowledge Relay Backend Test Suite");
  log("================================================");

  try {
    await testRESTAPI();
    await sleep(1000);

    await testSocketIO();
    await sleep(1000);

    await testPerformance();
    await sleep(1000);

    await testGameLogic();
  } catch (error) {
    log(`Test suite error: ${error.message}`, "error");
  }

  // Print results summary
  log("\n📊 Test Results Summary:");
  log("========================");

  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => r.passed === false).length;
  const total = testResults.length;

  log(`Total Tests: ${total}`);
  log(`Passed: ${passed}`, "success");
  log(`Failed: ${failed}`, failed > 0 ? "error" : "info");
  log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    log("\n❌ Failed Tests:");
    testResults
      .filter((r) => !r.passed)
      .forEach((test) => {
        log(`  - ${test.testName}: ${test.message}`, "error");
      });
  }

  log("\n🏁 Test suite completed");
  process.exit(failed > 0 ? 1 : 0);
};

// Handle process termination
process.on("SIGINT", () => {
  log("Test suite interrupted");
  process.exit(1);
});

process.on("SIGTERM", () => {
  log("Test suite terminated");
  process.exit(1);
});

// Run the tests
if (process.argv[2] !== "--no-run") {
  runTests().catch((error) => {
    log(`Fatal test error: ${error.message}`, "error");
    process.exit(1);
  });
}

export { runTests, testRESTAPI, testSocketIO, testPerformance, testGameLogic };
