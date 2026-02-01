// =============================================================================
// CLUB CONTROLLER
// =============================================================================
// Handles club operations:
// - Create club (superadmin only)
// - Get club details
// - Update club settings
// - Get user's clubs
// - Switch active club
// - Manage club membership status
// - Add/remove members
// - Promote/demote admins
// =============================================================================

import Club from '../models/Club.js';
import User from '../models/User.js';
import Group from '../models/Group.js';

// =============================================================================
// CREATE CLUB (Superadmin only)
// =============================================================================
// POST /api/clubs
// =============================================================================

export const createClub = async (req, res, next) => {
  try {
    const {
      name,
      description,
      image,
      address,
      location,
      contactEmail,
      contactPhone,
    } = req.body;

    // Validate name
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Club name must be at least 2 characters',
      });
    }

    // Create the club
    const club = await Club.create({
      name: name.trim(),
      description: description?.trim() || '',
      image: image || null,
      address: address || {},
      location: location || { type: 'Point', coordinates: [0, 0] },
      contactEmail: contactEmail?.trim() || '',
      contactPhone: contactPhone?.trim() || '',
      createdBy: req.user._id,
    });

    // Create the default group for the club with the creator as first member
    const defaultGroup = await Group.create({
      name: club.name,
      description: `All members of ${club.name}`,
      club: club._id,
      isDefaultClubGroup: true,
      members: [
        {
          user: req.user._id,
          role: 'admin',
          joinedAt: new Date(),
        },
      ],
      createdBy: req.user._id,
      isActive: true,
    });

    // Update club with default group reference
    club.defaultGroup = defaultGroup._id;
    await club.save();

    // Add the creator as an admin member of this club
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        clubMemberships: {
          club: club._id,
          role: 'admin',
          isActive: true,
          joinedAt: new Date(),
        },
      },
    });

    // Populate for response
    await club.populate('createdBy', 'username displayName');

    res.status(201).json({
      status: 'success',
      data: { club },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET ALL CLUBS (Superadmin only)
// =============================================================================
// GET /api/clubs
// =============================================================================

export const getAllClubs = async (req, res, next) => {
  try {
    const clubs = await Club.find({ isActive: true })
      .populate('createdBy', 'username displayName')
      .sort({ name: 1 });

    // Get member counts for each club
    const clubsWithCounts = await Promise.all(
      clubs.map(async (club) => {
        const memberCount = await User.countDocuments({
          'clubMemberships.club': club._id,
          'clubMemberships.isActive': true,
        });
        return {
          ...club.toJSON(),
          memberCount,
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: { clubs: clubsWithCounts },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET MY CLUBS
// =============================================================================
// GET /api/clubs/my
// =============================================================================

export const getMyClubs = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get club IDs from user's memberships
    const clubIds = req.user.clubMemberships
      ?.filter((m) => m.isActive)
      .map((m) => m.club) || [];

    if (clubIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          clubs: [],
          activeClub: null,
        },
      });
    }

    // Fetch clubs
    const clubs = await Club.find({
      _id: { $in: clubIds },
      isActive: true,
    }).sort({ name: 1 });

    // Add membership info to each club
    const clubsWithMembership = clubs.map((club) => {
      const membership = req.user.clubMemberships.find(
        (m) => m.club.toString() === club._id.toString()
      );
      return {
        ...club.toJSON(),
        membership: {
          role: membership?.role || 'member',
          isActive: membership?.isActive || false,
          joinedAt: membership?.joinedAt,
        },
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        clubs: clubsWithMembership,
        activeClub: req.user.activeClub,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET CLUB DETAILS
// =============================================================================
// GET /api/clubs/:clubId
// =============================================================================

export const getClub = async (req, res, next) => {
  try {
    const { clubId } = req.params;

    const club = await Club.findById(clubId)
      .populate('createdBy', 'username displayName avatar')
      .populate('defaultGroup', 'name');

    if (!club) {
      return res.status(404).json({
        status: 'error',
        message: 'Club not found',
      });
    }

    // Get member count
    const memberCount = await User.countDocuments({
      'clubMemberships.club': club._id,
    });

    // Get admin count
    const adminCount = await User.countDocuments({
      clubMemberships: {
        $elemMatch: {
          club: club._id,
          role: 'admin',
          isActive: true,
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        club: {
          ...club.toJSON(),
          memberCount,
          adminCount,
        },
        membership: req.clubMembership,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// UPDATE CLUB
// =============================================================================
// PUT /api/clubs/:clubId
// =============================================================================

export const updateClub = async (req, res, next) => {
  try {
    const {
      name,
      description,
      image,
      address,
      location,
      contactEmail,
      contactPhone,
    } = req.body;

    const club = req.club;

    // Update fields
    if (name !== undefined) {
      if (name.trim().length < 2) {
        return res.status(400).json({
          status: 'error',
          message: 'Club name must be at least 2 characters',
        });
      }
      club.name = name.trim();
    }
    if (description !== undefined) club.description = description.trim();
    if (image !== undefined) club.image = image || null;
    if (address !== undefined) club.address = address;
    if (location !== undefined) club.location = location;
    if (contactEmail !== undefined) club.contactEmail = contactEmail?.trim() || '';
    if (contactPhone !== undefined) club.contactPhone = contactPhone?.trim() || '';

    await club.save();

    res.status(200).json({
      status: 'success',
      data: { club },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// DELETE CLUB (Superadmin only - soft delete)
// =============================================================================
// DELETE /api/clubs/:clubId
// =============================================================================

export const deleteClub = async (req, res, next) => {
  try {
    const club = req.club;

    // Soft delete - just mark as inactive
    club.isActive = false;
    await club.save();

    // Also deactivate the default group
    if (club.defaultGroup) {
      await Group.findByIdAndUpdate(club.defaultGroup, { isActive: false });
    }

    res.status(200).json({
      status: 'success',
      message: 'Club has been deactivated',
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// SWITCH ACTIVE CLUB
// =============================================================================
// PUT /api/clubs/:clubId/switch
// =============================================================================

export const switchClub = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const user = req.user;

    // Verify user is a member of this club
    const membership = user.clubMemberships?.find(
      (m) => m.club.toString() === clubId && m.isActive
    );

    if (!membership && !user.isSuperadmin) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not an active member of this club',
      });
    }

    // Update user's active club
    user.activeClub = clubId;
    await user.save();

    res.status(200).json({
      status: 'success',
      data: { activeClub: clubId },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// UPDATE MEMBERSHIP STATUS (Toggle active/inactive)
// =============================================================================
// PUT /api/clubs/:clubId/membership
// =============================================================================

export const updateMembership = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const { isActive } = req.body;
    const user = req.user;

    // Find the membership
    const membershipIndex = user.clubMemberships?.findIndex(
      (m) => m.club.toString() === clubId
    );

    if (membershipIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'You are not a member of this club',
      });
    }

    // Check if user is trying to deactivate their only membership
    const activeMemberships = user.clubMemberships.filter((m) => m.isActive);
    if (!isActive && activeMemberships.length === 1) {
      return res.status(400).json({
        status: 'error',
        message: 'You must have at least one active club membership',
      });
    }

    // Update membership status
    user.clubMemberships[membershipIndex].isActive = isActive;
    await user.save();

    // If deactivating current active club, switch to another active club
    if (!isActive && user.activeClub?.toString() === clubId) {
      const newActiveClub = user.clubMemberships.find(
        (m) => m.isActive && m.club.toString() !== clubId
      );
      if (newActiveClub) {
        user.activeClub = newActiveClub.club;
        await user.save();
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        membership: user.clubMemberships[membershipIndex],
        activeClub: user.activeClub,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET CLUB MEMBERS
// =============================================================================
// GET /api/clubs/:clubId/members
// =============================================================================

export const getMembers = async (req, res, next) => {
  try {
    const clubId = req.clubId;

    const members = await User.find({
      'clubMemberships.club': clubId,
    })
      .select('username displayName avatar bio clubMemberships')
      .sort({ displayName: 1 });

    // Format response with membership info
    const formattedMembers = members.map((member) => {
      const membership = member.clubMemberships.find(
        (m) => m.club.toString() === clubId.toString()
      );
      return {
        _id: member._id,
        username: member.username,
        displayName: member.displayName,
        avatar: member.avatar,
        bio: member.bio,
        role: membership?.role || 'member',
        isActive: membership?.isActive || false,
        joinedAt: membership?.joinedAt,
      };
    });

    res.status(200).json({
      status: 'success',
      data: { members: formattedMembers },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// ADD MEMBER TO CLUB (Admin only)
// =============================================================================
// POST /api/clubs/:clubId/members/:userId
// =============================================================================

export const addMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const clubId = req.clubId;

    // Find the user to add
    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Check if already a member
    const existingMembership = userToAdd.clubMemberships?.find(
      (m) => m.club.toString() === clubId.toString()
    );

    if (existingMembership) {
      // If inactive, reactivate
      if (!existingMembership.isActive) {
        existingMembership.isActive = true;
        await userToAdd.save();

        // Add to default group
        const defaultGroup = await Group.findOne({
          club: clubId,
          isDefaultClubGroup: true,
        });
        if (defaultGroup && !defaultGroup.isMember(userId)) {
          await defaultGroup.addMember(userId);
        }

        return res.status(200).json({
          status: 'success',
          message: 'Member reactivated',
        });
      }

      return res.status(400).json({
        status: 'error',
        message: 'User is already a member of this club',
      });
    }

    // Add membership
    userToAdd.clubMemberships.push({
      club: clubId,
      role: 'member',
      isActive: true,
      joinedAt: new Date(),
    });

    // Set as active club if they don't have one
    if (!userToAdd.activeClub) {
      userToAdd.activeClub = clubId;
    }

    await userToAdd.save();

    // Add to default group
    const defaultGroup = await Group.findOne({
      club: clubId,
      isDefaultClubGroup: true,
    });
    if (defaultGroup) {
      await defaultGroup.addMember(userId);
    }

    res.status(200).json({
      status: 'success',
      message: 'Member added to club',
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// REMOVE MEMBER FROM CLUB (Admin only)
// =============================================================================
// DELETE /api/clubs/:clubId/members/:userId
// =============================================================================

export const removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const clubId = req.clubId;

    // Can't remove yourself this way - use updateMembership to deactivate
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'Use the membership endpoint to update your own status',
      });
    }

    // Find the user
    const userToRemove = await User.findById(userId);
    if (!userToRemove) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Find their membership
    const membershipIndex = userToRemove.clubMemberships?.findIndex(
      (m) => m.club.toString() === clubId.toString()
    );

    if (membershipIndex === -1) {
      return res.status(400).json({
        status: 'error',
        message: 'User is not a member of this club',
      });
    }

    // Check if this is their only active club
    const activeMemberships = userToRemove.clubMemberships.filter((m) => m.isActive);
    if (activeMemberships.length === 1 && activeMemberships[0].club.toString() === clubId.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot remove user from their only active club',
      });
    }

    // Remove the membership
    userToRemove.clubMemberships.splice(membershipIndex, 1);

    // Update active club if needed
    if (userToRemove.activeClub?.toString() === clubId.toString()) {
      const newActive = userToRemove.clubMemberships.find((m) => m.isActive);
      userToRemove.activeClub = newActive?.club || null;
    }

    await userToRemove.save();

    // Remove from default group
    const defaultGroup = await Group.findOne({
      club: clubId,
      isDefaultClubGroup: true,
    });
    if (defaultGroup) {
      await defaultGroup.removeMember(userId);
    }

    res.status(200).json({
      status: 'success',
      message: 'Member removed from club',
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// PROMOTE MEMBER TO ADMIN
// =============================================================================
// POST /api/clubs/:clubId/admins/:userId
// =============================================================================

export const promoteToAdmin = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const clubId = req.clubId;

    // Find the user
    const userToPromote = await User.findById(userId);
    if (!userToPromote) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Find their membership
    const membership = userToPromote.clubMemberships?.find(
      (m) => m.club.toString() === clubId.toString()
    );

    if (!membership) {
      return res.status(400).json({
        status: 'error',
        message: 'User is not a member of this club',
      });
    }

    if (membership.role === 'admin') {
      return res.status(400).json({
        status: 'error',
        message: 'User is already an admin',
      });
    }

    // Promote to admin
    membership.role = 'admin';
    await userToPromote.save();

    res.status(200).json({
      status: 'success',
      message: 'User promoted to admin',
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// DEMOTE ADMIN TO MEMBER
// =============================================================================
// DELETE /api/clubs/:clubId/admins/:userId
// =============================================================================

export const demoteAdmin = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const clubId = req.clubId;

    // Can't demote yourself (unless superadmin)
    if (userId === req.user._id.toString() && !req.user.isSuperadmin) {
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

    // Find their membership
    const membership = userToDemote.clubMemberships?.find(
      (m) => m.club.toString() === clubId.toString()
    );

    if (!membership) {
      return res.status(400).json({
        status: 'error',
        message: 'User is not a member of this club',
      });
    }

    if (membership.role !== 'admin') {
      return res.status(400).json({
        status: 'error',
        message: 'User is not an admin',
      });
    }

    // Check if this would leave the club with no admins
    const adminCount = await User.countDocuments({
      clubMemberships: {
        $elemMatch: {
          club: clubId,
          role: 'admin',
          isActive: true,
        },
      },
    });

    if (adminCount <= 1) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot demote the only admin. Promote another member first.',
      });
    }

    // Demote to member
    membership.role = 'member';
    await userToDemote.save();

    res.status(200).json({
      status: 'success',
      message: 'Admin demoted to member',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createClub,
  getAllClubs,
  getMyClubs,
  getClub,
  updateClub,
  deleteClub,
  switchClub,
  updateMembership,
  getMembers,
  addMember,
  removeMember,
  promoteToAdmin,
  demoteAdmin,
};
