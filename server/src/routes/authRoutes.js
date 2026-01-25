// =============================================================================
// AUTH ROUTES
// =============================================================================
// Defines the API endpoints for authentication.
//
// Express Router:
// - Groups related routes together
// - Can add middleware to all routes in the group
// - Makes code modular and organized
//
// RESTful conventions:
// - POST for creating (signup, login)
// - GET for reading (get current user)
// - PUT/PATCH for updating
// - DELETE for deleting
// =============================================================================

import express from 'express';
import {
  signup,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import {
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} from '../middleware/validate.js';

// Create a router instance
const router = express.Router();

// =============================================================================
// PUBLIC ROUTES (no authentication required)
// =============================================================================

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user with invite code
 * @access  Public
 * @body    { inviteCode, username, email, displayName, password, confirmPassword }
 */
router.post('/signup', validateSignup, signup);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 * @body    { email, password }
 */
router.post('/login', validateLogin, login);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 * @body    { email }
 */
router.post('/forgot-password', validateForgotPassword, forgotPassword);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password using token
 * @access  Public
 * @params  { token }
 * @body    { password, confirmPassword }
 */
router.post('/reset-password/:token', validateResetPassword, resetPassword);

// =============================================================================
// PROTECTED ROUTES (authentication required)
// =============================================================================

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and clear token
 * @access  Private
 */
router.post('/logout', protect, logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', protect, getMe);

export default router;
