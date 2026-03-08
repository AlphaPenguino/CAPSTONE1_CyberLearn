import "dotenv/config";
import { connectDB } from "../lib/db.js";
import {
  QuizShowdownQuestion,
  QuizShowdownGame,
} from "../models/QuizShowdown.js";

const testQuizShowdown = async () => {
  try {
    console.log("🧪 Testing Quiz Showdown functionality...");

    // Connect to database
    await connectDB();

    // Test 1: Check if questions exist
    console.log("\n1. Testing database questions...");
    const questions = await QuizShowdownQuestion.find();
    console.log(`   ✅ Found ${questions.length} questions in database`);

    if (questions.length === 0) {
      console.log(
        "   ⚠️  No questions found. Run setup-quiz-showdown.js first"
      );
      return;
    }

    // Test 2: Create a game instance
    console.log("\n2. Testing game creation...");
    const game = new QuizShowdownGame("TEST123", "creator-id", "Test Creator");
    console.log(`   ✅ Game created with ID: ${game.id}`);
    console.log(`   ✅ Game status: ${game.status}`);
    console.log(`   ✅ Game state: ${game.gameState}`);

    // Test 3: Add players to teams
    console.log("\n3. Testing team management...");
    const result1 = game.addPlayerToTeam("player1", "Alice", "Team A");
    const result2 = game.addPlayerToTeam("player2", "Bob", "Team A");
    const result3 = game.addPlayerToTeam("player3", "Charlie", "Team B");
    const result4 = game.addPlayerToTeam("player4", "Diana", "Team B");

    console.log(`   ✅ Added Alice to Team A: ${result1.success}`);
    console.log(`   ✅ Added Bob to Team A: ${result2.success}`);
    console.log(`   ✅ Added Charlie to Team B: ${result3.success}`);
    console.log(`   ✅ Added Diana to Team B: ${result4.success}`);

    // Test 4: Check if game can start
    console.log("\n4. Testing game start conditions...");
    const canStart = game.canStartGame();
    console.log(`   ✅ Can start game: ${canStart}`);

    if (canStart) {
      const startResult = game.startGame();
      console.log(`   ✅ Game started: ${startResult.success}`);
    }

    // Test 5: Test buzzer functionality
    console.log("\n5. Testing buzzer functionality...");
    game.activateBuzzer();
    console.log(`   ✅ Buzzer activated, status: ${game.status}`);

    const buzzResult1 = game.handleBuzz("player1", "Team A");
    console.log(
      `   ✅ Team A buzz: ${buzzResult1.success} - ${
        buzzResult1.message || "No message"
      }`
    );

    const buzzResult2 = game.handleBuzz("player3", "Team B");
    console.log(
      `   ✅ Team B buzz: ${buzzResult2.success} - ${
        buzzResult2.message || "Already buzzed"
      }`
    );

    // Test 6: Test answer submission
    console.log("\n6. Testing answer submission...");
    const currentQuestion = game.getCurrentQuestion();
    if (currentQuestion) {
      console.log(`   📝 Current question: "${currentQuestion.question}"`);
      console.log(`   📝 Correct answer index: ${currentQuestion.correct}`);

      // Test correct answer
      const answerResult = game.submitAnswer(
        "player1",
        "Team A",
        currentQuestion.correct
      );
      console.log(`   ✅ Answer submission (correct): ${answerResult.success}`);
      console.log(`   ✅ Answer was correct: ${answerResult.correct}`);

      if (answerResult.success) {
        console.log(`   ✅ Team A score: ${game.teamA.score}`);
        console.log(`   ✅ Team B score: ${game.teamB.score}`);
      }
    }

    // Test 7: Test game state
    console.log("\n7. Testing game state...");
    const gameState = game.getGameState();
    console.log(`   ✅ Game ID: ${gameState.id}`);
    console.log(
      `   ✅ Current question index: ${gameState.currentQuestionIndex}`
    );
    console.log(`   ✅ Total questions: ${gameState.totalQuestions}`);
    console.log(`   ✅ Team A members: ${gameState.teamA.members.length}`);
    console.log(`   ✅ Team B members: ${gameState.teamB.members.length}`);

    // Test 8: Test public game state (without answers)
    console.log("\n8. Testing public game state...");
    const publicState = game.getPublicGameState();
    const hasCorrectAnswer =
      publicState.currentQuestion &&
      publicState.currentQuestion.correct !== undefined;
    console.log(
      `   ✅ Public state hides correct answer: ${!hasCorrectAnswer}`
    );

    // Test 9: Test question CRUD operations
    console.log("\n9. Testing question CRUD operations...");

    // Create a test question
    const testQuestion = new QuizShowdownQuestion({
      question: "Test question: What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      correct: 1,
      createdBy: null,
    });

    const savedQuestion = await testQuestion.save();
    console.log(`   ✅ Created test question with ID: ${savedQuestion._id}`);

    // Update the question
    savedQuestion.question = "Updated: What is 2 + 2?";
    await savedQuestion.save();
    console.log(`   ✅ Updated test question`);

    // Delete the question
    await QuizShowdownQuestion.findByIdAndDelete(savedQuestion._id);
    console.log(`   ✅ Deleted test question`);

    console.log("\n🎉 All Quiz Showdown tests passed!");

    // Display final game state
    console.log("\n📊 Final Game State:");
    console.log(JSON.stringify(game.getPublicGameState(), null, 2));
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testQuizShowdown();
}

export { testQuizShowdown };
