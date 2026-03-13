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
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import Skeleton from '../ui/Skeleton';

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

  const footerContent = (
    <>
      <Button
        variant="ghost"
        onClick={onClose}
        type="button"
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        type="submit"
        form="create-group-form"
        isLoading={loading}
        disabled={!formData.name.trim()}
      >
        Create Group
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Group"
      footer={footerContent}
    >
      {/* Form */}
      <form id="create-group-form" onSubmit={handleSubmit}>
        <div className="p-6 space-y-4">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-[var(--color-error)]/10 border border-[var(--color-error)] rounded-[var(--radius-md)] text-[var(--color-error)] text-sm">
              {error}
            </div>
          )}

          {/* Group name */}
          <Input
            label="Group Name *"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter group name"
            maxLength={50}
            required
          />

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5"
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
              className="w-full px-4 py-2.5 text-sm bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-[var(--radius-md)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow duration-[var(--duration-fast)] resize-none"
              maxLength={200}
            />
          </div>

          {/* Member selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Add Members
            </label>

            {loadingContacts ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton variant="circle" className="w-8 h-8" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton variant="text" className="w-24 h-3" />
                      <Skeleton variant="text" className="w-16 h-2.5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="py-4 text-center text-[var(--color-text-tertiary)] text-sm">
                No contacts to add. Add contacts first from the User Directory.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-[var(--color-border)] rounded-[var(--radius-lg)] divide-y divide-[var(--color-border)]">
                {contacts.map((contact) => (
                  <label
                    key={contact._id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(contact._id)}
                      onChange={() => toggleMember(contact._id)}
                      className="w-4 h-4 text-[var(--color-primary)] rounded border-[var(--color-border)] focus:ring-[var(--color-primary)]"
                    />

                    {/* Avatar */}
                    <Avatar
                      src={contact.avatar}
                      name={contact.displayName || contact.username || '?'}
                      size="sm"
                    />

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-[var(--color-text-primary)]">
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
      </form>
    </Modal>
  );
}

export default CreateGroupModal;
