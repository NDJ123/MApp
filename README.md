# MApp - Real-Time Chat Messaging Application

## Overview

A production-ready real-time chat application for learning modern web development. Built with React, Node.js, MongoDB, and Socket.io.

**Project Type:** Personal learning project
**Target Users:** 10-50 initially, architected to scale
**Core Philosophy:** Fast, simple, and reliable messaging

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite |
| **Styling** | Tailwind CSS (dark/light mode) |
| **State** | React Context |
| **Backend** | Node.js + Express |
| **Database** | MongoDB + Mongoose |
| **Real-time** | Socket.io |
| **File Storage** | Cloudinary (Phase 2) |
| **Auth** | JWT + bcrypt |
| **Email** | Nodemailer + Gmail |

---

## Core Features (v1)

### Messaging
- [x] Direct messages (1-on-1)
- [x] Group chats (up to 50 members)
- [x] Text + emoji picker
- [x] 5000 character limit
- [x] Infinite scroll message history
- [x] Typing indicators
- [x] Read receipts
- [x] Edit messages (shows "edited" label)
- [x] Delete messages (shows "message was deleted")

### Authentication & Users
- [x] Invite-only registration (shareable invite codes)
- [x] Track who invited whom
- [x] Sign up: username, email, password, display name
- [x] JWT authentication (7-day expiry, logout when expired)
- [x] Password reset via email

### Contacts & Groups
- [x] Explicit contacts list (manually add people)
- [x] Browse user directory
- [x] Anyone can DM anyone
- [x] Any user can create groups
- [x] Group admin controls (rename, delete, remove members)
- [x] Assign additional admins
- [x] Members can leave groups

### Notifications
- [x] Browser push notifications (every message)
- [x] Sound notifications (with mute option)

### UX & Reliability
- [x] Slack-style layout (sidebar + main chat)
- [x] Clean, minimalist design
- [x] Dark/light mode toggle
- [x] "Reconnecting..." banner on connection drop
- [x] Auto-retry failed messages, then show error
- [x] Spinner loading states
- [x] Single active session (most recent tab/device)

---

## Deferred Features (v2+)

- [ ] File/image uploads (Cloudinary)
- [ ] Online/offline/away status
- [ ] User blocking
- [ ] Notification preferences
- [ ] React Native mobile app
- [ ] Social login (Google, GitHub)

---

## Project Structure

```
MApp/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/              # UI components
│   │   │   ├── auth/               # Login, Signup, PrivateRoute
│   │   │   ├── chat/               # MessageList, MessageInput, Message
│   │   │   ├── groups/             # GroupList, CreateGroup, GroupSettings
│   │   │   ├── contacts/           # ContactList, UserDirectory, AddContact
│   │   │   └── common/             # Sidebar, ThemeToggle, Spinner, Modal
│   │   ├── context/                # AuthContext, SocketContext, ThemeContext
│   │   ├── hooks/                  # useAuth, useSocket, useMessages, useTyping
│   │   ├── services/               # API calls (authService, messageService, etc.)
│   │   ├── utils/                  # Helper functions
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── package.json
│   └── .env
│
├── server/                          # Node.js backend
│   ├── src/
│   │   ├── config/                 # database.js, jwt.js, socket.js
│   │   ├── models/                 # User.js, Message.js, Group.js, Invite.js
│   │   ├── controllers/            # authController, messageController, etc.
│   │   ├── middleware/             # auth.js, errorHandler.js, validate.js
│   │   ├── routes/                 # API route definitions
│   │   ├── socket/                 # Real-time event handlers
│   │   ├── services/               # Business logic layer
│   │   ├── utils/                  # Logger, helpers
│   │   └── server.js               # Entry point
│   ├── package.json
│   └── .env
│
└── README.md
```

---

## Database Schema

### User
```javascript
{
  username: String,        // unique, 3-30 chars
  email: String,           // unique, validated
  password: String,        // hashed with bcrypt
  displayName: String,     // required at signup
  avatar: String,          // URL (default provided)
  contacts: [ObjectId],    // references to other Users
  invitedBy: ObjectId,     // who invited this user
  createdAt: Date,
  updatedAt: Date
}
```

### Group
```javascript
{
  name: String,            // 3-50 chars
  description: String,     // optional
  members: [{
    user: ObjectId,
    role: String,          // 'admin' | 'member'
    joinedAt: Date
  }],
  createdBy: ObjectId,
  maxMembers: 50,
  createdAt: Date,
  updatedAt: Date
}
```

### Message
```javascript
{
  content: String,         // max 5000 chars
  sender: ObjectId,        // required
  conversationType: String,// 'direct' | 'group'
  conversationId: ObjectId,// Group ID or generated DM ID
  readBy: [{
    user: ObjectId,
    readAt: Date
  }],
  edited: Boolean,
  editedAt: Date,
  deleted: Boolean,
  deletedAt: Date,
  createdAt: Date
}
```

### Invite
```javascript
{
  code: String,            // unique invite code
  createdBy: ObjectId,     // who created the invite
  usedBy: ObjectId,        // who used it (null if unused)
  usedAt: Date,
  expiresAt: Date,         // optional expiry
  createdAt: Date
}
```

