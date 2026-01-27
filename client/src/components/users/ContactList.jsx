// =============================================================================
// CONTACT LIST COMPONENT
// =============================================================================
// Displays the current user's contact list in the sidebar.
// Clicking a contact opens a direct message conversation.
//
// Features:
// - Shows all contacts with avatar and name
// - Click to open DM
// - Empty state with link to user directory
// - Auto-updates when contacts are added/removed via ContactContext
// =============================================================================

import { Link, useNavigate } from 'react-router-dom';
import { useContacts } from '../../context/ContactContext';
import { useSocket } from '../../context/SocketContext';
import Spinner from '../common/Spinner';

// =============================================================================
// CONTACT ITEM COMPONENT
// =============================================================================
// A single contact in the list
// =============================================================================

function ContactItem({ contact, isActive, isOnline, onClick }) {
  // Get first letter for avatar
  const initial = (contact.displayName || contact.username || '?')[0].toUpperCase();

  return (
    <button
      onClick={() => onClick(contact)}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left
        ${isActive
          ? 'bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-primary)]'
          : 'hover:bg-[var(--color-surface-hover)]'
        }
      `}
    >
      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-medium">
          {contact.avatar ? (
            <img
              src={contact.avatar}
              alt={contact.displayName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
        {/* Online indicator */}
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[var(--color-bg)]" />
        )}
      </div>

      {/* Name */}
      <span className="text-sm truncate">{contact.displayName}</span>
    </button>
  );
}

// =============================================================================
// MAIN CONTACT LIST COMPONENT
// =============================================================================

function ContactList({ activeContactId, onContactSelect }) {
  // -------------------------------------------------------------------------
  // HOOKS
  // -------------------------------------------------------------------------

  const navigate = useNavigate();
  const { isUserOnline } = useSocket();
  const { contacts, isLoading, error, fetchContacts } = useContacts();

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------

  const handleContactClick = (contact) => {
    // Notify parent component if callback provided
    if (onContactSelect) {
      onContactSelect(contact);
    }
    // Navigate to DM view
    navigate(`/chat/dm/${contact._id}`);
  };

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner size="small" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="px-3 py-4 text-center">
        <p className="text-xs text-red-500 mb-2">{error}</p>
        <button
          onClick={fetchContacts}
          className="text-xs text-[var(--color-primary)] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (contacts.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <p className="text-xs text-[var(--color-text-tertiary)] mb-2">
          No contacts yet
        </p>
        <Link
          to="/chat/directory"
          className="text-xs text-[var(--color-primary)] hover:underline"
        >
          Browse user directory
        </Link>
      </div>
    );
  }

  // Contact list
  return (
    <div className="space-y-1">
      {contacts.map(contact => (
        <ContactItem
          key={contact._id}
          contact={contact}
          isActive={activeContactId === contact._id}
          isOnline={isUserOnline(contact._id)}
          onClick={handleContactClick}
        />
      ))}
    </div>
  );
}

// =============================================================================
// EXPORT
// =============================================================================
// We also export a hook to refresh contacts from other components
// =============================================================================

export default ContactList;
