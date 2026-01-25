# Real-Time Chat Messaging Application - Implementation Plan

## Overview
Building a production-ready real-time chat application similar to Slack/Discord with React frontend, Node.js backend, MongoDB database, and Socket.io for real-time communication.

## Technology Stack
- **Frontend**: React 18 with Vite, Socket.io-client, Axios, React Router
- **Backend**: Node.js with Express, Socket.io, Mongoose
- **Database**: MongoDB
- **File Storage**: Cloudinary
- **Authentication**: JWT tokens with bcrypt password hashing

## Key Features
1. User authentication (signup, login, JWT-based sessions)
2. Real-time messaging with Socket.io
3. Channel/room management (public, private, direct messages)
4. File and image sharing with uploads
5. Message history with pagination
6. Typing indicators
7. User presence status (online/offline/away/busy)
8. Notifications (in-app and browser notifications)

## Project Structure

```
Messaging App/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/              # UI components
│   │   │   ├── auth/               # Login, Signup, PrivateRoute
│   │   │   ├── chat/               # MessageList, MessageInput, Message, TypingIndicator
│   │   │   ├── channels/           # ChannelList, ChannelItem, CreateChannel
│   │   │   ├── users/              # UserList, UserProfile, UserStatus
│   │   │   └── common/             # Navbar, Sidebar, Notification
│   │   ├── context/                # AuthContext, SocketContext, NotificationContext
│   │   ├── hooks/                  # useAuth, useSocket, useMessages, useTyping
│   │   ├── services/               # API service layer (authService, messageService, etc.)
│   │   ├── utils/                  # Utility functions
│   │   ├── styles/                 # CSS files
│   │   ├── App.jsx
│   │   └── index.jsx
│   ├── package.json
│   └── .env
│
├── server/                          # Node.js backend
│   ├── src/
│   │   ├── config/                 # database.js, cloudinary.js, jwt.js, socket.js
│   │   ├── models/                 # User.js, Message.js, Channel.js, Notification.js
│   │   ├── controllers/            # authController, messageController, etc.
│   │   ├── middleware/             # auth.js, errorHandler.js, validator.js, upload.js
│   │   ├── routes/                 # API route definitions
│   │   ├── socket/                 # socketHandler.js, messageHandlers.js, typingHandlers.js
│   │   ├── services/               # Business logic layer
│   │   ├── utils/                  # Logger, validators, sanitizers
│   │   ├── app.js                  # Express app setup
│   │   └── server.js               # Server entry point
│   ├── package.json
│   └── .env
│
└── README.md
```

## Database Schema

### User Schema
- username (unique, required, 3-30 chars)
- email (unique, required, validated)
- password (hashed with bcrypt)
- displayName
- avatar (URL)
- status (online/offline/away/busy)
- lastSeen
- channels (array of ObjectIds)
- socketId (current connection)

### Channel Schema
- name (required, 3-50 chars)
- description
- type (public/private/direct)
- members (array with user, role, joinedAt)
- createdBy (ObjectId)
- lastMessageAt (for sorting)

### Message Schema
- content (text, max 5000 chars)
- sender (ObjectId, required)
- channel (ObjectId, required)
- type (text/image/file)
- attachments (array with url, publicId, filename, fileType, fileSize)
- readBy (array of users with readAt timestamp)
- edited, editedAt
- deleted, deletedAt
- timestamps

### Notification Schema
- recipient (ObjectId, required)
- sender (ObjectId)
- type (message/mention/channel_invite/system)
- title, message
- channel, messageId (references)
- read, readAt

## API Endpoints

### Authentication (`/api/auth`)
- POST `/signup` - Register new user
- POST `/login` - Login user (returns JWT)
- POST `/logout` - Logout user
- GET `/me` - Get current user (requires auth)
- POST `/forgot-password` - Request password reset
- POST `/reset-password/:token` - Reset password

### Users (`/api/users`)
- GET `/users` - Get all users (paginated)
- GET `/users/:id` - Get user by ID
- PUT `/users/:id` - Update user profile
- PUT `/users/:id/avatar` - Update avatar
- PUT `/users/status` - Update own status

### Channels (`/api/channels`)
- GET `/channels` - Get user's channels
- POST `/channels` - Create new channel
- GET `/channels/:id` - Get channel details
- PUT `/channels/:id` - Update channel
- DELETE `/channels/:id` - Delete channel
- POST `/channels/:id/members` - Add member
- DELETE `/channels/:id/members/:userId` - Remove member

### Messages (`/api/messages`)
- GET `/messages/:channelId` - Get messages (paginated)
- POST `/messages` - Send message (prefer Socket.io)
- PUT `/messages/:id` - Edit message
- DELETE `/messages/:id` - Delete message
- PUT `/messages/:id/read` - Mark as read

### Upload (`/api/upload`)
- POST `/upload/image` - Upload image
- POST `/upload/file` - Upload file
- DELETE `/upload/:publicId` - Delete file

## Socket.io Events

### Client → Server
- `join_channel` - Join a channel room
- `leave_channel` - Leave a channel room
- `send_message` - Send new message
- `typing_start` - User started typing
- `typing_stop` - User stopped typing
- `message_read` - Mark message as read
- `user_status_change` - Update user status

### Server → Client
- `new_message` - New message received
- `message_edited` - Message was edited
- `message_deleted` - Message was deleted
- `user_typing` - User is typing
- `user_stopped_typing` - User stopped typing
- `user_joined` - User joined channel
- `user_left` - User left channel
- `user_status_updated` - User status changed
- `notification` - New notification
- `error` - Error occurred

## Implementation Phases

