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

// Test a full game simulation
async function testFullGameSimulation() {
  try {
    const { DigitalDefendersGame } = await import(
      "./src/models/DigitalDefenders.js"
    );

    console.log("🎮 Testing Full Game Simulation...\n");

    // Create a test game instance
    const game = new DigitalDefendersGame("test-room", "player1", "Player 1");

    // Add more players
    game.addPlayer("player2", "Player 2");
    game.addPlayer("player3", "Player 3");

    // Set up turn order
    game.startTurnOrderSelection();
    game.selectTurnOrder("player1", 1);
    game.selectTurnOrder("player2", 2);
    game.selectTurnOrder("player3", 3);
    game.finalizeTurnOrder();

    // Initialize the game
    console.log("🚀 Initializing game...");
    const initResult = await game.initializeGame();
    console.log("Game initialized:", initResult.success);

    // Check initial deck composition
    console.log("\n🎴 Initial Deck Composition:");
    const answerCards = game.deck.filter((card) => card.type === "answer");
    const toolCards = game.deck.filter((card) => card.type === "tool");
    console.log(`Answer cards: ${answerCards.length}`);
    console.log(`Tool cards: ${toolCards.length}`);
    console.log(`Total cards: ${game.deck.length}`);

    // Show current wave coverage
    const currentWave = game.currentWave;
    const currentWaveQuestions = game.questionsForWaves.filter(
      (q) => q.wave === currentWave
    );
    const currentWaveAnswerableQuestions = currentWaveQuestions.filter((q) =>
      answerCards.some(
        (card) =>
          card.text.toLowerCase().trim() ===
          q.correctAnswer.toLowerCase().trim()
      )
    );

    console.log(`\n🌊 Current Wave (${currentWave}) Coverage:`);
    console.log(`Questions in wave: ${currentWaveQuestions.length}`);
    console.log(
      `Answerable questions: ${currentWaveAnswerableQuestions.length}`
    );
    console.log(
      `Coverage: ${Math.round(
        (currentWaveAnswerableQuestions.length / currentWaveQuestions.length) *
          100
      )}%`
    );

    // Show players' hands
    console.log("\n👥 Players' Hands:");
    for (const [socketId, hand] of game.playerHands.entries()) {
      const player = game.players.get(socketId);
      console.log(`${player.name}: ${hand.length} cards`);
      hand.forEach((card, index) => {
        const cardType = card.type === "answer" ? "📝" : "🔧";
        console.log(`  ${index + 1}. ${cardType} ${card.name || card.text}`);
      });
    }

    // Simulate playing a few rounds to test wave advancement
    console.log("\n🎯 Simulating Game Progression...");

    // Try to answer the current question correctly
    const currentQuestion = game.currentQuestion;
    console.log(`Current Question: "${currentQuestion.text}"`);
    console.log(`Correct Answer: "${currentQuestion.correctAnswer}"`);

    // Find a matching answer card in any player's hand
    let foundMatchingCard = null;
    let playerWithAnswer = null;

    for (const [socketId, hand] of game.playerHands.entries()) {
      const matchingCard = hand.find(
        (card) =>
          card.type === "answer" &&
          card.text.toLowerCase().trim() ===
            currentQuestion.correctAnswer.toLowerCase().trim()
      );

      if (matchingCard) {
        foundMatchingCard = matchingCard;
        playerWithAnswer = socketId;
        break;
      }
    }

    if (foundMatchingCard && playerWithAnswer) {
      console.log(
        `✅ Found matching answer card in ${
          game.players.get(playerWithAnswer).name
        }'s hand!`
      );

      // Simulate playing the card
      const playResult = game.playCard(playerWithAnswer, foundMatchingCard.id);
      console.log(`Play result:`, playResult.success ? "Success" : "Failed");

      if (playResult.waveAdvanced) {
        console.log(`🌊 Advanced to wave ${playResult.newWave}!`);

        // Check new wave coverage
        const newWaveQuestions = game.questionsForWaves.filter(
          (q) => q.wave === playResult.newWave
        );
        const newWaveAnswerCards = game.deck.filter(
          (card) => card.type === "answer"
        );
        const newWaveAnswerableQuestions = newWaveQuestions.filter((q) =>
          newWaveAnswerCards.some(
            (card) =>
              card.text.toLowerCase().trim() ===
              q.correctAnswer.toLowerCase().trim()
          )
        );

        console.log(`\n🌊 New Wave (${playResult.newWave}) Coverage:`);
        console.log(`Questions in wave: ${newWaveQuestions.length}`);
        console.log(
          `Answerable questions: ${newWaveAnswerableQuestions.length}`
        );
        console.log(
          `Coverage: ${Math.round(
            (newWaveAnswerableQuestions.length / newWaveQuestions.length) * 100
          )}%`
        );
      }
    } else {
      console.log(
        `❌ No matching answer card found for current question "${currentQuestion.correctAnswer}"`
      );

      // Show what answer cards are available
      console.log("\n📝 Available Answer Cards in All Hands:");
      for (const [socketId, hand] of game.playerHands.entries()) {
        const answerCardsInHand = hand.filter((card) => card.type === "answer");
        if (answerCardsInHand.length > 0) {
          console.log(`${game.players.get(socketId).name}:`);
          answerCardsInHand.forEach((card) => {
            console.log(`  - "${card.text}"`);
          });
        }
      }
    }

    console.log("\n✅ Full game simulation completed!");
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

async function main() {
  await connectDB();
  await testFullGameSimulation();
  await mongoose.disconnect();
  console.log("🔌 Disconnected from MongoDB");
}

main().catch(console.error);
