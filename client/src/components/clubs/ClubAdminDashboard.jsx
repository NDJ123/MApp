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
import Spinner from '../common/Spinner';

// =============================================================================
// MEMBER CARD COMPONENT
// =============================================================================

function MemberCard({ member, currentUserId, onPromote, onDemote, onRemove, isLoading }) {
  const initial = (member.displayName || member.username || '?')[0].toUpperCase();
  const isCurrentUser = member._id === currentUserId;

  return (
    <div className="flex items-center gap-4 p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-lg font-medium flex-shrink-0">
        {member.avatar ? (
          <img
            src={member.avatar}
            alt={member.displayName}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          initial
        )}
      </div>

      {/* Member info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-[var(--color-text-primary)] truncate">
            {member.displayName}
          </h3>
          {member.role === 'admin' && (
            <span className="text-xs px-2 py-0.5 bg-[var(--color-primary)] bg-opacity-20 text-[var(--color-primary)] rounded font-medium">
              Admin
            </span>
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
            <button
              onClick={() => onPromote(member._id)}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
              title="Promote to admin"
            >
              {isLoading ? <Spinner size="small" /> : 'Promote'}
            </button>
          ) : (
            <button
              onClick={() => onDemote(member._id)}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] rounded-lg hover:bg-orange-500 hover:text-white disabled:opacity-50 transition-colors"
              title="Demote to member"
            >
              {isLoading ? <Spinner size="small" /> : 'Demote'}
            </button>
          )}
          <button
            onClick={() => onRemove(member._id)}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] rounded-lg hover:bg-red-500 hover:text-white disabled:opacity-50 transition-colors"
            title="Remove from club"
          >
            {isLoading ? <Spinner size="small" /> : 'Remove'}
          </button>
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
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search members..."
          className="w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
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
        <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          Settings updated successfully!
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Club name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          Club Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-2">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
        />
      </div>

      {/* Contact email */}
      <div>
        <label htmlFor="contactEmail" className="block text-sm font-medium mb-2">
          Contact Email
        </label>
        <input
          type="email"
          id="contactEmail"
          name="contactEmail"
          value={formData.contactEmail}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>

      {/* Contact phone */}
      <div>
        <label htmlFor="contactPhone" className="block text-sm font-medium mb-2">
          Contact Phone
        </label>
        <input
          type="tel"
          id="contactPhone"
          name="contactPhone"
          value={formData.contactPhone}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading}
        className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Spinner size="small" />
            Saving...
          </span>
        ) : (
          'Save Changes'
        )}
      </button>
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
          <svg className="w-16 h-16 mx-auto text-[var(--color-text-tertiary)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
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
    { id: 'members', label: 'Members', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Club Administration</h1>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            Manage {clubData?.name || activeClub?.name || 'your club'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[var(--color-border)]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors
                ${activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
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
