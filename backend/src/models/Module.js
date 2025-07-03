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
    },
    lastAccessed: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

moduleSchema.pre("save", function(next) {
    // Ensure totalLessons is always set to the length of the lessons array
    if (this.lessons) {
        this.totalLessons = this.lessons.length;
    } else {
        this.totalLessons = 0;
    }
    next();
});

const Module = mongoose.model("Module", moduleSchema);

export default Module;