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
  isActive: Boolean,
});

const DigitalDefendersQuestion = mongoose.model(
  "DigitalDefendersQuestion",
  digitalDefendersQuestionSchema
);

mongoose.connection.once("open", async () => {
  try {
    console.log("🗑️ Clearing all Digital Defenders Questions...");

    const deleteResult = await DigitalDefendersQuestion.deleteMany({});
    console.log(
      `✅ Deleted ${deleteResult.deletedCount} Digital Defenders questions`
    );

    // Verify deletion
    const remainingCount = await DigitalDefendersQuestion.countDocuments({});
    console.log(`📊 Remaining questions: ${remainingCount}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
});
