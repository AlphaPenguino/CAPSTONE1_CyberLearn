/**
 * Test script to verify that instructors can delete global Digital Defenders questions
 * This tests the authorization fix for issue: "Not authorized to delete this question"
 */

import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = "http://localhost:3000/api";

// Test function to login and get token
async function loginUser(username, password) {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();
    return data.success ? data.token : null;
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
}

// Test function to get global questions
async function getGlobalQuestions(token) {
  try {
    const response = await fetch(
      `${BASE_URL}/digital-defenders/questions/global`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    return data.success ? data.questions : [];
  } catch (error) {
    console.error("Error fetching global questions:", error);
    return [];
  }
}

// Test function to attempt question deletion
async function deleteQuestion(questionId, token) {
  try {
    const response = await fetch(
      `${BASE_URL}/digital-defenders/questions/${questionId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    return {
      success: data.success,
      message: data.message,
      status: response.status,
    };
  } catch (error) {
    console.error("Error deleting question:", error);
    return { success: false, message: error.message, status: 500 };
  }
}

// Main test function
async function testDeleteAuthorization() {
  console.log(
    "🧪 Testing Digital Defenders question deletion authorization...\n"
  );

  // Test with instructor account (you may need to adjust these credentials)
  const instructorToken = await loginUser("instructor", "instructor123");

  if (!instructorToken) {
    console.log(
      "❌ Could not login as instructor. Please ensure test credentials exist."
    );
    console.log("   Create an instructor account with:");
    console.log("   - Username: instructor");
    console.log("   - Password: instructor123");
    console.log("   - Privilege: instructor");
    return;
  }

  console.log("✅ Successfully logged in as instructor");

  // Get global questions
  const globalQuestions = await getGlobalQuestions(instructorToken);

  if (globalQuestions.length === 0) {
    console.log(
      "❌ No global questions found. Make sure global questions are seeded."
    );
    return;
  }

  console.log(`📋 Found ${globalQuestions.length} global questions`);

  // Test deleting a global question (created by system user)
  const testQuestion = globalQuestions.find((q) => q.section === null);

  if (!testQuestion) {
    console.log("❌ No global questions found (section === null)");
    return;
  }

  console.log(`🎯 Testing deletion of global question: "${testQuestion.text}"`);
  console.log(`   Question ID: ${testQuestion._id}`);
  console.log(`   Created by: ${testQuestion.createdBy}`);
  console.log(`   Section: ${testQuestion.section}`);

  const deleteResult = await deleteQuestion(testQuestion._id, instructorToken);

  console.log("\n📊 Deletion Test Results:");
  console.log(`   Status: ${deleteResult.status}`);
  console.log(`   Success: ${deleteResult.success}`);
  console.log(`   Message: ${deleteResult.message}`);

  if (deleteResult.success) {
    console.log("\n✅ SUCCESS: Instructor can now delete global questions!");
    console.log("🔧 The authorization fix is working correctly.");
  } else {
    console.log(
      "\n❌ FAILED: Instructor still cannot delete global questions."
    );
    console.log("🐛 The authorization issue persists.");
  }
}

// Run the test
testDeleteAuthorization().catch(console.error);
