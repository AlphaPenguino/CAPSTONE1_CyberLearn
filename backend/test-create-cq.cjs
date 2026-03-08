#!/usr/bin/env node

async function main() {
  const base = "http://localhost:3000/api";
  const subjectId = process.argv[2] || "688efe6ce471e35efb46f13a"; // fallback from earlier test output

  try {
    console.log("1) Logging in as instructor...");
    const loginRes = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "instructor1",
        password: "instructor123",
      }),
    });
    const login = await loginRes.json();
    if (!loginRes.ok || !login.token) {
      console.error("Login failed", login);
      process.exit(1);
    }
    const token = login.token;
    console.log("✅ Logged in");

    console.log("2) Creating Cyber Quest in subject:", subjectId);
    const payload = {
      title: `Test CQ ${Date.now()}`,
      description: "Automated test quest",
      difficulty: "easy",
      level: 1,
      subject: subjectId, // also send in body, though route param is used
      questions: [
        {
          type: "multipleChoice",
          text: "What does CPU stand for?",
          choices: [
            "Central Processing Unit",
            "Computer Power Unit",
            "Control Program Unit",
          ],
          correct_index: 0,
        },
        {
          type: "multipleChoice",
          text: "Which is an input device?",
          choices: ["Monitor", "Keyboard", "Speaker"],
          correct_index: 1,
        },
        {
          type: "multipleChoice",
          text: "Binary numbers use base?",
          choices: ["8", "10", "2"],
          correct_index: 2,
        },
      ],
    };

    const createRes = await fetch(
      `${base}/sections/${subjectId}/cyber-quests`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const created = await createRes.json().catch(() => ({}));
    console.log("Status:", createRes.status);
    console.log("Response:", JSON.stringify(created, null, 2));
  } catch (e) {
    console.error("Test failed:", e);
    process.exit(1);
  }
}

main();
