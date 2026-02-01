// =============================================================================
// USER ROUTES
// =============================================================================
// API endpoints for user operations (not auth - that's in authRoutes.js)
// All user-facing endpoints are club-scoped.
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
import { clubContext } from '../middleware/club.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user's profile (not club-scoped)
 * @access  Private
 * @body    { displayName, avatar, bio }
 */
router.put('/profile', updateProfile);

// All routes below require club context
router.use(clubContext);

/**
 * @route   GET /api/users
 * @desc    Get all users in the current club (user directory)
 * @access  Private
 * @query   { page, limit, search }
 */
router.get('/', getAllUsers);

/**
 * @route   GET /api/users/search
 * @desc    Search users in the current club (autocomplete)
 * @access  Private
 * @query   { q }
 */
router.get('/search', searchUsers);

/**
 * @route   GET /api/users/blocked-muted
 * @desc    Get blocked and muted users lists for current club
 * @access  Private
 */
router.get('/blocked-muted', getBlockedAndMuted);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (must be in same club)
 * @access  Private
 */
router.get('/:id', getUserById);

/**
 * @route   POST /api/users/:id/block
 * @desc    Block a user in the current club
 * @access  Private
 */
router.post('/:id/block', blockUser);

/**
 * @route   DELETE /api/users/:id/block
 * @desc    Unblock a user in the current club
 * @access  Private
 */
router.delete('/:id/block', unblockUser);

/**
 * @route   POST /api/users/:id/mute
 * @desc    Mute a user in the current club
 * @access  Private
 */
router.post('/:id/mute', muteUser);

/**
 * @route   DELETE /api/users/:id/mute
 * @desc    Unmute a user in the current club
 * @access  Private
 */
router.delete('/:id/mute', unmuteUser);

export default router;
