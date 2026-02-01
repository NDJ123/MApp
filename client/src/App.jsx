// =============================================================================
// MAIN APP COMPONENT
// =============================================================================
// This is the root component of our application. It:
// 1. Wraps the app with Context Providers (global state)
// 2. Sets up routing (which pages to show for which URLs)
// 3. Handles the overall app layout
//
// React Router v6 uses a declarative approach:
// - <Routes> is a container for all route definitions
// - <Route> maps a URL path to a component
// - <Navigate> redirects to another route
// =============================================================================

import { Routes, Route, Navigate } from 'react-router-dom';

// Context providers
import { AuthProvider } from './context/AuthContext';
import { ClubProvider } from './context/ClubContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { ContactProvider } from './context/ContactContext';

// Page components
import LandingPage from './components/common/LandingPage';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import ChatLayout from './components/chat/ChatLayout';
import PrivateRoute from './components/auth/PrivateRoute';

// =============================================================================
// APP COMPONENT
// =============================================================================

function App() {
  return (
    // AuthProvider wraps the entire app to provide auth state everywhere
    <AuthProvider>
      {/* ClubProvider manages the current club context */}
      <ClubProvider>
        {/* SocketProvider connects to the server for real-time features */}
        <SocketProvider>
          {/* ContactProvider manages the contact list state */}
          <ContactProvider>
          {/* NotificationProvider handles desktop notifications */}
          <NotificationProvider>
        <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
          <Routes>
          {/* ----------------------------------------------------------------- */}
          {/* PUBLIC ROUTES - Accessible to everyone                            */}
          {/* ----------------------------------------------------------------- */}

          {/* Landing page - shown at the root URL */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          {/* TODO: Add password reset pages */}
          {/* <Route path="/forgot-password" element={<ForgotPasswordPage />} /> */}
          {/* <Route path="/reset-password/:token" element={<ResetPasswordPage />} /> */}

          {/* ----------------------------------------------------------------- */}
          {/* PROTECTED ROUTES - Require authentication                         */}
          {/* ----------------------------------------------------------------- */}

          {/* Main chat interface - wrapped in PrivateRoute for protection */}
          <Route
            path="/chat/*"
            element={
              <PrivateRoute>
                <ChatLayout />
              </PrivateRoute>
            }
          />

          {/* ----------------------------------------------------------------- */}
          {/* FALLBACK ROUTES                                                   */}
          {/* ----------------------------------------------------------------- */}

          {/* 404 - Redirect unknown routes to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
          </NotificationProvider>
          </ContactProvider>
        </SocketProvider>
      </ClubProvider>
    </AuthProvider>
  );
}

export default App;
