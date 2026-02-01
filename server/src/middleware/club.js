// =============================================================================
// CLUB MIDDLEWARE
// =============================================================================
// Middleware functions for club-related authorization:
// - requireSuperadmin: Only superadmins can access
// - requireClubAdmin: Only club admins (or superadmins) can access
// - clubContext: Extracts and validates club context for club-scoped operations
// - requireActiveMembership: Ensures user is an active member of the club
//
// Usage:
// - Add 'requireSuperadmin' to routes that only superadmins should access
// - Add 'clubContext' to routes that need club scoping
// - Add 'requireClubAdmin' after clubContext for admin-only routes
// =============================================================================

import Club from '../models/Club.js';

// =============================================================================
// REQUIRE SUPERADMIN MIDDLEWARE
// =============================================================================
// Ensures the user is a superadmin.
// Must be used after 'protect' middleware.
// =============================================================================

export const requireSuperadmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authenticated',
    });
  }

  if (!req.user.isSuperadmin) {
    return res.status(403).json({
      status: 'error',
      message: 'This action requires superadmin privileges',
    });
  }

  next();
};

// =============================================================================
// CLUB CONTEXT MIDDLEWARE
// =============================================================================
// Extracts club context from request and validates membership.
// Club ID can come from:
// 1. X-Club-Id header (for switching context)
// 2. User's activeClub (default)
// 3. :clubId route parameter
//
// Sets req.club and req.clubMembership for downstream use.
// =============================================================================

export const clubContext = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
    }

    // Determine club ID from various sources
    let clubId = req.headers['x-club-id'] || req.params.clubId;

    // Fall back to user's active club if no explicit club specified
    if (!clubId && req.user.activeClub) {
      clubId = req.user.activeClub.toString();
    }

    if (!clubId) {
      return res.status(400).json({
        status: 'error',
        message: 'No club context. Please select a club.',
      });
    }

    // Verify club exists
    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({
        status: 'error',
        message: 'Club not found',
      });
    }

    if (!club.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'This club is no longer active',
      });
    }

    // Superadmins can access any club
    if (req.user.isSuperadmin) {
      req.club = club;
      req.clubId = club._id;
      // Create a synthetic membership for superadmins
      req.clubMembership = {
        club: club._id,
        role: 'admin',
        isActive: true,
        isSuperadmin: true,
      };
      return next();
    }

    // Find user's membership in this club
    const membership = req.user.clubMemberships?.find(
      (m) => m.club.toString() === clubId.toString()
    );

    if (!membership) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not a member of this club',
      });
    }

    if (!membership.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Your membership in this club is inactive',
      });
    }

    // Attach club context to request
    req.club = club;
    req.clubId = club._id;
    req.clubMembership = membership;

    next();
  } catch (error) {
    console.error('[Club Middleware] Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to validate club context',
    });
  }
};

// =============================================================================
// REQUIRE CLUB ADMIN MIDDLEWARE
// =============================================================================
// Ensures the user is an admin of the current club (or a superadmin).
// Must be used after 'clubContext' middleware.
// =============================================================================

export const requireClubAdmin = (req, res, next) => {
  if (!req.clubMembership) {
    return res.status(500).json({
      status: 'error',
      message: 'Club context not set. Use clubContext middleware first.',
    });
  }

  // Superadmins always have admin access
  if (req.user.isSuperadmin) {
    return next();
  }

  if (req.clubMembership.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'This action requires club admin privileges',
    });
  }

  next();
};

// =============================================================================
// REQUIRE ACTIVE MEMBERSHIP MIDDLEWARE
// =============================================================================
// Ensures the user has an active membership in the current club.
// This is already checked by clubContext, but can be used explicitly.
// Must be used after 'clubContext' middleware.
// =============================================================================

export const requireActiveMembership = (req, res, next) => {
  if (!req.clubMembership) {
    return res.status(500).json({
      status: 'error',
      message: 'Club context not set. Use clubContext middleware first.',
    });
  }

  if (!req.clubMembership.isActive) {
    return res.status(403).json({
      status: 'error',
      message: 'Your membership in this club is inactive. You cannot perform this action.',
    });
  }

  next();
};

// =============================================================================
// OPTIONAL CLUB CONTEXT MIDDLEWARE
// =============================================================================
// Like clubContext, but doesn't fail if no club is specified.
// Useful for endpoints that work with or without club context.
// =============================================================================

export const optionalClubContext = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Determine club ID from various sources
    let clubId = req.headers['x-club-id'] || req.params.clubId;

    // Fall back to user's active club if no explicit club specified
    if (!clubId && req.user.activeClub) {
      clubId = req.user.activeClub.toString();
    }

    if (!clubId) {
      // No club context, but that's okay for optional
      return next();
    }

    // Verify club exists
    const club = await Club.findById(clubId);
    if (!club || !club.isActive) {
      // Club doesn't exist or inactive, continue without context
      return next();
    }

    // Superadmins can access any club
    if (req.user.isSuperadmin) {
      req.club = club;
      req.clubId = club._id;
      req.clubMembership = {
        club: club._id,
        role: 'admin',
        isActive: true,
        isSuperadmin: true,
      };
      return next();
    }

    // Find user's membership in this club
    const membership = req.user.clubMemberships?.find(
      (m) => m.club.toString() === clubId.toString() && m.isActive
    );

    if (membership) {
      req.club = club;
      req.clubId = club._id;
      req.clubMembership = membership;
    }

    next();
  } catch (error) {
    // Ignore errors and continue without club context
    next();
  }
};

export default {
  requireSuperadmin,
  clubContext,
  requireClubAdmin,
  requireActiveMembership,
  optionalClubContext,
};
