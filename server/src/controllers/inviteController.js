// =============================================================================
// INVITE CONTROLLER
// =============================================================================
// Handles invite code operations:
// - Generate new invite codes
// - List user's invites
// - Validate invite codes (for signup form)
//
// Remember: Our app is invite-only, so this is how new users get in!
// =============================================================================

import Invite from '../models/Invite.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// =============================================================================
// CREATE INVITE
// =============================================================================
// POST /api/invites
// Generate a new invite code for the current user
// =============================================================================

export const createInvite = asyncHandler(async (req, res) => {
  // Create a new invite for the authenticated user
  const invite = await Invite.createForUser(req.userId);

  res.status(201).json({
    status: 'success',
    message: 'Invite code created',
    data: {
      invite: {
        code: invite.code,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
      },
    },
  });
});

// =============================================================================
// GET MY INVITES
// =============================================================================
// GET /api/invites
// List all invite codes created by the current user
// =============================================================================

export const getMyInvites = asyncHandler(async (req, res) => {
  const invites = await Invite.find({ createdBy: req.userId })
    .populate('usedBy', 'username displayName avatar')
    .sort({ createdAt: -1 }); // Most recent first

  // Transform invites to include status
  const inviteData = invites.map((invite) => ({
    code: invite.code,
    status: invite.usedBy ? 'used' : invite.isValid() ? 'valid' : 'expired',
    createdAt: invite.createdAt,
    usedBy: invite.usedBy,
    usedAt: invite.usedAt,
    expiresAt: invite.expiresAt,
  }));

  res.status(200).json({
    status: 'success',
    results: invites.length,
    data: {
      invites: inviteData,
    },
  });
});

// =============================================================================
// VALIDATE INVITE CODE
// =============================================================================
// GET /api/invites/validate/:code
// Check if an invite code is valid (for signup form)
// Public endpoint - no auth required
// =============================================================================

export const validateInviteCode = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const result = await Invite.validateCode(code);

  if (!result.valid) {
    throw new AppError(result.error, 400);
  }

  res.status(200).json({
    status: 'success',
    message: 'Invite code is valid',
    data: {
      valid: true,
    },
  });
});

// =============================================================================
// GET INVITE STATS
// =============================================================================
// GET /api/invites/stats
// Get statistics about the user's invites
// =============================================================================

export const getInviteStats = asyncHandler(async (req, res) => {
  // Count invites by status
  const total = await Invite.countDocuments({ createdBy: req.userId });
  const used = await Invite.countDocuments({
    createdBy: req.userId,
    usedBy: { $ne: null },
  });
  const available = total - used;

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        total,
        used,
        available,
      },
    },
  });
});

export default {
  createInvite,
  getMyInvites,
  validateInviteCode,
  getInviteStats,
};
