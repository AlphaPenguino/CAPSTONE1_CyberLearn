import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

mongoose.connect(process.env.DB_URI || "mongodb://localhost:27017/cyberlearn");

// Question schema
const digitalDefendersQuestionSchema = new mongoose.Schema({
  text: String,
  correctAnswer: String,
  image: String,
  description: String,
  difficulty: Number,
  wave: Number,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  section: { type: mongoose.Schema.Types.ObjectId, ref: "Section" },
  isActive: { type: Boolean, default: true },
});

const DigitalDefendersQuestion = mongoose.model(
  "DigitalDefendersQuestion",
  digitalDefendersQuestionSchema
);

mongoose.connection.once("open", async () => {
  try {
    console.log("🧪 Testing the fixed validation query...\n");

    // Test the old query (incorrect - counts inactive questions)
    const oldQueryCount = await DigitalDefendersQuestion.countDocuments({
      section: null,
      wave: 1,
    });

    // Test the new query (correct - only counts active questions)
    const newQueryCount = await DigitalDefendersQuestion.countDocuments({
      section: null,
      wave: 1,
      isActive: true,
    });

    console.log(
      `❌ Old query (incorrect): ${oldQueryCount} questions in Wave 1`
    );
    console.log(`✅ New query (correct): ${newQueryCount} questions in Wave 1`);
    console.log(
      `Difference: ${oldQueryCount - newQueryCount} inactive questions`
    );

    console.log(
      `\n📝 Should allow creation: ${newQueryCount < 5 ? "YES" : "NO"}`
    );
    console.log(`Remaining slots in Wave 1: ${Math.max(0, 5 - newQueryCount)}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
});
