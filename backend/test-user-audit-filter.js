// Test script to verify user-only audit log filtering

import fetch from "node-fetch";

const API_BASE_URL = "http://localhost:3000/api";

async function testUserOnlyFiltering() {
  try {
    console.log("Testing audit logs with user-only filtering...");

    // Test without any filters
    const response1 = await fetch(
      `${API_BASE_URL}/admin/audit-logs?page=1&limit=5`
    );
    const data1 = await response1.json();

    if (data1.success) {
      console.log("✅ Basic audit logs fetch successful");
      console.log(`Found ${data1.data.logs.length} logs`);

      if (data1.data.summary.topUsers) {
        console.log("✅ Top users summary included");
        console.log(
          "Top active users:",
          data1.data.summary.topUsers.slice(0, 3)
        );
      }
    } else {
      console.log("❌ Basic fetch failed:", data1.message);
    }

    // Test with user search filter
    const response2 = await fetch(
      `${API_BASE_URL}/admin/audit-logs?userSearch=admin&limit=3`
    );
    const data2 = await response2.json();

    if (data2.success) {
      console.log("✅ User search filter working");
      console.log(
        `Found ${data2.data.logs.length} logs for user search "admin"`
      );
    } else {
      console.log("❌ User search filter failed:", data2.message);
    }

    // Test CSV export with user filter
    const response3 = await fetch(
      `${API_BASE_URL}/admin/audit-logs/export?userSearch=test&limit=5`
    );

    if (response3.ok) {
      const csvData = await response3.text();
      console.log("✅ CSV export with user filter working");
      console.log("CSV headers:", csvData.split("\n")[0]);
    } else {
      console.log("❌ CSV export failed");
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testUserOnlyFiltering();
}

export default testUserOnlyFiltering;
