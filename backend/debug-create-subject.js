// Quick test to debug the create subject issue
import mongoose from "mongoose";
import Section from "./src/models/Section.js";
import User from "./src/models/Users.js";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/cyberlearn";

async function testSubjectCreation() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Create a test user first
    const testUser =
      (await User.findOne({})) ||
      (await User.create({
        username: "test_instructor",
        email: "test@example.com",
        fullName: "Test Instructor",
        privilege: "instructor",
        password: "test123",
      }));

    console.log("Test user ID:", testUser._id);

    // Test the exact same flow as the API
    const name = "Test Subject Creation";
    const description = "This is a test subject";

    console.log("1. Creating section code...");
    const sectionCode = name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    console.log("Section code:", sectionCode);

    console.log("2. Generating subject code...");
    const subjectCode = await generateSubjectCode(name);
    console.log("Generated subject code:", subjectCode);

    console.log("3. Testing User.updateSchema...");
    try {
      await User.updateSchema(sectionCode);
      console.log("✅ User.updateSchema successful");
    } catch (schemaError) {
      console.log("⚠️ User.updateSchema failed:", schemaError.message);
    }

    console.log("4. Creating Section document...");
    const subject = new Section({
      name,
      sectionCode: sectionCode,
      subjectCode: subjectCode,
      instructor: testUser._id,
      description: description,
      isActive: true,
      createdBy: testUser._id,
    });

    console.log("5. Saving to database...");
    await subject.save();
    console.log("✅ Subject saved successfully:", subject._id);
    console.log("📋 Subject code generated:", subject.subjectCode);

    // Clean up
    await Section.deleteOne({ _id: subject._id });
    console.log("✅ Cleanup completed");
  } catch (error) {
    console.error("❌ Test failed:", error);
    console.error("Error details:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
  } finally {
    await mongoose.disconnect();
  }
}

// Helper function (copied from routes)
async function generateSubjectCode(subjectName) {
  const words = subjectName.trim().split(/\s+/);
  let baseCode = "";

  if (words.length === 1) {
    baseCode = words[0].substring(0, 3).toUpperCase();
  } else {
    baseCode = words
      .map((word) => word.substring(0, 2))
      .join("")
      .toUpperCase()
      .substring(0, 3);
  }

  if (baseCode.length < 2) {
    baseCode = baseCode.padEnd(2, "X");
  }

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let attempts = 0;

  while (attempts < 50) {
    let suffix = "";
    const suffixLength = 6 - baseCode.length;
    for (let i = 0; i < suffixLength; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const uniqueCode = baseCode + suffix;

    const existing = await Section.findOne({ subjectCode: uniqueCode });
    if (!existing) {
      return uniqueCode;
    }

    attempts++;
  }

  // Fallback
  let uniqueCode = "";
  for (let i = 0; i < 6; i++) {
    uniqueCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return uniqueCode;
}

testSubjectCreation();
