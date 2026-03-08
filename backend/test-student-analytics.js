import mongoose from "mongoose";
import User from "./src/models/Users.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const testStudentAnalytics = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/cyberlearn"
    );
    console.log("Connected to MongoDB");

    // Find student1
    const student = await User.findOne({ username: "student1" });

    if (!student) {
      console.log("Student1 not found");
      return;
    }

    console.log("Student1 analytics data:");
    console.log("- Username:", student.username);
    console.log("- Full Name:", student.fullName);
    console.log(
      "- Total Games Played:",
      student.analytics?.totalGamesPlayed || 0
    );
    console.log(
      "- Total Time Spent (minutes):",
      student.analytics?.totalTimeSpent || 0
    );
    console.log("- Last Activity:", student.analytics?.lastActivity);
    console.log("- Games by Type:", student.analytics?.gamesByType);

    // Test the trackGameCompletion method
    console.log("\nTesting trackGameCompletion for knowledgeRelay...");
    await student.trackGameCompletion("knowledgeRelay");

    // Reload the student to see the updated data
    const updatedStudent = await User.findById(student._id);

    console.log("\nAfter tracking Knowledge Relay completion:");
    console.log(
      "- Total Games Played:",
      updatedStudent.analytics?.totalGamesPlayed || 0
    );
    console.log(
      "- Knowledge Relay Games:",
      updatedStudent.analytics?.gamesByType?.knowledgeRelay || 0
    );
    console.log("- Last Activity:", updatedStudent.analytics?.lastActivity);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
};

testStudentAnalytics();
