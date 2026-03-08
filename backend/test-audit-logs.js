import fetch from "node-fetch";

const API_URL = "http://localhost:3000/api";

// Test credentials - you'll need to have an admin user in your system
const testLogin = {
  email: "admin@cyberlearn.test", // Replace with your admin email
  password: "admin123456", // Replace with your admin password
};

let authToken = "";

const login = async () => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testLogin),
    });

    if (response.ok) {
      const data = await response.json();
      authToken = data.token;
      console.log("✅ Login successful");
      return true;
    } else {
      console.log("❌ Login failed");
      return false;
    }
  } catch (error) {
    console.error("Login error:", error);
    return false;
  }
};

const testAuditLogsEndpoint = async () => {
  try {
    console.log("\n🔍 Testing audit logs endpoint...");

    const response = await fetch(`${API_URL}/admin/audit-logs?limit=10`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Audit logs endpoint working");
      console.log(`📊 Found ${data.data.logs.length} logs`);
      console.log(`📈 Total logs: ${data.data.pagination.total}`);

      // Display first few logs
      if (data.data.logs.length > 0) {
        console.log("\n🔍 Sample logs:");
        data.data.logs.slice(0, 3).forEach((log, index) => {
          console.log(
            `${index + 1}. ${log.username} (${log.userRole}) - ${
              log.action
            } at ${new Date(log.createdAt).toLocaleString()}`
          );
        });
      }
    } else {
      console.log("❌ Audit logs endpoint failed");
    }
  } catch (error) {
    console.error("Error testing audit logs:", error);
  }
};

const testActionsEndpoint = async () => {
  try {
    console.log("\n🔍 Testing audit log actions endpoint...");

    const response = await fetch(`${API_URL}/admin/audit-logs/actions`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Actions endpoint working");
      console.log(`📋 Available actions: ${data.data.actions.join(", ")}`);
      console.log(`📋 Available resources: ${data.data.resources.join(", ")}`);
    } else {
      console.log("❌ Actions endpoint failed");
    }
  } catch (error) {
    console.error("Error testing actions endpoint:", error);
  }
};

const createTestUser = async () => {
  try {
    console.log("\n👤 Creating test user to generate audit logs...");

    const testUser = {
      username: `testuser_${Date.now()}`,
      fullName: "Test User for Audit",
      email: `test_${Date.now()}@example.com`,
      password: "password123",
      role: "student",
    };

    const response = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(testUser),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Test user created successfully");
      console.log(`👤 Created user: ${data.user.username}`);
      return data.user;
    } else {
      const error = await response.text();
      console.log("❌ Failed to create test user:", error);
      return null;
    }
  } catch (error) {
    console.error("Error creating test user:", error);
    return null;
  }
};

const performTestFailedLogin = async () => {
  try {
    console.log("\n🔐 Testing failed login to generate audit log...");

    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "nonexistent@example.com",
        password: "wrongpassword",
      }),
    });

    // We expect this to fail
    if (!response.ok) {
      console.log("✅ Failed login generated (this is expected)");
    }
  } catch (error) {
    console.log("✅ Failed login attempt completed");
  }
};

const main = async () => {
  console.log("🚀 Starting audit logs test...\n");

  // 1. Login as admin
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log(
      "Cannot continue without admin login. Please check your credentials."
    );
    return;
  }

  // 2. Test basic endpoints
  await testAuditLogsEndpoint();
  await testActionsEndpoint();

  // 3. Create some activity to log
  await createTestUser();
  await performTestFailedLogin();

  // 4. Check logs again to see new entries
  console.log("\n📝 Checking for new audit logs...");
  await testAuditLogsEndpoint();

  console.log("\n✅ Audit logs test completed!");
  console.log("\n📋 To view the audit logs in the frontend:");
  console.log("1. Open the app and login as admin");
  console.log("2. Go to Admin Dashboard");
  console.log('3. Click on the "Audit Logs" tab');
};

main().catch(console.error);
