import mongoose from "mongoose";

// Knowledge Relay Question Schema for persistent global storage
// These questions are intended to be globally available across all sections/rooms
// Similar structure to the in-memory version but persisted in MongoDB
const knowledgeRelayQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    options: {
      type: [String],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length >= 2;
        },
        message: "A question must have at least 2 options",
      },
      required: true,
    },
    correctAnswer: { type: Number, required: true, min: 0 },
    category: { type: String, default: "General", trim: true },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    points: { type: Number, default: 1, min: 0 },
    // Future-proofing: allow soft delete / activation toggling
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

knowledgeRelayQuestionSchema.index({ category: 1, difficulty: 1 });

export const KnowledgeRelayQuestion = mongoose.model(
  "KnowledgeRelayQuestion",
  knowledgeRelayQuestionSchema
);
