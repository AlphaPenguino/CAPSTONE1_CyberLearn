import dotenv from 'dotenv';
//dotenv.config();

// After loading the environment variables, log them to verify
console.log('Environment variables loaded:');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST || 'Not set');
console.log('EMAIL_PORT:', process.env.EMAIL_PORT || 'Not set');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '***' : 'Not set');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***' : 'Not set');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '*** set ***' : 'NOT SET ⚠️');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'Not set');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'Not set');

import express from "express";
import User from "../models/Users.js";
import Progress from "../models/Progress.js";
import Module from "../models/Module.js";
import Quiz from "../models/Quiz.js";
import {
  logActivity,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  extractRequestInfo,
} from "../lib/auditLogger.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { endUserSession } from "../middleware/analytics.middleware.js";
import crypto from "crypto";
import sendEmail from "../utils/emailService.js";

import jwt from "jsonwebtoken";
const router = express.Router();

// Helper function to construct profile image URL dynamically
const constructProfileImageUrl = (filename) => {
  if (!filename) return null;

  // If it's already a full URL (external services like Dicebear), return as is
  if (filename.startsWith("http://") || filename.startsWith("https://")) {
    return filename;
  }

  // Construct URL for local uploads
  const baseUrl = process.env.API_URL || "http://localhost:3000";
  return `${baseUrl}/uploads/user-profiles/${filename}`;
};

const generateToken = (userId, privilege) => {
  return jwt.sign({ userId, privilege }, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });
};

router.post("/register", async (req, res) => {
  try {
    const { email, username, fullName, password } = req.body;

    if (!username || !email || !fullName || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password should be at least 8 characters long" });
    }

    if (username.length < 3) {
      return res
        .status(400)
        .json({ message: "Username should be at least 3 characters long" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const profileImage = `https://api.dicebear.com/9.x/bottts/svg?seed=${username}`;
    const privilege = `student`;
    const section = `no_section`;

    const user = new User({
      email,
      username,
      fullName: fullName.trim(),
      password,
      profileImage,
      section,
      privilege,
    });

    await user.save();

    // Auto-initialize progress for new user
    await initializeUserProgress(user._id);

    // Log user registration
    const requestInfo = extractRequestInfo(req);
    await logActivity({
      userId: user._id,
      username: user.username,
      userRole: user.privilege,
      action: "User registered",
      resource: AUDIT_RESOURCES.USER,
      resourceId: user._id,
      details: {
        email: user.email,
        fullName: user.fullName,
        section: user.section,
      },
      ...requestInfo,
    });

    const token = generateToken(user._id, user.privilege);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        profileImage: constructProfileImageUrl(user.profileImage),
        privilege: user.privilege,
        privacyPolicyAccepted: user.privacyPolicyAccepted,
      },
    });
  } catch (error) {
    console.log("Error in register route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    //check if user exists
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      // Log failed login attempt
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: user?._id || null,
        username: user?.username || email,
        userRole: user?.privilege || "unknown",
        action: "Login attempt failed",
        resource: AUDIT_RESOURCES.USER,
        resourceId: user?._id || null,
        details: {
          email,
          reason: !user ? "User not found" : "Invalid password",
        },
        success: false,
        ...requestInfo,
      });

      return res.status(400).json({ message: "Invalid credentials" });
    }

    // ✅ Include privilege in JWT payload
    const token = jwt.sign(
      {
        userId: user._id,
        privilege: user.privilege, // Include privilege in token
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Log successful login
    const requestInfo = extractRequestInfo(req);
    await logActivity({
      userId: user._id,
      username: user.username,
      userRole: user.privilege,
      action: "User logged in",
      resource: AUDIT_RESOURCES.USER,
      resourceId: user._id,
      details: {
        email: user.email,
        privilege: user.privilege,
      },
      ...requestInfo,
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        profileImage: constructProfileImageUrl(user.profileImage),
        email: user.email,
        privilege: user.privilege,
        privacyPolicyAccepted: user.privacyPolicyAccepted,
        // ... other user fields
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Change Password (unauthenticated - via email and old password)
router.post("/change-password", async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Log failed attempt due to email not found
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: null,
        username: email,
        userRole: "unknown",
        action: "Change password attempt failed",
        resource: AUDIT_RESOURCES.USER,
        resourceId: null,
        details: { email, reason: "Email not found" },
        success: false,
        ...requestInfo,
      });

      return res.status(404).json({ message: "Email not found" });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      // Log failed attempt due to incorrect old password
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: user._id,
        username: user.username,
        userRole: user.privilege,
        action: "Change password attempt failed",
        resource: AUDIT_RESOURCES.USER,
        resourceId: user._id,
        details: { email, reason: "Incorrect old password" },
        success: false,
        ...requestInfo,
      });

      return res.status(400).json({ message: "Incorrect old password" });
    }

    user.password = newPassword; // will be hashed by pre-save hook
    await user.save();

    // Log successful password change
    const requestInfo = extractRequestInfo(req);
    await logActivity({
      userId: user._id,
      username: user.username,
      userRole: user.privilege,
      action: "Password changed",
      resource: AUDIT_RESOURCES.USER,
      resourceId: user._id,
      details: { email: user.email },
      success: true,
      ...requestInfo,
    });

    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/accept-privacy-policy", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedAt: new Date(),
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Privacy policy accepted successfully",
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        profileImage: constructProfileImageUrl(user.profileImage),
        email: user.email,
        privilege: user.privilege,
        privacyPolicyAccepted: user.privacyPolicyAccepted,
      },
    });
  } catch (error) {
    console.error("Accept privacy policy error:", error);
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
      order: 1,
    }).sort({ order: 1 });

    console.log("First module:", firstModule._id);
    console.log(
      "First quiz found:",
      firstQuiz ? firstQuiz._id : "No quiz found"
    );

    const progress = new Progress({
      user: userId,
      globalProgress: {
        currentModule: firstModule._id,
        unlockedModules: [firstModule._id],
        completedModules: [],
      },
      moduleProgress: [
        {
          module: firstModule._id,
          status: "unlocked",
          currentQuiz: firstQuiz?._id,
          unlockedQuizzes: firstQuiz ? [firstQuiz._id] : [], // ✅ Make sure this gets the quiz
          completedQuizzes: [],
        },
      ],
    });

    await progress.save();
    console.log(`Progress initialized for user ${userId}`);
    return progress;
  } catch (error) {
    console.error("Error initializing user progress:", error);
    return null;
  }
}

