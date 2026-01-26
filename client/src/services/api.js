// =============================================================================
// API SERVICE
// =============================================================================
// Centralized API communication layer using Axios.
//
// Why use a service layer?
// - Single place to configure API calls (base URL, headers, timeouts)
// - Automatically add auth tokens to requests
// - Handle common error scenarios
// - Intercept responses for token refresh, etc.
//
// Axios is a popular HTTP client that provides:
// - Promise-based API
// - Request/response interceptors
// - Automatic JSON transformation
// - Better error handling than fetch
// =============================================================================

import axios from 'axios';
import { API_URL } from '../config';

// =============================================================================
// CREATE AXIOS INSTANCE
// =============================================================================
// We create a custom instance instead of using axios directly.
// This lets us configure defaults that apply to all requests.
// =============================================================================

const api = axios.create({
  // Base URL for all requests
  // In development: Vite proxies /api to localhost:5001 (see vite.config.js)
  // In production: VITE_API_URL points to the backend server
  baseURL: API_URL ? `${API_URL}/api` : '/api',

  // Request timeout (10 seconds)
  timeout: 10000,

  // Default headers
  headers: {
    'Content-Type': 'application/json',
  },

  // Include cookies in requests (for cookie-based auth)
  withCredentials: true,
});

// =============================================================================
// REQUEST INTERCEPTOR
// =============================================================================
// Runs before every request is sent.
// We use this to add the JWT token to the Authorization header.
// =============================================================================

api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');

    // If token exists, add to Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Request error (e.g., no network)
    return Promise.reject(error);
  }
);

// =============================================================================
// RESPONSE INTERCEPTOR
// =============================================================================
// Runs after every response is received.
// We use this to handle common error scenarios.
// =============================================================================

api.interceptors.response.use(
  // Success response (2xx status codes)
  (response) => {
    // Just return the response data
    return response;
  },

  // Error response (non-2xx status codes)
  (error) => {
    // Extract useful error info
    const { response } = error;

    if (response) {
      // Server responded with an error
      const { status, data } = response;

      // Handle specific status codes
      switch (status) {
        case 401:
          // Unauthorized - token invalid or expired
          // Clear stored auth data
          localStorage.removeItem('token');
          localStorage.removeItem('user');

          // Redirect to login (if not already there)
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;

        case 403:
          // Forbidden - user doesn't have permission
          console.error('Access forbidden:', data.message);
          break;

        case 404:
          // Not found
          console.error('Resource not found:', data.message);
          break;

        case 429:
          // Too many requests (rate limited)
          console.error('Rate limited:', data.message);
          break;

        case 500:
          // Server error
          console.error('Server error:', data.message);
          break;

        default:
          console.error('API error:', data.message || 'Unknown error');
      }

      // Return a consistent error format
      return Promise.reject({
        status,
        message: data.message || 'An error occurred',
        errors: data.errors || [],
      });
    }

    // Network error or request was cancelled
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        status: 0,
        message: 'Request timeout. Please try again.',
      });
    }

    return Promise.reject({
      status: 0,
      message: 'Network error. Please check your connection.',
    });
  }
);

// =============================================================================
// AUTH API ENDPOINTS
// =============================================================================

export const authAPI = {
  /**
   * Register a new user
   * @param {Object} userData - { inviteCode, username, email, displayName, password, confirmPassword }
   */
  signup: (userData) => api.post('/auth/signup', userData),

  /**
   * Login user
   * @param {Object} credentials - { email, password }
   */
  login: (credentials) => api.post('/auth/login', credentials),

  /**
   * Logout user
   */
  logout: () => api.post('/auth/logout'),

  /**
   * Get current user
   */
  getMe: () => api.get('/auth/me'),

  /**
   * Request password reset
   * @param {Object} data - { email }
   */
  forgotPassword: (data) => api.post('/auth/forgot-password', data),

  /**
   * Reset password
   * @param {string} token - Reset token from email
   * @param {Object} data - { password, confirmPassword }
   */
  resetPassword: (token, data) => api.post(`/auth/reset-password/${token}`, data),
};

// =============================================================================
// INVITE API ENDPOINTS
// =============================================================================

export const inviteAPI = {
  /**
   * Validate an invite code
   * @param {string} code - The invite code to validate
   */
  validate: (code) => api.get(`/invites/validate/${code}`),

  /**
   * Create a new invite code
   */
  create: () => api.post('/invites'),

  /**
   * Get all invites created by current user
   */
  getAll: () => api.get('/invites'),

  /**
   * Get invite statistics
   */
  getStats: () => api.get('/invites/stats'),
};

