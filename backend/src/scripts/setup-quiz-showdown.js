import "dotenv/config";
import { connectDB } from "../lib/db.js";
import {
  QuizShowdownQuestion,
  sampleQuestions,
} from "../models/QuizShowdown.js";

const setupQuizShowdown = async () => {
  try {
    console.log("🚀 Setting up Quiz Showdown...");

    // Connect to database
    await connectDB();

    // Check if questions already exist
    const existingQuestions = await QuizShowdownQuestion.find();

    if (existingQuestions.length > 0) {
      console.log(
        `📚 Found ${existingQuestions.length} existing Quiz Showdown questions`
      );
      console.log("✅ Quiz Showdown setup complete (using existing questions)");
      return;
    }

    // Insert sample questions
    console.log("📝 Inserting sample questions...");

    const questionsToInsert = sampleQuestions.map((q) => ({
      question: q.question,
      options: q.options,
      correct: q.correct,
      createdBy: null, // System-created questions
    }));

    const insertedQuestions = await QuizShowdownQuestion.insertMany(
      questionsToInsert
    );

    console.log(
      `✅ Successfully inserted ${insertedQuestions.length} sample questions`
    );
    console.log("🎉 Quiz Showdown setup complete!");

    // Display sample questions
    console.log("\n📋 Sample Questions:");
    insertedQuestions.forEach((q, index) => {
      console.log(`\n${index + 1}. ${q.question}`);
      q.options.forEach((option, optIndex) => {
        const marker = optIndex === q.correct ? "✓" : " ";
        console.log(
          `   ${String.fromCharCode(65 + optIndex)}. ${option} ${marker}`
        );
      });
    });
  } catch (error) {
    console.error("❌ Error setting up Quiz Showdown:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupQuizShowdown();
}

export { setupQuizShowdown };
