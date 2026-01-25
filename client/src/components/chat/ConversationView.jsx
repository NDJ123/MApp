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
// MESSAGE BUBBLE COMPONENT
// =============================================================================

function MessageBubble({ message, isOwnMessage, showAvatar }) {
  const initial = (message.sender?.displayName || message.sender?.username || '?')[0].toUpperCase();
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isOwnMessage) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[70%]">
          <div className="flex items-baseline gap-2 justify-end mb-1">
            <span className="text-xs text-[var(--color-text-tertiary)]">{time}</span>
          </div>
          <div className="bg-[var(--color-primary)] text-white rounded-lg px-4 py-2">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-3">
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
          </div>
        )}
        <div className="bg-[var(--color-surface)] rounded-lg px-4 py-2">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
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
  const { socket, sendMessage, subscribe, isConnected, markAsRead, startTyping, stopTyping } = useSocket();

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

  // Refs
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [conversationId, isGroupChat, userId, groupId, subscribe, markAsRead, currentUser._id]);

  // ---------------------------------------------------------------------------
  // HANDLE SEND MESSAGE
  // ---------------------------------------------------------------------------

  const handleSendMessage = async (e) => {
    e?.preventDefault();

    const content = newMessage.trim();
    if (!content || isSending || !isConnected) return;

    try {
      setIsSending(true);

      if (isGroupChat) {
        // Stop typing indicator
        socket?.emit('group:typing:stop', { groupId });

        // Send group message via socket
        socket?.emit('group:message:send', { groupId, content }, (response) => {
          if (response.error) {
            console.error('Failed to send group message:', response.error);
            setError('Failed to send message. Please try again.');
          }
          // Note: The message will be added via the group:message:receive event
        });
      } else {
        // Stop typing indicator
        stopTyping(userId);

        // Send DM via socket
        const message = await sendMessage(userId, content);

        // Add to local state for DM
        setMessages(prev => [...prev, message]);
      }

      setNewMessage('');
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

      {/* Message input */}
      <div className="p-4 border-t border-[var(--color-border)] flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
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
            disabled={!newMessage.trim() || !isConnected || isSending}
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
