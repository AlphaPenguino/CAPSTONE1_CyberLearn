import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Module from "../models/Module.js";
import { protectRoute, authorizeRole } from "../middleware/auth.middleware.js";
import mongoose from "mongoose";

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

        // Auto-assign the next order number
        const lastModule = await Module.findOne().sort({ order: -1 }).select('order');
        const nextOrder = lastModule ? lastModule.order + 1 : 1;

        try {
            // Upload image to cloudinary
            console.log("Starting Cloudinary upload...");
            
            // Ensure image has proper format before uploading
            let imageDataUrl = image;
            if (!image.startsWith('data:image')) {
              imageDataUrl = `data:image/jpeg;base64,${image}`;
            } 
            
            const uploadResponse = await cloudinary.uploader.upload(imageDataUrl, {
                timeout: 120000,
                resource_type: 'image',
            });
            
            console.log("Cloudinary upload successful");
            const imageUrl = uploadResponse.secure_url;

            const newModule = new Module({
                title,
                description,
                category,
                image: imageUrl,
                order: nextOrder,
                createdBy: req.user.id // Add the user ID who created the module
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
    const moduleId = req.params.id;
    const module = await Module.findById(moduleId);
    
    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }
    
    // 1. Get the deleted module's order number
    const deletedModuleOrder = module.order;
    
    // 2. Handle image deletion with Cloudinary
    if (module.image) {
      const publicId = extractPublicIdFromUrl(module.image);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }
    
    // 3. Delete all quizzes in this module to prevent orphaned records
    const Quiz = mongoose.model('Quiz');
    const quizzesInModule = await Quiz.find({ module: moduleId });
    
    console.log(`Deleting ${quizzesInModule.length} quizzes from module ${module.title}`);
    
    await Quiz.deleteMany({ module: moduleId });
    
    // 4. Delete the module itself
    await Module.findByIdAndDelete(moduleId);
    
    // 5. Reorder remaining modules to close the gap
    await reorderModulesAfterDeletion(deletedModuleOrder);
    
    // 6. Update all progress records to repair student progression
    await repairProgressAfterModuleDeletion(moduleId, deletedModuleOrder);
    
    res.json({ 
      success: true, 
      message: "Module, associated quizzes, and progress data updated successfully" 
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

// Add to progressRoutes.js
router.post("/repair-system", protectRoute, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { userId } = req.body;
    
    // If userId provided, repair just that user, otherwise repair all
    const query = userId ? { user: userId } : {};
    
    console.log(`Starting system repair for ${userId ? 'user ' + userId : 'all users'}`);
    
    // Get all modules sorted by order
    const Module = mongoose.model('Module');
    const allModules = await Module.find().sort({ order: 1 });
    
    if (allModules.length === 0) {
      return res.status(404).json({ message: "No modules found in the system" });
    }
    
    // First module should always be accessible
    const firstModule = allModules[0];
    
    // Get users to repair
    const progressRecords = await Progress.find(query);
    console.log(`Found ${progressRecords.length} progress records to repair`);
    
    let repairedCount = 0;
    
    for (const progress of progressRecords) {
      let needsSaving = false;
      
      // 1. Ensure first module is unlocked
      if (!progress.globalProgress.unlockedModules.some(id => 
        id.toString() === firstModule._id.toString())) {
        
        progress.globalProgress.unlockedModules.push(firstModule._id);
        needsSaving = true;
        console.log(`Unlocked first module for user ${progress.user}`);
      }
      
      // 2. Ensure there's a current module
      if (!progress.globalProgress.currentModule ||
          !allModules.some(m => m._id.toString() === progress.globalProgress.currentModule.toString())) {
        
        // Find the most advanced unlocked module for this user
        const unlockedModuleIds = progress.globalProgress.unlockedModules.map(id => id.toString());
        const eligibleModules = allModules.filter(m => 
          unlockedModuleIds.includes(m._id.toString())
        );
        
        if (eligibleModules.length > 0) {
          // Use the most advanced unlocked module
          progress.globalProgress.currentModule = eligibleModules[eligibleModules.length - 1]._id;
        } else {
          // Fallback to first module
          progress.globalProgress.currentModule = firstModule._id;
          progress.globalProgress.unlockedModules.push(firstModule._id);
        }
        
        needsSaving = true;
        console.log(`Fixed current module for user ${progress.user}`);
      }
      
      // 3. Create module progress entries for any missing modules
      for (const module of allModules) {
        const hasModuleProgress = progress.moduleProgress.some(mp => 
          mp.module.toString() === module._id.toString()
        );
        
        if (!hasModuleProgress) {
          // Module is unlocked if it's the first one or in the unlocked array
          const isUnlocked = 
            module.order === 1 || 
            progress.globalProgress.unlockedModules.some(id => 
              id.toString() === module._id.toString()
            );
          
          // Create a Quiz model reference
          const Quiz = mongoose.model('Quiz');
          
          // Get first quiz in this module
          const firstQuiz = await Quiz.findOne({ 
            module: module._id,
            order: 1
          });
          
          // Create module progress
          const newModuleProgress = {
            module: module._id,
            status: isUnlocked ? 'unlocked' : 'locked',
            currentQuiz: firstQuiz?._id,
            unlockedQuizzes: isUnlocked && firstQuiz ? [firstQuiz._id] : [],
            completedQuizzes: []
          };
          
          progress.moduleProgress.push(newModuleProgress);
          needsSaving = true;
          console.log(`Created missing module progress for module ${module.title} for user ${progress.user}`);
        }
      }
      
      if (needsSaving) {
        await progress.save();
        repairedCount++;
      }
    }
    
    res.json({
      success: true,
      message: `System repair complete. Fixed ${repairedCount} progress records.`,
      totalProcessed: progressRecords.length
    });
  } catch (error) {
    console.error("Error repairing system:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to repair system",
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

// Helper function to reorder modules after deletion
async function reorderModulesAfterDeletion(deletedOrder) {
  try {
    // Find all modules with order greater than the deleted module
    const modulesToReorder = await Module.find({
      order: { $gt: deletedOrder }
    }).sort({ order: 1 });
    
    console.log(`Reordering ${modulesToReorder.length} modules after deletion of order ${deletedOrder}`);
    
    // Update each module's order by decreasing by 1
    const updatePromises = modulesToReorder.map((module, index) => {
      const newOrder = deletedOrder + index;
      console.log(`Moving module '${module.title}' from order ${module.order} to ${newOrder}`);
      return Module.findByIdAndUpdate(module._id, { order: newOrder });
    });
    
    await Promise.all(updatePromises);
    
    console.log(`Successfully reordered ${modulesToReorder.length} modules`);
  } catch (error) {
    console.error("Error reordering modules:", error);
    throw error;
  }
}

// Helper function to repair progress records
async function repairProgressAfterModuleDeletion(deletedModuleId, deletedModuleOrder) {
  try {
    const Progress = mongoose.model('Progress');
    const Module = mongoose.model('Module');
    
    // Find the next accessible module (new first module or next one in sequence)
    const nextModule = await Module.findOne({ order: deletedModuleOrder })
      .select('_id');
    
    // If no replacement exists at this order (it was the last module), find previous one
    const replacementModule = nextModule || await Module.findOne({ order: deletedModuleOrder - 1 })
      .select('_id');
      
    // If no modules exist at all, nothing to repair
    if (!replacementModule) {
      console.log("No replacement modules found - system has no modules left");
      return;
    }
    
    console.log(`Using ${nextModule ? 'next' : 'previous'} module as replacement for deleted module`);
    
    // Get all user progress records
    const progressRecords = await Progress.find();
    console.log(`Repairing ${progressRecords.length} progress records`);
    
    // Process each progress record
    for (const progress of progressRecords) {
      let needsSaving = false;
      
      // 1. Fix global progress references
      if (progress.globalProgress.currentModule && 
          progress.globalProgress.currentModule.toString() === deletedModuleId.toString()) {
        progress.globalProgress.currentModule = replacementModule._id;
        console.log(`Repaired current module for user ${progress.user}`);
        needsSaving = true;
      }
      
      // 2. Remove deleted module from unlocked modules array
      const unlockedModulesFiltered = progress.globalProgress.unlockedModules.filter(
        id => id.toString() !== deletedModuleId.toString()
      );
      
      if (unlockedModulesFiltered.length !== progress.globalProgress.unlockedModules.length) {
        progress.globalProgress.unlockedModules = unlockedModulesFiltered;
        
        // Make sure the first module is always unlocked
        const firstModule = await Module.findOne({ order: 1 }).select('_id');
        if (firstModule && !unlockedModulesFiltered.some(id => id.toString() === firstModule._id.toString())) {
          progress.globalProgress.unlockedModules.push(firstModule._id);
        }
        
        needsSaving = true;
      }
      
      // 3. Remove deleted module from completed modules
      const completedModulesFiltered = progress.globalProgress.completedModules.filter(
        item => item.module.toString() !== deletedModuleId.toString()
      );
      
      if (completedModulesFiltered.length !== progress.globalProgress.completedModules.length) {
        progress.globalProgress.completedModules = completedModulesFiltered;
        needsSaving = true;
      }
      
      // 4. Remove module progress for deleted module
      const moduleProgressFiltered = progress.moduleProgress.filter(
        mp => mp.module.toString() !== deletedModuleId.toString()
      );
      
      if (moduleProgressFiltered.length !== progress.moduleProgress.length) {
        progress.moduleProgress = moduleProgressFiltered;
        needsSaving = true;
      }
      
      // 5. Save changes if needed
      if (needsSaving) {
        await progress.save();
        console.log(`Repaired progress for user ${progress.user}`);
      }
    }
    
    console.log("Finished repairing progress records");
  } catch (error) {
    console.error("Error repairing progress:", error);
    throw error;
  }
}

export default router;