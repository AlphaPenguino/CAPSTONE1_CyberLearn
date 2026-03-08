const API_URL = "http://localhost:3000/api";

const adminCredentials = {
  email: "admin@cyberlearn.test",
  password: "admin123456",
};

async function testAdminDashboard() {
  try {
    console.log("Testing Admin Dashboard Connectivity...\n");

    // 1. Login as admin
    console.log("1. Logging in as admin...");
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(adminCredentials),
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      console.error("Login failed:", loginData);
      return;
    }

    const adminToken = loginData.token;
    console.log("✅ Admin login successful");

    // 2. Test dashboard stats endpoint
    console.log("\n2. Testing dashboard stats endpoint...");
    const statsResponse = await fetch(`${API_URL}/admin/dashboard/stats`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    const statsData = await statsResponse.json();

    if (statsResponse.ok) {
      console.log("✅ Dashboard stats endpoint working");
      console.log("Stats data:", JSON.stringify(statsData, null, 2));
    } else {
      console.error("❌ Dashboard stats endpoint failed:", statsData);
    }

    // 3. Test leaderboard endpoint
    console.log("\n3. Testing leaderboard endpoint...");
    const leaderboardResponse = await fetch(
      `${API_URL}/users/leaderboard?limit=1`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );

    const leaderboardData = await leaderboardResponse.json();

    if (leaderboardResponse.ok) {
      console.log("✅ Leaderboard endpoint working");
      console.log(
        "Leaderboard data:",
        JSON.stringify(leaderboardData, null, 2)
      );
    } else {
      console.error("❌ Leaderboard endpoint failed:", leaderboardData);
    }
  } catch (error) {
    console.error("Error testing admin dashboard:", error);
  }
}

testAdminDashboard();
