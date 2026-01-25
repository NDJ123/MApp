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
// Returns paginated list of all users for the directory
// =============================================================================

export const getAllUsers = asyncHandler(async (req, res) => {
  // Pagination parameters from query string
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Search query (optional)
  const search = req.query.search || '';

  // Build search filter
  let filter = {};
  if (search) {
    // Search by username or displayName (case-insensitive)
    filter = {
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
      ],
    };
  }

  // Exclude the current user from results
  filter._id = { $ne: req.userId };

  // Get users with pagination
  const [users, total] = await Promise.all([
    User.find(filter)
      .select('username displayName avatar')
      .sort({ displayName: 1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  // Calculate pagination info
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
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
// =============================================================================

export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id)
    .select('username displayName avatar createdAt');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if this user is in the requester's contacts
  const isContact = req.user.contacts.some(
    (contactId) => contactId.toString() === id
  );

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        ...user.toJSON(),
        isContact,
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
  const { displayName, avatar } = req.body;

  // Only allow updating specific fields
  const updates = {};
  if (displayName) updates.displayName = displayName;
  if (avatar) updates.avatar = avatar;

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
// Quick search for users (used in autocomplete)
// =============================================================================

export const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(200).json({
      status: 'success',
      data: { users: [] },
    });
  }

  // Search by username or displayName
  const users = await User.find({
    _id: { $ne: req.userId }, // Exclude self
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

export default {
  getAllUsers,
  getUserById,
  updateProfile,
  searchUsers,
};
