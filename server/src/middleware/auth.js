// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================
// Middleware functions that run before route handlers to:
// - Verify the user is logged in (has valid JWT)
// - Attach user data to the request object
// - Protect routes that require authentication
//
// How to use:
// - Add 'protect' middleware to any route that requires login
// - Example: router.get('/profile', protect, getProfile)
// =============================================================================

import { verifyToken, extractToken } from '../config/jwt.js';
import User from '../models/User.js';

// =============================================================================
// PROTECT MIDDLEWARE
// =============================================================================
// This is the main authentication middleware.
// It verifies the JWT token and attaches the user to req.user
// =============================================================================

export const protect = async (req, res, next) => {
  try {
    // -------------------------------------------------------------------------
    // STEP 1: Get token from request
    // -------------------------------------------------------------------------
    // Token can be in:
    // - Authorization header: "Bearer <token>"
    // - Cookie: "token=<token>"
    // -------------------------------------------------------------------------

    let token;

    // Check Authorization header first (preferred for APIs)
    const authHeader = req.headers.authorization;
    token = extractToken(authHeader);

    // Fall back to cookie if no header
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    // No token found - not authenticated
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated. Please log in.',
      });
    }

    // -------------------------------------------------------------------------
    // STEP 2: Verify token
    // -------------------------------------------------------------------------

    const { valid, decoded, error } = verifyToken(token);

    if (!valid) {
      return res.status(401).json({
        status: 'error',
        message: error || 'Invalid token. Please log in again.',
      });
    }

    // -------------------------------------------------------------------------
    // STEP 3: Check if user still exists
    // -------------------------------------------------------------------------
    // The user might have been deleted after the token was issued

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User no longer exists.',
      });
    }

    // -------------------------------------------------------------------------
    // STEP 4: Attach user to request
    // -------------------------------------------------------------------------
    // Now route handlers can access the user via req.user

    req.user = user;
    req.userId = user._id;

    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed. Please try again.',
    });
  }
};

// =============================================================================
// OPTIONAL AUTH MIDDLEWARE
// =============================================================================
// Like protect, but doesn't fail if no token is present.
// Use this for routes that work differently for logged-in vs anonymous users.
// =============================================================================

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader) || req.cookies?.token;

    if (token) {
      const { valid, decoded } = verifyToken(token);

      if (valid) {
        const user = await User.findById(decoded.userId);
        if (user) {
          req.user = user;
          req.userId = user._id;
        }
      }
    }

    // Continue regardless of whether user was found
    next();
  } catch (error) {
    // Ignore errors and continue as anonymous
    next();
  }
};

export default { protect, optionalAuth };
