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
import { Loader2, Check, X } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';

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
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[var(--color-background)]">
      <div className="w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            <span className="text-[var(--color-primary)]">Padel</span>
            <span className="text-[var(--color-text-primary)]">talk</span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold text-[var(--color-text-primary)]">Create your account</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Enter your invite code to get started
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] p-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* General error message */}
            {error && !Object.keys(fieldErrors).length && (
              <div className="p-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-[var(--radius-md)] text-[var(--color-error)] text-sm animate-fade-in">
                {error}
              </div>
            )}

            {/* Invite code field */}
            <div>
              <label htmlFor="inviteCode" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
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
                  className={`w-full px-4 py-2.5 text-sm bg-[var(--color-surface)] text-[var(--color-text-primary)] border rounded-[var(--radius-md)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow duration-[var(--duration-fast)] disabled:opacity-50 disabled:cursor-not-allowed ${
                    fieldErrors.inviteCode
                      ? 'border-[var(--color-error)]'
                      : inviteValid === true
                      ? 'border-green-500'
                      : 'border-[var(--color-border)]'
                  }`}
                />
                {/* Status indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingInvite && (
                    <Loader2 className="h-5 w-5 text-[var(--color-text-tertiary)] animate-spin" />
                  )}
                  {!checkingInvite && inviteValid === true && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                  {!checkingInvite && inviteValid === false && (
                    <X className="h-5 w-5 text-[var(--color-error)]" />
                  )}
                </div>
              </div>
              {fieldErrors.inviteCode && (
                <p className="mt-1 text-xs text-[var(--color-error)]">{fieldErrors.inviteCode}</p>
              )}
            </div>

            {/* Username field */}
            <Input
              label="Username"
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="johndoe"
              autoComplete="username"
              disabled={isLoading}
              error={fieldErrors.username}
              hint={!fieldErrors.username ? '3-30 characters, letters, numbers, and underscores only' : undefined}
            />

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
              error={fieldErrors.email}
            />

            {/* Display name field */}
            <Input
              label="Display Name"
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              placeholder="John Doe"
              autoComplete="name"
              disabled={isLoading}
              error={fieldErrors.displayName}
              hint={!fieldErrors.displayName ? 'This is how others will see you' : undefined}
            />

            {/* Password field */}
            <Input
              label="Password"
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isLoading}
              error={fieldErrors.password}
              hint={!fieldErrors.password ? 'Minimum 8 characters' : undefined}
            />

            {/* Confirm password field */}
            <Input
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isLoading}
              error={fieldErrors.confirmPassword}
            />

            {/* Submit button */}
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={inviteValid === false}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </div>

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
