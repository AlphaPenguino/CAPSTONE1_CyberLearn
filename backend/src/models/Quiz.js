import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Module",
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  timeLimit: {
    type: Number, // Time limit in seconds
    default: 300 // Default 5 minutes
  },
  passingScore: {
    type: Number,
    default: 70 // Default passing score 70%
  },
  questions: [{
    questionType: {
      type: String,
      enum: ['multipleChoice', 'fillInBlanks', 'codeSimulation', 'codeImplementation', 'codeOrdering'],
      required: true
    },
    question: {
      type: String,
      required: true
    },
    points: {
      type: Number,
      default: 1
    },
    // For multiple choice questions
    options: [{
      text: String,
      isCorrect: Boolean
    }],
    // For fill in the blanks
    blanks: [{
      position: Number,
      answer: String
    }],
    // For code simulation and implementation
    codeTemplate: String,
    expectedOutput: String,
    correctAnswer: String,
    // For code ordering
    codeBlocks: [{
      code: String,
      correctPosition: Number
    }],
    explanation: String
  }],
    order: {
    type: Number,
    required: true
  },
  
}, { timestamps: true });

quizSchema.index({ module: 1, order: 1 }, { unique: true });

// Virtual field for total number of questions
quizSchema.virtual('totalQuestions').get(function() {
  return this.questions.length;
});

// Pre-save middleware to update the parent module
quizSchema.pre('save', async function(next) {
  if (this.isNew && this.module) {
    try {
      const Module = mongoose.model('Module');
      await Module.findByIdAndUpdate(this.module, {
        $addToSet: { quizzes: this._id },
        $inc: { totalQuizzes: 1 }
      });
    } catch (err) {
      console.error("Error updating module with new quiz:", err);
    }
  }
  next();
});

// Pre-remove middleware to update the parent module
quizSchema.pre('remove', async function(next) {
  try {
    const Module = mongoose.model('Module');
    await Module.findByIdAndUpdate(this.module, {
      $pull: { quizzes: this._id },
      $inc: { totalQuizzes: -1 }
    });
  } catch (err) {
    console.error("Error updating module after quiz removal:", err);
  }
  next();
});

const Quiz = mongoose.model("Quiz", quizSchema);

export default Quiz;