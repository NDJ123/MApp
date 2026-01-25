// =============================================================================
// GROUP LIST COMPONENT
// =============================================================================
// Displays the user's groups in the sidebar.
// Clicking a group navigates to the group conversation.
// =============================================================================

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { groupAPI } from '../../services/api';

function GroupList({ onCreateGroup }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  // Fetch groups on mount
  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await groupAPI.getAll();
      setGroups(response.data.data.groups || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      setError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  // Check if a group is currently selected
  const isGroupActive = (groupId) => {
    return location.pathname === `/chat/group/${groupId}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="px-3 py-2">
        <div className="animate-pulse space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 bg-[var(--color-surface-hover)] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="px-3 py-2 text-center">
        <p className="text-xs text-red-500">{error}</p>
        <button
          onClick={fetchGroups}
          className="mt-1 text-xs text-[var(--color-primary)] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Create Group Button */}
      <button
        onClick={onCreateGroup}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>New Group</span>
      </button>

      {/* Groups list */}
      {groups.length === 0 ? (
        <div className="px-3 py-4 text-center">
          <p className="text-xs text-[var(--color-text-tertiary)]">
            No groups yet
          </p>
        </div>
      ) : (
        <div className="mt-1 space-y-1">
          {groups.map((group) => (
            <Link
              key={group._id}
              to={`/chat/group/${group._id}`}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                ${isGroupActive(group._id)
                  ? 'bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-primary)]'
                  : 'hover:bg-[var(--color-surface-hover)]'
                }
              `}
            >
              {/* Group avatar or icon */}
              {group.avatar ? (
                <img
                  src={group.avatar}
                  alt={group.name}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] bg-opacity-20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              )}

              {/* Group info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {group.name}
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                  {group.members?.length || 0} members
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default GroupList;
