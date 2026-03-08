import mongoose from "mongoose";
import User from "./src/models/Users.js";

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/cyberlearn";

const checkUsers = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const users = await User.find({}).select("username email privilege");

    console.log("\n📋 Current users in the system:");
    console.log("================================");
    users.forEach((user, index) => {
      console.log(
        `${index + 1}. ${user.username} (${user.email}) - ${user.privilege}`
      );
    });

    const adminUsers = users.filter((u) => u.privilege === "admin");
    if (adminUsers.length === 0) {
      console.log("\n⚠️  No admin users found. Creating a test admin user...");

      const adminUser = new User({
        username: "admin",
        email: "admin@example.com",
        fullName: "Admin User",
        password: "admin123456",
        privilege: "admin",
        section: "no_section",
        profileImage: "https://api.dicebear.com/9.x/bottts/svg?seed=admin",
      });

      await adminUser.save();
      console.log("✅ Admin user created: admin@example.com / admin123456");
    } else {
      console.log(`\n✅ Found ${adminUsers.length} admin user(s)`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
};

checkUsers();
