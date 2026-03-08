import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/Users.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// List all users
async function listUsers() {
  try {
    const users = await User.find({})
      .select("-password")
      .sort({ privilege: 1, username: 1 });

    console.log("\n📊 CyberLearn Users Database:");
    console.log("=".repeat(50));

    // Group users by role
    const usersByRole = users.reduce((acc, user) => {
      if (!acc[user.privilege]) {
        acc[user.privilege] = [];
      }
      acc[user.privilege].push(user);
      return acc;
    }, {});

    // Display users by role
    const roleOrder = ["admin", "instructor", "student"];

    roleOrder.forEach((role) => {
      if (usersByRole[role]) {
        console.log(
          `\n🔹 ${role.toUpperCase()}S (${usersByRole[role].length}):`
        );
        usersByRole[role].forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.username} (${user.email})`);
        });
      }
    });

    console.log("\n📝 Login Credentials:");
    console.log("=".repeat(50));
    console.log("👑 Admin: admin1 / admin123");
    console.log("👨‍🏫 Instructor: instructor1 / instructor123");
    console.log("👨‍🎓 Students: student1-5 / password123");

    console.log("\n✅ All users ready for testing!");
    console.log("🌐 Backend running at: http://localhost:3000");
    console.log("📱 Update frontend API_URL to connect");

    process.exit(0);
  } catch (error) {
    console.error("Error listing users:", error);
    process.exit(1);
  }
}

listUsers();
