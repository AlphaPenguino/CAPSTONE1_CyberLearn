// Test script to verify that CyberQuest XP recording is working after the fix
import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const API_URL = process.env.API_URL || "http://localhost:5000/api";

// Mock cyber quest submission to test XP recording
const testCyberQuestXP = async () => {
  console.log("🎮 Testing CyberQuest XP Recording Fix...");

  try {
    // NOTE: You would need a valid student token to run this test
    // For testing, replace with an actual student token
    const token = "YOUR_STUDENT_TOKEN_HERE";

    if (token === "YOUR_STUDENT_TOKEN_HERE") {
      console.log("ℹ️  To run this test:");
      console.log("1. Start the backend server: npm run dev");
      console.log("2. Log in as a student user and copy the JWT token");
      console.log("3. Replace 'YOUR_STUDENT_TOKEN_HERE' with the actual token");
      console.log(
        "4. Replace 'YOUR_CYBERQUEST_ID_HERE' with a real cyber quest ID"
      );
      console.log("5. Run this test again");
      return;
    }

    // Mock cyber quest submission with answers
    const mockAnswers = [
      { selectedChoiceIndex: 0 }, // First question answer
      { selectedChoiceIndex: 1 }, // Second question answer
      { answer: "console.log" }, // Code missing type answer
    ];

    console.log("📤 Submitting cyber quest attempt...");

    const response = await fetch(
      `${API_URL}/cyber-quests/YOUR_CYBERQUEST_ID_HERE/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers: mockAnswers,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Request failed:", response.status, errorText);
      return;
    }

    const result = await response.json();

    console.log("✅ Cyber Quest submission successful!");
    console.log("📊 Result:", JSON.stringify(result, null, 2));

    // Check if XP was properly recorded
    if (result.success && result.result) {
      const { xpEarned, totalXP, currentLevel, passed } = result.result;

      console.log("🎯 XP Information:");
      console.log(`   • XP Earned: ${xpEarned}`);
      console.log(`   • Total XP: ${totalXP}`);
      console.log(`   • Current Level: ${currentLevel}`);
      console.log(`   • Passed: ${passed}`);

      if (xpEarned && xpEarned > 0) {
        console.log("✅ XP Recording Fix is working!");
        console.log(
          "   The player received XP points for completing the cyber quest."
        );
      } else {
        console.log("⚠️  XP Recording may have an issue:");
        console.log("   The player did not receive XP points.");
      }
    } else {
      console.log("❌ Unexpected response format");
    }
  } catch (error) {
    console.error("💥 Test failed with error:", error.message);
    console.log("🔧 Make sure the backend server is running on", API_URL);
  }
};

// Test Instructions
console.log("🎮 CyberQuest XP Recording Test");
console.log("================================");
console.log(
  "This test verifies that XP points are properly recorded when completing a cyber quest level."
);
console.log("");

testCyberQuestXP();
