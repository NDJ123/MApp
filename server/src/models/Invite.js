// =============================================================================
// INVITE MODEL
// =============================================================================
// This model handles the invite-only registration system.
//
// How it works:
// 1. Existing users can generate invite codes
// 2. New users need a valid invite code to sign up
// 3. Each code can only be used once
// 4. We track who invited whom (referral chain)
//
// This creates a controlled user base and helps prevent spam signups.
// =============================================================================

import mongoose from 'mongoose';
import crypto from 'crypto';

const inviteSchema = new mongoose.Schema(
  {
    // -------------------------------------------------------------------------
    // INVITE CODE
    // -------------------------------------------------------------------------

    code: {
      type: String,
      required: true,
      unique: true,
      // We'll generate this automatically, not from user input
    },

    // -------------------------------------------------------------------------
    // RELATIONSHIPS
    // -------------------------------------------------------------------------

    // Which club this invite is for
    // When a user signs up with this invite, they join this club
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'Invite must be associated with a club'],
      index: true,
    },

    // Who created this invite (must be a club admin or superadmin)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Who used this invite (null if not yet used)
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // -------------------------------------------------------------------------
    // TIMESTAMPS
    // -------------------------------------------------------------------------

    usedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      // Optional: invites don't expire by default
      // Set this if you want time-limited invites
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// =============================================================================
// INDEXES
// =============================================================================

// Index for looking up invites by code (used during signup)
inviteSchema.index({ code: 1 });

// Index for finding all invites by club
inviteSchema.index({ club: 1 });

// Index for finding all invites created by a user in a club
inviteSchema.index({ club: 1, createdBy: 1 });

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * Generate a unique invite code
 * Format: XXXX-XXXX (8 characters with dash for readability)
 * @returns {string} - The generated code
 */
inviteSchema.statics.generateCode = function () {
  // Generate 4 random bytes and convert to uppercase hex (8 chars)
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  // Add a dash in the middle for readability: XXXX-XXXX
  return `${randomPart.slice(0, 4)}-${randomPart.slice(4)}`;
};

/**
 * Create a new invite for a user in a specific club
 * @param {ObjectId} userId - The user creating the invite
 * @param {ObjectId} clubId - The club the invite is for
 * @returns {Promise<Invite>} - The created invite
 */
inviteSchema.statics.createForUser = async function (userId, clubId) {
  // Generate a unique code (retry if collision)
  let code;
  let isUnique = false;

  while (!isUnique) {
    code = this.generateCode();
    // Check if code already exists
    const existing = await this.findOne({ code });
    if (!existing) {
      isUnique = true;
    }
  }

  // Create and return the invite
  return await this.create({
    code,
    club: clubId,
    createdBy: userId,
  });
};

/**
 * Validate and use an invite code
 * @param {string} code - The invite code to validate
 * @param {ObjectId} userId - The user using the invite
 * @returns {Promise<{valid: boolean, invite?: Invite, error?: string}>}
 */
inviteSchema.statics.useCode = async function (code, userId) {
  // Find the invite by code
  const invite = await this.findOne({ code: code.toUpperCase() });

  // Check if invite exists
  if (!invite) {
    return { valid: false, error: 'Invalid invite code' };
  }

  // Check if already used
  if (invite.usedBy) {
    return { valid: false, error: 'This invite code has already been used' };
  }

  // Check if expired
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { valid: false, error: 'This invite code has expired' };
  }

  // Mark as used
  invite.usedBy = userId;
  invite.usedAt = new Date();
  await invite.save();

  return { valid: true, invite };
};

/**
 * Check if an invite code is valid (without using it)
 * @param {string} code - The invite code to check
 * @returns {Promise<{valid: boolean, invite?: Invite, error?: string}>}
 */
inviteSchema.statics.validateCode = async function (code) {
  const invite = await this.findOne({ code: code.toUpperCase() })
    .populate('club', 'name image')
    .populate('createdBy', 'username displayName');

  if (!invite) {
    return { valid: false, error: 'Invalid invite code' };
  }

  if (invite.usedBy) {
    return { valid: false, error: 'This invite code has already been used' };
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { valid: false, error: 'This invite code has expired' };
  }

  // Return the invite so the caller can access club information
  return { valid: true, invite };
};

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * Check if this invite is still valid
 * @returns {boolean}
 */
inviteSchema.methods.isValid = function () {
  // Already used
  if (this.usedBy) return false;

  // Expired
  if (this.expiresAt && this.expiresAt < new Date()) return false;

  return true;
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

const Invite = mongoose.model('Invite', inviteSchema);

export default Invite;
