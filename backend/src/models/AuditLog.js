import mongoose from "mongoose";

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
      type: mongoose.Schema.Types.ObjectId,
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
  const resourceCategoryMap = {
    user:
      this.action.includes("login") || this.action.includes("register")
        ? "auth"
        : "user_management",
    module: this.action.includes("create")
      ? "content_creation"
      : this.action.includes("update")
      ? "content_modification"
      : this.action.includes("access") || this.action.includes("view")
      ? "learning_activity"
      : "content_deletion",
    quiz: this.action.includes("create")
      ? "content_creation"
      : this.action.includes("update")
      ? "content_modification"
      : this.action.includes("attempt") || this.action.includes("complete")
      ? "learning_activity"
      : "content_deletion",
    section: "user_management",
    subject: this.action.includes("create")
      ? "content_creation"
      : this.action.includes("student")
      ? "user_management"
      : "content_modification",
    cyberquest: this.action.includes("create")
      ? "content_creation"
      : this.action.includes("access") || this.action.includes("complete")
      ? "learning_activity"
      : "content_modification",
    question: this.action.includes("create")
      ? "content_creation"
      : this.action.includes("import")
      ? "content_management"
      : "content_modification",
    multiplayer_game: "game_activity",
    digital_defenders: "game_activity",
    quiz_showdown: "game_activity",
    knowledge_relay: "game_activity",
    game: "game_activity",
    file: "content_management",
    system: "admin_action",
    analytics: "analytics_access",
    dashboard: "dashboard_access",
  };

  return resourceCategoryMap[this.resource] || "system_access";
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
