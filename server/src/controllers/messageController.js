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
import Group from '../models/Group.js';
import { getLinkPreviewForText } from '../utils/linkPreview.js';

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
      .populate('reactions.user', 'username displayName')
      .populate({
        path: 'replyTo',
        select: 'content sender messageType',
        populate: {
          path: 'sender',
          select: 'username displayName'
        }
      })
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

// =============================================================================
// GET GROUP MESSAGES
// =============================================================================
// GET /api/messages/group/:groupId
// Retrieves message history for a group conversation
// =============================================================================

export const getGroupMessages = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { groupId } = req.params;

    // Verify group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found',
      });
    }

    if (!group.isMember(currentUserId)) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not a member of this group',
      });
    }

    // Conversation ID for groups
    const conversationId = `group:${groupId}`;

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Fetch messages
    const messages = await Message.find({
      conversationId,
      deleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username displayName avatar')
      .populate('reactions.user', 'username displayName')
      .populate({
        path: 'replyTo',
        select: 'content sender messageType',
        populate: {
          path: 'sender',
          select: 'username displayName'
        }
      })
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
        group: {
          _id: group._id,
          name: group.name,
          avatar: group.avatar,
        },
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
// ADD REACTION
// =============================================================================
// POST /api/messages/:messageId/reactions
// Add a reaction to a message
// =============================================================================

export const addReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const currentUserId = req.user._id;

    if (!emoji) {
      return res.status(400).json({
        status: 'error',
        message: 'Emoji is required',
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found',
      });
    }

    // Check if user has permission to react (is in the conversation)
    if (message.group) {
      const group = await Group.findById(message.group);
      if (!group || !group.isMember(currentUserId)) {
        return res.status(403).json({
          status: 'error',
          message: 'You cannot react to messages in this group',
        });
      }
    } else if (message.recipient) {
      // For DMs, check if user is sender or recipient
      const isSender = message.sender.toString() === currentUserId.toString();
      const isRecipient = message.recipient.toString() === currentUserId.toString();
      if (!isSender && !isRecipient) {
        return res.status(403).json({
          status: 'error',
          message: 'You cannot react to this message',
        });
      }
    }

    // Toggle reaction
    await message.toggleReaction(currentUserId, emoji);

    // Fetch updated message with populated reactions
    const updatedMessage = await Message.findById(messageId)
      .populate('reactions.user', 'username displayName');

    res.status(200).json({
      status: 'success',
      data: {
        reactions: updatedMessage.reactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// REMOVE REACTION
// =============================================================================
// DELETE /api/messages/:messageId/reactions
// Remove a reaction from a message
// =============================================================================

export const removeReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const currentUserId = req.user._id;

    if (!emoji) {
      return res.status(400).json({
        status: 'error',
        message: 'Emoji is required',
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found',
      });
    }

    await message.removeReaction(currentUserId, emoji);

    // Fetch updated message with populated reactions
    const updatedMessage = await Message.findById(messageId)
      .populate('reactions.user', 'username displayName');

    res.status(200).json({
      status: 'success',
      data: {
        reactions: updatedMessage.reactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// FETCH LINK PREVIEW FOR MESSAGE
// =============================================================================
// POST /api/messages/:messageId/link-preview
// Fetches and saves link preview for a message
// =============================================================================

// =============================================================================
// SEARCH MESSAGES
// =============================================================================
// GET /api/messages/search?q=query&conversationId=xxx
// Searches messages by content within user's conversations
// =============================================================================

export const searchMessages = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { q, conversationId } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query must be at least 2 characters',
      });
    }

    const searchQuery = q.trim();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build the base query
    const query = {
      content: { $regex: searchQuery, $options: 'i' },
      deleted: false,
    };

    // If conversationId is provided, search within that conversation
    if (conversationId) {
      // Verify user has access to this conversation
      if (conversationId.startsWith('group:')) {
        const groupId = conversationId.replace('group:', '');
        const group = await Group.findById(groupId);
        if (!group || !group.isMember(currentUserId)) {
          return res.status(403).json({
            status: 'error',
            message: 'You do not have access to this conversation',
          });
        }
      } else {
        // DM conversation - verify user is part of it
        const [id1, id2] = conversationId.split(':');
        if (id1 !== currentUserId.toString() && id2 !== currentUserId.toString()) {
          return res.status(403).json({
            status: 'error',
            message: 'You do not have access to this conversation',
          });
        }
      }
      query.conversationId = conversationId;
    } else {
      // Search across all user's conversations
      // Get all groups user is a member of
      const userGroups = await Group.find({ 'members.user': currentUserId, isActive: true });
      const groupConversationIds = userGroups.map(g => `group:${g._id}`);

      // Build conversation filter: user's DMs OR user's groups
      query.$or = [
        { sender: currentUserId },
        { recipient: currentUserId },
        { conversationId: { $in: groupConversationIds } },
      ];
    }

    // Execute search
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username displayName avatar')
      .populate('recipient', 'username displayName avatar')
      .populate('group', 'name avatar')
      .lean();

    // Get total count
    const total = await Message.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        messages,
        query: searchQuery,
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

export const fetchLinkPreview = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found',
      });
    }

    // If message already has a link preview, return it
    if (message.linkPreview && message.linkPreview.url) {
      return res.status(200).json({
        status: 'success',
        data: { linkPreview: message.linkPreview },
      });
    }

    // Check if message has text content
    if (!message.content || !message.content.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Message has no content',
      });
    }

    // Fetch link preview
    const linkPreview = await getLinkPreviewForText(message.content);

    if (!linkPreview) {
      return res.status(200).json({
        status: 'success',
        data: { linkPreview: null },
      });
    }

    // Save to message
    message.linkPreview = linkPreview;
    await message.save();

    res.status(200).json({
      status: 'success',
      data: { linkPreview },
    });
  } catch (error) {
    next(error);
  }
};
