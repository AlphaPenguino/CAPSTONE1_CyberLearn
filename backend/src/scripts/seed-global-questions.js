import mongoose from "mongoose";
import dotenv from "dotenv";
import { DigitalDefendersQuestion } from "../models/DigitalDefenders.js";
import User from "../models/Users.js";

dotenv.config();

// Global Digital Defenders Questions (not tied to any section)
const globalQuestions = [
  // Wave 1 - Basic Networking
  {
    text: "What does HTTP stand for?",
    correctAnswer: "HyperText Transfer Protocol",
    description:
      "HTTP is the foundation of data communication on the World Wide Web.",
    difficulty: 1,
    wave: 1,
  },
  {
    text: "What port does HTTPS typically use?",
    correctAnswer: "443",
    description:
      "HTTPS uses port 443 for secure communication over the internet.",
    difficulty: 1,
    wave: 1,
  },
  {
    text: "What does IP stand for in IP address?",
    correctAnswer: "Internet Protocol",
    description: "IP addresses uniquely identify devices on a network.",
    difficulty: 1,
    wave: 1,
  },
  {
    text: "What is the default port for HTTP?",
    correctAnswer: "80",
    description: "HTTP typically uses port 80 for web communication.",
    difficulty: 1,
    wave: 1,
  },
  {
    text: "What does WWW stand for?",
    correctAnswer: "World Wide Web",
    description:
      "The World Wide Web is a system of interlinked hypertext documents.",
    difficulty: 1,
    wave: 1,
  },

  // Wave 2 - Network Infrastructure
  {
    text: "What device connects multiple networks together?",
    correctAnswer: "Router",
    description: "Routers direct data packets between different networks.",
    difficulty: 2,
    wave: 2,
  },
  {
    text: "What does DNS stand for?",
    correctAnswer: "Domain Name System",
    description: "DNS translates domain names into IP addresses.",
    difficulty: 2,
    wave: 2,
  },
  {
    text: "What is the purpose of a firewall?",
    correctAnswer: "To block unauthorized access",
    description:
      "Firewalls control incoming and outgoing network traffic based on security rules.",
    difficulty: 2,
    wave: 2,
  },
  {
    text: "What does MAC address stand for?",
    correctAnswer: "Media Access Control",
    description: "MAC addresses are unique identifiers for network interfaces.",
    difficulty: 2,
    wave: 2,
  },
  {
    text: "What protocol is used for email transmission?",
    correctAnswer: "SMTP",
    description:
      "Simple Mail Transfer Protocol handles email delivery between servers.",
    difficulty: 2,
    wave: 2,
  },

  // Wave 3 - Security Basics
  {
    text: "What does VPN stand for?",
    correctAnswer: "Virtual Private Network",
    description: "VPNs create secure connections over public networks.",
    difficulty: 2,
    wave: 3,
  },
  {
    text: "What is the default port for SSH?",
    correctAnswer: "22",
    description: "SSH uses port 22 for secure remote access to systems.",
    difficulty: 2,
    wave: 3,
  },
  {
    text: "What does SSL stand for?",
    correctAnswer: "Secure Sockets Layer",
    description:
      "SSL encrypts data transmitted between web browsers and servers.",
    difficulty: 2,
    wave: 3,
  },
  {
    text: "What is two-factor authentication?",
    correctAnswer: "Security using two different verification methods",
    description: "2FA adds an extra layer of security beyond just passwords.",
    difficulty: 3,
    wave: 3,
  },
  {
    text: "What does HTTPS add to HTTP?",
    correctAnswer: "Encryption",
    description: "HTTPS provides secure, encrypted communication over the web.",
    difficulty: 2,
    wave: 3,
  },

  // Wave 4 - Database & API Security
  {
    text: "What does SQL stand for?",
    correctAnswer: "Structured Query Language",
    description: "SQL is used to manage and query relational databases.",
    difficulty: 3,
    wave: 4,
  },
  {
    text: "What does API stand for?",
    correctAnswer: "Application Programming Interface",
    description: "APIs allow different software applications to communicate.",
    difficulty: 3,
    wave: 4,
  },
  {
    text: "What is SQL injection?",
    correctAnswer: "A code injection attack targeting databases",
    description: "SQL injection exploits vulnerabilities in database queries.",
    difficulty: 4,
    wave: 4,
  },
  {
    text: "What does JWT stand for?",
    correctAnswer: "JSON Web Token",
    description:
      "JWTs are used for secure information transmission between parties.",
    difficulty: 3,
    wave: 4,
  },
  {
    text: "What is cross-site scripting (XSS)?",
    correctAnswer: "Injecting malicious scripts into web pages",
    description:
      "XSS attacks exploit trust that users have for a particular site.",
    difficulty: 4,
    wave: 4,
  },

  // Wave 5 - Advanced Security
  {
    text: "What encryption algorithm is considered most secure today?",
    correctAnswer: "AES",
    description:
      "Advanced Encryption Standard is widely used for secure data encryption.",
    difficulty: 4,
    wave: 5,
  },
  {
    text: "What does DDoS stand for?",
    correctAnswer: "Distributed Denial of Service",
    description:
      "DDoS attacks overwhelm servers with traffic from multiple sources.",
    difficulty: 4,
    wave: 5,
  },
  {
    text: "What is a zero-day vulnerability?",
    correctAnswer: "An unknown security flaw",
    description:
      "Zero-day vulnerabilities are unknown to security vendors and have no patches.",
    difficulty: 5,
    wave: 5,
  },
  {
    text: "What does CSRF stand for?",
    correctAnswer: "Cross-Site Request Forgery",
    description:
      "CSRF attacks trick users into performing unwanted actions on trusted sites.",
    difficulty: 4,
    wave: 5,
  },
  {
    text: "What is penetration testing?",
    correctAnswer: "Authorized simulated cyberattack",
    description:
      "Pen testing evaluates security by simulating real-world attacks.",
    difficulty: 4,
    wave: 5,
  },
];

