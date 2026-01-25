// =============================================================================
// CONTACT ROUTES
// =============================================================================
// API endpoints for contact list management
// =============================================================================

import express from 'express';
import {
  getContacts,
  addContact,
  removeContact,
  checkContact,
} from '../controllers/contactController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/contacts
 * @desc    Get all contacts for current user
 * @access  Private
 */
router.get('/', getContacts);

/**
 * @route   GET /api/contacts/check/:userId
 * @desc    Check if user is a contact
 * @access  Private
 */
router.get('/check/:userId', checkContact);

/**
 * @route   POST /api/contacts/:userId
 * @desc    Add user to contacts
 * @access  Private
 */
router.post('/:userId', addContact);

/**
 * @route   DELETE /api/contacts/:userId
 * @desc    Remove user from contacts
 * @access  Private
 */
router.delete('/:userId', removeContact);

export default router;
