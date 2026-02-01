// =============================================================================
// CONTACT CONTROLLER
// =============================================================================
// Handles contact list operations:
// - Get all contacts
// - Add contact
// - Remove contact
//
// Contacts are stored per club: [{user: ObjectId, club: ObjectId}]
// =============================================================================

import User from '../models/User.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// =============================================================================
// GET ALL CONTACTS
// =============================================================================
// GET /api/contacts
// Returns the current user's contact list for the current club
// =============================================================================

export const getContacts = asyncHandler(async (req, res) => {
  const clubId = req.clubId;

  // Find current user and populate contacts
  const user = await User.findById(req.userId)
    .populate('contacts.user', 'username displayName avatar');

  // Filter contacts to only include those in the current club
  const clubContacts = user.contacts
    ?.filter((c) => c.club.toString() === clubId.toString())
    .map((c) => c.user)
    .filter(Boolean) || []; // Filter out any null values

  res.status(200).json({
    status: 'success',
    results: clubContacts.length,
    data: {
      contacts: clubContacts,
    },
  });
});

// =============================================================================
// ADD CONTACT
// =============================================================================
// POST /api/contacts/:userId
// Add a user to the current user's contact list in the current club
// =============================================================================

export const addContact = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const clubId = req.clubId;

  // Can't add yourself
  if (userId === req.userId.toString()) {
    throw new AppError("You can't add yourself as a contact", 400);
  }

  // Check if user exists
  const userToAdd = await User.findById(userId);
  if (!userToAdd) {
    throw new AppError('User not found', 404);
  }

  // Check if user is in the same club
  const userInClub = userToAdd.clubMemberships?.some(
    (m) => m.club.toString() === clubId.toString() && m.isActive
  );
  if (!userInClub) {
    throw new AppError('User is not a member of this club', 404);
  }

  // Check if already a contact in this club
  const currentUser = await User.findById(req.userId);
  const isAlreadyContact = currentUser.contacts?.some(
    (c) => c.user.toString() === userId && c.club.toString() === clubId.toString()
  );

  if (isAlreadyContact) {
    throw new AppError('User is already in your contacts for this club', 400);
  }

  // Add to contacts
  currentUser.contacts.push({ user: userId, club: clubId });
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
// Remove a user from the current user's contact list in the current club
// =============================================================================

export const removeContact = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const clubId = req.clubId;

  // Find current user
  const currentUser = await User.findById(req.userId);

  // Check if user is in contacts for this club
  const contactIndex = currentUser.contacts?.findIndex(
    (c) => c.user.toString() === userId && c.club.toString() === clubId.toString()
  );

  if (contactIndex === -1 || contactIndex === undefined) {
    throw new AppError('User is not in your contacts for this club', 400);
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
// Check if a user is in the current user's contacts for the current club
// =============================================================================

export const checkContact = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const clubId = req.clubId;

  const currentUser = await User.findById(req.userId);
  const isContact = currentUser.contacts?.some(
    (c) => c.user.toString() === userId && c.club.toString() === clubId.toString()
  ) || false;

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
