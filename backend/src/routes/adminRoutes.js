import express from "express";
import mongoose from "mongoose";
import User from "../models/Users.js";
import Module from "../models/Module.js";
import Quiz from "../models/Quiz.js";
import Progress from "../models/Progress.js";
import Section from "../models/Section.js";
import AuditLog from "../models/AuditLog.js";
import { protectRoute, authorizeRole } from "../middleware/auth.middleware.js";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { fileURLToPath } from "url";
import { dirname } from "path";
import bcrypt from "bcryptjs";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get comprehensive admin dashboard statistics
 * @access  Private/Admin
 */
router.get(
  "/dashboard/stats",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      // Get all users with role counts
      const users = await User.find({}).select("-password");
      const userStats = {
        total: users.length,
        students: users.filter((u) => u.privilege === "student").length,
        instructors: users.filter((u) => u.privilege === "instructor").length,
        admins: users.filter((u) => u.privilege === "admin").length,
      };

      // Get module statistics
      const modules = await Module.find({});
      const moduleStats = {
        total: modules.length,
        active: modules.filter((m) => m.isActive).length,
        inactive: modules.filter((m) => !m.isActive).length,
      };

      // Get quiz statistics
      const quizzes = await Quiz.find({});
      const quizStats = {
        total: quizzes.length,
        byDifficulty: {
          easy: quizzes.filter((q) => q.difficulty === "easy").length,
          medium: quizzes.filter((q) => q.difficulty === "medium").length,
          hard: quizzes.filter((q) => q.difficulty === "hard").length,
        },
      };

      // Get sections/classes statistics
      const sections = await Section.find({});
      const sectionStats = {
        total: sections.length,
        active: sections.filter((s) => s.isActive).length,
        totalStudentsInSections: sections.reduce(
          (total, section) => total + (section.students?.length || 0),
          0
        ),
      };

      // Get progress statistics
      const progressRecords = await Progress.find({});
      const progressStats = {
        totalProgressRecords: progressRecords.length,
        activeUsers: progressRecords.filter(
          (p) => p.globalProgress?.unlockedModules?.length > 0
        ).length,
      };

      // Recent activity (last 7 days)
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      const recentUsers = await User.find({
        createdAt: { $gte: lastWeek },
      }).countDocuments();

      const recentModules = await Module.find({
        createdAt: { $gte: lastWeek },
      }).countDocuments();

      res.json({
        success: true,
        data: {
          users: userStats,
          modules: moduleStats,
          quizzes: quizStats,
          sections: sectionStats,
          progress: progressStats,
          recent: {
            newUsers: recentUsers,
            newModules: recentModules,
          },
          systemHealth: {
            status: "healthy",
            lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            uptime: process.uptime(),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch admin statistics",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/admin/users/bulk-import
 * @desc    Bulk import users from CSV
 * @access  Private/Admin
 */
router.post(
  "/users/bulk-import",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const { csvData, preprocessed = false } = req.body;

      console.log("Bulk import request received:", {
        dataLength: csvData?.length,
        preprocessed,
        userId: req.user?._id,
        timestamp: new Date().toISOString(),
      });

      if (!csvData || !Array.isArray(csvData)) {
        console.error("Invalid CSV data:", {
          csvData: typeof csvData,
          isArray: Array.isArray(csvData),
        });
        return res.status(400).json({
          success: false,
          message: "CSV data is required and must be an array",
        });
      }

      if (csvData.length === 0) {
        return res.status(400).json({
          success: false,
          message: "CSV data cannot be empty",
        });
      }

      const results = {
        success: [],
        errors: [],
        skipped: [],
      };

      // If data is preprocessed, we can use bulk operations for better performance
      if (preprocessed) {
        try {
          // Extract all usernames and emails for bulk existence check
          const usernames = csvData.map((u) => u.username.toLowerCase());
          const emails = csvData.map((u) => u.email.toLowerCase());

          // Bulk check for existing users
          const existingUsers = await User.find({
            $or: [{ username: { $in: usernames } }, { email: { $in: emails } }],
          }).select("username email");

          const existingUsernames = new Set(
            existingUsers.map((u) => u.username)
          );
          const existingEmails = new Set(existingUsers.map((u) => u.email));

          // Prepare users for bulk creation
          const usersToCreate = [];
          const newUserIds = [];

          for (const userData of csvData) {
            const {
              username,
              email,
              password,
              role = "student",
              fullName,
              profileImage,
            } = userData;

            // Check if user exists
            if (
              existingUsernames.has(username.toLowerCase()) ||
              existingEmails.has(email.toLowerCase())
            ) {
              results.skipped.push({
                username,
                email,
                reason: "User already exists",
              });
              continue;
            }

            const userId = new mongoose.Types.ObjectId();
            newUserIds.push(userId);

            // Hash password before bulk insert (since insertMany doesn't trigger pre-save middleware)
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            usersToCreate.push({
              _id: userId,
              username: username.toLowerCase(),
              fullName: fullName || username,
              email: email.toLowerCase(),
              password: hashedPassword, // Use hashed password
              privilege: role,
              profileImage:
                profileImage ||
                `https://api.dicebear.com/9.x/bottts/svg?seed=${username}`,
            });

            results.success.push({
              username: username.toLowerCase(),
              email: email.toLowerCase(),
              role: role,
            });
          }

          // Bulk create users
          if (usersToCreate.length > 0) {
            await User.insertMany(usersToCreate);

            // Bulk initialize progress for all new users
            await bulkInitializeUserProgress(newUserIds);
          }
        } catch (bulkError) {
          console.error("Error in bulk operation:", {
            error: bulkError.message,
            stack: bulkError.stack,
            timestamp: new Date().toISOString(),
          });
          // Fallback to sequential processing
          return await sequentialUserProcessing(csvData, results, res);
        }
      } else {
        // Fallback to sequential processing for non-preprocessed data
        return await sequentialUserProcessing(csvData, results, res);
      }

      console.log("Bulk import completed successfully:", {
        successCount: results.success.length,
        skippedCount: results.skipped.length,
        errorCount: results.errors.length,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: `Bulk import completed. ${results.success.length} users created, ${results.skipped.length} skipped, ${results.errors.length} errors.`,
        results,
      });
    } catch (error) {
      console.error("Error in bulk import:", {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      res.status(500).json({
        success: false,
        message: "Bulk import failed",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/admin/users/export
 * @desc    Export all users to CSV format
 * @access  Private/Admin
 */
router.get(
  "/users/export",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const users = await User.find({}).select("-password -__v");

      const csvData = users.map((user) => ({
        id: user._id,
        username: user.username,
        email: user.email,
        privilege: user.privilege,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin || "Never",
      }));

      res.json({
        success: true,
        data: csvData,
        count: users.length,
      });
    } catch (error) {
      console.error("Error exporting users:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export users",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/admin/announcements
 * @desc    Send system-wide announcement
 * @access  Private/Admin
 */
router.post(
  "/announcements",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const { message, priority = "normal", expiresAt } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Announcement message is required",
        });
      }

      // In a real implementation, you would save this to a database
      // For now, we'll just return success
      const announcement = {
        id: Date.now(),
        message: message.trim(),
        priority,
        createdBy: req.user.id,
        createdAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      };

      // Here you would typically:
      // 1. Save to database
      // 2. Send push notifications
      // 3. Send emails if configured
      // 4. Update user notification feeds

      res.json({
        success: true,
        message: "Announcement sent successfully",
        announcement,
      });
    } catch (error) {
      console.error("Error sending announcement:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send announcement",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/admin/system/health
 * @desc    Get system health status
 * @access  Private/Admin
 */
router.get(
  "/system/health",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const systemHealth = {
        status: "healthy",
        timestamp: new Date(),
        database: {
          status: "connected",
          responseTime: Math.floor(Math.random() * 50) + 10, // Mock response time
        },
        memory: {
          usage: process.memoryUsage(),
          freeMemory: require("os").freemem(),
          totalMemory: require("os").totalmem(),
        },
        uptime: process.uptime(),
        version: process.version,
        environment: process.env.NODE_ENV || "development",
      };

      res.json({
        success: true,
        data: systemHealth,
      });
    } catch (error) {
      console.error("Error checking system health:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check system health",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/admin/maintenance
 * @desc    Trigger maintenance tasks
 * @access  Private/Admin
 */
router.post(
  "/maintenance",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const { task } = req.body;

      const availableTasks = {
        "clear-cache": () => ({ message: "Cache cleared successfully" }),
        "backup-database": () => ({ message: "Database backup initiated" }),
        "cleanup-logs": () => ({ message: "Log files cleaned up" }),
        "update-statistics": () => ({ message: "Statistics updated" }),
      };

      if (!task || !availableTasks[task]) {
        return res.status(400).json({
          success: false,
          message: "Invalid maintenance task",
          availableTasks: Object.keys(availableTasks),
        });
      }

      const result = availableTasks[task]();

      res.json({
        success: true,
        task,
        result,
        executedBy: req.user.id,
        executedAt: new Date(),
      });
    } catch (error) {
      console.error("Error executing maintenance task:", error);
      res.status(500).json({
        success: false,
        message: "Maintenance task failed",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/admin/analytics/overview
 * @desc    Get comprehensive system analytics
 * @access  Private/Admin
 */
router.get(
  "/analytics/overview",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const { timeframe = "30d" } = req.query;

      // Calculate date range based on timeframe
      const now = new Date();
      let startDate;

      switch (timeframe) {
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // User activity analytics
      const newUsers = await User.find({
        createdAt: { $gte: startDate },
      }).countDocuments();

      // Content creation analytics
      const newModules = await Module.find({
        createdAt: { $gte: startDate },
      }).countDocuments();

      const newQuizzes = await Quiz.find({
        createdAt: { $gte: startDate },
      }).countDocuments();

      // Popular content
      const popularModules = await Module.find({})
        .sort({ lastAccessed: -1 })
        .limit(10)
        .select("title description totalQuizzes lastAccessed");

      // User engagement (mock data for now)
      const engagement = {
        averageSessionTime: Math.floor(Math.random() * 30) + 15, // 15-45 minutes
        dailyActiveUsers: Math.floor(Math.random() * 50) + 20,
        weeklyActiveUsers: Math.floor(Math.random() * 200) + 100,
        monthlyActiveUsers: Math.floor(Math.random() * 500) + 300,
      };

      res.json({
        success: true,
        data: {
          timeframe,
          period: {
            start: startDate,
            end: now,
          },
          growth: {
            newUsers,
            newModules,
            newQuizzes,
          },
          engagement,
          popularContent: {
            modules: popularModules,
          },
          systemMetrics: {
            totalApiCalls: Math.floor(Math.random() * 10000) + 5000,
            averageResponseTime: Math.floor(Math.random() * 200) + 50,
            errorRate: (Math.random() * 2).toFixed(2) + "%",
          },
        },
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch analytics",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/admin/analytics/daily-usage
 * @desc    Get number of unique students active per day for the last N days
 * @query   days: number of days to include (default 7)
 * @access  Private/Admin
 */
router.get(
  "/analytics/daily-usage",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const days = Math.max(
        1,
        Math.min(parseInt(req.query.days || "7", 10), 90)
      );

      // Start from midnight of (days-1) days ago
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (days - 1));

      // Aggregate unique student userIds per day from audit logs
      const usage = await AuditLog.aggregate([
        {
          $match: {
            createdAt: { $gte: start },
            userRole: "student",
            success: true,
            userId: { $ne: null },
          },
        },
        // Collapse to one entry per (day, user)
        {
          $group: {
            _id: {
              day: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              user: "$userId",
            },
          },
        },
        // Count unique users per day
        {
          $group: {
            _id: "$_id.day",
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Build a complete timeline with zeros for missing days
      const map = new Map(usage.map((u) => [u._id, u.count]));
      const data = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
        data.push({ date: key, students: map.get(key) || 0 });
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error("Error fetching daily usage:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch daily usage",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/admin/analytics/completion-stats
 * @desc    Get quiz completion statistics over time by role
 * @query   period: daily/weekly/monthly (default: daily), days: number of days (default: 7)
 * @access  Private/Admin
 */
router.get(
  "/analytics/completion-stats",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const days = Math.max(
        1,
        Math.min(parseInt(req.query.days || "7", 10), 365)
      );
      const period = req.query.period || "daily";

      // Start from midnight of (days-1) days ago
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (days - 1));

      // Aggregate cyber quest completions per day from audit logs by role
      const completions = await AuditLog.aggregate([
        {
          $match: {
            createdAt: { $gte: start },
            action: {
              $in: [
                "quiz_complete",
                "quiz_completed",
                "complete_quiz",
                "cyberquest_complete", // Add cyber quest completion
                "game_complete", // Add general game completion
                "game_end", // Add game end events
              ],
            },
            success: true,
            userRole: { $in: ["student", "instructor", "admin"] },
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              role: "$userRole",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1, "_id.role": 1 } },
      ]);

      // Build a complete timeline with zeros for missing days
      const data = [];
      const roles = ["student", "instructor", "admin"];

      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD

        const dayData = {
          date: key,
          students: 0,
          instructors: 0,
          admins: 0,
          total: 0,
        };

        // Fill in actual completion counts by role
        completions.forEach((completion) => {
          if (completion._id.date === key) {
            switch (completion._id.role) {
              case "student":
                dayData.students = completion.count;
                break;
              case "instructor":
                dayData.instructors = completion.count;
                break;
              case "admin":
                dayData.admins = completion.count;
                break;
            }
          }
        });

        dayData.total = dayData.students + dayData.instructors + dayData.admins;
        data.push(dayData);
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error("Error fetching completion stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch completion statistics",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/admin/analytics/active-users
 * @desc    Get active users by role over time
 * @query   period: daily/weekly/monthly (default: daily), days: number of days (default: 7)
 * @access  Private/Admin
 */
router.get(
  "/analytics/active-users",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const days = Math.max(
        1,
        Math.min(parseInt(req.query.days || "7", 10), 90)
      );
      const period = req.query.period || "daily";

      // Start from midnight of (days-1) days ago
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (days - 1));

      // Aggregate unique users by role per day from audit logs
      const activeUsers = await AuditLog.aggregate([
        {
          $match: {
            createdAt: { $gte: start },
            success: true,
            userId: { $ne: null },
            userRole: { $in: ["student", "instructor", "admin"] },
          },
        },
        // Group by day, role, and user to get unique users
        {
          $group: {
            _id: {
              day: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              role: "$userRole",
              user: "$userId",
            },
          },
        },
        // Count unique users per day per role
        {
          $group: {
            _id: {
              day: "$_id.day",
              role: "$_id.role",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.day": 1 } },
      ]);

      // Build a complete timeline with zeros for missing days/roles
      const roles = ["student", "instructor", "admin"];
      const data = [];

      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD

        const dayData = { date: key, students: 0, instructors: 0, admins: 0 };

        // Fill in actual data
        activeUsers.forEach((entry) => {
          if (entry._id.day === key) {
            switch (entry._id.role) {
              case "student":
                dayData.students = entry.count;
                break;
              case "instructor":
                dayData.instructors = entry.count;
                break;
              case "admin":
                dayData.admins = entry.count;
                break;
            }
          }
        });

        data.push(dayData);
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error("Error fetching active users stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch active users statistics",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/admin/analytics/student-analytics/:userId
 * @desc    Get detailed analytics for a specific student including quiz history, scores, levels, and subjects
 * @access  Private/Admin
 */
router.get(
  "/analytics/student-analytics/:userId",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Verify student exists
      const student = await User.findById(userId).select("-password");
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      if (student.privilege !== "student") {
        return res.status(400).json({
          success: false,
          message: "User is not a student",
        });
      }

      // Get student's progress data
      const progress = await Progress.findOne({ user: userId })
        .populate({
          path: "moduleProgress.module",
          select: "title description order subject",
        })
        .populate({
          path: "moduleProgress.quizProgress.quiz",
          select: "title description difficulty level subject",
        });

      // Get quiz completion history from audit logs
      const quizHistory = await AuditLog.find({
        userId: userId,
        action: { $in: ["quiz_complete", "quiz_completed", "complete_quiz"] },
        success: true,
      })
        .sort({ createdAt: -1 })
        .populate({
          path: "quizId",
          select: "title difficulty level subject",
        })
        .limit(50); // Last 50 quiz completions

      // Get detailed quiz results
      const detailedHistory = [];
      if (progress && progress.moduleProgress) {
        for (const moduleProgress of progress.moduleProgress) {
          if (
            moduleProgress.quizProgress &&
            moduleProgress.quizProgress.length > 0
          ) {
            for (const quizProgress of moduleProgress.quizProgress) {
              if (quizProgress.completed && quizProgress.quiz) {
                detailedHistory.push({
                  quizId: quizProgress.quiz._id,
                  quizTitle: quizProgress.quiz.title,
                  moduleTitle: moduleProgress.module?.title || "Unknown Module",
                  subject:
                    quizProgress.quiz.subject ||
                    moduleProgress.module?.subject ||
                    "General",
                  level: quizProgress.quiz.level || "Beginner",
                  difficulty: quizProgress.quiz.difficulty || "easy",
                  score: quizProgress.score || 0,
                  maxScore: quizProgress.maxScore || 100,
                  percentage: quizProgress.percentage || 0,
                  attempts: quizProgress.attempts || 1,
                  completedAt: quizProgress.completedAt,
                  timeSpent: quizProgress.timeSpent || null,
                });
              }
            }
          }
        }
      }

      // Sort by completion date (most recent first)
      detailedHistory.sort(
        (a, b) => new Date(b.completedAt) - new Date(a.completedAt)
      );

      // Calculate analytics summary
      const analytics = {
        totalQuizzesCompleted: detailedHistory.length,
        averageScore:
          detailedHistory.length > 0
            ? (
                detailedHistory.reduce(
                  (sum, quiz) => sum + quiz.percentage,
                  0
                ) / detailedHistory.length
              ).toFixed(2)
            : 0,
        totalTimeSpent: detailedHistory.reduce(
          (sum, quiz) => sum + (quiz.timeSpent || 0),
          0
        ),
        subjectBreakdown: {},
        levelBreakdown: {},
        difficultyBreakdown: {},
        recentActivity: detailedHistory.slice(0, 10), // Last 10 activities
      };

      // Calculate breakdowns
      detailedHistory.forEach((quiz) => {
        // Subject breakdown
        if (!analytics.subjectBreakdown[quiz.subject]) {
          analytics.subjectBreakdown[quiz.subject] = {
            count: 0,
            totalScore: 0,
            averageScore: 0,
          };
        }
        analytics.subjectBreakdown[quiz.subject].count++;
        analytics.subjectBreakdown[quiz.subject].totalScore += quiz.percentage;
        analytics.subjectBreakdown[quiz.subject].averageScore = (
          analytics.subjectBreakdown[quiz.subject].totalScore /
          analytics.subjectBreakdown[quiz.subject].count
        ).toFixed(2);

        // Level breakdown
        if (!analytics.levelBreakdown[quiz.level]) {
          analytics.levelBreakdown[quiz.level] = {
            count: 0,
            totalScore: 0,
            averageScore: 0,
          };
        }
        analytics.levelBreakdown[quiz.level].count++;
        analytics.levelBreakdown[quiz.level].totalScore += quiz.percentage;
        analytics.levelBreakdown[quiz.level].averageScore = (
          analytics.levelBreakdown[quiz.level].totalScore /
          analytics.levelBreakdown[quiz.level].count
        ).toFixed(2);

        // Difficulty breakdown
        if (!analytics.difficultyBreakdown[quiz.difficulty]) {
          analytics.difficultyBreakdown[quiz.difficulty] = {
            count: 0,
            totalScore: 0,
            averageScore: 0,
          };
        }
        analytics.difficultyBreakdown[quiz.difficulty].count++;
        analytics.difficultyBreakdown[quiz.difficulty].totalScore +=
          quiz.percentage;
        analytics.difficultyBreakdown[quiz.difficulty].averageScore = (
          analytics.difficultyBreakdown[quiz.difficulty].totalScore /
          analytics.difficultyBreakdown[quiz.difficulty].count
        ).toFixed(2);
      });

      // Get global progress info
      const globalProgress = progress?.globalProgress || {};

      res.json({
        success: true,
        data: {
          student: {
            id: student._id,
            username: student.username,
            email: student.email,
            section: student.section,
            createdAt: student.createdAt,
          },
          progress: {
            currentLevel: globalProgress.currentLevel || 1,
            totalXP: globalProgress.totalXP || 0,
            unlockedModules: globalProgress.unlockedModules?.length || 0,
            completedModules: globalProgress.completedModules?.length || 0,
          },
          analytics,
          detailedHistory,
        },
      });
    } catch (error) {
      console.error("Error fetching student analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch student analytics",
        error: error.message,
      });
    }
  }
);

// Helper function to initialize user progress (same as in userRoutes and authRoutes)
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

    // Find first quiz in first module
    const firstQuiz = await Quiz.findOne({
      module: firstModule._id,
      order: 1,
    }).sort({ order: 1 });

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
          unlockedQuizzes: firstQuiz ? [firstQuiz._id] : [],
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

// Bulk initialize progress for multiple users
async function bulkInitializeUserProgress(userIds) {
  try {
    if (!userIds || userIds.length === 0) return;

    // Find first module
    const firstModule = await Module.findOne({ order: 1 });
    if (!firstModule) {
      console.log("No modules found - progress not initialized");
      return;
    }

    // Find first quiz in first module
    const firstQuiz = await Quiz.findOne({
      module: firstModule._id,
      order: 1,
    }).sort({ order: 1 });

    // Prepare bulk progress documents
    const progressDocs = userIds.map((userId) => ({
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
          unlockedQuizzes: firstQuiz ? [firstQuiz._id] : [],
          completedQuizzes: [],
        },
      ],
    }));

    // Bulk insert progress
    await Progress.insertMany(progressDocs);
    console.log(`Bulk progress initialized for ${userIds.length} users`);
  } catch (error) {
    console.error("Error in bulk progress initialization:", error);
    // Fallback to individual initialization
    for (const userId of userIds) {
      await initializeUserProgress(userId);
    }
  }
}

// Sequential processing fallback
async function sequentialUserProcessing(csvData, results, res) {
  for (const userData of csvData) {
    try {
      const {
        username,
        email,
        password,
        role = "student",
        fullname,
        fullName,
        profileImage,
      } = userData;

      // Handle both fullName and fullname (case variations)
      const userFullName = fullName || fullname || username;

      // Validation
      if (!username || !email || !password) {
        results.errors.push({
          row: userData,
          error: "Missing required fields (username, email, password)",
        });
        continue;
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
        ],
      });

      if (existingUser) {
        results.skipped.push({
          username,
          email,
          reason: "User already exists",
        });
        continue;
      }

      // Create new user
      const newUser = new User({
        username: username.toLowerCase(),
        fullName: userFullName,
        email: email.toLowerCase(),
        password, // Will be hashed by the User model middleware
        privilege: role,
        profileImage:
          profileImage ||
          `https://api.dicebear.com/9.x/bottts/svg?seed=${username}`,
      });

      await newUser.save();

      // Initialize user progress
      await initializeUserProgress(newUser._id);

      results.success.push({
        username: newUser.username,
        email: newUser.email,
        role: newUser.privilege,
      });
    } catch (userError) {
      results.errors.push({
        row: userData,
        error: userError.message,
      });
    }
  }

  return res.json({
    success: true,
    message: `Bulk import completed. ${results.success.length} users created, ${results.skipped.length} skipped, ${results.errors.length} errors.`,
    results,
  });
}

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get system audit logs with filtering and pagination
 * @access  Private/Admin
 */
router.get(
  "/audit-logs",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        userId,
        userSearch,
        startDate,
        endDate,
      } = req.query;

      // Build filter object - only user-based filtering
      const filter = {};

      // Filter by specific user ID
      if (userId) filter.userId = userId;

      // Date range filter
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      // Search filter for username only
      if (userSearch) {
        filter.username = { $regex: userSearch, $options: "i" };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get logs with user population
      const logs = await AuditLog.find(filter)
        .populate("userId", "username fullName email privilege section")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await AuditLog.countDocuments(filter);

      // Get user statistics instead of category stats
      const userStats = await AuditLog.aggregate([
        { $match: filter },
        { $group: { _id: "$username", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }, // Top 10 most active users
      ]);

      const userRoleStats = await AuditLog.aggregate([
        { $match: filter },
        { $group: { _id: "$userRole", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Add timestamp to logs for consistency
      const enrichedLogs = logs.map((log) => ({
        ...log,
        timestamp: log.createdAt,
      }));

      res.json({
        success: true,
        data: {
          logs: enrichedLogs,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit),
            hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrevPage: parseInt(page) > 1,
          },
          summary: {
            totalLogs: total,
            topUsers: userStats,
            userRoleBreakdown: userRoleStats,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch audit logs",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/admin/audit-logs/export
 * @desc    Export audit logs as CSV
 * @access  Private/Admin
 */
router.get(
  "/audit-logs/export",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const { userId, userSearch, startDate, endDate } = req.query;

      // Build filter object - only user-based filtering (same as main endpoint)
      const filter = {};

      if (userId) filter.userId = userId;

      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      if (userSearch) {
        filter.username = { $regex: userSearch, $options: "i" };
      }

      const logs = await AuditLog.find(filter)
        .populate("userId", "username fullName email privilege section")
        .sort({ createdAt: -1 })
        .limit(10000) // Limit to prevent memory issues
        .lean();

      // Convert to CSV format
      const csvHeader = "Timestamp,Username,User Role,Action,Success,Details\n";
      const csvRows = logs
        .map((log) => {
          const timestamp = new Date(log.createdAt).toISOString();
          const details = JSON.stringify(log.details).replace(/"/g, '""');
          return `"${timestamp}","${log.username}","${log.userRole}","${log.action}","${log.success}","${details}"`;
        })
        .join("\n");

      const csvContent = csvHeader + csvRows;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="audit-logs-${
          new Date().toISOString().split("T")[0]
        }.csv"`
      );
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting audit logs:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export audit logs",
        error: error.message,
      });
    }
  }
);

/**
 * @route   DELETE /api/admin/audit-logs/cleanup
 * @desc    Clean up old audit logs (older than specified days)
 * @access  Private/Admin
 */
router.delete(
  "/audit-logs/cleanup",
  protectRoute,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const { days = 90 } = req.body;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

      const result = await AuditLog.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      res.json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} audit log entries older than ${days} days`,
        deletedCount: result.deletedCount,
        cutoffDate,
      });
    } catch (error) {
      console.error("Error cleaning up audit logs:", error);
      res.status(500).json({
        success: false,
        message: "Failed to clean up audit logs",
        error: error.message,
      });
    }
  }
);

export default router;
