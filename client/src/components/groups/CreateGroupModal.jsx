// =============================================================================
// CREATE GROUP MODAL
// =============================================================================
// Modal dialog for creating a new group chat.
// Allows setting group name, description, and selecting members.
// =============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupAPI, contactAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';

function CreateGroupModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [contacts, setContacts] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Fetch contacts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchContacts();
      // Reset form when opening
      setFormData({ name: '', description: '' });
      setSelectedMembers([]);
      setError(null);
    }
  }, [isOpen]);

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true);
      const response = await contactAPI.getAll();
      setContacts(response.data.data.contacts || []);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleMember = (userId) => {
    setSelectedMembers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Group name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await groupAPI.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        memberIds: selectedMembers,
      });

      const newGroup = response.data.data.group;

      // Join the socket room for this group
      if (socket) {
        socket.emit('group:join', { groupId: newGroup._id });
      }

      // Close modal and navigate to new group
      onClose();
      navigate(`/chat/group/${newGroup._id}`);
    } catch (err) {
      console.error('Failed to create group:', err);
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--color-surface)] rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create Group</h2>
          <button
            onClick={onClose}
            className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Group name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium mb-1"
              >
                Group Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter group name"
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                maxLength={50}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium mb-1"
              >
                Description (optional)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="What's this group about?"
                rows={2}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                maxLength={200}
              />
            </div>

            {/* Member selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Add Members
              </label>

              {loadingContacts ? (
                <div className="py-4 text-center text-[var(--color-text-tertiary)]">
                  Loading contacts...
                </div>
              ) : contacts.length === 0 ? (
                <div className="py-4 text-center text-[var(--color-text-tertiary)] text-sm">
                  No contacts to add. Add contacts first from the User Directory.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)]">
                  {contacts.map((contact) => (
                    <label
                      key={contact._id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--color-surface-hover)] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(contact._id)}
                        onChange={() => toggleMember(contact._id)}
                        className="w-4 h-4 text-[var(--color-primary)] rounded border-[var(--color-border)] focus:ring-[var(--color-primary)]"
                      />

                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-medium">
                        {contact.avatar ? (
                          <img
                            src={contact.avatar}
                            alt={contact.displayName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          contact.displayName?.[0]?.toUpperCase() || contact.username?.[0]?.toUpperCase()
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {contact.displayName || contact.username}
                        </p>
                        <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                          @{contact.username}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {selectedMembers.length > 0 && (
                <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
                  {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--color-border)] flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="px-4 py-2 text-sm font-medium bg-[var(--color-primary)] text-white rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateGroupModal;
