import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base upload directory
const UPLOAD_BASE_DIR = path.join(__dirname, "../uploads");

/**
 * Save base64 image to local storage
 * @param {string} base64Data - Base64 image data (with or without data URL prefix)
 * @param {string} folder - Subfolder name (e.g., 'user-profiles', 'modules', 'quizzes')
 * @param {string} filename - Optional filename (will generate if not provided)
 * @returns {Promise<{secure_url: string, public_id: string}>}
 */
export const uploadImage = async (base64Data, folder, filename = null) => {
  try {
    // Remove data URL prefix if present
    const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");

    // Generate filename if not provided
    if (!filename) {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      filename = `${timestamp}_${randomString}.png`;
    }

    // Ensure filename has extension
    if (!path.extname(filename)) {
      filename += ".png";
    }

    // Create folder path
    const folderPath = path.join(UPLOAD_BASE_DIR, folder);

    // Ensure directory exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Full file path
    const filePath = path.join(folderPath, filename);

    // Save file
    fs.writeFileSync(filePath, base64Image, "base64");

    // Return cloudinary-like response
    const secure_url = `/uploads/${folder}/${filename}`;
    const public_id = `${folder}/${filename.replace(
      path.extname(filename),
      ""
    )}`;

    return {
      secure_url,
      public_id,
      original_filename: filename,
      resource_type: "image",
    };
  } catch (error) {
    console.error("Error uploading image to local storage:", error);
    throw new Error("Failed to upload image");
  }
};

/**
 * Delete image from local storage
 * @param {string} public_id - Public ID of the image (folder/filename_without_extension)
 * @returns {Promise<void>}
 */
export const destroyImage = async (public_id) => {
  try {
    // Construct possible file paths (try different extensions)
    const extensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
    const basePath = path.join(UPLOAD_BASE_DIR, public_id);

    for (const ext of extensions) {
      const filePath = basePath + ext;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted local image: ${filePath}`);
        return;
      }
    }

    console.log(`File not found for public_id: ${public_id}`);
  } catch (error) {
    console.error("Error deleting image from local storage:", error);
    throw error;
  }
};

/**
 * Extract public_id from local URL
 * @param {string} url - URL like "/uploads/folder/filename.ext"
 * @returns {string|null} - public_id like "folder/filename"
 */
export const extractPublicIdFromUrl = (url) => {
  try {
    if (!url || !url.startsWith("/uploads/")) {
      return null;
    }

    // Remove /uploads/ prefix and file extension
    const pathWithoutPrefix = url.replace("/uploads/", "");
    const pathWithoutExtension = pathWithoutPrefix.replace(/\.[^/.]+$/, "");

    return pathWithoutExtension;
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
};

/**
 * Check if file exists in local storage
 * @param {string} public_id - Public ID of the image
 * @returns {boolean}
 */
export const imageExists = (public_id) => {
  try {
    const extensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
    const basePath = path.join(UPLOAD_BASE_DIR, public_id);

    return extensions.some((ext) => fs.existsSync(basePath + ext));
  } catch (error) {
    return false;
  }
};

export default {
  uploader: {
    upload: uploadImage,
    destroy: destroyImage,
  },
  extractPublicIdFromUrl,
  imageExists,
};
