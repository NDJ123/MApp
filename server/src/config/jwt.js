// =============================================================================
// JWT CONFIGURATION
// =============================================================================
// JWT (JSON Web Token) is how we handle authentication in our API.
//
// How JWT works:
// 1. User logs in with email/password
// 2. Server validates credentials
// 3. Server creates a JWT containing user ID and sends it back
// 4. Client stores the token (in memory or localStorage)
// 5. Client sends token with every request (in Authorization header)
// 6. Server verifies token and knows who the user is
//
// JWT Structure (three parts separated by dots):
// - Header: algorithm and token type
// - Payload: data we want to store (user ID, expiration)
// - Signature: proves the token wasn't tampered with
//
// Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NSJ9.signature
// =============================================================================

import jwt from 'jsonwebtoken';

// Get values from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// Validate that JWT_SECRET is set (it's required for security)
if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

// =============================================================================
// TOKEN FUNCTIONS
// =============================================================================

/**
 * Generate a JWT token for a user
 * @param {string} userId - The user's MongoDB _id
 * @returns {string} - The signed JWT token
 */
export const generateToken = (userId) => {
  // jwt.sign() creates a new token
  // First argument: payload (data to encode)
  // Second argument: secret key (used to sign the token)
  // Third argument: options
  return jwt.sign(
    { userId },           // Payload - we only need the user ID
    JWT_SECRET,           // Secret key - keep this safe!
    { expiresIn: JWT_EXPIRE } // Options - token expires after this time
  );
};

/**
 * Verify and decode a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {{valid: boolean, decoded?: object, error?: string}}
 */
export const verifyToken = (token) => {
  try {
    // jwt.verify() checks the signature and expiration
    // If valid, it returns the decoded payload
    // If invalid, it throws an error
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    // Different error types for different problems
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'Token has expired' };
    }
    if (error.name === 'JsonWebTokenError') {
      return { valid: false, error: 'Invalid token' };
    }
    return { valid: false, error: 'Token verification failed' };
  }
};

/**
 * Extract token from Authorization header
 * Expected format: "Bearer <token>"
 * @param {string} authHeader - The Authorization header value
 * @returns {string|null} - The token or null if not found
 */
export const extractToken = (authHeader) => {
  if (!authHeader) return null;

  // Check for Bearer prefix
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7); // Remove "Bearer " prefix
  }

  return null;
};

// =============================================================================
// COOKIE OPTIONS
// =============================================================================
// We can also store tokens in HTTP-only cookies for better security.
// HTTP-only cookies can't be accessed by JavaScript, preventing XSS attacks.
// =============================================================================

export const cookieOptions = {
  httpOnly: true,  // Can't be accessed by JavaScript
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict', // Prevent CSRF attacks
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

export default {
  generateToken,
  verifyToken,
  extractToken,
  cookieOptions,
};
