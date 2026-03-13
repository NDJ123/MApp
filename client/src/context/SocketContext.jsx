// =============================================================================
// SOCKET CONTEXT
// =============================================================================
// Manages the Socket.io connection for real-time features.
//
// Provides:
// - Automatic connection when user is authenticated
// - Automatic reconnection on disconnect
// - Socket instance to all components via useSocket hook
// - Event emitters and listeners
// =============================================================================

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useClub } from './ClubContext';
import { SOCKET_URL } from '../config';

// Create the context
const SocketContext = createContext(null);

// =============================================================================
// SOCKET PROVIDER
// =============================================================================

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const { activeClubId } = useClub();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Use ref to track if we're intentionally disconnecting
  const intentionalDisconnect = useRef(false);

  // ---------------------------------------------------------------------------
  // CONNECT SOCKET
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Get token from localStorage, clubId from ClubContext
    const token = localStorage.getItem('token');
    const clubId = activeClubId;

    // Only connect if we have a user, token, and club
    if (!user || !token || !clubId) {
      if (socket) {
        intentionalDisconnect.current = true;
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection with club context
    // In production, SOCKET_URL points to the backend server
    // In development, empty string means "connect to current host" (proxied by Vite)
    const newSocket = io(SOCKET_URL || undefined, {
      auth: { token, clubId }, // Include clubId in socket handshake
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log(`[Socket] Connected to club: ${clubId}`);
      setIsConnected(true);
      intentionalDisconnect.current = false;
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setIsConnected(false);
    });

    // Online status events (now club-scoped)
    newSocket.on('user:online', ({ userId }) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
    });

    newSocket.on('user:offline', ({ userId }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    setSocket(newSocket);

    // Cleanup on unmount or when user/token/club changes
    return () => {
      intentionalDisconnect.current = true;
      newSocket.disconnect();
    };
  }, [user, activeClubId]); // Reconnect when club changes

  // ---------------------------------------------------------------------------
  // SEND MESSAGE
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback((recipientId, content, file = null, replyTo = null) => {
    return new Promise((resolve, reject) => {
      if (!socket || !isConnected) {
        reject(new Error('Not connected'));
        return;
      }

      const data = { recipientId, content };
      if (file) {
        data.file = file;
      }
      if (replyTo) {
        data.replyTo = replyTo;
      }

      socket.emit('message:send', data, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.message);
        }
      });
    });
  }, [socket, isConnected]);

  // ---------------------------------------------------------------------------
  // SEND GROUP MESSAGE WITH FILE
  // ---------------------------------------------------------------------------

  const sendGroupMessage = useCallback((groupId, content, file = null, replyTo = null) => {
    return new Promise((resolve, reject) => {
      if (!socket || !isConnected) {
        reject(new Error('Not connected'));
        return;
      }

      const data = { groupId, content };
      if (file) {
        data.file = file;
      }
      if (replyTo) {
        data.replyTo = replyTo;
      }

      socket.emit('group:message:send', data, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.message);
        }
      });
    });
  }, [socket, isConnected]);

  // ---------------------------------------------------------------------------
  // TYPING INDICATORS
  // ---------------------------------------------------------------------------

  const startTyping = useCallback((recipientId) => {
    if (socket && isConnected) {
      socket.emit('typing:start', { recipientId });
    }
  }, [socket, isConnected]);

  const stopTyping = useCallback((recipientId) => {
    if (socket && isConnected) {
      socket.emit('typing:stop', { recipientId });
    }
  }, [socket, isConnected]);

  // ---------------------------------------------------------------------------
  // MARK MESSAGES AS READ
  // ---------------------------------------------------------------------------

  const markAsRead = useCallback((userId) => {
    if (socket && isConnected) {
      socket.emit('messages:read', { userId });
    }
  }, [socket, isConnected]);

  // ---------------------------------------------------------------------------
  // TOGGLE REACTION
  // ---------------------------------------------------------------------------

  const toggleReaction = useCallback((messageId, emoji) => {
    return new Promise((resolve, reject) => {
      if (!socket || !isConnected) {
        reject(new Error('Not connected'));
        return;
      }

      socket.emit('reaction:toggle', { messageId, emoji }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.reactions);
        }
      });
    });
  }, [socket, isConnected]);

  // ---------------------------------------------------------------------------
  // EDIT MESSAGE
  // ---------------------------------------------------------------------------

  const editMessage = useCallback((messageId, content) => {
    return new Promise((resolve, reject) => {
      if (!socket || !isConnected) {
        reject(new Error('Not connected'));
        return;
      }

      socket.emit('message:edit', { messageId, content }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.message);
        }
      });
    });
  }, [socket, isConnected]);

  // ---------------------------------------------------------------------------
  // DELETE MESSAGE
  // ---------------------------------------------------------------------------

  const deleteMessage = useCallback((messageId) => {
    return new Promise((resolve, reject) => {
      if (!socket || !isConnected) {
        reject(new Error('Not connected'));
        return;
      }

      socket.emit('message:delete', { messageId }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }, [socket, isConnected]);

  // ---------------------------------------------------------------------------
  // CHECK IF USER IS ONLINE
  // ---------------------------------------------------------------------------

  const isUserOnline = useCallback((userId) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  // ---------------------------------------------------------------------------
  // SUBSCRIBE TO EVENTS
  // ---------------------------------------------------------------------------

  const subscribe = useCallback((event, handler) => {
    if (!socket) return () => {};

    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [socket]);

  // ---------------------------------------------------------------------------
  // CONTEXT VALUE
  // ---------------------------------------------------------------------------

  const value = {
    socket,
    isConnected,
    onlineUsers,
    sendMessage,
    sendGroupMessage,
    startTyping,
    stopTyping,
    markAsRead,
    toggleReaction,
    editMessage,
    deleteMessage,
    isUserOnline,
    subscribe,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// =============================================================================
// USE SOCKET HOOK
// =============================================================================

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export default SocketContext;
