import fetch from "node-fetch";

const API_URL = "http://localhost:3000/api";

async function testLeaderboardWithLevels() {
  try {
    console.log("🧪 Testing Leaderboard (Level Bonus Removed)...\n");

    // Test the public leaderboard endpoint
    console.log("📊 Fetching leaderboard data...");
    const response = await fetch(`${API_URL}/users/leaderboard`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      console.log("✅ Leaderboard API successful");
      console.log(`📈 Total users: ${data.data.totalUsers}`);
      console.log(
        `📚 Available sections: ${data.data.availableSections.length}`
      );

      if (data.data.scoringInfo) {
        console.log("\n🎯 Scoring System:");
        console.log(`   ${data.data.scoringInfo.description}`);
      }

      console.log("\n🏆 Top 5 Users:");
      data.data.rankings.slice(0, 5).forEach((user, index) => {
        console.log(`${index + 1}. ${user.username}`);
        console.log(`   🌟 Global XP: ${user.totalXP}`);
        // Level points deprecated; combinedScore equals totalXP
        console.log(
          `   📊 Leaderboard Score: ${user.combinedScore || user.totalXP}`
        );
        console.log(`   🛡️ Max CQ Level: ${user.maxLevelReached || 1}`);
        console.log(`   🎪 Sections: ${user.totalSections || 0}`);
        console.log("");
      });

      // Test level progress endpoint (requires auth, so this might fail)
      console.log("🔍 Testing level progress endpoint (auth required)...");
      try {
        const progressResponse = await fetch(`${API_URL}/users/level-progress`);
        if (progressResponse.status === 401) {
          console.log(
            "⚠️ Level progress endpoint requires authentication (expected)"
          );
        } else if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          console.log("✅ Level progress endpoint accessible");
        }
      } catch (err) {
        console.log(
          "⚠️ Level progress endpoint test failed (expected without auth)"
        );
      }
    } else {
      console.error("❌ Leaderboard API failed:", data.message);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testLeaderboardWithLevels();
