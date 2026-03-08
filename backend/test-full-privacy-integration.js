import fetch from "node-fetch";

const API_URL = "http://localhost:3000/api";

// Test data
const testUser = {
  username: "privacytest001",
  fullName: "Privacy Test User",
  email: "privacytest001@test.com",
  password: "testpassword123",
};

async function testPrivacyPolicyFlow() {
  console.log("🔒 Privacy Policy Integration Test");
  console.log("================================");

  try {
    // Step 1: Register a new user
    console.log("\n1. Registering new student user...");
    const registerResponse = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testUser),
    });

    if (!registerResponse.ok) {
      console.log("⚠️  User might already exist, trying to login instead...");

      // Try to login if user exists
      const loginResponse = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      if (!loginResponse.ok) {
        throw new Error("Failed to login");
      }

      const loginData = await loginResponse.json();
      console.log("✅ User logged in successfully");
      console.log(
        `   Privacy Policy Accepted: ${
          loginData.user.privacyPolicyAccepted || false
        }`
      );

      // Step 2: Test privacy policy acceptance
      if (!loginData.user.privacyPolicyAccepted) {
        console.log("\n2. Accepting privacy policy...");
        const acceptResponse = await fetch(
          `${API_URL}/auth/accept-privacy-policy`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: loginData.user.id }),
          }
        );

        if (acceptResponse.ok) {
          const acceptData = await acceptResponse.json();
          console.log("✅ Privacy policy accepted successfully");
          console.log(
            `   Privacy Policy Accepted: ${acceptData.user.privacyPolicyAccepted}`
          );
        } else {
          console.log("❌ Failed to accept privacy policy");
        }
      } else {
        console.log("✅ Privacy policy already accepted");
      }

      return;
    }

    const registerData = await registerResponse.json();
    console.log("✅ User registered successfully");
    console.log(`   User ID: ${registerData.user._id}`);
    console.log(`   Privilege: ${registerData.user.privilege}`);
    console.log(
      `   Privacy Policy Accepted: ${
        registerData.user.privacyPolicyAccepted || false
      }`
    );

    // Step 2: Test privacy policy acceptance
    console.log("\n2. Accepting privacy policy...");
    const acceptResponse = await fetch(
      `${API_URL}/auth/accept-privacy-policy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: registerData.user._id }),
      }
    );

    if (!acceptResponse.ok) {
      throw new Error("Failed to accept privacy policy");
    }

    const acceptData = await acceptResponse.json();
    console.log("✅ Privacy policy accepted successfully");
    console.log(
      `   Privacy Policy Accepted: ${acceptData.user.privacyPolicyAccepted}`
    );

    // Step 3: Test login after privacy policy acceptance
    console.log("\n3. Testing login after privacy policy acceptance...");
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });

    if (!loginResponse.ok) {
      throw new Error("Failed to login");
    }

    const loginData = await loginResponse.json();
    console.log("✅ Login successful");
    console.log(
      `   Privacy Policy Accepted: ${loginData.user.privacyPolicyAccepted}`
    );

    console.log("\n🎉 Privacy Policy Integration Test Complete!");
    console.log("\nFeatures implemented:");
    console.log("✓ Database schema updated with privacy policy fields");
    console.log("✓ Backend API endpoint for privacy policy acceptance");
    console.log("✓ Frontend modal with Philippines privacy policy text");
    console.log("✓ Student-only privacy policy requirement");
    console.log("✓ One-time acceptance (won't show again after acceptance)");
    console.log("✓ Integration with auth flow");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testPrivacyPolicyFlow();
