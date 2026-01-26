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
import { useNotifications } from '../../context/NotificationContext';
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
// REPLY PREVIEW (shown in message bubble when replying to another message)
// =============================================================================

function ReplyPreview({ replyTo, isOwnMessage }) {
  if (!replyTo) return null;

  const senderName = replyTo.sender?.displayName || replyTo.sender?.username || 'Unknown';
  const previewText = replyTo.messageType === 'text'
    ? (replyTo.content?.slice(0, 100) + (replyTo.content?.length > 100 ? '...' : ''))
    : replyTo.messageType === 'image'
      ? '📷 Image'
      : '📎 File';

  return (
    <div className={`mb-2 pl-3 border-l-2 ${
      isOwnMessage
        ? 'border-white/50'
        : 'border-[var(--color-primary)]'
    }`}>
      <p className={`text-xs font-medium ${
        isOwnMessage ? 'text-white/80' : 'text-[var(--color-primary)]'
      }`}>
        {senderName}
      </p>
      <p className={`text-xs truncate ${
        isOwnMessage ? 'text-white/60' : 'text-[var(--color-text-secondary)]'
      }`}>
        {previewText}
      </p>
    </div>
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

function MessageBubble({ message, isOwnMessage, showAvatar, currentUserId, onToggleReaction, onEditMessage, onDeleteMessage, onReply, isHighlighted, messageRef }) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
  // Allow editing text messages that have content and no file attachment
  const canEdit = isOwnMessage && !hasFile && !!hasContent;
  // Allow deleting own messages
  const canDelete = isOwnMessage;

  const handleDelete = () => {
    onDeleteMessage(message._id);
    setShowDeleteConfirm(false);
  };

  if (isOwnMessage) {
    return (
      <div
        ref={messageRef}
        className={`flex justify-end mb-3 group transition-all duration-300 ${isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30 -mx-2 px-2 py-1 rounded-lg' : ''}`}
        onMouseLeave={() => {
          setShowEmojiPicker(false);
          setShowDeleteConfirm(false);
        }}
      >
        <div className="max-w-[70%]">
          <div className="flex items-center gap-2 justify-end mb-1">
            {/* Action buttons - appear on hover via CSS */}
            {!isEditing && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                {canDelete && (
                  <div className="relative">
                    <button
                      onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-red-100 hover:border-red-300 hover:text-red-600 text-xs transition-colors"
                      title="Delete message"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    {showDeleteConfirm && (
                      <div className="absolute right-0 top-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg p-2 z-50 whitespace-nowrap">
                        <p className="text-xs text-[var(--color-text-secondary)] mb-2">Delete message?</p>
                        <div className="flex gap-1">
                          <button
                            onClick={handleDelete}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-2 py-1 text-xs bg-[var(--color-surface-hover)] rounded hover:bg-[var(--color-border)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="relative">
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
                <button
                  onClick={() => onReply(message)}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-xs transition-colors"
                  title="Reply"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
              </div>
            )}
            {isEdited && (
              <span className="text-xs text-[var(--color-text-tertiary)] italic">edited</span>
            )}
            <span className="text-xs text-[var(--color-text-tertiary)]">{time}</span>
          </div>
          <div className="bg-[var(--color-primary)] text-white rounded-lg px-4 py-2">
            {message.replyTo && (
              <ReplyPreview replyTo={message.replyTo} isOwnMessage={true} />
            )}
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
      ref={messageRef}
      className={`flex gap-3 mb-3 group transition-all duration-300 ${isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30 -mx-2 px-2 py-1 rounded-lg' : ''}`}
      onMouseLeave={() => setShowEmojiPicker(false)}
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
            {message.replyTo && (
              <ReplyPreview replyTo={message.replyTo} isOwnMessage={false} />
            )}
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
          {/* Action buttons */}
          <div className="absolute -right-16 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <button
              onClick={() => onReply(message)}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-xs transition-colors"
              title="Reply"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
          </div>
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
  const { socket, sendMessage, sendGroupMessage, subscribe, isConnected, markAsRead, startTyping, stopTyping, toggleReaction, editMessage, deleteMessage, isUserOnline } = useSocket();
  const { updateMutedUser } = useNotifications();

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
  const [replyingTo, setReplyingTo] = useState(null);      // Message being replied to

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  // Block/mute state
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesRef = useRef(messages); // Keep ref to current messages for fallback
  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const messageRefs = useRef({}); // To store refs for each message for scrolling
  const markAsReadRef = useRef(markAsRead); // Stable ref to avoid re-fetching messages

  // Keep refs updated
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    markAsReadRef.current = markAsRead;
  }, [markAsRead]);

  // ---------------------------------------------------------------------------
  // SCROLL TO BOTTOM
  // ---------------------------------------------------------------------------

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ---------------------------------------------------------------------------
  // SEARCH FUNCTIONS
  // ---------------------------------------------------------------------------

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      setHighlightedMessageId(null);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Build conversation ID for searching within this conversation
        let convId;
        if (isGroupChat) {
          convId = `group:${groupId}`;
        } else {
          // DM conversation IDs are sorted user IDs joined by colon
          const sortedIds = [currentUser._id, userId].sort();
          convId = sortedIds.join(':');
        }

        const response = await messageAPI.search(query, convId);
        const results = response.data.data.messages;
        setSearchResults(results);
        setCurrentSearchIndex(0);

        if (results.length > 0) {
          scrollToMessage(results[0]._id);
        } else {
          setHighlightedMessageId(null);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const scrollToMessage = (messageId) => {
    setHighlightedMessageId(messageId);
    const messageEl = messageRefs.current[messageId];
    if (messageEl) {
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Clear highlight after 2 seconds
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 2000);
  };

  const navigateSearch = (direction) => {
    if (searchResults.length === 0) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    }

    setCurrentSearchIndex(newIndex);
    scrollToMessage(searchResults[newIndex]._id);
  };

  const closeSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
    setHighlightedMessageId(null);
  };

  // Focus search input when search opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

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

          const userData = userResponse.data.data.user;
          setOtherUser(userData);
          setMessages(messagesResponse.data.data.messages);
          setIsBlocked(userData.isBlocked || false);
          setIsMuted(userData.isMuted || false);

          // Mark messages as read for DMs (use ref to avoid re-fetching on markAsRead change)
          markAsReadRef.current?.(userId);
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
  }, [conversationId, isGroupChat, userId, groupId]);

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

    // Listen for message deletions
    unsubscribers.push(
      subscribe('message:deleted', ({ messageId }) => {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
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

  // ---------------------------------------------------------------------------
  // BLOCK/MUTE HANDLERS
  // ---------------------------------------------------------------------------

  const handleBlockToggle = async () => {
    if (!otherUser) return;
    try {
      if (isBlocked) {
        await userAPI.unblock(otherUser._id);
        setIsBlocked(false);
      } else {
        await userAPI.block(otherUser._id);
        setIsBlocked(true);
      }
      setShowUserMenu(false);
    } catch (err) {
      console.error('Failed to toggle block:', err);
    }
  };

  const handleMuteToggle = async () => {
    if (!otherUser) return;
    try {
      if (isMuted) {
        await userAPI.unmute(otherUser._id);
        setIsMuted(false);
        updateMutedUser(otherUser._id, false);
      } else {
        await userAPI.mute(otherUser._id);
        setIsMuted(true);
        updateMutedUser(otherUser._id, true);
      }
      setShowUserMenu(false);
    } catch (err) {
      console.error('Failed to toggle mute:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();

    const content = newMessage.trim();
    // Need either content or file
    if ((!content && !selectedFile) || isSending || !isConnected) return;

    try {
      setIsSending(true);
      const replyToId = replyingTo?._id || null;

      if (isGroupChat) {
        // Stop typing indicator
        socket?.emit('group:typing:stop', { groupId });

        // Send group message via socket with file and reply support
        const message = await sendGroupMessage(groupId, content, selectedFile, replyToId);
        // Note: The message will be added via the group:message:receive event

        // If message contains URL, schedule fallback fetch
        if (content && containsUrl(content)) {
          fetchLinkPreviewForMessage(message._id);
        }
      } else {
        // Stop typing indicator
        stopTyping(userId);

        // Send DM via socket with file and reply support
        console.log('[DEBUG] Sending message to:', userId);
        const message = await sendMessage(userId, content, selectedFile, replyToId);
        console.log('[DEBUG] Message returned from server:', message);

        // Add to local state for DM
        console.log('[DEBUG] Adding message to state');
        setMessages(prev => {
          console.log('[DEBUG] Previous messages count:', prev.length);
          const newMessages = [...prev, message];
          console.log('[DEBUG] New messages count:', newMessages.length);
          return newMessages;
        });

        // If message contains URL, schedule fallback fetch
        if (content && containsUrl(content)) {
          fetchLinkPreviewForMessage(message._id);
        }
      }

      setNewMessage('');
      clearSelectedFile();
      setReplyingTo(null);
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
  // HANDLE DELETE MESSAGE
  // ---------------------------------------------------------------------------

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId);
      // The delete update will come through the socket event
    } catch (err) {
      console.error('Failed to delete message:', err);
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
      <div className="h-16 px-4 flex items-center justify-between border-b border-[var(--color-border)] flex-shrink-0">
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
            <div className="relative">
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
              {/* Online indicator */}
              {otherUser && isUserOnline(otherUser._id) && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--color-bg)]" />
              )}
            </div>
          )}
          <div>
            <h2 className="font-semibold">{displayName}</h2>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              {typingText ? typingText : (
                isGroupChat
                  ? `${memberCount} members`
                  : (otherUser && isUserOnline(otherUser._id) ? 'Online' : 'Offline')
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Muted indicator */}
          {!isGroupChat && isMuted && (
            <span className="px-2 py-1 text-xs bg-yellow-500 bg-opacity-20 text-yellow-600 dark:text-yellow-400 rounded">
              Muted
            </span>
          )}
          {/* Search button */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg transition-colors ${
              showSearch
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
            }`}
            title="Search messages"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          {/* User menu for DMs */}
          {!isGroupChat && otherUser && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
                title="More options"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              {/* Dropdown menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 py-1">
                    <button
                      onClick={handleMuteToggle}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-2"
                    >
                      {isMuted ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                          Unmute
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                          Mute
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleBlockToggle}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-2 ${
                        isBlocked ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {isBlocked ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Unblock
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          Block
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search in conversation..."
                className="w-full pl-10 pr-4 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="small" />
                </div>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-[var(--color-text-secondary)] min-w-[60px] text-center">
                  {currentSearchIndex + 1} / {searchResults.length}
                </span>
                <button
                  onClick={() => navigateSearch('prev')}
                  className="p-2 hover:bg-[var(--color-surface-hover)] rounded transition-colors"
                  title="Previous result"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => navigateSearch('next')}
                  className="p-2 hover:bg-[var(--color-surface-hover)] rounded transition-colors"
                  title="Next result"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
            <button
              onClick={closeSearch}
              className="p-2 hover:bg-[var(--color-surface-hover)] rounded transition-colors"
              title="Close search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
            <p className="text-sm text-[var(--color-text-tertiary)] mt-2">No messages found</p>
          )}
        </div>
      )}

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
                  onDeleteMessage={handleDeleteMessage}
                  onReply={setReplyingTo}
                  isHighlighted={highlightedMessageId === message._id}
                  messageRef={(el) => { messageRefs.current[message._id] = el; }}
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

      {/* Reply preview */}
      {replyingTo && (
        <div className="px-4 pt-3 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-lg border-l-4 border-[var(--color-primary)]">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--color-primary)] font-medium">
                Replying to {replyingTo.sender?.displayName || replyingTo.sender?.username}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] truncate">
                {replyingTo.messageType === 'text'
                  ? replyingTo.content
                  : replyingTo.messageType === 'image'
                    ? '📷 Image'
                    : '📎 File'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-2 hover:bg-[var(--color-surface-hover)] rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
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
      <div className={`p-4 ${selectedFile || replyingTo ? '' : 'border-t border-[var(--color-border)]'} flex-shrink-0`}>
        {/* Blocked state */}
        {!isGroupChat && isBlocked ? (
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20 rounded-lg text-red-600 dark:text-red-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <span>You have blocked this user.</span>
            <button
              onClick={handleBlockToggle}
              className="ml-2 underline hover:no-underline"
            >
              Unblock
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}

export default ConversationView;
