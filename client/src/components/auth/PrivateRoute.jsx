// =============================================================================
// PRIVATE ROUTE COMPONENT
// =============================================================================
// A wrapper component that protects routes requiring authentication.
//
// How it works:
// 1. Check if user is authenticated (via AuthContext)
// 2. If loading, show a spinner
// 3. If authenticated, render the protected content
// 4. If not authenticated, redirect to login
//
// Usage:
//   <Route path="/chat" element={<PrivateRoute><ChatLayout /></PrivateRoute>} />
// =============================================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../common/Spinner';

function PrivateRoute({ children }) {
  // Get auth state from context
  const { isAuthenticated, isLoading } = useAuth();

  // Get current location (for redirect after login)
  const location = useLocation();

  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------
  // While checking authentication status, show a loading spinner
  // This prevents a flash of the login page before auth is confirmed
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // NOT AUTHENTICATED
  // ---------------------------------------------------------------------------
  // Redirect to login page, saving the intended destination
  // After login, user will be redirected back to where they wanted to go
  // ---------------------------------------------------------------------------

  if (!isAuthenticated) {
    // Navigate with state so login page knows where to redirect after
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATED
  // ---------------------------------------------------------------------------
  // Render the protected content
  // ---------------------------------------------------------------------------

  return children;
}

export default PrivateRoute;
