# Padeltalk - Deferred Work

## P2 - Nice to Have

### Replace window.location.reload() with context invalidation
- **What**: On club switch, re-fetch contacts/messages/groups without a full page reload
- **Why**: Current approach forces a full page reload, which is slow and feels jarring
- **Context**: ClubSwitcher.jsx triggers `window.location.reload()` after switching clubs. A proper fix would invalidate/re-fetch all club-scoped contexts (ContactContext, NotificationContext, SocketContext) without reloading
- **Effort**: M
- **Depends on**: Decision 1 (SocketProvider wired to ClubContext) is a prerequisite - already done

### Per-club accent colors
- **What**: Let club admins set their club's primary accent color via ClubAdminDashboard
- **Why**: Each club should feel like "their" app. The design token architecture (CSS custom properties) already supports overriding `--color-primary` per-club with zero refactoring
- **Context**: ThemeContext and CSS var system are in place. Need to: (1) add `accentColor` field to Club model, (2) add color picker to ClubAdminDashboard, (3) apply the club's color by setting a CSS var override when club context loads
- **Effort**: M
- **Depends on**: UI redesign (done)

### Voice messages (iOS app)
- **What**: Long-press send button to record a voice message with live waveform visualization
- **Why**: Padel players at courts often want to quickly send audio ("Running 5 mins late!") rather than typing. Differentiator from web-only experience
- **Context**: Requires expo-av for recording, backend support for audio file storage/streaming, waveform visualization component. Best built after core messaging is stable (post Phase 3 of iOS plan)
- **Effort**: M
- **Depends on**: iOS app Phase 3 (Advanced Messaging)

### Certificate pinning (iOS app)
- **What**: Pin the API server's TLS certificate in the iOS app to prevent MITM attacks
- **Why**: Sports clubs often have open WiFi networks where MITM is feasible. Certificate pinning prevents interception of API calls even on compromised networks
- **Context**: Can be done with `react-native-ssl-pinning` or custom Expo config plugin. Adds complexity to dev/debug workflow (need to bypass for development builds)
- **Effort**: S
- **Depends on**: iOS app Phase 1

## P3 - Backlog

### Implement password reset email sending
- **What**: Wire up nodemailer to actually send password reset emails
- **Why**: `authController.js:288` has a TODO comment. The forgot-password endpoint exists but doesn't send emails. Frontend pages are also missing (`App.jsx:59`)
- **Context**: The backend has `createPasswordResetToken()` method on User model. Need to: (1) configure nodemailer with SMTP/Gmail, (2) send the reset email, (3) create ForgotPasswordPage and ResetPasswordPage components
- **Effort**: M
- **Depends on**: Nothing

### Expand test coverage beyond middleware
- **What**: Add integration tests for API endpoints and E2E tests for critical user flows
- **Why**: Current test coverage is limited to middleware unit tests. Club switching, message sending, invite flows, and cross-club isolation should be tested
- **Context**: Jest is set up in server/. Need to add: API endpoint tests (supertest), socket event tests, and optionally E2E tests with a test database
- **Effort**: L
- **Depends on**: Nothing
