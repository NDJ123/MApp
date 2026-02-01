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
// On mobile, the sidebar slides in/out and is hidden when viewing content.
//
// This is a "layout component" - it structures the page but delegates
// actual content to child components.
// =============================================================================

import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useClub } from '../../context/ClubContext';
import ContactList from '../users/ContactList';
import UserDirectory from '../users/UserDirectory';
import InviteManagement from '../invites/InviteManagement';
import ConversationView from './ConversationView';
import GroupList from '../groups/GroupList';
import CreateGroupModal from '../groups/CreateGroupModal';
import ProfileSettings from '../profile/ProfileSettings';
import ClubSwitcher from '../clubs/ClubSwitcher';
import ClubAdminDashboard from '../clubs/ClubAdminDashboard';

// =============================================================================
// MOBILE BREAKPOINT HOOK
// =============================================================================
// Returns true if viewport is mobile-sized (< 768px)
// =============================================================================

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

// =============================================================================
// SIDEBAR COMPONENT
// =============================================================================
// The left sidebar showing contacts, groups, and user info
// =============================================================================

function Sidebar({ onCreateGroup, onNavigate, onCloseMobile }) {
  const { user, logout } = useAuth();
  const { isClubAdmin } = useClub();
  const location = useLocation();
  const navigate = useNavigate();

  // Check which page is active
  const isDirectoryActive = location.pathname === '/chat/directory';
  const isInvitesActive = location.pathname === '/chat/invites';
  const isAdminActive = location.pathname === '/chat/admin';

  // Show admin link if user is club admin or superadmin
  const showAdminLink = isClubAdmin || user?.isSuperadmin;

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Handle navigation with mobile close
  const handleNavClick = () => {
    if (onNavigate) onNavigate();
  };

  // Get user initial for avatar
  const userInitial = user?.displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U';

  return (
    <aside className="w-[var(--sidebar-width)] h-full flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--color-primary)] tracking-tight">Padel<span className="text-[var(--color-text-primary)]">talk</span></h1>
        {/* Close button - only visible on mobile */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Club Switcher */}
      <div className="p-2 border-b border-[var(--color-border)]">
        <ClubSwitcher />
      </div>

      {/* Navigation buttons */}
      <div className="p-2 border-b border-[var(--color-border)] space-y-1">
        <Link
          to="/chat/directory"
          onClick={handleNavClick}
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
          onClick={handleNavClick}
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

        {/* Club Admin - only visible to admins */}
        {showAdminLink && (
          <Link
            to="/chat/admin"
            onClick={handleNavClick}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
              ${isAdminActive
                ? 'bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-primary)]'
                : 'hover:bg-[var(--color-surface-hover)]'
              }
            `}
          >
            {/* Shield/admin icon */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-sm font-medium">Club Admin</span>
          </Link>
        )}
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Contacts section */}
        <div className="mb-4">
          <h2 className="px-2 py-1 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
            Direct Messages
          </h2>
          <div className="mt-2" onClick={handleNavClick}>
            <ContactList />
          </div>
        </div>

        {/* Groups section */}
        <div>
          <h2 className="px-2 py-1 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
            Groups
          </h2>
          <div className="mt-2" onClick={handleNavClick}>
            <GroupList onCreateGroup={onCreateGroup} />
          </div>
        </div>
      </div>

      {/* User section at bottom */}
      <div className="p-3 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-2 px-2 py-2">
          {/* User avatar & info - clickable link to profile */}
          <Link
            to="/chat/profile"
            onClick={handleNavClick}
            className="flex items-center gap-3 flex-1 min-w-0 hover:bg-[var(--color-surface-hover)] rounded-lg p-1 -m-1 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
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
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.displayName || 'User'}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                @{user?.username || 'username'}
              </p>
            </div>
          </Link>

          {/* Settings button */}
          <Link
            to="/chat/profile"
            onClick={handleNavClick}
            className="p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
            title="Profile Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>

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

function WelcomeView({ onOpenSidebar, isMobile }) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Mobile header */}
      {isMobile && (
        <div className="h-14 px-4 flex items-center border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <button
            onClick={onOpenSidebar}
            className="p-2 -ml-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="ml-3 text-lg font-semibold text-[var(--color-primary)] tracking-tight">Padel<span className="text-[var(--color-text-primary)]">talk</span></h1>
        </div>
      )}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-4">
          <h2 className="text-2xl font-semibold mb-2">Welcome to <span className="text-[var(--color-primary)]">Padel</span>talk</h2>
          <p className="text-[var(--color-text-secondary)]">
            {isMobile ? 'Tap the menu to start a conversation' : 'Select a conversation to start messaging'}
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MOBILE HEADER COMPONENT
// =============================================================================
// Header bar shown on mobile with hamburger menu
// =============================================================================

function MobileHeader({ onOpenSidebar, title }) {
  return (
    <div className="md:hidden h-14 px-4 flex items-center border-b border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0">
      <button
        onClick={onOpenSidebar}
        className="p-2 -ml-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 className="ml-3 text-lg font-semibold">{title}</h1>
    </div>
  );
}

// =============================================================================
// WRAPPER COMPONENTS FOR ROUTES WITH MOBILE HEADER
// =============================================================================

function DirectoryWithHeader({ onOpenSidebar, isMobile }) {
  return (
    <div className="flex-1 flex flex-col h-full">
      {isMobile && <MobileHeader onOpenSidebar={onOpenSidebar} title="User Directory" />}
      <div className="flex-1 overflow-hidden">
        <UserDirectory />
      </div>
    </div>
  );
}

function InvitesWithHeader({ onOpenSidebar, isMobile }) {
  return (
    <div className="flex-1 flex flex-col h-full">
      {isMobile && <MobileHeader onOpenSidebar={onOpenSidebar} title="Invite Users" />}
      <div className="flex-1 overflow-hidden">
        <InviteManagement />
      </div>
    </div>
  );
}

function ConversationWithHeader({ onOpenSidebar, isMobile }) {
  return (
    <div className="flex-1 flex flex-col h-full">
      {isMobile && <MobileHeader onOpenSidebar={onOpenSidebar} title="Chat" />}
      <div className="flex-1 overflow-hidden">
        <ConversationView />
      </div>
    </div>
  );
}

function ProfileWithHeader({ onOpenSidebar, isMobile }) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {isMobile && <MobileHeader onOpenSidebar={onOpenSidebar} title="Profile Settings" />}
      <div className="flex-1 overflow-y-auto">
        <ProfileSettings />
      </div>
    </div>
  );
}

function AdminWithHeader({ onOpenSidebar, isMobile }) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {isMobile && <MobileHeader onOpenSidebar={onOpenSidebar} title="Club Admin" />}
      <div className="flex-1 overflow-y-auto">
        <ClubAdminDashboard />
      </div>
    </div>
  );
}

// =============================================================================
// MAIN CHAT LAYOUT COMPONENT
// =============================================================================

function ChatLayout() {
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isMobile = useIsMobile();
  const location = useLocation();

  // Close sidebar on mobile when route changes (user selected something)
  useEffect(() => {
    if (isMobile && location.pathname !== '/chat') {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Open sidebar by default on mobile when at /chat root
  useEffect(() => {
    if (isMobile && location.pathname === '/chat') {
      setIsSidebarOpen(true);
    }
  }, [isMobile, location.pathname]);

  // On desktop, sidebar is always visible
  useEffect(() => {
    if (!isMobile) {
      setIsSidebarOpen(true);
    }
  }, [isMobile]);

  const handleOpenSidebar = () => setIsSidebarOpen(true);
  const handleCloseSidebar = () => setIsSidebarOpen(false);
  const handleNavigate = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Invisible tap area to close sidebar - fully transparent */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleCloseSidebar}
        />
      )}

      {/* Sidebar - slides in/out on mobile */}
      <div
        className={`
          ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'}
          transform transition-transform duration-300 ease-in-out
          ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
        `}
      >
        <Sidebar
          onCreateGroup={() => setIsCreateGroupOpen(true)}
          onNavigate={handleNavigate}
          onCloseMobile={isMobile ? handleCloseSidebar : null}
        />
      </div>

      {/* Main content area - changes based on route */}
      <main className="flex-1 flex flex-col bg-[var(--color-background)] min-w-0">
        <Routes>
          {/* Default view - no conversation selected */}
          <Route
            index
            element={
              <WelcomeView
                onOpenSidebar={handleOpenSidebar}
                isMobile={isMobile}
              />
            }
          />

          {/* User Directory */}
          <Route
            path="directory"
            element={
              <DirectoryWithHeader
                onOpenSidebar={handleOpenSidebar}
                isMobile={isMobile}
              />
            }
          />

          {/* Invite Management */}
          <Route
            path="invites"
            element={
              <InvitesWithHeader
                onOpenSidebar={handleOpenSidebar}
                isMobile={isMobile}
              />
            }
          />

          {/* Direct message view */}
          <Route
            path="dm/:userId"
            element={
              <ConversationWithHeader
                onOpenSidebar={handleOpenSidebar}
                isMobile={isMobile}
              />
            }
          />

          {/* Group chat view */}
          <Route
            path="group/:groupId"
            element={
              <ConversationWithHeader
                onOpenSidebar={handleOpenSidebar}
                isMobile={isMobile}
              />
            }
          />

          {/* Profile Settings */}
          <Route
            path="profile"
            element={
              <ProfileWithHeader
                onOpenSidebar={handleOpenSidebar}
                isMobile={isMobile}
              />
            }
          />

          {/* Club Admin Dashboard */}
          <Route
            path="admin"
            element={
              <AdminWithHeader
                onOpenSidebar={handleOpenSidebar}
                isMobile={isMobile}
              />
            }
          />
        </Routes>
      </main>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
      />
    </div>
  );
}

export default ChatLayout;
