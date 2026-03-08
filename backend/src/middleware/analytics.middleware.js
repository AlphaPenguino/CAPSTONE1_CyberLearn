import User from "../models/Users.js";
import {
  logActivity,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  extractRequestInfo,
} from "../lib/auditLogger.js";

// Middleware to track user activity and sessions
export const trackUserActivity = async (req, res, next) => {
  // Only track activity for authenticated users
  if (req.user && req.user.id) {
    try {
      const user = await User.findById(req.user.id);
      if (user) {
        // Check if this is a new session start
        const isNewSession = !user.analytics.currentSessionStart;

        // Update last activity
        await user.updateActivity();

        // Start session if not already started
        if (isNewSession) {
          await user.startSession();

          // Log session start for students
          if (user.privilege === "student") {
            const requestInfo = extractRequestInfo(req);
            await logActivity({
              userId: user._id,
              username: user.username,
              userRole: user.privilege,
              action: AUDIT_ACTIONS.STUDENT_SESSION_START,
              resource: AUDIT_RESOURCES.USER,
              resourceId: user._id,
              details: {
                message: "Student session started",
                sessionStartTime: new Date().toISOString(),
              },
              ...requestInfo,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error tracking user activity:", error);
      // Don't fail the request if analytics tracking fails
    }
  }
  next();
};

// Middleware to track game completion
export const trackGameCompletion = (gameType = "quiz") => {
  return async (req, res, next) => {
    // Store the original json function
    const originalJson = res.json;

    // Override the json function
    res.json = function (data) {
      // Check if this is a successful game completion
      if (data && data.success && req.user && req.user.id) {
        // Track game completion asynchronously
        User.findById(req.user.id)
          .then((user) => {
            if (user) {
              // Pass entire response payload as meta plus any route-provided locals
              const meta = {
                ...data,
                ...(res.locals?.gameMeta || {}),
                body: req.body,
              };
              return user.trackGameCompletion(gameType, meta);
            }
          })
          .catch((error) => {
            console.error("Error tracking game completion:", error);
          });
      }

      // Call the original json function
      return originalJson.call(this, data);
    };

    next();
  };
};

// Function to end user session (call this on logout or app close)
export const endUserSession = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (user) {
      await user.endSession();

      // Log session end for students
      if (user.privilege === "student") {
        await logActivity({
          userId: user._id,
          username: user.username,
          userRole: user.privilege,
          action: AUDIT_ACTIONS.STUDENT_SESSION_END,
          resource: AUDIT_RESOURCES.USER,
          resourceId: user._id,
          details: {
            message: "Student session ended",
            sessionEndTime: new Date().toISOString(),
          },
        });
      }
    }
  } catch (error) {
    console.error("Error ending user session:", error);
  }
};
