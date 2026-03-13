// =============================================================================
// CLUB SWITCHER COMPONENT
// =============================================================================
// Dropdown component for switching between clubs.
// Displays in the sidebar header area.
// =============================================================================

import { useState, useRef, useEffect } from 'react';
import { useClub } from '../../context/ClubContext';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check } from 'lucide-react';
import Avatar from '../ui/Avatar';

export default function ClubSwitcher() {
  const { activeClub, clubs, switchClub, isLoading } = useClub();
  const [isOpen, setIsOpen] = useState(false);
  const [switchError, setSwitchError] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle club switch
  const handleSwitchClub = async (clubId) => {
    if (clubId === activeClub?._id || isSwitching) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    setSwitchError(null);

    try {
      const result = await switchClub(clubId);
      if (result.success) {
        setIsOpen(false);
        // Navigate to chat home to refresh context
        navigate('/chat');
        // Force page reload to refresh all club-scoped data
        window.location.reload();
      } else {
        setSwitchError(result.error || 'Failed to switch club');
      }
    } catch (err) {
      setSwitchError('Failed to switch club');
    } finally {
      setIsSwitching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="relative w-full">
        <div className="flex items-center gap-2.5 w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] opacity-70 cursor-default">
          <span className="flex-1 text-left font-semibold text-sm text-[var(--color-text-primary)] truncate">Loading...</span>
        </div>
      </div>
    );
  }

  if (!activeClub) {
    return (
      <div className="relative w-full">
        <div className="flex items-center gap-2.5 w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] opacity-70 cursor-default">
          <span className="flex-1 text-left font-semibold text-sm text-[var(--color-text-primary)] truncate">No club selected</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        className="flex items-center gap-2.5 w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] cursor-pointer transition-all duration-[var(--duration-fast)] hover:bg-[var(--color-surface-hover)]"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Avatar
          src={activeClub.image}
          name={activeClub.name}
          size="sm"
          className="!rounded-[var(--radius-sm)]"
        />
        <span className="flex-1 text-left font-semibold text-sm text-[var(--color-text-primary)] truncate">
          {activeClub.name}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--color-text-tertiary)] transition-transform duration-[var(--duration-fast)] ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {switchError && (
        <div className="mt-1 px-3 py-1.5 bg-red-50 [data-theme=dark]:bg-red-900/20 text-[var(--color-error)] text-xs rounded-[var(--radius-sm)] border border-red-200 [data-theme=dark]:border-red-800">
          {switchError}
        </div>
      )}

      {isOpen && clubs.length > 1 && (
        <div
          className="absolute top-[calc(100%+4px)] left-0 right-0 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] z-[100] max-h-[300px] overflow-y-auto animate-slide-down"
          role="listbox"
        >
          {clubs.map((club) => (
            <button
              key={club._id}
              className={`
                flex items-center gap-2.5 w-full px-3 py-2.5 border-none cursor-pointer transition-colors duration-[var(--duration-fast)]
                ${club._id === activeClub._id
                  ? 'bg-[var(--color-primary-muted)]'
                  : 'bg-transparent hover:bg-[var(--color-surface-hover)]'
                }
              `}
              onClick={() => handleSwitchClub(club._id)}
              role="option"
              aria-selected={club._id === activeClub._id}
            >
              <Avatar
                src={club.image}
                name={club.name}
                size="sm"
                className="!rounded-[var(--radius-sm)]"
              />
              <span
                className={`flex-1 text-left text-sm truncate ${
                  club._id === activeClub._id
                    ? 'font-semibold text-[var(--color-primary)]'
                    : 'font-medium text-[var(--color-text-primary)]'
                }`}
              >
                {club.name}
              </span>
              {club._id === activeClub._id && (
                <Check className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
