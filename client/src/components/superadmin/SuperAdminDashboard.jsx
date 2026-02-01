// =============================================================================
// SUPERADMIN DASHBOARD
// =============================================================================
// Dashboard for superadmins to manage all clubs in the system.
//
// Features:
// - View all clubs
// - Create new clubs
// - View club member counts
// - Deactivate clubs (soft delete)
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { clubAPI } from '../../services/api';

// =============================================================================
// CREATE CLUB MODAL
// =============================================================================

function CreateClubModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Club name must be at least 2 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const clubData = {
        name: name.trim(),
        description: description.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        address: {
          street: street.trim(),
          city: city.trim(),
          postalCode: postalCode.trim(),
          country: country.trim(),
        },
      };

      await clubAPI.create(clubData);

      // Reset form
      setName('');
      setDescription('');
      setContactEmail('');
      setContactPhone('');
      setStreet('');
      setCity('');
      setPostalCode('');
      setCountry('');

      onCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create club');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--color-surface)] rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Club</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Club Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Club Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-background)]"
                placeholder="Enter club name"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-background)] resize-none"
                placeholder="Describe the club"
                rows={3}
              />
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-background)]"
                placeholder="club@example.com"
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-background)]"
                placeholder="+44 123 456 7890"
              />
            </div>

            {/* Address section */}
            <div className="border-t border-[var(--color-border)] pt-4 mt-4">
              <h3 className="text-sm font-medium mb-3">Address (Optional)</h3>

              <div className="space-y-3">
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-background)]"
                  placeholder="Street address"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-background)]"
                    placeholder="City"
                  />
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-background)]"
                    placeholder="Postal code"
                  />
                </div>

                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-background)]"
                  placeholder="Country"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Club'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CLUB CARD
// =============================================================================

function ClubCard({ club, onRefresh }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatAddress = (address) => {
    if (!address) return null;
    const parts = [address.street, address.city, address.postalCode, address.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-[var(--color-surface)]">
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Club image or placeholder */}
            <div className="w-12 h-12 rounded-lg bg-[var(--color-primary)] bg-opacity-10 flex items-center justify-center">
              {club.image ? (
                <img
                  src={club.image}
                  alt={club.name}
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-[var(--color-primary)]">
                  {club.name[0].toUpperCase()}
                </span>
              )}
            </div>

            <div>
              <h3 className="font-semibold">{club.name}</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {club.memberCount} member{club.memberCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Expand/collapse icon */}
          <svg
            className={`w-5 h-5 text-[var(--color-text-tertiary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[var(--color-border)] pt-3 space-y-3">
          {club.description && (
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] uppercase font-medium">Description</p>
              <p className="text-sm mt-1">{club.description}</p>
            </div>
          )}

          {club.contactEmail && (
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] uppercase font-medium">Email</p>
              <p className="text-sm mt-1">{club.contactEmail}</p>
            </div>
          )}

          {club.contactPhone && (
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] uppercase font-medium">Phone</p>
              <p className="text-sm mt-1">{club.contactPhone}</p>
            </div>
          )}

          {formatAddress(club.address) && (
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] uppercase font-medium">Address</p>
              <p className="text-sm mt-1">{formatAddress(club.address)}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-[var(--color-text-tertiary)] uppercase font-medium">Created</p>
            <p className="text-sm mt-1">{new Date(club.createdAt).toLocaleDateString()}</p>
          </div>

          {club.createdBy && (
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] uppercase font-medium">Created By</p>
              <p className="text-sm mt-1">{club.createdBy.displayName || club.createdBy.username}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN SUPERADMIN DASHBOARD
// =============================================================================

function SuperAdminDashboard() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch all clubs
  const fetchClubs = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await clubAPI.getAll();
      setClubs(response.data.data.clubs || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load clubs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchClubs();
    }
  }, [user, fetchClubs]);

  // Check if user is superadmin
  if (!user?.isSuperadmin) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-medium">Access Denied</p>
            <p className="text-sm">You must be a superadmin to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Superadmin Dashboard</h1>
            <p className="text-[var(--color-text-secondary)]">Manage all clubs</p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Club
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
          </div>
        ) : clubs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-1">No clubs yet</h3>
            <p className="text-[var(--color-text-secondary)] mb-4">Create your first club to get started.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Club
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
                <p className="text-sm text-[var(--color-text-tertiary)]">Total Clubs</p>
                <p className="text-2xl font-bold">{clubs.length}</p>
              </div>
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
                <p className="text-sm text-[var(--color-text-tertiary)]">Total Members</p>
                <p className="text-2xl font-bold">
                  {clubs.reduce((sum, club) => sum + (club.memberCount || 0), 0)}
                </p>
              </div>
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
                <p className="text-sm text-[var(--color-text-tertiary)]">Avg Members/Club</p>
                <p className="text-2xl font-bold">
                  {clubs.length > 0
                    ? Math.round(clubs.reduce((sum, club) => sum + (club.memberCount || 0), 0) / clubs.length)
                    : 0
                  }
                </p>
              </div>
            </div>

            {/* Club list */}
            <div className="space-y-3">
              {clubs.map((club) => (
                <ClubCard
                  key={club._id}
                  club={club}
                  onRefresh={fetchClubs}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Club Modal */}
      <CreateClubModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={fetchClubs}
      />
    </div>
  );
}

export default SuperAdminDashboard;
