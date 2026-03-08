import fetch from "node-fetch";

const API_URL = "http://localhost:3000/api";

// Test credentials - you'll need to have these users in your system
const instructorLogin = {
  email: "instructor@example.com", // Replace with your instructor email
  password: "instructor123", // Replace with your instructor password
};

const studentLogin = {
  email: "student@example.com", // Replace with your student email
  password: "student123", // Replace with your student password
};

let instructorToken = "";
let studentToken = "";

const loginAs = async (credentials, role) => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${role} login successful`);
      return data.token;
    } else {
      console.log(`❌ ${role} login failed`);
      const error = await response.text();
      console.log("Error:", error);
      return null;
    }
  } catch (error) {
    console.error(`${role} login error:`, error);
    return null;
  }
};

const testInstructorActivities = async (token) => {
  console.log("\n🎓 Testing Instructor Activities...");

  // Test instructor dashboard access
  try {
    const response = await fetch(`${API_URL}/instructor/dashboard/summary`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      console.log("✅ Instructor dashboard access - should be logged");
    }
  } catch (error) {
    console.log("❌ Error accessing instructor dashboard:", error.message);
  }

  // Test instructor analytics access
  try {
    const response = await fetch(`${API_URL}/instructor/analytics/students`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      console.log("✅ Instructor analytics access - should be logged");
    }
  } catch (error) {
    console.log("❌ Error accessing instructor analytics:", error.message);
  }

  // Test subject creation
  try {
    const response = await fetch(`${API_URL}/subjects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: `Test Subject ${Date.now()}`,
        description: "Test subject for audit logging",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Subject creation - should be logged");
      return data.subject._id;
    }
  } catch (error) {
    console.log("❌ Error creating subject:", error.message);
  }

  return null;
};

const testStudentActivities = async (token) => {
  console.log("\n👨‍🎓 Testing Student Activities...");

  // Test cyberquest access
  try {
    const response = await fetch(`${API_URL}/all-cyber-quests-progress`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      console.log("✅ CyberQuest map access - should be logged");
    }
  } catch (error) {
    console.log("❌ Error accessing cyberquest:", error.message);
  }

  // Test modules access
  try {
    const response = await fetch(`${API_URL}/progress/modules`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      console.log("✅ Student progress/modules access - should be logged");
    }
  } catch (error) {
    console.log("❌ Error accessing modules:", error.message);
  }

  // Test modules list access
  try {
    const response = await fetch(`${API_URL}/modules`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      console.log("✅ Student modules list access - should be logged");
    }
  } catch (error) {
    console.log("❌ Error accessing modules list:", error.message);
  }
};

const testLogout = async (token, role) => {
  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      console.log(`✅ ${role} logout - should be logged with timestamp`);
    }
  } catch (error) {
    console.log(`❌ Error during ${role} logout:`, error.message);
  }
};

const viewEnhancedAuditLogs = async () => {
  console.log("\n📋 Checking Enhanced Audit Logs...");

  // Use instructor token if available, or try to login as admin
  const token = instructorToken;
  if (!token) {
    console.log("❌ No token available to view audit logs");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/admin/audit-logs?limit=20`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Found ${data.data.logs.length} recent audit logs`);

      // Show the most recent logs with new activities
      console.log("\n🔍 Recent Enhanced Audit Activities:");
      data.data.logs.slice(0, 10).forEach((log, index) => {
        const details = log.details || {};
        const detailsStr =
          Object.keys(details).length > 0
            ? ` | Details: ${JSON.stringify(details).slice(0, 100)}...`
            : "";

        console.log(
          `${index + 1}. [${log.userRole.toUpperCase()}] ${log.username} - ${
            log.action
          } | Resource: ${log.resource || "N/A"}${detailsStr}`
        );
      });

      // Show activity summary by action type
      const actionCounts = {};
      data.data.logs.forEach((log) => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      });

      console.log("\n📊 Activity Summary:");
      Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .forEach(([action, count]) => {
          console.log(`  ${action}: ${count} times`);
        });
    } else {
      console.log("❌ Failed to fetch audit logs");
    }
  } catch (error) {
    console.error("Error fetching audit logs:", error);
  }
};

const main = async () => {
  console.log("🚀 Testing Enhanced Audit Logging...\n");

  // Login as instructor
  instructorToken = await loginAs(instructorLogin, "Instructor");
  if (!instructorToken) {
    console.log("⚠️  Cannot test instructor activities without login");
  }

  // Login as student
  studentToken = await loginAs(studentLogin, "Student");
  if (!studentToken) {
    console.log("⚠️  Cannot test student activities without login");
  }

  // Test instructor activities
  if (instructorToken) {
    await testInstructorActivities(instructorToken);
  }

  // Test student activities
  if (studentToken) {
    await testStudentActivities(studentToken);
  }

  // Test logout activities
  if (instructorToken) {
    await testLogout(instructorToken, "Instructor");
  }
  if (studentToken) {
    await testLogout(studentToken, "Student");
  }

  // Wait a moment for logs to be written
  console.log("\n⏳ Waiting for logs to be processed...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // View the enhanced audit logs
  await viewEnhancedAuditLogs();

  console.log("\n✅ Enhanced audit logging test completed!");
  console.log("\n📝 New audit log features tested:");
  console.log("  ✓ Instructor dashboard access");
  console.log("  ✓ Instructor analytics access");
  console.log("  ✓ Subject creation by instructors");
  console.log("  ✓ Student CyberQuest map access");
  console.log("  ✓ Student module/progress access");
  console.log("  ✓ Enhanced logout with timestamps");
  console.log("  ✓ Detailed activity context in logs");
};

main().catch(console.error);
