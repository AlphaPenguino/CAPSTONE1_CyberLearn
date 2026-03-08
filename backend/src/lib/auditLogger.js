import AuditLog from "../models/AuditLog.js";

/**
 * Log user activity to the audit trail
 * @param {Object} params - Audit log parameters
 * @param {string} params.userId - User ID
 * @param {string} params.username - Username
 * @param {string} params.userRole - User role (student, instructor, admin)
 * @param {string} params.action - Action performed
 * @param {string} [params.resource] - Resource type (quiz, module, user, etc.)
 * @param {string} [params.resourceId] - Resource ID
 * @param {Object} [params.details] - Additional details
 * @param {string} [params.ipAddress] - User's IP address
 * @param {string} [params.userAgent] - User's browser/client info
 * @param {boolean} [params.success=true] - Whether the action was successful
 * @param {string} [params.errorMessage] - Error message if action failed
 * @param {string} [params.sessionId] - Session identifier
 */
export const logActivity = async ({
  userId,
  username,
  userRole,
  action,
  resource,
  resourceId,
  details,
  ipAddress,
  userAgent,
  success = true,
  errorMessage,
  sessionId,
}) => {
  try {
    const auditLog = new AuditLog({
      userId,
      username,
      userRole,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
      success,
      errorMessage,
      sessionId,
    });

    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Don't throw error to avoid breaking the main operation
    return null;
  }
};

/**
 * Extract IP and User Agent from request
 * @param {Object} req - Express request object
 * @returns {Object} Object with ipAddress and userAgent
 */
export const extractRequestInfo = (req) => {
  return {
    ipAddress:
      req.ip ||
      req.connection.remoteAddress ||
      req.headers["x-forwarded-for"]?.split(",")[0],
    userAgent: req.headers["user-agent"] || "Unknown",
  };
};

/**
 * Common audit log actions
 */
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: "login",
  LOGOUT: "logout",
  LOGIN_FAILED: "login_failed",
  SIGNUP: "signup",
  PASSWORD_CHANGE: "password_change",

  // User Management
  USER_CREATE: "user_create",
  USER_UPDATE: "user_update",
  USER_DELETE: "user_delete",
  USER_BULK_IMPORT: "user_bulk_import",

  // Module Management
  MODULE_CREATE: "module_create",
  MODULE_UPDATE: "module_update",
  MODULE_DELETE: "module_delete",
  MODULE_VIEW: "module_view",

  // Quiz Management
  QUIZ_CREATE: "quiz_create",
  QUIZ_UPDATE: "quiz_update",
  QUIZ_DELETE: "quiz_delete",
  QUIZ_ATTEMPT: "quiz_attempt",
  QUIZ_COMPLETE: "quiz_complete",

  // Game Activities
  GAME_START: "game_start",
  GAME_END: "game_end",
  GAME_JOIN: "game_join",
  GAME_LEAVE: "game_leave",

  // Admin Activities
  ADMIN_DASHBOARD_ACCESS: "admin_dashboard_access",
  ADMIN_SETTINGS_CHANGE: "admin_settings_change",
  ADMIN_BULK_ACTION: "admin_bulk_action",

  // Section Management (Subjects)
  SECTION_CREATE: "section_create",
  SECTION_UPDATE: "section_update",
  SECTION_DELETE: "section_delete",
  SECTION_ASSIGN: "section_assign",
  SUBJECT_CREATE: "subject_create",
  SUBJECT_UPDATE: "subject_update",
  SUBJECT_DELETE: "subject_delete",
  SUBJECT_VIEW: "subject_view",
  SUBJECT_STUDENT_ADD: "subject_student_add",
  SUBJECT_STUDENT_REMOVE: "subject_student_remove",
  SUBJECT_INSTRUCTOR_ADD: "subject_instructor_add",
  SUBJECT_INSTRUCTOR_REMOVE: "subject_instructor_remove",
  SUBJECT_ARCHIVE: "subject_archive",
  SUBJECT_UNARCHIVE: "subject_unarchive",

  // CyberQuest Activities
  CYBERQUEST_CREATE: "cyberquest_create",
  CYBERQUEST_UPDATE: "cyberquest_update",
  CYBERQUEST_DELETE: "cyberquest_delete",
  CYBERQUEST_ACCESS: "cyberquest_access",
  CYBERQUEST_COMPLETE: "cyberquest_complete",

  // Instructor Activities
  INSTRUCTOR_DASHBOARD_ACCESS: "instructor_dashboard_access",
  INSTRUCTOR_ANALYTICS_VIEW: "instructor_analytics_view",
  INSTRUCTOR_STUDENT_ANALYTICS_VIEW: "instructor_student_analytics_view",
  INSTRUCTOR_GAME_ANALYTICS_VIEW: "instructor_game_analytics_view",

  // Student Activities
  STUDENT_SESSION_START: "student_session_start",
  STUDENT_SESSION_END: "student_session_end",
  STUDENT_GAME_ACCESS: "student_game_access",
  STUDENT_MODULE_ACCESS: "student_module_access",
  STUDENT_PROGRESS_VIEW: "student_progress_view",

  // Multiplayer Game Activities
  MULTIPLAYER_ROOM_CREATE: "multiplayer_room_create",
  MULTIPLAYER_ROOM_JOIN: "multiplayer_room_join",
  MULTIPLAYER_ROOM_LEAVE: "multiplayer_room_leave",
  MULTIPLAYER_TEAM_JOIN: "multiplayer_team_join",
  MULTIPLAYER_GAME_START: "multiplayer_game_start",
  MULTIPLAYER_GAME_END: "multiplayer_game_end",
  DIGITAL_DEFENDERS_JOIN: "digital_defenders_join",
  DIGITAL_DEFENDERS_LEAVE: "digital_defenders_leave",
  QUIZ_SHOWDOWN_JOIN: "quiz_showdown_join",
  QUIZ_SHOWDOWN_LEAVE: "quiz_showdown_leave",
  KNOWLEDGE_RELAY_JOIN: "knowledge_relay_join",
  KNOWLEDGE_RELAY_LEAVE: "knowledge_relay_leave",

  // Content Creation & Management
  QUESTION_CREATE: "question_create",
  QUESTION_UPDATE: "question_update",
  QUESTION_DELETE: "question_delete",
  QUESTION_IMPORT: "question_import",

  // File Operations
  FILE_UPLOAD: "file_upload",
  FILE_DELETE: "file_delete",

  // Analytics & Reports
  ANALYTICS_EXPORT: "analytics_export",
  AUDIT_LOGS_EXPORT: "audit_logs_export",
  REPORT_GENERATE: "report_generate",
};

/**
 * Resource types
 */
export const AUDIT_RESOURCES = {
  USER: "user",
  MODULE: "module",
  QUIZ: "quiz",
  SECTION: "section",
  SUBJECT: "subject",
  CYBERQUEST: "cyberquest",
  QUESTION: "question",
  MULTIPLAYER_GAME: "multiplayer_game",
  DIGITAL_DEFENDERS: "digital_defenders",
  QUIZ_SHOWDOWN: "quiz_showdown",
  KNOWLEDGE_RELAY: "knowledge_relay",
  GAME: "game",
  FILE: "file",
  SYSTEM: "system",
  ANALYTICS: "analytics",
  DASHBOARD: "dashboard",
};
