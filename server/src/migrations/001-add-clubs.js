// =============================================================================
// MIGRATION: ADD CLUBS TO PADELTALK
// =============================================================================
// This migration introduces the club system to Padeltalk.
//
// What it does:
// 1. Creates the "OG Padel" club for all existing users
// 2. Creates a default group for the club containing all users
// 3. Promotes neildjohnson@icloud.com to superadmin
// 4. Adds all existing users to the OG Padel club
// 5. Migrates contacts, blocked users, and muted users to club-scoped format
// 6. Adds club reference to all existing messages
// 7. Updates conversation IDs to include club
// 8. Adds club reference to all existing groups
// 9. Adds club reference to all existing invites
//
// Usage:
//   node server/src/migrations/001-add-clubs.js
//
// IMPORTANT: Back up your database before running this migration!
// =============================================================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import User from '../models/User.js';
import Message from '../models/Message.js';
import Group from '../models/Group.js';
import Invite from '../models/Invite.js';
import Club from '../models/Club.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const SUPERADMIN_EMAIL = 'neildjohnson@icloud.com';
const DEFAULT_CLUB_NAME = 'OG Padel';
const DEFAULT_CLUB_DESCRIPTION = 'The original Padeltalk community';

// =============================================================================
// MIGRATION FUNCTIONS
// =============================================================================

async function connectToDatabase() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
}

async function findSuperadmin() {
  console.log(`\nLooking for superadmin account: ${SUPERADMIN_EMAIL}`);
  const superadmin = await User.findOne({ email: SUPERADMIN_EMAIL });

  if (!superadmin) {
    throw new Error(
      `Superadmin account not found: ${SUPERADMIN_EMAIL}\n` +
      'Please create this account before running the migration.'
    );
  }

  console.log(`Found superadmin: ${superadmin.displayName} (${superadmin.username})`);
  return superadmin;
}

async function createOGPadelClub(superadmin) {
  console.log(`\nCreating club: ${DEFAULT_CLUB_NAME}`);

  // Check if club already exists (idempotency)
  let club = await Club.findOne({ name: DEFAULT_CLUB_NAME });

  if (club) {
    console.log(`Club "${DEFAULT_CLUB_NAME}" already exists, using existing club`);
    return club;
  }

  club = await Club.create({
    name: DEFAULT_CLUB_NAME,
    description: DEFAULT_CLUB_DESCRIPTION,
    createdBy: superadmin._id,
    isActive: true,
  });

  console.log(`Created club: ${club.name} (${club._id})`);
  return club;
}

async function createDefaultGroup(club, superadmin, allUsers) {
  console.log('\nCreating default group for club...');

  // Check if default group already exists (idempotency)
  let defaultGroup = await Group.findOne({
    club: club._id,
    isDefaultClubGroup: true,
  });

  if (defaultGroup) {
    console.log('Default group already exists, using existing group');
    return defaultGroup;
  }

  // Create members array with all users
  const members = allUsers.map((user) => ({
    user: user._id,
    role: user._id.toString() === superadmin._id.toString() ? 'admin' : 'member',
    joinedAt: new Date(),
  }));

  defaultGroup = await Group.create({
    name: club.name,
    description: `All members of ${club.name}`,
    club: club._id,
    isDefaultClubGroup: true,
    members,
    createdBy: superadmin._id,
    isActive: true,
  });

  // Update club with default group reference
  club.defaultGroup = defaultGroup._id;
  await club.save();

  console.log(`Created default group: ${defaultGroup.name} with ${members.length} members`);
  return defaultGroup;
}

async function promoteSuperadmin(superadmin, club) {
  console.log('\nPromoting user to superadmin...');

  await User.updateOne(
    { _id: superadmin._id },
    {
      $set: {
        isSuperadmin: true,
        activeClub: club._id,
        clubMemberships: [
          {
            club: club._id,
            role: 'admin',
            isActive: true,
            joinedAt: new Date(),
          },
        ],
      },
    }
  );

  console.log(`Promoted ${superadmin.email} to superadmin and club admin`);
}