// Logout endpoint
router.post("/logout", protectRoute, async (req, res) => {
  try {
    // End the user session for analytics tracking
    await endUserSession(req.user.id);

    // Log the logout activity
    const logoutTime = new Date();
    await logActivity({
      userId: req.user.id,
      username: req.user.username,
      userRole: req.user.privilege,
      action: AUDIT_ACTIONS.LOGOUT,
      resource: AUDIT_RESOURCES.USER,
      resourceId: req.user.id,
      details: {
        message: "User logged out",
        logoutTime: logoutTime.toISOString(),
        userRole: req.user.privilege,
      },
      ...extractRequestInfo(req),
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({
      success: false,
      message: "Error during logout",
    });
  }
});

// Password reset route
router.post("/reset-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    console.log(`Password reset requested for email: ${email}`);

    // Find the user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // For security reasons, always return success even if the user doesn't exist
    if (!user) {
      console.log(`No user found with email: ${email}`);
      return res.status(200).json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent",
      });
    }

    console.log(`User found for password reset: ${user.username}`);

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

    // Store the hashed token in the database
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Update user with reset token
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();
    console.log(`Reset token saved for user: ${user.username}`);

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8081'}/reset-password?token=${resetToken}`;
    console.log(`Reset URL created: ${resetUrl}`);

    // Send email with reset link
    const mailOptions = {
      to: user.email,
      subject: "CyberLearn Password Reset",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Reset Your Password</h2>
          <p>Hello ${user.fullName || user.username},</p>
          <p>We received a request to reset your password for your CyberLearn account. If you didn't make this request, you can safely ignore this email.</p>
          <p>To reset your password, click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p>This link is valid for 1 hour. After that, you'll need to request a new password reset.</p>
          <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
          <hr style="border: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply to this message.</p>
        </div>
      `
    };

    try {
      console.log(`Attempting to send password reset email to ${user.email}`);
      await sendEmail(mailOptions);
      console.log(`Password reset email sent successfully to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send password reset email. Please try again later.",
        error: emailError.message
      });
    }

    res.status(200).json({
      success: true,
      message: "Reset link sent to your email address",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process password reset",
      error: error.message
    });
  }
});

// Route to handle password reset with token
router.post("/reset-password/confirm", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    // Hash the token for comparison with stored token
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with the token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }, // Check if token hasn't expired
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Password validation
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Update user password
    user.password = newPassword; // The User model should hash this via middleware
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Password reset confirmation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
});

export default router;
