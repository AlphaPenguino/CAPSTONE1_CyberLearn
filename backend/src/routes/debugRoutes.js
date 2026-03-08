import express from "express";
import { protectRoute, authorizeRole } from "../middleware/auth.middleware.js";
import mongoose from "mongoose";

const router = express.Router();

/**
 * @route   GET /api/debug/user-levels
 * @desc    Get all user levels for debugging (Admin only)
 * @access  Private (Admin)
 */
router.get(
  "/user-levels",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const UserLevel = await import("../models/UserLevel.js").then(
        (module) => module.default
      );

      const userLevels = await UserLevel.find({})
        .populate("user", "username fullName privilege")
        .populate("section", "name sectionCode")
        .sort({ section: 1, currentLevel: -1 });

      res.json({
        success: true,
        userLevels: userLevels.map((ul) => ({
          user: ul.user.username,
          section: ul.section.name,
          currentLevel: ul.currentLevel,
          maxLevelReached: ul.maxLevelReached,
          totalQuestsCompleted: ul.totalQuestsCompleted,
          totalXPEarned: ul.totalXPEarned,
          lastLevelCompletedAt: ul.lastLevelCompletedAt,
        })),
      });
    } catch (error) {
      console.error("Error fetching user levels:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * @route   POST /api/debug/reset-user-level
 * @desc    Reset user level for testing (Admin only)
 * @access  Private (Admin)
 */
router.post(
  "/reset-user-level",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const { userId, sectionId, level = 1 } = req.body;

      if (!userId || !sectionId) {
        return res.status(400).json({
          success: false,
          message: "userId and sectionId are required",
        });
      }

      const UserLevel = await import("../models/UserLevel.js").then(
        (module) => module.default
      );

      await UserLevel.findOneAndUpdate(
        { user: userId, section: sectionId },
        {
          currentLevel: level,
          maxLevelReached: level,
          totalQuestsCompleted: 0,
          totalXPEarned: 0,
          lastLevelCompletedAt: null,
        },
        { upsert: true }
      );

      res.json({
        success: true,
        message: `User level reset to ${level}`,
      });
    } catch (error) {
      console.error("Error resetting user level:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * @route   POST /api/debug/reset-cyber-quest-progress
 * @desc    Reset Cyber Quest progress for students. Supports modes:
 *          - { mode: "all" } reset all students across all subjects
 *          - { mode: "section", sectionId } reset all students in one subject
 *          - { mode: "user", userId, sectionId? } reset a single student (optionally scoped to a subject)
 * @access  Private (Admin)
 */
router.post(
  "/reset-cyber-quest-progress",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const { mode = "all", sectionId, userId } = req.body || {};

      const Progress = await import("../models/Progress.js").then(
        (m) => m.default
      );
      const UserLevel = await import("../models/UserLevel.js").then(
        (m) => m.default
      );
      const Section = await import("../models/Section.js").then(
        (m) => m.default
      );
      const User = await import("../models/Users.js").then((m) => m.default);

      let affectedUsers = [];
      let affectedSections = [];

      if (mode === "section") {
        if (!sectionId) {
          return res.status(400).json({
            success: false,
            message: "sectionId is required for section mode",
          });
        }
        // Validate section exists and collect its students
        const section = await Section.findById(sectionId).select(
          "name students"
        );
        if (!section) {
          return res.status(404).json({
            success: false,
            message: "Section not found",
          });
        }

        affectedSections = [section._id];
        affectedUsers = section.students;
      } else if (mode === "user") {
        if (!userId) {
          return res.status(400).json({
            success: false,
            message: "userId is required for user mode",
          });
        }
        const user = await User.findById(userId).select("_id privilege");
        if (!user) {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        }
        affectedUsers = [user._id];
        if (sectionId) {
          const section = await Section.findById(sectionId).select("_id");
          if (!section) {
            return res
              .status(404)
              .json({ success: false, message: "Section not found" });
          }
          affectedSections = [section._id];
        }
      } else if (mode === "all") {
        // All students across all sections
        const students = await User.find({ privilege: "student" }).select(
          "_id"
        );
        affectedUsers = students.map((s) => s._id);
        const sections = await Section.find({}).select("_id");
        affectedSections = sections.map((s) => s._id);
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Invalid mode" });
      }

      // If there are no users, respond early
      if (!affectedUsers || affectedUsers.length === 0) {
        return res.json({
          success: true,
          message: "No users to reset",
          details: { users: 0, sections: affectedSections.length },
        });
      }

      // Build updates
      let progressFilter = { user: { $in: affectedUsers } };
      let pullFilter = {};
      if (affectedSections.length > 0) {
        pullFilter = { section: { $in: affectedSections } };
      }

      // 1) Clear Cyber Quest progress entries for the scope
      const pullUpdate = Object.keys(pullFilter).length
        ? {
            $pull: {
              cyberQuestProgress: pullFilter,
              "globalProgress.cyberQuestLevels": {
                section: { $in: affectedSections },
              },
            },
          }
        : {
            $set: {
              cyberQuestProgress: [],
              "globalProgress.cyberQuestLevels": [],
            },
          };

      const progressResult = await Progress.updateMany(
        progressFilter,
        pullUpdate
      );

      // 2) Reset UserLevel docs to level 1 for the scope
      let userLevelFilter = { user: { $in: affectedUsers } };
      if (affectedSections.length > 0) {
        userLevelFilter.section = { $in: affectedSections };
      }
      const userLevelUpdate = {
        $set: {
          currentLevel: 1,
          maxLevelReached: 1,
          totalQuestsCompleted: 0,
          totalXPEarned: 0,
          lastLevelCompletedAt: null,
        },
      };
      const userLevelResult = await UserLevel.updateMany(
        userLevelFilter,
        userLevelUpdate
      );

      return res.json({
        success: true,
        message: "Cyber Quest progress reset completed",
        details: {
          mode,
          usersTargeted: affectedUsers.length,
          sectionsTargeted: affectedSections.length,
          progressModifiedCount:
            progressResult.modifiedCount ?? progressResult.nModified ?? 0,
          userLevelsModifiedCount:
            userLevelResult.modifiedCount ?? userLevelResult.nModified ?? 0,
        },
      });
    } catch (error) {
      console.error("Error resetting Cyber Quest progress:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

export default router;
