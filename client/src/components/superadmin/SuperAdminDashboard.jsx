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
import { Plus, Building2, ChevronDown, Users, Mail, Phone, MapPin } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Club"
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Creating...' : 'Create Club'}
          </Button>
        </>
      }
    >
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 [data-theme=dark]:bg-red-900/30 border border-red-200 [data-theme=dark]:border-red-800 rounded-[var(--radius-md)] text-[var(--color-error)] text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Club Name */}
          <Input
            label="Club Name *"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter club name"
            required
            icon={Building2}
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-[var(--radius-md)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow duration-[var(--duration-fast)] resize-none"
              placeholder="Describe the club"
              rows={3}
            />
          </div>

          {/* Contact Email */}
          <Input
            label="Contact Email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="club@example.com"
            icon={Mail}
          />

          {/* Contact Phone */}
          <Input
            label="Contact Phone"
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="+44 123 456 7890"
            icon={Phone}
          />

          {/* Address section */}
          <div className="border-t border-[var(--color-border)] pt-4 mt-4">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--color-text-tertiary)]" />
              Address (Optional)
            </h3>

            <div className="space-y-3">
              <Input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Street address"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                />
                <Input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="Postal code"
                />
              </div>

              <Input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
              />
            </div>
          </div>
        </form>
      </div>
    </Modal>
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
    <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--duration-fast)]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Club image or placeholder */}
            <Avatar
              src={club.image}
              name={club.name}
              size="lg"
              className="!rounded-[var(--radius-md)]"
            />

            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)]">{club.name}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {club.memberCount} member{club.memberCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Expand/collapse icon */}
          <ChevronDown
            className={`w-5 h-5 text-[var(--color-text-tertiary)] transition-transform duration-[var(--duration-fast)] ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[var(--color-border)] pt-3 space-y-3">
          {club.description && (
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] uppercase font-medium">Description</p>
              <p className="text-sm mt-1 text-[var(--color-text-primary)]">{club.description}</p>
            </div>
          )}

          {club.contactEmail && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[var(--color-text-tertiary)]" />
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)] uppercase font-medium">Email</p>
                <p className="text-sm mt-0.5 text-[var(--color-text-primary)]">{club.contactEmail}</p>
              </div>
            </div>
          )}

          {club.contactPhone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[var(--color-text-tertiary)]" />
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)] uppercase font-medium">Phone</p>
                <p className="text-sm mt-0.5 text-[var(--color-text-primary)]">{club.contactPhone}</p>
              </div>
            </div>
          )}

          {formatAddress(club.address) && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--color-text-tertiary)]" />
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)] uppercase font-medium">Address</p>
                <p className="text-sm mt-0.5 text-[var(--color-text-primary)]">{formatAddress(club.address)}</p>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-[var(--color-text-tertiary)] uppercase font-medium">Created</p>
            <p className="text-sm mt-1 text-[var(--color-text-primary)]">{new Date(club.createdAt).toLocaleDateString()}</p>
          </div>

          {club.createdBy && (
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] uppercase font-medium">Created By</p>
              <p className="text-sm mt-1 text-[var(--color-text-primary)]">{club.createdBy.displayName || club.createdBy.username}</p>
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
          <div className="bg-red-50 [data-theme=dark]:bg-red-900/30 border border-red-200 [data-theme=dark]:border-red-800 text-[var(--color-error)] px-4 py-3 rounded-[var(--radius-md)]">
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
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Superadmin Dashboard</h1>
            <p className="text-[var(--color-text-secondary)]">Manage all clubs</p>
          </div>

          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-5 h-5" />
            Create Club
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 [data-theme=dark]:bg-red-900/30 border border-red-200 [data-theme=dark]:border-red-800 text-[var(--color-error)] rounded-[var(--radius-md)] text-sm">
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
              <Building2 className="w-8 h-8 text-[var(--color-text-tertiary)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-1">No clubs yet</h3>
            <p className="text-[var(--color-text-secondary)] mb-4">Create your first club to get started.</p>
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-5 h-5" />
              Create Club
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] border-t-2 border-t-[var(--color-primary)]">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--color-text-tertiary)]">Total Clubs</p>
                  <Badge variant="primary">
                    <Building2 className="w-3 h-3" />
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{clubs.length}</p>
              </div>
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] border-t-2 border-t-[var(--color-primary)]">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--color-text-tertiary)]">Total Members</p>
                  <Badge variant="primary">
                    <Users className="w-3 h-3" />
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
                  {clubs.reduce((sum, club) => sum + (club.memberCount || 0), 0)}
                </p>
              </div>
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] border-t-2 border-t-[var(--color-primary)]">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--color-text-tertiary)]">Avg Members/Club</p>
                  <Badge variant="primary">
                    <Users className="w-3 h-3" />
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
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
