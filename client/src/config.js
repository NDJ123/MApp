// =============================================================================
// CLIENT CONFIGURATION
// =============================================================================
// Centralized configuration for environment-specific settings.
//
// In development:
//   - Vite proxy forwards /api and /socket.io to localhost:5001
//   - No explicit URLs needed
//
// In production:
//   - Set VITE_API_URL to your backend URL (e.g., https://api.yourdomain.com)
//   - The same URL is used for both API and Socket.io
// =============================================================================

// API base URL
// In production, set VITE_API_URL to your backend server URL
// In development, we use Vite's proxy, so '/api' works directly
export const API_URL = import.meta.env.VITE_API_URL || '';

// Socket.io server URL
// In production, this should be your backend server URL (without /api)
// In development, empty string means "connect to current host" (proxied by Vite)
export const SOCKET_URL = import.meta.env.VITE_API_URL || '';

// Is production environment?
export const IS_PRODUCTION = import.meta.env.PROD;

// Log configuration in development
if (!IS_PRODUCTION) {
  console.log('[Config] Environment:', import.meta.env.MODE);
  console.log('[Config] API URL:', API_URL || '(using proxy)');
  console.log('[Config] Socket URL:', SOCKET_URL || '(using proxy)');
}
