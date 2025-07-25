import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    profileImage: {
        type: String,
        default:""
    },
    section: {
        type: String,
        required: true,
        enum: ['no_section'],
        default: 'no_section'
    },
    privilege: {
    type: String,
    enum: ['student', 'admin', 'superadmin'],
    required: true,
    default: 'student'
    },


    gamification: {

        totalXP: {
        type: Number,
        default: 0
        },
        level: {
        type: Number,
        default: 1
        },
        badges: [{
        name: String,
        icon: String,
        unlockedAt: Date
        }],
        achievements: [{
        name: String,
        description: String,
        unlockedAt: Date
        }],
        currentStreak: {
        type: Number,
        default: 0
        },
        longestStreak: {
        type: Number,
        default: 0
        }
        
  }
    
}, {timestamps: true});

userSchema.pre("save", async function(next) {

    if(!this.isModified("password")) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    next();
});

//compares password with hashed password
userSchema.methods.comparePassword = async function(userPassword) {
    return await bcrypt.compare(userPassword,this.password);
};

const User = mongoose.model("User", userSchema);
//mongoose converts User to user

export default User;