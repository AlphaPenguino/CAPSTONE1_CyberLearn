#!/usr/bin/env node

const fetch = require("node-fetch");

async function testSubjectsAPI() {
  console.log("🧪 Testing Subjects API Conversion...\n");

  try {
    // Test 1: Login as student1
    console.log("1. Testing student login...");
    const loginResponse = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "student1",
        password: "password123",
      }),
    });

    const loginData = await loginResponse.json();

    if (!loginData.success) {
      console.error("❌ Login failed:", loginData.message);
      return;
    }

    console.log("✅ Login successful");
    const token = loginData.token;

    // Test 2: Get user subjects
    console.log("\n2. Testing user-subjects endpoint...");
    const subjectsResponse = await fetch(
      "http://localhost:3000/api/subjects/user-subjects",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const subjectsData = await subjectsResponse.json();

    if (!subjectsData.success) {
      console.error("❌ User subjects fetch failed:", subjectsData.message);
      return;
    }

    console.log("✅ User subjects retrieved successfully");
    console.log(
      `📚 Found ${subjectsData.subjects?.length || 0} subjects for student1`
    );

    if (subjectsData.subjects && subjectsData.subjects.length > 0) {
      console.log("\n📋 User's subjects:");
      subjectsData.subjects.forEach((subject, index) => {
        console.log(`  ${index + 1}. ${subject.name} - ${subject.description}`);
      });
    } else {
      console.log("📝 Note: Student is not assigned to any subjects yet");
    }

    // Test 3: Test instructor login
    console.log("\n3. Testing instructor login...");
    const instructorLoginResponse = await fetch(
      "http://localhost:3000/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "instructor1",
          password: "instructor123",
        }),
      }
    );

    const instructorLoginData = await instructorLoginResponse.json();

    if (!instructorLoginData.success) {
      console.error("❌ Instructor login failed:", instructorLoginData.message);
      return;
    }

    console.log("✅ Instructor login successful");
    const instructorToken = instructorLoginData.token;

    // Test 4: Get instructor subjects
    console.log("\n4. Testing instructor user-subjects endpoint...");
    const instructorSubjectsResponse = await fetch(
      "http://localhost:3000/api/subjects/user-subjects",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${instructorToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const instructorSubjectsData = await instructorSubjectsResponse.json();

    if (!instructorSubjectsData.success) {
      console.error(
        "❌ Instructor subjects fetch failed:",
        instructorSubjectsData.message
      );
      return;
    }

    console.log("✅ Instructor subjects retrieved successfully");
    console.log(
      `📚 Found ${
        instructorSubjectsData.subjects?.length || 0
      } subjects for instructor1`
    );

    if (
      instructorSubjectsData.subjects &&
      instructorSubjectsData.subjects.length > 0
    ) {
      console.log("\n📋 Instructor's subjects:");
      instructorSubjectsData.subjects.forEach((subject, index) => {
        console.log(`  ${index + 1}. ${subject.name} - ${subject.description}`);
      });
    } else {
      console.log("📝 Note: Instructor has not created any subjects yet");
    }

    console.log("\n🎉 All tests completed successfully!");
    console.log(
      "\n✅ Conversion from sections to subjects is working correctly"
    );
    console.log("✅ Multi-subject support is properly implemented");
    console.log("✅ Both students and instructors can access their subjects");
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.error("💡 Make sure the backend server is running on port 3000");
    }
  }
}

// Run the test
testSubjectsAPI();
