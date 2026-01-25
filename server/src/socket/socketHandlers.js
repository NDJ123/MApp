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
        const { recipientId, content } = data;

        // Validate
        if (!recipientId || !content?.trim()) {
          return callback?.({ error: 'Recipient and content are required' });
        }

        // Verify recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
          return callback?.({ error: 'Recipient not found' });
        }

        // Generate conversation ID
        const conversationId = Message.getDMConversationId(user._id, recipientId);

        // Create message
        const message = await Message.create({
          sender: user._id,
          recipient: recipientId,
          conversationId,
          content: content.trim(),
          messageType: 'text',
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
          createdAt: message.createdAt,
        };

        // Send to recipient (if online)
        io.to(recipientId.toString()).emit('message:receive', messageData);

        // Send back to sender for confirmation
        callback?.({ success: true, message: messageData });

        console.log(`[Socket] Message from ${user.username} to ${recipient.username}`);
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
