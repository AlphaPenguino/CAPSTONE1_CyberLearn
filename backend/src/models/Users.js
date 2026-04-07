import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    profileImage: {
      type: String,
      default: "",
    },
    section: {
      type: String,
      required: true,
      default: "no_section",
    },
    // New field for multiple section support
    sections: {
      type: [String],
      default: [],
    },
    // Currently selected section for navigation
    currentSection: {
      type: String,
      default: null,
    },
    privilege: {
      type: String,
      enum: ["student", "instructor", "admin"],
      required: true,
      default: "student",
    },
    privacyPolicyAccepted: {
      type: Boolean,
      default: false,
    },
    privacyPolicyAcceptedAt: {
      type: Date,
      default: null,
    },

    // Soft delete / archival
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
    },

    gamification: {
      totalXP: {
        type: Number,
        default: 0,
      },
      level: {
        type: Number,
        default: 1,
      },
      badges: [
        {
          name: String,
          icon: String,
          unlockedAt: Date,
        },
      ],
      achievements: [
        {
          name: String,
          description: String,
          unlockedAt: Date,
        },
      ],
      currentStreak: {
        type: Number,
        default: 0,
      },
      longestStreak: {
        type: Number,
        default: 0,
      },
    },

    // Analytics tracking
    analytics: {
      totalGamesPlayed: {
        type: Number,
        default: 0,
      },
      totalTimeSpent: {
        type: Number,
        default: 0, // in minutes
      },
      lastActivity: {
        type: Date,
        default: null,
      },
      currentSessionStart: {
        type: Date,
        default: null,
      },
      dailyTimeSpent: {
        type: Number,
        default: 0, // in minutes for current day
      },
      lastDayTracked: {
        type: Date,
        default: null,
      },
      gamesByType: {
        quiz: { type: Number, default: 0 },
        digitalDefenders: { type: Number, default: 0 },
        knowledgeRelay: { type: Number, default: 0 },
        quizShowdown: { type: Number, default: 0 },
        cyberQuest: { type: Number, default: 0 },
      },
      // Unified game/activity log for instructor analytics
      gameLog: [
        {
          gameType: { type: String }, // e.g. quiz, digitalDefenders, knowledgeRelay, quizShowdown, cyberQuest
          title: { type: String }, // human-readable title (quiz/cq title or generic label)
          score: { type: Number }, // numeric score/points/metric when available
          xpEarned: { type: Number }, // optional XP earned this game
          completedAt: { type: Date, default: Date.now }, // timestamp of completion
          // optional raw metadata for future extension
          meta: { type: Object },
        },
      ],
    },
    // Add these fields to the user schema
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

//compares password with hashed password
userSchema.methods.comparePassword = async function (userPassword) {
  return await bcrypt.compare(userPassword, this.password);
};

// Start a session for analytics tracking
userSchema.methods.startSession = function () {
  const now = new Date();
  this.analytics.currentSessionStart = now;
  this.analytics.lastActivity = now;

  // Reset daily time if it's a new day
  const today = new Date(now).setHours(0, 0, 0, 0);
  const lastDay = this.analytics.lastDayTracked
    ? new Date(this.analytics.lastDayTracked).setHours(0, 0, 0, 0)
    : null;

  if (!lastDay || today !== lastDay) {
    this.analytics.dailyTimeSpent = 0;
    this.analytics.lastDayTracked = now;
  }

  return this.save();
};

// End session and calculate time spent
userSchema.methods.endSession = function () {
  if (!this.analytics.currentSessionStart) return this.save();

  const now = new Date();
  const sessionTime = Math.round(
    (now - this.analytics.currentSessionStart) / (1000 * 60)
  ); // in minutes

  this.analytics.totalTimeSpent =
    (this.analytics.totalTimeSpent || 0) + sessionTime;
  this.analytics.dailyTimeSpent =
    (this.analytics.dailyTimeSpent || 0) + sessionTime;
  this.analytics.lastActivity = now;
  this.analytics.currentSessionStart = null;

  return this.save();
};

