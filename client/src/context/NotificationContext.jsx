// =============================================================================
// NOTIFICATION CONTEXT
// =============================================================================
// Manages desktop notifications for new messages.
//
// Features:
// - Requests browser notification permission
// - Shows desktop notifications for new messages
// - Only notifies when user isn't viewing that conversation
// - Click notification to navigate to conversation
// =============================================================================

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

// Create the context
const NotificationContext = createContext(null);

// =============================================================================
// NOTIFICATION PROVIDER
// =============================================================================

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { subscribe } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  // Notification permission state
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  // Track if notifications are enabled by user preference
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem('notificationsEnabled');
    return stored !== null ? stored === 'true' : true;
  });

  // Use ref to track current location without re-subscribing to socket events
  const locationRef = useRef(location.pathname);
  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  // ---------------------------------------------------------------------------
  // REQUEST PERMISSION
  // ---------------------------------------------------------------------------

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      console.warn('Notifications not supported in this browser');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      setPermission('granted');
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      setPermission('denied');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }, []);

  // ---------------------------------------------------------------------------
  // TOGGLE NOTIFICATIONS
  // ---------------------------------------------------------------------------

  const toggleNotifications = useCallback((value) => {
    const newValue = typeof value === 'boolean' ? value : !enabled;
    setEnabled(newValue);
    localStorage.setItem('notificationsEnabled', String(newValue));

    // Request permission if enabling and not yet granted
    if (newValue && permission === 'default') {
      requestPermission();
    }
  }, [enabled, permission, requestPermission]);

  // ---------------------------------------------------------------------------
  // SHOW NOTIFICATION
  // ---------------------------------------------------------------------------

  const showNotification = useCallback((title, options = {}) => {
    if (!enabled || permission !== 'granted') {
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }, [enabled, permission]);

  // ---------------------------------------------------------------------------
  // CHECK IF VIEWING CONVERSATION
  // ---------------------------------------------------------------------------

  const isViewingConversation = useCallback((conversationType, conversationId) => {
    const currentPath = locationRef.current;

    if (conversationType === 'dm') {
      return currentPath === `/chat/dm/${conversationId}`;
    } else if (conversationType === 'group') {
      return currentPath === `/chat/group/${conversationId}`;
    }

    return false;
  }, []);

  // ---------------------------------------------------------------------------
  // HANDLE INCOMING MESSAGES
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!user) return;

    // Handle DM messages
    const unsubscribeDM = subscribe('message:receive', (message) => {
      // Don't notify for own messages
      const senderId = message.sender?._id || message.sender;
      if (senderId === user._id || senderId === user._id?.toString()) return;

      // Don't notify if viewing this conversation
      if (isViewingConversation('dm', senderId)) return;

      const senderName = message.sender?.displayName || message.sender?.username || 'Someone';
      const body = message.messageType === 'file'
        ? 'Sent a file'
        : (message.content || '').length > 100
          ? message.content.substring(0, 100) + '...'
          : (message.content || 'New message');

      const notification = showNotification(senderName, {
        body,
        tag: `dm-${senderId}`,
        data: { type: 'dm', userId: senderId },
      });

      if (notification) {
        notification.onclick = () => {
          window.focus();
          navigate(`/chat/dm/${senderId}`);
          notification.close();
        };
      }
    });

    // Handle group messages
    const unsubscribeGroup = subscribe('group:message:receive', (message) => {
      // Don't notify for own messages
      const senderId = message.sender?._id || message.sender;
      if (senderId === user._id || senderId === user._id?.toString()) return;

      // Don't notify if viewing this group
      const groupId = message.group?._id || message.group;
      if (isViewingConversation('group', groupId)) return;

      const senderName = message.sender?.displayName || message.sender?.username || 'Someone';
      const groupName = message.group?.name || 'Group';
      const body = message.messageType === 'file'
        ? 'Sent a file'
        : (message.content || '').length > 100
          ? message.content.substring(0, 100) + '...'
          : (message.content || 'New message');

      const notification = showNotification(groupName, {
        body: `${senderName}: ${body}`,
        tag: `group-${groupId}`,
        data: { type: 'group', groupId: groupId },
      });

      if (notification) {
        notification.onclick = () => {
          window.focus();
          navigate(`/chat/group/${groupId}`);
          notification.close();
        };
      }
    });

    return () => {
      unsubscribeDM();
      unsubscribeGroup();
    };
  }, [user, subscribe, showNotification, isViewingConversation, navigate]);

  // ---------------------------------------------------------------------------
  // AUTO-REQUEST PERMISSION ON FIRST LOAD
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (user && enabled && permission === 'default') {
      // Small delay to not overwhelm user immediately on login
      const timer = setTimeout(() => {
        requestPermission();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, enabled, permission, requestPermission]);

  // ---------------------------------------------------------------------------
  // CONTEXT VALUE
  // ---------------------------------------------------------------------------

  const value = {
    permission,
    enabled,
    requestPermission,
    toggleNotifications,
    showNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// =============================================================================
// USE NOTIFICATION HOOK
// =============================================================================

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
