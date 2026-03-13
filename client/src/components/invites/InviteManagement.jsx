// =============================================================================
// INVITE MANAGEMENT COMPONENT
// =============================================================================
// Allows users to generate invite codes and view their existing invites.
// This is how new users get added to the app - existing users share codes.
// =============================================================================

import { useState, useEffect } from 'react';
import { inviteAPI } from '../../services/api';
import { Plus, Copy, Check, Ticket } from 'lucide-react';
import Spinner from '../common/Spinner';
import Skeleton, { CardSkeleton } from '../ui/Skeleton';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

// =============================================================================
// INVITE CARD COMPONENT
// =============================================================================
// Displays a single invite with copy functionality
// =============================================================================

function InviteCard({ invite, onCopy }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(invite.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onCopy) onCopy(invite.code);
  };

  // Format the date
  const createdDate = new Date(invite.createdAt).toLocaleDateString();

  return (
    <div className={`
      p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] bg-[var(--color-surface)]
      ${invite.used ? 'opacity-60' : ''}
    `}>
      <div className="flex items-center justify-between">
        <div>
          {/* Invite code */}
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[var(--color-primary)]" />
            <code className="text-lg font-mono font-bold tracking-wider text-[var(--color-text-primary)]">
              {invite.code}
            </code>
          </div>

          {/* Status badge */}
          <div className="mt-2 flex items-center gap-2">
            {invite.used ? (
              <Badge variant="neutral">Used</Badge>
            ) : (
              <Badge variant="success">Available</Badge>
            )}
            <span className="text-xs text-[var(--color-text-tertiary)]">
              Created {createdDate}
            </span>
          </div>

          {/* Who used it */}
          {invite.used && invite.usedBy && (
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              Used by {invite.usedBy.displayName || invite.usedBy.username}
            </p>
          )}
        </div>

        {/* Copy button - only for unused invites */}
        {!invite.used && (
          <Button
            variant={copied ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleCopy}
            className={copied ? '!text-green-600 !border-green-300' : ''}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN INVITE MANAGEMENT COMPONENT
// =============================================================================

function InviteManagement() {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [invites, setInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // ---------------------------------------------------------------------------
  // FETCH INVITES
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await inviteAPI.getAll();
      setInvites(response.data.data.invites);
    } catch (err) {
      setError(err.message || 'Failed to load invites');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // CREATE INVITE
  // ---------------------------------------------------------------------------

  const handleCreateInvite = async () => {
    try {
      setIsCreating(true);
      setError(null);
      setSuccessMessage('');

      const response = await inviteAPI.create();
      const newInvite = response.data.data.invite;

      // Add to list
      setInvites(prev => [newInvite, ...prev]);
      setSuccessMessage(`Invite code ${newInvite.code} created!`);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to create invite');
    } finally {
      setIsCreating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Invite Management</h1>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            Generate invite codes to add new users to Padeltalk
          </p>
        </div>

        {/* Create invite button */}
        <div className="mb-6">
          <Button
            variant="primary"
            size="md"
            onClick={handleCreateInvite}
            isLoading={isCreating}
            disabled={isCreating}
          >
            {isCreating ? (
              'Creating...'
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Generate New Invite
              </>
            )}
          </Button>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 [data-theme=dark]:bg-green-900/30 border border-green-200 [data-theme=dark]:border-green-800 rounded-[var(--radius-md)] text-green-700 [data-theme=dark]:text-green-400 text-sm">
            {successMessage}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 [data-theme=dark]:bg-red-900/30 border border-red-200 [data-theme=dark]:border-red-800 rounded-[var(--radius-md)] text-[var(--color-error)] text-sm">
            {error}
          </div>
        )}

        {/* Invites list */}
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Your Invites</h2>

          {isLoading ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <Ticket className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>You haven't created any invites yet.</p>
              <p className="mt-1">Click "Generate New Invite" to create one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map(invite => (
                <InviteCard key={invite._id} invite={invite} />
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)]">
          <h3 className="font-medium text-[var(--color-text-primary)] mb-2">How to invite someone</h3>
          <ol className="text-sm text-[var(--color-text-secondary)] space-y-1 list-decimal list-inside">
            <li>Click "Generate New Invite" to create a code</li>
            <li>Copy the invite code</li>
            <li>Share it with the person you want to invite</li>
            <li>They enter the code when signing up at the registration page</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default InviteManagement;