---

## API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Register with invite code |
| POST | `/login` | Login, returns JWT |
| POST | `/logout` | Logout user |
| GET | `/me` | Get current user |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password/:token` | Reset password |

### Users (`/api/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Browse user directory |
| GET | `/:id` | Get user profile |
| PUT | `/profile` | Update own profile |

### Contacts (`/api/contacts`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get contacts list |
| POST | `/:userId` | Add user to contacts |
| DELETE | `/:userId` | Remove from contacts |

### Groups (`/api/groups`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get user's groups |
| POST | `/` | Create new group |
| GET | `/:id` | Get group details |
| PUT | `/:id` | Update group (admin) |
| DELETE | `/:id` | Delete group (admin) |
| POST | `/:id/members` | Add member (admin) |
| DELETE | `/:id/members/:userId` | Remove member (admin) |
| POST | `/:id/leave` | Leave group |
| PUT | `/:id/admins/:userId` | Make user admin |

### Messages (`/api/messages`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/direct/:userId` | Get DM history |
| GET | `/group/:groupId` | Get group messages |
| PUT | `/:id` | Edit message |
| DELETE | `/:id` | Delete message |

### Invites (`/api/invites`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Generate invite code |
| GET | `/` | List your invites |
| GET | `/:code` | Validate invite code |

---

## Socket.io Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join_conversation` | `{ conversationId }` | Join a chat room |
| `leave_conversation` | `{ conversationId }` | Leave a chat room |
| `send_message` | `{ content, conversationType, conversationId }` | Send message |
| `typing_start` | `{ conversationId }` | Started typing |
| `typing_stop` | `{ conversationId }` | Stopped typing |
| `message_read` | `{ messageId }` | Mark as read |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `new_message` | `{ message }` | New message received |
| `message_edited` | `{ messageId, content }` | Message was edited |
| `message_deleted` | `{ messageId }` | Message was deleted |
| `user_typing` | `{ userId, conversationId }` | Someone is typing |
| `user_stopped_typing` | `{ userId, conversationId }` | Stopped typing |
| `read_receipt` | `{ messageId, userId }` | Message was read |
| `error` | `{ message }` | Error occurred |

---

## Implementation Phases

### Phase 1: Project Setup ✅ (Current)
1. Initialize client with Vite + React
2. Initialize server with Express
3. Install dependencies
4. Set up folder structure
5. Configure Tailwind CSS with dark mode
6. Create environment files
7. Set up Express middleware
8. Create basic React app with routing

### Phase 2: Authentication
1. Create User model with password hashing
2. JWT configuration
3. Auth middleware
4. Signup/login/logout endpoints
5. AuthContext in React
6. Login/Signup components
7. Protected routes
8. Invite system (generate/validate codes)

### Phase 3: Database & Contacts
1. Create all Mongoose models
2. Add indexes for performance
3. Contacts CRUD operations
4. User directory browsing
5. Contact list UI

### Phase 4: Socket.io Infrastructure
1. Configure Socket.io with JWT auth
2. Connection/disconnection handling
3. Room management (join/leave)
4. SocketContext in React
5. Reconnection logic with banner

### Phase 5: Messaging
1. Message service with pagination
2. Send/receive via Socket.io
3. Message components (list, input, item)
4. Infinite scroll
5. Optimistic updates
6. Auto-retry on failure

### Phase 6: Groups
1. Group CRUD operations
2. Member management
3. Admin controls
4. Group UI components

### Phase 7: Real-time Features
1. Typing indicators (with debounce)
2. Read receipts
3. Live message updates (edit/delete)

### Phase 8: Notifications
1. Browser push notification setup
2. Sound notifications
3. Mute toggle

### Phase 9: Polish
1. Dark/light theme toggle
2. Emoji picker
3. Error boundaries
4. Empty states
5. Responsive design

### Phase 10: Deployment
1. MongoDB Atlas setup
2. Deploy backend
3. Deploy frontend
4. SSL/CORS configuration

---

## Environment Variables

### server/.env
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/mapp
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
CLIENT_URL=http://localhost:5173
```

### client/.env
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

---

## Security Measures

- Password hashing with bcrypt (12 salt rounds)
- JWT for stateless authentication
- Input validation with express-validator
- MongoDB query sanitization
- Helmet.js for HTTP headers
- CORS configuration
- Rate limiting on auth endpoints
- XSS protection (React built-in + sanitization)

---

## Development Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Git
- VS Code (recommended)

### Quick Start
```bash
# Clone and enter project
cd MApp

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install

# Start MongoDB (if local)
mongod

# Start server (from server/)
npm run dev

# Start client (from client/)
npm run dev
```

---

## Success Criteria

- [ ] Users can register via invite code and login securely
- [ ] Real-time messaging works instantly across clients
- [ ] Typing indicators appear within 100ms
- [ ] Read receipts update in real-time
- [ ] Messages can be edited and deleted
- [ ] Groups can be created and managed
- [ ] Push notifications work when tab is inactive
- [ ] Reconnection is seamless after network issues
- [ ] UI is responsive on mobile browsers
- [ ] Dark/light mode works correctly
