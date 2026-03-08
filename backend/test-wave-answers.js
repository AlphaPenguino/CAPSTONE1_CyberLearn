import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Connect to database
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.DB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

// Import the Digital Defenders model
async function testWaveAnswerGeneration() {
  try {
    const { DigitalDefendersGame } = await import(
      "./src/models/DigitalDefenders.js"
    );

    console.log("🧪 Testing Wave Answer Generation...\n");

    // Create a test game instance
    const game = new DigitalDefendersGame(
      "test-room",
      "test-socket",
      "Test Player"
    );

    // Load questions and answers from database
    await game.loadQuestions();
    await game.loadAnswers();

    console.log("📊 Questions loaded:", game.questionsForWaves.length);
    console.log("📊 Database answers loaded:", game.answersFromDatabase.length);

    // Generate the game deck
    const gameDeck = game.generateGameDeck();

    console.log("\n🎴 Generated Game Deck:");
    console.log("Total cards:", gameDeck.length);

    // Show answer cards and their corresponding waves
    console.log("\n🎯 Answer Cards in Deck:");
    gameDeck.forEach((card, index) => {
      console.log(`${index + 1}. "${card.text}" (${card.name})`);

      // Check if this answer matches any question
      const matchingQuestions = game.questionsForWaves.filter(
        (q) =>
          q.correctAnswer.toLowerCase().trim() ===
          card.text.toLowerCase().trim()
      );

      if (matchingQuestions.length > 0) {
        console.log(
          `   → Matches question(s) in wave(s): ${matchingQuestions
            .map((q) => q.wave)
            .join(", ")}`
        );
      } else {
        console.log("   → No matching questions found");
      }
    });

    // Check coverage for each wave
    console.log("\n🌊 Wave Coverage Analysis:");
    for (let wave = 1; wave <= 5; wave++) {
      const waveQuestions = game.questionsForWaves.filter(
        (q) => q.wave === wave
      );
      const answeredQuestions = waveQuestions.filter((q) =>
        gameDeck.some(
          (card) =>
            card.text.toLowerCase().trim() ===
            q.correctAnswer.toLowerCase().trim()
        )
      );

      console.log(
        `Wave ${wave}: ${answeredQuestions.length}/${waveQuestions.length} questions can be answered`
      );

      if (waveQuestions.length > 0) {
        waveQuestions.forEach((q) => {
          const hasAnswer = gameDeck.some(
            (card) =>
              card.text.toLowerCase().trim() ===
              q.correctAnswer.toLowerCase().trim()
          );
          console.log(
            `  ${hasAnswer ? "✅" : "❌"} "${q.text}" → "${q.correctAnswer}"`
          );
        });
      }
    }

    console.log("\n✅ Wave answer generation test completed!");
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

async function main() {
  await connectDB();
  await testWaveAnswerGeneration();
  await mongoose.disconnect();
  console.log("🔌 Disconnected from MongoDB");
}

main().catch(console.error);
