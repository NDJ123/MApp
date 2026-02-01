// =============================================================================
// GROUP MODEL
// =============================================================================
// Represents a group chat with multiple members.
//
// Features:
// - Group name and optional description
// - Members list with roles (admin, member)
// - Creator tracking
// - Optional group avatar
// =============================================================================

import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const groupSchema = new mongoose.Schema(
  {
    // Which club this group belongs to
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'Group must belong to a club'],
      index: true,
    },

    // Is this the default group for all club members?
    // Each club has one default group that auto-includes all active members
    isDefaultClubGroup: {
      type: Boolean,
      default: false,
    },

    // Group name
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      minlength: [2, 'Group name must be at least 2 characters'],
      maxlength: [50, 'Group name cannot exceed 50 characters'],
    },

    // Optional description
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
      default: '',
    },

    // Optional avatar URL
    avatar: {
      type: String,
      default: null,
    },

    // Who created the group
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Group members with their roles
    members: [memberSchema],

    // Is the group active?
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// =============================================================================
// INDEXES
// =============================================================================

// Index for finding groups by club
groupSchema.index({ club: 1 });

// Index for finding the default club group
groupSchema.index({ club: 1, isDefaultClubGroup: 1 });

// Index for finding groups by member within a club
groupSchema.index({ club: 1, 'members.user': 1 });

// Index for searching groups by name
groupSchema.index({ name: 'text' });

// =============================================================================
// INSTANCE METHODS
// =============================================================================

// Check if a user is a member
// Handles both populated (m.user is an object) and non-populated (m.user is ObjectId) cases
groupSchema.methods.isMember = function(userId) {
  return this.members.some(m => {
    const memberId = m.user._id || m.user;
    return memberId.toString() === userId.toString();
  });
};

// Check if a user is an admin
// Handles both populated (m.user is an object) and non-populated (m.user is ObjectId) cases
groupSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(m => {
    const memberId = m.user._id || m.user;
    return memberId.toString() === userId.toString();
  });
  return member && member.role === 'admin';
};

// Add a member to the group
groupSchema.methods.addMember = function(userId, role = 'member') {
  if (!this.isMember(userId)) {
    this.members.push({ user: userId, role });
  }
  return this.save();
};

// Remove a member from the group
// Handles both populated (m.user is an object) and non-populated (m.user is ObjectId) cases
groupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(m => {
    const memberId = m.user._id || m.user;
    return memberId.toString() !== userId.toString();
  });
  return this.save();
};

// Promote a member to admin
// Handles both populated (m.user is an object) and non-populated (m.user is ObjectId) cases
groupSchema.methods.promoteToAdmin = function(userId) {
  const member = this.members.find(m => {
    const memberId = m.user._id || m.user;
    return memberId.toString() === userId.toString();
  });
  if (member) {
    member.role = 'admin';
  }
  return this.save();
};

// =============================================================================
// STATIC METHODS
// =============================================================================

// Get all groups for a user in a specific club
groupSchema.statics.getGroupsForUser = function(userId, clubId) {
  const query = {
    'members.user': userId,
    isActive: true,
  };

  // If clubId is provided, filter by club
  if (clubId) {
    query.club = clubId;
  }

  return this.find(query)
    .populate('members.user', 'username displayName avatar')
    .populate('createdBy', 'username displayName')
    .populate('club', 'name')
    .sort({ isDefaultClubGroup: -1, updatedAt: -1 }); // Default group first
};

// Get the default group for a club
groupSchema.statics.getDefaultGroupForClub = function(clubId) {
  return this.findOne({
    club: clubId,
    isDefaultClubGroup: true,
    isActive: true,
  })
    .populate('members.user', 'username displayName avatar')
    .populate('createdBy', 'username displayName');
};

// =============================================================================
// EXPORT
// =============================================================================

const Group = mongoose.model('Group', groupSchema);

export default Group;
