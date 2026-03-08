#!/usr/bin/env node

/**
 * Knowledge Relay Backend Setup and Test Runner
 *
 * This script helps set up and test the Knowledge Relay backend.
 * It can:
 * - Start the development server
 * - Run the test suite
 * - Check dependencies
 * - Generate sample data
 */

import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const log = (message, color = "reset") => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Check if required dependencies are installed
const checkDependencies = async () => {
  log("🔍 Checking dependencies...", "blue");

  try {
    const packageJsonPath = path.join(projectRoot, "package.json");
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));

    const requiredDeps = ["express", "socket.io", "cors", "dotenv"];

    const missingDeps = requiredDeps.filter(
      (dep) =>
        !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
    );

    if (missingDeps.length > 0) {
      log(`❌ Missing dependencies: ${missingDeps.join(", ")}`, "red");
      log("💡 Run: npm install", "yellow");
      return false;
    }

    log("✅ All dependencies are installed", "green");
    return true;
  } catch (error) {
    log(`❌ Error checking dependencies: ${error.message}`, "red");
    return false;
  }
};

// Check if server is running
const isServerRunning = async (port = 3000) => {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    return stdout.trim().length > 0;
  } catch (error) {
    return false;
  }
};

// Start the development server
const startServer = async () => {
  log("🚀 Starting Knowledge Relay backend server...", "blue");

  const serverRunning = await isServerRunning();
  if (serverRunning) {
    log("⚠️  Server is already running on port 3000", "yellow");
    return;
  }

  try {
    process.chdir(projectRoot);

    const serverProcess = spawn("npm", ["run", "dev"], {
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "development" },
    });

    serverProcess.on("error", (error) => {
      log(`❌ Failed to start server: ${error.message}`, "red");
    });

    serverProcess.on("exit", (code) => {
      if (code !== 0) {
        log(`❌ Server exited with code ${code}`, "red");
      }
    });

    // Wait a bit for server to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const running = await isServerRunning();
    if (running) {
      log("✅ Server started successfully on port 3000", "green");
      log(
        "🌐 API available at: http://localhost:3000/api/knowledge-relay",
        "cyan"
      );
    } else {
      log("❌ Server failed to start or not responding", "red");
    }
  } catch (error) {
    log(`❌ Error starting server: ${error.message}`, "red");
  }
};

// Run the test suite
const runTests = async () => {
  log("🧪 Running Knowledge Relay test suite...", "blue");

  const serverRunning = await isServerRunning();
  if (!serverRunning) {
    log("❌ Server is not running. Please start the server first.", "red");
    log("💡 Run: npm run setup -- --start-server", "yellow");
    return;
  }

  try {
    process.chdir(projectRoot);

    const testProcess = spawn("node", ["src/scripts/test-knowledge-relay.js"], {
      stdio: "inherit",
    });

    return new Promise((resolve) => {
      testProcess.on("exit", (code) => {
        if (code === 0) {
          log("✅ All tests passed!", "green");
        } else {
          log("❌ Some tests failed", "red");
        }
        resolve(code === 0);
      });

      testProcess.on("error", (error) => {
        log(`❌ Test runner error: ${error.message}`, "red");
        resolve(false);
      });
    });
  } catch (error) {
    log(`❌ Error running tests: ${error.message}`, "red");
    return false;
  }
};

// Generate sample questions for testing
const generateSampleQuestions = async () => {
  log("📝 Generating sample questions...", "blue");

  const sampleQuestions = [
    {
      id: 1,
      question: "What is the most secure type of wireless encryption?",
      options: ["WEP", "WPA", "WPA2", "WPA3"],
      correctAnswer: 3,
      category: "Network Security",
      difficulty: "Medium",
      points: 2,
    },
    {
      id: 2,
      question: "What does SQL injection target?",
      options: [
        "Network protocols",
        "Database queries",
        "Email servers",
        "File systems",
      ],
      correctAnswer: 1,
      category: "Web Security",
      difficulty: "Hard",
      points: 3,
    },
    {
      id: 3,
      question: "What is social engineering?",
      options: [
        "A programming technique",
        "A network protocol",
        "Manipulating people to reveal information",
        "A type of malware",
      ],
      correctAnswer: 2,
      category: "Social Engineering",
      difficulty: "Easy",
      points: 1,
    },
  ];

  try {
    const outputPath = path.join(projectRoot, "sample-questions.json");
    await fs.writeFile(outputPath, JSON.stringify(sampleQuestions, null, 2));
    log(`✅ Sample questions generated: ${outputPath}`, "green");
  } catch (error) {
    log(`❌ Error generating sample questions: ${error.message}`, "red");
  }
};

