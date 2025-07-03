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

        if (!title || !category || !image) {
            return res.status(400).json({ message: "Please provide all fields" });
        }

        //upload image to cloudinary
        const uploadResponse = await cloudinary.uploader.upload(image);
        const imageUrl = uploadResponse.secure_url;

        const newModule = new Module({
            title,
            description,
            category,
            image: imageUrl
        });

        await newModule.save();

        res.status(201).json({ message: "Module created successfully", module: newModule });

    } catch (error) {
        console.error("Error fetching modules:", error);
        res.status(500).json({ message: "Internal server error" });
    }
    
});
router.get("/", protectRoute, authorizeRole(['admin', 'student']), async (req, res) => {
    try {
        //
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await Module.countDocuments();


        const modules = await Module.find()
            .sort({ order: 1 })
            .skip(skip)
            .limit(limit)
            .populate("lessons", "title description image");

        const totalPages = Math.ceil(total / limit);
        
        res.json({
            modules,
            currentPage: page,
            totalPages,
            totalModules: total,
            hasMore: page < totalPages
        });

    } catch (error) {
        console.error("Error fetching modules:", error);
        res.status(500).json({ message: "Internal server error" });
    }
})
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