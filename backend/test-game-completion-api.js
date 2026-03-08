// Test script to simulate a Knowledge Relay game completion for student1
import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const API_URL = process.env.API_URL || "http://localhost:5000/api";

const testGameCompletion = async () => {
  try {
    // This would normally be the token from the logged-in user
    // For testing, you'll need a valid token for student1
    const token = "YOUR_STUDENT1_TOKEN_HERE"; // Replace with actual token

    const gameData = {
      gameResult: {
        rankings: [
          {
            teamId: "A",
            teamName: "Team Alpha",
            score: 15,
            players: [
              {
                id: "player1",
                name: "John Doe",
                questionsAnswered: 5,
                correctAnswers: 3,
              },
            ],
          },
        ],
        winner: {
          teamId: "A",
          teamName: "Team Alpha",
          score: 15,
        },
        gameStats: {
          totalQuestions: 10,
          questionsAnswered: 10,
          gameDuration: 300000, // 5 minutes
          totalPlayers: 4,
        },
      },
      teamResult: {
        teamId: "A",
        teamName: "Team Alpha",
        score: 15,
        players: [
          {
            id: "player1",
            name: "John Doe",
            questionsAnswered: 5,
            correctAnswers: 3,
          },
        ],
      },
      finalScore: 15,
      gameType: "knowledgeRelay",
      timestamp: new Date().toISOString(),
    };

    console.log("Testing Knowledge Relay game completion tracking...");
    console.log("Game data:", JSON.stringify(gameData, null, 2));

    const response = await fetch(`${API_URL}/knowledge-relay/game/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(gameData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("Success! Game completion tracked:");
      console.log(result);
    } else {
      console.error("Error tracking game completion:");
      console.error(result);
    }
  } catch (error) {
    console.error("Network error:", error.message);
    console.log(
      "\nNote: This test requires a valid authentication token for student1."
    );
    console.log(
      "The frontend fix should automatically call this API when games finish."
    );
  }
};

testGameCompletion();
