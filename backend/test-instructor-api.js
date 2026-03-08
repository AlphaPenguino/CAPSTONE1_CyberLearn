import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const API_URL = process.env.API_URL || "http://localhost:5000/api";

const testInstructorAnalyticsAPI = async () => {
  try {
    // This would normally be the token from an instructor account
    // For testing, you'll need a valid instructor token
    const token = "YOUR_INSTRUCTOR_TOKEN_HERE"; // Replace with actual token

    console.log("Testing instructor analytics API...");

    const response = await fetch(`${API_URL}/instructor/analytics/students`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log("Success! Analytics data:");
      console.log(JSON.stringify(result, null, 2));

      // Look for student1 specifically
      const student1 = result.data?.students?.find(
        (s) => s.studentName === "John Doe"
      );
      if (student1) {
        console.log("\nStudent1 (John Doe) data:");
        console.log("- Games Played:", student1.gamesPlayed);
        console.log("- Time Spent:", student1.timeSpent);
        console.log("- Last Activity:", student1.lastActivity);
        console.log("- Recent Games:", student1.recentGames);
      }
    } else {
      const error = await response.json();
      console.error("Error getting analytics:", error);
    }
  } catch (error) {
    console.error("Network error:", error.message);
    console.log(
      "\nNote: This test requires a valid authentication token for an instructor."
    );
    console.log("The fix should show Knowledge Relay games in the analytics.");
  }
};

testInstructorAnalyticsAPI();
