// =============================================================================
// SUPERADMIN ROUTES
// =============================================================================
// API endpoints for superadmin operations.
// All routes require authentication AND superadmin status.
//
// Routes:
// POST   /api/superadmin/promote/:userId  - Promote user to superadmin
// DELETE /api/superadmin/demote/:userId   - Demote superadmin to regular user
// GET    /api/superadmin/list             - Get all superadmins
// GET    /api/superadmin/users            - Get all users (paginated)
// GET    /api/superadmin/stats            - Get platform statistics
// =============================================================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireSuperadmin } from '../middleware/club.js';
import {
  promoteToSuperadmin,
  demoteSuperadmin,
  getSuperadmins,
  getAllUsers,
  getPlatformStats,
} from '../controllers/superadminController.js';

const router = express.Router();

// All superadmin routes require authentication and superadmin status
router.use(protect);
router.use(requireSuperadmin);

// Superadmin management
router.post('/promote/:userId', promoteToSuperadmin);
router.delete('/demote/:userId', demoteSuperadmin);
router.get('/list', getSuperadmins);

// Platform-wide data access
router.get('/users', getAllUsers);
router.get('/stats', getPlatformStats);

export default router;
