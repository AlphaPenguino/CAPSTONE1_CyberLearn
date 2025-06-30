const mongoose = require("mongoose")

const quizSchema = new mongoose.Schema(
  {
    // Basic Information
    title: {
      type: String,
      required: [true, "Quiz title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    // Associations
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: [true, "Module ID is required"],
    },
    // Quiz Configuration
    config: {
      type: {
        type: String,
        enum: ["practice", "assessment", "final-exam", "certification"],
        default: "practice",
      },

      difficulty: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
        default: "beginner",
      },

      timeLimit: {
        enabled: { type: Boolean, default: false },
        duration: Number, // in minutes
        warningAt: Number, // minutes before time expires to show warning
      },

      attempts: {
        maxAttempts: { type: Number, default: 3 },
        cooldownPeriod: Number, // hours between attempts
        showCorrectAnswers: { type: Boolean, default: true },
        showExplanations: { type: Boolean, default: true },
      },

      scoring: {
        passingScore: { type: Number, default: 70 }, // percentage
        pointsPerQuestion: { type: Number, default: 10 },
        negativeMarking: { type: Boolean, default: false },
        partialCredit: { type: Boolean, default: false },
      },

      randomization: {
        shuffleQuestions: { type: Boolean, default: true },
        shuffleOptions: { type: Boolean, default: true },
        questionPool: { type: Boolean, default: false }, // select random subset
      },
    },

    // Questions
    questions: [
      {
        question: {
          type: String,
          required: [true, "Question text is required"],
        },

        type: {
          type: String,
          enum: [
            "multiple-choice",
            "multiple-select",
            "true-false",
            "fill-blank",
            "short-answer",
            "essay",
            "matching",
            "drag-drop",
            "coding",
            "numerical",
          ],
          required: [true, "Question type is required"],
        },

        options: [
          {
            text: String,
            isCorrect: { type: Boolean, default: false },
            explanation: String,
            order: Number,
          },
        ],

        correctAnswers: [String], // For multiple-select, fill-blank, etc.

        points: {
          type: Number,
          default: 10,
          min: 0,
        },

        difficulty: {
          type: String,
          enum: ["easy", "medium", "hard"],
          default: "medium",
        },

        explanation: String,
        hints: [String],

        media: {
          image: {
            url: String,
            alt: String,
          },
          video: {
            url: String,
            duration: Number,
          },
          audio: {
            url: String,
            duration: Number,
          },
        },

        metadata: {
          tags: [String],
          category: String,
          estimatedTime: Number, // seconds to answer
          bloomsLevel: {
            type: String,
            enum: ["remember", "understand", "apply", "analyze", "evaluate", "create"],
          },
        },
      },
    ],

    // Gamification
    gamification: {
      pointsReward: {
        completion: { type: Number, default: 100 },
        perfectScore: { type: Number, default: 50 },
        firstAttempt: { type: Number, default: 25 },
        speedBonus: { type: Number, default: 10 },
      },

      badges: [
        {
          badgeId: { type: mongoose.Schema.Types.ObjectId, ref: "Badge" },
          criteria: String,
          threshold: Number,
        },
      ],

      achievements: [
        {
          achievementId: { type: mongoose.Schema.Types.ObjectId, ref: "Achievement" },
          criteria: String,
        },
      ],
    },

    // Statistics & Analytics
    statistics: {
      totalAttempts: { type: Number, default: 0 },
      totalCompletions: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      averageTime: { type: Number, default: 0 }, // in minutes

      questionStats: [
        {
          questionIndex: Number,
          correctAnswers: { type: Number, default: 0 },
          totalAnswers: { type: Number, default: 0 },
          averageTime: { type: Number, default: 0 },
          difficultyRating: { type: Number, default: 0 },
        },
      ],

      performance: {
        passRate: { type: Number, default: 0 },
        averageAttempts: { type: Number, default: 0 },
        dropoutRate: { type: Number, default: 0 },
      },
    },

    // Adaptive Learning
    adaptive: {
      enabled: { type: Boolean, default: false },
      algorithm: {
        type: String,
        enum: ["irt", "cat", "simple"],
        default: "simple",
      },
      parameters: {
        initialDifficulty: { type: Number, default: 0.5 },
        adaptationRate: { type: Number, default: 0.1 },
        minQuestions: { type: Number, default: 5 },
        maxQuestions: { type: Number, default: 20 },
      },
    },

    // Status
    status: {
      isPublished: { type: Boolean, default: false },
      isActive: { type: Boolean, default: true },
      publishedAt: Date,
      lastUpdated: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes
quizSchema.index({ courseId: 1, lessonId: 1 })
quizSchema.index({ "status.isPublished": 1, "status.isActive": 1 })
quizSchema.index({ "config.type": 1 })
quizSchema.index({ createdAt: -1 })

// Virtual for total questions
quizSchema.virtual("totalQuestions").get(function () {
  return this.questions.length
})

// Virtual for total points
quizSchema.virtual("totalPoints").get(function () {
  return this.questions.reduce((total, question) => total + question.points, 0)
})

// Virtual for pass rate
quizSchema.virtual("statistics.passRate").get(function () {
  if (this.statistics.totalCompletions === 0) return 0
  const passThreshold = (this.config.scoring.passingScore / 100) * this.totalPoints
  return (this.statistics.totalCompletions / this.statistics.totalAttempts) * 100
})

module.exports = mongoose.model("Quiz", quizSchema)