// Show usage information
const showUsage = () => {
  log("🎮 Knowledge Relay Backend Setup", "bright");
  log("================================", "bright");
  log("");
  log("Usage: npm run setup [OPTIONS]", "yellow");
  log("");
  log("Options:");
  log("  --check-deps     Check if all dependencies are installed");
  log("  --start-server   Start the development server");
  log("  --run-tests      Run the test suite");
  log("  --generate-data  Generate sample questions");
  log("  --all            Run all setup steps");
  log("  --help           Show this help message");
  log("");
  log("Examples:");
  log("  npm run setup -- --start-server");
  log("  npm run setup -- --run-tests");
  log("  npm run setup -- --all");
  log("");
  log("API Endpoints:");
  log("  GET  /api/knowledge-relay/health");
  log("  GET  /api/knowledge-relay/questions");
  log("  GET  /api/knowledge-relay/teams");
  log("  POST /api/knowledge-relay/validate-questions");
  log("");
  log("Socket.IO Events:");
  log("  kr-join-room, kr-select-team, kr-start-game");
  log("  kr-submit-answer, kr-use-pass, kr-get-leaderboard");
  log("");
};

// Check server status
const checkServerStatus = async () => {
  log("🔍 Checking server status...", "blue");

  const running = await isServerRunning();
  if (running) {
    log("✅ Server is running on port 3000", "green");

    try {
      const { stdout } = await execAsync(
        "curl -s http://localhost:3000/api/knowledge-relay/health"
      );
      const health = JSON.parse(stdout);
      if (health.success) {
        log("✅ API is responding correctly", "green");
      } else {
        log("⚠️  API responded but with errors", "yellow");
      }
    } catch (error) {
      log("⚠️  Server running but API not responding", "yellow");
    }
  } else {
    log("❌ Server is not running", "red");
    log("💡 Start with: npm run setup -- --start-server", "yellow");
  }
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.length === 0) {
    showUsage();
    return;
  }

  log("🎮 Knowledge Relay Backend Setup", "bright");
  log("================================", "bright");

  if (args.includes("--check-deps") || args.includes("--all")) {
    const depsOk = await checkDependencies();
    if (!depsOk && !args.includes("--all")) {
      process.exit(1);
    }
  }

  if (args.includes("--start-server") || args.includes("--all")) {
    await startServer();
  }

  if (args.includes("--check-status")) {
    await checkServerStatus();
  }

  if (args.includes("--generate-data") || args.includes("--all")) {
    await generateSampleQuestions();
  }

  if (args.includes("--run-tests") || args.includes("--all")) {
    const testsOk = await runTests();
    if (!testsOk) {
      process.exit(1);
    }
  }

  log("");
  log("🎉 Setup completed!", "green");
  log("💡 Next steps:", "cyan");
  log("   1. Start the frontend: cd ../frontend && npm start");
  log("   2. Navigate to Knowledge Relay in the app");
  log("   3. Test multiplayer functionality");
};

// Handle process signals
process.on("SIGINT", () => {
  log("\n👋 Setup interrupted", "yellow");
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("\n👋 Setup terminated", "yellow");
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  log(`💥 Fatal error: ${error.message}`, "red");
  process.exit(1);
});

export {
  checkDependencies,
  startServer,
  runTests,
  generateSampleQuestions,
  checkServerStatus,
};
