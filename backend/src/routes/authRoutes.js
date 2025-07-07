import express from "express";
import User from "../models/Users.js";

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
        const {email, password} = req.body;
        if(!email || !password) {
            return res.status(400).json({message: "All fields are required"});
        }

        //check if user exists
        const user = await User.findOne({ email });
        if(!user) { 
            return res.status(400).json({message: "Invalid email or password"});
        }
        //check if password correct
        const isPasswordCorrect = await user.comparePassword(password);
        if(!isPasswordCorrect) {
            return res.status(400).json({message: "Invalid email or password"});
        }
        

        const token = generateToken(user._id, user.privilege);
        res.status(200).json({
            token,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                privilege: user.privilege
            }
        });

    } catch (error) {
        console.log("Error in login route", error);
        res.status(500).json({ message: "Internal server error"});
    }
});

export default router;