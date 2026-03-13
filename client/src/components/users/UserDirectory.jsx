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
import { Search, UserPlus, UserMinus, ChevronLeft, ChevronRight } from 'lucide-react';
import { userAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useContacts } from '../../context/ContactContext';
import Avatar from '../ui/Avatar';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { CardSkeleton } from '../ui/Skeleton';

// =============================================================================
// USER CARD COMPONENT
// =============================================================================
// Displays a single user with their info and contact action button
// =============================================================================

function UserCard({ user, isContact, isOnline, onAddContact, onRemoveContact, isLoading }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200">
      {/* Avatar with online indicator */}
      <Avatar
        src={user.avatar}
        name={user.displayName || user.username || '?'}
        size="lg"
        isOnline={isOnline}
      />

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
      {isContact ? (
        <Button
          variant="secondary"
          size="sm"
          isLoading={isLoading}
          onClick={() => onRemoveContact(user._id)}
          className="hover:!bg-[var(--color-error)] hover:!text-white hover:!border-transparent"
        >
          <UserMinus className="w-4 h-4" />
          Remove
        </Button>
      ) : (
        <Button
          variant="primary"
          size="sm"
          isLoading={isLoading}
          onClick={() => onAddContact(user._id)}
        >
          <UserPlus className="w-4 h-4" />
          Add Contact
        </Button>
      )}
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

  // Socket context for online status
  const { isUserOnline } = useSocket();

  // Contact context for managing contacts
  const { isContact, addContact, removeContact } = useContacts();

  // -------------------------------------------------------------------------
  // FETCH USERS
  // -------------------------------------------------------------------------
  // Fetches users from the API with optional search query and pagination
  // -------------------------------------------------------------------------

  const fetchUsers = useCallback(async (search = '', pageNum = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const usersResponse = await userAPI.getAll({ search, page: pageNum, limit: 20 });

      // Extract user data
      const { users: userList, pagination: paginationData } = usersResponse.data.data;
      setUsers(userList);
      setPagination(paginationData);

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
      await addContact(userId);
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
      await removeContact(userId);
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
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">User Directory</h1>

        {/* Search input */}
        <Input
          icon={Search}
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search users by name or username..."
        />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Loading state */}
        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="text-center py-12">
            <p className="text-[var(--color-error)] mb-4">{error}</p>
            <Button
              variant="primary"
              onClick={() => fetchUsers(searchQuery, page)}
            >
              Try Again
            </Button>
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
                    isContact={isContact(user._id)}
                    isOnline={isUserOnline(user._id)}
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  Page {page} of {pagination.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!pagination.hasMore}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default UserDirectory;
