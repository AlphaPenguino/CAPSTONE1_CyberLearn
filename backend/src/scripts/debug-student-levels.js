import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../lib/db.js";

async function main() {
  try {
    await connectDB();

    const Users = (await import("../models/Users.js")).default;
    const Section = (await import("../models/Section.js")).default;
    const UserLevel = (await import("../models/UserLevel.js")).default;
    const Progress = (await import("../models/Progress.js")).default;
    const CyberQuest = (await import("../models/CyberQuest.js")).default;

    const email = process.env.DEBUG_STUDENT_EMAIL || "student1@cyberlearn.test";
    const user = await Users.findOne({ email }).lean();
    if (!user) {
      console.log("User not found:", email);
      process.exit(1);
    }

    console.log("User:", { id: user._id.toString(), email: user.email });

    const subjects = await Section.find({ students: user._id })
      .select("name sectionCode students")
      .lean();
    console.log("Subjects count:", subjects.length);
    for (const s of subjects) {
      console.log("- Subject:", {
        id: s._id.toString(),
        name: s.name,
        code: s.sectionCode,
        studentCount: s.students.length,
      });
    }

    const userLevels = await UserLevel.find({ user: user._id }).lean();
    console.log(
      "UserLevel docs:",
      userLevels.map((ul) => ({
        section: ul.section.toString(),
        currentLevel: ul.currentLevel,
        maxLevelReached: ul.maxLevelReached,
      }))
    );

    const progress = await Progress.findOne({ user: user._id }).lean();
    if (!progress) {
      console.log("No Progress doc for user.");
    } else {
      const perSection = progress.cyberQuestProgress.reduce((acc, it) => {
        const k = it.section.toString();
        acc[k] = acc[k] || [];
        acc[k].push({
          quest: it.cyberQuest.toString(),
          status: it.status,
          bestScore: it.bestScore,
        });
        return acc;
      }, {});
      console.log("CyberQuestProgress by section:", perSection);
    }

    // For each subject, list quest levels present
    for (const s of subjects) {
      const quests = await CyberQuest.findBySubject(s._id)
        .select("_id level title")
        .lean();
      console.log(
        `Quests for ${s.name}:`,
        quests.map((q) => ({
          id: q._id.toString(),
          level: q.level,
          title: q.title,
        }))
      );
    }

    await mongoose.connection.close();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
