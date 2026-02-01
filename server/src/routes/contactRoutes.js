// =============================================================================
// CONTACT ROUTES
// =============================================================================
// API endpoints for contact list management
// Contacts are scoped to clubs - each club has its own contact list
// =============================================================================

import express from 'express';
import {
  getContacts,
  addContact,
  removeContact,
  checkContact,
} from '../controllers/contactController.js';
import { protect } from '../middleware/auth.js';
import { clubContext } from '../middleware/club.js';

const router = express.Router();

// All routes require authentication and club context
router.use(protect);
router.use(clubContext);

/**
 * @route   GET /api/contacts
 * @desc    Get all contacts for current user in the current club
 * @access  Private
 */
router.get('/', getContacts);

/**
 * @route   GET /api/contacts/check/:userId
 * @desc    Check if user is a contact in the current club
 * @access  Private
 */
router.get('/check/:userId', checkContact);

/**
 * @route   POST /api/contacts/:userId
 * @desc    Add user to contacts in the current club
 * @access  Private
 */
router.post('/:userId', addContact);

/**
 * @route   DELETE /api/contacts/:userId
 * @desc    Remove user from contacts in the current club
 * @access  Private
 */
router.delete('/:userId', removeContact);

export default router;
