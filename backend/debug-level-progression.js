import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import models
import UserLevel from "./src/models/UserLevel.js";
import Progress from "./src/models/Progress.js";
import User from "./src/models/Users.js";
import Section from "./src/models/Section.js";
import CyberQuest from "./src/models/CyberQuest.js";

async function debugLevelProgression() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/cyberlearn"
    );
    console.log("Connected to MongoDB");

    const studentId = "68b06460dded72c5aff48934"; // student1
    const mathSubjectId = "68b06499f81096ba3d831326"; // math subject

    console.log("\n=== STUDENT ASSIGNMENT CHECK ===");

    // Check student data
    const student = await User.findById(studentId);
    console.log("Student data:", {
      _id: student._id,
      username: student.username,
      section: student.section,
      sections: student.sections,
      currentSection: student.currentSection,
    });

    // Check math subject
    const mathSubject = await Section.findById(mathSubjectId);
    console.log("Math subject data:", {
      _id: mathSubject._id,
      name: mathSubject.name,
      sectionCode: mathSubject.sectionCode,
      students: mathSubject.students,
      studentCount: mathSubject.students.length,
    });

    // Check if student is in subject's students array
    const isInStudentsArray = mathSubject.students.some(
      (id) => id.toString() === studentId
    );
    console.log(
      "Is student in math subject students array?",
      isInStudentsArray
    );

    console.log("\n=== USER LEVEL DATA ===");

    // Check UserLevel records
    const userLevels = await UserLevel.find({ user: studentId });
    console.log(
      "UserLevel records:",
      userLevels.map((ul) => ({
        section: ul.section,
        currentLevel: ul.currentLevel,
        maxLevelReached: ul.maxLevelReached,
        totalQuestsCompleted: ul.totalQuestsCompleted,
      }))
    );

    // Specific UserLevel for math subject
    const mathUserLevel = await UserLevel.findOne({
      user: studentId,
      section: mathSubjectId,
    });
    console.log(
      "Math UserLevel:",
      mathUserLevel
        ? {
            currentLevel: mathUserLevel.currentLevel,
            maxLevelReached: mathUserLevel.maxLevelReached,
            totalQuestsCompleted: mathUserLevel.totalQuestsCompleted,
          }
        : "NOT FOUND"
    );

    console.log("\n=== PROGRESS DATA ===");

    // Check Progress records
    const progress = await Progress.findOne({ user: studentId });
    if (progress) {
      const mathProgress = progress.cyberQuestProgress.filter(
        (p) => p.section && p.section.toString() === mathSubjectId
      );
      console.log(
        "Math cyber quest progress entries:",
        mathProgress.map((p) => ({
          cyberQuest: p.cyberQuest,
          status: p.status,
          bestScore: p.bestScore,
          totalAttempts: p.totalAttempts,
        }))
      );
    } else {
      console.log("No Progress record found for student");
    }

    console.log("\n=== CYBER QUEST DATA ===");

    // Check all cyber quests in math subject
    const mathQuests = await CyberQuest.find({ subject: mathSubjectId }).sort({
      level: 1,
    });
    console.log(
      "Math cyber quests:",
      mathQuests.map((q) => ({
        _id: q._id,
        title: q.title,
        level: q.level,
        difficulty: q.difficulty,
      }))
    );

    console.log("\n=== UNLOCKING LOGIC TEST ===");

    // Test the unlock logic
    if (mathUserLevel) {
      console.log(
        `Student has maxLevelReached: ${mathUserLevel.maxLevelReached}`
      );
      mathQuests.forEach((quest) => {
        const shouldBeUnlocked = quest.level <= mathUserLevel.maxLevelReached;
        console.log(
          `Quest ${quest.title} (Level ${quest.level}): ${
            shouldBeUnlocked ? "UNLOCKED" : "LOCKED"
          }`
        );
      });
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

debugLevelProgression();
