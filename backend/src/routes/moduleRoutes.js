import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Module from "../models/Module.js";
import { protectRoute, authorizeRole } from "../middleware/auth.middleware.js";

const router = express.Router();


//create

//get all games
router.post("/", protectRoute, authorizeRole(['admin']), async (req, res) => {
    try {
        const { title, description, category, image, totalLessons, lessons, order, isActive } = req.body;

        if (!title || !category || !image) {
            return res.status(400).json({ message: "Please provide all fields" });
        }

        //upload image to cloudinary
        //const uploadResponse = await cloudinary.uploader.upload(image);
        //const imageUrl = uploadResponse.secure_url;

        const newModule = new Module({
            title,
            description,
            category,
            image,
            totalLessons: totalLessons || 0,
            lessons: lessons || [],
            order: order || 0,
            isActive: isActive !== undefined ? isActive : true
        });

        await newModule.save();

        res.status(201).json({ message: "Module created successfully", module: newModule });

    } catch (error) {
        console.error("Error fetching modules:", error);
        res.status(500).json({ message: "Internal server error" });
    }
    
});

export default router;