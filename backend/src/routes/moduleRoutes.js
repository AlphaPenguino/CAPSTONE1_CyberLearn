import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Module from "../models/Module.js";
import { protectRoute, authorizeRole } from "../middleware/auth.middleware.js";

const router = express.Router();

// Configure Cloudinary (if not already done elsewhere)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//create


router.post("/", protectRoute, authorizeRole(['admin', 'superadmin']), async (req, res) => {
    try {
        const { title, description, category, image } = req.body;

        if (!title || !description || !category || !image) {
            return res.status(400).json({ message: "Please provide all fields" });
        }

        // ✅ Auto-assign the next order number
        const lastModule = await Module.findOne().sort({ order: -1 }).select('order');
        const nextOrder = lastModule ? lastModule.order + 1 : 1;

        try {
            //upload image to cloudinary with options
            console.log("Starting Cloudinary upload...");
            
            // Ensure image has proper format before uploading
            let imageDataUrl = image;
            if (!image.startsWith('data:image')) {
              // Try to detect type or default to jpeg
              imageDataUrl = `data:image/jpeg;base64,${image}`;
            } 
            
            const uploadResponse = await cloudinary.uploader.upload(imageDataUrl, {
                timeout: 120000, // Increase timeout to 2 minutes
                resource_type: 'image',
            });
            
            console.log("Cloudinary upload successful");
            const imageUrl = uploadResponse.secure_url;

            const newModule = new Module({
                title,
                description,
                category,
                image: imageUrl,
                order: nextOrder // ✅ Add the auto-generated order
            });

            await newModule.save();
            
            console.log(`Module created with order: ${nextOrder}`);
            res.status(201).json({ 
                message: "Module created successfully", 
                module: newModule 
            });
            
        } catch (cloudinaryError) {
            console.error("Cloudinary upload error details:", cloudinaryError);
            
            // FIX: Safely check if message exists before using includes()
            let errorMessage = "Image upload failed";
            
            // Add this safety check
            if (cloudinaryError && typeof cloudinaryError.message === 'string') {
                if (cloudinaryError.message.includes("timed out")) {
                    errorMessage = "Image upload timed out. Try a smaller image.";
                } else if (cloudinaryError.message.includes("Invalid image")) {
                    errorMessage = "Invalid image format or corrupted image.";
                }
            }
            
            return res.status(500).json({ 
                message: errorMessage,
                error: cloudinaryError?.message || "Unknown cloudinary error"
            });
        }
    } catch (error) {
        console.error("Error creating module:", error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
});
// Enhanced GET endpoint with better filtering, sorting and projection
router.get("/", protectRoute, authorizeRole(['admin', 'student', 'superadmin']), async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Sorting options
        const sortField = req.query.sort || 'order';
        const sortDirection = req.query.direction === 'desc' ? -1 : 1;
        const sortOptions = {};
        sortOptions[sortField] = sortDirection;
        
        // Filtering options
        const filter = {};
        
        // Filter by category if provided
        if (req.query.category) {
            filter.category = req.query.category;
        }
        
        // Filter by active status
        if (req.query.active) {
            filter.isActive = req.query.active === 'true';
        }
        
        // Get total count for pagination
        const total = await Module.countDocuments(filter);
        
        // Select only fields needed for map display to improve performance
        // Only populate lessons when explicitly requested
        const shouldPopulateQuizzes = req.query.includeQuizzes === 'true';
        
        let query = Module.find(filter)
            .select('title description category image order isActive totalQuizzes lastAccessed')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);
            
        if (shouldPopulateQuizzes) {
            query = query.populate("quizzes", "title description image difficulty");
        }
        
        const modules = await query;
        
        // Calculate pagination metadata
        const totalPages = Math.ceil(total / limit);
        
        // Return well-structured response
        res.json({
            success: true,
            modules,
            pagination: {
                currentPage: page,
                totalPages,
                totalModules: total,
                hasMore: page < totalPages,
                limit
            },
            // Include available filters to help clients
            filters: {
                categories: await Module.distinct('category')
            }
        });

    } catch (error) {
        console.error("Error fetching modules:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch modules",
            error: error.message
        });
    }
});
// Update all instances where "lessons" is populated
router.get("/recent", protectRoute, authorizeRole(['admin', 'student', 'superadmin']), async (req, res) => {
        try {
        const limit = parseInt(req.query.limit) || 5; // Default to 5 recent modules
        
        const recentModules = await Module.find()
            .sort({ lastAccessed: -1 }) // Sort by most recently accessed
            .limit(limit)
            .populate("quizzes", "title description image difficulty");

        res.json({
            success: true,
            modules: recentModules
        });

    } catch (error) {
        console.error("Error fetching recent modules:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Update the get single module endpoint
router.get("/:id", protectRoute, authorizeRole(['admin', 'student', 'superadmin']), async (req, res) => {
    try {
        const module = await Module.findById(req.params.id)
            .populate("quizzes", "title description image difficulty");

        if (!module) {
            return res.status(404).json({ message: "Module not found" });
        }

        // Update last accessed timestamp
        await updateLastAccessed(module._id);

        res.json(module);
    } catch (error) {
        console.error("Error fetching module:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
router.delete("/:id", protectRoute, authorizeRole(['admin', 'superadmin']), async (req, res) => {
    try {
        // 1. Find the module to get its image URL
        const module = await Module.findById(req.params.id);
        
        if (!module) {
          return res.status(404).json({ message: "Module not found" });
        }
        
        // 2. Extract the Cloudinary public_id from the URL
        if (module.image) {
          const publicId = extractPublicIdFromUrl(module.image);
          
          if (publicId) {
            // 3. Delete the image from Cloudinary
            await cloudinary.uploader.destroy(publicId);
            console.log(`Image deleted from Cloudinary: ${publicId}`);
          }
        }
        
        // 4. Delete the module from database
        await Module.findByIdAndDelete(req.params.id);
        
        res.json({ 
          success: true, 
          message: "Module and associated image deleted successfully" 
        });
      } catch (error) {
        console.error("Error deleting module:", error);
        res.status(500).json({ message: "Failed to delete module" });
      }
});
// Update module endpoint
router.put("/:id", protectRoute, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, image } = req.body;
    
    // Find the module
    const module = await Module.findById(id);
    
    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }
    
    // Update basic fields if provided
    if (title) module.title = title;
    if (description) module.description = description;
    if (category) module.category = category;
    
    // Handle image update if provided
    if (image && image !== module.image) {
      // If it's a new image (not just the same URL)
      if (image.startsWith('data:image')) {
        // Delete old image from Cloudinary
        if (module.image) {
          const publicId = extractPublicIdFromUrl(module.image);
          if (publicId) {
            try {
              await cloudinary.uploader.destroy(publicId);
              console.log(`Old image deleted from Cloudinary: ${publicId}`);
            } catch (cloudinaryError) {
              console.error("Error deleting old image:", cloudinaryError);
              // Continue with the update even if image deletion fails
            }
          }
        }
        
        // Upload new image
        try {
          console.log("Uploading new image to Cloudinary...");
          
          // Ensure image has proper format
          let imageDataUrl = image;
          if (!image.startsWith('data:image')) {
            imageDataUrl = `data:image/jpeg;base64,${image}`;
          }
          
          const uploadResponse = await cloudinary.uploader.upload(imageDataUrl, {
            timeout: 120000, // 2 minutes timeout
            resource_type: 'image',
          });
          
          console.log("New image upload successful");
          module.image = uploadResponse.secure_url;
        } catch (cloudinaryError) {
          console.error("Error uploading new image:", cloudinaryError);
          return res.status(500).json({ 
            message: "Failed to upload new image",
            error: cloudinaryError.message
          });
        }
      } else {
        // It's a URL, just update the field
        module.image = image;
      }
    }
    
    // Save updated module
    await module.save();
    
    res.json({
      success: true,
      message: "Module updated successfully",
      module
    });
  } catch (error) {
    console.error("Error updating module:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update module",
      error: error.message
    });
  }
});

// Helper function to extract public_id from Cloudinary URL
function extractPublicIdFromUrl(url) {
  try {
    // Cloudinary URLs usually look like: 
    // https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/folder/image_id.jpg
    
    // Extract everything after the upload/ part up to the last dot
    const regex = /\/upload\/(?:v\d+\/)?(.+?)\.(?:[^.]+)$/;
    const matches = url.match(regex);
    
    if (matches && matches[1]) {
      return matches[1];
    }
    
    return null;
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
}

const updateLastAccessed = async (moduleId) => {
    try {
        await Module.findByIdAndUpdate(moduleId, {
            lastAccessed: new Date()
        });
    } catch (error) {
        console.error("Error updating last accessed:", error);
    }
};

export default router;