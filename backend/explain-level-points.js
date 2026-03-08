import fetch from "node-fetch";

const API_URL = "http://localhost:3000/api";

async function simulateLevelProgressionScoring() {
  console.log("🎯 Level Progression Points Simulation\n");

  console.log("📚 How Level Points Are Calculated:");
  console.log("   Each completed level earns: Level Number × 100 points\n");

  console.log("📈 Examples:");

  // Example 1: Single section progression
  console.log("1️⃣ Single Section - Math Cyber Quests:");
  console.log("   Level 1 completed: 1 × 100 = 100 points");
  console.log("   Level 2 completed: 2 × 100 = 200 points");
  console.log("   Level 3 completed: 3 × 100 = 300 points");
  console.log(
    "   📊 Total for reaching Level 3: 100 + 200 + 300 = 600 points\n"
  );

  // Example 2: Multiple sections
  console.log("2️⃣ Multiple Sections - Math & Science:");
  console.log("   Math - Level 2 reached: 100 + 200 = 300 points");
  console.log("   Science - Level 3 reached: 100 + 200 + 300 = 600 points");
  console.log("   📊 Total Level Points: 300 + 600 = 900 points\n");

  // Example 3: Combined scoring
  console.log("3️⃣ Combined Leaderboard Score:");
  console.log("   Global XP (from all activities): 1200");
  console.log("   Level Points (from CQ progression): 900");
  console.log("   🏆 Final Leaderboard Score: 1200 + 900 = 2100 points\n");

  console.log("🎮 How Students Earn XP vs Level Points:");
  console.log("   📚 Home Tab: Complete modules & quizzes → Global XP");
  console.log("   🛡️ Cyber Quests: Progress through levels → Level Points");
  console.log("   🎪 Arcade Games: Multiplayer games → Global XP");
  console.log(
    "   🏆 Leaderboard: Shows combined total for complete progress picture\n"
  );

  console.log("💡 Benefits of This System:");
  console.log(
    "   ✅ Rewards both consistent learning (XP) and deep mastery (Levels)"
  );
  console.log(
    "   ✅ Progressive difficulty incentive (Level 5 = 500 pts vs Level 1 = 100 pts)"
  );
  console.log(
    "   ✅ Multi-subject engagement (points from all enrolled sections)"
  );
  console.log(
    "   ✅ Visible progress tracking across different activity types"
  );

  // Show actual current state
  try {
    console.log("\n📊 Current Database State:");
    const response = await fetch(`${API_URL}/users/leaderboard`);
    const data = await response.json();

    if (data.success && data.data.rankings.length > 0) {
      const topUser = data.data.rankings[0];
      console.log(`🥇 Top Student: ${topUser.username}`);
      console.log(`   Global XP: ${topUser.totalXP}`);
      console.log(`   Level Points: ${topUser.levelPoints}`);
      console.log(`   Combined Score: ${topUser.combinedScore}`);
      console.log(`   Max CQ Level: ${topUser.maxLevelReached}`);
      console.log(`   Active Sections: ${topUser.totalSections}`);
    }
  } catch (error) {
    console.log("   (Could not fetch current state)");
  }
}

simulateLevelProgressionScoring();
