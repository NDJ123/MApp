// =============================================================================
// CLUB MIDDLEWARE TESTS
// =============================================================================
// Tests for clubContext, requireSuperadmin, and requireClubAdmin middleware.
// These are the critical guards for data isolation between clubs.
// =============================================================================

import { jest } from '@jest/globals';

// Mock Club model
const mockClub = {
  _id: 'club-123',
  isActive: true,
};

const mockInactiveClub = {
  _id: 'club-inactive',
  isActive: false,
};

jest.unstable_mockModule('../models/Club.js', () => ({
  default: {
    findById: jest.fn((id) => {
      if (id === 'club-123') return Promise.resolve(mockClub);
      if (id === 'club-inactive') return Promise.resolve(mockInactiveClub);
      if (id === 'invalid') return Promise.reject(new Error('Cast error'));
      return Promise.resolve(null);
    }),
  },
}));

const { clubContext, requireSuperadmin, requireClubAdmin, optionalClubContext } =
  await import('../middleware/club.js');

// Helper to create mock req/res/next
function createMocks(overrides = {}) {
  const req = {
    user: {
      _id: 'user-1',
      isSuperadmin: false,
      activeClub: null,
      clubMemberships: [],
    },
    headers: {},
    params: {},
    ...overrides,
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  const next = jest.fn();

  return { req, res, next };
}

// =============================================================================
// requireSuperadmin
// =============================================================================

describe('requireSuperadmin', () => {
  test('blocks unauthenticated users', () => {
    const { req, res, next } = createMocks({ user: null });
    requireSuperadmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('blocks non-superadmin users', () => {
    const { req, res, next } = createMocks();
    requireSuperadmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('allows superadmin users', () => {
    const { req, res, next } = createMocks({
      user: { isSuperadmin: true },
    });
    requireSuperadmin(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// =============================================================================
// clubContext
// =============================================================================

describe('clubContext', () => {
  test('blocks unauthenticated users', async () => {
    const { req, res, next } = createMocks({ user: null });
    await clubContext(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 400 when no club ID available', async () => {
    const { req, res, next } = createMocks();
    await clubContext(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('reads clubId from X-Club-Id header', async () => {
    const { req, res, next } = createMocks({
      headers: { 'x-club-id': 'club-123' },
      user: {
        _id: 'user-1',
        isSuperadmin: false,
        clubMemberships: [{ club: { toString: () => 'club-123' }, isActive: true, role: 'member' }],
      },
    });
    await clubContext(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.club).toBeTruthy();
  });

  test('reads clubId from route params', async () => {
    const { req, res, next } = createMocks({
      params: { clubId: 'club-123' },
      user: {
        _id: 'user-1',
        isSuperadmin: false,
        clubMemberships: [{ club: { toString: () => 'club-123' }, isActive: true, role: 'member' }],
      },
    });
    await clubContext(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.clubId._id || req.clubId).toBeTruthy();
  });

  test('falls back to user activeClub', async () => {
    const { req, res, next } = createMocks({
      user: {
        _id: 'user-1',
        isSuperadmin: false,
        activeClub: { toString: () => 'club-123' },
        clubMemberships: [{ club: { toString: () => 'club-123' }, isActive: true, role: 'member' }],
      },
    });
    await clubContext(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('returns 404 for non-existent club', async () => {
    const { req, res, next } = createMocks({
      params: { clubId: 'nonexistent' },
    });
    await clubContext(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 for inactive club', async () => {
    const { req, res, next } = createMocks({
      params: { clubId: 'club-inactive' },
    });
    await clubContext(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 for non-member', async () => {
    const { req, res, next } = createMocks({
      params: { clubId: 'club-123' },
      user: {
        _id: 'user-1',
        isSuperadmin: false,
        clubMemberships: [], // Not a member
      },
    });
    await clubContext(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 for inactive membership', async () => {
    const { req, res, next } = createMocks({
      params: { clubId: 'club-123' },
      user: {
        _id: 'user-1',
        isSuperadmin: false,
        clubMemberships: [{ club: { toString: () => 'club-123' }, isActive: false, role: 'member' }],
      },
    });
    await clubContext(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('superadmin can access any club', async () => {
    const { req, res, next } = createMocks({
      params: { clubId: 'club-123' },
      user: {
        _id: 'user-1',
        isSuperadmin: true,
        clubMemberships: [], // No memberships, but superadmin
      },
    });
    await clubContext(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.clubMembership.isSuperadmin).toBe(true);
  });

  test('sets req.club and req.clubId on success', async () => {
    const { req, res, next } = createMocks({
      params: { clubId: 'club-123' },
      user: {
        _id: 'user-1',
        isSuperadmin: false,
        clubMemberships: [{ club: { toString: () => 'club-123' }, isActive: true, role: 'admin' }],
      },
    });
    await clubContext(req, res, next);
    expect(req.club).toEqual(mockClub);
    expect(req.clubMembership.role).toBe('admin');
  });
});

// =============================================================================
// requireClubAdmin
// =============================================================================

describe('requireClubAdmin', () => {
  test('returns 500 if clubContext was not run first', () => {
    const { req, res, next } = createMocks();
    // No req.clubMembership set
    requireClubAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  test('blocks non-admin members', () => {
    const { req, res, next } = createMocks({
      clubMembership: { role: 'member' },
      user: { isSuperadmin: false },
    });
    requireClubAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('allows club admins', () => {
    const { req, res, next } = createMocks({
      clubMembership: { role: 'admin' },
      user: { isSuperadmin: false },
    });
    requireClubAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('allows superadmins even without admin role', () => {
    const { req, res, next } = createMocks({
      clubMembership: { role: 'member' },
      user: { isSuperadmin: true },
    });
    requireClubAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// =============================================================================
// optionalClubContext
// =============================================================================

describe('optionalClubContext', () => {
  test('continues without error when no user', async () => {
    const { req, res, next } = createMocks({ user: null });
    await optionalClubContext(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.club).toBeUndefined();
  });

  test('continues without error when no club ID', async () => {
    const { req, res, next } = createMocks();
    await optionalClubContext(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.club).toBeUndefined();
  });

  test('sets club context when valid club provided', async () => {
    const { req, res, next } = createMocks({
      params: { clubId: 'club-123' },
      user: {
        _id: 'user-1',
        isSuperadmin: false,
        clubMemberships: [{ club: { toString: () => 'club-123' }, isActive: true, role: 'member' }],
      },
    });
    await optionalClubContext(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.club).toEqual(mockClub);
  });

  test('continues without error for inactive club', async () => {
    const { req, res, next } = createMocks({
      params: { clubId: 'club-inactive' },
    });
    await optionalClubContext(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.club).toBeUndefined();
  });
});
