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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const DigitalDefendersQuestion = mongoose.model(
  "DigitalDefendersQuestion",
  digitalDefendersQuestionSchema
);

mongoose.connection.once("open", async () => {
  try {
    console.log("🔍 Debugging Wave 1 Questions...\n");

    // Check all Wave 1 questions with various criteria
    console.log("=== ALL Wave 1 Questions (no filters) ===");
    const allWave1Questions = await DigitalDefendersQuestion.find({
      wave: 1,
    });

    console.log(`Total Wave 1 questions: ${allWave1Questions.length}`);
    allWave1Questions.forEach((q, index) => {
      console.log(`${index + 1}. ID: ${q._id}`);
      console.log(`   Text: ${q.text.substring(0, 50)}...`);
      console.log(`   isActive: ${q.isActive}`);
      console.log(`   Section: ${q.section || "GLOBAL"}`);
      console.log(`   Created: ${q.createdAt}`);
      console.log("");
    });

    console.log("\n=== Global Wave 1 Questions (section: null) ===");
    const globalWave1Questions = await DigitalDefendersQuestion.find({
      wave: 1,
      section: null,
    });

    console.log(`Global Wave 1 questions: ${globalWave1Questions.length}`);
    globalWave1Questions.forEach((q, index) => {
      console.log(`${index + 1}. ID: ${q._id}`);
      console.log(`   Text: ${q.text.substring(0, 50)}...`);
      console.log(`   isActive: ${q.isActive}`);
      console.log("");
    });

    console.log(
      "\n=== Active Global Wave 1 Questions (backend validation query) ==="
    );
    const activeGlobalWave1Questions = await DigitalDefendersQuestion.find({
      wave: 1,
      section: null,
      isActive: { $ne: false }, // This matches how some queries might work
    });

    console.log(
      `Active Global Wave 1 questions: ${activeGlobalWave1Questions.length}`
    );

    console.log("\n=== Using exact backend query ===");
    // This is the exact query from the backend routes
    const exactBackendCount = await DigitalDefendersQuestion.countDocuments({
      section: null, // Global questions have no section
      wave: 1,
    });

    console.log(`Backend countDocuments result: ${exactBackendCount}`);

    console.log("\n=== Recently deleted questions (isActive: false) ===");
    const deletedQuestions = await DigitalDefendersQuestion.find({
      wave: 1,
      section: null,
      isActive: false,
    });

    console.log(`Deleted Wave 1 questions: ${deletedQuestions.length}`);
    deletedQuestions.forEach((q, index) => {
      console.log(`${index + 1}. ID: ${q._id}`);
      console.log(`   Text: ${q.text.substring(0, 50)}...`);
      console.log(`   isActive: ${q.isActive}`);
      console.log(`   Updated: ${q.updatedAt}`);
      console.log("");
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
});
