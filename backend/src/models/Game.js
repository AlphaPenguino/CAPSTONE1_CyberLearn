import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    level: {
        type: Number,
        default: 1
    },
    category: {
        type: String,
        required: true
    },
    contentType: {
        type: String,
        enum: ['video', 'quiz', 'selection', 'matching'],
        required: true
    },
    prerequisite: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Game"
    },
    order: {
        type: Number,
        default: 0
    },
    isLocked: {
        type: Boolean,
        default: true
    },
    duration: {
        type: Number, // in seconds
        default: 0
    },
    mediaContent: {
        videoUrl: String,
        imageUrls: [String],
    },
    questions: [{
        questionText: String,
        options: [String],
        correctAnswer: String,
        explanation: String,
        points: {
            type: Number,
            default: 1
        }
    }],
    maxScore: {
        type: Number,
        default: 0
    },
    passingScore: {
        type: Number,
        default: 0
    },
    xpAwarded: {
        type: Number,
        default: 10
    },
    
}, {timestamps: true});

// Calculate maxScore before saving
gameSchema.pre('save', function(next) {
    if (this.questions && this.questions.length > 0) {
        this.maxScore = this.questions.reduce((total, question) => total + (question.points || 1), 0);
    }
    next();
});

const Game = mongoose.model("Game", gameSchema);

export default Game;