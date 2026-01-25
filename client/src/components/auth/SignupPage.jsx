// =============================================================================
// SIGNUP PAGE
// =============================================================================
// Handles new user registration. Users need:
// 1. A valid invite code (invite-only system)
// 2. Username, email, password, and display name
//
// This is more complex than login because we have more fields to validate.
// We'll add proper validation in Phase 2 when we connect to the backend.
// =============================================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';

function SignupPage() {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  // Form data
  const [formData, setFormData] = useState({
    inviteCode: '',
    username: '',
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    const { inviteCode, username, email, displayName, password, confirmPassword } = formData;

    if (!inviteCode || !username || !email || !displayName || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (username.length < 3 || username.length > 30) {
      setError('Username must be 3-30 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: Replace with actual API call in Phase 2
      console.log('Signup attempt:', { username, email, displayName });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: On success, store token and redirect to /chat
      alert('Signup functionality will be implemented in Phase 2!');
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-[var(--color-primary)]">
            MApp
          </Link>
          <h1 className="mt-6 text-2xl font-semibold">Create your account</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Enter your invite code to get started
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Invite code field */}
          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium mb-2">
              Invite Code
            </label>
            <input
              type="text"
              id="inviteCode"
              name="inviteCode"
              value={formData.inviteCode}
              onChange={handleChange}
              placeholder="Enter your invite code"
              className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {/* Username field */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="johndoe"
              autoComplete="username"
              className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              3-30 characters, letters and numbers only
            </p>
          </div>

          {/* Email field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {/* Display name field */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium mb-2">
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              placeholder="John Doe"
              autoComplete="name"
              className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              This is how others will see you
            </p>
          </div>

          {/* Password field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              Minimum 8 characters
            </p>
          </div>

          {/* Confirm password field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Creating account...
              </span>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        {/* Login link */}
        <p className="mt-8 text-center text-[var(--color-text-secondary)]">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-[var(--color-primary)] hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
