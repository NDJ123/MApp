// =============================================================================
// SIGNUP PAGE
// =============================================================================
// Handles new user registration. Users need:
// 1. A valid invite code (invite-only system)
// 2. Username, email, password, and display name
//
// This form validates input before sending to the server.
// =============================================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { inviteAPI } from '../../services/api';

function SignupPage() {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const navigate = useNavigate();
  const { signup, isLoading: authLoading, error: authError, clearError } = useAuth();

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [formData, setFormData] = useState({
    inviteCode: '',
    username: '',
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  });

  const [localError, setLocalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [inviteValid, setInviteValid] = useState(null); // null = not checked, true/false = result
  const [checkingInvite, setCheckingInvite] = useState(false);

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
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }

    // Reset invite validation when code changes
    if (name === 'inviteCode') {
      setInviteValid(null);
    }
  };

  // Validate invite code when user leaves the field
  const handleInviteBlur = async () => {
    const code = formData.inviteCode.trim();
    if (!code || code.length < 9) {
      setInviteValid(null);
      return;
    }

    setCheckingInvite(true);
    try {
      await inviteAPI.validate(code);
      setInviteValid(true);
    } catch (err) {
      setInviteValid(false);
      setFieldErrors((prev) => ({
        ...prev,
        inviteCode: err.message || 'Invalid invite code',
      }));
    } finally {
      setCheckingInvite(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { inviteCode, username, email, displayName, password, confirmPassword } = formData;

    // Client-side validation
    const errors = {};

    if (!inviteCode) errors.inviteCode = 'Invite code is required';
    if (!username) errors.username = 'Username is required';
    else if (username.length < 3) errors.username = 'Username must be at least 3 characters';
    else if (username.length > 30) errors.username = 'Username cannot exceed 30 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!email) errors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Invalid email format';

    if (!displayName) errors.displayName = 'Display name is required';

    if (!password) errors.password = 'Password is required';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters';

    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLocalError('Please fix the errors below');
      return;
    }

    setLocalError('');
    setFieldErrors({});

    // Call signup from AuthContext
    const result = await signup({
      inviteCode,
      username,
      email,
      displayName,
      password,
      confirmPassword,
    });

    if (result.success) {
      // Redirect to chat after successful signup
      navigate('/chat', { replace: true });
    } else {
      // Handle field-specific errors from server
      if (result.errors) {
        const serverErrors = {};
        result.errors.forEach((err) => {
          serverErrors[err.field] = err.message;
        });
        setFieldErrors(serverErrors);
      }
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
          <Link to="/" className="text-2xl font-bold text-[var(--color-primary)] tracking-tight">
            Padel<span className="text-[var(--color-text-primary)]">talk</span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold">Create your account</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Enter your invite code to get started
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* General error message */}
          {error && !Object.keys(fieldErrors).length && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Invite code field */}
          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium mb-2">
              Invite Code
            </label>
            <div className="relative">
              <input
                type="text"
                id="inviteCode"
                name="inviteCode"
                value={formData.inviteCode}
                onChange={handleChange}
                onBlur={handleInviteBlur}
                placeholder="XXXX-XXXX"
                disabled={isLoading}
                className={`w-full px-4 py-3 bg-[var(--color-surface)] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow disabled:opacity-50 ${
                  fieldErrors.inviteCode
                    ? 'border-red-500'
                    : inviteValid === true
                    ? 'border-green-500'
                    : 'border-[var(--color-border)]'
                }`}
              />
              {/* Status indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingInvite && (
                  <svg className="animate-spin h-5 w-5 text-[var(--color-text-tertiary)]" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {!checkingInvite && inviteValid === true && (
                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {!checkingInvite && inviteValid === false && (
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>
            {fieldErrors.inviteCode && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.inviteCode}</p>
            )}
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
              disabled={isLoading}
              className={`w-full px-4 py-3 bg-[var(--color-surface)] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow disabled:opacity-50 ${
                fieldErrors.username ? 'border-red-500' : 'border-[var(--color-border)]'
              }`}
            />
            {fieldErrors.username ? (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.username}</p>
            ) : (
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                3-30 characters, letters, numbers, and underscores only
              </p>
            )}
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
              disabled={isLoading}
              className={`w-full px-4 py-3 bg-[var(--color-surface)] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow disabled:opacity-50 ${
                fieldErrors.email ? 'border-red-500' : 'border-[var(--color-border)]'
              }`}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
            )}
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
              disabled={isLoading}
              className={`w-full px-4 py-3 bg-[var(--color-surface)] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow disabled:opacity-50 ${
                fieldErrors.displayName ? 'border-red-500' : 'border-[var(--color-border)]'
              }`}
            />
            {fieldErrors.displayName ? (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.displayName}</p>
            ) : (
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                This is how others will see you
              </p>
            )}
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
              disabled={isLoading}
              className={`w-full px-4 py-3 bg-[var(--color-surface)] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow disabled:opacity-50 ${
                fieldErrors.password ? 'border-red-500' : 'border-[var(--color-border)]'
              }`}
            />
            {fieldErrors.password ? (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
            ) : (
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">Minimum 8 characters</p>
            )}
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
              disabled={isLoading}
              className={`w-full px-4 py-3 bg-[var(--color-surface)] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow disabled:opacity-50 ${
                fieldErrors.confirmPassword ? 'border-red-500' : 'border-[var(--color-border)]'
              }`}
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || inviteValid === false}
            className="w-full py-3 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
          <Link to="/login" className="text-[var(--color-primary)] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
