// =============================================================================
// GROUP LIST COMPONENT
// =============================================================================
// Displays the user's groups in the sidebar.
// Clicking a group navigates to the group conversation.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { groupAPI } from '../../services/api';
import { useClub } from '../../context/ClubContext';
import Skeleton from '../ui/Skeleton';

function GroupList({ onCreateGroup }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const { activeClubId, isLoading: isClubLoading } = useClub();

  const fetchGroups = useCallback(async () => {
    // Wait for club context to be ready
    if (!activeClubId) {
      setGroups([]);
      setLoading(false);
      return;
    }

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
  }, [activeClubId]);

  // Fetch groups when club context is ready
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Check if a group is currently selected
  const isGroupActive = (groupId) => {
    return location.pathname === `/chat/group/${groupId}`;
  };

  // Loading state
  if (loading || isClubLoading) {
    return (
      <div className="px-3 py-2 space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <Skeleton className="w-8 h-8 rounded-[var(--radius-md)]" />
            <div className="flex-1 space-y-1.5">
              <Skeleton variant="text" className="w-24 h-3" />
              <Skeleton variant="text" className="w-16 h-2.5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="px-3 py-2 text-center">
        <p className="text-xs text-[var(--color-error)]">{error}</p>
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
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-md)] transition-colors"
      >
        <Plus className="w-4 h-4" />
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
                flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] transition-colors
                ${isGroupActive(group._id)
                  ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
                  : 'hover:bg-[var(--color-surface-hover)]'
                }
              `}
            >
              {/* Group avatar or icon */}
              {group.avatar ? (
                <img
                  src={group.avatar}
                  alt={group.name}
                  className="w-8 h-8 rounded-[var(--radius-md)] object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary)]/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-[var(--color-primary)]" />
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
