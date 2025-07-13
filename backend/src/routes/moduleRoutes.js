import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Module from "../models/Module.js";
import { protectRoute, authorizeRole } from "../middleware/auth.middleware.js";

const router = express.Router();


//create

//get all games
router.post("/", protectRoute, authorizeRole(['admin']), async (req, res) => {
    try {
        const { title, description, category, image } = req.body;

        if (!title || !description || !category || !image) {
            return res.status(400).json({ message: "Please provide all fields" });
        }

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
                image: imageUrl
            });

            await newModule.save();
            res.status(201).json({ message: "Module created successfully", module: newModule });
            
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
        res.status(500).json({ message: error.message || "Internal server error this" });
    }
});
// Enhanced GET endpoint with better filtering, sorting and projection
router.get("/", protectRoute, authorizeRole(['admin', 'student']), async (req, res) => {
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
        const shouldPopulateLessons = req.query.includeLessons === 'true';
        
        let query = Module.find(filter)
            .select('title description category image order isActive totalLessons lastAccessed')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);
            
        if (shouldPopulateLessons) {
            query = query.populate("lessons", "title description image");
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
router.get("/recent", protectRoute, authorizeRole(['admin', 'student']), async (req, res) => {
        try {
        const limit = parseInt(req.query.limit) || 5; // Default to 5 recent modules
        
        const recentModules = await Module.find()
            .sort({ lastAccessed: -1 }) // Sort by most recently accessed
            .limit(limit)
            .populate("lessons", "title description image");

        res.json({
            success: true,
            modules: recentModules
        });

    } catch (error) {
        console.error("Error fetching recent modules:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
router.get("/:id", protectRoute, authorizeRole(['admin', 'student']), async (req, res) => {
    try {
        const module = await Module.findById(req.params.id)
            .populate("lessons", "title description image");

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
router.delete("/:id", protectRoute, authorizeRole(['admin']), async (req, res) => {
    try{
        const module = await Module.findById(req.params.id);
        if(!module) {
            return res.status(404).json({ message: "Module not found" });
        }

        // Optionally, you can delete the image from cloudinary if needed
        if(module.image && module.image.includes("cloudinary")) {
            try {

                const publicId = module.image.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(publicId);

            } catch (error) {
                console.error("Error deleting image from Cloudinary:", error);
            }
            
        }

        await module.deleteOne();
        res.status(200).json({ message: "Module deleted successfully" });
    } catch (error) {
        console.error("Error deleting module:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

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