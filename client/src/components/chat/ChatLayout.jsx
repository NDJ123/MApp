// =============================================================================
// CHAT LAYOUT
// =============================================================================
// The main layout for the chat application after login.
// Uses a classic Slack-style layout:
//
// +------------------+------------------------+
// |                  |                        |
// |    SIDEBAR       |     MAIN CONTENT       |
// |                  |                        |
// | - Conversations  |  - Message List        |
// | - Groups         |  - Message Input       |
// | - Contacts       |                        |
// |                  |                        |
// +------------------+------------------------+
//
// This is a "layout component" - it structures the page but delegates
// actual content to child components.
// =============================================================================

import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';

// Placeholder components - we'll build these out in later phases
// For now, they just show placeholder content

function Sidebar() {
  return (
    <aside className="w-[var(--sidebar-width)] h-screen flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <h1 className="text-xl font-bold text-[var(--color-primary)]">MApp</h1>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-4">
          <h2 className="px-2 py-1 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
            Direct Messages
          </h2>
          {/* Placeholder conversations */}
          <div className="mt-2 space-y-1">
            {['Alice', 'Bob', 'Charlie'].map((name) => (
              <div
                key={name}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors"
              >
                {/* Avatar placeholder */}
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-medium">
                  {name[0]}
                </div>
                <span className="text-sm">{name}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="px-2 py-1 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
            Groups
          </h2>
          {/* Placeholder groups */}
          <div className="mt-2 space-y-1">
            {['Team Chat', 'Project Alpha'].map((name) => (
              <div
                key={name}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] text-sm font-medium">
                  #
                </div>
                <span className="text-sm">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User section at bottom */}
      <div className="p-3 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-medium">
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">User Name</p>
            <p className="text-xs text-[var(--color-text-tertiary)] truncate">
              @username
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function WelcomeView() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Welcome to MApp</h2>
        <p className="text-[var(--color-text-secondary)]">
          Select a conversation to start messaging
        </p>
      </div>
    </div>
  );
}

function ConversationView() {
  const [message, setMessage] = useState('');

  return (
    <div className="flex-1 flex flex-col">
      {/* Conversation header */}
      <div className="h-16 px-4 flex items-center border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-medium">
            A
          </div>
          <div>
            <h2 className="font-semibold">Alice</h2>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Last seen recently
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Placeholder messages */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex-shrink-0 flex items-center justify-center text-white text-sm">
              A
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-sm">Alice</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  10:30 AM
                </span>
              </div>
              <p className="mt-1 text-[var(--color-text-primary)]">
                Hey! How's it going?
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <div>
              <div className="flex items-baseline gap-2 justify-end">
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  10:32 AM
                </span>
                <span className="font-medium text-sm">You</span>
              </div>
              <p className="mt-1 bg-[var(--color-primary)] text-white rounded-lg px-3 py-2">
                Pretty good! Working on this chat app.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Message input */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <div className="flex items-end gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            onKeyDown={(e) => {
              // Send on Enter (without Shift)
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (message.trim()) {
                  console.log('Send message:', message);
                  setMessage('');
                }
              }
            }}
          />
          <button
            onClick={() => {
              if (message.trim()) {
                console.log('Send message:', message);
                setMessage('');
              }
            }}
            className="px-4 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN CHAT LAYOUT COMPONENT
// =============================================================================

function ChatLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - always visible */}
      <Sidebar />

      {/* Main content area - changes based on route */}
      <main className="flex-1 flex flex-col bg-[var(--color-background)]">
        <Routes>
          {/* Default view - no conversation selected */}
          <Route index element={<WelcomeView />} />

          {/* Direct message view */}
          <Route path="dm/:userId" element={<ConversationView />} />

          {/* Group chat view */}
          <Route path="group/:groupId" element={<ConversationView />} />
        </Routes>
      </main>
    </div>
  );
}

export default ChatLayout;
