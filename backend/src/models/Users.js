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
    enum: ['student', 'instructor', 'admin'],
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

userSchema.statics.updateSchema = async function(newSectionName) {
  try {
    // Get the current enum values
    const enumValues = this.schema.path('section').enumValues;
    
    // Add new value if it doesn't exist
    if (!enumValues.includes(newSectionName)) {
      // Add the new value to the enum
      this.schema.path('section').enumValues.push(newSectionName);
      
      // You might need to update any existing validation logic here
      this.schema.path('section').validators = [
        {
          validator: function(v) {
            return this.schema.path('section').enumValues.includes(v);
          },
          message: props => `${props.value} is not a valid section!`
        }
      ];
    }
    
    return true;
  } catch (error) {
    console.error("Error updating user schema:", error);
    return false;
  }
};

const User = mongoose.model("User", userSchema);
//mongoose converts User to user

export default User;