// Track game completion
userSchema.methods.trackGameCompletion = function (
  gameType = "quiz",
  meta = {}
) {
  const now = new Date();
  this.analytics.totalGamesPlayed = (this.analytics.totalGamesPlayed || 0) + 1;
  this.analytics.lastActivity = now;

  // Track by game type counter
  if (
    this.analytics.gamesByType &&
    this.analytics.gamesByType[gameType] !== undefined
  ) {
    this.analytics.gamesByType[gameType] =
      (this.analytics.gamesByType[gameType] || 0) + 1;
  }

  // Derive a sensible title & score
  const derivedTitle =
    meta.title ||
    meta.quizTitle ||
    meta.cyberQuestTitle ||
    (meta.data && (meta.data.title || meta.data.quizTitle)) ||
    `${gameType} game`;
  const derivedScore =
    meta.score ||
    (meta.data && meta.data.score) ||
    meta.totalScore ||
    (meta.stats && (meta.stats.score || meta.stats.wavesCompleted)) ||
    (meta.result && meta.result.score) ||
    (typeof meta.wavesCompleted === "number" ? meta.wavesCompleted : null);
  const xpEarned =
    meta.xpEarned ||
    (meta.data && meta.data.xpEarned) ||
    (meta.result && meta.result.xpEarned) ||
    (typeof meta.xp === "number" ? meta.xp : undefined);

  // Extract additional metadata for CyberQuest (from result or body)
  const derivedMeta = {
    correctAnswers:
      (meta.result && meta.result.correctAnswers) ||
      (meta.body && meta.body.correctAnswers) ||
      undefined,
    incorrectAnswers:
      (meta.result && meta.result.incorrectAnswers) ||
      (meta.body && meta.body.incorrectAnswers) ||
      undefined,
    totalQuestions:
      (meta.result && meta.result.totalQuestions) ||
      (meta.body && meta.body.totalQuestions) ||
      undefined,
    questLevel:
      (meta.body && meta.body.questLevel) ||
      (meta.result && meta.result.questLevel) ||
      undefined,
    level:
      (meta.result && meta.result.levelProgression && meta.result.levelProgression.newLevel) ||
      (meta.result && meta.result.levelProgression && meta.result.levelProgression.currentLevel) ||
      undefined,
    difficulty:
      (meta.body && meta.body.difficulty) ||
      (meta.result && meta.result.difficulty) ||
      undefined,
    passed:
      (meta.result && meta.result.passed) ||
      undefined,
    attempts:
      (meta.result && meta.result.questProgress && meta.result.questProgress.totalAttempts) ||
      undefined,
  };

  // Push into gameLog (cap at last 200 entries to avoid unbounded growth)
  if (!Array.isArray(this.analytics.gameLog)) this.analytics.gameLog = [];
  this.analytics.gameLog.push({
    gameType,
    title: derivedTitle,
    score: typeof derivedScore === "number" ? derivedScore : undefined,
    xpEarned,
    completedAt: now,
    meta: {
      ...meta,
      ...derivedMeta,
    },
  });
  if (this.analytics.gameLog.length > 200) {
    this.analytics.gameLog = this.analytics.gameLog.slice(-200);
  }

  return this.save();
};

// Update activity timestamp
userSchema.methods.updateActivity = function () {
  this.analytics.lastActivity = new Date();
  return this.save();
};

userSchema.statics.updateSchema = async function (newSectionName) {
  try {
    // Get the current enum values
    const enumValues = this.schema.path("section").enumValues;

    // Add new value if it doesn't exist
    if (!enumValues.includes(newSectionName)) {
      // Add the new value to the enum
      this.schema.path("section").enumValues.push(newSectionName);

      // You might need to update any existing validation logic here
      this.schema.path("section").validators = [
        {
          validator: function (v) {
            return this.schema.path("section").enumValues.includes(v);
          },
          message: (props) => `${props.value} is not a valid section!`,
        },
      ];
    }

    return true;
  } catch (error) {
    console.error("Error updating user schema:", error);
    return false;
  }
};

const User = mongoose.model("User", userSchema);
//mongoose converts User to user

export default User;
