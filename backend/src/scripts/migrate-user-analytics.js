import mongoose from "mongoose";
import User from "../models/Users.js";
import { connectDB } from "../lib/db.js";
import "dotenv/config";

/**
 * Migration script to add analytics fields to existing users
 */
async function migrateUsersAnalytics() {
  try {
    await connectDB();
    console.log("🔄 Starting analytics migration for existing users...");

    // Find users that don't have analytics field or have incomplete analytics
    const usersToUpdate = await User.find({
      $or: [
        { analytics: { $exists: false } },
        { "analytics.totalGamesPlayed": { $exists: false } },
        { "analytics.totalTimeSpent": { $exists: false } },
      ],
    });

    console.log(`📊 Found ${usersToUpdate.length} users to migrate`);

    let updatedCount = 0;
    for (const user of usersToUpdate) {
      try {
        // Initialize analytics if it doesn't exist
        if (!user.analytics) {
          user.analytics = {};
        }

        // Set default values for new analytics fields
        user.analytics.totalGamesPlayed = user.analytics.totalGamesPlayed || 0;
        user.analytics.totalTimeSpent = user.analytics.totalTimeSpent || 0;
        user.analytics.lastActivity = user.analytics.lastActivity || null;
        user.analytics.currentSessionStart =
          user.analytics.currentSessionStart || null;
        user.analytics.dailyTimeSpent = user.analytics.dailyTimeSpent || 0;
        user.analytics.lastDayTracked = user.analytics.lastDayTracked || null;

        if (!user.analytics.gamesByType) {
          user.analytics.gamesByType = {
            quiz: 0,
            digitalDefenders: 0,
            knowledgeRelay: 0,
            quizShowdown: 0,
            cyberQuest: 0,
          };
        }

        await user.save();
        updatedCount++;

        if (updatedCount % 50 === 0) {
          console.log(
            `✅ Migrated ${updatedCount}/${usersToUpdate.length} users`
          );
        }
      } catch (error) {
        console.error(`❌ Error migrating user ${user._id}:`, error);
      }
    }

    console.log(`🎉 Migration completed! Updated ${updatedCount} users`);

    // Verify migration
    const totalUsers = await User.countDocuments();
    const usersWithAnalytics = await User.countDocuments({
      "analytics.totalGamesPlayed": { $exists: true },
    });

    console.log(`📈 Total users: ${totalUsers}`);
    console.log(`📊 Users with analytics: ${usersWithAnalytics}`);

    if (totalUsers === usersWithAnalytics) {
      console.log("✅ All users have been successfully migrated!");
    } else {
      console.log(
        `⚠️  ${totalUsers - usersWithAnalytics} users still need migration`
      );
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run migration if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  migrateUsersAnalytics();
}

export { migrateUsersAnalytics };
