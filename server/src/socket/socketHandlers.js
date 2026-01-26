// =============================================================================
// SOCKET.IO HANDLERS
// =============================================================================
// Handles real-time communication:
// - Authentication (verify JWT on connection)
// - Message sending and receiving
// - User online/offline status
// - Typing indicators
// =============================================================================

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Group from '../models/Group.js';
import { getLinkPreviewForText } from '../utils/linkPreview.js';

// Store online users: { oderId: Set of socketIds }
const onlineUsers = new Map();

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================
// Verifies JWT token before allowing socket connection
// =============================================================================

const authenticateSocket = async (socket, next) => {
  try {
    // Get token from handshake auth or query
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database (JWT uses userId, not id)
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return next(new Error('User not found'));
    }

    // Attach user to socket
    socket.user = user;
    next();
  } catch (error) {
    console.error('[Socket] Auth error:', error.message);
    next(new Error('Invalid token'));
  }
};

// =============================================================================
// SETUP SOCKET HANDLERS
// =============================================================================
// Main function to configure all socket event handlers
// =============================================================================

export const setupSocketHandlers = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  // Handle new connections
  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`[Socket] User connected: ${user.username} (${socket.id})`);

    // -------------------------------------------------------------------------
    // JOIN USER'S PERSONAL ROOM
    // -------------------------------------------------------------------------
    // Each user joins a room named after their user ID
    // This allows us to send messages directly to them
    // -------------------------------------------------------------------------

    socket.join(user._id.toString());

    // Track online status
    if (!onlineUsers.has(user._id.toString())) {
      onlineUsers.set(user._id.toString(), new Set());
    }
    onlineUsers.get(user._id.toString()).add(socket.id);

    // Broadcast online status to contacts
    socket.broadcast.emit('user:online', {
      oderId: user._id,
      username: user.username,
    });

    // -------------------------------------------------------------------------
    // SEND MESSAGE
    // -------------------------------------------------------------------------
    // Client sends: { recipientId, content }
    // Server saves to DB and forwards to recipient
    // -------------------------------------------------------------------------

    socket.on('message:send', async (data, callback) => {
      try {
        const { recipientId, content, file } = data;

        // Validate - need either content or file
        if (!recipientId) {
          return callback?.({ error: 'Recipient is required' });
        }
        if (!content?.trim() && !file) {
          return callback?.({ error: 'Message content or file is required' });
        }

        // Verify recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
          return callback?.({ error: 'Recipient not found' });
        }

        // Validate file if present
        if (file) {
          if (!file.url || !file.name || !file.mimeType) {
            return callback?.({ error: 'Invalid file data' });
          }
          // Limit file size to 5MB
          if (file.size && file.size > 5 * 1024 * 1024) {
            return callback?.({ error: 'File size must be less than 5MB' });
          }
        }

        // Generate conversation ID
        const conversationId = Message.getDMConversationId(user._id, recipientId);

        // Determine message type
        let messageType = 'text';
        if (file) {
          messageType = file.mimeType.startsWith('image/') ? 'image' : 'file';
        }

        // Create message
        const message = await Message.create({
          sender: user._id,
          recipient: recipientId,
          conversationId,
          content: content?.trim() || '',
          messageType,
          file: file ? {
            url: file.url,
            name: file.name,
            size: file.size,
            mimeType: file.mimeType,
          } : undefined,
          readBy: [{ user: user._id, readAt: new Date() }], // Sender has read it
        });

        // Populate sender info for the response
        await message.populate('sender', 'username displayName avatar');

        const messageData = {
          _id: message._id,
          sender: message.sender,
          recipient: message.recipient,
          conversationId: message.conversationId,
          content: message.content,
          messageType: message.messageType,
          file: message.file,
          createdAt: message.createdAt,
        };

        // Send to recipient (if online)
        io.to(recipientId.toString()).emit('message:receive', messageData);

        // Send back to sender for confirmation
        callback?.({ success: true, message: messageData });

        console.log(`[Socket] ${messageType} message from ${user.username} to ${recipient.username}`);

        // Fetch link preview asynchronously (don't block the message send)
        if (content?.trim() && messageType === 'text') {
          getLinkPreviewForText(content).then(async (linkPreview) => {
            if (linkPreview) {
              // Update message with link preview
              await Message.findByIdAndUpdate(message._id, { linkPreview });

              // Notify both users about the link preview
              const previewData = { messageId: message._id, linkPreview };
              io.to(recipientId.toString()).emit('message:linkPreview', previewData);
              io.to(user._id.toString()).emit('message:linkPreview', previewData);

              console.log(`[Socket] Link preview added for message ${message._id}`);
            }
          }).catch(err => {
            console.error('[Socket] Link preview error:', err.message);
          });
        }
      } catch (error) {
        console.error('[Socket] Send message error:', error);
        callback?.({ error: 'Failed to send message' });
      }
    });

    // -------------------------------------------------------------------------
    // TYPING INDICATOR
    // -------------------------------------------------------------------------
    // Shows when a user is typing in a conversation
    // -------------------------------------------------------------------------

    socket.on('typing:start', ({ recipientId }) => {
      io.to(recipientId).emit('typing:start', {
        oderId: user._id,
        username: user.username,
      });
    });

    socket.on('typing:stop', ({ recipientId }) => {
      io.to(recipientId).emit('typing:stop', {
        oderId: user._id,
      });
    });

    // -------------------------------------------------------------------------
    // MARK MESSAGES AS READ
    // -------------------------------------------------------------------------
    // When user opens a conversation, mark messages as read
    // -------------------------------------------------------------------------

    socket.on('messages:read', async ({ oderId }) => {
      try {
        const conversationId = Message.getDMConversationId(user._id, oderId);

        // Find unread messages from the other user
        const unreadMessages = await Message.find({
          conversationId,
          sender: oderId,
          'readBy.user': { $ne: user._id },
        });

        // Mark as read
        for (const message of unreadMessages) {
          await message.markAsRead(user._id);
        }

        // Notify the other user that their messages were read
        io.to(oderId).emit('messages:read', {
          oderId: user._id,
          conversationId,
        });
      } catch (error) {
        console.error('[Socket] Mark read error:', error);
      }
    });

    // -------------------------------------------------------------------------
    // JOIN GROUP ROOMS
    // -------------------------------------------------------------------------
    // When user connects, join all their group rooms
    // -------------------------------------------------------------------------

    const joinGroupRooms = async () => {
      try {
        const groups = await Group.find({ 'members.user': user._id, isActive: true });
        for (const group of groups) {
          socket.join(`group:${group._id}`);
          console.log(`[Socket] ${user.username} joined group room: ${group.name}`);
        }
      } catch (error) {
        console.error('[Socket] Error joining group rooms:', error);
      }
    };
    joinGroupRooms();

    // -------------------------------------------------------------------------
    // JOIN A NEW GROUP ROOM
    // -------------------------------------------------------------------------
    // Called when user is added to a group or creates one
    // -------------------------------------------------------------------------

    socket.on('group:join', ({ groupId }) => {
      socket.join(`group:${groupId}`);
      console.log(`[Socket] ${user.username} joined group room: ${groupId}`);
    });

    // -------------------------------------------------------------------------
    // SEND GROUP MESSAGE
    // -------------------------------------------------------------------------
    // Client sends: { groupId, content }
    // Server saves to DB and broadcasts to all group members
    // -------------------------------------------------------------------------

    socket.on('group:message:send', async (data, callback) => {
      try {
        const { groupId, content, file } = data;

        // Validate - need either content or file
        if (!groupId) {
          return callback?.({ error: 'Group ID is required' });
        }
        if (!content?.trim() && !file) {
          return callback?.({ error: 'Message content or file is required' });
        }

        // Verify group exists and user is a member
        const group = await Group.findById(groupId);
        if (!group) {
          return callback?.({ error: 'Group not found' });
        }
        if (!group.isMember(user._id)) {
          return callback?.({ error: 'You are not a member of this group' });
        }

        // Validate file if present
        if (file) {
          if (!file.url || !file.name || !file.mimeType) {
            return callback?.({ error: 'Invalid file data' });
          }
          // Limit file size to 5MB
          if (file.size && file.size > 5 * 1024 * 1024) {
            return callback?.({ error: 'File size must be less than 5MB' });
          }
        }

        // Determine message type
        let messageType = 'text';
        if (file) {
          messageType = file.mimeType.startsWith('image/') ? 'image' : 'file';
        }

        // Create message with group conversation ID
        const conversationId = `group:${groupId}`;
        const message = await Message.create({
          sender: user._id,
          group: groupId,
          conversationId,
          content: content?.trim() || '',
          messageType,
          file: file ? {
            url: file.url,
            name: file.name,
            size: file.size,
            mimeType: file.mimeType,
          } : undefined,
          readBy: [{ user: user._id, readAt: new Date() }],
        });

        // Populate sender info
        await message.populate('sender', 'username displayName avatar');

        const messageData = {
          _id: message._id,
          sender: message.sender,
          group: groupId,
          conversationId: message.conversationId,
          content: message.content,
          messageType: message.messageType,
          file: message.file,
          createdAt: message.createdAt,
        };

        // Broadcast to all group members
        io.to(`group:${groupId}`).emit('group:message:receive', messageData);

        // Send confirmation to sender
        callback?.({ success: true, message: messageData });

        console.log(`[Socket] Group ${messageType} message from ${user.username} to ${group.name}`);

        // Fetch link preview asynchronously (don't block the message send)
        if (content?.trim() && messageType === 'text') {
          getLinkPreviewForText(content).then(async (linkPreview) => {
            if (linkPreview) {
              // Update message with link preview
              await Message.findByIdAndUpdate(message._id, { linkPreview });

              // Notify all group members about the link preview
              io.to(`group:${groupId}`).emit('message:linkPreview', {
                messageId: message._id,
                linkPreview,
              });

              console.log(`[Socket] Link preview added for group message ${message._id}`);
            }
          }).catch(err => {
            console.error('[Socket] Link preview error:', err.message);
          });
        }
      } catch (error) {
        console.error('[Socket] Send group message error:', error);
        callback?.({ error: 'Failed to send message' });
      }
    });

    // -------------------------------------------------------------------------
    // GROUP TYPING INDICATOR
    // -------------------------------------------------------------------------

    socket.on('group:typing:start', ({ groupId }) => {
      socket.to(`group:${groupId}`).emit('group:typing:start', {
        groupId,
        userId: user._id,
        username: user.username,
      });
    });

    socket.on('group:typing:stop', ({ groupId }) => {
      socket.to(`group:${groupId}`).emit('group:typing:stop', {
        groupId,
        userId: user._id,
      });
    });

    // -------------------------------------------------------------------------
    // REACTIONS
    // -------------------------------------------------------------------------
    // Handle message reactions in real-time
    // -------------------------------------------------------------------------

    socket.on('reaction:toggle', async (data, callback) => {
      try {
        const { messageId, emoji } = data;

        if (!messageId || !emoji) {
          return callback?.({ error: 'Message ID and emoji are required' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
          return callback?.({ error: 'Message not found' });
        }

        // Verify user can react to this message
        if (message.group) {
          const group = await Group.findById(message.group);
          if (!group || !group.isMember(user._id)) {
            return callback?.({ error: 'You cannot react to messages in this group' });
          }
        } else if (message.recipient) {
          const isSender = message.sender.toString() === user._id.toString();
          const isRecipient = message.recipient.toString() === user._id.toString();
          if (!isSender && !isRecipient) {
            return callback?.({ error: 'You cannot react to this message' });
          }
        }

        // Toggle the reaction
        await message.toggleReaction(user._id, emoji);

        // Fetch updated message with populated reactions
        const updatedMessage = await Message.findById(messageId)
          .populate('reactions.user', 'username displayName');

        const reactionData = {
          messageId,
          reactions: updatedMessage.reactions,
        };

        // Broadcast to appropriate recipients
        if (message.group) {
          // Send to all group members
          io.to(`group:${message.group}`).emit('reaction:updated', reactionData);
        } else {
          // Send to both DM participants
          io.to(message.sender.toString()).emit('reaction:updated', reactionData);
          io.to(message.recipient.toString()).emit('reaction:updated', reactionData);
        }

        callback?.({ success: true, reactions: updatedMessage.reactions });

        console.log(`[Socket] ${user.username} toggled ${emoji} on message ${messageId}`);
      } catch (error) {
        console.error('[Socket] Reaction toggle error:', error);
        callback?.({ error: 'Failed to toggle reaction' });
      }
    });

    // -------------------------------------------------------------------------
    // DISCONNECT
    // -------------------------------------------------------------------------

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${user.username} (${reason})`);

      // Remove from online users
      const userSockets = onlineUsers.get(user._id.toString());
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(user._id.toString());

          // Broadcast offline status
          socket.broadcast.emit('user:offline', {
            oderId: user._id,
          });
        }
      }
    });
  });

  console.log('[Socket] Handlers initialized');
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Check if a user is online
export const isUserOnline = (oderId) => {
  return onlineUsers.has(oderId.toString()) && onlineUsers.get(oderId.toString()).size > 0;
};

// Get all online user IDs
export const getOnlineUserIds = () => {
  return Array.from(onlineUsers.keys());
};
