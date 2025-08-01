import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Progress from '../models/Progress.js';
import Module from '../models/Module.js';
import User from '../models/Users.js';
import Quiz from '../models/Quiz.js';

dotenv.config();

/**
 * This script rechecks all available modules for students based on their class enrollment
 * It ensures that:
 * 1. Students have access to all modules assigned to their section/class
 * 2. First module in each section is always unlocked for enrolled students
 * 3. Module progression is correctly set up
 */
async function recheckModuleAccessByClass() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔌 Connected to MongoDB');

    // Get all students grouped by section
    const students = await User.find({ privilege: 'student' });
    console.log(`👨‍🎓 Found ${students.length} total students`);

    // Group students by section
    const studentsBySection = {};
    students.forEach(student => {
      const section = student.section || 'no_section';
      if (!studentsBySection[section]) {
        studentsBySection[section] = [];
      }
      studentsBySection[section].push(student);
    });

    // Get all modules organized by section
    const allModules = await Module.find().sort({ order: 1 });
    const modulesBySection = {};
    
    for (const module of allModules) {
      const sections = module.sections || [];
      // If no sections specified, add to 'all' category
      if (sections.length === 0) {
        if (!modulesBySection['all']) {
          modulesBySection['all'] = [];
        }
        modulesBySection['all'].push(module);
      } else {
        // Add module to each of its specified sections
        for (const section of sections) {
          if (!modulesBySection[section]) {
            modulesBySection[section] = [];
          }
          modulesBySection[section].push(module);
        }
      }
    }

    console.log(`📊 Module distribution by section:`);
    for (const [section, modules] of Object.entries(modulesBySection)) {
      console.log(`   - ${section}: ${modules.length} modules`);
    }

    // Track overall progress
    let totalStudentsProcessed = 0;
    let totalModulesUnlocked = 0;

    // Process each section
    for (const [section, sectionStudents] of Object.entries(studentsBySection)) {
      console.log(`\n🏫 Processing section: ${section} (${sectionStudents.length} students)`);
      
      // Get modules for this section and 'all' sections
      const availableModules = [
        ...(modulesBySection[section] || []),
        ...(modulesBySection['all'] || [])
      ].sort((a, b) => a.order - b.order);

      if (availableModules.length === 0) {
        console.log(`   ⚠️ No modules available for section ${section}`);
        continue;
      }

      console.log(`   📚 Found ${availableModules.length} modules available for this section`);

      // Process each student in this section
      for (const student of sectionStudents) {
        let progress = await Progress.findOne({ user: student._id });
        
        // If student has no progress record, create one
        if (!progress) {
          console.log(`   🆕 Creating new progress record for student ${student.username}`);
          progress = new Progress({ 
            user: student._id,
            globalProgress: {
              unlockedModules: [],
              completedModules: []
            },
            moduleProgress: []
          });
        }

        let modulesUnlocked = 0;
        
        // Ensure first module is always unlocked
        if (availableModules.length > 0) {
          const firstModuleId = availableModules[0]._id;
          
          // Check if first module is already unlocked
          if (!progress.globalProgress.unlockedModules.some(id => 
            id.toString() === firstModuleId.toString()
          )) {
            progress.globalProgress.unlockedModules.push(firstModuleId);
            console.log(`   🔓 Unlocked first module for ${student.username}`);
            modulesUnlocked++;
          }
        }

        // Verify all modules have corresponding moduleProgress entries
        for (const module of availableModules) {
          const moduleId = module._id;
          
          // Check if module progress entry exists
          const hasModuleProgress = progress.moduleProgress.some(mp => 
            mp.module.toString() === moduleId.toString()
          );
          
          if (!hasModuleProgress) {
            // Check if module should be unlocked
            const isUnlocked = 
              module.order === 1 || 
              progress.globalProgress.unlockedModules.some(id => 
                id.toString() === moduleId.toString()
              );
            
            // Get first quiz in this module
            const firstQuiz = await Quiz.findOne({ 
              module: moduleId,
              order: 1
            });
            
            // Create module progress
            const newModuleProgress = {
              module: moduleId,
              status: isUnlocked ? 'unlocked' : 'locked',
              currentQuiz: firstQuiz?._id,
              unlockedQuizzes: isUnlocked && firstQuiz ? [firstQuiz._id] : [],
              completedQuizzes: [],
              totalXP: 0,
              completionPercentage: 0
            };
            
            progress.moduleProgress.push(newModuleProgress);
            console.log(`   ➕ Added missing module progress for ${module.title} for ${student.username}`);
          }
        }

        // Update current module if not set
        if (!progress.globalProgress.currentModule || 
            !availableModules.some(m => m._id.toString() === progress.globalProgress.currentModule.toString())) {
          
          // Find first incomplete module
          const incompleteModule = availableModules.find(module => 
            !progress.globalProgress.completedModules.some(cm => 
              cm.module.toString() === module._id.toString()
            )
          );
          
          if (incompleteModule) {
            progress.globalProgress.currentModule = incompleteModule._id;
            console.log(`   🎯 Set current module to ${incompleteModule.title} for ${student.username}`);
          }
        }

        // Save progress
        if (modulesUnlocked > 0 || progress.isModified()) {
          await progress.save();
          totalModulesUnlocked += modulesUnlocked;
          console.log(`   ✅ Updated progress for ${student.username}`);
        }
        
        totalStudentsProcessed++;
      }
    }

    console.log(`\n🎉 Process complete!`);
    console.log(`   - Processed ${totalStudentsProcessed} students`);
    console.log(`   - Unlocked ${totalModulesUnlocked} modules`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Execute the script
recheckModuleAccessByClass();