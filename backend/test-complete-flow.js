// Test the complete subject code flow: create subject -> get subject code -> join subject
import axios from "axios";

const API_URL = "http://localhost:3000";

// Mock instructor and student tokens (you would get these from actual login in a real scenario)
const INSTRUCTOR_TOKEN = "your_instructor_token_here";
const STUDENT_TOKEN = "your_student_token_here";

async function testCompleteFlow() {
  try {
    console.log("🧪 Testing complete subject code flow...\n");

    // Test 1: Create a subject as instructor
    console.log("1. Creating subject as instructor...");
    const createResponse = await fetch(`${API_URL}/subjects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INSTRUCTOR_TOKEN}`,
      },
      body: JSON.stringify({
        name: "Advanced Cybersecurity",
        description: "Learn advanced cybersecurity concepts",
      }),
    });

    if (createResponse.ok) {
      const createData = await createResponse.json();
      const subjectCode = createData.subject?.subjectCode;

      console.log("✅ Subject created successfully!");
      console.log(`📋 Subject Code: ${subjectCode}`);
      console.log(`📚 Subject Name: ${createData.subject?.name}\n`);

      if (subjectCode) {
        // Test 2: Join subject as student using the code
        console.log("2. Joining subject as student...");
        const joinResponse = await fetch(`${API_URL}/subjects/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STUDENT_TOKEN}`,
          },
          body: JSON.stringify({
            subjectCode: subjectCode,
          }),
        });

        if (joinResponse.ok) {
          const joinData = await joinResponse.json();
          console.log("✅ Student joined successfully!");
          console.log(`📖 Joined: ${joinData.subject?.name}\n`);

          console.log("🎉 Complete flow test successful!");
        } else {
          const error = await joinResponse.json();
          console.log("❌ Failed to join subject:", error.message);
        }
      } else {
        console.log("❌ No subject code generated");
      }
    } else {
      const error = await createResponse.json();
      console.log("❌ Failed to create subject:", error.message);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.log("\n⚠️  Make sure the backend is running on localhost:3000");
    console.log(
      "⚠️  Replace INSTRUCTOR_TOKEN and STUDENT_TOKEN with actual tokens from login"
    );
  }
}

// Test individual endpoints
async function testEndpoints() {
  console.log("🔍 Testing API endpoints availability...\n");

  const endpoints = [
    {
      method: "GET",
      path: "/subjects/user-subjects",
      description: "Get user subjects",
    },
    { method: "POST", path: "/subjects", description: "Create subject" },
    {
      method: "POST",
      path: "/subjects/join",
      description: "Join subject by code",
    },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${API_URL}${endpoint.path}`,
        headers: {
          "Content-Type": "application/json",
        },
        validateStatus: () => true, // Don't throw errors for any status code
      });

      // We expect 401 (unauthorized) since we're not sending auth tokens
      if (response.status === 401) {
        console.log(
          `✅ ${endpoint.method} ${endpoint.path} - Endpoint exists (requires auth)`
        );
      } else {
        console.log(
          `⚠️  ${endpoint.method} ${endpoint.path} - Status: ${response.status}`
        );
      }
    } catch (error) {
      console.log(`❌ ${endpoint.method} ${endpoint.path} - Connection failed`);
    }
  }

  console.log("\n📝 To test the complete flow:");
  console.log(
    "   1. Get real auth tokens by logging in as instructor and student"
  );
  console.log(
    "   2. Replace INSTRUCTOR_TOKEN and STUDENT_TOKEN in this script"
  );
  console.log("   3. Run the complete flow test");
}

// Run endpoint availability test
testEndpoints();

// Uncomment this line to test the complete flow once you have valid tokens
// testCompleteFlow();
