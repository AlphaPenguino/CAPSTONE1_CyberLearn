const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.DB_URI || "mongodb://localhost:27017/cyberlearn");

const { DigitalDefendersQuestion } = require("./src/models/DigitalDefenders");

// User schema for checking users
const userSchema = new mongoose.Schema({
  username: String,
  fullName: String,
  email: String,
  privilege: String,
});
const Users = mongoose.model("User", userSchema);
ongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.DB_URI || "mongodb://localhost:27017/cyberlearn");

const { DigitalDefendersQuestion } = require("./src/models/DigitalDefenders");
const Users = require("./src/models/Users");

mongoose.connection.once("open", async () => {
  try {
    console.log("📊 Checking Digital Defenders Questions...");

    const questions = await DigitalDefendersQuestion.find({})
      .populate("createdBy", "username fullName email privilege")
      .limit(10);

    console.log(
      "Total questions:",
      await DigitalDefendersQuestion.countDocuments({})
    );
    console.log("\nFirst 10 questions:");

    questions.forEach((q, index) => {
      console.log(`${index + 1}. ID: ${q._id}`);
      console.log(`   Text: ${q.text.substring(0, 50)}...`);
      console.log(
        `   Created by: ${
          q.createdBy
            ? q.createdBy.username + " (" + q.createdBy.privilege + ")"
            : "MISSING CREATOR"
        }`
      );
      console.log(`   Section: ${q.section || "GLOBAL"}`);
      console.log(`   Wave: ${q.wave || "N/A"}`);
      console.log("");
    });

    // Check for orphaned questions (no creator)
    const orphanedQuestions = await DigitalDefendersQuestion.find({
      createdBy: null,
    });
    console.log("Orphaned questions (no creator):", orphanedQuestions.length);

    // Check current users
    console.log("\n👥 Current Users:");
    const users = await Users.find(
      {},
      "username fullName email privilege"
    ).limit(5);
    users.forEach((user) => {
      console.log(`- ${user.username} (${user.privilege}) - ID: ${user._id}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
});
