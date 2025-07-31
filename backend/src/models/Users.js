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

// Add this to your User model
userSchema.post('save', async function(doc) {
  // If section was changed and user is a student
  if (doc.isModified('section') && doc.privilege === 'student' && doc.section !== 'no_section') {
    try {
      // Import Progress model using dynamic import to avoid circular references
      const Progress = await import("../models/Progress.js").then(module => module.default);
      const Section = await import("../models/Section.js").then(module => module.default);
      const Module = await import("../models/Module.js").then(module => module.default);
      const Quiz = await import("../models/Quiz.js").then(module => module.default);
      
      let progress = await Progress.findOne({ user: doc._id });
      
      if (!progress) {
        // Create new progress record
        console.log(`Creating progress for user ${doc._id} in section ${doc.section}`);
        
        // Get instructor from section
        const section = await Section.findOne({ sectionCode: doc.section })
          .populate('instructor');
          
        if (!section || !section.instructor) {
          console.log('Section or instructor not found');
          return;
        }
        
        // Get first module
        const firstModule = await Module.findOne({ 
          createdBy: section.instructor._id,
          order: 1
        });
        
        if (!firstModule) {
          console.log('No modules found for instructor');
          return;
        }
        
        // Get first quiz
        const firstQuiz = await Quiz.findOne({
          module: firstModule._id,
          order: 1
        });
        
        // Create progress
        progress = new Progress({
          user: doc._id,
          globalProgress: {
            currentModule: firstModule._id,
            unlockedModules: [firstModule._id],
            completedModules: []
          },
          moduleProgress: [{
            module: firstModule._id,
            status: 'unlocked',
            currentQuiz: firstQuiz?._id,
            unlockedQuizzes: firstQuiz ? [firstQuiz._id] : [],
            completedQuizzes: []
          }]
        });
        
        await progress.save();
      } else {
        // Update existing progress
        const User = await import("../models/Users.js").then(module => module.default);
        const user = await User.findById(doc._id).select('section privilege');
        
        // Ensure student has access to instructor's modules
        await ensureStudentModuleAccess(user, progress);
      }
    } catch (error) {
      console.error('Error updating progress after section change:', error);
    }
  }
});

const User = mongoose.model("User", userSchema);
//mongoose converts User to user

export default User;