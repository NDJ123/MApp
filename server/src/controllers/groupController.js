// =============================================================================
// GROUP CONTROLLER
// =============================================================================
// Handles group chat operations:
// - Create group
// - Get user's groups
// - Get group details
// - Add/remove members
// - Leave group
// =============================================================================

import Group from '../models/Group.js';
import User from '../models/User.js';

// =============================================================================
// CREATE GROUP
// =============================================================================
// POST /api/groups
// =============================================================================

export const createGroup = async (req, res, next) => {
  try {
    const { name, description, memberIds } = req.body;
    const creatorId = req.user._id;

    // Validate name
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Group name must be at least 2 characters',
      });
    }

    // Create initial members array with creator as admin
    const members = [{ user: creatorId, role: 'admin' }];

    // Add other members if provided
    if (memberIds && memberIds.length > 0) {
      // Verify all member IDs are valid users
      const validUsers = await User.find({ _id: { $in: memberIds } });
      const validIds = validUsers.map(u => u._id.toString());

      for (const id of memberIds) {
        if (validIds.includes(id) && id !== creatorId.toString()) {
          members.push({ user: id, role: 'member' });
        }
      }
    }

    // Create the group
    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || '',
      createdBy: creatorId,
      members,
    });

    // Populate members for response
    await group.populate('members.user', 'username displayName avatar');
    await group.populate('createdBy', 'username displayName');

    res.status(201).json({
      status: 'success',
      data: { group },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET USER'S GROUPS
// =============================================================================
// GET /api/groups
// =============================================================================

export const getMyGroups = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const groups = await Group.getGroupsForUser(userId);

    res.status(200).json({
      status: 'success',
      data: { groups },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET GROUP DETAILS
// =============================================================================
// GET /api/groups/:groupId
// =============================================================================

export const getGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId)
      .populate('members.user', 'username displayName avatar')
      .populate('createdBy', 'username displayName');

    if (!group) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found',
      });
    }

    // Check if user is a member
    if (!group.isMember(userId)) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not a member of this group',
      });
    }

    res.status(200).json({
      status: 'success',
      data: { group },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// ADD MEMBER TO GROUP
// =============================================================================
// POST /api/groups/:groupId/members
// =============================================================================

export const addMember = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { userId: newMemberId } = req.body;
    const requesterId = req.user._id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found',
      });
    }

    // Check if requester is an admin
    if (!group.isAdmin(requesterId)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only admins can add members',
      });
    }

    // Check if user exists
    const newMember = await User.findById(newMemberId);
    if (!newMember) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Check if already a member
    if (group.isMember(newMemberId)) {
      return res.status(400).json({
        status: 'error',
        message: 'User is already a member',
      });
    }

    // Add member
    await group.addMember(newMemberId);

    // Populate and return updated group
    await group.populate('members.user', 'username displayName avatar');

    res.status(200).json({
      status: 'success',
      data: { group },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// REMOVE MEMBER FROM GROUP
// =============================================================================
// DELETE /api/groups/:groupId/members/:userId
// =============================================================================

export const removeMember = async (req, res, next) => {
  try {
    const { groupId, userId: targetUserId } = req.params;
    const requesterId = req.user._id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found',
      });
    }

    // Check if requester is an admin (unless removing themselves)
    if (targetUserId !== requesterId.toString() && !group.isAdmin(requesterId)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only admins can remove members',
      });
    }

    // Can't remove the only admin
    const admins = group.members.filter(m => m.role === 'admin');
    if (admins.length === 1 && admins[0].user.toString() === targetUserId) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot remove the only admin. Promote another member first.',
      });
    }

    // Remove member
    await group.removeMember(targetUserId);

    // Populate and return updated group
    await group.populate('members.user', 'username displayName avatar');

    res.status(200).json({
      status: 'success',
      data: { group },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// LEAVE GROUP
// =============================================================================
// POST /api/groups/:groupId/leave
// =============================================================================

export const leaveGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found',
      });
    }

    // Check if user is a member
    if (!group.isMember(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'You are not a member of this group',
      });
    }

    // Can't leave if only admin
    const admins = group.members.filter(m => m.role === 'admin');
    if (admins.length === 1 && admins[0].user.toString() === userId.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'You are the only admin. Promote another member before leaving.',
      });
    }

    // Remove member
    await group.removeMember(userId);

    res.status(200).json({
      status: 'success',
      message: 'You have left the group',
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// UPDATE GROUP
// =============================================================================
// PUT /api/groups/:groupId
// =============================================================================

export const updateGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { name, description, avatar } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found',
      });
    }

    // Check if user is an admin
    if (!group.isAdmin(userId)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only admins can update group settings',
      });
    }

    // Update fields
    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();

    // Handle avatar update
    if (avatar !== undefined) {
      // Validate avatar if provided (should be base64 data URL or null to remove)
      if (avatar !== null && avatar !== '') {
        if (!avatar.startsWith('data:image/')) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid avatar format. Must be a base64 image.',
          });
        }
        // Check size (roughly 2MB limit for base64)
        if (avatar.length > 2 * 1024 * 1024) {
          return res.status(400).json({
            status: 'error',
            message: 'Avatar image is too large. Maximum size is 2MB.',
          });
        }
      }
      group.avatar = avatar || null;
    }

    await group.save();

    // Populate and return
    await group.populate('members.user', 'username displayName avatar');

    res.status(200).json({
      status: 'success',
      data: { group },
    });
  } catch (error) {
    next(error);
  }
};
