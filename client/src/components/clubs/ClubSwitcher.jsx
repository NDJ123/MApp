// =============================================================================
// CLUB SWITCHER COMPONENT
// =============================================================================
// Dropdown component for switching between clubs.
// Displays in the sidebar header area.
// =============================================================================

import { useState, useRef, useEffect } from 'react';
import { useClub } from '../../context/ClubContext';
import { useNavigate } from 'react-router-dom';

export default function ClubSwitcher() {
  const { activeClub, clubs, switchClub, isLoading } = useClub();
  const [isOpen, setIsOpen] = useState(false);
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
    console.log('[ClubSwitcher] Switching to club:', clubId);

    if (clubId === activeClub?._id) {
      console.log('[ClubSwitcher] Same club, skipping');
      setIsOpen(false);
      return;
    }

    const result = await switchClub(clubId);
    console.log('[ClubSwitcher] Switch result:', result);

    if (result.success) {
      setIsOpen(false);
      // Navigate to chat home to refresh context
      navigate('/chat');
      // Force page reload to refresh all club-scoped data
      window.location.reload();
    } else {
      console.error('[ClubSwitcher] Switch failed:', result.error);
      alert('Failed to switch club: ' + (result.error || 'Unknown error'));
    }
  };

  if (isLoading) {
    return (
      <div className="club-switcher loading">
        <div className="club-switcher-button">
          <span className="club-name">Loading...</span>
        </div>
      </div>
    );
  }

  if (!activeClub) {
    return (
      <div className="club-switcher no-club">
        <div className="club-switcher-button">
          <span className="club-name">No club selected</span>
        </div>
      </div>
    );
  }

  return (
    <div className="club-switcher" ref={dropdownRef}>
      <button
        className="club-switcher-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {activeClub.image ? (
          <img
            src={activeClub.image}
            alt={activeClub.name}
            className="club-image"
          />
        ) : (
          <div className="club-image-placeholder">
            {activeClub.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="club-name">{activeClub.name}</span>
        <svg
          className={`chevron ${isOpen ? 'open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && clubs.length > 1 && (
        <div className="club-dropdown" role="listbox">
          {clubs.map((club) => (
            <button
              key={club._id}
              className={`club-option ${club._id === activeClub._id ? 'active' : ''}`}
              onClick={() => handleSwitchClub(club._id)}
              role="option"
              aria-selected={club._id === activeClub._id}
            >
              {club.image ? (
                <img
                  src={club.image}
                  alt={club.name}
                  className="club-image"
                />
              ) : (
                <div className="club-image-placeholder">
                  {club.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="club-name">{club.name}</span>
              {club._id === activeClub._id && (
                <svg
                  className="check-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13.5 4.5L6 12L2.5 8.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .club-switcher {
          position: relative;
          width: 100%;
        }

        .club-switcher-button {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 12px;
          background: var(--bg-secondary, #f5f5f5);
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .club-switcher-button:hover {
          background: var(--bg-hover, #ebebeb);
        }

        .club-image {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          object-fit: cover;
        }

        .club-image-placeholder {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: var(--primary-color, #4a90d9);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }

        .club-name {
          flex: 1;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary, #333);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chevron {
          color: var(--text-secondary, #666);
          transition: transform 0.2s ease;
        }

        .chevron.open {
          transform: rotate(180deg);
        }

        .club-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: var(--bg-primary, white);
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 100;
          max-height: 300px;
          overflow-y: auto;
        }

        .club-option {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          background: none;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .club-option:hover {
          background: var(--bg-hover, #f5f5f5);
        }

        .club-option.active {
          background: var(--bg-active, #e8f0fe);
        }

        .club-option .club-name {
          font-weight: 500;
        }

        .club-option.active .club-name {
          font-weight: 600;
          color: var(--primary-color, #4a90d9);
        }

        .check-icon {
          color: var(--primary-color, #4a90d9);
          flex-shrink: 0;
        }

        .club-switcher.loading .club-switcher-button,
        .club-switcher.no-club .club-switcher-button {
          cursor: default;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
