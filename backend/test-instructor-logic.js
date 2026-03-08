import mongoose from "mongoose";
import User from "./src/models/Users.js";
import Progress from "./src/models/Progress.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const testInstructorAnalytics = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/cyberlearn"
    );
    console.log("Connected to MongoDB");

    // Simulate the instructor analytics logic for student1
    const students = await User.find({
      privilege: "student",
      username: "student1", // Focus on student1
    })
      .select("_id fullName email section analytics")
      .lean();

    console.log("Testing instructor analytics logic...");

    // Fetch all progress docs
    const progressDocs = await Progress.find({
      user: { $in: students.map((s) => s._id) },
    })
      .select(
        "user moduleProgress.completedQuizzes quizAttempts.completedAt quizAttempts.score quizAttempts.timeSpent quizAttempts.quiz quizAttempts.module moduleProgress.unlockedQuizzes"
      )
      .lean();

    const progressMap = new Map();
    for (const p of progressDocs) progressMap.set(p.user.toString(), p);

    for (const stu of students) {
      const prog = progressMap.get(stu._id.toString());
      const analytics = stu.analytics || {};

      let gamesPlayed = analytics.totalGamesPlayed || 0;
      let totalScore = 0;
      let scoreCount = 0;
      let timeSpentMinutes = analytics.totalTimeSpent || 0;
      let lastActivity = analytics.lastActivity || null;

      console.log(`\nStudent: ${stu.fullName}`);
      console.log(`Analytics from User model:`);
      console.log(`  totalGamesPlayed: ${analytics.totalGamesPlayed}`);
      console.log(`  totalTimeSpent: ${analytics.totalTimeSpent} minutes`);
      console.log(`  lastActivity: ${analytics.lastActivity}`);
      console.log(`  gamesByType:`, analytics.gamesByType);

      if (prog) {
        const completedQuizzes = (prog.moduleProgress || []).flatMap(
          (mp) => mp.completedQuizzes || []
        );

        console.log(`Progress data:`);
        console.log(`  completedQuizzes: ${completedQuizzes.length}`);

        // Use the higher count between analytics and progress data
        gamesPlayed = Math.max(gamesPlayed, completedQuizzes.length);
      } else {
        console.log(`No Progress data found`);
      }

      function formatTime(minutes) {
        if (!minutes) return "0m";
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return h ? `${h}h ${m}m` : `${m}m`;
      }

      function formatRelative(date) {
        if (!date) return null;
        const now = Date.now();
        const diffMs = now - new Date(date).getTime();
        const diffH = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffH < 1) {
          const diffM = Math.max(1, Math.floor(diffMs / (1000 * 60)));
          return `${diffM} min ago`;
        }
        if (diffH < 24) return `${diffH} hours ago`;
        const diffD = Math.floor(diffH / 24);
        return diffD === 1 ? "1 day ago" : `${diffD} days ago`;
      }

      const finalResult = {
        studentName: stu.fullName,
        gamesPlayed,
        totalScore: Math.round(totalScore),
        averageScore: scoreCount ? +(totalScore / scoreCount).toFixed(1) : 0,
        timeSpent: formatTime(timeSpentMinutes),
        lastActivity: lastActivity ? formatRelative(lastActivity) : null,
        recentGames: [], // Would be empty for Knowledge Relay since no quiz history
      };

      console.log(`Final result for instructor dashboard:`, finalResult);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  }
};

testInstructorAnalytics();
