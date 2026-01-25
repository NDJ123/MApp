// =============================================================================
// LOGIN PAGE
// =============================================================================
// Handles user authentication. Users enter their email and password,
// and we verify them against our database.
//
// Form handling in React:
// - We use "controlled components" where React controls the input values
// - useState holds the form data
// - onChange updates state when user types
// - onSubmit handles form submission
// =============================================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';

function LoginPage() {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  // Form data - controlled inputs
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  // Update form data when user types
  // We use a single handler for all inputs by using the input's "name" attribute
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,      // Keep existing values
      [name]: value // Update the changed field
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    // Prevent default form submission (page reload)
    e.preventDefault();

    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: Replace with actual API call in Phase 2
      console.log('Login attempt:', formData.email);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: On success, store token and redirect to /chat
      alert('Login functionality will be implemented in Phase 2!');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {/* Card container */}
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-[var(--color-primary)]">
            MApp
          </Link>
          <h1 className="mt-6 text-2xl font-semibold">Welcome back</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Sign in to continue to your conversations
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Email field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-2"
            >
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
              className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow"
            />
          </div>

          {/* Password field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium"
              >
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow"
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
                {/* Simple spinner */}
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
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Sign up link */}
        <p className="mt-8 text-center text-[var(--color-text-secondary)]">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-[var(--color-primary)] hover:underline font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
