import axios from "axios";

const testBulkImport = async () => {
  try {
    console.log("Testing bulk import endpoint...");

    // First, let's test with a simple admin login to get a token
    const loginResponse = await axios.post(
      "http://localhost:3000/api/auth/login",
      {
        email: "admin@cyberlearn.test",
        password: "admin123",
      }
    );

    console.log("Login successful, token received");
    const token = loginResponse.data.token;

    // Test data - small sample
    const testData = [
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

    console.log("Sending bulk import request...");
    console.log("Data to import:", JSON.stringify(testData, null, 2));

    const importResponse = await axios.post(
      "http://localhost:3000/api/admin/users/bulk-import",
      {
        csvData: testData,
        preprocessed: true,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: 30000,
      }
    );

    console.log("Import successful!");
    console.log("Response:", JSON.stringify(importResponse.data, null, 2));
  } catch (error) {
    console.error("Error during test:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
      console.error("Headers:", error.response.headers);
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error message:", error.message);
    }
  }
};

testBulkImport();
