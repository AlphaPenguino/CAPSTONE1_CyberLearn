// Test script to check if profile images are accessible via HTTP
import fetch from "node-fetch";

const API_BASE = "http://192.168.18.10:3000"; // Using your mobile IP
const testFilename = "68b1d3667ce2c02a2f91661a_1757091605786.png";
const imageUrl = `${API_BASE}/uploads/user-profiles/${testFilename}`;

async function testImageAccess() {
  try {
    console.log("🧪 Testing image access from mobile IP...\n");
    console.log(`📱 Testing URL: ${imageUrl}`);

    const response = await fetch(imageUrl);

    console.log(`📊 Response status: ${response.status}`);
    console.log(`📋 Response headers:`, {
      "content-type": response.headers.get("content-type"),
      "content-length": response.headers.get("content-length"),
      "access-control-allow-origin": response.headers.get(
        "access-control-allow-origin"
      ),
    });

    if (response.ok) {
      console.log("✅ Image is accessible!");
      console.log(
        `📏 Image size: ${response.headers.get("content-length")} bytes`
      );
    } else {
      console.log("❌ Image not accessible");
      console.log(`📄 Response text: ${await response.text()}`);
    }
  } catch (error) {
    console.error("💥 Error accessing image:", error.message);
  }
}

// Also test the API endpoint
async function testAPIAccess() {
  try {
    console.log("\n🧪 Testing API access...\n");
    const apiUrl = `${API_BASE}/api/hello`;
    console.log(`🌐 Testing URL: ${apiUrl}`);

    const response = await fetch(apiUrl);

    console.log(`📊 API Response status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ API is accessible!");
      console.log(`📄 Response:`, data);
    } else {
      console.log("❌ API not accessible");
    }
  } catch (error) {
    console.error("💥 Error accessing API:", error.message);
  }
}

// Run tests
console.log("🚀 Starting network connectivity tests...\n");
testAPIAccess().then(() => testImageAccess());
