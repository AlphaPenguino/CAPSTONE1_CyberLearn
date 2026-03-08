// Test the instructor analytics endpoint with new analytics implementation
import fetch from "node-fetch";

const API_URL = "http://localhost:3000/api";

// Mock instructor login to get token
async function getInstructorToken() {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "instructor@example.com", // You may need to adjust this
        password: "password123", // You may need to adjust this
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log("Login failed, trying with admin credentials...");

      // Try with admin
      const adminResponse = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "admin@example.com",
          password: "admin123",
        }),
      });

      const adminData = await adminResponse.json();
      if (adminResponse.ok) {
        return adminData.token;
      }

      throw new Error(`Login failed: ${data.message || adminData.message}`);
    }

    return data.token;
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
}

// Test analytics endpoint
async function testAnalytics() {
  console.log("🧪 Testing instructor analytics endpoint...");

  const token = await getInstructorToken();
  if (!token) {
    console.log("❌ Could not get authentication token");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/instructor/analytics/students`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Analytics request failed: ${data.message}`);
    }

    console.log("✅ Analytics endpoint working!");
    console.log("📊 Summary:", data.data.summary);
    console.log(`👥 Found ${data.data.students.length} students`);

    if (data.data.students.length > 0) {
      const firstStudent = data.data.students[0];
      console.log("📋 Sample student data:");
      console.log(`   Name: ${firstStudent.studentName}`);
      console.log(`   Games played: ${firstStudent.gamesPlayed}`);
      console.log(`   Time spent: ${firstStudent.timeSpent}`);
      console.log(`   Average score: ${firstStudent.averageScore}%`);
      console.log(`   Completion rate: ${firstStudent.completionRate}%`);
    }
  } catch (error) {
    console.error("❌ Analytics test failed:", error);
  }
}

// Test game completion tracking
async function testGameCompletion() {
  console.log("🎮 Testing game completion tracking...");

  const token = await getInstructorToken();
  if (!token) {
    console.log("❌ Could not get authentication token");
    return;
  }

  try {
    // Test quiz completion
    const quizResponse = await fetch(`${API_URL}/quiz/test-quiz-id/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        answers: [0, 1, 2], // Mock answers
      }),
    });

    console.log(
      `📝 Quiz tracking test: ${
        quizResponse.status === 400
          ? "Expected 400 (invalid quiz ID)"
          : "Unexpected response"
      }`
    );

    // Test Knowledge Relay completion
    const krResponse = await fetch(`${API_URL}/knowledge-relay/game/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        gameResult: "won",
        teamResult: "team1",
        finalScore: 85,
      }),
    });

    const krData = await krResponse.json();
    console.log(
      `🔗 Knowledge Relay tracking: ${
        krData.success ? "✅ Success" : "❌ Failed"
      }`
    );

    // Test Quiz Showdown completion
    const qsResponse = await fetch(`${API_URL}/quiz-showdown/game/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        gameResult: "completed",
        finalScore: 92,
        playersData: [{ id: "test", score: 92 }],
      }),
    });

    const qsData = await qsResponse.json();
    console.log(
      `⚔️  Quiz Showdown tracking: ${
        qsData.success ? "✅ Success" : "❌ Failed"
      }`
    );
  } catch (error) {
    console.error("❌ Game completion test failed:", error);
  }
}

// Run tests
async function runTests() {
  console.log("🚀 Starting analytics implementation tests...\n");

  await testAnalytics();
  console.log("");
  await testGameCompletion();

  console.log("\n🎉 Tests completed!");
}

runTests().catch(console.error);
