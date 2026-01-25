// =============================================================================
// VITE CONFIGURATION
// =============================================================================
// Vite is our build tool - it bundles and serves our React app during development
// and creates optimized production builds. This file configures its behavior.
// =============================================================================

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Plugins extend Vite's functionality
  plugins: [
    // Enables React features like JSX transformation and Fast Refresh (hot reloading)
    react(),
    // Enables Tailwind CSS processing - converts utility classes to actual CSS
    tailwindcss(),
  ],

  // Development server settings
  server: {
    port: 5173, // Frontend runs on this port
    proxy: {
      // Proxy API requests to our backend server during development
      // When frontend calls '/api/...', it forwards to 'http://localhost:5000/api/...'
      // This avoids CORS issues during development
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxy Socket.io connections to backend
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
      },
    },
  },
})
