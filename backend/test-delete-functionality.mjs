#!/usr/bin/env node

/**
 * Test script to verify the Digital Defenders delete functionality
 */

import fetch from "node-fetch";

const BASE_URL = "http://localhost:3000/api";

async function testDeleteFunctionality() {
  console.log("🧪 Testing Digital Defenders Delete Functionality\n");

  try {
    // Step 1: Login as instructor
    console.log("Step 1: Logging in as instructor...");
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "instructor@cyberlearn.test",
        password: "instructor123",
      }),
    });

    const loginData = await loginResponse.json();
    console.log("Login response:", loginData);

    if (!loginResponse.ok || !loginData.token) {
      throw new Error(`Login failed: ${loginData.message}`);
    }

    const token = loginData.token;
    console.log("✅ Login successful");

    // Step 2: Get global questions
    console.log("\nStep 2: Fetching global questions...");
    const questionsResponse = await fetch(
      `${BASE_URL}/digital-defenders/questions/global`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const questionsData = await questionsResponse.json();
    console.log("Questions response:", questionsData);

    if (!questionsData.success) {
      throw new Error(`Failed to fetch questions: ${questionsData.message}`);
    }

    console.log(`✅ Found ${questionsData.questions.length} global questions`);

    if (questionsData.questions.length === 0) {
      console.log("⚠️ No questions found to test deletion");
      return;
    }

    // Step 3: Try to delete the first question
    const firstQuestion = questionsData.questions[0];
    console.log(
      `\nStep 3: Attempting to delete question: "${firstQuestion.text.substring(
        0,
        50
      )}..."`
    );

    const deleteResponse = await fetch(
      `${BASE_URL}/digital-defenders/questions/${firstQuestion._id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const deleteData = await deleteResponse.json();

    if (deleteData.success) {
      console.log("✅ Question deleted successfully!");
      console.log(`Message: ${deleteData.message}`);

      // Step 4: Also test answer deletion
      console.log("\nStep 4: Fetching answer cards to test deletion...");
      const answersResponse = await fetch(
        `${BASE_URL}/digital-defenders/answers/global`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const answersData = await answersResponse.json();
      console.log(
        `✅ Found ${answersData.answers?.length || 0} global answer cards`
      );

      if (answersData.answers && answersData.answers.length > 0) {
        const firstAnswer = answersData.answers[0];
        console.log(
          `\nStep 5: Attempting to delete answer: "${
            firstAnswer.text?.substring(0, 50) ||
            firstAnswer.name?.substring(0, 50)
          }..."`
        );

        const deleteAnswerResponse = await fetch(
          `${BASE_URL}/digital-defenders/answers/${firstAnswer._id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const deleteAnswerData = await deleteAnswerResponse.json();

        if (deleteAnswerData.success) {
          console.log("✅ Answer card deleted successfully!");
          console.log(`Message: ${deleteAnswerData.message}`);
        } else {
          console.log("❌ Answer card deletion failed!");
          console.log(`Error: ${deleteAnswerData.message}`);
          console.log(`Status: ${deleteAnswerResponse.status}`);
        }
      }
    } else {
      console.log("❌ Question deletion failed!");
      console.log(`Error: ${deleteData.message}`);
      console.log(`Status: ${deleteResponse.status}`);

      // Check if it's an authorization error
      if (deleteResponse.status === 403) {
        console.log("\n🔍 This appears to be an authorization issue.");
        console.log(
          "This confirms the bug - instructors cannot delete global questions."
        );
      }
    }
  } catch (error) {
    console.error("💥 Test failed:", error.message);
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDeleteFunctionality();
}

export { testDeleteFunctionality };
