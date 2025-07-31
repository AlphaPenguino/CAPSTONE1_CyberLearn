// Create a script to drop old index and create new one
// filepath: c:\Users\Jacob\Desktop\CyberLearn-app-Prototype\backend\src\scripts\fix-module-index.js
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

async function fixModuleIndexes() {
  try {
    // Try multiple ways to get the MongoDB URI
    const mongoURI = process.env.MONGOURI || 
                     process.env.MONGO_URI || 
                     process.env.DB_URI ||
                     'mongodb://localhost:27017/cyberlearn_db';
                
    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Get the Module collection
    const db = mongoose.connection;
    const moduleCollection = db.collection('modules');
    
    // Drop the old index if it exists
    try {
      await moduleCollection.dropIndex('order_1');
      console.log('✅ Dropped old unique index on order field');
    } catch (err) {
      if (err.code !== 27) {  // Error code 27 means index not found
        console.error('Error dropping index:', err);
      } else {
        console.log('No existing index to drop.');
      }
    }
    
    // Create the new compound index
    await moduleCollection.createIndex({ createdBy: 1, order: 1 }, { unique: true });
    console.log('✅ Created new compound index on createdBy+order fields');
    
    console.log('✅ Index update completed successfully!');
  } catch (error) {
    console.error('Failed to update indexes:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixModuleIndexes();