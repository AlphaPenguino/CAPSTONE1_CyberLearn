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
    privilege: {
    type: String,
    enum: ['student', 'admin'],
    required: true,
    default: 'student'
    }
});

userSchema.pre("save", async function(next) {

    if(!this.isModified("password")) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    next();
});

const User = mongoose.model("User", userSchema);
//mongoose converts User to user

export default User;