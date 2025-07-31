import mongoose from 'mongoose';
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

async function repairStudentAccess() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || process.env.MONGOURI || 'mongodb://localhost:27017/cyberlearn_db';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
    
    // Load models
    const User = await import("../models/Users.js").then(module => module.default);
    const Progress = await import("../models/Progress.js").then(module => module.default);
    const Section = await import("../models/Section.js").then(module => module.default);
    const Module = await import("../models/Module.js").then(module => module.default);
    const Quiz = await import("../models/Quiz.js").then(module => module.default);
    
    // Get all students with sections
    const students = await User.find({ 
      privilege: 'student',
      section: { $ne: 'no_section' }
    });
    
    console.log(`Found ${students.length} students with assigned sections`);
    
    let repaired = 0;
    
    // Process each student
    for (const student of students) {
      console.log(`Processing student ${student.username} in section ${student.section}...`);
      
      try {
        // Get section and instructor
        const section = await Section.findOne({ sectionCode: student.section })
          .populate('instructor');
          
        if (!section || !section.instructor) {
          console.log(`  ❌ Section or instructor not found for student ${student.username}`);
          continue;
        }
        
        const instructorId = section.instructor._id;
        
        // Get first module from instructor
        const firstModule = await Module.findOne({ 
          createdBy: instructorId, 
          order: 1 
        });
        
        if (!firstModule) {
          console.log(`  ⚠️ Instructor has no modules for student ${student.username}`);
          continue;
        }
        
        // Get student's progress
        let progress = await Progress.findOne({ user: student._id });
        
        if (!progress) {
          // Create new progress
          const firstQuiz = await Quiz.findOne({ 
            module: firstModule._id,
            order: 1 
          });
          
          progress = new Progress({
            user: student._id,
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
          console.log(`  ✅ Created new progress for student ${student.username}`);
          repaired++;
        } else {
          // Update existing progress
          let needsSaving = false;
          
          // Ensure first module is unlocked
          if (!progress.globalProgress.unlockedModules.some(id => 
            id.toString() === firstModule._id.toString()
          )) {
            progress.globalProgress.unlockedModules.push(firstModule._id);
            needsSaving = true;
          }
          
          // Ensure module progress exists
          let moduleProgress = progress.moduleProgress.find(mp => 
            mp.module.toString() === firstModule._id.toString()
          );
          
          if (!moduleProgress) {
            // Get first quiz
            const firstQuiz = await Quiz.findOne({ 
              module: firstModule._id,
              order: 1 
            });
            
            moduleProgress = {
              module: firstModule._id,
              status: 'unlocked',
              currentQuiz: firstQuiz?._id,
              unlockedQuizzes: firstQuiz ? [firstQuiz._id] : [],
              completedQuizzes: []
            };
            
            progress.moduleProgress.push(moduleProgress);
            needsSaving = true;
          }
          
          if (needsSaving) {
            await progress.save();
            console.log(`  ✅ Updated progress for student ${student.username}`);
            repaired++;
          } else {
            console.log(`  ✓ No updates needed for student ${student.username}`);
          }
        }
      } catch (err) {
        console.error(`  ❌ Error processing student ${student.username}:`, err);
      }
    }
    
    console.log(`\n✅ Repair completed! Fixed access for ${repaired} students.`);
  } catch (error) {
    console.error('Failed to repair student access:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

repairStudentAccess();