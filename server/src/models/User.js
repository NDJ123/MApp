// =============================================================================
// USER MODEL
// =============================================================================
// This file defines the User schema for MongoDB using Mongoose.
//
// What is a Schema?
// A schema defines the structure of documents in a MongoDB collection.
// Think of it like a blueprint that describes:
// - What fields a user has (username, email, password, etc.)
// - What type each field is (String, Number, Date, etc.)
// - Validation rules (required, unique, min/max length, etc.)
//
// What is a Model?
// A model is a wrapper around the schema that provides methods to
// interact with the database (create, read, update, delete users).
// =============================================================================

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// =============================================================================
// USER SCHEMA DEFINITION
// =============================================================================

const userSchema = new mongoose.Schema(
  {
    // -------------------------------------------------------------------------
    // AUTHENTICATION FIELDS
    // -------------------------------------------------------------------------

    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,  // No two users can have the same username
      trim: true,    // Remove whitespace from both ends
      lowercase: true, // Store as lowercase for consistent lookups
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      // Only allow letters, numbers, and underscores
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      // Basic email validation regex
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      // 'select: false' means this field won't be returned in queries by default
      // You must explicitly ask for it: User.findById(id).select('+password')
      // This is a security measure to prevent accidental password exposure
      select: false,
    },

    // -------------------------------------------------------------------------
    // PROFILE FIELDS
    // -------------------------------------------------------------------------

    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
    },

    avatar: {
      type: String,
      // Default avatar using UI Avatars service (generates initials-based avatar)
      default: function () {
        // 'this' refers to the document being created
        const name = this.displayName || this.username || 'User';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=F97316&color=fff`;
      },
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [200, 'Bio cannot exceed 200 characters'],
      default: '',
    },

    // -------------------------------------------------------------------------
    // SUPERADMIN FLAG
    // -------------------------------------------------------------------------
    // Superadmins can create clubs, assign club admins, and manage the platform.
    // The first superadmin is designated via migration (neildjohnson@icloud.com).

    isSuperadmin: {
      type: Boolean,
      default: false,
    },

    // -------------------------------------------------------------------------
    // CLUB MEMBERSHIPS
    // -------------------------------------------------------------------------
    // Users can belong to multiple clubs, each with a role and active status.

    clubMemberships: [
      {
        club: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Club',
          required: true,
        },
        role: {
          type: String,
          enum: ['admin', 'member'],
          default: 'member',
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Currently selected club for UI context
    activeClub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
    },

    // -------------------------------------------------------------------------
    // RELATIONSHIPS (CLUB-SCOPED)
    // -------------------------------------------------------------------------
    // Contacts, blocked users, and muted users are now scoped per club.

    contacts: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        club: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Club',
        },
      },
    ],

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // null for the first user(s) created manually
    },

    // Users this user has blocked (won't receive their messages) - per club
    blockedUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        club: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Club',
        },
      },
    ],

    // Users this user has muted (messages come through but no notifications) - per club
    mutedUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        club: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Club',
        },
      },
    ],

    // -------------------------------------------------------------------------
    // PASSWORD RESET FIELDS
    // -------------------------------------------------------------------------

    passwordResetToken: {
      type: String,
      select: false, // Don't include in normal queries
    },

    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  {
    // -------------------------------------------------------------------------
    // SCHEMA OPTIONS
    // -------------------------------------------------------------------------

    // Automatically add createdAt and updatedAt fields
    timestamps: true,

    // Transform output when converting to JSON (e.g., in API responses)
    toJSON: {
      // Remove sensitive fields and internal MongoDB fields
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v; // Mongoose version key
        return ret;
      },
    },
  }
);

// =============================================================================
// INDEXES
// =============================================================================
// Indexes speed up queries by allowing MongoDB to find documents faster.
// Think of them like the index in a book - instead of reading every page,
// you can jump directly to what you're looking for.
//
// We create indexes on fields we frequently search by.
// Note: 'unique: true' automatically creates an index, so we don't need
// to create separate indexes for username and email.
// =============================================================================

// Index for finding users by club memberships
userSchema.index({ 'clubMemberships.club': 1 });

// Index for superadmin queries
userSchema.index({ isSuperadmin: 1 });

// Compound index for club-scoped contacts
userSchema.index({ 'contacts.club': 1, 'contacts.user': 1 });

// Index for finding users by active club
userSchema.index({ activeClub: 1 });

// =============================================================================
// PRE-SAVE MIDDLEWARE (Hooks)
// =============================================================================
// Middleware functions run at specific points in a document's lifecycle.
// 'pre-save' runs BEFORE a document is saved to the database.
//
// We use this to hash passwords before storing them.
// NEVER store plain-text passwords - always hash them!
// =============================================================================

userSchema.pre('save', async function () {
  // 'this' refers to the document being saved

  // Only hash the password if it's new or has been modified
  // This prevents re-hashing an already hashed password
  if (!this.isModified('password')) {
    return;
  }

  // Generate a "salt" - random data added to the password before hashing
  // The number (12) is the "cost factor" - higher = more secure but slower
  // 12 is a good balance between security and performance
  const salt = await bcrypt.genSalt(12);

  // Hash the password with the salt
  // The resulting hash includes the salt, so we don't need to store it separately
  this.password = await bcrypt.hash(this.password, salt);
});

// =============================================================================
// INSTANCE METHODS
// =============================================================================
// Instance methods are available on individual document instances.
// They're called like: user.comparePassword('guess')
// =============================================================================

/**
 * Compare a plain-text password with the stored hash
 * @param {string} candidatePassword - The password to check
 * @returns {Promise<boolean>} - True if passwords match
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  // bcrypt.compare handles the salt extraction and comparison
  // It returns true if the password matches, false otherwise
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if this user has blocked another user in a specific club
 * @param {ObjectId} userId - The user ID to check
 * @param {ObjectId} clubId - The club ID for scoping
 * @returns {boolean}
 */
userSchema.methods.hasBlocked = function (userId, clubId) {
  return this.blockedUsers.some(
    (blocked) =>
      blocked.user.toString() === userId.toString() &&
      blocked.club.toString() === clubId.toString()
  );
};

/**
 * Check if this user has muted another user in a specific club
 * @param {ObjectId} userId - The user ID to check
 * @param {ObjectId} clubId - The club ID for scoping
 * @returns {boolean}
 */
userSchema.methods.hasMuted = function (userId, clubId) {
  return this.mutedUsers.some(
    (muted) =>
      muted.user.toString() === userId.toString() &&
      muted.club.toString() === clubId.toString()
  );
};

/**
 * Get the user's membership for a specific club
 * @param {ObjectId} clubId - The club ID
 * @returns {Object|null} - The membership object or null
 */
userSchema.methods.getClubMembership = function (clubId) {
  return this.clubMemberships.find(
    (m) => m.club.toString() === clubId.toString()
  );
};

/**
 * Check if user is an active member of a club
 * @param {ObjectId} clubId - The club ID
 * @returns {boolean}
 */
userSchema.methods.isActiveMemberOf = function (clubId) {
  const membership = this.getClubMembership(clubId);
  return membership && membership.isActive;
};

/**
 * Check if user is an admin of a club
 * @param {ObjectId} clubId - The club ID
 * @returns {boolean}
 */
userSchema.methods.isAdminOf = function (clubId) {
  const membership = this.getClubMembership(clubId);
  return membership && membership.role === 'admin';
};

/**
 * Get contacts for a specific club
 * @param {ObjectId} clubId - The club ID
 * @returns {ObjectId[]} - Array of user IDs
 */
userSchema.methods.getContactsForClub = function (clubId) {
  return this.contacts
    .filter((c) => c.club.toString() === clubId.toString())
    .map((c) => c.user);
};

/**
 * Generate a password reset token
 * @returns {string} - The unhashed token (to send to user via email)
 */
userSchema.methods.createPasswordResetToken = function () {
  // Generate a random token using Node's crypto module
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash the token before storing (like a password)
  // We store the hash, but send the unhashed token to the user
  // When they come back with the token, we hash it and compare
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Token expires in 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // Return the unhashed token to send via email
  return resetToken;
};

// =============================================================================
// STATIC METHODS
// =============================================================================
// Static methods are called on the Model itself, not on instances.
// They're called like: User.findByEmail('test@example.com')
// =============================================================================

/**
 * Find a user by email and include the password field
 * @param {string} email - The email to search for
 * @returns {Promise<User|null>} - The user or null
 */
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

/**
 * Find a user by username and include the password field
 * @param {string} username - The username to search for
 * @returns {Promise<User|null>} - The user or null
 */
userSchema.statics.findByUsernameWithPassword = function (username) {
  return this.findOne({ username: username.toLowerCase() }).select('+password');
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================
// mongoose.model() creates a model from our schema.
// The first argument 'User' is the model name - Mongoose will create a
// collection called 'users' (lowercase, pluralized) in the database.
// =============================================================================

const User = mongoose.model('User', userSchema);

export default User;
