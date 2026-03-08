import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs";

const API_URL = process.env.API_URL || "http://localhost:3000";

// Test login to get token
async function testProfilePictureUpload() {
  try {
    console.log("🔧 Testing profile picture upload endpoint...");

    // First, login to get a token
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "test@upload.com", // Using test admin account
        password: "testpass123",
      }),
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      console.error("Login error response:", errorData);
      throw new Error(
        `Login failed: ${loginResponse.status} - ${errorData.message}`
      );
    }

    const loginData = await loginResponse.json();
    console.log("✅ Login successful");

    const token = loginData.token;

    // Test with a simple image file (create a dummy one)
    const testImagePath = "./test-image.png";

    // Create a simple test image file if it doesn't exist
    if (!fs.existsSync(testImagePath)) {
      // Create a minimal PNG file (1x1 pixel)
      const pngData = Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a, // PNG signature
        0x00,
        0x00,
        0x00,
        0x0d, // IHDR chunk length
        0x49,
        0x48,
        0x44,
        0x52, // IHDR
        0x00,
        0x00,
        0x00,
        0x01, // Width: 1
        0x00,
        0x00,
        0x00,
        0x01, // Height: 1
        0x08,
        0x02,
        0x00,
        0x00,
        0x00, // Bit depth, color type, compression, filter, interlace
        0x90,
        0x77,
        0x53,
        0xde, // CRC
        0x00,
        0x00,
        0x00,
        0x0c, // IDAT chunk length
        0x49,
        0x44,
        0x41,
        0x54, // IDAT
        0x08,
        0x99,
        0x01,
        0x01,
        0x00,
        0x00,
        0x00,
        0xff,
        0xff,
        0x00,
        0x00,
        0x00,
        0x02,
        0x00,
        0x01,
        0xe5,
        0x27,
        0xde,
        0xfc, // CRC
        0x00,
        0x00,
        0x00,
        0x00, // IEND chunk length
        0x49,
        0x45,
        0x4e,
        0x44, // IEND
        0xae,
        0x42,
        0x60,
        0x82, // CRC
      ]);
      fs.writeFileSync(testImagePath, pngData);
      console.log("📷 Created test image file");
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append("profilePicture", fs.createReadStream(testImagePath), {
      filename: "test-profile.png",
      contentType: "image/png",
    });

    console.log("📤 Uploading file...");

    // Upload the file
    const uploadResponse = await fetch(
      `${API_URL}/api/users/upload-profile-picture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...formData.getHeaders(),
        },
        body: formData,
      }
    );

    console.log("📥 Upload response status:", uploadResponse.status);

    const uploadData = await uploadResponse.json();
    console.log("📥 Upload response data:", uploadData);

    if (uploadResponse.ok && uploadData.success) {
      console.log("✅ Profile picture upload successful!");
      console.log("🖼️  New profile image URL:", uploadData.profileImageUrl);
    } else {
      console.error("❌ Upload failed:", uploadData.message);
    }

    // Clean up test file
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log("🧹 Cleaned up test file");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testProfilePictureUpload();
