// =============================================================================
// AUTH CONTEXT
// =============================================================================
// Provides authentication state and methods throughout the application.
//
// What is React Context?
// Context provides a way to pass data through the component tree without
// having to pass props manually at every level. It's perfect for:
// - User authentication state
// - Theme preferences
// - Language settings
// - Any "global" data
//
// How this works:
// 1. AuthProvider wraps the app (in App.jsx)
// 2. Any component can use useAuth() to access auth state
// 3. When auth state changes, all components using it re-render
// =============================================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

// =============================================================================
// CREATE CONTEXT
// =============================================================================
// createContext creates a Context object.
// We pass null as the default value (will be overwritten by Provider).
// =============================================================================

const AuthContext = createContext(null);

// =============================================================================
// AUTH PROVIDER COMPONENT
// =============================================================================
// This component wraps our app and provides auth state to all children.
// =============================================================================

export function AuthProvider({ children }) {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  // Current authenticated user (null if not logged in)
  const [user, setUser] = useState(null);

  // Loading state for initial auth check
  const [isLoading, setIsLoading] = useState(true);

  // Error state for auth operations
  const [error, setError] = useState(null);

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  // User is authenticated if we have a user object
  const isAuthenticated = !!user;

  // ---------------------------------------------------------------------------
  // INITIALIZE AUTH
  // ---------------------------------------------------------------------------
  // On app load, check if user is already logged in (has valid token)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const initializeAuth = async () => {
      // Check if we have a token stored
      const token = localStorage.getItem('token');

      if (!token) {
        // No token, user is not logged in
        setIsLoading(false);
        return;
      }

      try {
        // Verify token by fetching current user
        const response = await authAPI.getMe();
        setUser(response.data.data.user);
      } catch (err) {
        // Token invalid or expired - clear storage
        console.error('Auth initialization failed:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // ---------------------------------------------------------------------------
  // AUTH METHODS
  // ---------------------------------------------------------------------------
  // These methods are provided to components via context
  // useCallback ensures they don't cause unnecessary re-renders
  // ---------------------------------------------------------------------------

  /**
   * Sign up a new user
   * @param {Object} userData - { inviteCode, username, email, displayName, password, confirmPassword }
   */
  const signup = useCallback(async (userData) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await authAPI.signup(userData);
      const { user: newUser, token } = response.data.data;

      // Store token and user
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);

      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Signup failed';
      setError(errorMessage);
      return { success: false, error: errorMessage, errors: err.errors };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Log in a user
   * @param {Object} credentials - { email, password }
   */
  const login = useCallback(async (credentials) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await authAPI.login(credentials);
      const { user: loggedInUser, token } = response.data.data;

      // Store token and user
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);

      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Log out the current user
   */
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', err);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('activeClubId');
      setUser(null);
      setError(null);
    }
  }, []);

  /**
   * Refresh user data from server
   */
  const refreshUser = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      const updatedUser = response.data.data.user;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { success: true, user: updatedUser };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Clear any error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // CONTEXT VALUE
  // ---------------------------------------------------------------------------
  // This object is what components receive when they use useAuth()
  // ---------------------------------------------------------------------------

  // Get token from localStorage for socket connection
  const token = localStorage.getItem('token');

  const value = {
    // State
    user,
    token,
    isAuthenticated,
    isLoading,
    error,

    // Methods
    signup,
    login,
    logout,
    refreshUser,
    clearError,
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// =============================================================================
// USE AUTH HOOK
// =============================================================================
// Custom hook to easily access auth context in any component.
//
// Usage:
//   const { user, login, logout } = useAuth();
// =============================================================================

export function useAuth() {
  const context = useContext(AuthContext);

  // Throw error if used outside AuthProvider
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default AuthContext;
