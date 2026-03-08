// API URL configuration with environment variable support

// Detect if running on web and adjust API URL accordingly
import { Platform } from "react-native";

let API_URL;

// Check for environment variable first
const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

if (envApiUrl) {
  // Use environment variable if available
  API_URL = envApiUrl;
} else if (Platform.OS === "web") {
  // For web development, use localhost or the current host
  const currentHost = "localhost";
  typeof window !== "undefined" ? window.location.hostname : "localhost";

  if (currentHost === "localhost" || currentHost === "127.0.0.1") {
    API_URL = "http://localhost:3000/api";
  } else {
    // Use the same host as the web app
    API_URL = `http://${currentHost}:3000/api`;
  }
} else {
  // Fallback for mobile if no environment variable
  // API_URL = "http://192.168.1.9:3000/api";
  API_URL = "http://localhost:3000/api";
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
        const base = new URL(baseUrl);
        u.protocol = base.protocol;
        u.host = base.host; // replaces hostname + port together
        const normalized = u.toString();
        if (Platform.OS !== "web") {
          console.log("🔧 Normalized localhost image URL ->", normalized);
        }
        return normalized;
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
    console.log("📱 Mobile profile image URL construction:");
    console.log("   📁 Filename:", filename);
    console.log("   🌐 Base URL:", baseUrl);
    console.log("   🔗 Full URL:", fullUrl);
  }
  return fullUrl;
};

API_URL = "http://localhost:3000/api";

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
