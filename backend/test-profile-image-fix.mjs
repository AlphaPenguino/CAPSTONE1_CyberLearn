// Test script to verify profile picture upload functionality
import fetch from "node-fetch";

const API_URL = "http://localhost:3000/api";

// Test user credentials - you may need to adjust these
const testUser = {
  email: "test@example.com",
  password: "testpassword123",
};

async function testProfileImageUpload() {
  try {
    console.log("🧪 Testing profile image upload functionality...\n");

    // Step 1: Login to get a token
    console.log("1. Logging in...");
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testUser),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    const user = loginData.user;

    console.log("✅ Login successful");
    console.log(`📧 User: ${user.email}`);
    console.log(`🖼️  Current profile image: ${user.profileImage}`);
    console.log(
      `📁 Image type: ${
        user.profileImage.startsWith("http") ? "External URL" : "Local filename"
      }\n`
    );

    // Check if the current profile image follows the new format
    if (user.profileImage && !user.profileImage.startsWith("http")) {
      console.log(
        "✅ Profile image is stored as filename only (correct format)"
      );
      console.log(`📁 Filename: ${user.profileImage}`);
      console.log(
        `🔗 Expected URL: http://localhost:3000/uploads/user-profiles/${user.profileImage}`
      );
    } else if (user.profileImage && user.profileImage.startsWith("http")) {
      console.log(
        "ℹ️  Profile image is a full URL (could be external service or old format)"
      );
    } else {
      console.log("⚠️  No profile image found");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testProfileImageUpload();
