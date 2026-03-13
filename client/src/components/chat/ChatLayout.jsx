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
import { useTheme } from '../../context/ThemeContext';
import {
  X,
  Menu,
  BookUser,
  UserRoundPlus,
  SlidersHorizontal,
  Crown,
  Settings,
  LogOut,
  MessageCircle,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import ContactList from '../users/ContactList';
import UserDirectory from '../users/UserDirectory';
import InviteManagement from '../invites/InviteManagement';
import ConversationView from './ConversationView';
import GroupList from '../groups/GroupList';
import CreateGroupModal from '../groups/CreateGroupModal';
import ProfileSettings from '../profile/ProfileSettings';
import ClubSwitcher from '../clubs/ClubSwitcher';
import ClubAdminDashboard from '../clubs/ClubAdminDashboard';
import SuperAdminDashboard from '../superadmin/SuperAdminDashboard';

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
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Check which page is active
  const isDirectoryActive = location.pathname === '/chat/directory';
  const isInvitesActive = location.pathname === '/chat/invites';
  const isAdminActive = location.pathname === '/chat/admin';
  const isSuperadminActive = location.pathname === '/chat/superadmin';

  // Show admin link if user is club admin or superadmin
  const showAdminLink = isClubAdmin || user?.isSuperadmin;
  const showSuperadminLink = user?.isSuperadmin;

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Handle navigation with mobile close
  const handleNavClick = () => {
    if (onNavigate) onNavigate();
  };

  // Theme icon based on current theme
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <aside className="w-[var(--sidebar-width)] h-full flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--color-primary)] tracking-tight">Padel<span className="text-[var(--color-text-primary)]">talk</span></h1>
        {/* Close button - only visible on mobile */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-md)] transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
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
            flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] transition-colors
            ${isDirectoryActive
              ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
            }
          `}
        >
          <BookUser className="w-5 h-5" />
          <span className="text-sm font-medium">User Directory</span>
        </Link>

        <Link
          to="/chat/invites"
          onClick={handleNavClick}
          className={`
            flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] transition-colors
            ${isInvitesActive
              ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
            }
          `}
        >
          <UserRoundPlus className="w-5 h-5" />
          <span className="text-sm font-medium">Invite Users</span>
        </Link>

        {/* Club Admin - only visible to admins */}
        {showAdminLink && (
          <Link
            to="/chat/admin"
            onClick={handleNavClick}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] transition-colors
              ${isAdminActive
                ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
              }
            `}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="text-sm font-medium">Club Admin</span>
          </Link>
        )}

        {/* Superadmin - only visible to superadmins */}
        {showSuperadminLink && (
          <Link
            to="/chat/superadmin"
            onClick={handleNavClick}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] transition-colors
              ${isSuperadminActive
                ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
              }
            `}
          >
            <Crown className="w-5 h-5" />
            <span className="text-sm font-medium">Superadmin</span>
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
            className="flex items-center gap-3 flex-1 min-w-0 hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-md)] p-1 -m-1 transition-colors"
          >
            <Avatar
              src={user?.avatar}
              name={user?.displayName || user?.username || 'U'}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.displayName || 'User'}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                @{user?.username || 'username'}
              </p>
            </div>
          </Link>

          {/* Theme toggle button */}
          <button
            onClick={toggleTheme}
            className="p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-md)] transition-colors"
            title={`Theme: ${theme}`}
          >
            <ThemeIcon className="w-5 h-5" />
          </button>

          {/* Settings button */}
          <Link
            to="/chat/profile"
            onClick={handleNavClick}
            className="p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-md)] transition-colors"
            title="Profile Settings"
          >
            <Settings className="w-5 h-5" />
          </Link>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-md)] transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
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
            className="p-2 -ml-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-md)] transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="ml-3 text-lg font-semibold text-[var(--color-primary)] tracking-tight">Padel<span className="text-[var(--color-text-primary)]">talk</span></h1>
        </div>
      )}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-[var(--color-primary-muted)] flex items-center justify-center shadow-[var(--shadow-md)]">
            <MessageCircle className="w-10 h-10 text-[var(--color-primary)]" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Welcome to <span className="text-[var(--color-primary)]">Padel</span>talk</h2>
          <p className="text-[var(--color-text-secondary)] max-w-sm mx-auto">
            {isMobile ? 'Tap the menu to start a conversation' : 'Select a conversation from the sidebar to start messaging'}
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-4">
            Your messages are just a click away
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
        className="p-2 -ml-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-md)] transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
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

function SuperadminWithHeader({ onOpenSidebar, isMobile }) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {isMobile && <MobileHeader onOpenSidebar={onOpenSidebar} title="Superadmin" />}
      <div className="flex-1 overflow-y-auto">
        <SuperAdminDashboard />
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
          ${isMobile ? 'fixed inset-y-0 left-0 z-50 shadow-[var(--shadow-md)]' : 'relative'}
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

          {/* Superadmin Dashboard */}
          <Route
            path="superadmin"
            element={
              <SuperadminWithHeader
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
