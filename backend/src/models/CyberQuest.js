import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, "Question type is required"],
      enum: [
        "multipleChoice",
        "codeMissing",
        "fillInBlanks",
        "codeOrdering",
        "sorting",
        "cipher",
      ],
      default: "multipleChoice",
    },
    text: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    // For Multiple Choice
    choices: {
      type: [String],
      validate: {
        validator: function (choices) {
          if (this.type === "multipleChoice") {
            return choices && choices.length >= 1 && choices.length <= 10;
          }
          return true; // Not required for other types
        },
        message: "Multiple choice questions must have between 1 and 10 choices",
      },
    },
    correct_index: {
      type: Number,
      validate: {
        validator: function (index) {
          if (this.type === "multipleChoice") {
            return index >= 0 && index < this.choices.length;
          }
          return true; // Not required for other types
        },
        message: "Correct index must be within choices range",
      },
    },
    // For Code Missing
    codeTemplate: {
      type: String,
      validate: {
        validator: function (template) {
          if (this.type === "codeMissing") {
            return template && template.trim().length > 0;
          }
          return true;
        },
        message: "Code template is required for code missing questions",
      },
    },
    correctAnswer: {
      type: String,
      validate: {
        validator: function (answer) {
          if (this.type === "codeMissing") {
            return answer && answer.trim().length > 0;
          }
          return true;
        },
        message: "Correct answer is required for code missing questions",
      },
    },
    // For Fill in Blanks
    blanks: {
      type: [String],
      validate: {
        validator: function (blanks) {
          if (this.type === "fillInBlanks") {
            return (
              blanks &&
              blanks.length >= 1 &&
              blanks.length <= 5 &&
              blanks.every((blank) => blank.trim().length > 0)
            );
          }
          return true;
        },
        message: "Fill in blanks questions must have 1-5 non-empty blanks",
      },
    },
    // For Code Ordering
    codeBlocks: {
      type: [
        {
          id: { type: Number, required: true },
          code: { type: String, required: true, trim: true },
          position: { type: Number, required: true },
        },
      ],
      validate: {
        validator: function (blocks) {
          if (this.type === "codeOrdering") {
            return (
              blocks &&
              blocks.length >= 3 &&
              blocks.length <= 6 &&
              blocks.every((block) => block.code.trim().length > 0)
            );
          }
          return true;
        },
        message: "Code ordering questions must have 3-6 non-empty code blocks",
      },
    },
    // For Sorting Questions
    categories: {
      type: [String],
      validate: {
        validator: function (categories) {
          if (this.type === "sorting") {
            return (
              categories &&
              categories.length >= 2 &&
              categories.length <= 4 &&
              categories.every((category) => category.trim().length > 0)
            );
          }
          return true;
        },
        message: "Sorting questions must have 2-4 non-empty categories",
      },
    },
    items: {
      type: [
        {
          id: { type: Number, required: true },
          text: { type: String, required: true, trim: true },
          categoryId: { type: Number, required: true },
        },
      ],
      validate: {
        validator: function (items) {
          if (this.type === "sorting") {
            return (
              items &&
              items.length >= 2 &&
              items.length <= 8 &&
              items.every((item) => item.text.trim().length > 0)
            );
          }
          return true;
        },
        message: "Sorting questions must have 2-8 non-empty items",
      },
    },
    // For Cipher Questions
    answer: {
      type: String,
      validate: {
        validator: function (answer) {
          if (this.type === "cipher") {
            return answer && answer.trim().length > 0;
          }
          return true;
        },
        message: "Answer is required for cipher questions",
      },
    },
    scrambledHint: {
      type: String,
      validate: {
        validator: function (hint) {
          if (this.type === "cipher") {
            return hint && hint.trim().length > 0;
          }
          return true;
        },
        message: "Scrambled hint is required for cipher questions",
      },
    },
    // Generic optional hint for all question types
    hint: {
      type: String,
      trim: true,
      maxlength: [200, "Hint cannot exceed 200 characters"],
      default: "",
    },
  },
  { _id: false }
);

const cyberQuestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Cyber Quest title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },

    description: {
      type: String,
      required: false,
      trim: true,
      minlength: [0, "Description must be at least 0 characters long"],
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section", // Still references Section model, but now points to subjects collection
      required: [true, "Subject is required"],
    },

    questions: {
      type: [questionSchema],
      required: true,
      validate: {
        validator: function (questions) {
          return questions.length >= 1 && questions.length <= 50;
        },
        message: "A Cyber Quest must have between 1 and 50 questions",
      },
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    level: {
      type: Number,
      required: [true, "Level is required"],
      min: [1, "Level must be at least 1"],
      max: [100, "Level cannot exceed 100"],
      default: 1,
    },

    prerequisiteLevel: {
      type: Number,
      default: null, // null means no prerequisite (can be accessed from level 1)
      min: [1, "Prerequisite level must be at least 1"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for question count
cyberQuestSchema.virtual("questionCount").get(function () {
  return this.questions.length;
});

// Static method to find quests by subject (renamed from section)
cyberQuestSchema.statics.findBySubject = function (subjectId) {
  return this.find({ subject: subjectId, isActive: true })
    .populate("created_by", "username fullName")
    .populate("subject", "name sectionCode")
    .sort({ level: 1 }); // Sort by level ascending (1, 2, 3, ...)
};

// Legacy method for backward compatibility
cyberQuestSchema.statics.findBySection = function (sectionId) {
  return this.findBySubject(sectionId);
};

// Static method to find quests by instructor
cyberQuestSchema.statics.findByInstructor = function (instructorId) {
  return this.find({ created_by: instructorId, isActive: true })
    .populate("subject", "name sectionCode")
    .sort({ createdAt: -1 });
};

// Instance method to validate all questions
cyberQuestSchema.methods.validateQuestions = function () {
  const errors = [];

  this.questions.forEach((question, index) => {
    if (!question.text || question.text.trim().length === 0) {
      errors.push(`Question ${index + 1}: Text is required`);
      return;
    }

    // Type-specific validation
    switch (question.type) {
      case "multipleChoice":
        if (
          !question.choices ||
          question.choices.length < 1 ||
          question.choices.length > 10
        ) {
          errors.push(
            `Question ${
              index + 1
            }: Multiple choice must have 1-10 answer choices`
          );
        } else {
          if (
            question.correct_index < 0 ||
            question.correct_index >= question.choices.length
          ) {
            errors.push(`Question ${index + 1}: Invalid correct answer index`);
          }

          // Check if all choices are filled
          question.choices.forEach((choice, choiceIndex) => {
            if (!choice || choice.trim().length === 0) {
              errors.push(
                `Question ${index + 1}, Choice ${
                  choiceIndex + 1
                }: Cannot be empty`
              );
            }
          });
        }
        break;

      case "codeMissing":
        if (
          !question.codeTemplate ||
          question.codeTemplate.trim().length === 0
        ) {
          errors.push(`Question ${index + 1}: Code template is required`);
        }
        if (
          !question.correctAnswer ||
          question.correctAnswer.trim().length === 0
        ) {
          errors.push(`Question ${index + 1}: Correct answer is required`);
        }
        break;

      case "fillInBlanks":
        if (!question.blanks || question.blanks.length < 1) {
          errors.push(`Question ${index + 1}: At least one blank is required`);
        } else {
          question.blanks.forEach((blank, blankIndex) => {
            if (!blank || blank.trim().length === 0) {
              errors.push(
                `Question ${index + 1}, Blank ${
                  blankIndex + 1
                }: Cannot be empty`
              );
            }
          });
        }
        break;

      case "codeOrdering":
        if (!question.codeBlocks || question.codeBlocks.length < 3) {
          errors.push(
            `Question ${index + 1}: At least 3 code blocks are required`
          );
        } else {
          question.codeBlocks.forEach((block, blockIndex) => {
            if (!block.code || block.code.trim().length === 0) {
              errors.push(
                `Question ${index + 1}, Code block ${
                  blockIndex + 1
                }: Cannot be empty`
              );
            }
          });
        }
        break;

      case "sorting":
        if (!question.categories || question.categories.length < 2) {
          errors.push(
            `Question ${index + 1}: At least two categories are required`
          );
        } else {
          question.categories.forEach((category, catIndex) => {
            if (!category || category.trim().length === 0) {
              errors.push(
                `Question ${index + 1}, Category ${
                  catIndex + 1
                }: Cannot be empty`
              );
            }
          });
        }

        if (!question.items || question.items.length < 2) {
          errors.push(`Question ${index + 1}: At least two items are required`);
        } else {
          question.items.forEach((item, itemIndex) => {
            if (!item.text || item.text.trim().length === 0) {
              errors.push(
                `Question ${index + 1}, Item ${itemIndex + 1}: Cannot be empty`
              );
            }

            if (
              item.categoryId < 0 ||
              item.categoryId >= question.categories.length
            ) {
              errors.push(
                `Question ${index + 1}, Item ${
                  itemIndex + 1
                }: Invalid category ID`
              );
            }
          });
        }
        break;

      case "cipher":
        if (!question.answer || question.answer.trim().length === 0) {
          errors.push(`Question ${index + 1}: Answer is required`);
        }
        if (
          !question.scrambledHint ||
          question.scrambledHint.trim().length === 0
        ) {
          errors.push(`Question ${index + 1}: Scrambled hint is required`);
        }
        break;

      default:
        errors.push(
          `Question ${index + 1}: Unknown question type "${question.type}"`
        );
        break;
    }
  });

  return errors.length === 0 ? null : errors;
};

const CyberQuest = mongoose.model("CyberQuest", cyberQuestSchema);

export default CyberQuest;
