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
import { Loader2 } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';

function LoginPage() {
  // ---------------------------------------------------------------------------
  // HOOKS
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-background)]">
      <div className="w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            <span className="text-[var(--color-primary)]">Padel</span>
            <span className="text-[var(--color-text-primary)]">talk</span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold text-[var(--color-text-primary)]">Welcome back</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Sign in to continue to your conversations
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] p-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error message */}
            {error && (
              <div className="p-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-[var(--radius-md)] text-[var(--color-error)] text-sm animate-fade-in">
                {error}
              </div>
            )}

            {/* Email field */}
            <Input
              label="Email"
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isLoading}
            />

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-primary)]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-[var(--color-primary)] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>

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
