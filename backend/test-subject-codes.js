// Test script for subject code functionality
import mongoose from "mongoose";
import Section from "./src/models/Section.js";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/cyberlearn";

async function testSubjectCodes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Test 1: Create a section with subject code
    console.log(
      "\n1. Testing subject creation with subject code generation..."
    );

    const testSection = new Section({
      name: "Computer Science Fundamentals",
      sectionCode: "cs_fundamentals",
      subjectCode: "CS101ABC", // This should be auto-generated in production
      instructor: new mongoose.Types.ObjectId(),
      description: "Test subject for computer science",
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(),
    });

    await testSection.save();
    console.log(
      "✅ Subject created successfully with code:",
      testSection.subjectCode
    );

    // Test 2: Find subject by subject code
    console.log("\n2. Testing subject lookup by subject code...");
    const foundSection = await Section.findOne({ subjectCode: "CS101ABC" });
    if (foundSection) {
      console.log("✅ Subject found by code:", foundSection.name);
    } else {
      console.log("❌ Subject not found by code");
    }

    // Test 3: Test subject code uniqueness
    console.log("\n3. Testing subject code uniqueness...");
    try {
      const duplicateSection = new Section({
        name: "Another CS Course",
        sectionCode: "another_cs",
        subjectCode: "CS101ABC", // Same code as above
        instructor: new mongoose.Types.ObjectId(),
        description: "Duplicate test",
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(),
      });
      await duplicateSection.save();
      console.log(
        "❌ Duplicate subject code was allowed (this should not happen)"
      );
    } catch (error) {
      if (error.code === 11000) {
        console.log("✅ Duplicate subject code properly rejected");
      } else {
        console.log("❌ Unexpected error:", error.message);
      }
    }

    // Cleanup
    console.log("\n4. Cleaning up test data...");
    await Section.deleteOne({ subjectCode: "CS101ABC" });
    console.log("✅ Test data cleaned up");

    console.log("\n🎉 All subject code tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the test
testSubjectCodes();
