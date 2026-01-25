// =============================================================================
// MESSAGE CONTROLLER
// =============================================================================
// Handles HTTP endpoints for messages:
// - Get conversation history
// - Mark messages as read
//
// Note: Sending messages is handled via Socket.io for real-time delivery.
// =============================================================================

import Message from '../models/Message.js';
import User from '../models/User.js';

// =============================================================================
// GET CONVERSATION MESSAGES
// =============================================================================
// GET /api/messages/dm/:userId
// Retrieves message history for a DM conversation
// =============================================================================

export const getDMMessages = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    // Validate other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Generate conversation ID
    const conversationId = Message.getDMConversationId(currentUserId, otherUserId);

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Fetch messages
    const messages = await Message.find({
      conversationId,
      deleted: false,
    })
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username displayName avatar')
      .lean();

    // Reverse to show oldest first in the UI
    messages.reverse();

    // Get total count for pagination
    const total = await Message.countDocuments({
      conversationId,
      deleted: false,
    });

    res.status(200).json({
      status: 'success',
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: skip + messages.length < total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// MARK MESSAGES AS READ
// =============================================================================
// POST /api/messages/dm/:userId/read
// Marks all messages in a DM conversation as read by the current user
// =============================================================================

export const markDMAsRead = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    // Generate conversation ID
    const conversationId = Message.getDMConversationId(currentUserId, otherUserId);

    // Find unread messages sent by the other user
    const unreadMessages = await Message.find({
      conversationId,
      sender: otherUserId,
      'readBy.user': { $ne: currentUserId },
      deleted: false,
    });

    // Mark each as read
    const updatePromises = unreadMessages.map(message =>
      message.markAsRead(currentUserId)
    );
    await Promise.all(updatePromises);

    res.status(200).json({
      status: 'success',
      data: {
        markedAsRead: unreadMessages.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET UNREAD COUNT
// =============================================================================
// GET /api/messages/unread
// Gets count of unread messages for the current user
// =============================================================================

export const getUnreadCount = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    // Count messages where current user is recipient and hasn't read
    const unreadCount = await Message.countDocuments({
      recipient: currentUserId,
      'readBy.user': { $ne: currentUserId },
      deleted: false,
    });

    res.status(200).json({
      status: 'success',
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
