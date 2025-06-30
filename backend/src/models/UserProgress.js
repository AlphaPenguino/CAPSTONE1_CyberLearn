import mongoose from "mongoose";

const userProgressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    module: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Module",
        required: true
    },
    completedLessons: [{
        lesson: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Game"
        },
        score: Number,
        completed: Boolean,
        completedAt: Date
    }],
    currentLesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Game"
    },
    progress: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const UserProgress = mongoose.model("UserProgress", userProgressSchema);

export default UserProgress;