#!/usr/bin/env node

/**
 * Test script to debug Digital Defenders frontend delete functionality
 */

import fetch from "node-fetch";

const BASE_URL = "http://localhost:3000/api";

async function testFrontendDeleteFlow() {
  console.log("🧪 Testing Digital Defenders Frontend Delete Flow\n");

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
    const token = loginData.token;
    console.log("✅ Login successful");

    // Step 2: Get questions to find one to delete
    console.log("\nStep 2: Fetching questions...");
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

    if (!questionsData.questions || questionsData.questions.length === 0) {
      console.log("⚠️ No questions found to test deletion");
      return;
    }

    // Pick a question that's not one of the seeded ones (to avoid breaking the game)
    let testQuestion =
      questionsData.questions.find(
        (q) =>
          q.text.includes("fsdaf") ||
          q.text.includes("test") ||
          q.text.includes("demo")
      ) || questionsData.questions[0];

    console.log(
      `✅ Found test question: "${testQuestion.text.substring(0, 50)}..."`
    );

    // Step 3: Get answer cards to find linked answer
    console.log("\nStep 3: Fetching answer cards...");
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
    const linkedAnswer = answersData.answers?.find(
      (a) => a.questionId === testQuestion._id
    );

    if (linkedAnswer) {
      console.log(
        `✅ Found linked answer: "${
          linkedAnswer.text?.substring(0, 50) ||
          linkedAnswer.name?.substring(0, 50)
        }..."`
      );
    } else {
      console.log("⚠️ No linked answer found for this question");
    }

    // Step 4: Test the exact API calls that the frontend makes
    console.log(
      "\nStep 4: Testing question deletion (as frontend would do)..."
    );

    const deleteQuestionResponse = await fetch(
      `${BASE_URL}/digital-defenders/questions/${testQuestion._id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const deleteQuestionResult = await deleteQuestionResponse.json();
    console.log("Question delete response:", deleteQuestionResult);

    if (deleteQuestionResult.success) {
      console.log("✅ Question deleted successfully");

      // Step 5: Test answer deletion if there was a linked answer
      if (linkedAnswer) {
        console.log("\nStep 5: Testing linked answer deletion...");

        const deleteAnswerResponse = await fetch(
          `${BASE_URL}/digital-defenders/answers/${linkedAnswer._id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const deleteAnswerResult = await deleteAnswerResponse.json();
        console.log("Answer delete response:", deleteAnswerResult);

        if (deleteAnswerResult.success) {
          console.log("✅ Linked answer deleted successfully");
        } else {
          console.log("❌ Linked answer deletion failed");
          console.log(`Error: ${deleteAnswerResult.message}`);
        }
      }
    } else {
      console.log("❌ Question deletion failed");
      console.log(`Error: ${deleteQuestionResult.message}`);

      if (deleteQuestionResponse.status === 403) {
        console.log("\n🔍 This appears to be an authorization issue.");
      }
    }
  } catch (error) {
    console.error("💥 Test failed:", error.message);
  }
}

testFrontendDeleteFlow();
