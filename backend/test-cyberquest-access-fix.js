#!/usr/bin/env node

/**
 * Test script to verify cyber quest access control fixes
 * This script tests the 403 access denied issue fix
 */

import fetch from "node-fetch";

const API_URL = "http://localhost:3000/api";

async function testCyberQuestAccessFix() {
  console.log("🧪 Testing Cyber Quest Access Control Fix\n");

  try {
    // Step 1: Login as a student to get token
    console.log("1. Logging in as student...");
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "student1", // Adjust this to match your test student
        password: "password123", // Adjust this to match your test password
      }),
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      console.error("❌ Login failed:", errorData.message);
      console.log("\n📝 Setup Instructions:");
      console.log("1. Make sure your backend server is running on port 3000");
      console.log(
        "2. Create a test student user with username 'student1' and password 'password123'"
      );
      console.log("3. Make sure you have a cyber quest in the database");
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log("✅ Login successful");

    // Step 2: Get user's current subjects/sections
    console.log("\n2. Checking user's current subjects...");
    const subjectsResponse = await fetch(`${API_URL}/subjects`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (subjectsResponse.ok) {
      const subjectsData = await subjectsResponse.json();
      console.log("✅ User subjects:", subjectsData.subjects?.length || 0);

      if (subjectsData.subjects && subjectsData.subjects.length > 0) {
        console.log("📚 Available subjects:");
        subjectsData.subjects.forEach((subject, index) => {
          console.log(
            `   ${index + 1}. ${subject.name} (${subject.sectionCode})`
          );
        });
      }
    }

    // Step 3: Get available cyber quests
    console.log("\n3. Fetching cyber quests...");
    const questsResponse = await fetch(`${API_URL}/all-cyber-quests`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    let testQuestId = null;
    if (questsResponse.ok) {
      const questsData = await questsResponse.json();
      console.log(
        "✅ Found cyber quests:",
        questsData.cyberQuests?.length || 0
      );

      if (questsData.cyberQuests && questsData.cyberQuests.length > 0) {
        testQuestId = questsData.cyberQuests[0]._id;
        console.log("🎯 Using quest:", questsData.cyberQuests[0].title);
        console.log("   Quest ID:", testQuestId);
        console.log("   Subject ID:", questsData.cyberQuests[0].subject);
      }
    } else {
      console.log(
        "⚠️  Could not fetch cyber quests, trying alternative approach..."
      );

      // Try to get quests from sections endpoint
      const sectionsResponse = await fetch(`${API_URL}/sections`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (sectionsResponse.ok) {
        const sectionsData = await sectionsResponse.json();
        if (sectionsData.sections && sectionsData.sections.length > 0) {
          const firstSection = sectionsData.sections[0];
          console.log("📍 Trying section:", firstSection.name);

          const sectionQuestsResponse = await fetch(
            `${API_URL}/sections/${firstSection._id}/cyber-quests`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (sectionQuestsResponse.ok) {
            const sectionQuestsData = await sectionQuestsResponse.json();
            if (
              sectionQuestsData.cyberQuests &&
              sectionQuestsData.cyberQuests.length > 0
            ) {
              testQuestId = sectionQuestsData.cyberQuests[0]._id;
              console.log(
                "🎯 Found quest in section:",
                sectionQuestsData.cyberQuests[0].title
              );
            }
          }
        }
      }
    }

    if (!testQuestId) {
      console.log("❌ No cyber quest found to test with");
      console.log("📝 Setup Instructions:");
      console.log("1. Create a cyber quest in the database");
      console.log("2. Make sure the student has access to a subject/section");
      return;
    }

    // Step 4: Test cyber quest submission (this was failing before the fix)
    console.log("\n4. Testing cyber quest submission...");
    console.log("   Quest ID:", testQuestId);

    // Create dummy answers for the test
    const testAnswers = [
      { selectedChoiceIndex: 0 }, // First question
      { selectedChoiceIndex: 1 }, // Second question
      { selectedChoiceIndex: 0 }, // Third question
    ];

    const submissionResponse = await fetch(
      `${API_URL}/cyber-quests/${testQuestId}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: testAnswers }),
      }
    );

    console.log("📡 Submission response status:", submissionResponse.status);

    if (submissionResponse.status === 403) {
      const errorData = await submissionResponse.json();
      console.error("❌ STILL GETTING 403 ACCESS DENIED");
      console.error("   Error:", errorData.message);
      console.log("\n🔧 The fix may not be working properly.");
      console.log(
        "   Check the backend logs for detailed access control debug information."
      );
    } else if (submissionResponse.ok) {
      const result = await submissionResponse.json();
      console.log("✅ SUCCESS! Cyber quest submission worked!");
      console.log("   Result:", result.success ? "Success" : "Failed");
      if (result.result) {
        console.log("   Score:", result.result.score);
        console.log("   XP Earned:", result.result.xpEarned);
      }
    } else {
      const errorText = await submissionResponse.text();
      console.log("⚠️  Got different error (not 403):");
      console.log("   Status:", submissionResponse.status);
      console.log("   Error:", errorText);
      console.log(
        "   This might be a validation error, which is expected with dummy answers."
      );
    }

    console.log("\n🏁 Test completed!");
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    console.error(
      "   Make sure your backend server is running and accessible."
    );
  }
}

// Run the test
testCyberQuestAccessFix().catch(console.error);
