const fetch = require("node-fetch");

async function testAuditLogsEmpty() {
  try {
    console.log("Testing audit logs endpoint with no data...");

    // Test without authorization first (should get 401)
    console.log("\n1. Testing without authorization:");
    const response1 = await fetch("http://localhost:3000/api/admin/audit-logs");
    console.log("Status:", response1.status);

    if (!response1.ok) {
      const error1 = await response1.json();
      console.log("Response:", error1);
    }

    // Now we need to login as admin to get a token
    console.log("\n2. Logging in as admin:");
    const loginResponse = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "admin@cyberlearn.test",
        password: "password123",
      }),
    });

    if (!loginResponse.ok) {
      console.log("Login failed, status:", loginResponse.status);
      const loginError = await loginResponse.json();
      console.log("Login error:", loginError);
      return;
    }

    const loginData = await loginResponse.json();
    console.log("Login success:", loginData.success);

    const token = loginData.token;

    // Test audit logs with authorization
    console.log("\n3. Testing audit logs with authorization:");
    const response2 = await fetch(
      "http://localhost:3000/api/admin/audit-logs",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Status:", response2.status);

    if (response2.ok) {
      const data = await response2.json();
      console.log("Success:", data.success);
      console.log("Logs count:", data.data.logs.length);
      console.log("Total logs:", data.data.summary.totalLogs);
      console.log("Pagination:", data.data.pagination);

      if (data.data.logs.length === 0) {
        console.log("✅ Empty audit logs handled correctly - no error thrown");
      } else {
        console.log("📋 Found", data.data.logs.length, "audit logs");
        console.log("First log:", data.data.logs[0]);
      }
    } else {
      const error2 = await response2.json();
      console.log("Error response:", error2);
    }
  } catch (error) {
    console.error("Test error:", error);
  }
}

// Run the test
testAuditLogsEmpty();
