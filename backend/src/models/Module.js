import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
        quizzes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quiz" // Changed from "Module"
    }],
    totalQuizzes: {
        type: Number,
        default: 0
    },
    order: {
        type: Number,
        required: true,
        unique: true // Ensures no duplicate order numbers
    },
    isLocked: {
        type: Boolean,
        default: function() {
        return this.order > 1; // First module is unlocked by default
        }
    },
    lastAccessed: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

moduleSchema.pre("save", function(next) {
    // Ensure totalQuizzes is always set to the length of the quizzes array
    if (this.quizzes) {
        this.totalQuizzes = this.quizzes.length;
    } else {
        this.totalQuizzes = 0;
    }
    next();
});

const Module = mongoose.model("Module", moduleSchema);

export default Module;