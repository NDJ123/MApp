// =============================================================================
// SUPERADMIN CONTROLLER
// =============================================================================
// Handles superadmin-only operations:
// - Promote user to superadmin
// - Demote superadmin
// - List all users across all clubs
// - Platform-wide statistics
// =============================================================================

import User from '../models/User.js';
import Club from '../models/Club.js';
import Message from '../models/Message.js';
import Group from '../models/Group.js';

// =============================================================================
// PROMOTE USER TO SUPERADMIN
// =============================================================================
// POST /api/superadmin/promote/:userId
// =============================================================================

export const promoteToSuperadmin = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Can't promote yourself (you're already a superadmin if you're here)
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'You are already a superadmin',
      });
    }

    // Find the user
    const userToPromote = await User.findById(userId);
    if (!userToPromote) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (userToPromote.isSuperadmin) {
      return res.status(400).json({
        status: 'error',
        message: 'User is already a superadmin',
      });
    }

    // Promote to superadmin
    userToPromote.isSuperadmin = true;
    await userToPromote.save();

    res.status(200).json({
      status: 'success',
      message: `${userToPromote.displayName} has been promoted to superadmin`,
      data: {
        user: {
          _id: userToPromote._id,
          username: userToPromote.username,
          displayName: userToPromote.displayName,
          email: userToPromote.email,
          isSuperadmin: true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// DEMOTE SUPERADMIN
// =============================================================================
// DELETE /api/superadmin/demote/:userId
// =============================================================================

export const demoteSuperadmin = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Can't demote yourself
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot demote yourself',
      });
    }

    // Find the user
    const userToDemote = await User.findById(userId);
    if (!userToDemote) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (!userToDemote.isSuperadmin) {
      return res.status(400).json({
        status: 'error',
        message: 'User is not a superadmin',
      });
    }

    // Check how many superadmins exist
    const superadminCount = await User.countDocuments({ isSuperadmin: true });
    if (superadminCount <= 1) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot demote the only superadmin. Promote another user first.',
      });
    }

    // Demote
    userToDemote.isSuperadmin = false;
    await userToDemote.save();

    res.status(200).json({
      status: 'success',
      message: `${userToDemote.displayName} is no longer a superadmin`,
      data: {
        user: {
          _id: userToDemote._id,
          username: userToDemote.username,
          displayName: userToDemote.displayName,
          email: userToDemote.email,
          isSuperadmin: false,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET ALL SUPERADMINS
// =============================================================================
// GET /api/superadmin/list
// =============================================================================

export const getSuperadmins = async (req, res, next) => {
  try {
    const superadmins = await User.find({ isSuperadmin: true })
      .select('username displayName email avatar createdAt')
      .sort({ displayName: 1 });

    res.status(200).json({
      status: 'success',
      data: { superadmins },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET ALL USERS (Platform-wide)
// =============================================================================
// GET /api/superadmin/users
// =============================================================================

export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { displayName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    // Get total count
    const total = await User.countDocuments(searchQuery);

    // Get paginated users
    const users = await User.find(searchQuery)
      .select('username displayName email avatar isSuperadmin clubMemberships createdAt')
      .populate('clubMemberships.club', 'name')
      .sort({ displayName: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Format response
    const formattedUsers = users.map((user) => ({
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatar: user.avatar,
      isSuperadmin: user.isSuperadmin,
      clubCount: user.clubMemberships?.length || 0,
      clubs: user.clubMemberships?.map((m) => ({
        _id: m.club?._id,
        name: m.club?.name,
        role: m.role,
        isActive: m.isActive,
      })),
      createdAt: user.createdAt,
    }));

    res.status(200).json({
      status: 'success',
      data: {
        users: formattedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET PLATFORM STATISTICS
// =============================================================================
// GET /api/superadmin/stats
// =============================================================================

export const getPlatformStats = async (req, res, next) => {
  try {
    // Get counts
    const [
      totalUsers,
      totalClubs,
      totalMessages,
      totalGroups,
      superadminCount,
    ] = await Promise.all([
      User.countDocuments(),
      Club.countDocuments({ isActive: true }),
      Message.countDocuments(),
      Group.countDocuments({ isActive: true }),
      User.countDocuments({ isSuperadmin: true }),
    ]);

    // Get recent activity
    const recentUsers = await User.find()
      .select('username displayName createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentClubs = await Club.find({ isActive: true })
      .select('name createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalUsers,
          totalClubs,
          totalMessages,
          totalGroups,
          superadminCount,
        },
        recentActivity: {
          users: recentUsers,
          clubs: recentClubs,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  promoteToSuperadmin,
  demoteSuperadmin,
  getSuperadmins,
  getAllUsers,
  getPlatformStats,
};
