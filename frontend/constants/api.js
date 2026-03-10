// API URL configuration with environment variable support

// Detect if running on web and adjust API URL accordingly
import { Platform } from "react-native";

let API_URL;

// Check for environment variable first
const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

if (envApiUrl) {
  // Use environment variable if explicitly set
  API_URL = envApiUrl;
} else if (Platform.OS === "web" && typeof window !== "undefined") {
  // On web: if running on cyberlearn.online (production), use deployed backend
  const hostname = window.location?.hostname || "";
  if (hostname === "cyberlearn.online" || hostname === "www.cyberlearn.online") {
    API_URL = "https://capstone-backend-deploy.onrender.com/api";
  } else {
    // Local web dev (localhost)
    API_URL = "http://localhost:3000/api";
  }
} else {
  // Native mobile — always use deployed backend in production
  API_URL = "https://capstone-backend-deploy.onrender.com/api";
  // For local mobile dev, comment above and uncomment below:
  // API_URL = "http://192.168.1.9:3000/api";
}

console.log("🚀 ~ API_URL:", API_URL);

// Helper function to construct profile image URLs
export const constructProfileImageUrl = (filename) => {
  if (!filename) return null;

  const baseUrl = API_URL.replace("/api", "");

  // Already a URL? Normalize localhost -> base host (helps when backend stored full http://localhost path)
  if (/^https?:\/\//i.test(filename)) {
    try {
      const u = new URL(filename);
      if (["localhost", "127.0.0.1"].includes(u.hostname)) {
        // Remap any stored localhost URLs to the deployed backend
        const remapped = `https://capstone-backend-deploy.onrender.com${u.pathname}`;
        console.log("🔧 Remapped localhost image URL ->", remapped);
        return remapped;
      }
      return filename; // External or already correct
    } catch (e) {
      // Fall through to treat as relative/filename
    }
  }

  // Handle paths starting with /uploads
  if (filename.startsWith("/uploads")) {
    return `${baseUrl}${filename}`;
  }

  const fullUrl = `${baseUrl}/uploads/user-profiles/${filename}`;

  if (Platform.OS !== "web") {
    console.log("📱 Mobile profile image URL:", fullUrl);
  }
  return fullUrl;
};

export { API_URL };

// Helper function to add cache busting to image URLs
export const addCacheBuster = (url, timestamp) => {
  if (!url) return null;
  const cacheBuster = timestamp || Date.now();
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}t=${cacheBuster}`;
};

// For development in mobile (use your computer's IP address)
// export const API_URL = "http://192.168.1.9:3001/api";

// For production deployment
// export const API_URL = "https://your-domain.com/api";

//mongodb shell
// mongosh "mongodb+srv://cluster0.djlfhjm.mongodb.net/" --apiVersion 1 --username zjpacis04
