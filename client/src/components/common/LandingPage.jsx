// =============================================================================
// LANDING PAGE
// =============================================================================
// The first page users see when they visit the app.
// It introduces the app and provides links to login/signup.
// Orange + Dark palette with Nettla-inspired clean aesthetic.
// =============================================================================

import { Link } from 'react-router-dom';
import { MessageCircle, Zap, Users, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

function LandingPage() {
  const { theme, toggleTheme, isDark } = useTheme();

  const themeIcon = () => {
    if (theme === 'dark') return <Moon className="w-5 h-5" />;
    if (theme === 'light') return <Sun className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      {/* -------------------------------------------------------------------
          HEADER / NAVIGATION
          ------------------------------------------------------------------- */}
      <header className="flex items-center justify-between px-6 py-8 border-b border-[var(--color-border)]">
        {/* Logo / App name */}
        <div className="text-2xl font-bold tracking-tight">
          <span className="text-[var(--color-primary)]">Padel</span>
          <span className="text-[var(--color-text-primary)]">talk</span>
        </div>

        {/* Navigation links */}
        <nav className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
            aria-label="Toggle theme"
          >
            {themeIcon()}
          </button>
          <Link
            to="/login"
            className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--color-primary-hover)] transition-colors shadow-[var(--shadow-sm)]"
          >
            Sign Up
          </Link>
        </nav>
      </header>

      {/* -------------------------------------------------------------------
          HERO SECTION
          ------------------------------------------------------------------- */}
      <main className="flex-1 flex items-center justify-center px-6 py-16 relative overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 via-transparent to-amber-500/5 pointer-events-none" />

        <div className="max-w-2xl text-center relative z-10 animate-slide-up">
          {/* Main headline */}
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Simple, Fast, Reliable
            <span className="block bg-gradient-to-r from-[var(--color-primary)] to-amber-500 bg-clip-text text-transparent">
              Messaging
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-[var(--color-text-secondary)] mb-10 max-w-lg mx-auto">
            Connect with friends and groups in real-time.
            No clutter, no distractions — just messaging done right.
          </p>

          {/* Feature hints */}
          <div className="flex items-center justify-center gap-8 mb-10 text-[var(--color-text-tertiary)]">
            <div className="flex items-center gap-2 text-sm">
              <MessageCircle className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Real-time chat</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Lightning fast</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Group channels</span>
            </div>
          </div>

          {/* Call to action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[var(--color-primary)] to-amber-500 text-white rounded-[var(--radius-md)] font-medium hover:opacity-90 transition-all shadow-[var(--shadow-md)]"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 border border-[var(--color-border)] rounded-[var(--radius-md)] font-medium hover:bg-[var(--color-surface)] transition-colors text-[var(--color-text-primary)]"
            >
              I have an account
            </Link>
          </div>

          {/* Invite note */}
          <p className="mt-8 text-sm text-[var(--color-text-tertiary)]">
            Padeltalk is invite-only. You'll need an invite code to sign up.
          </p>
        </div>
      </main>

      {/* -------------------------------------------------------------------
          FOOTER
          ------------------------------------------------------------------- */}
      <footer className="py-6 text-center text-sm text-[var(--color-text-tertiary)] border-t border-[var(--color-border)]">
        &copy; {new Date().getFullYear()} Padeltalk. All rights reserved.
      </footer>
    </div>
  );
}

export default LandingPage;
