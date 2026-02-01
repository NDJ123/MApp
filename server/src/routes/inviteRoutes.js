// =============================================================================
// INVITE ROUTES
// =============================================================================
// API endpoints for invite code management.
// Creating invites requires club admin privileges.
// =============================================================================

import express from 'express';
import {
  createInvite,
  getMyInvites,
  validateInviteCode,
  getInviteStats,
} from '../controllers/inviteController.js';
import { protect } from '../middleware/auth.js';
import { clubContext, requireClubAdmin, optionalClubContext } from '../middleware/club.js';

const router = express.Router();

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

/**
 * @route   GET /api/invites/validate/:code
 * @desc    Check if an invite code is valid
 * @access  Public
 * @returns Club info so user knows which club they're joining
 */
router.get('/validate/:code', validateInviteCode);

// =============================================================================
// PROTECTED ROUTES (require authentication)
// =============================================================================

// Apply protect middleware to all routes below
router.use(protect);

/**
 * @route   POST /api/invites
 * @desc    Generate a new invite code for the current club
 * @access  Private (Club Admin only)
 */
router.post('/', clubContext, requireClubAdmin, createInvite);

/**
 * @route   GET /api/invites
 * @desc    Get all invites created by current user (filtered by club if context provided)
 * @access  Private
 */
router.get('/', optionalClubContext, getMyInvites);

/**
 * @route   GET /api/invites/stats
 * @desc    Get invite statistics
 * @access  Private
 */
router.get('/stats', getInviteStats);

export default router;