async function seedGlobalQuestions() {
  try {
    // Only connect if not already connected
    if (!mongoose.connection.readyState) {
      await mongoose.connect(
        process.env.DB_URI || "mongodb://localhost:27017/cyberlearn"
      );
      console.log("🔗 Connected to MongoDB");
    }

    // Find a system/admin user to assign as creator
    let systemUser = await User.findOne({
      $or: [
        { privilege: "admin" },
        { username: "system" },
        { username: "admin" },
      ],
    });

    if (!systemUser) {
      // Create a system user if none exists
      console.log("📝 Creating system user for global questions...");
      systemUser = new User({
        username: "system",
        fullName: "System Administrator",
        email: "system@cyberlearn.com",
        password: "system123", // This will be hashed
        privilege: "admin",
      });
      await systemUser.save();
      console.log("✅ System user created");
    }

    console.log(
      `👤 Using creator: ${systemUser.username} (${systemUser.privilege})`
    );

    // Clear existing questions first
    await DigitalDefendersQuestion.deleteMany({});
    console.log("🗑️ Cleared existing questions");

    // Create global questions
    const questionsToCreate = globalQuestions.map((q) => ({
      ...q,
      createdBy: systemUser._id,
      section: null, // Global questions have no section
      isActive: true,
    }));

    const createdQuestions = await DigitalDefendersQuestion.insertMany(
      questionsToCreate
    );
    console.log(
      `✅ Created ${createdQuestions.length} global Digital Defenders questions`
    );

    // Verify creation
    const totalQuestions = await DigitalDefendersQuestion.countDocuments({});
    const globalQuestionsCount = await DigitalDefendersQuestion.countDocuments({
      section: null,
    });

    console.log(`📊 Total questions: ${totalQuestions}`);
    console.log(`🌍 Global questions: ${globalQuestionsCount}`);

    // Show wave distribution
    for (let wave = 1; wave <= 5; wave++) {
      const waveCount = await DigitalDefendersQuestion.countDocuments({
        wave,
        section: null,
      });
      console.log(`   Wave ${wave}: ${waveCount} questions`);
    }

    // Only exit if this is run as a standalone script
    if (import.meta.url === `file://${process.argv[1]}`) {
      process.exit(0);
    }

    return { success: true, questionsCreated: createdQuestions.length };
  } catch (error) {
    console.error("❌ Error seeding global questions:", error);

    // Only exit if this is run as a standalone script
    if (import.meta.url === `file://${process.argv[1]}`) {
      process.exit(1);
    }

    throw error;
  }
}

export { globalQuestions, seedGlobalQuestions };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedGlobalQuestions();
}
