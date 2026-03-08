import mongoose from "mongoose";
import User from "./src/models/Users.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const checkAllStudentAnalytics = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/cyberlearn"
    );
    console.log("Connected to MongoDB");

    // Find all students
    const students = await User.find({ privilege: "student" })
      .select("username fullName analytics")
      .lean();

    console.log(`Found ${students.length} students:`);
    console.log("=" * 80);

    for (const student of students) {
      const analytics = student.analytics || {};

      console.log(`\nStudent: ${student.fullName} (${student.username})`);
      console.log(`  Total Games: ${analytics.totalGamesPlayed || 0}`);
      console.log(`  Time Spent: ${analytics.totalTimeSpent || 0} minutes`);
      console.log(`  Last Activity: ${analytics.lastActivity || "Never"}`);
      console.log(`  Games by Type:`);

      if (analytics.gamesByType) {
        Object.entries(analytics.gamesByType).forEach(([gameType, count]) => {
          console.log(`    ${gameType}: ${count}`);
        });
      } else {
        console.log(`    No game type data`);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  }
};

checkAllStudentAnalytics();
