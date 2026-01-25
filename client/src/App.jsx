// =============================================================================
// MAIN APP COMPONENT
// =============================================================================
// This is the root component of our application. It:
// 1. Sets up routing (which pages to show for which URLs)
// 2. Wraps the app with Context Providers (global state)
// 3. Handles the overall app layout
//
// React Router v6 uses a declarative approach:
// - <Routes> is a container for all route definitions
// - <Route> maps a URL path to a component
// - <Navigate> redirects to another route
// =============================================================================

import { Routes, Route, Navigate } from 'react-router-dom';

// Page components (we'll create these next)
import LandingPage from './components/common/LandingPage';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import ChatLayout from './components/chat/ChatLayout';

// Context providers (we'll create these in Phase 2)
// import { AuthProvider } from './context/AuthContext';
// import { ThemeProvider } from './context/ThemeContext';

// =============================================================================
// APP COMPONENT
// =============================================================================

function App() {
  // TODO: Replace with actual auth check in Phase 2
  const isAuthenticated = false;

  return (
    // Future: Wrap with providers
    // <AuthProvider>
    //   <ThemeProvider>
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
        {/* TODO: Add these in Phase 2 */}
        {/* <Route path="/forgot-password" element={<ForgotPasswordPage />} /> */}
        {/* <Route path="/reset-password/:token" element={<ResetPasswordPage />} /> */}

        {/* ----------------------------------------------------------------- */}
        {/* PROTECTED ROUTES - Require authentication                         */}
        {/* ----------------------------------------------------------------- */}

        {/* Main chat interface */}
        {/* TODO: Wrap with PrivateRoute component in Phase 2 */}
        <Route
          path="/chat/*"
          element={
            isAuthenticated ? (
              <ChatLayout />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* ----------------------------------------------------------------- */}
        {/* FALLBACK ROUTES                                                   */}
        {/* ----------------------------------------------------------------- */}

        {/* 404 - Redirect unknown routes to landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
    //   </ThemeProvider>
    // </AuthProvider>
  );
}

export default App;
