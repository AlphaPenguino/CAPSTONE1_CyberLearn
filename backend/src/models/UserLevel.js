import mongoose from "mongoose";

const userLevelSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },

    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: [true, "Section is required"],
    },

    currentLevel: {
      type: Number,
      required: true,
      default: 1,
      min: [1, "Current level must be at least 1"],
      max: [100, "Current level cannot exceed 100"],
    },

    maxLevelReached: {
      type: Number,
      required: true,
      default: 1,
      min: [1, "Max level must be at least 1"],
      max: [100, "Max level cannot exceed 100"],
    },

    lastLevelCompletedAt: {
      type: Date,
      default: null,
    },

    totalQuestsCompleted: {
      type: Number,
      default: 0,
    },

    totalXPEarned: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one record per user-section combination
userLevelSchema.index({ user: 1, section: 1 }, { unique: true });

// Static method to get or create user level record
userLevelSchema.statics.getOrCreate = async function (userId, sectionId) {
  let userLevel = await this.findOne({ user: userId, section: sectionId });

  if (!userLevel) {
    userLevel = new this({
      user: userId,
      section: sectionId,
      currentLevel: 1,
      maxLevelReached: 1,
    });
    await userLevel.save();
  }

  return userLevel;
};

// Instance method to unlock next level
userLevelSchema.methods.unlockNextLevel = function () {
  const newLevel = this.maxLevelReached + 1;
  this.maxLevelReached = newLevel;
  this.currentLevel = newLevel;
  this.lastLevelCompletedAt = new Date();
  return newLevel;
};

// Instance method to check if user can access a specific level
userLevelSchema.methods.canAccessLevel = function (targetLevel) {
  return targetLevel <= this.maxLevelReached;
};

// Instance method to increment quest completion stats
userLevelSchema.methods.incrementStats = function (xpEarned = 0) {
  this.totalQuestsCompleted += 1;
  this.totalXPEarned += xpEarned;
};

const UserLevel = mongoose.model("UserLevel", userLevelSchema);

export default UserLevel;
