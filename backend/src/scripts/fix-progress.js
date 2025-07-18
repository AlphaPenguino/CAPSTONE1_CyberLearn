import mongoose from 'mongoose';
import Progress from '../models/Progress.js';
import Quiz from '../models/Quiz.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Load .env from the root directory
dotenv.config({ path: path.join(rootDir, '.env') });

async function fixProgressData() {
  try {
    // Try multiple ways to get the MongoDB URI
    const mongoURI = process.env.MONGOURI || 
                     process.env.MONGO_URI || 
                     process.env.DB_URI ||
                     'mongodb://localhost:27017/cyberlearn_db'; // Fallback to default
    
    console.log(`Connecting to MongoDB at ${mongoURI.substring(0, mongoURI.indexOf('@') > 0 ? 
                mongoURI.indexOf('@') : 10)}...`); // Safely log part of URI
                
    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Get all progress documents
    const allProgress = await Progress.find({}).lean();
    console.log(`Found ${allProgress.length} progress records`);

    // Process each progress document
    for (const progress of allProgress) {
      console.log(`\nProcessing progress for user: ${progress.user}`);
      
      // Process each module's progress
      for (const moduleProgress of progress.moduleProgress) {
        console.log(`\n  Module: ${moduleProgress.module}`);
        
        // 1. Get all valid quizzes for this module
        const moduleQuizzes = await Quiz.find({ module: moduleProgress.module }).lean();
        console.log(`  Found ${moduleQuizzes.length} quizzes in module`);
        
        const quizIds = new Set(moduleQuizzes.map(q => q._id.toString()));
        console.log(`  Valid quiz IDs: ${Array.from(quizIds)}`);
        
        // 2. Filter completed quizzes to only include existing ones
        const validCompletedQuizzes = moduleProgress.completedQuizzes.filter(cq => {
          const quizExists = quizIds.has(cq.quiz.toString());
          if (!quizExists) {
            console.log(`  ⚠️ Quiz ${cq.quiz} no longer exists but is in completedQuizzes`);
          }
          return quizExists;
        });
        
        // 3. Add passed and everPassed fields based on bestScore
        validCompletedQuizzes.forEach(cq => {
          // Find the quiz to get its passing score
          const quiz = moduleQuizzes.find(q => q._id.toString() === cq.quiz.toString());
          const passingScore = quiz ? (quiz.passingScore || 70) : 70;
          
          // Set passed and everPassed
          cq.passed = cq.bestScore >= passingScore;
          cq.everPassed = cq.bestScore >= passingScore;
          
          console.log(`  Quiz ${cq.quiz}: bestScore=${cq.bestScore}, passingScore=${passingScore}, passed=${cq.passed}`);
        });
        
        // 4. Calculate correct completion percentage
        const passedQuizCount = validCompletedQuizzes.filter(cq => cq.everPassed).length;
        const newPercentage = moduleQuizzes.length > 0 
          ? Math.round((passedQuizCount / moduleQuizzes.length) * 100)
          : 0;
          
        console.log(`  Passed quizzes: ${passedQuizCount}/${moduleQuizzes.length}`);
        console.log(`  Old percentage: ${moduleProgress.completionPercentage}%, New percentage: ${newPercentage}%`);
        
        // 5. Update the moduleProgress object
        moduleProgress.completedQuizzes = validCompletedQuizzes;
        moduleProgress.completionPercentage = newPercentage;
      }
      
      // Save the updated progress document
      await Progress.findByIdAndUpdate(progress._id, { 
        moduleProgress: progress.moduleProgress 
      });
      console.log(`✅ Updated progress for user: ${progress.user}`);
    }
    
    console.log('\nAll progress data has been fixed!');
    
  } catch (error) {
    console.error('Error fixing progress data:', error);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    } catch (err) {
      console.error('Error disconnecting from MongoDB:', err);
    }
  }
}

// Run the function
fixProgressData();