// =============================================================================
// USER DIRECTORY COMPONENT
// =============================================================================
// Displays a searchable list of all users in the system.
// Users can add/remove contacts from this directory.
//
// Features:
// - Search by username or display name
// - Pagination for large user lists
// - Add/Remove contact buttons
// - Visual feedback for contact status
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { userAPI, contactAPI } from '../../services/api';
import Spinner from '../common/Spinner';

// =============================================================================
// USER CARD COMPONENT
// =============================================================================
// Displays a single user with their info and contact action button
// =============================================================================

function UserCard({ user, isContact, onAddContact, onRemoveContact, isLoading }) {
  // Get first letter for avatar
  const initial = (user.displayName || user.username || '?')[0].toUpperCase();

  return (
    <div className="flex items-center gap-4 p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-lg font-medium flex-shrink-0">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.displayName}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          initial
        )}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[var(--color-text-primary)] truncate">
          {user.displayName}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] truncate">
          @{user.username}
        </p>
      </div>

      {/* Action button */}
      <button
        onClick={() => isContact ? onRemoveContact(user._id) : onAddContact(user._id)}
        disabled={isLoading}
        className={`
          px-4 py-2 rounded-lg text-sm font-medium transition-colors
          ${isContact
            ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-red-500 hover:text-white'
            : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {isLoading ? (
          <Spinner size="small" />
        ) : isContact ? (
          'Remove'
        ) : (
          'Add Contact'
        )}
      </button>
    </div>
  );
}

// =============================================================================
// MAIN USER DIRECTORY COMPONENT
// =============================================================================

function UserDirectory() {
  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------

  // User list data
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState(new Set()); // Set of contact IDs for quick lookup

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingUserId, setLoadingUserId] = useState(null); // Track which user action is loading

  // Search and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, hasMore: false });

  // Debounce timer for search
  const [searchTimer, setSearchTimer] = useState(null);

  // -------------------------------------------------------------------------
  // FETCH USERS
  // -------------------------------------------------------------------------
  // Fetches users from the API with optional search query and pagination
  // -------------------------------------------------------------------------

  const fetchUsers = useCallback(async (search = '', pageNum = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch users and contacts in parallel
      const [usersResponse, contactsResponse] = await Promise.all([
        userAPI.getAll({ search, page: pageNum, limit: 20 }),
        contactAPI.getAll(),
      ]);

      // Extract user data
      const { users: userList, pagination: paginationData } = usersResponse.data.data;
      setUsers(userList);
      setPagination(paginationData);

      // Create a Set of contact IDs for quick lookup
      const contactIds = new Set(
        contactsResponse.data.data.contacts.map(contact => contact._id)
      );
      setContacts(contactIds);

    } catch (err) {
      setError(err.message || 'Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // INITIAL LOAD
  // -------------------------------------------------------------------------

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // -------------------------------------------------------------------------
  // SEARCH HANDLER
  // -------------------------------------------------------------------------
  // Debounces search to avoid too many API calls while typing
  // -------------------------------------------------------------------------

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timer
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    // Set new debounce timer (300ms delay)
    const timer = setTimeout(() => {
      setPage(1); // Reset to first page on new search
      fetchUsers(query, 1);
    }, 300);

    setSearchTimer(timer);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
    };
  }, [searchTimer]);

  // -------------------------------------------------------------------------
  // PAGINATION HANDLERS
  // -------------------------------------------------------------------------

  const handlePreviousPage = () => {
    if (page > 1) {
      const newPage = page - 1;
      setPage(newPage);
      fetchUsers(searchQuery, newPage);
    }
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      const newPage = page + 1;
      setPage(newPage);
      fetchUsers(searchQuery, newPage);
    }
  };

  // -------------------------------------------------------------------------
  // CONTACT ACTIONS
  // -------------------------------------------------------------------------

  const handleAddContact = async (userId) => {
    try {
      setLoadingUserId(userId);
      await contactAPI.add(userId);

      // Update local state
      setContacts(prev => new Set([...prev, userId]));
    } catch (err) {
      console.error('Error adding contact:', err);
      // Could show a toast notification here
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleRemoveContact = async (userId) => {
    try {
      setLoadingUserId(userId);
      await contactAPI.remove(userId);

      // Update local state
      setContacts(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } catch (err) {
      console.error('Error removing contact:', err);
      // Could show a toast notification here
    } finally {
      setLoadingUserId(null);
    }
  };

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[var(--color-border)]">
        <h1 className="text-2xl font-bold mb-4">User Directory</h1>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search users by name or username..."
            className="w-full px-4 py-3 pl-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
          {/* Search icon */}
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-tertiary)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="large" />
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => fetchUsers(searchQuery, page)}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
            >
              Try Again
            </button>
          </div>
        )}

        {/* User list */}
        {!isLoading && !error && (
          <>
            {/* Results count */}
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              {pagination.total} {pagination.total === 1 ? 'user' : 'users'} found
            </p>

            {/* User grid */}
            {users.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {users.map(user => (
                  <UserCard
                    key={user._id}
                    user={user}
                    isContact={contacts.has(user._id)}
                    onAddContact={handleAddContact}
                    onRemoveContact={handleRemoveContact}
                    isLoading={loadingUserId === user._id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[var(--color-text-secondary)]">
                  {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                </p>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-[var(--color-border)]">
                <button
                  onClick={handlePreviousPage}
                  disabled={page === 1}
                  className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  Page {page} of {pagination.totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={!pagination.hasMore}
                  className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default UserDirectory;
