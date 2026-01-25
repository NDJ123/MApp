// =============================================================================
// INVITE ROUTES
// =============================================================================
// API endpoints for invite code management.
// =============================================================================

import express from 'express';
import {
  createInvite,
  getMyInvites,
  validateInviteCode,
  getInviteStats,
} from '../controllers/inviteController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

/**
 * @route   GET /api/invites/validate/:code
 * @desc    Check if an invite code is valid
 * @access  Public
 */
router.get('/validate/:code', validateInviteCode);

// =============================================================================
// PROTECTED ROUTES (require authentication)
// =============================================================================

// Apply protect middleware to all routes below
router.use(protect);

/**
 * @route   POST /api/invites
 * @desc    Generate a new invite code
 * @access  Private
 */
router.post('/', createInvite);

/**
 * @route   GET /api/invites
 * @desc    Get all invites created by current user
 * @access  Private
 */
router.get('/', getMyInvites);

/**
 * @route   GET /api/invites/stats
 * @desc    Get invite statistics
 * @access  Private
 */
router.get('/stats', getInviteStats);

export default router;
