// Test script for bulk upload API
import fetch from "node-fetch";

const API_URL = "http://localhost:3000/api";

// Sample test data (preprocessed)
const testData = [
  {
    username: "bulktest1",
    email: "bulktest1@example.com",
    password: "password123",
    role: "student",
    fullName: "Bulk Test User One",
    section: "CS101",
  },
  {
    username: "bulktest2",
    email: "bulktest2@example.com",
    password: "password123",
    role: "instructor",
    fullName: "Bulk Test Instructor Two",
    section: "no_section",
  },
  {
    username: "bulktest3",
    email: "bulktest3@example.com",
    password: "password123",
    role: "student",
    fullName: "Bulk Test User Three",
    section: "CS102",
  },
];

async function testBulkUpload() {
  try {
    console.log("🧪 Testing Bulk Upload API...");
    console.log("📊 Test data:", JSON.stringify(testData, null, 2));

    // First, login as admin to get token
    console.log("\n🔐 Logging in as admin...");
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "admin",
        password: "admin123456",
      }),
    });

    const loginData = await loginResponse.json();

    if (!loginData.success) {
      throw new Error("Login failed: " + loginData.message);
    }

    const token = loginData.token;
    console.log("✅ Login successful");

    // Test bulk upload with preprocessed data
    console.log("\n📤 Testing bulk upload...");
    const uploadResponse = await fetch(`${API_URL}/admin/users/bulk-import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        csvData: testData,
        preprocessed: true,
      }),
    });

    const uploadData = await uploadResponse.json();

    console.log("\n📋 Upload Response:");
    console.log(JSON.stringify(uploadData, null, 2));

    if (uploadData.success) {
      console.log("\n✅ Bulk upload test successful!");
      console.log(`✨ Created: ${uploadData.results.success.length} users`);
      console.log(`⚠️  Skipped: ${uploadData.results.skipped.length} users`);
      console.log(`❌ Errors: ${uploadData.results.errors.length} users`);
    } else {
      console.log("\n❌ Bulk upload test failed:", uploadData.message);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testBulkUpload();
