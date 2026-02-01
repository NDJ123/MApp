// =============================================================================
// USER CONTROLLER
// =============================================================================
// Handles user-related operations:
// - Get all users (user directory)
// - Get user by ID (profile view)
// - Update own profile
// - Search users
//
// Note: Authentication (signup/login) is in authController.js
// =============================================================================

import User from '../models/User.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// =============================================================================
// GET ALL USERS (User Directory)
// =============================================================================
// GET /api/users
// Returns paginated list of users in the current club
// Requires club context middleware
// =============================================================================

export const getAllUsers = asyncHandler(async (req, res) => {
  // Pagination parameters from query string
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Search query (optional)
  const search = req.query.search || '';

  // Build filter for users in the same club
  const filter = {
    _id: { $ne: req.userId }, // Exclude current user
    'clubMemberships.club': req.clubId, // Must be in the same club
    'clubMemberships.isActive': true, // Must have active membership
  };

  // Add search criteria if provided
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { displayName: { $regex: search, $options: 'i' } },
    ];
  }

  // Get users with pagination
  const [users, total] = await Promise.all([
    User.find(filter)
      .select('username displayName avatar bio clubMemberships')
      .sort({ displayName: 1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  // Format users with their club role
  const formattedUsers = users.map((user) => {
    const membership = user.clubMemberships?.find(
      (m) => m.club.toString() === req.clubId.toString()
    );
    return {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      role: membership?.role || 'member',
    };
  });

  // Calculate pagination info
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  res.status(200).json({
    status: 'success',
    results: formattedUsers.length,
    data: {
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    },
  });
});

// =============================================================================
// GET USER BY ID
// =============================================================================
// GET /api/users/:id
// Returns a single user's public profile
// User must be in the same club
// =============================================================================

export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const clubId = req.clubId;

  const user = await User.findById(id)
    .select('username displayName avatar bio createdAt clubMemberships');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user is in the same club
  const targetMembership = user.clubMemberships?.find(
    (m) => m.club.toString() === clubId.toString() && m.isActive
  );

  if (!targetMembership) {
    throw new AppError('User not found in this club', 404);
  }

  // Check if this user is in the requester's contacts (for this club)
  const isContact = req.user.contacts?.some(
    (c) => c.club && c.user.toString() === id && c.club.toString() === clubId.toString()
  );

  // Check if blocked or muted (club-scoped)
  const isBlocked = req.user.hasBlocked(id, clubId);
  const isMuted = req.user.hasMuted(id, clubId);

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt,
        role: targetMembership.role,
        isContact,
        isBlocked,
        isMuted,
      },
    },
  });
});

// =============================================================================
// UPDATE PROFILE
// =============================================================================
// PUT /api/users/profile
// Update the current user's profile
// =============================================================================

export const updateProfile = asyncHandler(async (req, res) => {
  const { displayName, avatar, bio } = req.body;

  // Only allow updating specific fields
  const updates = {};
  if (displayName !== undefined) updates.displayName = displayName;
  if (avatar !== undefined) updates.avatar = avatar;
  if (bio !== undefined) updates.bio = bio;

  if (Object.keys(updates).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    updates,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'Profile updated',
    data: { user },
  });
});

// =============================================================================
// SEARCH USERS
// =============================================================================
// GET /api/users/search?q=query
// Quick search for users in the current club (used in autocomplete)
// =============================================================================

export const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const clubId = req.clubId;

  if (!q || q.length < 2) {
    return res.status(200).json({
      status: 'success',
      data: { users: [] },
    });
  }

  // Search by username or displayName within the club
  const users = await User.find({
    _id: { $ne: req.userId }, // Exclude self
    'clubMemberships.club': clubId, // Must be in the same club
    'clubMemberships.isActive': true,
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { displayName: { $regex: q, $options: 'i' } },
    ],
  })
    .select('username displayName avatar')
    .limit(10);

  res.status(200).json({
    status: 'success',
    data: { users },
  });
});

// =============================================================================
// BLOCK USER
// =============================================================================
// POST /api/users/:id/block
// Block a user in the current club - won't receive their messages
// =============================================================================

