const mongoose = require("mongoose");
require("dotenv").config();

// Import the model
const DigitalDefendersQuestion =
  require("./src/models/DigitalDefenders").DigitalDefendersQuestion;

async function testWaveQuestions() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGO_URI || "mongodb://localhost:27017/cyberlearn";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Get all questions grouped by wave
    const questions = await DigitalDefendersQuestion.find({
      isActive: true,
    }).sort({ wave: 1, createdAt: 1 });

    console.log(`📊 Total questions found: ${questions.length}`);

    // Group questions by wave
    const questionsByWave = {};
    questions.forEach((question) => {
      const wave = question.wave || 1;
      if (!questionsByWave[wave]) {
        questionsByWave[wave] = [];
      }
      questionsByWave[wave].push(question);
    });

    // Display wave information
    console.log("\n🌊 Questions by Wave:");
    for (let wave = 1; wave <= 10; wave++) {
      const waveQuestions = questionsByWave[wave] || [];
      console.log(`Wave ${wave}: ${waveQuestions.length} questions`);

      if (waveQuestions.length > 0) {
        waveQuestions.forEach((q, index) => {
          console.log(`  ${index + 1}. ${q.text.substring(0, 50)}...`);
        });
      }
    }

    // Check if we have questions for at least the first few waves
    const wavesWithQuestions = Object.keys(questionsByWave)
      .map(Number)
      .sort((a, b) => a - b);
    console.log(`\n📈 Waves with questions: ${wavesWithQuestions.join(", ")}`);

    if (wavesWithQuestions.length === 0) {
      console.log("⚠️ No questions found! Creating sample questions...");
      await createSampleQuestions();
    } else if (!wavesWithQuestions.includes(1)) {
      console.log(
        "⚠️ No Wave 1 questions found! This might cause issues with game initialization."
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  }
}

async function createSampleQuestions() {
  try {
    // Create a simple user ID (you might need to adjust this based on your user collection)
    const userId = new mongoose.Types.ObjectId();

    const sampleQuestions = [
      // Wave 1 - Easy questions
      {
        text: "What does HTML stand for?",
        correctAnswer: "HyperText Markup Language",
        difficulty: 1,
        wave: 1,
        createdBy: userId,
        description: "Basic web development question",
      },
      {
        text: "Which protocol is used for secure web browsing?",
        correctAnswer: "HTTPS",
        difficulty: 1,
        wave: 1,
        createdBy: userId,
        description: "Web security basics",
      },

      // Wave 2 - Slightly harder
      {
        text: "What is the main purpose of a firewall?",
        correctAnswer: "Network Security",
        difficulty: 2,
        wave: 2,
        createdBy: userId,
        description: "Cybersecurity fundamentals",
      },
      {
        text: "Which programming language is primarily used for web development?",
        correctAnswer: "JavaScript",
        difficulty: 2,
        wave: 2,
        createdBy: userId,
        description: "Programming basics",
      },

      // Wave 3
      {
        text: "What does CSS stand for?",
        correctAnswer: "Cascading Style Sheets",
        difficulty: 2,
        wave: 3,
        createdBy: userId,
        description: "Web styling basics",
      },
    ];

    for (const questionData of sampleQuestions) {
      const question = new DigitalDefendersQuestion(questionData);
      await question.save();
      console.log(
        `✅ Created question for Wave ${
          questionData.wave
        }: ${questionData.text.substring(0, 40)}...`
      );
    }

    console.log("✅ Sample questions created successfully!");
  } catch (error) {
    console.error("❌ Error creating sample questions:", error);
  }
}

// Run the test
testWaveQuestions();
