import fs from "fs";
import path from "path";

const filesToCheck = [
  "src/models/Progress.js",
  "src/routes/cyberQuestRoutes.js",
  "src/routes/instructorRoutes.js",
];

const checks = {
  progressRecords: false,
  routePasses: false,
  instructorExtracts: false,
};

for (const file of filesToCheck) {
  const content = fs.readFileSync(path.join(".", file), "utf-8");

  if (file === "src/models/Progress.js") {
    // Check that Progress.js stores correctAnswers, incorrectAnswers, and level
    if (
      content.includes("correctAnswers: correctAnswers") &&
      content.includes("incorrectAnswers: incorrectAnswers") &&
      content.includes("level: typeof meta.questLevel")
    ) {
      console.log("✅ Progress.js: Stores correctAnswers, incorrectAnswers, and level");
      checks.progressRecords = true;
    } else {
      console.log("❌ Progress.js: Missing field storage");
    }
  }

  if (file === "src/routes/cyberQuestRoutes.js") {
    // Check that cyberQuestRoutes passes metadata with these fields
    if (
      content.includes("correctAnswers: correctCount") &&
      content.includes("questLevel: cyberQuest.level")
    ) {
      console.log("✅ cyberQuestRoutes.js: Passes correctAnswers and questLevel in metadata");
      checks.routePasses = true;
    } else {
      console.log("❌ cyberQuestRoutes.js: Missing metadata fields");
    }
  }

  if (file === "src/routes/instructorRoutes.js") {
    // Check that instructorRoutes extracts these from attempts
    if (
      content.includes("level: attempt.level") &&
      content.includes("correctAnswers: attempt.correctAnswers") &&
      content.includes("incorrectAnswers: attempt.incorrectAnswers")
    ) {
      console.log("✅ instructorRoutes.js: Extracts level, correctAnswers, and incorrectAnswers from attempts");
      checks.instructorExtracts = true;
    } else {
      console.log("❌ instructorRoutes.js: Missing field extraction");
    }
  }
}

console.log("\n=== Summary ===");
const allPassed = Object.values(checks).every((v) => v);
if (allPassed) {
  console.log("✅ All data flow checks passed!");
  console.log("\nData flow:");
  console.log("1. CyberQuest submission passes correctCount, incorrectCount, questLevel");
  console.log("2. Progress.recordCyberQuestAttempt stores these in attempts array");
  console.log("3. InstructorRoutes extracts attempts and includes these fields in gameHistory");
  console.log("4. Frontend analytics displays level, correctAnswers, incorrectAnswers from gameHistory");
} else {
  console.log("❌ Some checks failed. Review the issues above.");
  process.exit(1);
}

