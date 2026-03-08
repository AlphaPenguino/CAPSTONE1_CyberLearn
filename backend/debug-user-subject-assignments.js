#!/usr/bin/env node

/**
 * Debug utility to check user-subject assignments and help identify access control issues
 */

import mongoose from "mongoose";
import User from "./src/models/Users.js";
import Section from "./src/models/Section.js";
import CyberQuest from "./src/models/CyberQuest.js";

async function debugUserSubjectAssignments() {
  try {
    // Connect to database
    await mongoose.connect("mongodb://localhost:27017/cyberlearn");
    console.log("🔌 Connected to database");

    console.log("\\n🔍 Debugging User-Subject Assignments\\n");

    // Get all users
    const users = await User.find({ privilege: "student" })
      .select("username fullName section sections currentSection privilege")
      .limit(10);

    console.log(`👥 Found ${users.length} student users:\\n`);

    for (const user of users) {
      console.log(`📋 User: ${user.username} (${user.fullName})`);
      console.log(`   Privilege: ${user.privilege}`);
      console.log(`   Legacy section: ${user.section || "none"}`);
      console.log(
        `   Sections array: [${
          user.sections ? user.sections.join(", ") : "none"
        }]`
      );
      console.log(`   Current section: ${user.currentSection || "none"}`);

      // Find sections this user belongs to
      const userSections = await Section.find({
        students: user._id,
        isActive: true,
      }).select("name sectionCode subjectCode");

      console.log(`   Enrolled in sections: ${userSections.length}`);
      userSections.forEach((section, index) => {
        console.log(
          `     ${index + 1}. ${section.name} (${section.sectionCode}${
            section.subjectCode ? `, code: ${section.subjectCode}` : ""
          })`
        );
      });

      console.log("");
    }

    // Get all sections/subjects
    console.log("\\n📚 All Subjects/Sections:\\n");
    const sections = await Section.find({ isActive: true })
      .select("name sectionCode subjectCode students")
      .populate("students", "username");

    sections.forEach((section, index) => {
      console.log(`${index + 1}. ${section.name}`);
      console.log(`   Section Code: ${section.sectionCode}`);
      console.log(`   Subject Code: ${section.subjectCode || "none"}`);
      console.log(`   Students: ${section.students.length}`);
      if (section.students.length > 0 && section.students.length <= 5) {
        section.students.forEach((student) => {
          console.log(`     - ${student.username}`);
        });
      } else if (section.students.length > 5) {
        console.log(`     - (${section.students.length} students)`);
      }
      console.log("");
    });

    // Get cyber quests and their subject assignments
    console.log("\\n🎮 Cyber Quests and Subject Assignments:\\n");
    const cyberQuests = await CyberQuest.find({ isActive: true })
      .select("title level subject")
      .populate("subject", "name sectionCode subjectCode")
      .limit(10);

    cyberQuests.forEach((quest, index) => {
      console.log(`${index + 1}. ${quest.title} (Level ${quest.level})`);
      if (quest.subject) {
        console.log(`   Subject: ${quest.subject.name}`);
        console.log(`   Section Code: ${quest.subject.sectionCode}`);
        console.log(`   Subject Code: ${quest.subject.subjectCode || "none"}`);
      } else {
        console.log(`   ⚠️  NO SUBJECT ASSIGNED!`);
      }
      console.log("");
    });

    // Check for potential mismatches
    console.log("\\n🔧 Potential Issues:\\n");

    // Users with no section assignments
    const usersWithNoSections = users.filter(
      (user) =>
        (!user.section || user.section === "no_section") &&
        (!user.sections || user.sections.length === 0) &&
        !user.currentSection
    );

    if (usersWithNoSections.length > 0) {
      console.log("⚠️  Users with no section assignments:");
      usersWithNoSections.forEach((user) => {
        console.log(`   - ${user.username} (${user.fullName})`);
      });
      console.log("");
    }

    // Sections with no students
    const emptySections = sections.filter(
      (section) => !section.students || section.students.length === 0
    );
    if (emptySections.length > 0) {
      console.log("⚠️  Sections with no students:");
      emptySections.forEach((section) => {
        console.log(`   - ${section.name} (${section.sectionCode})`);
      });
      console.log("");
    }

    // Cyber quests with no subject
    const questsWithoutSubject = cyberQuests.filter((quest) => !quest.subject);
    if (questsWithoutSubject.length > 0) {
      console.log("⚠️  Cyber quests with no subject assigned:");
      questsWithoutSubject.forEach((quest) => {
        console.log(`   - ${quest.title} (Level ${quest.level})`);
      });
      console.log("");
    }

    console.log("✅ Debug completed!\\n");

    // Provide recommendations
    console.log("💡 Recommendations:\\n");
    if (usersWithNoSections.length > 0) {
      console.log(
        "1. Assign users to sections using the /api/subjects/join endpoint"
      );
      console.log(
        "2. Or have admins add students to sections using the bulk assign feature"
      );
    }
    if (emptySections.length > 0) {
      console.log(
        "3. Either add students to empty sections or deactivate unused sections"
      );
    }
    if (questsWithoutSubject.length > 0) {
      console.log("4. Assign cyber quests to appropriate subjects/sections");
    }
  } catch (error) {
    console.error("❌ Debug failed:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from database");
  }
}

// Run the debug
debugUserSubjectAssignments().catch(console.error);
