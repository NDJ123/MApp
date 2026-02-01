# Club Feature Implementation Plan

## Overview

This document outlines the implementation plan for introducing **Clubs** to Padeltalk. Clubs are organizational units that scope user visibility, messaging, and contacts. Users must belong to at least one club and can only interact with other members of the same club.

---

## Table of Contents

1. [Requirements Summary](#1-requirements-summary)
2. [Data Model Changes](#2-data-model-changes)
3. [API Changes](#3-api-changes)
4. [Socket.io Changes](#4-socketio-changes)
5. [Frontend Changes](#5-frontend-changes)
6. [Migration Strategy](#6-migration-strategy)
7. [Implementation Phases](#7-implementation-phases)
8. [Security Considerations](#8-security-considerations)
9. [Testing Plan](#9-testing-plan)

---

## 1. Requirements Summary

### Club Structure
- **Properties**: name, image, address, map coordinates, contact email, contact phone, description
- **Automatic group**: Each club has one group chat containing all active members
- **Extensible**: More properties will be added later

### User Roles

| Role | Scope | Permissions |
|------|-------|-------------|
| **Superadmin** | Global | Create clubs, assign club admins, promote other superadmins |
| **Club Admin** | Per-club | Remove members, edit club details, create invites, promote other club admins |
| **Member** | Per-club | Send/receive messages, create groups, invite others (if enabled) |

### Club Membership
- Users must belong to at least one club
- Users can be members of multiple clubs
- Membership can be **active** or **inactive**
- Inactive members cannot send/receive messages in that club
- Users can switch between their clubs in the UI

### Visibility Rules
- Users only see other members from the **currently selected club**
- DM conversations are **scoped per club** (same two users in different clubs = separate conversations)
- Contacts are **per-club** (not global)
- No cross-club messaging allowed

### Invite System
- Invites are created by **club admins**
- Invites are tied to the **creator's club**
- New users automatically join the club of the person who invited them
- Existing invite code format preserved (XXXX-XXXX)

### Groups
- Each club has one **automatic group** containing all active members
- Users are included by default but can leave
- Users can create additional groups within a club
- Groups are scoped to clubs

### Notifications
- Users receive notifications from **all clubs** (not just active club)
- Unread count shows **total across all clubs**

### First Superadmin
- Account with email `neildjohnson@icloud.com` (already exists)
- Promoted via migration script

### Migration
- Create club "OG Padel" with all existing users
- All existing data associated with this club

---

## 2. Data Model Changes

### 2.1 New Model: Club

```javascript
// server/src/models/Club.js

const clubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Club name is required'],
    trim: true,
    maxlength: [100, 'Club name cannot exceed 100 characters']
  },

  image: {
    type: String,  // URL or base64
    default: null
  },

  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    default: ''
  },

  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: '' }
  },

  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],  // [longitude, latitude]
      default: [0, 0]
    }
  },

  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },

  contactPhone: {
    type: String,
    trim: true
  },

  // The auto-created group for all members
  defaultGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },

  isActive: {
    type: Boolean,
    default: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Geospatial index for map queries (future use)
clubSchema.index({ location: '2dsphere' });
clubSchema.index({ name: 'text' });
```

### 2.2 Modified Model: User

```javascript
// Changes to server/src/models/User.js

const userSchema = new mongoose.Schema({
  // ... existing fields ...

  // NEW: Superadmin flag (global role)
  isSuperadmin: {
    type: Boolean,
    default: false
  },

  // NEW: Club memberships
  clubMemberships: [{
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // NEW: Currently selected club (for UI state persistence)
  activeClub: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club'
  },

  // MODIFIED: Contacts now scoped per club
  // OLD: contacts: [{ type: ObjectId, ref: 'User' }]
  // NEW:
  contacts: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club'
    }
  }],

  // MODIFIED: Blocked/muted users scoped per club
  blockedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club'
    }
  }],

  mutedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club'
    }
  }]

  // ... rest of existing fields ...
});

// Indexes
userSchema.index({ 'clubMemberships.club': 1 });
userSchema.index({ 'contacts.club': 1, 'contacts.user': 1 });
```

### 2.3 Modified Model: Message

```javascript
// Changes to server/src/models/Message.js

const messageSchema = new mongoose.Schema({
  // ... existing fields ...

  // NEW: Club scope for the message
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true,
    index: true
  },

  // MODIFIED: conversationId now includes club
  // Format changes from "id1_id2" to "clubId_id1_id2"
  conversationId: {
    type: String,
    index: true
  }

  // ... rest of existing fields ...
});

// Updated compound index
messageSchema.index({ club: 1, conversationId: 1, createdAt: -1 });
```

### 2.4 Modified Model: Group

```javascript
// Changes to server/src/models/Group.js

const groupSchema = new mongoose.Schema({
  // ... existing fields ...

  // NEW: Club scope
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true,
    index: true
  },

  // NEW: Is this the auto-created club group?
  isDefaultClubGroup: {
    type: Boolean,
    default: false
  }

  // ... rest of existing fields ...
});
```

### 2.5 Modified Model: Invite

```javascript
// Changes to server/src/models/Invite.js

const inviteSchema = new mongoose.Schema({
  // ... existing fields ...

  // NEW: Club the invite is for (derived from creator's context)
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true,
    index: true
  }

  // ... rest of existing fields ...
});
```

### 2.6 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           SUPERADMIN                                 │
│                    (User.isSuperadmin = true)                       │
│                              │                                       │
│                   Creates & Manages Clubs                           │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                          CLUB                                │   │
│  │  - name, image, description                                  │   │
│  │  - address, location (map)                                   │   │
│  │  - contactEmail, contactPhone                                │   │
│  │  - defaultGroup (auto-created)                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│           ┌──────────────────┼──────────────────┐                   │
│           ▼                  ▼                  ▼                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │ CLUB ADMIN  │    │   MEMBER    │    │   GROUPS    │             │
│  │ (role=admin)│    │(role=member)│    │ (per club)  │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│           │                  │                  │                   │
│           │                  │                  │                   │
│           ▼                  ▼                  ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                        MESSAGES                              │   │
│  │              (DMs and Group messages per club)               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                        INVITES                               │   │
│  │              (Created by admins, scoped to club)             │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. API Changes

### 3.1 New Endpoints: Club Management

```
# Superadmin only
POST   /api/clubs                    # Create a new club
GET    /api/clubs                    # List all clubs (superadmin sees all)
DELETE /api/clubs/:clubId            # Delete/deactivate a club

# Club admin or superadmin
PUT    /api/clubs/:clubId            # Update club details
POST   /api/clubs/:clubId/admins/:userId    # Promote user to club admin
DELETE /api/clubs/:clubId/admins/:userId    # Demote club admin to member
POST   /api/clubs/:clubId/members/:userId   # Add member to club
DELETE /api/clubs/:clubId/members/:userId   # Remove member from club

# Any authenticated user
GET    /api/clubs/:clubId            # Get club details (must be member)
GET    /api/clubs/my                 # Get user's clubs
PUT    /api/clubs/:clubId/switch     # Switch active club
PUT    /api/clubs/:clubId/membership # Update own membership (active/inactive)
```

### 3.2 New Endpoints: Superadmin

```
# Superadmin only
POST   /api/superadmin/promote/:userId      # Make user a superadmin
DELETE /api/superadmin/demote/:userId       # Remove superadmin status
GET    /api/superadmin/users                # List all users across all clubs
```

### 3.3 Modified Endpoints

| Endpoint | Change |
|----------|--------|
| `POST /api/auth/signup` | Auto-join club from invite |
| `GET /api/users` | Filter by active club |
| `GET /api/users/:id` | Verify same club membership |
| `GET /api/contacts` | Filter by active club |
| `POST /api/contacts/:userId` | Include club context |
| `DELETE /api/contacts/:userId` | Include club context |
| `POST /api/invites` | Require club admin role, tie to club |
| `GET /api/invites` | Filter by club |
| `GET /api/messages/dm/:userId` | Include club in query |
| `GET /api/messages/group/:groupId` | Verify club membership |
| `GET /api/groups` | Filter by active club |
| `POST /api/groups` | Associate with active club |
| `POST /api/users/:userId/block` | Include club context |
| `POST /api/users/:userId/mute` | Include club context |

### 3.4 Request/Response Changes

#### Club in Request Headers or Query
All club-scoped endpoints will use the user's `activeClub` from their profile. Alternative: pass `X-Club-Id` header.

```javascript
// Middleware to extract club context
const clubContext = async (req, res, next) => {
  const clubId = req.headers['x-club-id'] || req.user.activeClub;

  if (!clubId) {
    return res.status(400).json({ error: 'No active club selected' });
  }

  // Verify user is active member of this club
  const membership = req.user.clubMemberships.find(
    m => m.club.toString() === clubId && m.isActive
  );

  if (!membership) {
    return res.status(403).json({ error: 'Not an active member of this club' });
  }

  req.club = clubId;
  req.clubMembership = membership;
  next();
};
```

---

## 4. Socket.io Changes

### 4.1 Room Structure

```
Current:
- userId (personal room for DMs)
- group:{groupId} (group chat room)

New:
- userId (personal room - receives all notifications)
- club:{clubId}:user:{userId} (club-specific user room)
- club:{clubId}:group:{groupId} (club-scoped group room)
- club:{clubId}:all (all members of a club - for broadcasts)
```

### 4.2 Modified Events

| Event | Change |
|-------|--------|
| `message:send` | Include `clubId` in payload |
| `message:receive` | Include `clubId` in payload |
| `group:message:send` | Verify club membership |
| `typing:start/stop` | Include `clubId` |
| `user:online/offline` | Broadcast to club rooms only |

### 4.3 Connection Handling

```javascript
// On connection, join all club rooms for the user
socket.on('connection', (socket) => {
  const user = socket.user;

  // Join personal room (for cross-club notifications)
  socket.join(user._id.toString());

  // Join each club's rooms
  user.clubMemberships
    .filter(m => m.isActive)
    .forEach(membership => {
      const clubId = membership.club.toString();
      socket.join(`club:${clubId}:user:${user._id}`);
      socket.join(`club:${clubId}:all`);

      // Join all group rooms in this club
      // (handled separately when fetching groups)
    });
});
```

---

## 5. Frontend Changes

### 5.1 New Components

| Component | Purpose |
|-----------|---------|
| `ClubSwitcher.jsx` | Dropdown below logo to switch clubs |
| `ClubSettings.jsx` | Club details and settings (admins) |
| `ClubMembers.jsx` | Member list and management |
| `ClubCreate.jsx` | Create club form (superadmin) |
| `SuperadminPanel.jsx` | Superadmin management interface |
| `MembershipStatus.jsx` | Toggle active/inactive status |

### 5.2 Modified Components

| Component | Changes |
|-----------|---------|
| `Sidebar.jsx` | Add ClubSwitcher below logo |
| `ChatList.jsx` | Filter by active club |
| `ChatWindow.jsx` | Include club context in messages |
| `UserDirectory.jsx` | Filter by active club |
| `ContactList.jsx` | Filter by active club |
| `GroupList.jsx` | Filter by active club |
| `CreateGroup.jsx` | Associate with active club |
| `InviteManagement.jsx` | Show club context, admin-only |
| `SignupForm.jsx` | Display club being joined |

### 5.3 Context Changes

```javascript
// New: ClubContext.jsx
const ClubContext = createContext();

const ClubProvider = ({ children }) => {
  const [clubs, setClubs] = useState([]);        // User's clubs
  const [activeClub, setActiveClub] = useState(null);
  const [clubMembership, setClubMembership] = useState(null); // Role, isActive

  const switchClub = async (clubId) => {
    await api.put(`/clubs/${clubId}/switch`);
    setActiveClub(clubs.find(c => c._id === clubId));
  };

  const isSuperadmin = user?.isSuperadmin || false;
  const isClubAdmin = clubMembership?.role === 'admin';

  return (
    <ClubContext.Provider value={{
      clubs,
      activeClub,
      clubMembership,
      switchClub,
      isSuperadmin,
      isClubAdmin
    }}>
      {children}
    </ClubContext.Provider>
  );
};
```

### 5.4 UI Mockup: Club Switcher

```
┌─────────────────────────────────────┐
│  ┌───────────────────────────────┐  │
│  │      🎾 PADELTALK             │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  📍 OG Padel            ▼    │  │  ← Club switcher dropdown
│  └───────────────────────────────┘  │
│                                     │
│  ─────────────────────────────────  │
│  👤 Direct Messages                 │
│  ─────────────────────────────────  │
│    Alice Johnson                    │
│    Bob Smith                        │
│  ─────────────────────────────────  │
│  👥 Groups                          │
│  ─────────────────────────────────  │
│    OG Padel (all members)      📌  │  ← Default group pinned
│    Weekend Players                  │
│                                     │
└─────────────────────────────────────┘
```

### 5.5 Routing Changes

```javascript
// New routes
/clubs                    // Club management (superadmin)
/clubs/:clubId/settings   // Club settings (admin)
/clubs/:clubId/members    // Member management (admin)
/superadmin               // Superadmin panel

// Modified routes - now club-aware
/chat/:recipientId        // DM (uses active club context)
/groups/:groupId          // Group (verifies club membership)
```

---

## 6. Migration Strategy

### 6.1 Migration Script

```javascript
// server/src/migrations/001-add-clubs.js

const migrateToClubs = async () => {
  const db = mongoose.connection;

  console.log('Starting club migration...');

  // 1. Create the OG Padel club
  const ogPadelClub = await Club.create({
    name: 'OG Padel',
    description: 'The original Padeltalk community',
    createdBy: /* first superadmin ID */
  });

  console.log(`Created club: ${ogPadelClub.name}`);

  // 2. Create default group for OG Padel
  const allUsers = await User.find({});
  const defaultGroup = await Group.create({
    name: 'OG Padel',
    description: 'All members of OG Padel',
    club: ogPadelClub._id,
    isDefaultClubGroup: true,
    members: allUsers.map(u => ({ user: u._id, role: 'member' })),
    creator: /* first superadmin ID */
  });

  ogPadelClub.defaultGroup = defaultGroup._id;
  await ogPadelClub.save();

  console.log(`Created default group for club`);

  // 3. Promote first superadmin
  await User.updateOne(
    { email: 'neildjohnson@icloud.com' },
    {
      $set: {
        isSuperadmin: true,
        activeClub: ogPadelClub._id
      }
    }
  );

  console.log('Promoted neildjohnson@icloud.com to superadmin');

  // 4. Add all users to OG Padel club
  await User.updateMany(
    {},
    {
      $set: {
        activeClub: ogPadelClub._id,
        clubMemberships: [{
          club: ogPadelClub._id,
          role: 'member',
          isActive: true,
          joinedAt: new Date()
        }]
      }
    }
  );

  console.log(`Added ${allUsers.length} users to OG Padel`);

  // 5. Make superadmin also a club admin
  await User.updateOne(
    { email: 'neildjohnson@icloud.com' },
    {
      $set: {
        'clubMemberships.0.role': 'admin'
      }
    }
  );

  // 6. Migrate existing contacts to club-scoped format
  for (const user of allUsers) {
    if (user.contacts && user.contacts.length > 0) {
      const scopedContacts = user.contacts.map(contactId => ({
        user: contactId,
        club: ogPadelClub._id
      }));

      await User.updateOne(
        { _id: user._id },
        { $set: { contacts: scopedContacts } }
      );
    }

    // Same for blockedUsers and mutedUsers
    if (user.blockedUsers && user.blockedUsers.length > 0) {
      const scoped = user.blockedUsers.map(id => ({
        user: id,
        club: ogPadelClub._id
      }));
      await User.updateOne(
        { _id: user._id },
        { $set: { blockedUsers: scoped } }
      );
    }

    if (user.mutedUsers && user.mutedUsers.length > 0) {
      const scoped = user.mutedUsers.map(id => ({
        user: id,
        club: ogPadelClub._id
      }));
      await User.updateOne(
        { _id: user._id },
        { $set: { mutedUsers: scoped } }
      );
    }
  }

  console.log('Migrated contacts, blocked, and muted users');

  // 7. Add club to all existing messages
  await Message.updateMany(
    {},
    { $set: { club: ogPadelClub._id } }
  );

  // 8. Update conversationIds to include club
  const messages = await Message.find({ conversationId: { $exists: true } });
  for (const msg of messages) {
    if (msg.conversationId && !msg.conversationId.startsWith(ogPadelClub._id.toString())) {
      await Message.updateOne(
        { _id: msg._id },
        { $set: { conversationId: `${ogPadelClub._id}_${msg.conversationId}` } }
      );
    }
  }

  console.log('Migrated messages with club scope');

  // 9. Add club to all existing groups
  await Group.updateMany(
    { club: { $exists: false } },
    { $set: { club: ogPadelClub._id } }
  );

  console.log('Migrated groups with club scope');

  // 10. Add club to all existing invites
  await Invite.updateMany(
    {},
    { $set: { club: ogPadelClub._id } }
  );

  console.log('Migrated invites with club scope');

  console.log('Migration complete!');
};
```

### 6.2 Migration Steps

1. **Backup database** before migration
2. **Deploy new models** with optional club field initially
3. **Run migration script** to create OG Padel and migrate data
4. **Make club field required** after migration verified
5. **Deploy updated API** with club-aware endpoints
6. **Deploy updated frontend** with club switcher

---

## 7. Implementation Phases

### Phase 1: Data Model & Migration Foundation

**Tasks:**
- [ ] Create Club model
- [ ] Update User model with clubMemberships, isSuperadmin
- [ ] Update Message model with club field
- [ ] Update Group model with club field and isDefaultClubGroup
- [ ] Update Invite model with club field
- [ ] Write migration script
- [ ] Test migration on copy of production data

**Deliverable:** Database ready for clubs

---

### Phase 2: Superadmin & Club CRUD

**Tasks:**
- [ ] Create club controller and routes
- [ ] Implement superadmin middleware
- [ ] Create superadmin endpoints (promote/demote)
- [ ] Create club CRUD endpoints
- [ ] Build SuperadminPanel UI component
- [ ] Build ClubCreate form
- [ ] Build ClubSettings component

**Deliverable:** Superadmins can create and manage clubs

---

### Phase 3: Club Admin Features

**Tasks:**
- [ ] Implement club admin middleware
- [ ] Create member management endpoints
- [ ] Create club admin promotion endpoints
- [ ] Build ClubMembers management component
- [ ] Update InviteManagement for club admins
- [ ] Add club context to invite creation

**Deliverable:** Club admins can manage their clubs

---

### Phase 4: Club Context & Switching

**Tasks:**
- [ ] Create ClubContext provider
- [ ] Build ClubSwitcher component
- [ ] Update Sidebar with club switcher
- [ ] Implement club switching API
- [ ] Add X-Club-Id header to API calls
- [ ] Update AuthContext to load clubs
- [ ] Persist active club selection

**Deliverable:** Users can switch between clubs

---

### Phase 5: Scoped User Directory & Contacts

**Tasks:**
- [ ] Update /api/users to filter by club
- [ ] Update UserDirectory component
- [ ] Update contacts endpoints for club scope
- [ ] Update ContactList component
- [ ] Update block/mute endpoints for club scope
- [ ] Test visibility isolation

**Deliverable:** Users only see club members

---

### Phase 6: Scoped Messaging

**Tasks:**
- [ ] Update message creation with club context
- [ ] Update conversationId generation to include club
- [ ] Update DM queries to filter by club
- [ ] Update ChatList to show club-scoped conversations
- [ ] Update ChatWindow with club context
- [ ] Update Socket.io events with club context
- [ ] Update room structure for clubs

**Deliverable:** Messages scoped to clubs

---

### Phase 7: Scoped Groups & Default Club Group

**Tasks:**
- [ ] Update group creation with club context
- [ ] Create automatic club group on club creation
- [ ] Auto-add members to club group
- [ ] Update GroupList to filter by club
- [ ] Pin/highlight default club group in UI
- [ ] Handle member join/leave for default group
- [ ] Update group Socket.io rooms

**Deliverable:** Groups work within club context

---

### Phase 8: Membership Status & Polish

**Tasks:**
- [ ] Implement active/inactive membership toggle
- [ ] Block messaging for inactive members
- [ ] Update online status to respect active clubs
- [ ] Cross-club notification testing
- [ ] UI polish and error handling
- [ ] Performance optimization
- [ ] Documentation updates

**Deliverable:** Feature complete

---

### Phase 9: Testing & Deployment

**Tasks:**
- [ ] Unit tests for new models
- [ ] Integration tests for club-scoped APIs
- [ ] E2E tests for club flows
- [ ] Run migration on staging
- [ ] QA testing on staging
- [ ] Production backup
- [ ] Production migration
- [ ] Production deployment
- [ ] Monitor for issues

**Deliverable:** Production deployment

---

## 8. Security Considerations

### Access Control Matrix

| Resource | Superadmin | Club Admin | Member | Non-Member |
|----------|------------|------------|--------|------------|
| Create club | ✅ | ❌ | ❌ | ❌ |
| Delete club | ✅ | ❌ | ❌ | ❌ |
| Edit club details | ✅ | ✅ | ❌ | ❌ |
| Add club admin | ✅ | ✅ | ❌ | ❌ |
| Remove club admin | ✅ | ✅ (not self) | ❌ | ❌ |
| Create invite | ✅ | ✅ | ❌ | ❌ |
| Add member | ✅ | ✅ | ❌ | ❌ |
| Remove member | ✅ | ✅ | ❌ | ❌ |
| View members | ✅ | ✅ | ✅ | ❌ |
| Send message | ✅ | ✅ | ✅ | ❌ |
| Create group | ✅ | ✅ | ✅ | ❌ |
| Leave club | ✅ | ✅ | ✅ | N/A |

### Middleware Stack

```javascript
// Endpoint: PUT /api/clubs/:clubId
router.put('/:clubId',
  protect,           // Must be logged in
  clubContext,       // Extract and verify club membership
  requireClubAdmin,  // Must be admin of this club
  updateClub         // Controller
);

// Endpoint: POST /api/clubs
router.post('/',
  protect,
  requireSuperadmin, // Must be superadmin
  createClub
);
```

### Data Isolation Verification

Every club-scoped query must include club filter:

```javascript
// WRONG - potential data leak
const messages = await Message.find({
  conversationId: `${id1}_${id2}`
});

// CORRECT - club-scoped
const messages = await Message.find({
  club: req.club,
  conversationId: `${req.club}_${id1}_${id2}`
});
```

---

## 9. Testing Plan

### Unit Tests

| Test Area | Test Cases |
|-----------|------------|
| Club Model | Create, validate fields, indexes |
| User Model | Club membership operations |
| Middleware | superadmin check, club admin check, club context |
| Utilities | Conversation ID with club |

### Integration Tests

| Flow | Test Cases |
|------|------------|
| Club CRUD | Create, read, update, delete club |
| Membership | Join, leave, activate, deactivate |
| Admin | Promote, demote club admin |
| Invites | Create invite, use invite, join club |
| Messaging | DM within club, blocked across clubs |
| Groups | Create group, default group membership |

### E2E Tests

| Scenario | Steps |
|----------|-------|
| New user signup | Use invite → lands in correct club |
| Club switch | Switch club → sees different members |
| Cross-club isolation | Cannot message user not in club |
| Admin management | Admin adds/removes members |
| Superadmin flow | Create club → assign admin |

### Manual QA Checklist

- [ ] Superadmin can create new club
- [ ] Superadmin can promote/demote other superadmins
- [ ] Club admin can edit club details
- [ ] Club admin can create invites
- [ ] New user joins correct club from invite
- [ ] User sees only club members in directory
- [ ] DMs are scoped to current club
- [ ] Groups are scoped to current club
- [ ] Default club group contains all members
- [ ] User can switch between clubs
- [ ] User can deactivate membership
- [ ] Inactive user cannot send messages
- [ ] Notifications work across clubs
- [ ] Mobile responsive layout works

---

## Appendix A: Database Indexes

```javascript
// Club indexes
db.clubs.createIndex({ name: 'text' });
db.clubs.createIndex({ location: '2dsphere' });
db.clubs.createIndex({ isActive: 1 });

// User indexes
db.users.createIndex({ 'clubMemberships.club': 1 });
db.users.createIndex({ isSuperadmin: 1 });
db.users.createIndex({ 'contacts.club': 1, 'contacts.user': 1 });

// Message indexes
db.messages.createIndex({ club: 1, conversationId: 1, createdAt: -1 });
db.messages.createIndex({ club: 1, group: 1, createdAt: -1 });

// Group indexes
db.groups.createIndex({ club: 1 });
db.groups.createIndex({ club: 1, isDefaultClubGroup: 1 });

// Invite indexes
db.invites.createIndex({ club: 1, createdBy: 1 });
```

---

## Appendix B: API Response Examples

### GET /api/clubs/my

```json
{
  "clubs": [
    {
      "_id": "64abc123...",
      "name": "OG Padel",
      "image": "https://...",
      "membership": {
        "role": "admin",
        "isActive": true,
        "joinedAt": "2024-01-15T..."
      },
      "unreadCount": 5
    },
    {
      "_id": "64def456...",
      "name": "City Padel Club",
      "image": "https://...",
      "membership": {
        "role": "member",
        "isActive": true,
        "joinedAt": "2024-02-20T..."
      },
      "unreadCount": 12
    }
  ],
  "activeClub": "64abc123..."
}
```

### GET /api/clubs/:clubId

```json
{
  "club": {
    "_id": "64abc123...",
    "name": "OG Padel",
    "image": "https://...",
    "description": "The original Padeltalk community",
    "address": {
      "street": "123 Padel Lane",
      "city": "London",
      "postalCode": "SW1A 1AA",
      "country": "UK"
    },
    "location": {
      "type": "Point",
      "coordinates": [-0.1276, 51.5074]
    },
    "contactEmail": "hello@ogpadel.com",
    "contactPhone": "+44 20 1234 5678",
    "memberCount": 47,
    "createdAt": "2024-01-01T..."
  },
  "membership": {
    "role": "admin",
    "isActive": true
  }
}
```

---

## Summary

This plan transforms Padeltalk from a single-community chat app into a **multi-tenant club-based platform**. Key architectural decisions:

1. **Club as the primary scope** for all user interactions
2. **Superadmin → Club Admin → Member** role hierarchy
3. **Invite-based club joining** maintains controlled access
4. **Complete data isolation** between clubs
5. **Backward compatible migration** for existing users

The implementation is broken into 9 phases, allowing incremental development and testing. The migration preserves all existing data in the "OG Padel" club.
