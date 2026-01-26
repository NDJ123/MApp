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
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', getUserById);

export default router;