async function migrateUsers(club, superadminId) {
  console.log('\nMigrating users to club system...');

  // Find all users except superadmin (already migrated)
  const users = await User.find({ _id: { $ne: superadminId } });
  console.log(`Found ${users.length} users to migrate`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const user of users) {
    // Skip if user already has club memberships (idempotency)
    if (user.clubMemberships && user.clubMemberships.length > 0) {
      skippedCount++;
      continue;
    }

    // Migrate contacts to club-scoped format
    const scopedContacts = [];
    if (user.contacts && user.contacts.length > 0) {
      for (const contact of user.contacts) {
        // Handle both ObjectId and already-scoped format
        if (contact.user) {
          // Already in new format
          scopedContacts.push(contact);
        } else {
          // Old format - just an ObjectId
          scopedContacts.push({
            user: contact,
            club: club._id,
          });
        }
      }
    }

    // Migrate blocked users to club-scoped format
    const scopedBlockedUsers = [];
    if (user.blockedUsers && user.blockedUsers.length > 0) {
      for (const blocked of user.blockedUsers) {
        if (blocked.user) {
          scopedBlockedUsers.push(blocked);
        } else {
          scopedBlockedUsers.push({
            user: blocked,
            club: club._id,
          });
        }
      }
    }

    // Migrate muted users to club-scoped format
    const scopedMutedUsers = [];
    if (user.mutedUsers && user.mutedUsers.length > 0) {
      for (const muted of user.mutedUsers) {
        if (muted.user) {
          scopedMutedUsers.push(muted);
        } else {
          scopedMutedUsers.push({
            user: muted,
            club: club._id,
          });
        }
      }
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          activeClub: club._id,
          clubMemberships: [
            {
              club: club._id,
              role: 'member',
              isActive: true,
              joinedAt: new Date(),
            },
          ],
          contacts: scopedContacts,
          blockedUsers: scopedBlockedUsers,
          mutedUsers: scopedMutedUsers,
        },
      }
    );

    migratedCount++;
  }

  console.log(`Migrated ${migratedCount} users, skipped ${skippedCount} (already migrated)`);
}

async function migrateMessages(club) {
  console.log('\nMigrating messages to club system...');

  // Count messages without club
  const unmigrated = await Message.countDocuments({ club: { $exists: false } });
  console.log(`Found ${unmigrated} messages to migrate`);

  if (unmigrated === 0) {
    console.log('No messages to migrate');
    return;
  }

  // Add club to all messages without one
  const result = await Message.updateMany(
    { club: { $exists: false } },
    { $set: { club: club._id } }
  );

  console.log(`Added club to ${result.modifiedCount} messages`);

  // Update conversation IDs to include club
  console.log('Updating conversation IDs...');

  const messages = await Message.find({
    conversationId: { $exists: true, $not: /^dm_[a-f0-9]{24}_/ },
  });

  let updatedConversations = 0;
  for (const msg of messages) {
    if (msg.conversationId && !msg.conversationId.startsWith(`dm_${club._id}`)) {
      // Old format: dm_userId1_userId2
      // New format: dm_clubId_userId1_userId2
      let newConversationId = msg.conversationId;

      if (msg.conversationId.startsWith('dm_')) {
        // Extract user IDs from old format
        const parts = msg.conversationId.split('_');
        if (parts.length === 3) {
          newConversationId = `dm_${club._id}_${parts[1]}_${parts[2]}`;
        }
      }

      await Message.updateOne(
        { _id: msg._id },
        { $set: { conversationId: newConversationId } }
      );
      updatedConversations++;
    }
  }

  console.log(`Updated ${updatedConversations} conversation IDs`);
}

