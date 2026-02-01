// =============================================================================
// CLUB CONTEXT
// =============================================================================
// Manages the current club context throughout the application.
//
// Provides:
// - Current active club selection
// - List of user's club memberships
// - Methods to switch between clubs
// - Club ID for API requests and socket connections
// =============================================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { clubAPI } from '../services/api';

// Create the context
const ClubContext = createContext(null);

// =============================================================================
// CLUB PROVIDER
// =============================================================================

export function ClubProvider({ children }) {
  const { user, isAuthenticated } = useAuth();

  // Current active club
  const [activeClub, setActiveClub] = useState(null);

  // All clubs the user is a member of
  const [clubs, setClubs] = useState([]);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Error state
  const [error, setError] = useState(null);

  // ---------------------------------------------------------------------------
  // INITIALIZE CLUBS
  // ---------------------------------------------------------------------------
  // On auth change, fetch user's clubs and set active club
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const initializeClubs = async () => {
      if (!isAuthenticated || !user) {
        setActiveClub(null);
        setClubs([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch user's clubs
        const response = await clubAPI.getMyClubs();
        const userClubs = response.data.data.clubs || [];
        setClubs(userClubs);

        // Determine active club
        // Priority: 1) localStorage, 2) user's activeClub from server, 3) first club
        const storedClubId = localStorage.getItem('activeClubId');
        let selectedClub = null;

        if (storedClubId) {
          selectedClub = userClubs.find(c => c._id === storedClubId);
        }

        if (!selectedClub && user.activeClub) {
          selectedClub = userClubs.find(c => c._id === user.activeClub);
        }

        if (!selectedClub && userClubs.length > 0) {
          selectedClub = userClubs[0];
        }

        if (selectedClub) {
          setActiveClub(selectedClub);
          localStorage.setItem('activeClubId', selectedClub._id);
        }

        setError(null);
      } catch (err) {
        console.error('Failed to fetch clubs:', err);
        setError(err.message || 'Failed to load clubs');
      } finally {
        setIsLoading(false);
      }
    };

    initializeClubs();
  }, [isAuthenticated, user]);

  // ---------------------------------------------------------------------------
  // SWITCH CLUB
  // ---------------------------------------------------------------------------
  // Change the active club
  // ---------------------------------------------------------------------------

  const switchClub = useCallback(async (clubId) => {
    const club = clubs.find(c => c._id === clubId);
    if (!club) {
      setError('Club not found');
      return { success: false, error: 'Club not found' };
    }

    try {
      // Update on server
      await clubAPI.switchClub(clubId);

      // Update local state
      setActiveClub(club);
      localStorage.setItem('activeClubId', clubId);
      setError(null);

      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Failed to switch club';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [clubs]);

  // ---------------------------------------------------------------------------
  // REFRESH CLUBS
  // ---------------------------------------------------------------------------
  // Reload clubs from server
  // ---------------------------------------------------------------------------

  const refreshClubs = useCallback(async () => {
    if (!isAuthenticated) return { success: false };

    try {
      const response = await clubAPI.getMyClubs();
      const userClubs = response.data.data.clubs || [];
      setClubs(userClubs);

      // If active club no longer exists, switch to first available
      if (activeClub && !userClubs.find(c => c._id === activeClub._id)) {
        if (userClubs.length > 0) {
          setActiveClub(userClubs[0]);
          localStorage.setItem('activeClubId', userClubs[0]._id);
        } else {
          setActiveClub(null);
          localStorage.removeItem('activeClubId');
        }
      }

      return { success: true, clubs: userClubs };
    } catch (err) {
      setError(err.message || 'Failed to refresh clubs');
      return { success: false, error: err.message };
    }
  }, [isAuthenticated, activeClub]);

  // ---------------------------------------------------------------------------
  // CLEAR ERROR
  // ---------------------------------------------------------------------------

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // GET CLUB MEMBERSHIP
  // ---------------------------------------------------------------------------
  // Get the user's membership info for the active club
  // ---------------------------------------------------------------------------

  const getActiveMembership = useCallback(() => {
    if (!activeClub || !user?.clubMemberships) return null;

    return user.clubMemberships.find(
      m => m.club === activeClub._id || m.club?._id === activeClub._id
    );
  }, [activeClub, user]);

  // ---------------------------------------------------------------------------
  // CHECK IF USER IS ADMIN
  // ---------------------------------------------------------------------------

  const isClubAdmin = useCallback(() => {
    const membership = getActiveMembership();
    return membership?.role === 'admin';
  }, [getActiveMembership]);

  // ---------------------------------------------------------------------------
  // CONTEXT VALUE
  // ---------------------------------------------------------------------------

  const value = {
    // State
    activeClub,
    activeClubId: activeClub?._id || null,
    clubs,
    isLoading,
    error,

    // Computed
    hasClub: !!activeClub,
    isClubAdmin: isClubAdmin(),
    membership: getActiveMembership(),

    // Methods
    switchClub,
    refreshClubs,
    clearError,
  };

  return (
    <ClubContext.Provider value={value}>
      {children}
    </ClubContext.Provider>
  );
}

// =============================================================================
// USE CLUB HOOK
// =============================================================================

export function useClub() {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
}

export default ClubContext;
