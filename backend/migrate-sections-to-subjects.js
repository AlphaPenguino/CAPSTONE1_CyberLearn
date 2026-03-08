#!/usr/bin/env node

const { MongoClient } = require("mongodb");

async function migrateSectionsToSubjects() {
  const client = new MongoClient("mongodb://localhost:27017");

  try {
    await client.connect();
    const db = client.db("cyberlearn");

    console.log("🚀 Starting Migration: Sections → Subjects\n");

    // Step 1: Check current state
    console.log("📊 Current State:");
    const sectionsCount = await db.collection("sections").countDocuments();
    const subjectsCount = await db.collection("subjects").countDocuments();
    const questsCount = await db.collection("cyberquests").countDocuments();

    console.log(`  Sections: ${sectionsCount}`);
    console.log(`  Subjects: ${subjectsCount}`);
    console.log(`  Cyber Quests: ${questsCount}\n`);

    if (sectionsCount === 0) {
      console.log("⚠️  No sections found to migrate");
      return;
    }

    // Step 2: Copy sections to subjects collection
    console.log("📋 Step 1: Copying sections to subjects...");
    const sections = await db.collection("sections").find().toArray();

    if (sections.length > 0) {
      // Create subjects collection with the same data
      await db.collection("subjects").insertMany(sections);
      console.log(
        `✅ Copied ${sections.length} sections to subjects collection`
      );

      // Show what was copied
      sections.forEach((section, i) => {
        console.log(`   ${i + 1}. ${section.name} (ID: ${section._id})`);
      });
    }

    // Step 3: Update cyberquests to reference subjects instead of sections
    console.log("\n🎮 Step 2: Updating cyber quests...");
    const cyberQuests = await db.collection("cyberquests").find().toArray();

    let updatedQuests = 0;
    for (const quest of cyberQuests) {
      let updateFields = {};

      // If quest has a section field, rename it to subject
      if (quest.section !== undefined) {
        updateFields.subject = quest.section;
        updateFields.$unset = { section: 1 };
      }
      // If quest doesn't have a section/subject, assign to first subject
      else if (!quest.subject && sections.length > 0) {
        updateFields.subject = sections[0]._id;
        console.log(
          `   📌 Assigning quest "${quest.title}" to subject "${sections[0].name}"`
        );
      }

      if (Object.keys(updateFields).length > 0) {
        await db
          .collection("cyberquests")
          .updateOne(
            { _id: quest._id },
            updateFields.$unset
              ? {
                  $set: { subject: updateFields.subject },
                  $unset: updateFields.$unset,
                }
              : { $set: updateFields }
          );
        updatedQuests++;
      }
    }

    console.log(`✅ Updated ${updatedQuests} cyber quests`);

    // Step 4: Update users' sections array to reference subject IDs
    console.log("\n👥 Step 3: Updating user subject references...");
    const users = await db
      .collection("users")
      .find({ sections: { $exists: true, $ne: [] } })
      .toArray();

    let updatedUsers = 0;
    for (const user of users) {
      if (user.sections && user.sections.length > 0) {
        // The sections array should already contain valid ObjectIds
        // We just need to make sure they're still valid after the migration
        console.log(
          `   📌 User ${user.username} has ${user.sections.length} subject(s)`
        );
        updatedUsers++;
      }
    }

    console.log(`✅ Checked ${updatedUsers} users with subject assignments`);

    // Step 5: Verify the migration
    console.log("\n🔍 Step 4: Verifying migration...");
    const newSubjectsCount = await db.collection("subjects").countDocuments();
    const updatedQuestsCount = await db
      .collection("cyberquests")
      .countDocuments({ subject: { $exists: true } });

    console.log(`   Subjects collection: ${newSubjectsCount} documents`);
    console.log(
      `   Cyber quests with subject: ${updatedQuestsCount} documents`
    );

    // Show sample data
    const sampleSubjects = await db
      .collection("subjects")
      .find()
      .limit(3)
      .toArray();
    console.log("\n   Sample subjects:");
    sampleSubjects.forEach((subject, i) => {
      console.log(`     ${i + 1}. ${subject.name} (ID: ${subject._id})`);
    });

    const sampleQuests = await db
      .collection("cyberquests")
      .find({ subject: { $exists: true } })
      .limit(3)
      .toArray();
    console.log("\n   Sample quests with subjects:");
    sampleQuests.forEach((quest, i) => {
      console.log(`     ${i + 1}. ${quest.title} → Subject: ${quest.subject}`);
    });

    console.log("\n✅ Migration completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("   1. Test the frontend to ensure subjects are displayed");
    console.log("   2. Verify cyber quests are properly associated");
    console.log(
      "   3. If everything works, you can drop the old sections collection"
    );
    console.log("      Command: db.sections.drop()");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error(error.stack);
  } finally {
    await client.close();
  }
}

// Run the migration
migrateSectionsToSubjects();
