// =============================================================================
// INVITE MANAGEMENT COMPONENT
// =============================================================================
// Allows users to generate invite codes and view their existing invites.
// This is how new users get added to the app - existing users share codes.
// =============================================================================

import { useState, useEffect } from 'react';
import { inviteAPI } from '../../services/api';
import Spinner from '../common/Spinner';

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
      p-4 rounded-lg border
      ${invite.used
        ? 'bg-[var(--color-surface)] border-[var(--color-border)] opacity-60'
        : 'bg-[var(--color-surface)] border-[var(--color-border)]'
      }
    `}>
      <div className="flex items-center justify-between">
        <div>
          {/* Invite code */}
          <code className="text-lg font-mono font-bold tracking-wider">
            {invite.code}
          </code>

          {/* Status badge */}
          <div className="mt-1 flex items-center gap-2">
            {invite.used ? (
              <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                Used
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                Available
              </span>
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
          <button
            onClick={handleCopy}
            className={`
              px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${copied
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
              }
            `}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
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
          <h1 className="text-2xl font-bold">Invite Management</h1>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            Generate invite codes to add new users to MApp
          </p>
        </div>

        {/* Create invite button */}
        <div className="mb-6">
          <button
            onClick={handleCreateInvite}
            disabled={isCreating}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <Spinner size="small" />
                Creating...
              </>
            ) : (
              <>
                {/* Plus icon */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Generate New Invite
              </>
            )}
          </button>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
            {successMessage}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Invites list */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Your Invites</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
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
        <div className="mt-8 p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          <h3 className="font-medium mb-2">How to invite someone</h3>
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