async function migrateGroups(club) {
  console.log('\nMigrating groups to club system...');

  // Count groups without club
  const unmigrated = await Group.countDocuments({
    club: { $exists: false },
    isDefaultClubGroup: { $ne: true },
  });
  console.log(`Found ${unmigrated} groups to migrate`);

  if (unmigrated === 0) {
    console.log('No groups to migrate');
    return;
  }

  // Add club to all groups without one (except default club groups)
  const result = await Group.updateMany(
    { club: { $exists: false } },
    { $set: { club: club._id, isDefaultClubGroup: false } }
  );

  console.log(`Added club to ${result.modifiedCount} groups`);
}

async function migrateInvites(club) {
  console.log('\nMigrating invites to club system...');

  // Count invites without club
  const unmigrated = await Invite.countDocuments({ club: { $exists: false } });
  console.log(`Found ${unmigrated} invites to migrate`);

  if (unmigrated === 0) {
    console.log('No invites to migrate');
    return;
  }

  // Add club to all invites without one
  const result = await Invite.updateMany(
    { club: { $exists: false } },
    { $set: { club: club._id } }
  );

  console.log(`Added club to ${result.modifiedCount} invites`);
}

async function verifyMigration(club) {
  console.log('\n=== MIGRATION VERIFICATION ===');

  // Check superadmin
  const superadmin = await User.findOne({ email: SUPERADMIN_EMAIL });
  console.log(`\nSuperadmin status: ${superadmin.isSuperadmin ? 'YES' : 'NO'}`);
  console.log(`Superadmin club memberships: ${superadmin.clubMemberships?.length || 0}`);

  // Check users with club memberships
  const usersWithClubs = await User.countDocuments({
    'clubMemberships.0': { $exists: true },
  });
  const totalUsers = await User.countDocuments({});
  console.log(`\nUsers with club memberships: ${usersWithClubs}/${totalUsers}`);

  // Check messages with club
  const messagesWithClub = await Message.countDocuments({ club: { $exists: true } });
  const totalMessages = await Message.countDocuments({});
  console.log(`Messages with club: ${messagesWithClub}/${totalMessages}`);

  // Check groups with club
  const groupsWithClub = await Group.countDocuments({ club: { $exists: true } });
  const totalGroups = await Group.countDocuments({});
  console.log(`Groups with club: ${groupsWithClub}/${totalGroups}`);

  // Check invites with club
  const invitesWithClub = await Invite.countDocuments({ club: { $exists: true } });
  const totalInvites = await Invite.countDocuments({});
  console.log(`Invites with club: ${invitesWithClub}/${totalInvites}`);

  // Check default group
  const defaultGroup = await Group.findOne({ club: club._id, isDefaultClubGroup: true });
  console.log(`\nDefault group exists: ${defaultGroup ? 'YES' : 'NO'}`);
  if (defaultGroup) {
    console.log(`Default group members: ${defaultGroup.members.length}`);
  }

  console.log('\n=== MIGRATION COMPLETE ===');
}

// =============================================================================
// MAIN MIGRATION FUNCTION
// =============================================================================

async function runMigration() {
  console.log('='.repeat(60));
  console.log('PADELTALK CLUB MIGRATION');
  console.log('='.repeat(60));

  try {
    // Connect to database
    await connectToDatabase();

    // Find superadmin account
    const superadmin = await findSuperadmin();

    // Get all users for the default group
    const allUsers = await User.find({});
    console.log(`\nTotal users in database: ${allUsers.length}`);

    // Create OG Padel club
    const club = await createOGPadelClub(superadmin);

    // Create default group for the club
    await createDefaultGroup(club, superadmin, allUsers);

    // Promote superadmin
    await promoteSuperadmin(superadmin, club);

    // Migrate all other users
    await migrateUsers(club, superadmin._id);

    // Migrate messages
    await migrateMessages(club);

    // Migrate groups
    await migrateGroups(club);

    // Migrate invites
    await migrateInvites(club);

    // Verify migration
    await verifyMigration(club);

  } catch (error) {
    console.error('\nMIGRATION FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// =============================================================================
// RUN MIGRATION
// =============================================================================

runMigration();