### Phase 1: Project Setup (Days 1-2)
1. Initialize client with Vite + React
2. Initialize server with Express
3. Install all dependencies
4. Set up folder structures
5. Create .env files
6. Configure MongoDB connection
7. Set up Express middleware (CORS, Helmet, body-parser)
8. Configure Axios instance with interceptors
9. Set up basic routing and layouts

### Phase 2: Authentication System (Days 3-4)
1. Create User model with password hashing
2. Implement JWT configuration
3. Create auth middleware for JWT verification
4. Build auth service and controller (signup, login, logout, getMe)
5. Create auth routes with validation
6. Build AuthContext in React
7. Create Login and Signup components
8. Implement PrivateRoute wrapper
9. Add token storage and Axios interceptors
10. Test auth flow end-to-end

### Phase 3: Database Models & Channels (Days 5-6)
1. Create Channel, Message, and Notification models
2. Add database indexes for performance
3. Build channel service and controller
4. Create channel routes with validation
5. Build channel components (ChannelList, ChannelItem, CreateChannel)
6. Implement channel creation and listing
7. Add channel switching logic

### Phase 4: Socket.io Real-time Infrastructure (Days 7-8)
1. Configure Socket.io with CORS and auth middleware
2. Create main socket handler (connection/disconnection)
3. Implement room joining/leaving
4. Create message, typing, and presence handlers
5. Build SocketContext in React
6. Initialize socket connection with JWT
7. Implement event listeners (new_message, user_typing, etc.)
8. Handle reconnection logic
9. Test real-time connection with multiple browsers

### Phase 5: Messaging System (Days 9-11)
1. Create message service with pagination
2. Build message controller and routes
3. Create Message component (display text, images, files)
4. Build MessageList with infinite scroll
5. Create MessageInput with auto-resize
6. Implement send message via Socket.io
7. Handle optimistic updates
8. Create TypingIndicator component
9. Implement typing detection with debouncing
10. Test messaging flow end-to-end

### Phase 6: File Upload (Days 12-13)
1. Configure Cloudinary account
2. Set up Multer middleware (validation, size limits)
3. Create upload service and controller
4. Build upload routes
5. Create FileUpload component with preview
6. Implement upload progress bar
7. Integrate with MessageInput
8. Display uploaded files in messages
9. Implement image lightbox/modal
10. Test various file types and sizes

### Phase 7: User Presence & Status (Days 14-15)
1. Update socket handlers for online/offline tracking
2. Broadcast user_status_updated events
3. Create user service and controller
4. Build UserStatus component with indicators
5. Create UserList component
6. Show status in all relevant UI locations
7. Implement status update dropdown
8. Display last seen for offline users

### Phase 8: Notifications (Days 16-17)
1. Create notification service and controller
2. Build notification routes
3. Emit notifications via Socket.io
4. Optionally set up email notifications (Nodemailer)
5. Create NotificationContext
6. Request browser notification permission
7. Build Notification component with badge
8. Integrate react-toastify for toast messages
9. Show browser notifications when tab not focused
10. Test notification flow

### Phase 9: Polish & UX (Days 18-19)
1. Implement responsive design for mobile
2. Add loading states and skeletons
3. Implement error boundaries
4. Add empty states (no channels, no messages)
5. Format timestamps (relative time)
6. Add emoji picker (optional)
7. Implement message grouping by sender
8. Optimize re-renders (React.memo, useMemo, useCallback)
9. Add database indexes
10. Test on multiple browsers and devices

### Phase 10: Testing & Deployment (Days 20-22)
1. Test authentication flow thoroughly
2. Test real-time messaging with multiple users
3. Test file uploads
4. Test edge cases (disconnection, network errors)
5. Security testing (XSS, injection attempts)
6. Set up production environment variables
7. Configure MongoDB Atlas
8. Build frontend for production
9. Deploy backend (Heroku/Railway/DigitalOcean)
10. Deploy frontend (Vercel/Netlify)
11. Configure production CORS and SSL
12. Set up monitoring (Sentry)
13. Write comprehensive README

## Security Measures

### XSS Prevention
- Sanitize user input with xss-clean middleware
- Use React's built-in XSS protection
- Implement Content Security Policy (Helmet)
- Validate and escape all data

### NoSQL Injection Prevention
- Use Mongoose schema validation
- Use express-mongo-sanitize middleware
- Validate all input with express-validator

### Authentication Security
- Hash passwords with bcrypt (12 salt rounds)
- Use strong JWT secrets (256-bit minimum)
- Set appropriate JWT expiration (15min access, 7d refresh)
- Implement rate limiting on auth endpoints (5 attempts per 15 min)

### General Security
- Use HTTPS in production
- Implement rate limiting on all endpoints
- Validate file uploads strictly (type, size)
- Log security events
- Keep dependencies updated
- Use environment variables for secrets

## Critical Files to Implement

1. **server/src/server.js** - Main backend entry point (Express + Socket.io + MongoDB)
2. **server/src/socket/socketHandler.js** - Core real-time logic (WebSocket handling)
3. **server/src/models/Message.js** - Message schema (data structure for messages)
4. **client/src/context/SocketContext.jsx** - Frontend Socket.io management
5. **client/src/components/chat/MessageList.jsx** - Core chat UI component

## Environment Variables

### server/.env
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/chat-app
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-password
CLIENT_URL=http://localhost:5173
```

### client/.env
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## Scalability Considerations
- Implement database sharding for messages
- Use Redis for caching and Socket.io adapter (multi-server support)
- Implement read replicas for MongoDB
- Use CDN for static assets
- Add application monitoring and log aggregation
- Implement request rate limiting

## Success Criteria
- Users can register and login securely
- Real-time messaging works across multiple clients
- File uploads work for images and documents
- Users can see who's online and typing
- Message history loads with pagination
- Notifications appear for new messages
- Application is responsive on mobile and desktop
- Security measures are in place and tested
