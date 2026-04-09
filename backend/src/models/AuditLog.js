import mongoose from "mongoose";

export const AUDIT_CATEGORIES = [
  "all",
  "auth",
  "user_management",
  "content_creation",
  "content_modification",
  "content_deletion",
  "learning_activity",
  "admin_action",
];

export const getAuditCategoryFromResourceAction = (resource, action = "") => {
  const normalizedAction = String(action || "").toLowerCase();
  const isAdminUserAction = /create|add|delete|remove|archive|unarchive/.test(
    normalizedAction
  );
  const categoryByResource = {
    user:
      normalizedAction.includes("login") ||
      normalizedAction.includes("register") ||
      normalizedAction.includes("signup")
        ? "auth"
        : isAdminUserAction
          ? "admin_action"
          : "user_management",
    module: normalizedAction.includes("create")
      ? "content_creation"
      : normalizedAction.includes("update")
      ? "content_modification"
      : normalizedAction.includes("access") || normalizedAction.includes("view")
      ? "learning_activity"
      : "content_deletion",
    quiz: normalizedAction.includes("create")
      ? "content_creation"
      : normalizedAction.includes("update")
      ? "content_modification"
      : normalizedAction.includes("attempt") || normalizedAction.includes("complete")
      ? "learning_activity"
      : "content_deletion",
    section: "user_management",
    subject: normalizedAction.includes("create")
      ? "content_creation"
      : normalizedAction.includes("student")
      ? "user_management"
      : "content_modification",
    cyberquest: normalizedAction.includes("create")
      ? "content_creation"
      : normalizedAction.includes("access") || normalizedAction.includes("complete")
      ? "learning_activity"
      : "content_modification",
    question: normalizedAction.includes("create")
      ? "content_creation"
      : normalizedAction.includes("import")
      ? "content_modification"
      : "content_modification",
    multiplayer_game: "learning_activity",
    digital_defenders: "learning_activity",
    quiz_showdown: "learning_activity",
    knowledge_relay: "learning_activity",
    game: "learning_activity",
    file: "content_modification",
    system: "admin_action",
    analytics: "admin_action",
    dashboard: "admin_action",
  };

  return categoryByResource[resource] || "admin_action";
};

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Allow null for failed login attempts
    },
    username: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      enum: ["student", "instructor", "admin", "unknown"],
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    resource: {
      type: String,
      enum: [
        "user",
        "module",
        "quiz",
        "section",
        "subject",
        "cyberquest",
        "question",
        "multiplayer_game",
        "digital_defenders",
        "quiz_showdown",
        "knowledge_relay",
        "game",
        "file",
        "system",
        "analytics",
        "dashboard",
      ],
      required: false,
    },
    resourceId: {
      // Room codes and external identifiers are not always ObjectIds.
      type: String,
      required: false,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    sessionId: {
      type: String,
      default: null,
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying by timestamp (most recent first)
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });
auditLogSchema.index({ userRole: 1, createdAt: -1 });

// Virtual for compatibility with frontend expecting 'category'
auditLogSchema.virtual("category").get(function () {
  return getAuditCategoryFromResourceAction(this.resource, this.action);
});

// Virtual for compatibility with frontend expecting 'timestamp'
auditLogSchema.virtual("timestamp").get(function () {
  return this.createdAt;
});

// Include virtuals in JSON output
auditLogSchema.set("toJSON", { virtuals: true });
auditLogSchema.set("toObject", { virtuals: true });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
