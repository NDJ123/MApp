# Padeltalk iOS Conversion Plan

## Executive Summary

This document outlines the strategy for converting the Padeltalk web application into a native iOS application using **React Native** with **TypeScript** in a **monorepo** structure. The mobile app lives alongside the existing web client and Express.js server, sharing types and business logic via a `shared/` package.

### Key Decisions (from CEO Review — 2026-03-13)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Technology | React Native (Expo) | Code reuse, native feel, Android path later |
| Language | TypeScript from day one | Compile-time safety for API contracts and socket events |
| Repo structure | Monorepo (`mobile/` alongside `client/` and `server/`) | Single source of truth, shared types prevent drift |
| State management | React Context + Zustand | Zustand for global state, Context for DI |
| Crash reporting | Sentry in Phase 1 | Catch issues from day 1, before any feature work |
| Push notifications | Phase 6 | Build all features first, add push near the end |
| Message delivery | Fire-and-forget + toast on disconnect | Simple approach, message queue deferred to later |

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
11. [Review Findings & Failure Modes](#11-review-findings--failure-modes)

---

## 1. Current Application Analysis

### Tech Stack Overview

| Layer | Current Technology | Mobile Equivalent |
|-------|-------------------|-------------------|
| Frontend | React 19 + Vite | React Native + Expo |
| Language | JavaScript | TypeScript |
| State Management | React Context API | React Context + Zustand |
| Routing | React Router 7 | React Navigation 6 |
| Real-time | Socket.io Client | Socket.io Client (RN) |
| HTTP Client | Axios | Axios (works in RN) |
| Styling | Tailwind CSS | NativeWind (Tailwind for RN) |
| Build | Vite | Metro Bundler + EAS Build |

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
- [x] User/message reporting (App Store requirement)
- [x] Push notifications
- [x] Dark/light mode
- [x] Biometric app lock (FaceID/TouchID)

### Backend Compatibility

The existing Express.js backend requires **minimal changes** for iOS support:
- RESTful API endpoints are mobile-ready
- Socket.io supports React Native clients
- JWT authentication works identically
- All data formats are JSON (universal)

**New backend work needed:**
- APNs push notification service
- Device token storage endpoint
- Report user/message endpoint

---

## 2. Technology Recommendation

### Primary Recommendation: React Native + TypeScript

**Why React Native?**

| Factor | Benefit |
|--------|---------|
| **React Knowledge** | Team already knows React paradigms, hooks, and patterns |
| **Code Reuse** | ~15-25% business logic directly shared via `shared/` package |
| **Library Compatibility** | Axios, Socket.io-client work identically |
| **Native Performance** | Compiles to native iOS components |
| **Large Ecosystem** | Mature libraries for navigation, notifications, etc. |
| **Future Cross-Platform** | Same codebase can target Android later |

**Why TypeScript?**

| Factor | Benefit |
|--------|---------|
| **API Contract Safety** | Catch breaking API changes at compile time |
| **Socket Event Typing** | Type-safe event payloads prevent runtime bugs |
| **Navigation Params** | Type-safe navigation prevents "screen not found" crashes |
| **Refactoring Confidence** | Rename a field, compiler finds every usage |
| **IDE Support** | Better autocomplete, documentation, error detection |

### Alternative Options Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Native Swift/SwiftUI** | Best performance, full iOS features | Complete rewrite, no code reuse, iOS only | Overkill for chat app |
| **Flutter** | Great UI, cross-platform | New language (Dart), no code reuse | Learning curve |
| **PWA** | Minimal work, wrap existing web | Limited native features, no App Store | Deferred — good fallback |
| **Capacitor** | Uses existing web code | Performance issues, not truly native | Hybrid limitations |
| **React Native** | Code reuse, native feel, familiar | Bridge overhead, some native modules | **Recommended** |

### Recommended Stack for iOS

```
React Native 0.73+ (Expo managed workflow)
├── Language: TypeScript 5.3+
├── Navigation: React Navigation 6
├── State: React Context + Zustand
├── Styling: NativeWind 4 (Tailwind for RN)
├── Real-time: socket.io-client
├── HTTP: Axios
├── Push Notifications: expo-notifications + APNs
├── Secure Storage: expo-secure-store (for JWT)
├── Image Handling: expo-image-picker
├── Haptics: expo-haptics
├── Biometrics: expo-local-authentication
├── Network State: @react-native-community/netinfo
├── Crash Reporting: @sentry/react-native
├── Async Storage: @react-native-async-storage/async-storage
└── Image Cache: react-native-fast-image
```

### Expo vs Bare React Native

| Aspect | Expo Managed | Bare React Native |
|--------|--------------|-------------------|
| Setup | Easier, faster | More configuration |
| Native Modules | Expo SDK (extensive) | Full access |
| Build | Expo EAS Build | Xcode required |
| Push Notifications | Expo Push | APNs directly |
| OTA Updates | Built-in | CodePush required |
| **Recommendation** | **Start here** | Eject if needed |

**Recommendation**: Start with **Expo managed workflow** for faster development. Eject to bare workflow only if specific native modules are needed.

---

## 3. Architecture Design

### Monorepo Structure

```
padeltalk/                       # Existing repo root
├── client/                      # Existing React web app (JavaScript)
│   ├── src/
│   └── package.json
│
├── server/                      # Existing Express.js backend (JavaScript)
│   ├── src/
│   └── package.json
│
├── mobile/                      # NEW: React Native iOS app (TypeScript)
│   ├── src/
│   │   ├── api/                 # API client (imports from shared/)
│   │   │   └── client.ts        # Axios instance + SecureStore token
│   │   │
│   │   ├── components/          # Reusable UI components
│   │   │   ├── common/          # Buttons, inputs, avatars, etc.
│   │   │   ├── chat/            # Message bubbles, chat input, etc.
│   │   │   ├── groups/          # Group components
│   │   │   └── users/           # User cards, lists, etc.
│   │   │
│   │   ├── screens/             # Screen components (pages)
│   │   │   ├── auth/            # Login, Signup, ForgotPassword
│   │   │   ├── chat/            # ChatList, ChatScreen
│   │   │   ├── groups/          # GroupList, GroupDetails, CreateGroup
│   │   │   ├── contacts/        # ContactList, AddContact
│   │   │   └── settings/        # Profile, Settings, Theme
│   │   │
│   │   ├── navigation/          # React Navigation setup
│   │   │   ├── AppNavigator.tsx
│   │   │   ├── AuthNavigator.tsx
│   │   │   └── MainNavigator.tsx
│   │   │
│   │   ├── stores/              # Zustand stores (replaces some Contexts)
│   │   │   ├── authStore.ts
│   │   │   ├── socketStore.ts
│   │   │   └── notificationStore.ts
│   │   │
│   │   ├── context/             # React Context (for DI only)
│   │   │   └── ClubContext.tsx
│   │   │
│   │   ├── hooks/               # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useSocket.ts
│   │   │   ├── useMessages.ts
│   │   │   ├── useNetworkStatus.ts
│   │   │   └── useOnlineStatus.ts
│   │   │
│   │   ├── utils/               # Mobile-specific utilities
│   │   │   ├── storage.ts       # SecureStore + AsyncStorage wrapper
│   │   │   ├── haptics.ts       # Haptic feedback helpers
│   │   │   └── notifications.ts # Push notification helpers
│   │   │
│   │   ├── constants/           # App constants
│   │   │   ├── colors.ts
│   │   │   ├── typography.ts
│   │   │   └── config.ts
│   │   │
│   │   └── assets/              # Images, fonts
│   │
│   ├── app.json                 # Expo configuration
│   ├── tsconfig.json
│   ├── babel.config.js
│   ├── metro.config.js
│   └── package.json
│
├── shared/                      # NEW: Shared TypeScript types & logic
│   ├── types/                   # API contracts, socket events, models
│   │   ├── user.ts
│   │   ├── message.ts
│   │   ├── group.ts
│   │   ├── club.ts
│   │   ├── invite.ts
│   │   ├── api.ts               # API request/response types
│   │   └── socket.ts            # Socket event payload types
│   │
│   ├── validation/              # Input validation (shared between web & mobile)
│   │   ├── auth.ts
│   │   └── message.ts
│   │
│   ├── constants/               # Shared constants
│   │   └── socket-events.ts     # Event name constants
│   │
│   ├── tsconfig.json
│   └── package.json
│
├── docs/
├── TODOS.md
└── package.json                 # Root package.json (workspaces optional)
```

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PADELTALK SYSTEM ARCHITECTURE                    │
│                                                                      │
│  ┌──────────────┐                            ┌──────────────┐       │
│  │  React Web   │──────┐                     │  MongoDB     │       │
│  │  (Vercel)    │      │                     │  (Atlas)     │       │
│  │  JavaScript  │      │                     └──────┬───────┘       │
│  └──────────────┘      │                            │               │
│                         │                            │               │
│  ┌──────────────┐      ▼                            │               │
│  │  React Native│   ┌──────────────┐                │               │
│  │  iOS App     │──▶│  Express.js  │◀───────────────┘               │
│  │  TypeScript  │◀──│  (Render)    │                                │
│  │  (App Store) │   │              │    ┌──────────────┐            │
│  └──────┬───────┘   │  + APNs push │───▶│  Apple APNs  │            │
│         │           │  + device    │    │  Service     │            │
│         │           │    tokens    │    └──────────────┘            │
│         │           │  + reporting │                                │
│         │           └──────────────┘                                │
│         │                                                            │
│         ▼                                                            │
│  ┌──────────────┐                                                   │
│  │  shared/     │  ← TypeScript types, validation, socket events    │
│  │  (monorepo)  │  ← Used by both mobile/ and eventually client/    │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### State Management Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Entry                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Zustand Stores (global, no nesting required):                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │ authStore   │  │ socketStore  │  │ notificationStore│       │
│  │             │  │              │  │                  │       │
│  │ - user      │  │ - status     │  │ - permissions    │       │
│  │ - token     │  │ - onlineUsers│  │ - deviceToken    │       │
│  │ - loading   │  │ - reconnects │  │ - badgeCount     │       │
│  └─────────────┘  └──────────────┘  └──────────────────┘       │
│                                                                  │
│  React Context (dependency injection only):                     │
│  ┌──────────────┐                                               │
│  │ ClubContext  │  ← club selection, club-scoped queries        │
│  └──────────────┘                                               │
│                                                                  │
│              ┌───────────────────────┐                          │
│              │   Navigation Stack     │                          │
│              │   (React Navigation)   │                          │
│              └───────────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Socket.io Lifecycle State Machine (iOS-specific)

On iOS, the app lifecycle affects socket connections. This state machine must be
implemented in Phase 2 to prevent silent disconnections.

```
┌──────────┐  app launches    ┌───────────┐
│  IDLE    │─────────────────▶│ CONNECTING│
└──────────┘                  └─────┬─────┘
                                    │
                  connected         │  timeout/error
                  ┌─────────────────┤
                  ▼                 ▼
            ┌───────────┐    ┌───────────┐
            │ CONNECTED │    │  RETRYING  │◀──┐
            └─────┬─────┘    └─────┬─────┘   │
                  │                │          │
       app backgrounds      retry fails     retry
                  │                │          │
                  ▼                ▼          │
            ┌───────────┐    ┌───────────┐   │
            │ SUSPENDED │    │  FAILED   │───┘
            └─────┬─────┘    └───────────┘
                  │                         max retries
       app foregrounds                      exceeded
                  │                              │
                  ▼                              ▼
            ┌───────────┐              ┌───────────────┐
            │RECONNECTING│              │ DISCONNECTED │
            └─────┬──────┘              │ (show banner) │
                  │                     └───────────────┘
                  ▼
            ┌───────────┐
            │ CONNECTED │  ← fetch missed messages on reconnect
            └───────────┘
```

**Key behaviors:**
- On app background: socket is suspended by iOS (we don't disconnect proactively)
- On app foreground: immediately attempt reconnection
- On reconnect: fetch any messages missed while suspended
- After max retries: show persistent "No connection" banner
- Network state changes (WiFi→cellular): detected via NetInfo, trigger reconnect

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
                 ┌──────────────┐     ┌──────────────┐
                 │   MongoDB    │     │  Apple APNs  │
                 └──────────────┘     │  (Phase 6)   │
                                      └──────────────┘

Message Send Flow:
  User taps Send → Validate (non-empty, <16KB)
    → socket.emit('message:send', payload)
    → Server saves to MongoDB
    → Server emits 'message:receive' to recipient
    → If recipient offline + Phase 6 done: send push via APNs

  On disconnect: Toast "Connection lost" via NetInfo listener
  On reconnect: Fetch missed messages via REST API
```

---

## 4. Feature Mapping

### Web Component to iOS Screen Mapping

| Web Component | iOS Screen | Navigation Type |
|--------------|------------|-----------------|
| `LoginPage.jsx` | `LoginScreen` | Auth Stack |
| `SignupPage.jsx` | `SignupScreen` | Auth Stack |
| `ForgotPassword.jsx` | `ForgotPasswordScreen` | Auth Stack |
| `ChatLayout.jsx` (conversations) | `ChatsScreen` | Tab Navigator |
| `ConversationView.jsx` | `ChatScreen` | Stack (push) |
| `GroupList.jsx` | `GroupsScreen` | Tab Navigator |
| `ConversationView.jsx` (group) | `GroupChatScreen` | Stack (push) |
| `CreateGroupModal.jsx` | `CreateGroupScreen` | Modal |
| `ContactList.jsx` | `ContactsScreen` | Tab Navigator |
| `UserDirectory.jsx` | `DirectoryScreen` | Stack (push) |
| `ProfileSettings.jsx` | `ProfileScreen` | Stack (push) |
| `ClubSwitcher.jsx` | `ClubPickerScreen` | Modal |
| `InviteManagement.jsx` | `InvitesScreen` | Stack (push) |
| — (new) | `ReportScreen` | Modal |
| — (new) | `AppLockScreen` | Modal |

### Navigation Structure

```
Root Navigator (Stack)
├── Auth Navigator (Stack) — When not authenticated
│   ├── Login Screen
│   ├── Signup Screen
│   └── Forgot Password Screen
│
├── Biometric Lock Screen — When app locked (optional setting)
│
└── Main Navigator (Tab) — When authenticated
    ├── Chats Tab (Stack)
    │   ├── Chat List Screen
    │   └── Chat Screen (DM)
    │       └── Report Screen (Modal)
    │
    ├── Groups Tab (Stack)
    │   ├── Group List Screen
    │   ├── Group Chat Screen
    │   │   └── Report Screen (Modal)
    │   └── Create Group Screen (Modal)
    │
    ├── Contacts Tab (Stack)
    │   ├── Contact List Screen
    │   ├── User Directory Screen
    │   └── User Profile Screen
    │
    └── Settings Tab (Stack)
        ├── Settings Screen
        │   ├── App Lock toggle (FaceID/TouchID)
        │   └── Theme toggle (light/dark)
        ├── Profile Screen
        ├── Club Picker Screen (Modal)
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
| Online dot | Animated View | React Native Animated |
| Skeleton loaders | Shimmer | `react-native-skeleton-placeholder` |

---

## 5. Development Phases

### Phase 1: Foundation & Observability

**Objective**: Project setup, shared types, auth flow, crash reporting

**Tasks**:
- [ ] Initialize Expo managed project with TypeScript (`mobile/`)
- [ ] Create `shared/` package with TypeScript types for:
  - [ ] User, Message, Group, Club, Invite models
  - [ ] API request/response types
  - [ ] Socket event payload types
  - [ ] Socket event name constants
  - [ ] Input validation rules (auth, messages)
- [ ] Configure **Sentry** crash reporting + performance monitoring
- [ ] Configure navigation structure (React Navigation 6)
- [ ] Set up API client (Axios with SecureStore token interceptor)
- [ ] Implement secure token storage (expo-secure-store)
- [ ] Create auth screens (Login, Signup, Forgot Password)
- [ ] Implement invite code validation
- [ ] Set up app theming (dark mode default, light/system toggle)
- [ ] Configure environment variables (dev/staging/prod)
- [ ] Set up **NetInfo** for network state monitoring
- [ ] Add persistent "No connection" banner component

**Deliverable**: Working authentication flow with navigation, crash reporting, and network awareness

---

### Phase 2: Real-time Infrastructure & Basic Messaging

**Objective**: Socket.io connection with iOS lifecycle management and basic chat

**Tasks**:
- [ ] Integrate Socket.io client with typed events (from `shared/`)
- [ ] Create Zustand `socketStore` with state machine:
  - [ ] States: IDLE → CONNECTING → CONNECTED → SUSPENDED → RECONNECTING → DISCONNECTED
  - [ ] Auto-reconnect with exponential backoff on foreground resume
  - [ ] Fetch missed messages on reconnect via REST API
- [ ] Implement `AppState` listener (background/foreground transitions)
- [ ] Build chat list screen with conversations (FlatList)
- [ ] Implement basic message sending/receiving
- [ ] Add toast notification on socket disconnect (via NetInfo)
- [ ] Create message bubble components
- [ ] Add typing indicators (with 3s auto-stop timeout)
- [ ] Implement read receipts
- [ ] Handle online/offline user status
- [ ] Implement FlatList pagination (50 messages at a time)
- [ ] Add skeleton loaders for message list
- [ ] Add pull-to-refresh for conversation list

**Deliverable**: Working 1-on-1 direct messaging with connection resilience

---

### Phase 3: Advanced Messaging Features

**Objective**: Complete messaging feature parity with web + iOS-native interactions

**Tasks**:
- [ ] Implement message reactions (emoji picker)
- [ ] Add message threading/replies
- [ ] **Swipe gestures**: swipe right to reply, swipe left to react (react-native-gesture-handler)
- [ ] Build message editing functionality
- [ ] Implement message deletion (soft delete)
- [ ] Add link preview support
- [ ] Implement image/file sharing with:
  - [ ] Image compression before upload (limit to 2MB)
  - [ ] Upload progress indicator
  - [ ] Permission request flow (camera, photo library)
  - [ ] Graceful handling when permission denied (link to Settings)
- [ ] Create image picker integration (expo-image-picker)
- [ ] Add message search functionality
- [ ] Implement infinite scroll for message history

**Deliverable**: Full-featured DM experience with iOS-native gestures

---

### Phase 4: Group Functionality

**Objective**: Implement group chat features

**Tasks**:
- [ ] Build group list screen
- [ ] Create group chat screen (reuses message components from Phase 2-3)
- [ ] Implement group creation flow
- [ ] Add member management (add/remove)
- [ ] Build admin controls (promote, demote)
- [ ] Implement group settings (name, avatar)
- [ ] Add leave group functionality
- [ ] Handle group-specific socket events

**Deliverable**: Full group chat functionality

---

### Phase 5: Contacts, User Management & Security

**Objective**: Implement contact/user features, reporting, and biometric lock

**Tasks**:
- [ ] Build contact list screen
- [ ] Create user directory browser
- [ ] Implement add/remove contact
- [ ] Add user profile viewing
- [ ] Build profile editing screen
- [ ] Implement user blocking
- [ ] Add user muting
- [ ] Create invite code management
- [ ] **Report user/message** — Report button on user profiles and long-press message menu
  - [ ] Backend: `POST /api/reports` endpoint (stores reporter, reported user/message, reason)
  - [ ] Frontend: Report modal with reason selection (spam, harassment, inappropriate content)
  - [ ] Admin visibility in SuperAdminDashboard (web)
- [ ] **Biometric app lock** — Optional FaceID/TouchID on app open
  - [ ] Settings toggle for app lock
  - [ ] expo-local-authentication integration
  - [ ] Lock screen shown on app foreground when enabled
  - [ ] Fallback to device passcode

**Deliverable**: Complete user management with reporting and optional biometric security

---

### Phase 6: Push Notifications

**Objective**: Implement iOS push notifications with quick reply

**Tasks**:
- [ ] Configure Apple Push Notification service (APNs)
- [ ] Set up Expo Push Notifications
- [ ] Request notification permissions (with graceful denial handling)
- [ ] Register device token with backend:
  - [ ] Backend: `POST /api/users/device-token` — stores `{ token, platform: 'ios' }`
  - [ ] Backend: APNs integration service (send push when recipient offline)
  - [ ] Backend: Check socket connection status before sending push
- [ ] Handle foreground notifications (in-app banner, not system notification)
- [ ] Handle background notifications (system notification)
- [ ] Implement notification tap → navigate to correct conversation
- [ ] **Quick reply from notification** — inline reply without opening app
  - [ ] Configure notification action categories with text input
  - [ ] Handle reply action in background
- [ ] Add badge count management (clear on app open)
- [ ] Respect muted users/groups (no push for muted)
- [ ] **Lock screen privacy**: show sender name only, full content only when unlocked

**Deliverable**: Working push notifications with quick reply and privacy

---

### Phase 7: Polish & Performance

**Objective**: Optimize, polish, and delight

**Tasks**:
- [ ] **Haptic feedback** (expo-haptics):
  - [ ] Light tap on message send
  - [ ] Medium tap on reaction toggle
  - [ ] Light tap on pull-to-refresh trigger
  - [ ] Success notification on group create
- [ ] Optimize FlatList rendering:
  - [ ] `getItemLayout` for fixed-height message bubbles
  - [ ] `windowSize` tuning (default 21 → test with 10)
  - [ ] `maxToRenderPerBatch` optimization
- [ ] Implement **react-native-fast-image** for image caching (200MB limit)
- [ ] Add loading skeletons for all list screens
- [ ] Implement error boundaries per screen
- [ ] Implement deep linking (`padeltalk://chat/:userId`)
- [ ] Add app state handling (background/foreground) — clean up typing indicators
- [ ] Performance profiling on physical devices:
  - [ ] App cold start time (target: <3s)
  - [ ] Screen transition time (target: <300ms)
  - [ ] Message list scroll FPS (target: 60fps)
  - [ ] Memory usage under 10K messages (target: <200MB)
- [ ] Optimize image compression pipeline
- [ ] Add optimistic UI updates for message send

**Deliverable**: Production-ready, performant, delightful application

---

### Phase 8: Testing & Launch Preparation

**Objective**: Prepare for App Store submission

**Tasks**:
- [ ] Write unit tests for:
  - [ ] Shared types and validation (`shared/`)
  - [ ] Zustand stores (auth, socket, notification)
  - [ ] Custom hooks
  - [ ] API client interceptors
- [ ] Write integration tests (Detox) for:
  - [ ] Authentication flow (login, signup, logout)
  - [ ] Send/receive message flow
  - [ ] Group creation flow
  - [ ] Socket reconnection after background/foreground
  - [ ] Network offline → online transition
- [ ] Write E2E tests for:
  - [ ] Push notification tap → navigation
  - [ ] Deep link handling
  - [ ] Biometric lock flow
- [ ] Conduct iOS device testing:
  - [ ] iPhone 15 Pro (iOS 17) — High priority
  - [ ] iPhone 13 (iOS 16) — High priority
  - [ ] iPhone SE 3rd gen (iOS 15) — Medium priority
  - [ ] iPhone 11 (iOS 15) — Medium priority
- [ ] Accessibility audit (VoiceOver, Dynamic Type)
- [ ] Create App Store assets:
  - [ ] App icons (all required sizes)
  - [ ] Screenshots (6.5" and 5.5")
  - [ ] App description and keywords
  - [ ] Privacy policy URL
  - [ ] Support URL
- [ ] Configure app signing and certificates
- [ ] Set up TestFlight:
  - [ ] Internal testing (2 weeks)
  - [ ] External beta with 50-100 users (4 weeks)
- [ ] Prepare demo account for App Store review
- [ ] Address beta feedback and bugs
- [ ] Submit to App Store review

**Deliverable**: App Store approval

---

## 6. Code Reuse Strategy

### Shared Code via `shared/` Package (~15-25%)

The `shared/` package is created in Phase 1 and contains TypeScript types and
logic that both the web client and mobile app consume:

```typescript
// shared/types/user.ts
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
  clubs: ClubMembership[];
}

// shared/types/message.ts
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

// shared/types/socket.ts
export interface ClientToServerEvents {
  'message:send': (payload: { recipientId: string; content: string; replyTo?: string }) => void;
  'group:message:send': (payload: { groupId: string; content: string; replyTo?: string }) => void;
  'typing:start': (payload: { recipientId: string }) => void;
  'typing:stop': (payload: { recipientId: string }) => void;
  'messages:read': (payload: { recipientId: string }) => void;
  'message:edit': (payload: { messageId: string; content: string }) => void;
  'message:delete': (payload: { messageId: string }) => void;
  'reaction:toggle': (payload: { messageId: string; emoji: string }) => void;
}

export interface ServerToClientEvents {
  'message:receive': (message: Message) => void;
  'group:message:receive': (message: Message) => void;
  'user:typing': (payload: { userId: string; recipientId: string }) => void;
  'user:online': (payload: { userId: string }) => void;
  'user:offline': (payload: { userId: string }) => void;
  // ... etc
}

// shared/constants/socket-events.ts
export const SOCKET_EVENTS = {
  MESSAGE_SEND: 'message:send',
  MESSAGE_RECEIVE: 'message:receive',
  // ... all event names as constants
} as const;
```

### Code Requiring Adaptation (~40%)

| Web Code | Adaptation Needed |
|----------|-------------------|
| React components | Convert JSX to React Native components |
| CSS/Tailwind | Convert to NativeWind or StyleSheet |
| localStorage | Use SecureStore (token) or AsyncStorage (prefs) |
| Browser notifications | Use expo-notifications |
| File uploads | Use expo-image-picker + compression |
| window/document APIs | Use React Native equivalents |
| React Router | React Navigation (complete rewrite) |

### Needs Full Rewrite (~40-50%)

- Navigation (web routes → React Navigation stacks/tabs)
- UI components (HTML elements → React Native Views/Text/FlatList)
- Styling (CSS → StyleSheet/NativeWind)
- Native integrations (camera, push, biometrics, haptics)
- App lifecycle management (background/foreground)

---

## 7. iOS-Specific Considerations

### App Store Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Privacy Policy** | Required — create and host privacy policy URL |
| **App Icons** | All required sizes (20pt to 1024pt) |
| **Launch Screen** | Expo splash screen configuration |
| **Minimum iOS Version** | iOS 15.0+ (covers ~95% of devices) |
| **Device Support** | iPhone (iPad optional later) |
| **Permissions** | Declare in app.json with descriptions |
| **Content Reporting** | Report button on users and messages (Phase 5) |
| **Demo Account** | Stable test account for App Store reviewers |

### Required Permissions

```json
// app.json (Expo)
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Padeltalk needs camera access to take photos for sharing",
        "NSPhotoLibraryUsageDescription": "Padeltalk needs photo library access to share images",
        "NSMicrophoneUsageDescription": "Padeltalk needs microphone access for voice messages",
        "NSFaceIDUsageDescription": "Padeltalk uses Face ID to secure your account"
      }
    }
  }
}
```

### iOS Design Guidelines

| Guideline | Implementation |
|-----------|----------------|
| **Safe Areas** | Use SafeAreaView for notch/home indicator |
| **Gestures** | Swipe back navigation, swipe-to-reply/react on messages |
| **Haptics** | Haptic feedback on send, react, pull-to-refresh |
| **Typography** | Use system fonts (San Francisco) via default RN |
| **Tab Bar** | Bottom tab navigation (iOS convention) |
| **Navigation Bar** | Large titles where appropriate |
| **Pull to Refresh** | Standard iOS refresh pattern on all lists |
| **Action Sheets** | Use for contextual actions (report, block, etc.) |

### iOS-Specific Features (Future / Post-v1)

1. **Handoff**: Continue conversations between iPhone and Mac
2. **Siri Integration**: "Send message to [contact] on Padeltalk"
3. **Spotlight Search**: Index contacts and recent conversations
4. **Share Extension**: Share content to Padeltalk from other apps
5. **Widget**: Show recent messages or unread count
6. **Apple Watch**: Notification actions and quick replies

### Backend Changes Needed

1. **Push Notification Service** (Phase 6):
   - Add `deviceTokens` array to User model: `[{ token: string, platform: 'ios' | 'android' }]`
   - APNs integration service using `@parse/node-apn` or Expo Push API
   - Logic: check socket connection → if offline, send push
   - Handle token refresh and deregistration

2. **Device Token Endpoint**:
   ```
   POST /api/users/device-token
   Body: { token: string, platform: 'ios' | 'android' }
   ```

3. **Report Endpoint** (Phase 5):
   ```
   POST /api/reports
   Body: { targetType: 'user' | 'message', targetId: string, reason: string }
   ```

---

## 8. Testing Strategy

### Unit Testing

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Shared types/validation | Jest | 90%+ |
| Zustand stores | Jest | 85%+ |
| Custom hooks | React Testing Library | 80%+ |
| API Client | Jest + MSW | 80%+ |

### Integration Testing

| Flow | Tool | Priority |
|------|------|----------|
| Authentication (login/signup/logout) | Detox | High |
| Send/Receive Message | Detox | High |
| Socket reconnection (background/foreground) | Detox | High |
| Network offline → online transition | Detox | High |
| Group Creation | Detox | Medium |
| Push Notification tap → navigate | Detox | Medium |
| Deep link handling | Detox | Medium |
| Biometric lock flow | Manual | Medium |

### Device Testing Matrix

| Device | iOS Version | Priority |
|--------|-------------|----------|
| iPhone 15 Pro | iOS 17 | High |
| iPhone 13 | iOS 16 | High |
| iPhone SE (3rd gen) | iOS 15 | Medium |
| iPhone 11 | iOS 15 | Medium |
| iPad Pro | iPadOS 17 | Low |

### Performance Testing

| Metric | Target | Tool |
|--------|--------|------|
| App cold start | <3 seconds | Sentry Performance |
| Screen transition | <300ms | Sentry Performance |
| Message list scroll | 60fps | Xcode Instruments |
| Memory (10K messages) | <200MB | Xcode Instruments |
| Image upload (10MB) | <5s on LTE | Manual |

### Beta Testing

1. **Internal Testing**: TestFlight with team (2 weeks)
2. **External Beta**: TestFlight with 50-100 users (4 weeks)
3. **Metrics to Track**:
   - Crash rate (Sentry)
   - Message delivery success rate
   - Socket reconnection frequency
   - App launch time
   - Battery usage

### Key Test Scenarios

**The confidence test:** Open a conversation with 5000 messages, switch to another app, wait 5 minutes, switch back. Socket reconnects, new messages appear, scroll position preserved, memory sane.

**The network test:** Toggle airplane mode on/off while sending messages. Toast appears on disconnect, messages resume on reconnect, no messages silently lost.

**The hostile QA test:** Send a message, immediately kill the app, reopen. Message was either sent or clearly shows as unsent.

---

## 9. Deployment Strategy

### Development Environment

```
Local Development
├── Expo Go app for rapid testing (hot reload)
├── iOS Simulator for detailed testing
├── Physical device for:
│   ├── Push notifications
│   ├── Biometrics (FaceID/TouchID)
│   ├── Haptics
│   └── Camera
└── Sentry dashboard for crash monitoring
```

### Build Pipeline

```
Code Push to default branch
       │
       ▼
  GitHub Actions
       │
       ├── TypeScript type check
       ├── Run unit tests (shared/ + mobile/)
       ├── Lint check (ESLint + Prettier)
       └── Build check
       │
       ▼
  EAS Build (Expo)
       │
       ├── Development Build → Expo Dev Client
       ├── Preview Build → TestFlight (internal)
       └── Production Build → App Store
       │
       ▼
  Post-deploy
       │
       ├── Sentry release tracking
       └── OTA updates for JS-only changes (expo-updates)
```

### Environment Configuration

| Environment | API URL | Features |
|-------------|---------|----------|
| Development | localhost:5001 | Debug mode, Sentry debug, logs |
| Staging | staging API on Render | TestFlight builds |
| Production | padeltalk.co.uk API | App Store builds |

### App Store Submission Checklist

- [ ] App icons (all sizes)
- [ ] Screenshots (6.5", 5.5")
- [ ] App description and keywords
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Marketing URL (optional)
- [ ] Age rating questionnaire
- [ ] Export compliance
- [ ] App Review information (demo account credentials)
- [ ] Content reporting feature implemented (App Store requirement)

---

## 10. Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Socket.io connection issues on iOS | Medium | High | State machine with reconnect logic, NetInfo monitoring, toast on disconnect |
| Push notification delivery failures | Medium | Medium | Test thoroughly, Expo Push for reliability, fallback: user opens app |
| iOS app review rejection | Medium | Medium | Report feature, privacy policy, demo account, follow HIG |
| Performance on older devices | Low | Medium | Test on iPhone SE/11, FlatList optimization, memory profiling |
| Native module compatibility | Low | High | Use Expo SDK modules, eject only if needed |
| Silent message loss | Medium | High | Toast on disconnect, NetInfo monitoring. Full message queue deferred |
| JWT expiry on app resume | Medium | Medium | Check token on foreground, refresh or redirect to login |

### Security Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| JWT stored insecurely | Low | High | expo-secure-store (iOS Keychain) |
| Push content on lock screen | Medium | Medium | Show sender name only, full content when unlocked |
| Deep link injection | Medium | Medium | Validate all deep link params before navigation |
| Certificate pinning absent | Medium | Medium | Consider adding for v1.1 (document in TODOS) |
| API URL in app bundle | Low | Low | API is authenticated, acceptable risk |

### Process Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep during development | Medium | Medium | Strict phase adherence, this plan as reference |
| TestFlight build delays | Low | Low | Automated EAS builds, buffer time |
| Shared types drift from server | Medium | Medium | TypeScript compilation catches mismatches |

### Mitigation Strategies

1. **Early Prototype**: Build Phase 1-2 first to validate Socket.io on iOS
2. **Incremental Releases**: Use TestFlight for continuous feedback from Phase 2
3. **Feature Flags**: Ability to disable problematic features
4. **Monitoring**: Sentry from day 1 for crashes + performance
5. **Type Safety**: TypeScript + shared types catch API contract breaks at compile time

---

## 11. Review Findings & Failure Modes

This section documents findings from the CEO plan review (2026-03-13).

### Error & Rescue Map

Every codepath that can fail on iOS, with planned handling:

```
METHOD/CODEPATH              | WHAT CAN GO WRONG              | HANDLING
-----------------------------|--------------------------------|----------------------------
API.login()                  | Network unreachable            | Retry 2x → "No connection" banner
                             | Server returns 401             | Clear token → login screen
                             | Server returns 500             | Log to Sentry → toast "Something went wrong"
                             | Request timeout (10s)          | Retry 1x → toast "Server not responding"
Socket.connect()             | JWT expired                    | Refresh token or redirect to login
                             | Server unreachable             | Reconnect with backoff → banner
                             | iOS kills background socket    | Reconnect on foreground via AppState
                             | Club context missing           | Redirect to club picker
socket.emit(msg)             | Socket disconnected            | Toast "Connection lost" (NetInfo)
                             | Network drops mid-send         | Toast "Connection lost" (NetInfo)
ImagePicker.launch()         | Permission denied              | Show "Enable in Settings" with deep link
                             | User cancels                   | No-op (handled by expo-image-picker)
                             | File too large (>10MB)         | Compress before upload, show progress
PushNotification.register()  | Permission denied              | Show explanation + Settings link
                             | APNs token fails               | Log to Sentry, retry on next app open
                             | Server rejects device token    | Log to Sentry, retry
SecureStore.get/set()        | Keychain unavailable           | Fallback to AsyncStorage + log warning
FlatList (messages)          | 10K+ messages                  | Pagination (50/batch), windowSize tuning
App resume from background   | JWT expired                    | Check token age, refresh or redirect
Deep link                    | Invalid/malformed URL          | Catch in navigation, redirect to chat list
```

### Failure Modes Registry

```
CODEPATH              | FAILURE MODE          | RESCUED? | TEST? | USER SEES        | LOGGED?
----------------------|-----------------------|----------|-------|------------------|--------
API calls             | Network unreachable   | Y        | Y     | "No connection"  | Y (Sentry)
API calls             | 401 unauthorized      | Y        | Y     | Login screen     | Y
API calls             | 500 server error      | Y        | N     | Toast            | Y (Sentry)
Socket.connect()      | Server unreachable    | Y        | Y     | Banner           | Y
Socket.connect()      | JWT expired           | Y        | Y     | Login screen     | Y
socket.emit(msg)      | Disconnected          | PARTIAL  | N     | Toast            | Y
ImagePicker           | Permission denied     | Y        | N     | Settings link    | N
PushNotification      | Permission denied     | Y        | N     | Explanation UI   | N
PushNotification      | Token reg fails       | Y        | N     | Silent (retry)   | Y (Sentry)
SecureStore           | Keychain unavailable  | Y        | N     | Transparent      | Y
FlatList              | OOM on large lists    | Y        | Y     | Pagination       | N
App resume            | JWT expired           | Y        | Y     | Login screen     | Y
Deep link             | Invalid URL           | Y        | Y     | Chat list        | Y
```

### Known Gaps (Deferred)

| Gap | Why deferred | When to address |
|-----|-------------|-----------------|
| Full message queue with delivery confirmation | User chose simpler toast approach for v1 | v1.1 if message loss becomes a real problem |
| Certificate pinning | Adds complexity to dev/debug workflow | v1.1 security hardening pass |
| Offline-first architecture | Requires local database (WatermelonDB/SQLite) | v2.0 if offline usage is significant |
| Content moderation dashboard | Report endpoint exists but admin tooling is basic | When report volume justifies it |

---

## Appendix A: Recommended Libraries

### Core Libraries

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "react": "18.3.0",
    "react-native": "0.76.0",

    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.9.0",
    "@react-navigation/bottom-tabs": "^6.5.0",

    "axios": "^1.7.0",
    "socket.io-client": "^4.7.0",
    "zustand": "^4.5.0",

    "@react-native-async-storage/async-storage": "^1.23.0",
    "expo-secure-store": "~13.0.0",
    "@react-native-community/netinfo": "^11.3.0",

    "expo-notifications": "~0.28.0",
    "expo-image-picker": "~15.0.0",
    "expo-haptics": "~13.0.0",
    "expo-local-authentication": "~14.0.0",

    "@sentry/react-native": "^5.19.0",

    "react-native-safe-area-context": "^4.9.0",
    "react-native-screens": "~3.31.0",
    "react-native-gesture-handler": "~2.16.0",
    "react-native-fast-image": "^8.6.0",
    "react-native-toast-message": "^2.2.0",

    "nativewind": "^4.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

### Development Libraries

```json
{
  "devDependencies": {
    "@types/react": "~18.3.0",
    "typescript": "^5.4.0",
    "jest": "^29.7.0",
    "@testing-library/react-native": "^12.4.0",
    "detox": "^20.14.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0"
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
- `POST /api/users/device-token` - Register push notification token **(NEW)**

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

### Reports **(NEW)**
- `POST /api/reports` - Report a user or message

---

## Appendix C: Socket Events Reference

### Client → Server

| Event | Payload Type | Purpose |
|-------|-------------|---------|
| `message:send` | `{ recipientId: string, content: string, replyTo?: string }` | Send DM |
| `group:message:send` | `{ groupId: string, content: string, replyTo?: string }` | Send group message |
| `typing:start` | `{ recipientId: string }` | Start typing indicator |
| `typing:stop` | `{ recipientId: string }` | Stop typing indicator |
| `group:typing:start` | `{ groupId: string }` | Group typing start |
| `group:typing:stop` | `{ groupId: string }` | Group typing stop |
| `messages:read` | `{ recipientId: string }` | Mark messages read |
| `message:edit` | `{ messageId: string, content: string }` | Edit message |
| `message:delete` | `{ messageId: string }` | Delete message |
| `reaction:toggle` | `{ messageId: string, emoji: string }` | Toggle reaction |

### Server → Client

| Event | Payload Type | Purpose |
|-------|-------------|---------|
| `message:receive` | `Message` | New DM received |
| `group:message:receive` | `Message` | New group message |
| `user:typing` | `{ userId: string, recipientId: string }` | User is typing |
| `user:stopped:typing` | `{ userId: string, recipientId: string }` | User stopped typing |
| `messages:marked:read` | `{ readerId: string, conversationId: string }` | Messages marked read |
| `message:edited` | `Message` | Message was edited |
| `message:deleted` | `{ messageId: string }` | Message was deleted |
| `reaction:updated` | `Message` | Reactions updated |
| `user:online` | `{ userId: string }` | User came online |
| `user:offline` | `{ userId: string }` | User went offline |

All event payloads are typed in `shared/types/socket.ts` and used by both web and mobile clients.

---

## Summary

This plan provides a comprehensive roadmap for converting Padeltalk from a web application to a native iOS app using React Native with TypeScript in a monorepo structure.

**Key Architecture Decisions:**
1. **Monorepo** — `mobile/`, `client/`, `server/`, and `shared/` in one repo
2. **TypeScript** — Type-safe API contracts, socket events, and navigation params
3. **Shared types** — `shared/` package prevents web/mobile drift
4. **Zustand** — Replaces nested Context providers for cleaner state management
5. **Sentry from day 1** — Crash reporting before any feature code

**Key iOS-Native Features:**
1. Swipe-to-reply and swipe-to-react on messages
2. Haptic feedback on key interactions
3. FaceID/TouchID optional app lock
4. Quick reply from push notifications
5. Network state monitoring with persistent connection banner

**Key Success Factors:**
1. Leverage existing React knowledge and shared TypeScript types
2. Follow iOS design guidelines for truly native feel
3. Validate Socket.io reliability on iOS early (Phase 2)
4. Robust error handling with Sentry observability
5. Thorough testing on real devices before App Store submission

The existing backend requires minimal changes: push notification support (Phase 6) and a report endpoint (Phase 5). The React Native approach provides the best balance of development speed, code reuse, and native performance.
