// =============================================================================
// CLUB ADMIN DASHBOARD
// =============================================================================
// Admin interface for managing club settings and members.
// Only accessible to club admins and superadmins.
//
// Features:
// - Member management (view, promote, demote, remove)
// - Club settings (name, description, image)
// - Club statistics
// =============================================================================

import { useState, useEffect } from 'react';
import { useClub } from '../../context/ClubContext';
import { useAuth } from '../../context/AuthContext';
import { clubAPI } from '../../services/api';
import { Users, Settings, Lock } from 'lucide-react';
import Spinner from '../common/Spinner';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Button from '../ui/Button';

// =============================================================================
// MEMBER CARD COMPONENT
// =============================================================================

function MemberCard({ member, currentUserId, onPromote, onDemote, onRemove, isLoading }) {
  const isCurrentUser = member._id === currentUserId;

  return (
    <div className="flex items-center gap-4 p-4 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)]">
      {/* Avatar */}
      <Avatar
        src={member.avatar}
        name={member.displayName || member.username || '?'}
        size="lg"
      />

      {/* Member info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-[var(--color-text-primary)] truncate">
            {member.displayName}
          </h3>
          {member.role === 'admin' && (
            <Badge variant="primary">Admin</Badge>
          )}
          {isCurrentUser && (
            <span className="text-xs text-[var(--color-text-tertiary)]">(you)</span>
          )}
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] truncate">
          @{member.username}
        </p>
        <p className="text-xs text-[var(--color-text-tertiary)]">
          Joined {new Date(member.joinedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Action buttons - don't show for current user */}
      {!isCurrentUser && (
        <div className="flex gap-2">
          {member.role === 'member' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onPromote(member._id)}
              disabled={isLoading}
              isLoading={isLoading}
              title="Promote to admin"
            >
              Promote
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDemote(member._id)}
              disabled={isLoading}
              isLoading={isLoading}
              title="Demote to member"
            >
              Demote
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            onClick={() => onRemove(member._id)}
            disabled={isLoading}
            isLoading={isLoading}
            title="Remove from club"
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MEMBERS TAB COMPONENT
// =============================================================================

function MembersTab({ clubId, currentUserId }) {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMembers();
  }, [clubId]);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await clubAPI.getMembers(clubId);
      setMembers(response.data.data.members || []);
    } catch (err) {
      setError(err.message || 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromote = async (userId) => {
    try {
      setActionLoading(userId);
      await clubAPI.promoteToAdmin(clubId, userId);
      // Update local state
      setMembers(prev => prev.map(m =>
        m._id === userId ? { ...m, role: 'admin' } : m
      ));
    } catch (err) {
      setError(err.message || 'Failed to promote member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDemote = async (userId) => {
    try {
      setActionLoading(userId);
      await clubAPI.demoteAdmin(clubId, userId);
      setMembers(prev => prev.map(m =>
        m._id === userId ? { ...m, role: 'member' } : m
      ));
    } catch (err) {
      setError(err.message || 'Failed to demote admin');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (userId) => {
    if (!confirm('Are you sure you want to remove this member from the club?')) {
      return;
    }
    try {
      setActionLoading(userId);
      await clubAPI.removeMember(clubId, userId);
      setMembers(prev => prev.filter(m => m._id !== userId));
    } catch (err) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter members by search
  const filteredMembers = members.filter(m =>
    m.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort: admins first, then by name
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search members..."
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 [data-theme=dark]:bg-red-900/30 border border-red-200 [data-theme=dark]:border-red-800 rounded-[var(--radius-md)] text-[var(--color-error)] text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="mb-4 text-sm text-[var(--color-text-secondary)]">
        {members.length} members ({members.filter(m => m.role === 'admin').length} admins)
      </div>

      {/* Member list */}
      <div className="space-y-3">
        {sortedMembers.map(member => (
          <MemberCard
            key={member._id}
            member={member}
            currentUserId={currentUserId}
            onPromote={handlePromote}
            onDemote={handleDemote}
            onRemove={handleRemove}
            isLoading={actionLoading === member._id}
          />
        ))}
      </div>

      {sortedMembers.length === 0 && (
        <div className="text-center py-8 text-[var(--color-text-tertiary)]">
          {searchQuery ? 'No members found matching your search.' : 'No members yet.'}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SETTINGS TAB COMPONENT
// =============================================================================

function SettingsTab({ club, onUpdate }) {
  const [formData, setFormData] = useState({
    name: club?.name || '',
    description: club?.description || '',
    contactEmail: club?.contactEmail || '',
    contactPhone: club?.contactPhone || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      await clubAPI.update(club._id, formData);
      setSuccess(true);
      if (onUpdate) onUpdate(formData);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success message */}
      {success && (
        <div className="p-3 bg-green-50 [data-theme=dark]:bg-green-900/30 border border-green-200 [data-theme=dark]:border-green-800 rounded-[var(--radius-md)] text-green-700 [data-theme=dark]:text-green-400 text-sm">
          Settings updated successfully!
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 [data-theme=dark]:bg-red-900/30 border border-red-200 [data-theme=dark]:border-red-800 rounded-[var(--radius-md)] text-[var(--color-error)] text-sm">
          {error}
        </div>
      )}

      {/* Club name */}
      <Input
        label="Club Name"
        type="text"
        id="name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        required
      />

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2.5 text-sm bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-[var(--radius-md)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow duration-[var(--duration-fast)] resize-none"
        />
      </div>

      {/* Contact email */}
      <Input
        label="Contact Email"
        type="email"
        id="contactEmail"
        name="contactEmail"
        value={formData.contactEmail}
        onChange={handleChange}
      />

      {/* Contact phone */}
      <Input
        label="Contact Phone"
        type="tel"
        id="contactPhone"
        name="contactPhone"
        value={formData.contactPhone}
        onChange={handleChange}
      />

      {/* Submit button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        disabled={isLoading}
      >
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

function ClubAdminDashboard() {
  const { activeClub, isClubAdmin } = useClub();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('members');
  const [clubData, setClubData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch club details
  useEffect(() => {
    const fetchClub = async () => {
      if (!activeClub?._id) return;
      try {
        setIsLoading(true);
        const response = await clubAPI.getById(activeClub._id);
        setClubData(response.data.data.club);
      } catch (err) {
        console.error('Failed to fetch club:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClub();
  }, [activeClub?._id]);

  // Check admin access
  if (!isClubAdmin && !user?.isSuperadmin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-6">
          <Lock className="w-16 h-16 mx-auto text-[var(--color-text-tertiary)] mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-[var(--color-text-secondary)]">
            You need to be a club admin to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  const tabs = [
    { id: 'members', label: 'Members', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Club Administration</h1>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            Manage {clubData?.name || activeClub?.name || 'your club'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[var(--color-border)]">
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors duration-[var(--duration-fast)]
                  ${activeTab === tab.id
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }
                `}
              >
                <TabIcon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'members' && (
            <MembersTab clubId={activeClub?._id} currentUserId={user?._id} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab
              club={clubData || activeClub}
              onUpdate={(data) => setClubData(prev => ({ ...prev, ...data }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ClubAdminDashboard;
