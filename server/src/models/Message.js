// =============================================================================
// MESSAGE MODEL
// =============================================================================
// Stores chat messages between users. Supports both direct messages (DMs)
// and group messages.
//
// Schema Design:
// - sender: who sent the message
// - recipient: for DMs, the user receiving the message
// - conversationId: groups messages into conversations for efficient querying
// - content: the message text
// - messageType: text, image, file, etc.
// - readBy: tracks who has read the message
// =============================================================================

import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    // Who sent the message
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Message must have a sender'],
    },

    // For direct messages: who receives it
    // For group messages: this will be null
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Conversation identifier - makes it easy to fetch all messages in a conversation
    // For DMs: sorted concatenation of both user IDs (ensures same ID regardless of who sends)
    // For groups: the group ID
    conversationId: {
      type: String,
      required: true,
      index: true,
    },

    // The actual message content
    content: {
      type: String,
      required: [true, 'Message cannot be empty'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },

    // Type of message
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
    },

    // Track who has read this message
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    }],

    // Soft delete - don't actually remove messages
    deleted: {
      type: Boolean,
      default: false,
    },

    // Optional: for replies/threads
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// =============================================================================
// INDEXES
// =============================================================================
// Indexes speed up queries. We frequently query by conversationId + createdAt.
// =============================================================================

// Compound index for fetching conversation messages in order
messageSchema.index({ conversationId: 1, createdAt: -1 });

// Index for finding unread messages for a user
messageSchema.index({ recipient: 1, 'readBy.user': 1 });

// =============================================================================
// STATIC METHODS
// =============================================================================
// Helper functions attached to the model itself
// =============================================================================

// Generate a consistent conversation ID for DMs between two users
// Always sorts the IDs so the same conversation ID is generated regardless
// of who initiates the conversation
messageSchema.statics.getDMConversationId = function(userId1, userId2) {
  const ids = [userId1.toString(), userId2.toString()].sort();
  return `dm_${ids[0]}_${ids[1]}`;
};

// =============================================================================
// INSTANCE METHODS
// =============================================================================

// Mark message as read by a user
messageSchema.methods.markAsRead = function(userId) {
  const alreadyRead = this.readBy.some(
    read => read.user.toString() === userId.toString()
  );

  if (!alreadyRead) {
    this.readBy.push({ user: userId, readAt: new Date() });
  }

  return this.save();
};

// =============================================================================
// EXPORT
// =============================================================================

const Message = mongoose.model('Message', messageSchema);

export default Message;
