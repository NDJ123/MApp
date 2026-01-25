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
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function LoginPage() {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------
  // useNavigate - programmatic navigation
  // useLocation - access location state (for redirect after login)
  // useAuth - authentication methods and state
  // ---------------------------------------------------------------------------

  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading: authLoading, error: authError, clearError } = useAuth();

  // Get the page user was trying to access (if any)
  const from = location.state?.from?.pathname || '/chat';

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [localError, setLocalError] = useState('');

  // Combine auth error and local validation error
  const error = localError || authError;
  const isLoading = authLoading;

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear errors when user starts typing
    if (localError) setLocalError('');
    if (authError) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.email || !formData.password) {
      setLocalError('Please fill in all fields');
      return;
    }

    setLocalError('');

    // Call login from AuthContext
    const result = await login({
      email: formData.email,
      password: formData.password,
    });

    if (result.success) {
      // Redirect to the page they were trying to access, or /chat
      navigate(from, { replace: true });
    }
    // If login fails, authError will be set by AuthContext
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
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
              disabled={isLoading}
              className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow disabled:opacity-50"
            />
          </div>

          {/* Password field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium">
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
              disabled={isLoading}
              className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow disabled:opacity-50"
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
