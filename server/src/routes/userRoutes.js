// =============================================================================
// USER ROUTES
// =============================================================================
// API endpoints for user operations (not auth - that's in authRoutes.js)
// =============================================================================

import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateProfile,
  searchUsers,
  blockUser,
  unblockUser,
  muteUser,
  unmuteUser,
  getBlockedAndMuted,
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/users
 * @desc    Get all users (user directory)
 * @access  Private
 * @query   { page, limit, search }
 */
router.get('/', getAllUsers);

/**
 * @route   GET /api/users/search
 * @desc    Search users (autocomplete)
 * @access  Private
 * @query   { q }
 */
router.get('/search', searchUsers);

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user's profile
 * @access  Private
 * @body    { displayName, avatar, bio }
 */
router.put('/profile', updateProfile);

/**
 * @route   GET /api/users/blocked-muted
 * @desc    Get blocked and muted users lists
 * @access  Private
 */
router.get('/blocked-muted', getBlockedAndMuted);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', getUserById);

/**
 * @route   POST /api/users/:id/block
 * @desc    Block a user
 * @access  Private
 */
router.post('/:id/block', blockUser);

/**
 * @route   DELETE /api/users/:id/block
 * @desc    Unblock a user
 * @access  Private
 */
router.delete('/:id/block', unblockUser);

/**
 * @route   POST /api/users/:id/mute
 * @desc    Mute a user
 * @access  Private
 */
router.post('/:id/mute', muteUser);

/**
 * @route   DELETE /api/users/:id/mute
 * @desc    Unmute a user
 * @access  Private
 */
router.delete('/:id/mute', unmuteUser);

export default router;
