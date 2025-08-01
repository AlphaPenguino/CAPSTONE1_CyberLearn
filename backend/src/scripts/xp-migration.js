import mongoose from 'mongoose';
import Progress from '../models/Progress.js';
import Quiz from '../models/Quiz.js';
import dotenv from 'dotenv';

dotenv.config();

async function updateXPCalculation() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔌 Connected to MongoDB');

    // Get all progress records
    const progresses = await Progress.find({});
    console.log(`📊 Found ${progresses.length} progress records to update`);

    let totalUpdated = 0;

    for (const progress of progresses) {
      let progressUpdated = false;

      // Process each module progress
      for (const moduleProgress of progress.moduleProgress) {
        let moduleXP = 0;

        // Recalculate XP for each completed quiz
        for (const completion of moduleProgress.completedQuizzes) {
          if (completion.everPassed) {
            // Get quiz details to find question count
            const quiz = await Quiz.findById(completion.quiz);
            
            if (quiz && quiz.questions) {
              // Calculate new XP (10 per question)
              const newXP = quiz.questions.length * 10;
              moduleXP += newXP;
            }
          }
        }

        // Update module's totalXP if it changed
        if (moduleXP !== moduleProgress.totalXP) {
          moduleProgress.totalXP = moduleXP;
          progressUpdated = true;
          console.log(`📈 Updated module XP for user ${progress.user}, module ${moduleProgress.module}, new total: ${moduleXP}`);
        }
      }

      // Save if changes were made
      if (progressUpdated) {
        await progress.save();
        totalUpdated++;
      }
    }

    console.log(`✅ Migration complete. Updated ${totalUpdated} progress records.`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
updateXPCalculation();