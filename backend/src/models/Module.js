import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    category: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    totalLessons: {
        type: Number,
        default: 0
    },
    lessons: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Game"
    }],
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Module = mongoose.model("Module", moduleSchema);

export default Module;