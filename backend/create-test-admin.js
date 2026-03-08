import mongoose from "mongoose";
import bcrypt from "bcrypt";
import "dotenv/config";

// Simple User schema for testing
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    privilege: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student",
    },
    section: { type: String, required: true, default: "no_section" },
    profileImage: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

async function createTestAdmin() {
  try {
    const MONGO_URI =
      process.env.MONGO_URI || "mongodb://localhost:27017/cyberlearn";
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists and delete it
    const existingAdmin = await User.findOne({ email: "test@upload.com" });
    if (existingAdmin) {
      console.log("�️  Deleting existing test admin");
      await User.deleteOne({ email: "test@upload.com" });
    }

    // Create new test admin
    const hashedPassword = await bcrypt.hash("testpass123", 10);

    const testAdmin = new User({
      username: "uploadtest",
      fullName: "Upload Test Admin",
      email: "test@upload.com",
      password: hashedPassword,
      privilege: "admin",
      section: "no_section",
    });

    await testAdmin.save();
    console.log("✅ Test admin created successfully");
    console.log("Email: test@upload.com");
    console.log("Password: testpass123");

    return testAdmin;
  } catch (error) {
    console.error("❌ Error creating test admin:", error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestAdmin();
