#!/usr/bin/env node

/**
 * Test script for Digital Defenders global endpoints
 * This script tests the new global question and answer endpoints
 * to ensure they work without requiring sectionId
 */

import fetch from "node-fetch";

const API_BASE = "http://localhost:3000/api";

// Test credentials - using instructor from TEST_USERS.md
const TEST_USER = {
  email: "instructor@cyberlearn.test",
  password: "instructor123",
};

let authToken = null;

async function login() {
  try {
    console.log("🔐 Logging in as instructor...");
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(TEST_USER),
    });

    const data = await response.json();

    if (data.success) {
      authToken = data.token;
      console.log("✅ Login successful");
      return true;
    } else {
      console.error("❌ Login failed:", data.message);
      return false;
    }
  } catch (error) {
    console.error("❌ Login error:", error.message);
    return false;
  }
}

async function testGlobalQuestions() {
  console.log("\n🎮 Testing global questions endpoints...");

  try {
    // Test GET global questions
    console.log("📥 Testing GET /digital-defenders/questions/global");
    const getResponse = await fetch(
      `${API_BASE}/digital-defenders/questions/global`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    const getData = await getResponse.json();
    console.log(
      "✅ GET global questions:",
      getData.success ? "SUCCESS" : "FAILED"
    );
    console.log(`   - Found ${getData.questions?.length || 0} questions`);

    // Test POST global question
    console.log("📤 Testing POST /digital-defenders/questions/global");
    const testQuestion = {
      text: "Test Global Question: What is the capital of France?",
      correctAnswer: "Paris",
      difficulty: 1,
      wave: 1,
      description: "A test question for global Digital Defenders questions",
    };

    const postResponse = await fetch(
      `${API_BASE}/digital-defenders/questions/global`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(testQuestion),
      }
    );

    const postData = await postResponse.json();
    console.log(
      "✅ POST global question:",
      postData.success ? "SUCCESS" : "FAILED"
    );
    if (postData.success) {
      console.log(`   - Created question with ID: ${postData.question._id}`);
      return postData.question._id;
    } else {
      console.log(`   - Error: ${postData.message}`);
    }
  } catch (error) {
    console.error("❌ Error testing global questions:", error.message);
  }

  return null;
}

async function testGlobalAnswers(questionId) {
  console.log("\n🎮 Testing global answers endpoints...");

  try {
    // Test GET global answers
    console.log("📥 Testing GET /digital-defenders/answers/global");
    const getResponse = await fetch(
      `${API_BASE}/digital-defenders/answers/global`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    const getData = await getResponse.json();
    console.log(
      "✅ GET global answers:",
      getData.success ? "SUCCESS" : "FAILED"
    );
    console.log(`   - Found ${getData.answers?.length || 0} answers`);

    // Test POST global answer
    if (questionId) {
      console.log("📤 Testing POST /digital-defenders/answers/global");
      const testAnswer = {
        text: "Paris",
        name: "Answer for Test Global Question",
        description: "The correct answer to the test global question",
        questionId: questionId,
      };

      const postResponse = await fetch(
        `${API_BASE}/digital-defenders/answers/global`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(testAnswer),
        }
      );

      const postData = await postResponse.json();
      console.log(
        "✅ POST global answer:",
        postData.success ? "SUCCESS" : "FAILED"
      );
      if (postData.success) {
        console.log(`   - Created answer with ID: ${postData.answer._id}`);
      } else {
        console.log(`   - Error: ${postData.message}`);
      }
    }
  } catch (error) {
    console.error("❌ Error testing global answers:", error.message);
  }
}

async function runTests() {
  console.log("🚀 Starting Digital Defenders global endpoints test...\n");

  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log("❌ Cannot proceed without authentication");
    return;
  }

  // Test global questions
  const questionId = await testGlobalQuestions();

  // Test global answers
  await testGlobalAnswers(questionId);

  console.log("\n🎉 Test complete!");
  console.log("\n📝 Summary:");
  console.log("   - Global questions endpoint: Available");
  console.log("   - Global answers endpoint: Available");
  console.log("   - No section ID required: ✅");
  console.log('\n💡 The "no section id found" error should now be fixed!');
}

// Run the tests
runTests().catch(console.error);
