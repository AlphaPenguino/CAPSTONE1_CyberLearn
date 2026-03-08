#!/usr/bin/env node

/**
 * Digital Defenders Setup Script
 *
 * This script initializes the Digital Defenders game with default questions and answer cards
 * for existing sections in the database.
 *
 * Usage: node setup-digital-defenders.js
 */

import mongoose from "mongoose";
import "dotenv/config";
import {
  DigitalDefendersQuestion,
  DigitalDefendersAnswer,
} from "../models/DigitalDefenders.js";
import Section from "../models/Section.js";
import User from "../models/Users.js";

// Default questions for Digital Defenders
const defaultQuestions = [
  // Wave 1 - Basic ICT
  {
    text: "What does HTTP stand for?",
    correctAnswer: "HyperText Transfer Protocol",
    description: "Basic web protocol knowledge",
    difficulty: 1,
    wave: 1,
  },
  {
    text: "What port does HTTPS typically use?",
    correctAnswer: "443",
    description: "Secure web protocol port",
    difficulty: 1,
    wave: 1,
  },
  // Wave 2 - Network Basics
  {
    text: "What does IP stand for in IP address?",
    correctAnswer: "Internet Protocol",
    description: "Basic networking concept",
    difficulty: 2,
    wave: 2,
  },
  {
    text: "What device connects multiple networks together?",
    correctAnswer: "Router",
    description: "Network infrastructure device",
    difficulty: 2,
    wave: 2,
  },
  // Wave 3 - Security Basics
  {
    text: "What does VPN stand for?",
    correctAnswer: "Virtual Private Network",
    description: "Network security technology",
    difficulty: 3,
    wave: 3,
  },
  {
    text: "What is the default port for SSH?",
    correctAnswer: "22",
    description: "Secure shell protocol port",
    difficulty: 3,
    wave: 3,
  },
  // Wave 4 - Database & Programming
  {
    text: "What does SQL stand for?",
    correctAnswer: "Structured Query Language",
    description: "Database query language",
    difficulty: 4,
    wave: 4,
  },
  {
    text: "What does API stand for?",
    correctAnswer: "Application Programming Interface",
    description: "Software integration concept",
    difficulty: 4,
    wave: 4,
  },
  // Wave 5 - Advanced Security
  {
    text: "What does DNS stand for?",
    correctAnswer: "Domain Name System",
    description: "Internet naming system",
    difficulty: 5,
    wave: 5,
  },
  {
    text: "What encryption algorithm is considered most secure for modern use?",
    correctAnswer: "AES",
    description: "Advanced Encryption Standard",
    difficulty: 5,
    wave: 5,
  },
];

// Default answer cards
const defaultAnswers = [
  {
    name: "HTTP Protocol",
    text: "HyperText Transfer Protocol",
    description: "The foundation of data communication for the web",
  },
  {
    name: "HTTPS Port",
    text: "443",
    description: "Standard port for secure web traffic",
  },
  {
    name: "Internet Protocol",
    text: "Internet Protocol",
    description: "The protocol that defines IP addresses",
  },
  {
    name: "Network Router",
    text: "Router",
    description: "Device that forwards data between networks",
  },
  {
    name: "VPN Technology",
    text: "Virtual Private Network",
    description: "Secure connection over public networks",
  },
  {
    name: "SSH Port",
    text: "22",
    description: "Secure Shell protocol default port",
  },
  {
    name: "Query Language",
    text: "Structured Query Language",
    description: "Language for managing databases",
  },
  {
    name: "Programming Interface",
    text: "Application Programming Interface",
    description: "Set of protocols for building software",
  },
  {
    name: "Naming System",
    text: "Domain Name System",
    description: "Translates domain names to IP addresses",
  },
  {
    name: "AES Encryption",
    text: "AES",
    description: "Advanced Encryption Standard algorithm",
  },
];

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

async function findAdminUser() {
  try {
    const adminUser = await User.findOne({ privilege: "admin" }).sort({
      createdAt: 1,
    });
    if (!adminUser) {
      console.error(
        "❌ No admin user found. Please create an admin user first."
      );
      process.exit(1);
    }
    return adminUser;
  } catch (error) {
    console.error("❌ Error finding admin user:", error);
    process.exit(1);
  }
}

async function setupDigitalDefendersForSection(section, adminUser) {
  console.log(`\n🔧 Setting up Digital Defenders for section: ${section.name}`);

  try {
    // Check if questions already exist for this section
    const existingQuestions = await DigitalDefendersQuestion.findOne({
      section: section._id,
    });

    if (existingQuestions) {
      console.log(
        `   ⚠️  Digital Defenders questions already exist for ${section.name}, skipping...`
      );
    } else {
      // Create questions for this section
      const questions = defaultQuestions.map((q) => ({
        ...q,
        section: section._id,
        createdBy: adminUser._id,
      }));

      const createdQuestions = await DigitalDefendersQuestion.insertMany(
        questions
      );
      console.log(
        `   ✅ Created ${createdQuestions.length} questions for ${section.name}`
      );
    }

    // Check if answer cards already exist for this section
    const existingAnswers = await DigitalDefendersAnswer.findOne({
      section: section._id,
    });

    if (existingAnswers) {
      console.log(
        `   ⚠️  Digital Defenders answer cards already exist for ${section.name}, skipping...`
      );
    } else {
      // Create answer cards for this section
      const answers = defaultAnswers.map((a) => ({
        ...a,
        section: section._id,
        createdBy: adminUser._id,
      }));

      const createdAnswers = await DigitalDefendersAnswer.insertMany(answers);
      console.log(
        `   ✅ Created ${createdAnswers.length} answer cards for ${section.name}`
      );
    }
  } catch (error) {
    console.error(
      `   ❌ Error setting up Digital Defenders for ${section.name}:`,
      error
    );
  }
}

async function main() {
  console.log("🚀 Starting Digital Defenders setup...\n");

  await connectDB();

  try {
    // Find admin user to use as creator
    const adminUser = await findAdminUser();
    console.log(`👤 Found admin user: ${adminUser.username}`);

    // Get all active sections
    const sections = await Section.find({ isActive: true }).sort({ name: 1 });

    if (sections.length === 0) {
      console.log(
        "⚠️  No active sections found. Please create sections first."
      );
      process.exit(0);
    }

    console.log(`📚 Found ${sections.length} active sections:`);
    sections.forEach((section) => {
      console.log(`   - ${section.name} (${section.sectionCode})`);
    });

    // Set up Digital Defenders for each section
    for (const section of sections) {
      await setupDigitalDefendersForSection(section, adminUser);
    }

    console.log("\n🎉 Digital Defenders setup completed successfully!");

    // Summary
    const totalQuestions = await DigitalDefendersQuestion.countDocuments();
    const totalAnswers = await DigitalDefendersAnswer.countDocuments();

    console.log("\n📊 Summary:");
    console.log(`   Questions created: ${totalQuestions}`);
    console.log(`   Answer cards created: ${totalAnswers}`);
    console.log(`   Sections configured: ${sections.length}`);

    console.log("\n🎮 Digital Defenders is now ready to play!");
    console.log(
      "   - Questions and answer cards have been created for all sections"
    );
    console.log("   - Tool cards are automatically available (non-editable)");
    console.log(
      "   - Instructors can edit questions and answer cards through the game interface"
    );
    console.log(
      "   - Students can now play Digital Defenders in their assigned sections"
    );
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { defaultQuestions, defaultAnswers };
