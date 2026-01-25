// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================
// Validates request data before it reaches route handlers.
//
// We use express-validator, a popular validation library that provides:
// - Type checking (is it a string, number, email, etc.?)
// - Format validation (email format, URL format, etc.)
// - Sanitization (trim whitespace, escape HTML, etc.)
// - Custom validators
//
// How it works:
// 1. Define validation rules (chains of checks)
// 2. Apply rules as middleware before route handlers
// 3. Check for errors and respond or continue
// =============================================================================

import { body, param, query, validationResult } from 'express-validator';

// =============================================================================
// VALIDATION ERROR HANDLER
// =============================================================================
// Checks if there are validation errors and sends a response.
// Place this AFTER validation rules in the middleware chain.
// =============================================================================

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Extract error messages
    const messages = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: messages,
    });
  }

  // No errors, continue to next middleware
  next();
};

// =============================================================================
// AUTH VALIDATION RULES
// =============================================================================

/**
 * Validation rules for user signup
 */
export const validateSignup = [
  // Invite code
  body('inviteCode')
    .trim()
    .notEmpty()
    .withMessage('Invite code is required')
    .isLength({ min: 9, max: 9 })
    .withMessage('Invalid invite code format'),

  // Username
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .toLowerCase(), // Sanitize to lowercase

  // Email
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(), // Sanitize email

  // Display name
  body('displayName')
    .trim()
    .notEmpty()
    .withMessage('Display name is required')
    .isLength({ max: 50 })
    .withMessage('Display name cannot exceed 50 characters'),

  // Password
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),

  // Confirm password
  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  // Handle errors
  handleValidationErrors,
];

/**
 * Validation rules for user login
 */
export const validateLogin = [
  // Email
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  // Password
  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  // Handle errors
  handleValidationErrors,
];

/**
 * Validation rules for forgot password
 */
export const validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  handleValidationErrors,
];

/**
 * Validation rules for reset password
 */
export const validateResetPassword = [
  param('token')
    .notEmpty()
    .withMessage('Reset token is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  handleValidationErrors,
];

// =============================================================================
// COMMON VALIDATION HELPERS
// =============================================================================

/**
 * Validate MongoDB ObjectId parameter
 */
export const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),

  handleValidationErrors,
];

/**
 * Validate pagination query parameters
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  handleValidationErrors,
];

export default {
  handleValidationErrors,
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateObjectId,
  validatePagination,
};
