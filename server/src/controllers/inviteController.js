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
// Generate a new invite code for the current user in their active club
// Requires club admin privileges
// =============================================================================

export const createInvite = asyncHandler(async (req, res) => {
  // Must have club context (set by clubContext middleware)
  if (!req.clubId) {
    throw new AppError('No club context. Please select a club.', 400);
  }

  // Create a new invite for the authenticated user in their club
  const invite = await Invite.createForUser(req.userId, req.clubId);

  // Populate club info for response
  await invite.populate('club', 'name');

  res.status(201).json({
    status: 'success',
    message: 'Invite code created',
    data: {
      invite: {
        code: invite.code,
        club: invite.club,
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
// List all invite codes created by the current user in the current club
// =============================================================================

export const getMyInvites = asyncHandler(async (req, res) => {
  // Build query - filter by club if context is provided
  const query = { createdBy: req.userId };
  if (req.clubId) {
    query.club = req.clubId;
  }

  const invites = await Invite.find(query)
    .populate('usedBy', 'username displayName avatar')
    .populate('club', 'name')
    .sort({ createdAt: -1 }); // Most recent first

  // Transform invites to include status
  const inviteData = invites.map((invite) => ({
    code: invite.code,
    club: invite.club,
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
// Returns club info so user knows which club they're joining
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
      club: result.invite?.club
        ? {
            _id: result.invite.club._id,
            name: result.invite.club.name,
            image: result.invite.club.image,
          }
        : null,
      invitedBy: result.invite?.createdBy
        ? {
            username: result.invite.createdBy.username,
            displayName: result.invite.createdBy.displayName,
          }
        : null,
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
