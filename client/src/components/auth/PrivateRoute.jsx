// =============================================================================
// PRIVATE ROUTE COMPONENT
// =============================================================================
// A wrapper component that protects routes requiring authentication.
//
// How it works:
// 1. Check if user is authenticated (via AuthContext)
// 2. If loading, show skeleton loading state
// 3. If authenticated, render the protected content
// 4. If not authenticated, redirect to login
//
// Usage:
//   <Route path="/chat" element={<PrivateRoute><ChatLayout /></PrivateRoute>} />
// =============================================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useClub } from '../../context/ClubContext';
import { ContactSkeleton } from '../ui/Skeleton';
import NoClubScreen from '../common/NoClubScreen';

function PrivateRoute({ children }) {
  // Get auth state from context
  const { isAuthenticated, isLoading } = useAuth();

  // Get club state from context
  const { clubs, hasClub, isLoading: isClubLoading } = useClub();

  // Get current location (for redirect after login)
  const location = useLocation();

  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------
  // While checking authentication or loading clubs, show skeleton loading
  // This prevents a flash of the login page before auth is confirmed
  // ---------------------------------------------------------------------------

  if (isLoading || (isAuthenticated && isClubLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="w-full max-w-sm space-y-2 animate-fade-in">
          <ContactSkeleton />
          <ContactSkeleton />
          <ContactSkeleton />
          <ContactSkeleton />
          <ContactSkeleton />
        </div>
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
  // NO CLUB MEMBERSHIP
  // ---------------------------------------------------------------------------
  // If the user is authenticated but has no clubs, show an explanation screen
  // ---------------------------------------------------------------------------

  if (!isClubLoading && clubs.length === 0 && !hasClub) {
    return <NoClubScreen />;
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATED WITH CLUB
  // ---------------------------------------------------------------------------
  // Render the protected content
  // ---------------------------------------------------------------------------

  return children;
}

export default PrivateRoute;
