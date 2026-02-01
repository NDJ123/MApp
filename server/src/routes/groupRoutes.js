// =============================================================================
// GROUP ROUTES
// =============================================================================
// API endpoints for group operations.
// All routes require authentication and club context.
// Groups are scoped to clubs - each club has its own groups.
//
// Routes:
// POST   /api/groups                      - Create a new group
// GET    /api/groups                      - Get user's groups
// GET    /api/groups/:groupId             - Get group details
// PUT    /api/groups/:groupId             - Update group settings
// POST   /api/groups/:groupId/members     - Add a member
// DELETE /api/groups/:groupId/members/:userId - Remove a member
// POST   /api/groups/:groupId/leave       - Leave a group
// =============================================================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import { clubContext } from '../middleware/club.js';
import {
  createGroup,
  getMyGroups,
  getGroup,
  addMember,
  removeMember,
  leaveGroup,
  updateGroup,
} from '../controllers/groupController.js';

const router = express.Router();

// All group routes require authentication and club context
router.use(protect);
router.use(clubContext);

// Group CRUD
router.post('/', createGroup);
router.get('/', getMyGroups);
router.get('/:groupId', getGroup);
router.put('/:groupId', updateGroup);

// Member management
router.post('/:groupId/members', addMember);
router.delete('/:groupId/members/:userId', removeMember);
router.post('/:groupId/leave', leaveGroup);

export default router;
