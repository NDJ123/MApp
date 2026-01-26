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

    // For group messages: which group
    // For DMs: this will be null
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
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
      required: function() {
        // Content is required only for text messages
        return this.messageType === 'text';
      },
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
      default: '',
    },

    // Type of message
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
    },

    // File attachment (for image/file message types)
    file: {
      url: {
        type: String,  // Base64 data URL or external URL
      },
      name: {
        type: String,  // Original filename
      },
      size: {
        type: Number,  // File size in bytes
      },
      mimeType: {
        type: String,  // MIME type (e.g., 'image/jpeg', 'application/pdf')
      },
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

    // Reactions to this message (emoji reactions like Slack/Discord)
    reactions: [{
      emoji: {
        type: String,
        required: true,
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      createdAt: {
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

// Index for group messages
messageSchema.index({ group: 1, createdAt: -1 });

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

// Add a reaction to the message
messageSchema.methods.addReaction = function(userId, emoji) {
  // Check if user already reacted with this emoji
  const existingReaction = this.reactions.find(
    r => r.user.toString() === userId.toString() && r.emoji === emoji
  );

  if (existingReaction) {
    // User already reacted with this emoji - no change needed
    return this;
  }

  // Add the reaction
  this.reactions.push({ user: userId, emoji, createdAt: new Date() });
  return this.save();
};

// Remove a reaction from the message
messageSchema.methods.removeReaction = function(userId, emoji) {
  const reactionIndex = this.reactions.findIndex(
    r => r.user.toString() === userId.toString() && r.emoji === emoji
  );

  if (reactionIndex > -1) {
    this.reactions.splice(reactionIndex, 1);
    return this.save();
  }

  return this;
};

// Toggle a reaction (add if not exists, remove if exists)
messageSchema.methods.toggleReaction = function(userId, emoji) {
  const existingReaction = this.reactions.find(
    r => r.user.toString() === userId.toString() && r.emoji === emoji
  );

  if (existingReaction) {
    return this.removeReaction(userId, emoji);
  } else {
    return this.addReaction(userId, emoji);
  }
};

// =============================================================================
// EXPORT
// =============================================================================

const Message = mongoose.model('Message', messageSchema);

export default Message;
