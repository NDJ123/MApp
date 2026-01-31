# Padeltalk iOS Conversion Plan

## Executive Summary

This document outlines the strategy for converting the Padeltalk web application into a native iOS application. The plan recommends **React Native** as the primary technology choice, enabling code reuse from the existing React codebase while delivering a native iOS experience.

---

## Table of Contents

1. [Current Application Analysis](#1-current-application-analysis)
2. [Technology Recommendation](#2-technology-recommendation)
3. [Architecture Design](#3-architecture-design)
4. [Feature Mapping](#4-feature-mapping)
5. [Development Phases](#5-development-phases)
6. [Code Reuse Strategy](#6-code-reuse-strategy)
7. [iOS-Specific Considerations](#7-ios-specific-considerations)
8. [Testing Strategy](#8-testing-strategy)
9. [Deployment Strategy](#9-deployment-strategy)
10. [Risk Assessment](#10-risk-assessment)

---

## 1. Current Application Analysis

### Tech Stack Overview

| Layer | Current Technology | Mobile Equivalent |
|-------|-------------------|-------------------|
| Frontend | React 19 + Vite | React Native |
| State Management | React Context API | React Context / Zustand |
| Routing | React Router 7 | React Navigation |
| Real-time | Socket.io Client | Socket.io Client (RN) |
| HTTP Client | Axios | Axios (works in RN) |
| Styling | Tailwind CSS | NativeWind / StyleSheet |
| Build | Vite | Metro Bundler |

### Core Features to Port

- [x] JWT Authentication (login, signup, password reset)
- [x] Invite code system
- [x] Direct messaging (1-on-1)
- [x] Group chats (up to 50 members)
- [x] Real-time message delivery
- [x] Typing indicators
- [x] Read receipts
- [x] Message reactions
- [x] Message threading/replies
- [x] Message editing and deletion
- [x] File/image sharing
- [x] Link previews
- [x] Contact management
- [x] User blocking/muting
- [x] Push notifications
- [x] Dark/light mode

### Backend Compatibility

The existing Express.js backend requires **no changes** for iOS support:
- RESTful API endpoints are mobile-ready
- Socket.io supports React Native clients
- JWT authentication works identically
- All data formats are JSON (universal)

---

## 2. Technology Recommendation

### Primary Recommendation: React Native

**Why React Native?**

| Factor | Benefit |
|--------|---------|
| **React Knowledge** | Team already knows React paradigms, hooks, and patterns |
| **Code Reuse** | ~30-40% business logic can be shared (API calls, state logic, validation) |
| **Library Compatibility** | Axios, Socket.io-client work identically |
| **Native Performance** | Compiles to native iOS components |
| **Large Ecosystem** | Mature libraries for navigation, notifications, etc. |
| **Future Cross-Platform** | Same codebase can target Android later |

### Alternative Options Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Native Swift/SwiftUI** | Best performance, full iOS features | Complete rewrite, no code reuse, iOS only | Overkill for chat app |
| **Flutter** | Great UI, cross-platform | New language (Dart), no code reuse | Learning curve |
| **PWA** | Minimal work, wrap existing web | Limited iOS features, no App Store | Not native enough |
| **Capacitor** | Uses existing web code | Performance issues, not truly native | Hybrid limitations |
| **React Native** | Code reuse, native feel, familiar | Bridge overhead, some native modules | **Recommended** |

### Recommended Stack for iOS

```
React Native 0.73+
├── Navigation: React Navigation 6
├── State: React Context + Zustand (lightweight)
├── Styling: NativeWind (Tailwind for RN) or StyleSheet
├── Real-time: socket.io-client
├── HTTP: Axios
├── Push Notifications: react-native-push-notification + APNs
├── Secure Storage: react-native-keychain (for JWT)
├── Image Handling: react-native-image-picker
├── File System: react-native-fs
├── Async Storage: @react-native-async-storage/async-storage
└── Development: Expo (managed workflow) or bare React Native
```

### Expo vs Bare React Native

| Aspect | Expo Managed | Bare React Native |
|--------|--------------|-------------------|
| Setup | Easier, faster | More configuration |
| Native Modules | Limited (Expo SDK) | Full access |
| Build | Expo EAS Build | Xcode required |
| Push Notifications | Expo Push | APNs directly |
| OTA Updates | Built-in | CodePush required |
| **Recommendation** | **Start here** | Eject if needed |

**Recommendation**: Start with **Expo managed workflow** for faster development. Eject to bare workflow only if specific native modules are needed.

---

## 3. Architecture Design

### Project Structure

```
padeltalk-mobile/
├── src/
│   ├── api/                    # API service layer (reusable from web)
│   │   ├── client.js           # Axios instance configuration
│   │   ├── auth.js             # Auth API calls
│   │   ├── messages.js         # Message API calls
│   │   ├── groups.js           # Group API calls
│   │   ├── users.js            # User API calls
│   │   └── contacts.js         # Contact API calls
│   │
│   ├── components/             # Reusable UI components
│   │   ├── common/             # Buttons, inputs, avatars, etc.
│   │   ├── chat/               # Message bubbles, chat input, etc.
│   │   ├── groups/             # Group components
│   │   └── users/              # User cards, lists, etc.
│   │
│   ├── screens/                # Screen components (pages)
│   │   ├── auth/               # Login, Signup, ForgotPassword
│   │   ├── chat/               # ChatList, ChatScreen
│   │   ├── groups/             # GroupList, GroupDetails, CreateGroup
│   │   ├── contacts/           # ContactList, AddContact
│   │   └── settings/           # Profile, Settings, Theme
│   │
│   ├── navigation/             # React Navigation setup
│   │   ├── AppNavigator.js     # Main navigator
│   │   ├── AuthNavigator.js    # Auth flow
│   │   └── MainNavigator.js    # Authenticated flow
│   │
│   ├── context/                # React Context providers
│   │   ├── AuthContext.js      # Auth state (reusable logic)
│   │   ├── SocketContext.js    # Socket.io connection
│   │   ├── NotificationContext.js
│   │   └── ContactContext.js
│   │
│   ├── hooks/                  # Custom hooks
│   │   ├── useAuth.js
│   │   ├── useSocket.js
│   │   ├── useMessages.js
│   │   └── useOnlineStatus.js
│   │
│   ├── utils/                  # Utility functions (highly reusable)
│   │   ├── validation.js
│   │   ├── formatters.js
│   │   ├── storage.js          # Secure storage wrapper
│   │   └── notifications.js
│   │
│   ├── constants/              # App constants
│   │   ├── colors.js
│   │   ├── typography.js
│   │   └── config.js
│   │
│   └── assets/                 # Images, fonts
│
├── ios/                        # iOS native code (if bare workflow)
├── app.json                    # Expo configuration
├── babel.config.js
├── metro.config.js
└── package.json
```

### State Management Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        App Entry                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ AuthContext │  │ SocketContext│  │ NotificationCtx  │   │
│  │             │  │              │  │                  │   │
│  │ - user      │  │ - socket     │  │ - permissions    │   │
│  │ - token     │  │ - connected  │  │ - token (APNs)   │   │
│  │ - loading   │  │ - onlineUsers│  │ - badge count    │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                │                    │              │
│         └────────────────┼────────────────────┘              │
│                          │                                   │
│                          ▼                                   │
│              ┌───────────────────────┐                      │
│              │   Navigation Stack     │                      │
│              │   (React Navigation)   │                      │
│              └───────────────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow for Real-time Messaging

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  iOS App │────▶│  Socket.io   │────▶│   Express    │
│          │◀────│  Connection  │◀────│   Server     │
└──────────┘     └──────────────┘     └──────────────┘
     │                                       │
     │           ┌──────────────┐            │
     └──────────▶│  REST API    │◀───────────┘
                 │  (Axios)     │
                 └──────────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   MongoDB    │
                 └──────────────┘
```

---

## 4. Feature Mapping

### Web Component to iOS Screen Mapping

| Web Component | iOS Screen | Navigation Type |
|--------------|------------|-----------------|
| `LoginForm.jsx` | `LoginScreen` | Auth Stack |
| `SignupForm.jsx` | `SignupScreen` | Auth Stack |
| `ForgotPassword.jsx` | `ForgotPasswordScreen` | Auth Stack |
| `ChatList.jsx` | `ChatsScreen` | Tab Navigator |
| `ChatWindow.jsx` | `ChatScreen` | Stack (push) |
| `GroupList.jsx` | `GroupsScreen` | Tab Navigator |
| `GroupChat.jsx` | `GroupChatScreen` | Stack (push) |
| `CreateGroup.jsx` | `CreateGroupScreen` | Modal |
| `ContactList.jsx` | `ContactsScreen` | Tab Navigator |
| `UserDirectory.jsx` | `DirectoryScreen` | Tab Navigator |
| `UserProfile.jsx` | `ProfileScreen` | Stack (push) |
| `Settings.jsx` | `SettingsScreen` | Tab Navigator |
| `InviteManagement.jsx` | `InvitesScreen` | Stack (push) |

### Navigation Structure

```
Root Navigator (Stack)
├── Auth Navigator (Stack) - When not authenticated
│   ├── Login Screen
│   ├── Signup Screen
│   └── Forgot Password Screen
│
└── Main Navigator (Tab) - When authenticated
    ├── Chats Tab (Stack)
    │   ├── Chat List Screen
    │   └── Chat Screen (DM)
    │
    ├── Groups Tab (Stack)
    │   ├── Group List Screen
    │   ├── Group Chat Screen
    │   └── Create Group Screen (Modal)
    │
    ├── Contacts Tab (Stack)
    │   ├── Contact List Screen
    │   └── Add Contact Screen
    │
    └── Settings Tab (Stack)
        ├── Settings Screen
        ├── Profile Screen
        ├── Invites Screen
        └── Blocked Users Screen
```

### iOS-Native UI Equivalents

| Web Element | iOS Equivalent | Library |
|-------------|---------------|---------|
| Sidebar | Tab Navigator | React Navigation |
| Modal Dialog | Modal / Sheet | React Native Modal |
| Dropdown Menu | ActionSheet | `@expo/react-native-action-sheet` |
| Toast Notification | Toast | `react-native-toast-message` |
| Scroll List | FlatList / SectionList | React Native Core |
| Pull to Refresh | RefreshControl | React Native Core |
| Swipe Actions | Swipeable Row | `react-native-gesture-handler` |
| Input Field | TextInput | React Native Core |
| Picker | Picker / Dropdown | `@react-native-picker/picker` |
| Image Gallery | FlatList Grid | Custom + `react-native-image-viewing` |

---

## 5. Development Phases

### Phase 1: Project Setup & Core Infrastructure

**Objective**: Establish project foundation and authentication flow

**Tasks**:
- [ ] Initialize React Native project (Expo managed workflow)
- [ ] Configure navigation structure (React Navigation)
- [ ] Set up API client (Axios with interceptors)
- [ ] Implement secure token storage (react-native-keychain)
- [ ] Create AuthContext with login/logout/signup
- [ ] Build authentication screens (Login, Signup, Forgot Password)
- [ ] Implement invite code validation
- [ ] Set up app theming (light/dark mode)
- [ ] Configure environment variables

**Deliverable**: Working authentication flow with navigation

---

### Phase 2: Real-time Infrastructure & Basic Messaging

**Objective**: Establish Socket.io connection and basic chat functionality

**Tasks**:
- [ ] Integrate Socket.io client
- [ ] Create SocketContext for connection management
- [ ] Implement connection state handling (connected/disconnected)
- [ ] Build chat list screen with conversations
- [ ] Implement basic message sending/receiving
- [ ] Create message bubble components
- [ ] Add typing indicators
- [ ] Implement read receipts
- [ ] Handle offline/online status

**Deliverable**: Working 1-on-1 direct messaging

---

### Phase 3: Advanced Messaging Features

**Objective**: Complete messaging feature parity with web

**Tasks**:
- [ ] Implement message reactions (emoji picker)
- [ ] Add message threading/replies
- [ ] Build message editing functionality
- [ ] Implement message deletion (soft delete)
- [ ] Add link preview support
- [ ] Implement image/file sharing
- [ ] Create image picker integration
- [ ] Add message search functionality
- [ ] Implement infinite scroll for message history

**Deliverable**: Full-featured DM experience

---

### Phase 4: Group Functionality

**Objective**: Implement group chat features

**Tasks**:
- [ ] Build group list screen
- [ ] Create group chat screen
- [ ] Implement group creation flow
- [ ] Add member management (add/remove)
- [ ] Build admin controls (promote, demote)
- [ ] Implement group settings (name, avatar)
- [ ] Add leave group functionality
- [ ] Handle group-specific socket events

**Deliverable**: Full group chat functionality

---

### Phase 5: Contacts & User Management

**Objective**: Implement contact and user features

**Tasks**:
- [ ] Build contact list screen
- [ ] Create user directory browser
- [ ] Implement add/remove contact
- [ ] Add user profile viewing
- [ ] Build profile editing screen
- [ ] Implement user blocking
- [ ] Add user muting
- [ ] Create invite code management

**Deliverable**: Complete user management features

---

### Phase 6: Push Notifications

**Objective**: Implement iOS push notifications

**Tasks**:
- [ ] Configure Apple Push Notification service (APNs)
- [ ] Set up Expo Push Notifications (if using Expo)
- [ ] Request notification permissions
- [ ] Register device token with backend
- [ ] Handle foreground notifications
- [ ] Handle background notifications
- [ ] Implement notification tap navigation
- [ ] Add badge count management
- [ ] Respect muted users/groups

**Deliverable**: Working push notifications

---

### Phase 7: Polish & Performance

**Objective**: Optimize and polish the application

**Tasks**:
- [ ] Implement offline support (queue messages)
- [ ] Add optimistic UI updates
- [ ] Optimize list rendering (FlatList)
- [ ] Add loading skeletons
- [ ] Implement error boundaries
- [ ] Add haptic feedback
- [ ] Optimize image caching
- [ ] Implement deep linking
- [ ] Add app state handling (background/foreground)
- [ ] Performance profiling and optimization

**Deliverable**: Production-ready application

---

### Phase 8: Testing & Launch Preparation

**Objective**: Prepare for App Store submission

**Tasks**:
- [ ] Write unit tests for utilities and hooks
- [ ] Write integration tests for critical flows
- [ ] Conduct iOS device testing (various models)
- [ ] Accessibility audit and fixes
- [ ] Create App Store assets (screenshots, description)
- [ ] Configure app signing and certificates
- [ ] Set up TestFlight for beta testing
- [ ] Conduct beta testing
- [ ] Address feedback and bugs
- [ ] Submit to App Store review

**Deliverable**: App Store approval

---

## 6. Code Reuse Strategy

### Directly Reusable Code (~30-40%)

These files can be copied with minimal or no changes:

```
Web                          →  Mobile
─────────────────────────────────────────
client/src/services/api.js   →  src/api/client.js
  - Axios instance
  - Request/response interceptors
  - Error handling

Context Logic:
  - AuthContext state logic
  - Socket event handlers
  - Contact management logic

Utilities:
  - Validation functions
  - Date formatting
  - Message formatting
  - Conversation ID generation
```

### Code Requiring Adaptation (~40%)

| Web Code | Adaptation Needed |
|----------|-------------------|
| React components | Convert JSX to React Native components |
| CSS/Tailwind | Convert to StyleSheet or NativeWind |
| localStorage | Use AsyncStorage or SecureStore |
| Browser notifications | Use react-native-push-notification |
| File uploads | Use react-native-image-picker |
| window/document APIs | Use React Native equivalents |

### Needs Full Rewrite (~20-30%)

- Navigation (web routes → React Navigation)
- UI components (HTML → React Native components)
- Styling (CSS → StyleSheet)
- Native integrations (camera, push, etc.)

### Shared Types (If Using TypeScript)

Consider creating a shared types package:

```typescript
// shared/types/index.ts
export interface User {
  _id: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  bio?: string;
  contacts: string[];
  blockedUsers: string[];
  mutedUsers: string[];
}

export interface Message {
  _id: string;
  sender: User;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  readBy: ReadReceipt[];
  reactions: Reaction[];
  replyTo?: Message;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
}

// ... etc
```

---

## 7. iOS-Specific Considerations

### App Store Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Privacy Policy** | Required - create and host privacy policy URL |
| **App Icons** | All required sizes (20pt to 1024pt) |
| **Launch Screen** | Storyboard or static image |
| **Minimum iOS Version** | iOS 13.0+ recommended |
| **Device Support** | iPhone (iPad optional) |
| **Permissions** | Declare in Info.plist with descriptions |

### Required Permissions

```xml
<!-- Info.plist -->
<key>NSCameraUsageDescription</key>
<string>Padeltalk needs camera access to take photos for sharing</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Padeltalk needs photo library access to share images</string>

<key>NSMicrophoneUsageDescription</key>
<string>Padeltalk needs microphone access for voice messages</string>

<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
  <string>fetch</string>
</array>
```

### iOS Design Guidelines

| Guideline | Implementation |
|-----------|----------------|
| **Safe Areas** | Use SafeAreaView for notch/home indicator |
| **Gestures** | Swipe back navigation, swipe actions on lists |
| **Haptics** | Add haptic feedback for key actions |
| **Typography** | Use system fonts (San Francisco) |
| **Tab Bar** | Bottom tab navigation (iOS convention) |
| **Navigation Bar** | Large titles where appropriate |
| **Pull to Refresh** | Standard iOS refresh pattern |
| **Action Sheets** | Use for contextual actions |

### iOS-Specific Features to Consider

1. **Handoff**: Continue conversations between iPhone and Mac
2. **Siri Integration**: "Send message to [contact] on Padeltalk"
3. **Spotlight Search**: Index contacts and recent conversations
4. **Share Extension**: Share content to Padeltalk from other apps
5. **Widget**: Show recent messages or unread count
6. **iCloud Keychain**: Sync login credentials across devices
7. **Face ID / Touch ID**: Biometric app lock option

### Backend Changes Needed

The existing backend is mobile-ready, but consider:

1. **Push Notification Service**: Add APNs integration
   - Store device tokens per user
   - Send push when recipient offline
   - Handle token refresh

2. **Device Token Endpoint**:
   ```
   POST /api/users/device-token
   Body: { token: string, platform: 'ios' | 'android' }
   ```

3. **Push Notification Logic**:
   - Check if recipient is connected via Socket.io
   - If not connected, send push notification
   - Respect muted users/groups

---

## 8. Testing Strategy

### Unit Testing

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Utilities | Jest | 90%+ |
| Hooks | React Testing Library | 80%+ |
| API Client | Jest + MSW | 80%+ |

### Integration Testing

| Flow | Tool | Priority |
|------|------|----------|
| Authentication | Detox | High |
| Send/Receive Message | Detox | High |
| Group Creation | Detox | Medium |
| Push Notifications | Manual | High |

### Device Testing Matrix

| Device | iOS Version | Priority |
|--------|-------------|----------|
| iPhone 15 Pro | iOS 17 | High |
| iPhone 13 | iOS 16 | High |
| iPhone SE (3rd gen) | iOS 15 | Medium |
| iPhone 11 | iOS 15 | Medium |
| iPad Pro | iPadOS 17 | Low |

### Beta Testing

1. **Internal Testing**: TestFlight with team (2 weeks)
2. **External Beta**: TestFlight with 50-100 users (4 weeks)
3. **Metrics to Track**:
   - Crash rate
   - Message delivery success rate
   - Socket reconnection frequency
   - App launch time
   - Battery usage

---

## 9. Deployment Strategy

### Development Environment

```
Local Development
├── Expo Go app for rapid testing
├── iOS Simulator for detailed testing
└── Physical device for push notifications
```

### Build Pipeline

```
Code Push to main
       │
       ▼
  GitHub Actions
       │
       ├── Run Tests
       ├── Lint Check
       └── Build Check
       │
       ▼
  EAS Build (Expo)
       │
       ├── Development Build → Expo Go
       ├── Preview Build → TestFlight (internal)
       └── Production Build → App Store
```

### Environment Configuration

| Environment | API URL | Features |
|-------------|---------|----------|
| Development | localhost:5001 | Debug mode, logs |
| Staging | staging.padeltalk.com | TestFlight builds |
| Production | api.padeltalk.com | App Store builds |

### App Store Submission Checklist

- [ ] App icons (all sizes)
- [ ] Screenshots (6.5", 5.5", iPad if supported)
- [ ] App description and keywords
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Marketing URL (optional)
- [ ] Age rating questionnaire
- [ ] Export compliance
- [ ] App Review information (demo account)

---

## 10. Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Socket.io connection issues on iOS | Medium | High | Implement robust reconnection logic, background fetch |
| Push notification delivery failures | Medium | Medium | Test thoroughly, implement fallback polling |
| iOS app review rejection | Medium | Medium | Follow guidelines strictly, prepare demo account |
| Performance on older devices | Low | Medium | Test on iPhone SE, optimize render |
| Native module compatibility | Low | High | Use Expo SDK modules where possible |

### Process Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep during development | Medium | Medium | Strict phase adherence, MVP focus |
| Apple developer account issues | Low | High | Set up account early, verify identity |
| TestFlight build delays | Low | Low | Automated builds, buffer time |

### Mitigation Strategies

1. **Early Prototype**: Build Phase 1-2 first to validate Socket.io on iOS
2. **Incremental Releases**: Use TestFlight for continuous feedback
3. **Feature Flags**: Ability to disable problematic features
4. **Monitoring**: Implement crash reporting (Sentry) and analytics

---

## Appendix A: Recommended Libraries

### Core Libraries

```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "react": "18.2.0",
    "react-native": "0.73.0",

    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.9.0",
    "@react-navigation/bottom-tabs": "^6.5.0",

    "axios": "^1.6.0",
    "socket.io-client": "^4.7.0",

    "@react-native-async-storage/async-storage": "^1.21.0",
    "expo-secure-store": "~12.8.0",

    "expo-notifications": "~0.27.0",
    "expo-image-picker": "~14.7.0",

    "react-native-safe-area-context": "^4.8.0",
    "react-native-screens": "~3.29.0",
    "react-native-gesture-handler": "~2.14.0",

    "nativewind": "^4.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

### Development Libraries

```json
{
  "devDependencies": {
    "@types/react": "~18.2.0",
    "typescript": "^5.3.0",
    "jest": "^29.7.0",
    "@testing-library/react-native": "^12.4.0",
    "detox": "^20.14.0"
  }
}
```

---

## Appendix B: API Endpoints Reference

The iOS app will use these existing endpoints:

### Authentication
- `POST /api/auth/signup` - Register with invite code
- `POST /api/auth/login` - Login, returns JWT
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request reset
- `POST /api/auth/reset-password/:token` - Reset password

### Users
- `GET /api/users` - Browse directory
- `GET /api/users/:id` - Get profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/:userId/block` - Block user
- `DELETE /api/users/:userId/block` - Unblock
- `POST /api/users/:userId/mute` - Mute user
- `DELETE /api/users/:userId/mute` - Unmute

### Contacts
- `GET /api/contacts` - Get contacts
- `POST /api/contacts/:userId` - Add contact
- `DELETE /api/contacts/:userId` - Remove contact

### Groups
- `GET /api/groups` - Get user's groups
- `POST /api/groups` - Create group
- `GET /api/groups/:id` - Get group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/:id/members` - Add member
- `DELETE /api/groups/:id/members/:userId` - Remove member
- `POST /api/groups/:id/leave` - Leave group

### Messages
- `GET /api/messages/dm/:userId` - Get DM history
- `GET /api/messages/group/:groupId` - Get group history
- `POST /api/messages/dm/:userId/read` - Mark as read
- `GET /api/messages/unread` - Unread count
- `GET /api/messages/search` - Search messages

### Invites
- `POST /api/invites` - Create invite
- `GET /api/invites` - List invites
- `GET /api/invites/validate/:code` - Validate code

---

## Appendix C: Socket Events Reference

### Client → Server

| Event | Payload | Purpose |
|-------|---------|---------|
| `message:send` | `{ recipientId, content, replyTo? }` | Send DM |
| `group:message:send` | `{ groupId, content, replyTo? }` | Send group message |
| `typing:start` | `{ recipientId }` | Start typing indicator |
| `typing:stop` | `{ recipientId }` | Stop typing indicator |
| `group:typing:start` | `{ groupId }` | Group typing start |
| `group:typing:stop` | `{ groupId }` | Group typing stop |
| `messages:read` | `{ recipientId }` | Mark messages read |
| `message:edit` | `{ messageId, content }` | Edit message |
| `message:delete` | `{ messageId }` | Delete message |
| `reaction:toggle` | `{ messageId, emoji }` | Toggle reaction |

### Server → Client

| Event | Payload | Purpose |
|-------|---------|---------|
| `message:receive` | `Message` | New DM received |
| `group:message:receive` | `Message` | New group message |
| `user:typing` | `{ userId, recipientId }` | User is typing |
| `user:stopped:typing` | `{ userId, recipientId }` | User stopped typing |
| `messages:marked:read` | `{ readerId, conversationId }` | Messages marked read |
| `message:edited` | `Message` | Message was edited |
| `message:deleted` | `{ messageId }` | Message was deleted |
| `reaction:updated` | `Message` | Reactions updated |
| `user:online` | `{ userId }` | User came online |
| `user:offline` | `{ userId }` | User went offline |

---

## Summary

This plan provides a comprehensive roadmap for converting Padeltalk from a web application to a native iOS app using React Native. The phased approach allows for incremental progress and early validation of critical features like real-time messaging.

**Key Success Factors**:
1. Leverage existing React knowledge and reusable code
2. Maintain feature parity with web application
3. Follow iOS design guidelines for native feel
4. Implement robust push notifications
5. Thorough testing on real devices

The existing backend requires minimal changes, primarily adding push notification support. The React Native approach provides the best balance of development speed, code reuse, and native performance.
