import mongoose from "mongoose";

const quickPlayContentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },
    text: {
      type: String,
      default: "",
      trim: true,
    },
    uri: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const quickPlayPairSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      trim: true,
      default: "",
    },
    definition: {
      type: quickPlayContentSchema,
      required: true,
    },
    answer: {
      type: quickPlayContentSchema,
      required: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const quickPlaySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
    slotNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 3,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Quick Play",
      maxlength: 120,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    quizCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    timerSeconds: {
      type: Number,
      required: true,
      min: 15,
      max: 3600,
      default: 90,
    },
    pairCount: {
      type: Number,
      required: true,
      min: 4,
      max: 8,
      default: 6,
    },
    pairs: {
      type: [quickPlayPairSchema],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length >= 4 && value.length <= 8;
        },
        message: "Quick Play tile sets must contain between 4 and 8 pairs.",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

quickPlaySchema.index({ owner: 1, slotNumber: 1 }, { unique: true });
quickPlaySchema.index({ quizCode: 1 }, { unique: true });

export default mongoose.models.QuickPlay || mongoose.model("QuickPlay", quickPlaySchema);