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

// Store online users: { userId: Set of socketIds }
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

    // Get club context from handshake (required for club-scoped messaging)
    const clubId = socket.handshake.auth?.clubId || socket.handshake.query?.clubId;
    if (!clubId) {
      return next(new Error('Club context required'));
    }

    // Verify user is an active member of this club
    const membership = user.getClubMembership(clubId);
    if (!membership || !membership.isActive) {
      return next(new Error('Not an active member of this club'));
    }

    // Attach user and club to socket
    socket.user = user;
    socket.clubId = clubId;
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
    const clubId = socket.clubId;
    console.log(`[Socket] User connected: ${user.username} in club ${clubId} (${socket.id})`);

    // -------------------------------------------------------------------------
    // JOIN USER'S PERSONAL ROOM (club-scoped)
    // -------------------------------------------------------------------------
    // Each user joins a room named after their user ID and club
    // This allows us to send messages directly to them within the club context
    // -------------------------------------------------------------------------

    socket.join(user._id.toString());
    socket.join(`${clubId}:${user._id}`); // Club-scoped user room

    // Track online status (club-scoped)
    const userClubKey = `${clubId}:${user._id}`;
    if (!onlineUsers.has(userClubKey)) {
      onlineUsers.set(userClubKey, new Set());
    }
    onlineUsers.get(userClubKey).add(socket.id);

    // Broadcast online status to club members
    socket.to(`club:${clubId}`).emit('user:online', {
      userId: user._id,
      username: user.username,
      clubId,
    });

    // Join club room for broadcasts
    socket.join(`club:${clubId}`);

    // -------------------------------------------------------------------------
    // SEND MESSAGE
    // -------------------------------------------------------------------------
    // Client sends: { recipientId, content, file?, replyTo? }
    // Server saves to DB and forwards to recipient
    // -------------------------------------------------------------------------

    socket.on('message:send', async (data, callback) => {
      try {
        const { recipientId, content, file, replyTo } = data;

        // Validate - need either content or file
        if (!recipientId) {
          return callback?.({ error: 'Recipient is required' });
        }
        if (!content?.trim() && !file) {
          return callback?.({ error: 'Message content or file is required' });
        }

        // Verify recipient exists and is in the same club
        const recipient = await User.findOne({
          _id: recipientId,
          'clubMemberships.club': clubId,
          'clubMemberships.isActive': true,
        });
        if (!recipient) {
          return callback?.({ error: 'Recipient not found in this club' });
        }

        // Check if sender is blocked by recipient (club-scoped)
        if (recipient.hasBlocked(user._id, clubId)) {
          return callback?.({ error: 'Cannot send message to this user' });
        }

        // Check if sender has blocked recipient (club-scoped)
        if (user.hasBlocked(recipientId, clubId)) {
          return callback?.({ error: 'You have blocked this user' });
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

        // Generate conversation ID (now includes clubId)
        const conversationId = Message.getDMConversationId(user._id, recipientId, clubId);

        // Validate replyTo if provided
        let replyToMessage = null;
        if (replyTo) {
          replyToMessage = await Message.findById(replyTo)
            .populate('sender', 'username displayName');
          if (!replyToMessage || replyToMessage.conversationId !== conversationId) {
            return callback?.({ error: 'Invalid reply target' });
          }
        }

        // Determine message type
        let messageType = 'text';
        if (file) {
          messageType = file.mimeType.startsWith('image/') ? 'image' : 'file';
        }

        // Create message (now includes club)
        const message = await Message.create({
          sender: user._id,
          recipient: recipientId,
          club: clubId,
          conversationId,
          content: content?.trim() || '',
          messageType,
          file: file ? {
            url: file.url,
            name: file.name,
            size: file.size,
            mimeType: file.mimeType,
          } : undefined,
          replyTo: replyTo || null,
          readBy: [{ user: user._id, readAt: new Date() }], // Sender has read it
        });

        // Populate sender info for the response
        await message.populate('sender', 'username displayName avatar');

        const messageData = {
          _id: message._id.toString(), // Ensure string for consistency
          sender: message.sender,
          recipient: message.recipient,
          club: clubId,
          conversationId: message.conversationId,
          content: message.content,
          messageType: message.messageType,
          file: message.file,
          replyTo: replyToMessage ? {
            _id: replyToMessage._id.toString(),
            content: replyToMessage.content,
            sender: replyToMessage.sender,
            messageType: replyToMessage.messageType,
          } : null,
          createdAt: message.createdAt,
        };

        // Send to recipient (if online in this club) - blocking already checked above
        io.to(`${clubId}:${recipientId}`).emit('message:receive', messageData);

        // Send back to sender for confirmation
        callback?.({ success: true, message: messageData });

        // Fetch link preview asynchronously (don't block the message send)
        if (content?.trim() && messageType === 'text') {
          const msgId = message._id.toString();

          getLinkPreviewForText(content).then(async (linkPreview) => {
            if (linkPreview) {
              await Message.findByIdAndUpdate(message._id, { linkPreview });

              const previewData = { messageId: msgId, linkPreview };
              io.to(`${clubId}:${recipientId}`).emit('message:linkPreview', previewData);
              io.to(`${clubId}:${user._id}`).emit('message:linkPreview', previewData);
            }
          }).catch(() => {});
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
        userId: user._id,
        username: user.username,
      });
    });

    socket.on('typing:stop', ({ recipientId }) => {
      io.to(recipientId).emit('typing:stop', {
        userId: user._id,
      });
    });

    // -------------------------------------------------------------------------
    // MARK MESSAGES AS READ
    // -------------------------------------------------------------------------
    // When user opens a conversation, mark messages as read
    // -------------------------------------------------------------------------

    socket.on('messages:read', async ({ userId }) => {
      try {
        const conversationId = Message.getDMConversationId(user._id, userId, clubId);

        // Batch mark all unread messages as read in a single DB operation
        await Message.updateMany(
          {
            club: clubId,
            conversationId,
            sender: userId,
            'readBy.user': { $ne: user._id },
          },
          {
            $push: { readBy: { user: user._id, readAt: new Date() } },
          }
        );

        // Notify the other user that their messages were read (club-scoped)
        io.to(`${clubId}:${userId}`).emit('messages:read', {
          userId: user._id,
          conversationId,
          clubId,
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
        // Only join groups in the current club
        const groups = await Group.find({
          club: clubId,
          'members.user': user._id,
          isActive: true
        });
        for (const group of groups) {
          socket.join(`group:${group._id}`);
          console.log(`[Socket] ${user.username} joined group room: ${group.name} (club: ${clubId})`);
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
    // Client sends: { groupId, content, file?, replyTo? }
    // Server saves to DB and broadcasts to all group members
    // -------------------------------------------------------------------------

    socket.on('group:message:send', async (data, callback) => {
      try {
        const { groupId, content, file, replyTo } = data;

        // Validate - need either content or file
        if (!groupId) {
          return callback?.({ error: 'Group ID is required' });
        }
        if (!content?.trim() && !file) {
          return callback?.({ error: 'Message content or file is required' });
        }

        // Verify group exists, is in the current club, and user is a member
        const group = await Group.findById(groupId);
        if (!group) {
          return callback?.({ error: 'Group not found' });
        }
        if (group.club.toString() !== clubId.toString()) {
          return callback?.({ error: 'Group not found in this club' });
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

        // Create message with group conversation ID
        const conversationId = `group:${groupId}`;

        // Validate replyTo if provided
        let replyToMessage = null;
        if (replyTo) {
          replyToMessage = await Message.findById(replyTo)
            .populate('sender', 'username displayName');
          if (!replyToMessage || replyToMessage.conversationId !== conversationId) {
            return callback?.({ error: 'Invalid reply target' });
          }
        }

        // Determine message type
        let messageType = 'text';
        if (file) {
          messageType = file.mimeType.startsWith('image/') ? 'image' : 'file';
        }

        // Create message (now includes club)
        const message = await Message.create({
          sender: user._id,
          group: groupId,
          club: clubId,
          conversationId,
          content: content?.trim() || '',
          messageType,
          file: file ? {
            url: file.url,
            name: file.name,
            size: file.size,
            mimeType: file.mimeType,
          } : undefined,
          replyTo: replyTo || null,
          readBy: [{ user: user._id, readAt: new Date() }],
        });

        // Populate sender info
        await message.populate('sender', 'username displayName avatar');

        const messageData = {
          _id: message._id.toString(), // Ensure string for consistency
          sender: message.sender,
          group: { _id: groupId, name: group.name },
          club: clubId,
          conversationId: message.conversationId,
          content: message.content,
          messageType: message.messageType,
          file: message.file,
          replyTo: replyToMessage ? {
            _id: replyToMessage._id.toString(),
            content: replyToMessage.content,
            sender: replyToMessage.sender,
            messageType: replyToMessage.messageType,
          } : null,
          createdAt: message.createdAt,
        };

        // Broadcast to all group members
        io.to(`group:${groupId}`).emit('group:message:receive', messageData);

        // Send confirmation to sender
        callback?.({ success: true, message: messageData });

        // Fetch link preview asynchronously (don't block the message send)
        if (content?.trim() && messageType === 'text') {
          getLinkPreviewForText(content).then(async (linkPreview) => {
            if (linkPreview) {
              await Message.findByIdAndUpdate(message._id, { linkPreview });
              io.to(`group:${groupId}`).emit('message:linkPreview', {
                messageId: message._id.toString(),
                linkPreview,
              });
            }
          }).catch(() => {});
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

        // Verify message belongs to current club
        if (!message.club || message.club.toString() !== clubId.toString()) {
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

        // Broadcast to appropriate recipients (club-scoped)
        if (message.group) {
          // Send to all group members
          io.to(`group:${message.group}`).emit('reaction:updated', reactionData);
        } else {
          // Send to both DM participants (club-scoped)
          io.to(`${clubId}:${message.sender}`).emit('reaction:updated', reactionData);
          io.to(`${clubId}:${message.recipient}`).emit('reaction:updated', reactionData);
        }

        callback?.({ success: true, reactions: updatedMessage.reactions });

      } catch (error) {
        console.error('[Socket] Reaction toggle error:', error);
        callback?.({ error: 'Failed to toggle reaction' });
      }
    });

    // -------------------------------------------------------------------------
    // EDIT MESSAGE
    // -------------------------------------------------------------------------
    // Allow users to edit their own messages
    // -------------------------------------------------------------------------

    socket.on('message:edit', async (data, callback) => {
      try {
        const { messageId, content } = data;

        if (!messageId || !content?.trim()) {
          return callback?.({ error: 'Message ID and content are required' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
          return callback?.({ error: 'Message not found' });
        }

        // Verify message belongs to current club
        if (!message.club || message.club.toString() !== clubId.toString()) {
          return callback?.({ error: 'Message not found' });
        }

        // Only the sender can edit their own messages
        if (message.sender.toString() !== user._id.toString()) {
          return callback?.({ error: 'You can only edit your own messages' });
        }

        // Can't edit deleted messages
        if (message.deleted) {
          return callback?.({ error: 'Cannot edit a deleted message' });
        }

        // Update the message
        message.content = content.trim();
        message.editedAt = new Date();
        await message.save();

        // Prepare the update data
        const editData = {
          messageId: message._id.toString(),
          content: message.content,
          editedAt: message.editedAt,
        };

        // Broadcast to appropriate recipients (club-scoped)
        if (message.group) {
          io.to(`group:${message.group}`).emit('message:edited', editData);
        } else {
          io.to(`${clubId}:${message.sender}`).emit('message:edited', editData);
          io.to(`${clubId}:${message.recipient}`).emit('message:edited', editData);
        }

        callback?.({ success: true, message: editData });
      } catch (error) {
        console.error('[Socket] Message edit error:', error);
        callback?.({ error: 'Failed to edit message' });
      }
    });

    // -------------------------------------------------------------------------
    // DELETE MESSAGE
    // -------------------------------------------------------------------------
    // Allow users to delete their own messages (soft delete)
    // -------------------------------------------------------------------------

    socket.on('message:delete', async (data, callback) => {
      try {
        const { messageId } = data;

        if (!messageId) {
          return callback?.({ error: 'Message ID is required' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
          return callback?.({ error: 'Message not found' });
        }

        // Verify message belongs to current club
        if (!message.club || message.club.toString() !== clubId.toString()) {
          return callback?.({ error: 'Message not found' });
        }

        // Only the sender can delete their own messages
        if (message.sender.toString() !== user._id.toString()) {
          return callback?.({ error: 'You can only delete your own messages' });
        }

        // Already deleted
        if (message.deleted) {
          return callback?.({ error: 'Message already deleted' });
        }

        // Soft delete the message
        message.deleted = true;
        await message.save();

        // Prepare the delete data
        const deleteData = {
          messageId: message._id.toString(),
        };

        // Broadcast to appropriate recipients (club-scoped)
        if (message.group) {
          io.to(`group:${message.group}`).emit('message:deleted', deleteData);
        } else {
          io.to(`${clubId}:${message.sender}`).emit('message:deleted', deleteData);
          io.to(`${clubId}:${message.recipient}`).emit('message:deleted', deleteData);
        }

        callback?.({ success: true });
      } catch (error) {
        console.error('[Socket] Message delete error:', error);
        callback?.({ error: 'Failed to delete message' });
      }
    });

    // -------------------------------------------------------------------------
    // DISCONNECT
    // -------------------------------------------------------------------------

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${user.username} from club ${clubId} (${reason})`);

      // Remove from online users (club-scoped)
      const userClubKey = `${clubId}:${user._id}`;
      const userSockets = onlineUsers.get(userClubKey);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userClubKey);

          // Broadcast offline status to club members
          socket.to(`club:${clubId}`).emit('user:offline', {
            userId: user._id,
            clubId,
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

// Check if a user is online in a specific club
export const isUserOnline = (userId, clubId) => {
  const userClubKey = `${clubId}:${userId}`;
  return onlineUsers.has(userClubKey) && onlineUsers.get(userClubKey).size > 0;
};

// Get all online user IDs in a specific club
export const getOnlineUserIds = (clubId) => {
  const onlineInClub = [];
  for (const key of onlineUsers.keys()) {
    if (key.startsWith(`${clubId}:`)) {
      const userId = key.split(':')[1];
      onlineInClub.push(userId);
    }
  }
  return onlineInClub;
};
