// Test script to verify the new "no cards remaining" game end condition
import { DigitalDefendersGame } from "./src/models/DigitalDefenders.js";

async function testNoCardsGameEnd() {
  console.log("🧪 Testing Digital Defenders no-cards game end condition...\n");

  // Create a test game with 2 players
  const game = new DigitalDefendersGame("TEST", "player1", "Player One", 2);
  await game.loadQuestions();

  // Add a second player
  const player2Result = game.addPlayer("player2", "Player Two");
  console.log("✅ Added second player:", player2Result.success);

  // Start the game
  game.startGame();
  console.log("✅ Game started with state:", game.gameState);

  // Manually set up a scenario where players have no cards and deck is empty
  console.log("\n🎯 Setting up no-cards scenario...");

  // Empty the deck
  game.deck = [];
  console.log("📦 Deck emptied, size:", game.deck.length);

  // Empty all player hands
  game.playerHands.set("player1", []);
  game.playerHands.set("player2", []);
  console.log("🃏 All player hands emptied");
  console.log("Player 1 hand size:", game.playerHands.get("player1").length);
  console.log("Player 2 hand size:", game.playerHands.get("player2").length);

  // Test the checkNoCardsGameEnd method
  console.log("\n🔍 Testing checkNoCardsGameEnd...");
  const gameEndCheck = game.checkNoCardsGameEnd();

  console.log("Game End Check Results:");
  console.log("- Should End:", gameEndCheck.shouldEnd);
  console.log("- Reason:", gameEndCheck.reason);
  console.log("- Game State:", game.gameState);

  if (gameEndCheck.shouldEnd) {
    console.log("- Winner:", gameEndCheck.winner?.playerName || "None (tie)");
    console.log("- Is Tie:", gameEndCheck.isTie);
    console.log("- Final Wave:", gameEndCheck.finalWave);
    console.log("- Final Health:", gameEndCheck.finalHealth);

    console.log("\n📊 Player Stats:");
    gameEndCheck.playerStats.forEach((player, index) => {
      console.log(`${index + 1}. ${player.playerName}: ${player.score} points`);
      console.log(`   - Waves Completed: ${player.wavesCompleted}`);
      console.log(`   - Health Remaining: ${player.healthRemaining}`);
    });

    if (gameEndCheck.tiedPlayers.length > 0) {
      console.log("\n🤝 Tied Players:");
      gameEndCheck.tiedPlayers.forEach((player) => {
        console.log(`- ${player.playerName}: ${player.score} points`);
      });
    }
  }

  console.log("\n✅ Test completed successfully!");
}

// Test scenario where players still have cards (should not end)
async function testStillHasCards() {
  console.log("\n🧪 Testing scenario where players still have cards...\n");

  const game = new DigitalDefendersGame("TEST2", "player1", "Player One", 2);
  await game.loadQuestions();

  game.addPlayer("player2", "Player Two");
  game.startGame();

  // Leave one card in a player's hand
  game.deck = [];
  game.playerHands.set("player1", [
    { id: 1, name: "Test Card", type: "answer" },
  ]);
  game.playerHands.set("player2", []);

  const gameEndCheck = game.checkNoCardsGameEnd();

  console.log("Game End Check Results (should NOT end):");
  console.log("- Should End:", gameEndCheck.shouldEnd);

  if (!gameEndCheck.shouldEnd) {
    console.log(
      "✅ Correctly identified game should continue - player still has cards"
    );
  } else {
    console.log("❌ Error: Game ended when it should continue");
  }
}

// Test scenario where deck still has cards (should not end)
async function testDeckHasCards() {
  console.log("\n🧪 Testing scenario where deck still has cards...\n");

  const game = new DigitalDefendersGame("TEST3", "player1", "Player One", 2);
  await game.loadQuestions();

  game.addPlayer("player2", "Player Two");
  game.startGame();

  // Leave cards in deck but empty hands
  game.deck = [{ id: 1, name: "Test Card", type: "answer" }];
  game.playerHands.set("player1", []);
  game.playerHands.set("player2", []);

  const gameEndCheck = game.checkNoCardsGameEnd();

  console.log("Game End Check Results (should NOT end):");
  console.log("- Should End:", gameEndCheck.shouldEnd);

  if (!gameEndCheck.shouldEnd) {
    console.log(
      "✅ Correctly identified game should continue - deck still has cards"
    );
  } else {
    console.log("❌ Error: Game ended when it should continue");
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testNoCardsGameEnd();
    await testStillHasCards();
    await testDeckHasCards();
    console.log("\n🎉 All tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

runAllTests();
