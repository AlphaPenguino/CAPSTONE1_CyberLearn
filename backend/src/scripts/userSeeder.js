import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/Users.js';
import Progress from '../models/Progress.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import Module from '../models/Module.js';
import Quiz from '../models/Quiz.js';

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize progress for a user
async function initializeUserProgress(userId) {
  try {
    const existingProgress = await Progress.findOne({ user: userId });
    if (existingProgress) {
      return existingProgress;
    }
    
    // Find first module
    const firstModule = await Module.findOne().sort({ order: 1 });
    
    if (!firstModule) {
      console.log("No modules found - progress not initialized");
      return null;
    }
    
    // Find first quiz in first module
    const firstQuiz = await Quiz.findOne({ 
      module: firstModule._id, 
      order: 1 
    }).sort({ order: 1 });
    
    const progress = new Progress({
      user: userId,
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
    console.log(`Progress initialized for user ${userId}`);
    return progress;
  } catch (error) {
    console.error("Error initializing user progress:", error);
    return null;
  }
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected for seeding...'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Read the users data
const usersDataPath = path.join(__dirname, 'data', 'userData.json');
const usersData = JSON.parse(fs.readFileSync(usersDataPath, 'utf8'));

// Seed users
async function seedUsers() {
  try {
    // Clear existing users (optional - comment this out if you want to keep existing users)
    // await User.deleteMany({});
    // await Progress.deleteMany({});
    console.log('Existing data preserved. Will only add new users.');
    
    // Track statistics
    let created = 0;
    let skipped = 0;
    
    // Process each user
    for (const userData of usersData) {
      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [
          { email: userData.email.toLowerCase() },
          { username: userData.username.toLowerCase() }
        ]
      });
      
      if (existingUser) {
        console.log(`User ${userData.username} already exists. Skipping...`);
        skipped++;
        continue;
      }
      
      // Map role to privilege field and ensure proper casing
      const newUser = new User({
        username: userData.username.toLowerCase(),
        email: userData.email.toLowerCase(),
        password: userData.password, // Will be hashed by the User model middleware
        privilege: userData.role, // Use 'privilege' field instead of 'role'
        section: 'no_section',
        profileImage: `https://api.dicebear.com/9.x/bottts/svg?seed=${userData.username}`
      });
      
      await newUser.save();
      
      // Initialize user progress
      await initializeUserProgress(newUser._id);
      
      console.log(`Added user: ${userData.username}`);
      created++;
    }
    
    console.log(`Done! Created ${created} new users. Skipped ${skipped} existing users.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();