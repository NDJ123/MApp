// =============================================================================
// CONVERSATION VIEW COMPONENT
// =============================================================================
// Displays a conversation (DM or Group) with real-time messaging.
//
// Features:
// - Load message history from API
// - Send messages via Socket.io
// - Receive messages in real-time
// - Typing indicators
// - Auto-scroll to new messages
// - Supports both DM and Group conversations
// =============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { messageAPI, userAPI, groupAPI } from '../../services/api';
import Spinner from '../common/Spinner';

// =============================================================================
// COMMON EMOJIS FOR REACTIONS
// =============================================================================

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

// =============================================================================
// EMOJI PICKER COMPONENT
// =============================================================================

function EmojiPicker({ onSelect, onClose }) {
  return (
    <div className="absolute bottom-full mb-2 left-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg p-2 z-50">
      <div className="flex gap-1">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-surface-hover)] rounded text-lg transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// REACTIONS DISPLAY COMPONENT
// =============================================================================

function ReactionsDisplay({ reactions, currentUserId, onReactionClick }) {
  if (!reactions || reactions.length === 0) return null;

  // Group reactions by emoji
  const grouped = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {});

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, users]) => {
        const hasUserReacted = users.some(
          r => r.user?._id === currentUserId || r.user === currentUserId
        );
        return (
          <button
            key={emoji}
            onClick={() => onReactionClick(emoji)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors ${
              hasUserReacted
                ? 'bg-[var(--color-primary)] bg-opacity-20 border-[var(--color-primary)]'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'
            }`}
            title={users.map(r => r.user?.displayName || r.user?.username).join(', ')}
          >
            <span>{emoji}</span>
            <span className="text-xs">{users.length}</span>
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// LINK PREVIEW COMPONENT
// =============================================================================

function LinkPreview({ preview, isOwnMessage }) {
  if (!preview || !preview.url) return null;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block mt-2 rounded-lg overflow-hidden border ${
        isOwnMessage
          ? 'bg-white/10 border-white/20 hover:bg-white/20'
          : 'bg-[var(--color-surface-hover)] border-[var(--color-border)] hover:bg-[var(--color-surface)]'
      } transition-colors`}
    >
      {preview.image && (
        <div className="w-full h-32 overflow-hidden">
          <img
            src={preview.image}
            alt={preview.title || 'Link preview'}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {preview.favicon && (
            <img
              src={preview.favicon}
              alt=""
              className="w-4 h-4"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <span className={`text-xs ${isOwnMessage ? 'text-white/60' : 'text-[var(--color-text-tertiary)]'}`}>
            {preview.siteName || new URL(preview.url).hostname}
          </span>
        </div>
        {preview.title && (
          <p className={`font-medium text-sm line-clamp-2 ${isOwnMessage ? 'text-white' : ''}`}>
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className={`text-xs mt-1 line-clamp-2 ${isOwnMessage ? 'text-white/70' : 'text-[var(--color-text-secondary)]'}`}>
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}

// =============================================================================
// FILE ATTACHMENT DISPLAY
// =============================================================================

function FileAttachment({ file, isOwnMessage }) {
  const isImage = file.mimeType?.startsWith('image/');

  // Format file size
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isImage) {
    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={file.url}
          alt={file.name}
          className="max-w-full max-h-64 rounded-lg object-contain"
        />
      </a>
    );
  }

  // Non-image file
  return (
    <a
      href={file.url}
      download={file.name}
      className={`flex items-center gap-3 p-3 rounded-lg border ${
        isOwnMessage
          ? 'bg-white/10 border-white/20 hover:bg-white/20'
          : 'bg-[var(--color-surface-hover)] border-[var(--color-border)] hover:bg-[var(--color-surface)]'
      } transition-colors`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        isOwnMessage ? 'bg-white/20' : 'bg-[var(--color-primary)] bg-opacity-20'
      }`}>
        <svg className={`w-5 h-5 ${isOwnMessage ? 'text-white' : 'text-[var(--color-primary)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{file.name}</p>
        <p className={`text-xs ${isOwnMessage ? 'text-white/70' : 'text-[var(--color-text-tertiary)]'}`}>
          {formatSize(file.size)}
        </p>
      </div>
      <svg className={`w-5 h-5 ${isOwnMessage ? 'text-white/70' : 'text-[var(--color-text-tertiary)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </a>
  );
}

// =============================================================================
// MESSAGE BUBBLE COMPONENT
// =============================================================================

function MessageBubble({ message, isOwnMessage, showAvatar, currentUserId, onToggleReaction, onEditMessage }) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');

  const initial = (message.sender?.displayName || message.sender?.username || '?')[0].toUpperCase();
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleReactionClick = (emoji) => {
    onToggleReaction(message._id, emoji);
  };

  const handleEditSubmit = async () => {
    if (!editContent.trim() || editContent.trim() === message.content) {
      setIsEditing(false);
      setEditContent(message.content || '');
      return;
    }
    try {
      await onEditMessage(message._id, editContent.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content || '');
    }
  };

  const hasFile = message.file && message.file.url;
  const hasContent = message.content && message.content.trim();
  const hasLinkPreview = message.linkPreview && message.linkPreview.url;
  const isEdited = !!message.editedAt;
  // Default messageType to 'text' for backwards compatibility
  const messageType = message.messageType || 'text';
  const canEdit = isOwnMessage && messageType === 'text' && hasContent && !hasFile;

  if (isOwnMessage) {
    return (
      <div
        className="flex justify-end mb-3 relative"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => {
          setShowActions(false);
          setShowEmojiPicker(false);
        }}
      >
        <div className="max-w-[70%]">
          <div className="flex items-baseline gap-2 justify-end mb-1">
            {isEdited && (
              <span className="text-xs text-[var(--color-text-tertiary)] italic">edited</span>
            )}
            <span className="text-xs text-[var(--color-text-tertiary)]">{time}</span>
          </div>
          <div className="relative">
            <div className="bg-[var(--color-primary)] text-white rounded-lg px-4 py-2">
              {hasFile && (
                <div className={hasContent ? 'mb-2' : ''}>
                  <FileAttachment file={message.file} isOwnMessage={true} />
                </div>
              )}
              {isEditing ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    className="w-full bg-white/20 text-white rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-white/50"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2 text-xs">
                    <button
                      onClick={handleEditSubmit}
                      className="px-2 py-1 bg-white/20 rounded hover:bg-white/30"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditContent(message.content || '');
                      }}
                      className="px-2 py-1 bg-white/10 rounded hover:bg-white/20"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {hasContent && (
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  )}
                </>
              )}
              {hasLinkPreview && !isEditing && (
                <LinkPreview preview={message.linkPreview} isOwnMessage={true} />
              )}
            </div>
            {/* Action buttons */}
            {showActions && !isEditing && (
              <div className="absolute -left-16 top-1/2 -translate-y-1/2 flex gap-1">
                {canEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-xs transition-colors"
                    title="Edit message"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-sm transition-colors"
                >
                  😊
                </button>
                {showEmojiPicker && (
                  <EmojiPicker
                    onSelect={(emoji) => handleReactionClick(emoji)}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>
            )}
          </div>
          {/* Reactions display */}
          <div className="flex justify-end">
            <ReactionsDisplay
              reactions={message.reactions}
              currentUserId={currentUserId}
              onReactionClick={handleReactionClick}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex gap-3 mb-3"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
    >
      {showAvatar ? (
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex-shrink-0 flex items-center justify-center text-white text-sm font-medium">
          {message.sender?.avatar ? (
            <img
              src={message.sender.avatar}
              alt={message.sender.displayName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}
      <div className="max-w-[70%]">
        {showAvatar && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-medium text-sm">
              {message.sender?.displayName || message.sender?.username}
            </span>
            <span className="text-xs text-[var(--color-text-tertiary)]">{time}</span>
            {isEdited && (
              <span className="text-xs text-[var(--color-text-tertiary)] italic">edited</span>
            )}
          </div>
        )}
        <div className="relative">
          <div className="bg-[var(--color-surface)] rounded-lg px-4 py-2">
            {hasFile && (
              <div className={hasContent ? 'mb-2' : ''}>
                <FileAttachment file={message.file} isOwnMessage={false} />
              </div>
            )}
            {hasContent && (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )}
            {hasLinkPreview && (
              <LinkPreview preview={message.linkPreview} isOwnMessage={false} />
            )}
          </div>
          {/* Reaction button */}
          {showActions && (
            <div className="absolute -right-8 top-1/2 -translate-y-1/2">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-sm transition-colors"
              >
                😊
              </button>
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={(emoji) => handleReactionClick(emoji)}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </div>
          )}
        </div>
        {/* Reactions display */}
        <ReactionsDisplay
          reactions={message.reactions}
          currentUserId={currentUserId}
          onReactionClick={handleReactionClick}
        />
      </div>
    </div>
  );
}

// =============================================================================
// MAIN CONVERSATION VIEW COMPONENT
// =============================================================================

function ConversationView() {
  const { userId, groupId } = useParams();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const { socket, sendMessage, sendGroupMessage, subscribe, isConnected, markAsRead, startTyping, stopTyping, toggleReaction, editMessage } = useSocket();

  // Determine conversation type
  const isGroupChat = location.pathname.includes('/group/');
  const conversationId = isGroupChat ? groupId : userId;

  // State
  const [otherUser, setOtherUser] = useState(null);  // For DMs
  const [group, setGroup] = useState(null);          // For groups
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);  // For group: track multiple typing users
  const [selectedFile, setSelectedFile] = useState(null);  // For file uploads
  const [filePreview, setFilePreview] = useState(null);    // Preview URL for images

  // Refs
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesRef = useRef(messages); // Keep ref to current messages for fallback

  // Keep messagesRef updated
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ---------------------------------------------------------------------------
  // SCROLL TO BOTTOM
  // ---------------------------------------------------------------------------

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ---------------------------------------------------------------------------
  // FETCH CONVERSATION DATA
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setOtherUser(null);
        setGroup(null);

        if (isGroupChat) {
          // Fetch group info and messages
          const [groupResponse, messagesResponse] = await Promise.all([
            groupAPI.getById(groupId),
            messageAPI.getGroupMessages(groupId),
          ]);

          setGroup(groupResponse.data.data.group);
          setMessages(messagesResponse.data.data.messages);
        } else {
          // Fetch other user's info and DM message history
          const [userResponse, messagesResponse] = await Promise.all([
            userAPI.getById(userId),
            messageAPI.getDMMessages(userId),
          ]);

          setOtherUser(userResponse.data.data.user);
          setMessages(messagesResponse.data.data.messages);

          // Mark messages as read for DMs
          markAsRead(userId);
        }
      } catch (err) {
        setError(err.message || 'Failed to load conversation');
        console.error('Error loading conversation:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (conversationId) {
      fetchData();
    }
  }, [conversationId, isGroupChat, userId, groupId, markAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ---------------------------------------------------------------------------
  // SOCKET EVENT LISTENERS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribers = [];

    if (isGroupChat) {
      // Listen for incoming group messages
      unsubscribers.push(
        subscribe('group:message:receive', (message) => {
          // Only add if it's for this group
          if (message.group === groupId) {
            setMessages(prev => [...prev, message]);
          }
        })
      );

      // Group typing indicators
      unsubscribers.push(
        subscribe('group:typing:start', ({ groupId: typingGroupId, userId: typingUserId, username }) => {
          if (typingGroupId === groupId && typingUserId !== currentUser._id) {
            setTypingUsers(prev => {
              if (!prev.find(u => u.userId === typingUserId)) {
                return [...prev, { userId: typingUserId, username }];
              }
              return prev;
            });
          }
        })
      );

      unsubscribers.push(
        subscribe('group:typing:stop', ({ groupId: typingGroupId, userId: typingUserId }) => {
          if (typingGroupId === groupId) {
            setTypingUsers(prev => prev.filter(u => u.userId !== typingUserId));
          }
        })
      );
    } else {
      // Listen for incoming DM messages
      unsubscribers.push(
        subscribe('message:receive', (message) => {
          // Only add if it's from the user we're chatting with
          if (message.sender._id === userId || message.sender === userId) {
            setMessages(prev => [...prev, message]);
            markAsRead(userId);
          }
        })
      );

      // DM typing indicators
      unsubscribers.push(
        subscribe('typing:start', ({ userId: typingUserId }) => {
          if (typingUserId === userId) {
            setTypingUsers([{ userId: typingUserId }]);
          }
        })
      );

      unsubscribers.push(
        subscribe('typing:stop', ({ userId: typingUserId }) => {
          if (typingUserId === userId) {
            setTypingUsers([]);
          }
        })
      );
    }

    // Listen for reaction updates (both DM and group)
    unsubscribers.push(
      subscribe('reaction:updated', ({ messageId, reactions }) => {
        setMessages(prev => prev.map(msg =>
          msg._id === messageId ? { ...msg, reactions } : msg
        ));
      })
    );

    // Listen for link preview updates (socket fallback)
    unsubscribers.push(
      subscribe('message:linkPreview', ({ messageId, linkPreview }) => {
        setMessages(prev => prev.map(msg =>
          msg._id === messageId ? { ...msg, linkPreview } : msg
        ));
      })
    );

    // Listen for message edits
    unsubscribers.push(
      subscribe('message:edited', ({ messageId, content, editedAt }) => {
        setMessages(prev => prev.map(msg =>
          msg._id === messageId ? { ...msg, content, editedAt } : msg
        ));
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [conversationId, isGroupChat, userId, groupId, subscribe, markAsRead, currentUser._id]);

  // ---------------------------------------------------------------------------
  // FILE HANDLING
  // ---------------------------------------------------------------------------

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Create file reader to convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        url: reader.result,
        name: file.name,
        size: file.size,
        mimeType: file.type,
      });

      // Set preview for images
      if (file.type.startsWith('image/')) {
        setFilePreview(reader.result);
      } else {
        setFilePreview(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLE SEND MESSAGE
  // ---------------------------------------------------------------------------

  // Simple URL detection regex
  const containsUrl = (text) => {
    const urlRegex = /https?:\/\/[^\s]+/i;
    return urlRegex.test(text);
  };

  // Fetch link preview using direct API call
  const fetchLinkPreviewForMessage = (messageId, attempt = 1) => {
    const maxAttempts = 3;
    const delay = attempt * 2000; // 2s, 4s, 6s

    setTimeout(async () => {
      try {
        // Check if already has preview
        const currentMsg = messagesRef.current.find(m => String(m._id) === String(messageId));
        if (currentMsg?.linkPreview) return;

        const response = await messageAPI.fetchLinkPreview(messageId);
        const { linkPreview } = response.data.data;

        if (linkPreview) {
          setMessages(prev => prev.map(msg =>
            String(msg._id) === String(messageId) ? { ...msg, linkPreview } : msg
          ));
        } else if (attempt < maxAttempts) {
          fetchLinkPreviewForMessage(messageId, attempt + 1);
        }
      } catch (err) {
        if (attempt < maxAttempts) {
          fetchLinkPreviewForMessage(messageId, attempt + 1);
        }
      }
    }, delay);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();

    const content = newMessage.trim();
    // Need either content or file
    if ((!content && !selectedFile) || isSending || !isConnected) return;

    try {
      setIsSending(true);

      if (isGroupChat) {
        // Stop typing indicator
        socket?.emit('group:typing:stop', { groupId });

        // Send group message via socket with file support
        const message = await sendGroupMessage(groupId, content, selectedFile);
        // Note: The message will be added via the group:message:receive event

        // If message contains URL, schedule fallback fetch
        if (content && containsUrl(content)) {
          fetchLinkPreviewForMessage(message._id);
        }
      } else {
        // Stop typing indicator
        stopTyping(userId);

        // Send DM via socket with file support
        const message = await sendMessage(userId, content, selectedFile);

        // Add to local state for DM
        setMessages(prev => [...prev, message]);

        // If message contains URL, schedule fallback fetch
        if (content && containsUrl(content)) {
          fetchLinkPreviewForMessage(message._id);
        }
      }

      setNewMessage('');
      clearSelectedFile();
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLE TYPING
  // ---------------------------------------------------------------------------

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    // Send typing indicator based on conversation type
    if (isGroupChat) {
      socket?.emit('group:typing:start', { groupId });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit('group:typing:stop', { groupId });
      }, 2000);
    } else {
      startTyping(userId);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(userId);
      }, 2000);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLE KEY DOWN
  // ---------------------------------------------------------------------------

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLE REACTION TOGGLE
  // ---------------------------------------------------------------------------

  const handleToggleReaction = async (messageId, emoji) => {
    try {
      await toggleReaction(messageId, emoji);
      // The reaction update will come through the socket event
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLE EDIT MESSAGE
  // ---------------------------------------------------------------------------

  const handleEditMessage = async (messageId, content) => {
    try {
      await editMessage(messageId, content);
      // The edit update will come through the socket event
    } catch (err) {
      console.error('Failed to edit message:', err);
      throw err; // Re-throw so MessageBubble can handle it
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Error state
  if (error && !otherUser && !group) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-[var(--color-primary)] hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Get display info based on conversation type
  const displayName = isGroupChat
    ? group?.name
    : (otherUser?.displayName || otherUser?.username);
  const displayInitial = (displayName || '?')[0].toUpperCase();
  const avatarUrl = isGroupChat ? group?.avatar : otherUser?.avatar;
  const memberCount = isGroupChat ? group?.members?.length : null;

  // Get typing status text
  const getTypingText = () => {
    if (typingUsers.length === 0) return null;
    if (isGroupChat) {
      if (typingUsers.length === 1) {
        return `${typingUsers[0].username} is typing...`;
      }
      if (typingUsers.length === 2) {
        return `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`;
      }
      return `${typingUsers.length} people are typing...`;
    }
    return 'Typing...';
  };

  const typingText = getTypingText();

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="h-16 px-4 flex items-center border-b border-[var(--color-border)] flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Avatar/Icon */}
          {isGroupChat ? (
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)] bg-opacity-20 flex items-center justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-medium">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                displayInitial
              )}
            </div>
          )}
          <div>
            <h2 className="font-semibold">{displayName}</h2>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              {typingText ? typingText : (
                isGroupChat
                  ? `${memberCount} members`
                  : (isConnected ? 'Online' : 'Offline')
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-[var(--color-text-tertiary)]">
              <p>No messages yet</p>
              <p className="text-sm mt-1">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => {
              const isOwnMessage = message.sender._id === currentUser._id ||
                                   message.sender === currentUser._id;
              const prevMessage = messages[index - 1];
              const showAvatar = !isOwnMessage && (
                !prevMessage ||
                prevMessage.sender._id !== message.sender._id ||
                prevMessage.sender !== message.sender
              );

              return (
                <MessageBubble
                  key={message._id}
                  message={message}
                  isOwnMessage={isOwnMessage}
                  showAvatar={showAvatar}
                  currentUserId={currentUser._id}
                  onToggleReaction={handleToggleReaction}
                  onEditMessage={handleEditMessage}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Connection status warning */}
      {!isConnected && (
        <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm text-center">
          Connecting to server...
        </div>
      )}

      {/* File preview */}
      {selectedFile && (
        <div className="px-4 pt-3 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-lg">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded" />
            ) : (
              <div className="w-16 h-16 bg-[var(--color-primary)] bg-opacity-20 rounded flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{selectedFile.name}</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                {selectedFile.size < 1024 * 1024
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                  : `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`}
              </p>
            </div>
            <button
              type="button"
              onClick={clearSelectedFile}
              className="p-2 hover:bg-[var(--color-surface-hover)] rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Message input */}
      <div className={`p-4 ${selectedFile ? '' : 'border-t border-[var(--color-border)]'} flex-shrink-0`}>
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          {/* File upload button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isConnected || isSending}
            className="p-3 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] rounded-lg transition-colors disabled:opacity-50"
            title="Attach file"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <textarea
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            disabled={!isConnected || isSending}
            className="flex-1 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={(!newMessage.trim() && !selectedFile) || !isConnected || isSending}
            className="px-4 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Spinner size="small" />
            ) : (
              'Send'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ConversationView;
