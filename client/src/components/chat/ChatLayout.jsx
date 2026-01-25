// =============================================================================
// CHAT LAYOUT
// =============================================================================
// The main layout for the chat application after login.
// Uses a classic Slack-style layout:
//
// +------------------+------------------------+
// |                  |                        |
// |    SIDEBAR       |     MAIN CONTENT       |
// |                  |                        |
// | - Conversations  |  - Message List        |
// | - Groups         |  - Message Input       |
// | - Contacts       |                        |
// |                  |                        |
// +------------------+------------------------+
//
// This is a "layout component" - it structures the page but delegates
// actual content to child components.
// =============================================================================

import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ContactList from '../users/ContactList';
import UserDirectory from '../users/UserDirectory';
import InviteManagement from '../invites/InviteManagement';
import ConversationView from './ConversationView';

// =============================================================================
// SIDEBAR COMPONENT
// =============================================================================
// The left sidebar showing contacts, groups, and user info
// =============================================================================

function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Check which page is active
  const isDirectoryActive = location.pathname === '/chat/directory';
  const isInvitesActive = location.pathname === '/chat/invites';

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Get user initial for avatar
  const userInitial = user?.displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U';

  return (
    <aside className="w-[var(--sidebar-width)] h-screen flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <h1 className="text-xl font-bold text-[var(--color-primary)]">MApp</h1>
      </div>

      {/* Navigation buttons */}
      <div className="p-2 border-b border-[var(--color-border)] space-y-1">
        <Link
          to="/chat/directory"
          className={`
            flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
            ${isDirectoryActive
              ? 'bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-primary)]'
              : 'hover:bg-[var(--color-surface-hover)]'
            }
          `}
        >
          {/* Users icon */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-sm font-medium">User Directory</span>
        </Link>

        <Link
          to="/chat/invites"
          className={`
            flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
            ${isInvitesActive
              ? 'bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-primary)]'
              : 'hover:bg-[var(--color-surface-hover)]'
            }
          `}
        >
          {/* Invite/ticket icon */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
          <span className="text-sm font-medium">Invite Users</span>
        </Link>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Contacts section */}
        <div className="mb-4">
          <h2 className="px-2 py-1 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
            Direct Messages
          </h2>
          <div className="mt-2">
            <ContactList />
          </div>
        </div>

        {/* Groups section - placeholder for Phase 4 */}
        <div>
          <h2 className="px-2 py-1 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
            Groups
          </h2>
          <div className="mt-2 px-3 py-4 text-center">
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Coming soon
            </p>
          </div>
        </div>
      </div>

      {/* User section at bottom */}
      <div className="p-3 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-3 px-2 py-2">
          {/* User avatar */}
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-medium">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              userInitial
            )}
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.displayName || 'User'}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] truncate">
              @{user?.username || 'username'}
            </p>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

function WelcomeView() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Welcome to MApp</h2>
        <p className="text-[var(--color-text-secondary)]">
          Select a conversation to start messaging
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN CHAT LAYOUT COMPONENT
// =============================================================================

function ChatLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - always visible */}
      <Sidebar />

      {/* Main content area - changes based on route */}
      <main className="flex-1 flex flex-col bg-[var(--color-background)]">
        <Routes>
          {/* Default view - no conversation selected */}
          <Route index element={<WelcomeView />} />

          {/* User Directory */}
          <Route path="directory" element={<UserDirectory />} />

          {/* Invite Management */}
          <Route path="invites" element={<InviteManagement />} />

          {/* Direct message view */}
          <Route path="dm/:userId" element={<ConversationView />} />

          {/* Group chat view */}
          <Route path="group/:groupId" element={<ConversationView />} />
        </Routes>
      </main>
    </div>
  );
}

export default ChatLayout;
