// =============================================================================
// CONTACT CONTROLLER
// =============================================================================
// Handles contact list operations:
// - Get all contacts
// - Add contact
// - Remove contact
//
// Contacts are stored as an array of user IDs in the User model.
// This is a simple approach suitable for our user base (10-50 users).
// =============================================================================

import User from '../models/User.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// =============================================================================
// GET ALL CONTACTS
// =============================================================================
// GET /api/contacts
// Returns the current user's contact list with user details
// =============================================================================

export const getContacts = asyncHandler(async (req, res) => {
  // Find current user and populate contacts with their details
  const user = await User.findById(req.userId)
    .populate('contacts', 'username displayName avatar');

  res.status(200).json({
    status: 'success',
    results: user.contacts.length,
    data: {
      contacts: user.contacts,
    },
  });
});

// =============================================================================
// ADD CONTACT
// =============================================================================
// POST /api/contacts/:userId
// Add a user to the current user's contact list
// =============================================================================

export const addContact = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Can't add yourself
  if (userId === req.userId.toString()) {
    throw new AppError("You can't add yourself as a contact", 400);
  }

  // Check if user exists
  const userToAdd = await User.findById(userId);
  if (!userToAdd) {
    throw new AppError('User not found', 404);
  }

  // Check if already a contact
  const currentUser = await User.findById(req.userId);
  if (currentUser.contacts.includes(userId)) {
    throw new AppError('User is already in your contacts', 400);
  }

  // Add to contacts
  currentUser.contacts.push(userId);
  await currentUser.save();

  res.status(200).json({
    status: 'success',
    message: `${userToAdd.displayName} added to contacts`,
    data: {
      contact: {
        _id: userToAdd._id,
        username: userToAdd.username,
        displayName: userToAdd.displayName,
        avatar: userToAdd.avatar,
      },
    },
  });
});

// =============================================================================
// REMOVE CONTACT
// =============================================================================
// DELETE /api/contacts/:userId
// Remove a user from the current user's contact list
// =============================================================================

export const removeContact = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Find current user
  const currentUser = await User.findById(req.userId);

  // Check if user is in contacts
  const contactIndex = currentUser.contacts.findIndex(
    (id) => id.toString() === userId
  );

  if (contactIndex === -1) {
    throw new AppError('User is not in your contacts', 400);
  }

  // Remove from contacts
  currentUser.contacts.splice(contactIndex, 1);
  await currentUser.save();

  res.status(200).json({
    status: 'success',
    message: 'Contact removed',
  });
});

// =============================================================================
// CHECK IF CONTACT
// =============================================================================
// GET /api/contacts/check/:userId
// Check if a user is in the current user's contacts
// =============================================================================

export const checkContact = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const currentUser = await User.findById(req.userId);
  const isContact = currentUser.contacts.some(
    (id) => id.toString() === userId
  );

  res.status(200).json({
    status: 'success',
    data: { isContact },
  });
});

export default {
  getContacts,
  addContact,
  removeContact,
  checkContact,
};
