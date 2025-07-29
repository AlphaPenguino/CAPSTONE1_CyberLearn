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
        ref: "Quiz"
    }],
    totalQuizzes: {
        type: Number,
        default: 0
    },
    order: {
        type: Number,
        required: true,
        unique: true
    },
    isLocked: {
        type: Boolean,
        default: function() {
            return this.order > 1;
        }
    },
    lastAccessed: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
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