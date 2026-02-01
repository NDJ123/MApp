// =============================================================================
// FIX CONVERSATION IDS MIGRATION
// =============================================================================
// This script fixes DM message conversationIds that were generated with
// incorrect parameter order in getDMConversationId.
//
// Run with: node scripts/fix-conversation-ids.js
// =============================================================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Generate correct conversation ID
function getCorrectConversationId(userId1, userId2, clubId) {
  const ids = [userId1.toString(), userId2.toString()].sort();
  return `dm_${clubId.toString()}_${ids[0]}_${ids[1]}`;
}

async function fixConversationIds() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Message = mongoose.model('Message', new mongoose.Schema({}, { strict: false }));

    // Find all DM messages (have recipient, no group)
    const dmMessages = await Message.find({
      recipient: { $exists: true, $ne: null },
      group: { $exists: false },
      club: { $exists: true, $ne: null },
    });

    console.log(`Found ${dmMessages.length} DM messages to check`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;

    for (const message of dmMessages) {
      const correctConversationId = getCorrectConversationId(
        message.sender,
        message.recipient,
        message.club
      );

      if (message.conversationId !== correctConversationId) {
        console.log(`Fixing message ${message._id}:`);
        console.log(`  Old: ${message.conversationId}`);
        console.log(`  New: ${correctConversationId}`);

        await Message.updateOne(
          { _id: message._id },
          { $set: { conversationId: correctConversationId } }
        );
        fixedCount++;
      } else {
        alreadyCorrectCount++;
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Fixed: ${fixedCount} messages`);
    console.log(`Already correct: ${alreadyCorrectCount} messages`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

fixConversationIds();