// =============================================================================
// USER API ENDPOINTS
// =============================================================================
// User directory and profile operations
// =============================================================================

export const userAPI = {
  /**
   * Get all users (for directory)
   * @param {Object} params - { page, limit, search }
   */
  getAll: (params) => api.get('/users', { params }),

  /**
   * Get a single user by ID
   * @param {string} id - User ID
   */
  getById: (id) => api.get(`/users/${id}`),

  /**
   * Search users (for autocomplete)
   * @param {string} q - Search query
   */
  search: (q) => api.get('/users/search', { params: { q } }),

  /**
   * Update current user's profile
   * @param {Object} data - { displayName, avatar }
   */
  updateProfile: (data) => api.put('/users/profile', data),
};

// =============================================================================
// CONTACT API ENDPOINTS
// =============================================================================
// Contact list management
// =============================================================================

export const contactAPI = {
  /**
   * Get current user's contact list
   */
  getAll: () => api.get('/contacts'),

  /**
   * Add a user to contacts
   * @param {string} userId - User ID to add
   */
  add: (userId) => api.post(`/contacts/${userId}`),

  /**
   * Remove a user from contacts
   * @param {string} userId - User ID to remove
   */
  remove: (userId) => api.delete(`/contacts/${userId}`),

  /**
   * Check if a user is in contacts
   * @param {string} userId - User ID to check
   */
  check: (userId) => api.get(`/contacts/check/${userId}`),
};

// =============================================================================
// MESSAGE API ENDPOINTS
// =============================================================================
// Message history and read status
// =============================================================================

export const messageAPI = {
  /**
   * Get DM conversation history
   * @param {string} userId - Other user's ID
   * @param {Object} params - { page, limit }
   */
  getDMMessages: (userId, params) => api.get(`/messages/dm/${userId}`, { params }),

  /**
   * Mark DM conversation as read
   * @param {string} userId - Other user's ID
   */
  markDMAsRead: (userId) => api.post(`/messages/dm/${userId}/read`),

  /**
   * Get group conversation history
   * @param {string} groupId - Group ID
   * @param {Object} params - { page, limit }
   */
  getGroupMessages: (groupId, params) => api.get(`/messages/group/${groupId}`, { params }),

  /**
   * Get unread message count
   */
  getUnreadCount: () => api.get('/messages/unread'),

  /**
   * Add a reaction to a message
   * @param {string} messageId - Message ID
   * @param {string} emoji - Emoji to add
   */
  addReaction: (messageId, emoji) => api.post(`/messages/${messageId}/reactions`, { emoji }),

  /**
   * Remove a reaction from a message
   * @param {string} messageId - Message ID
   * @param {string} emoji - Emoji to remove
   */
  removeReaction: (messageId, emoji) => api.delete(`/messages/${messageId}/reactions`, { data: { emoji } }),

  /**
   * Fetch link preview for a message
   * @param {string} messageId - Message ID
   */
  fetchLinkPreview: (messageId) => api.post(`/messages/${messageId}/link-preview`),
};

// =============================================================================
// GROUP API ENDPOINTS
// =============================================================================
// Group chat management
// =============================================================================

export const groupAPI = {
  /**
   * Create a new group
   * @param {Object} data - { name, description, memberIds }
   */
  create: (data) => api.post('/groups', data),

  /**
   * Get current user's groups
   */
  getAll: () => api.get('/groups'),

  /**
   * Get a single group by ID
   * @param {string} groupId - Group ID
   */
  getById: (groupId) => api.get(`/groups/${groupId}`),

  /**
   * Update group settings
   * @param {string} groupId - Group ID
   * @param {Object} data - { name, description, avatar }
   */
  update: (groupId, data) => api.put(`/groups/${groupId}`, data),

  /**
   * Add a member to group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID to add
   */
  addMember: (groupId, userId) => api.post(`/groups/${groupId}/members`, { userId }),

  /**
   * Remove a member from group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID to remove
   */
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),

  /**
   * Leave a group
   * @param {string} groupId - Group ID
   */
  leave: (groupId) => api.post(`/groups/${groupId}/leave`),
};

// Export the axios instance for custom requests
export default api;
