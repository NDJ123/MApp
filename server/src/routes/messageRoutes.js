// =============================================================================
// MESSAGE ROUTES
// =============================================================================
// API endpoints for message operations.
// All routes require authentication.
//
// Routes:
// GET    /api/messages/dm/:userId      - Get DM conversation history
// POST   /api/messages/dm/:userId/read - Mark DM conversation as read
// GET    /api/messages/group/:groupId  - Get group conversation history
// GET    /api/messages/unread          - Get unread message count
// =============================================================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getDMMessages,
  markDMAsRead,
  getUnreadCount,
  getGroupMessages,
  addReaction,
  removeReaction,
} from '../controllers/messageController.js';

const router = express.Router();

// All message routes require authentication
router.use(protect);

// DM conversation routes
router.get('/dm/:userId', getDMMessages);
router.post('/dm/:userId/read', markDMAsRead);

// Group conversation routes
router.get('/group/:groupId', getGroupMessages);

// Unread count
router.get('/unread', getUnreadCount);

// Reaction routes
router.post('/:messageId/reactions', addReaction);
router.delete('/:messageId/reactions', removeReaction);

export default router;
