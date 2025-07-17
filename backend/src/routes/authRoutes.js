import express from "express";
import User from "../models/Users.js";
import Progress from "../models/Progress.js";
import Module from "../models/Module.js";
import Quiz from "../models/Quiz.js";

import jwt from "jsonwebtoken";
const router = express.Router();

const generateToken = (userId, privilege) => {
    return jwt.sign({userId, privilege}, process.env.JWT_SECRET, {expiresIn: "15d"});
}

router.post("/register", async (req, res) => {
    try {
        const {email, username, password} = req.body;

        if(!username || !email || !password) {
            return res.status(400).json({message: "All fields are required"});
        }

        if(password.length < 8) {
            return res.status(400).json({message: "Password should be at least 8 characters long"});
        }

        if(username.length < 3) {
            return res.status(400).json({message: "Username should be at least 3 characters long"});
        }

        const existingEmail = await User.findOne({ email});
        if (existingEmail) {
            return res.status(400).json({message: "Email already exists"});
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({message: "User already exists"});
        }
        
        const profileImage = `https://api.dicebear.com/9.x/bottts/svg?seed=${username}`;
        const privilege = `student`;
        const section = `no_section`;


        const user = new User({
            email,
            username,
            password,
            profileImage,
            section,
            privilege
        });

        await user.save();

        // Auto-initialize progress for new user
        await initializeUserProgress(user._id);

        const token = generateToken(user._id, user.privilege);

        res.status(201).json({
            token,
            user:{
                _id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                privilege: user.privilege
            }
        });
    } catch (error) {
          console.log("Error in register route", error);
          res.status(500).json({ message: "Internal server error"});  
    }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if(!email || !password) {
        return res.status(400).json({message: "All fields are required"});
    }

    //check if user exists
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    
    // ✅ Include privilege in JWT payload
    const token = jwt.sign(
      { 
        userId: user._id,
        privilege: user.privilege // Include privilege in token
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        email: user.email,
        privilege: user.privilege,
        // ... other user fields
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Helper function to initialize user progress
async function initializeUserProgress(userId) {
  try {
    const existingProgress = await Progress.findOne({ user: userId });
    if (existingProgress) {
      return existingProgress;
    }
    
    // Find first module
    const firstModule = await Module.findOne({ order: 1 });
    if (!firstModule) {
      console.log("No modules found - progress not initialized");
      return null;
    }
    
    // Find first quiz in first module - Fix the query
    const firstQuiz = await Quiz.findOne({ 
      module: firstModule._id, 
      order: 1 
    }).sort({ order: 1 });
    
    console.log("First module:", firstModule._id);
    console.log("First quiz found:", firstQuiz ? firstQuiz._id : "No quiz found");
    
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
        unlockedQuizzes: firstQuiz ? [firstQuiz._id] : [], // ✅ Make sure this gets the quiz
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