export const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const clubId = req.clubId;

  if (id === req.userId.toString()) {
    throw new AppError('You cannot block yourself', 400);
  }

  // Verify target user exists and is in the same club
  const targetUser = await User.findById(id);
  if (!targetUser) {
    throw new AppError('User not found', 404);
  }

  const targetInClub = targetUser.clubMemberships?.some(
    (m) => m.club.toString() === clubId.toString()
  );
  if (!targetInClub) {
    throw new AppError('User not found in this club', 404);
  }

  // Add to blocked list if not already blocked in this club
  const user = await User.findById(req.userId);
  if (user.hasBlocked(id, clubId)) {
    throw new AppError('User is already blocked in this club', 400);
  }

  user.blockedUsers.push({ user: id, club: clubId });
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'User blocked',
  });
});

// =============================================================================
// UNBLOCK USER
// =============================================================================
// DELETE /api/users/:id/block
// Unblock a user in the current club
// =============================================================================

export const unblockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const clubId = req.clubId;

  const user = await User.findById(req.userId);
  if (!user.hasBlocked(id, clubId)) {
    throw new AppError('User is not blocked in this club', 400);
  }

  user.blockedUsers = user.blockedUsers.filter(
    (blocked) =>
      !(blocked.user.toString() === id && blocked.club.toString() === clubId.toString())
  );
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'User unblocked',
  });
});

// =============================================================================
// MUTE USER
// =============================================================================
// POST /api/users/:id/mute
// Mute a user in the current club - still receive messages but no notifications
// =============================================================================

export const muteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const clubId = req.clubId;

  if (id === req.userId.toString()) {
    throw new AppError('You cannot mute yourself', 400);
  }

  // Verify target user exists and is in the same club
  const targetUser = await User.findById(id);
  if (!targetUser) {
    throw new AppError('User not found', 404);
  }

  const targetInClub = targetUser.clubMemberships?.some(
    (m) => m.club.toString() === clubId.toString()
  );
  if (!targetInClub) {
    throw new AppError('User not found in this club', 404);
  }

  // Add to muted list if not already muted in this club
  const user = await User.findById(req.userId);
  if (user.hasMuted(id, clubId)) {
    throw new AppError('User is already muted in this club', 400);
  }

  user.mutedUsers.push({ user: id, club: clubId });
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'User muted',
  });
});

// =============================================================================
// UNMUTE USER
// =============================================================================
// DELETE /api/users/:id/mute
// Unmute a user in the current club
// =============================================================================

export const unmuteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const clubId = req.clubId;

  const user = await User.findById(req.userId);
  if (!user.hasMuted(id, clubId)) {
    throw new AppError('User is not muted in this club', 400);
  }

  user.mutedUsers = user.mutedUsers.filter(
    (muted) =>
      !(muted.user.toString() === id && muted.club.toString() === clubId.toString())
  );
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'User unmuted',
  });
});

// =============================================================================
// GET BLOCKED AND MUTED USERS
// =============================================================================
// GET /api/users/blocked-muted
// Get current user's blocked and muted user lists for the current club
// =============================================================================

export const getBlockedAndMuted = asyncHandler(async (req, res) => {
  const clubId = req.clubId;

  const user = await User.findById(req.userId)
    .populate('blockedUsers.user', 'username displayName avatar')
    .populate('mutedUsers.user', 'username displayName avatar');

  // Filter to only include users blocked/muted in the current club
  // Handle case where club might be undefined (legacy data)
  const blockedUsers = user.blockedUsers
    ?.filter((b) => b.club && b.club.toString() === clubId.toString())
    .map((b) => b.user) || [];

  const mutedUsers = user.mutedUsers
    ?.filter((m) => m.club && m.club.toString() === clubId.toString())
    .map((m) => m.user) || [];

  res.status(200).json({
    status: 'success',
    data: {
      blockedUsers,
      mutedUsers,
    },
  });
});

export default {
  getAllUsers,
  getUserById,
  updateProfile,
  searchUsers,
  blockUser,
  unblockUser,
  muteUser,
  unmuteUser,
  getBlockedAndMuted,
};
