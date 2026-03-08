import fetch from "node-fetch";

const API_URL = "http://localhost:3000/api";

async function testBulkImport() {
  console.log("Testing Bulk Import Functionality...\n");

  try {
    // 1. Login as admin first
    console.log("1. Logging in as admin...");
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "admin@cyberlearn.test",
        password: "admin123",
      }),
    });

    const loginData = await loginResponse.json();
    console.log("Login response:", loginData);

    if (!loginData.success) {
      throw new Error("Failed to login as admin");
    }

    const token = loginData.token;
    console.log("✅ Admin login successful");

    // 2. Test bulk import with sample data
    console.log("\n2. Testing bulk import...");
    const sampleCsvData = [
      {
        username: "testuser1",
        email: "testuser1@example.com",
        password: "password123",
        role: "student",
        fullName: "Test User One",
      },
      {
        username: "testuser2",
        email: "testuser2@example.com",
        password: "password123",
        role: "student",
        fullName: "Test User Two",
      },
    ];

    const importResponse = await fetch(`${API_URL}/admin/users/bulk-import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ csvData: sampleCsvData }),
    });

    const importData = await importResponse.json();
    console.log("Import response:", importData);

    if (importData.success) {
      console.log("✅ Bulk import test successful");
      console.log(`Created: ${importData.results.success.length} users`);
      console.log(`Skipped: ${importData.results.skipped.length} users`);
      console.log(`Errors: ${importData.results.errors.length} users`);
    } else {
      console.log("❌ Bulk import test failed:", importData.message);
    }
  } catch (error) {
    console.error("Error testing bulk import:", error);
  }
}

testBulkImport();
