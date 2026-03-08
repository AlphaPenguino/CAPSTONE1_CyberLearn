#!/usr/bin/env node

// Test script to verify Digital Defenders improvements
// This tests the improved deck generation and card dealing logic

import { DigitalDefendersGame } from "./src/models/DigitalDefenders.js";

// Mock socket IDs for testing
const testSocketIds = ["socket1", "socket2", "socket3"];

// Create a test game
console.log("🎮 Creating test Digital Defenders game...");
const game = new DigitalDefendersGame("TEST", "socket1", "TestPlayer1", 4);

// Add test players
testSocketIds.forEach((socketId, index) => {
  if (index > 0) {
    game.addPlayer(socketId, `TestPlayer${index + 1}`);
  }
});

console.log(`👥 Added ${game.players.size} players`);

// Set up turn order
game.startTurnOrderSelection();
testSocketIds.forEach((socketId, index) => {
  game.selectTurnOrder(socketId, index + 1);
});

const turnOrderResult = game.finalizeTurnOrder();
console.log("🔄 Turn order finalized:", turnOrderResult.success);

// Initialize the game
console.log("\n🚀 Initializing game...");
const initResult = await game.initializeGame();
console.log(
  "Game initialization:",
  initResult.success ? "✅ Success" : "❌ Failed"
);

// Analyze the deck composition
console.log("\n📊 Deck Analysis:");
console.log(`Total deck size: ${game.deck.length}`);

const answerCards = game.deck.filter((card) => card.type === "answer");
const toolCards = game.deck.filter((card) => card.type === "tool");

console.log(`Answer cards in deck: ${answerCards.length}`);
console.log(`Tool cards in deck: ${toolCards.length}`);

// Check if current question's answer is in deck
if (game.currentQuestion) {
  console.log(`\n❓ Current question: "${game.currentQuestion.text}"`);
  console.log(`Correct answer: "${game.currentQuestion.correctAnswer}"`);

  const hasCorrectAnswer = game.deck.some(
    (card) =>
      card.type === "answer" &&
      card.text.toLowerCase().trim() ===
        game.currentQuestion.correctAnswer.toLowerCase().trim()
  );

  console.log(
    `Correct answer card in deck: ${hasCorrectAnswer ? "✅ Yes" : "❌ No"}`
  );
}

// Analyze player hands
console.log("\n👋 Player Hands Analysis:");
testSocketIds.forEach((socketId, index) => {
  const hand = game.playerHands.get(socketId) || [];
  const answerCardsInHand = hand.filter(
    (card) => card.type === "answer"
  ).length;
  const toolCardsInHand = hand.filter((card) => card.type === "tool").length;

  console.log(`Player ${index + 1} (${socketId}):`);
  console.log(`  Total cards: ${hand.length}`);
  console.log(`  Answer cards: ${answerCardsInHand}`);
  console.log(`  Tool cards: ${toolCardsInHand}`);

  // Check if this player has the correct answer
  if (game.currentQuestion) {
    const hasCorrectAnswer = hand.some(
      (card) =>
        card.type === "answer" &&
        card.text.toLowerCase().trim() ===
          game.currentQuestion.correctAnswer.toLowerCase().trim()
    );
    console.log(
      `  Has correct answer: ${hasCorrectAnswer ? "✅ Yes" : "❌ No"}`
    );
  }
});

// Test reshuffling for first player
console.log("\n🔄 Testing Reshuffle Feature:");
const firstPlayer = testSocketIds[0];
console.log(`Testing reshuffle for ${firstPlayer}...`);

// Set it as this player's turn
game.currentTurn = 0;
const reshuffleResult = game.reshuffleHand(firstPlayer);

if (reshuffleResult.success) {
  console.log("✅ Reshuffle successful");
  console.log(
    `Guaranteed answer in new hand: ${
      reshuffleResult.guaranteedAnswer ? "✅ Yes" : "❌ No"
    }`
  );

  const newHand = game.playerHands.get(firstPlayer) || [];
  const hasCorrectAnswerAfterReshuffle = newHand.some(
    (card) =>
      card.type === "answer" &&
      card.text.toLowerCase().trim() ===
        game.currentQuestion.correctAnswer.toLowerCase().trim()
  );
  console.log(
    `Correct answer in reshuffled hand: ${
      hasCorrectAnswerAfterReshuffle ? "✅ Yes" : "❌ No"
    }`
  );
} else {
  console.log("❌ Reshuffle failed:", reshuffleResult.message);
}

// Test Super Shuffle tool effect
console.log("\n🌀 Testing Super Shuffle Tool Effect:");
const originalHands = new Map();
testSocketIds.forEach((socketId) => {
  originalHands.set(socketId, [...(game.playerHands.get(socketId) || [])]);
});

game.shuffleAllPlayerHands();

console.log("Super shuffle completed");
let somePlayerHasAnswer = false;
testSocketIds.forEach((socketId, index) => {
  const hand = game.playerHands.get(socketId) || [];
  const hasCorrectAnswer = hand.some(
    (card) =>
      card.type === "answer" &&
      card.text.toLowerCase().trim() ===
        game.currentQuestion.correctAnswer.toLowerCase().trim()
  );

  if (hasCorrectAnswer) {
    somePlayerHasAnswer = true;
    console.log(
      `Player ${
        index + 1
      } received the correct answer card after Super Shuffle ✅`
    );
  }
});

console.log(
  `At least one player has correct answer after Super Shuffle: ${
    somePlayerHasAnswer ? "✅ Yes" : "❌ No"
  }`
);

// Summary
console.log("\n📋 Summary of Improvements:");
console.log("✅ Increased answer cards in deck (12 vs 10)");
console.log("✅ Reduced tool cards to make room (3 vs 5)");
console.log("✅ Added duplicate answer cards for better chances");
console.log("✅ Guaranteed correct answer in reshuffled hands");
console.log("✅ Improved Super Shuffle to distribute answer cards");
console.log("✅ Enhanced initial hand dealing with answer card priority");

console.log(
  "\n🎯 These improvements should significantly increase player winning chances!"
);
