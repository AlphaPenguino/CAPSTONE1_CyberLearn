import { v2 as cloudinary } from "cloudinary";

// Add debugging to check credentials
console.log("Cloudinary configuration check:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? "✓ Set" : "❌ Missing",
  api_key: process.env.CLOUDINARY_API_KEY ? "✓ Set" : "❌ Missing",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "✓ Set" : "❌ Missing"
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;