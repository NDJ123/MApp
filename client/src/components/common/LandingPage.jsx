// =============================================================================
// LANDING PAGE
// =============================================================================
// The first page users see when they visit the app.
// It introduces the app and provides links to login/signup.
//
// This is a simple "presentational" component - it just renders UI.
// No complex state or side effects needed here.
// =============================================================================

import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    // Full-height container with centered content
    <div className="min-h-screen flex flex-col">
      {/* -------------------------------------------------------------------
          HEADER / NAVIGATION
          ------------------------------------------------------------------- */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
        {/* Logo / App name */}
        <div className="text-xl font-bold text-[var(--color-primary)] tracking-tight">
          Padel<span className="text-[var(--color-text-primary)]">talk</span>
        </div>

        {/* Navigation links */}
        <nav className="flex items-center gap-4">
          <Link
            to="/login"
            className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Sign Up
          </Link>
        </nav>
      </header>

      {/* -------------------------------------------------------------------
          HERO SECTION
          ------------------------------------------------------------------- */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          {/* Main headline */}
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Simple, Fast, Reliable
            <span className="block text-[var(--color-primary)]">Messaging</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-[var(--color-text-secondary)] mb-8">
            Connect with friends and groups in real-time.
            No clutter, no distractions — just messaging done right.
          </p>

          {/* Call to action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3 border border-[var(--color-border)] rounded-lg font-medium hover:bg-[var(--color-surface)] transition-colors"
            >
              I have an account
            </Link>
          </div>

          {/* Invite note */}
          <p className="mt-6 text-sm text-[var(--color-text-tertiary)]">
            Padeltalk is invite-only. You'll need an invite code to sign up.
          </p>
        </div>
      </main>

      {/* -------------------------------------------------------------------
          FOOTER
          ------------------------------------------------------------------- */}
      <footer className="py-6 text-center text-sm text-[var(--color-text-tertiary)]">
        Built with React, Node.js, and Socket.io
      </footer>
    </div>
  );
}

export default LandingPage;
