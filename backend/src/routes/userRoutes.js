import express from "express";
import User from "../models/Users.js";
import { protectRoute, authorizeRole } from "../middleware/auth.middleware.js";
import bcrypt from "bcrypt";
import cloudinary from "../lib/cloudinary.js";
import Progress from "../models/Progress.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Reuse the same token generation function from authRoutes.js
const generateToken = (userId, privilege) => {
  return jwt.sign({userId, privilege}, process.env.JWT_SECRET, {expiresIn: "15d"});
};

/**
 * @route   GET /api/users
 * @desc    Get all users with filtering, sorting and pagination
 * @access  Private/instructor
 */
router.get("/", protectRoute, authorizeRole(['instructor', 'admin']), async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Sorting options
    const sortField = req.query.sort || 'createdAt';
    const sortDirection = req.query.direction === 'desc' ? -1 : 1;
    const sortOptions = {};
    sortOptions[sortField] = sortDirection;
    
    // Filtering options
    const filter = {};
    
    // Filter by role if provided
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    // Filter by search term
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { username: searchRegex },
        { email: searchRegex }
      ];
    }
    
    // Get total count for pagination
    const total = await User.countDocuments(filter);
    
    // Select fields excluding password
    const users = await User.find(filter)
      .select('-password -__v')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers: total,
        hasMore: page < totalPages,
        limit
      },
      filters: {
        roles: await User.distinct('role')
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch users",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/users/:id
 * * @desc    Get user by ID
 * @access  Private/instructor
 */
router.get("/:id", protectRoute, authorizeRole(['instructor', 'admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private/instructor
 */
router.post("/", protectRoute, authorizeRole(['instructor', 'admin']), async (req, res) => {
  try {
    const { username, email, password, role, profilePicture } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Please provide all required fields" 
      });
    }
    
    // Use same validation as auth routes
    if(password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password should be at least 8 characters long"
      });
    }

    if(username.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username should be at least 3 characters long"
      });
    }
    
    // Check if user exists
    const userExists = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() }
      ]
    });
    
    if (userExists) {
      if (userExists.email === email.toLowerCase()) {
        return res.status(400).json({ 
          success: false,
          message: "Email already in use" 
        });
      } else {
        return res.status(400).json({ 
          success: false,
          message: "Username already taken" 
        });
      }
    }

    // Handle profile picture upload if provided
    let imageUrl = '';
    if (profilePicture && profilePicture.startsWith('data:image')) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(profilePicture, {
          folder: 'user-profiles',
          resource_type: 'image',
        });
        imageUrl = uploadResponse.secure_url;
      } catch (cloudinaryError) {
        console.error("Error uploading profile picture:", cloudinaryError);
        // Continue without profile picture
      }
    }
    
    // Generate a Dicebear avatar if no profile picture is provided
    const profileImage = imageUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=${username}`;
    const section = 'no_section'; // Use consistent field naming with authRoutes
    const privilege = role || 'student'; // Map role to privilege for consistency
    
    // Create new user
    const newUser = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password, // The User model will hash this automatically via middleware
      profileImage,
      section,
      privilege
    });
    
    await newUser.save();
    
    // Initialize user progress like in auth routes
    await initializeUserProgress(newUser._id);
    
    // Generate token
    const token = generateToken(newUser._id, newUser.privilege);
    
    // Don't return password
    const userResponse = {
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      privilege: newUser.privilege,
      profileImage: newUser.profileImage,
      createdAt: newUser.createdAt
    };
    
    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: userResponse,
      token
    });
    
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to create user",
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private/instructor
 */
router.put("/:id", protectRoute, authorizeRole(['instructor', 'admin']), async (req, res) => {
  try {
    const { username, email, password, role, profilePicture } = req.body;
    const userId = req.params.id;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }
    
    // Check if username or email is taken (by another user)
    if (username && username !== user.username) {
      // Validation check for username length
      if(username.length < 3) {
        return res.status(400).json({
          success: false,
          message: "Username should be at least 3 characters long"
        });
      }
      
      const usernameExists = await User.findOne({ username: username.toLowerCase() });
      if (usernameExists) {
        return res.status(400).json({ 
          success: false,
          message: "Username already taken" 
        });
      }
      user.username = username.toLowerCase();
    }
    
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({ 
          success: false,
          message: "Email already in use" 
        });
      }
      user.email = email.toLowerCase();
    }
    
    // Update role/privilege if provided
    if (role) {
      user.privilege = role; // Use privilege field for consistency
    }
    
    // Update password if provided
    if (password) {
      // Password length validation
      if(password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password should be at least 8 characters long"
        });
      }
      
      // Let the User model handle the password hashing
      user.password = password;
    }
    
    // Handle profile picture update
    if (profilePicture) {
      // Check if it's a new image (not just the same URL)
      if (profilePicture.startsWith('data:image')) {
        // Delete old image from Cloudinary if exists
        if (user.profileImage && user.profileImage.includes('cloudinary')) {
          const publicId = extractPublicIdFromUrl(user.profileImage);
          if (publicId) {
            try {
              await cloudinary.uploader.destroy(publicId);
            } catch (cloudinaryError) {
              console.error("Error deleting old profile picture:", cloudinaryError);
              // Continue with update even if deletion fails
            }
          }
        }
        
        // Upload new profile picture
        try {
          const uploadResponse = await cloudinary.uploader.upload(profilePicture, {
            folder: 'user-profiles',
            resource_type: 'image',
          });
          user.profileImage = uploadResponse.secure_url;
        } catch (cloudinaryError) {
          console.error("Error uploading profile picture:", cloudinaryError);
          // Continue without updating profile picture
        }
      } else if (profilePicture !== user.profileImage) {
        // It's a URL but different from current one
        user.profileImage = profilePicture;
      }
    }
    
    await user.save();
    
    // Generate new token with updated info
    const token = generateToken(user._id, user.privilege);
    
    // Return updated user without password
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      privilege: user.privilege,
      profileImage: user.profileImage,
      updatedAt: user.updatedAt
    };
    
    res.json({
      success: true,
      message: "User updated successfully",
      user: userResponse,
      token
    });
    
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update user",
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private/instructor
 */
router.delete("/:id", protectRoute, authorizeRole(['instructor', 'admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if trying to delete self
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account"
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }
    
    // Delete profile picture from Cloudinary if exists
    if (user.profileImage && user.profileImage.includes('cloudinary')) {
      const publicId = extractPublicIdFromUrl(user.profileImage);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (cloudinaryError) {
          console.error("Error deleting profile picture:", cloudinaryError);
          // Continue with deletion even if image deletion fails
        }
      }
    }
    
    // Delete all user progress records
    await Progress.deleteMany({ user: userId });
    
    // Delete user
    await User.findByIdAndDelete(userId);
    
    res.json({
      success: true,
      message: "User and associated data deleted successfully"
    });
    
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete user",
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

// Helper function to initialize user progress - Same as in authRoutes
async function initializeUserProgress(userId) {
  try {
    const existingProgress = await Progress.findOne({ user: userId });
    if (existingProgress) {
      return existingProgress;
    }
    
    // Find first module
    const Module = await import("../models/Module.js").then(module => module.default);
    const firstModule = await Module.findOne({ order: 1 });
    
    if (!firstModule) {
      console.log("No modules found - progress not initialized");
      return null;
    }
    
    // Find first quiz in first module
    const Quiz = await import("../models/Quiz.js").then(module => module.default);
    const firstQuiz = await Quiz.findOne({ 
      module: firstModule._id, 
      order: 1 
    }).sort({ order: 1 });
    
    const progress = new Progress({
      user: userId,
      globalProgress: {
        currentModule: firstModule._id,
        unlockedModules: [firstModule._id],
        completedModules: []
      },
      moduleProgress: [{
        module: firstModule._id,
        status: 'unlocked',
        currentQuiz: firstQuiz?._id,
        unlockedQuizzes: firstQuiz ? [firstQuiz._id] : [],
        completedQuizzes: []
      }]
    });
    
    await progress.save();
    console.log(`Progress initialized for user ${userId}`);
    return progress;
  } catch (error) {
    console.error("Error initializing user progress:", error);
    return null;
  }
}

export default router;
