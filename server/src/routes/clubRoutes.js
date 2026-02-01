// =============================================================================
// CLUB ROUTES
// =============================================================================
// API endpoints for club operations.
//
// Routes:
// POST   /api/clubs                        - Create a new club (superadmin)
// GET    /api/clubs                        - Get all clubs (superadmin)
// GET    /api/clubs/my                     - Get user's clubs
// GET    /api/clubs/:clubId                - Get club details
// PUT    /api/clubs/:clubId                - Update club settings (admin)
// DELETE /api/clubs/:clubId                - Deactivate club (superadmin)
// PUT    /api/clubs/:clubId/switch         - Switch active club
// PUT    /api/clubs/:clubId/membership     - Update own membership status
// GET    /api/clubs/:clubId/members        - Get club members
// POST   /api/clubs/:clubId/members/:userId - Add member (admin)
// DELETE /api/clubs/:clubId/members/:userId - Remove member (admin)
// POST   /api/clubs/:clubId/admins/:userId  - Promote to admin (admin)
// DELETE /api/clubs/:clubId/admins/:userId  - Demote admin (admin)
// =============================================================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  requireSuperadmin,
  clubContext,
  requireClubAdmin,
} from '../middleware/club.js';
import {
  createClub,
  getAllClubs,
  getMyClubs,
  getClub,
  updateClub,
  deleteClub,
  switchClub,
  updateMembership,
  getMembers,
  addMember,
  removeMember,
  promoteToAdmin,
  demoteAdmin,
} from '../controllers/clubController.js';

const router = express.Router();

// DEBUG: Test route to verify club routes are loaded
router.get('/test-routes', (req, res) => {
  res.json({ status: 'ok', message: 'Club routes are loaded', version: 'v2' });
});

// All club routes require authentication
router.use(protect);

// =============================================================================
// SUPERADMIN ROUTES
// =============================================================================

// Create a new club (superadmin only)
router.post('/', requireSuperadmin, createClub);

// Get all clubs (superadmin only)
router.get('/', requireSuperadmin, getAllClubs);

// =============================================================================
// USER CLUB ROUTES
// =============================================================================

// Get user's clubs (no club context needed)
router.get('/my', getMyClubs);

// =============================================================================
// CLUB-SPECIFIC ROUTES
// =============================================================================

// Switch active club (user must be a member) - MUST be before /:clubId routes
router.put('/:clubId/switch', switchClub);

// Update own membership status (active/inactive) - MUST be before /:clubId routes
router.put('/:clubId/membership', updateMembership);

// Get club details (requires membership via clubContext)
router.get('/:clubId', clubContext, getClub);

// Update club settings (requires admin)
router.put('/:clubId', clubContext, requireClubAdmin, updateClub);

// Delete/deactivate club (superadmin only)
router.delete('/:clubId', clubContext, requireSuperadmin, deleteClub);

// =============================================================================
// MEMBER MANAGEMENT ROUTES
// =============================================================================

// Get club members
router.get('/:clubId/members', clubContext, getMembers);

// Add member to club (admin only)
router.post('/:clubId/members/:userId', clubContext, requireClubAdmin, addMember);

// Remove member from club (admin only)
router.delete('/:clubId/members/:userId', clubContext, requireClubAdmin, removeMember);

// =============================================================================
// ADMIN MANAGEMENT ROUTES
// =============================================================================

// Promote member to admin (admin only)
router.post('/:clubId/admins/:userId', clubContext, requireClubAdmin, promoteToAdmin);

// Demote admin to member (admin only)
router.delete('/:clubId/admins/:userId', clubContext, requireClubAdmin, demoteAdmin);

export default router;
