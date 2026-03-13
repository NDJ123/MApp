// =============================================================================
// PROFILE SETTINGS PAGE
// =============================================================================
// Allows users to edit their profile:
// - Display name
// - Bio
// - Avatar (URL or upload)
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { userAPI } from '../../services/api';
import { Upload, Link2, User } from 'lucide-react';
import Spinner from '../common/Spinner';
import Avatar from '../ui/Avatar';
import Input from '../ui/Input';
import Button from '../ui/Button';

function ProfileSettings() {
  const { user, refreshUser } = useAuth();
  const { permission, enabled, toggleNotifications, requestPermission } = useNotifications();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    avatar: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Load current user data
  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
      });
      setAvatarPreview(user.avatar);
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleAvatarUrlChange = (e) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, avatar: url }));
    setAvatarPreview(url);
    setError(null);
    setSuccess(null);
  };

  // Handle file upload for avatar
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    // Convert to base64 for preview and storage
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setAvatarPreview(base64);
      setFormData(prev => ({ ...prev, avatar: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.displayName.trim()) {
      setError('Display name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await userAPI.updateProfile({
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim(),
        avatar: formData.avatar,
      });

      // Refresh user data in context
      if (refreshUser) {
        await refreshUser();
      }

      setSuccess('Profile updated successfully');
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Generate initials avatar URL
  const generateInitialsAvatar = () => {
    const name = formData.displayName || user?.username || 'User';
    const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=F97316&color=fff&size=200`;
    setFormData(prev => ({ ...prev, avatar: url }));
    setAvatarPreview(url);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">Profile Settings</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 [data-theme=dark]:bg-red-900/20 border border-red-200 [data-theme=dark]:border-red-800 rounded-[var(--radius-md)] text-[var(--color-error)]">
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="p-4 bg-green-50 [data-theme=dark]:bg-green-900/20 border border-green-200 [data-theme=dark]:border-green-800 rounded-[var(--radius-md)] text-green-700 [data-theme=dark]:text-green-400">
              {success}
            </div>
          )}

          {/* Avatar section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">Profile Picture</label>

            <div className="flex items-start gap-6">
              {/* Avatar preview */}
              <div className="flex-shrink-0">
                <Avatar
                  src={avatarPreview}
                  name={formData.displayName || user?.username || 'U'}
                  size="2xl"
                />
              </div>

              {/* Avatar options */}
              <div className="flex-1 space-y-3">
                {/* Upload button */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4" />
                    Upload Image
                  </Button>
                  <span className="ml-3 text-xs text-[var(--color-text-tertiary)]">
                    Max 2MB, JPG/PNG
                  </span>
                </div>

                {/* URL input */}
                <Input
                  type="url"
                  placeholder="Or enter image URL"
                  value={formData.avatar.startsWith('data:') ? '' : formData.avatar}
                  onChange={handleAvatarUrlChange}
                  icon={Link2}
                />

                {/* Reset to initials */}
                <button
                  type="button"
                  onClick={generateInitialsAvatar}
                  className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
                >
                  <User className="w-3.5 h-3.5" />
                  Use initials avatar
                </button>
              </div>
            </div>
          </div>

          {/* Display name */}
          <Input
            label="Display Name *"
            type="text"
            id="displayName"
            name="displayName"
            value={formData.displayName}
            onChange={handleInputChange}
            placeholder="Your display name"
            maxLength={50}
            required
            hint="This is how others will see your name"
          />

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Tell others about yourself..."
              maxLength={200}
              rows={3}
              className="w-full px-4 py-2.5 text-sm bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-[var(--radius-md)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow duration-[var(--duration-fast)] resize-none"
            />
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              {formData.bio.length}/200 characters
            </p>
          </div>

          {/* Username (read-only) */}
          <Input
            label="Username"
            type="text"
            value={`@${user?.username || ''}`}
            disabled
            hint="Username cannot be changed"
          />

          {/* Email (read-only) */}
          <Input
            label="Email"
            type="text"
            value={user?.email || ''}
            disabled
            hint="Email cannot be changed"
          />

          {/* Submit button */}
          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={saving}
              disabled={saving}
              className="w-full"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>

        {/* Account info */}
        <div className="mt-8 pt-8 border-t border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Account Info</h2>
          <div className="text-sm text-[var(--color-text-secondary)] space-y-2">
            <p>
              <span className="text-[var(--color-text-tertiary)]">Member since:</span>{' '}
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
            </p>
            {user?.invitedBy && (
              <p>
                <span className="text-[var(--color-text-tertiary)]">Invited by:</span>{' '}
                {user.invitedBy.displayName || user.invitedBy.username}
              </p>
            )}
          </div>
        </div>

        {/* Notification settings */}
        <div className="mt-8 pt-8 border-t border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Notifications</h2>
          <div className="space-y-4">
            {/* Desktop notifications toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Desktop Notifications</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  Receive notifications for new messages
                </p>
              </div>
              <button
                onClick={() => toggleNotifications()}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-[var(--duration-fast)]
                  ${enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-[var(--duration-fast)]
                    ${enabled ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>

            {/* Permission status */}
            <div className="text-sm">
              <span className="text-[var(--color-text-tertiary)]">Status: </span>
              {permission === 'granted' && (
                <span className="text-green-600 [data-theme=dark]:text-green-400">Allowed</span>
              )}
              {permission === 'denied' && (
                <span className="text-red-600 [data-theme=dark]:text-red-400">
                  Blocked - Enable in browser settings
                </span>
              )}
              {permission === 'default' && (
                <span className="text-yellow-600 [data-theme=dark]:text-yellow-400">
                  Not yet requested
                </span>
              )}
            </div>

            {/* Request permission button (if not yet granted) */}
            {permission === 'default' && enabled && (
              <Button
                variant="primary"
                size="sm"
                onClick={requestPermission}
              >
                Enable Notifications
              </Button>
            )}

            {/* Help text for denied */}
            {permission === 'denied' && (
              <p className="text-xs text-[var(--color-text-tertiary)]">
                To enable notifications, click the lock icon in your browser's address bar
                and change the notification permission to "Allow".
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;
