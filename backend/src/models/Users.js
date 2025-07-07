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
        enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'no_section'],
        default: 'no_section'
    },
    privilege: {
    type: String,
    enum: ['student', 'admin'],
    required: true,
    default: 'student'
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