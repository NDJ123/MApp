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
import { userAPI } from '../../services/api';
import Spinner from '../common/Spinner';

function ProfileSettings() {
  const { user, refreshUser } = useAuth();
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
    const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=200`;
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

  const userInitial = (formData.displayName || user?.username || 'U')[0].toUpperCase();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg text-red-500">
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="p-4 bg-green-500 bg-opacity-10 border border-green-500 rounded-lg text-green-500">
              {success}
            </div>
          )}

          {/* Avatar section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium">Profile Picture</label>

            <div className="flex items-start gap-6">
              {/* Avatar preview */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-[var(--color-primary)] flex items-center justify-center text-white text-3xl font-medium">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                      onError={() => setAvatarPreview(null)}
                    />
                  ) : (
                    userInitial
                  )}
                </div>
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
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    Upload Image
                  </button>
                  <span className="ml-3 text-xs text-[var(--color-text-tertiary)]">
                    Max 2MB, JPG/PNG
                  </span>
                </div>

                {/* URL input */}
                <div>
                  <input
                    type="url"
                    placeholder="Or enter image URL"
                    value={formData.avatar.startsWith('data:') ? '' : formData.avatar}
                    onChange={handleAvatarUrlChange}
                    className="w-full px-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                </div>

                {/* Reset to initials */}
                <button
                  type="button"
                  onClick={generateInitialsAvatar}
                  className="text-sm text-[var(--color-primary)] hover:underline"
                >
                  Use initials avatar
                </button>
              </div>
            </div>
          </div>

          {/* Display name */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium mb-2">
              Display Name *
            </label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              placeholder="Your display name"
              maxLength={50}
              required
              className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              This is how others will see your name
            </p>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-2">
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
              className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
            />
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              {formData.bio.length}/200 characters
            </p>
          </div>

          {/* Username (read-only) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              value={`@${user?.username || ''}`}
              disabled
              className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-tertiary)] cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              Username cannot be changed
            </p>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="text"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-tertiary)] cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              Email cannot be changed
            </p>
          </div>

          {/* Submit button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-3 bg-[var(--color-primary)] text-white font-medium rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Account info */}
        <div className="mt-8 pt-8 border-t border-[var(--color-border)]">
          <h2 className="text-lg font-semibold mb-4">Account Info</h2>
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
      </div>
    </div>
  );
}

export default ProfileSettings;
