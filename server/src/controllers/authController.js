// =============================================================================
// AUTH CONTROLLER
// =============================================================================
// Handles all authentication-related operations:
// - Signup (register new user)
// - Login (authenticate user)
// - Logout (invalidate session)
// - Get current user
// - Password reset
//
// Controllers contain the business logic for routes.
// They receive requests, interact with models, and send responses.
// =============================================================================

import User from '../models/User.js';
import Invite from '../models/Invite.js';
import Group from '../models/Group.js';
import Club from '../models/Club.js';
import { generateToken, cookieOptions } from '../config/jwt.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import crypto from 'crypto';

// =============================================================================
// SIGNUP
// =============================================================================
// POST /api/auth/signup
// Register a new user with an invite code
// =============================================================================

export const signup = asyncHandler(async (req, res) => {
  const { inviteCode, username, email, displayName, password } = req.body;

  // -------------------------------------------------------------------------
  // Step 1: Validate invite code and get club
  // -------------------------------------------------------------------------
  const invite = await Invite.findOne({ code: inviteCode.toUpperCase() })
    .populate('club', 'name');

  if (!invite) {
    throw new AppError('Invalid invite code', 400);
  }

  if (invite.usedBy) {
    throw new AppError('This invite code has already been used', 400);
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    throw new AppError('This invite code has expired', 400);
  }

  // Verify the club exists and is active
  if (!invite.club) {
    throw new AppError('This invite is not associated with a club', 400);
  }

  const club = await Club.findById(invite.club._id);
  if (!club || !club.isActive) {
    throw new AppError('The club associated with this invite is no longer active', 400);
  }

  // -------------------------------------------------------------------------
  // Step 2: Check if user already exists
  // -------------------------------------------------------------------------
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new AppError('Email already registered', 400);
    }
    if (existingUser.username === username) {
      throw new AppError('Username already taken', 400);
    }
  }

  // -------------------------------------------------------------------------
  // Step 3: Create new user with club membership
  // -------------------------------------------------------------------------
  const user = await User.create({
    username,
    email,
    password,
    displayName,
    invitedBy: invite.createdBy,
    activeClub: club._id,
    clubMemberships: [
      {
        club: club._id,
        role: 'member',
        isActive: true,
        joinedAt: new Date(),
      },
    ],
  });

  // -------------------------------------------------------------------------
  // Step 4: Add user to the club's default group
  // -------------------------------------------------------------------------
  const defaultGroup = await Group.findOne({
    club: club._id,
    isDefaultClubGroup: true,
  });

  if (defaultGroup) {
    defaultGroup.members.push({
      user: user._id,
      role: 'member',
      joinedAt: new Date(),
    });
    await defaultGroup.save();
  }

  // -------------------------------------------------------------------------
  // Step 5: Mark invite as used
  // -------------------------------------------------------------------------
  invite.usedBy = user._id;
  invite.usedAt = new Date();
  await invite.save();

  // -------------------------------------------------------------------------
  // Step 6: Generate JWT and send response
  // -------------------------------------------------------------------------
  const token = generateToken(user._id);

  // Set token in cookie (optional - client can also use Authorization header)
  res.cookie('token', token, cookieOptions);

  // Send response
  res.status(201).json({
    status: 'success',
    message: 'Account created successfully',
    data: {
      user,
      token,
      club: {
        _id: club._id,
        name: club.name,
      },
    },
  });
});

// =============================================================================
// LOGIN
// =============================================================================
// POST /api/auth/login
// Authenticate user with email and password
// =============================================================================

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // -------------------------------------------------------------------------
  // Step 1: Find user by email (including password field)
  // -------------------------------------------------------------------------
  const user = await User.findByEmailWithPassword(email);

  if (!user) {
    // Don't reveal whether email exists or not (security)
    throw new AppError('Invalid email or password', 401);
  }

  // -------------------------------------------------------------------------
  // Step 2: Check password
  // -------------------------------------------------------------------------
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // -------------------------------------------------------------------------
  // Step 3: Generate JWT and send response
  // -------------------------------------------------------------------------
  const token = generateToken(user._id);

  res.cookie('token', token, cookieOptions);

  // Remove password from response
  user.password = undefined;

  res.status(200).json({
    status: 'success',
    message: 'Logged in successfully',
    data: {
      user,
      token,
    },
  });
});

// =============================================================================
// LOGOUT
// =============================================================================
// POST /api/auth/logout
// Clear authentication token
// =============================================================================

export const logout = asyncHandler(async (req, res) => {
  // Clear the token cookie
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000), // Expires in 5 seconds
    httpOnly: true,
  });

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});

// =============================================================================
// GET CURRENT USER
// =============================================================================
// GET /api/auth/me
// Get the currently authenticated user
// Requires authentication (protect middleware)
// =============================================================================

export const getMe = asyncHandler(async (req, res) => {
  // req.user is set by the protect middleware
  const user = await User.findById(req.userId)
    .populate('contacts.user', 'username displayName avatar')
    .populate('contacts.club', 'name')
    .populate('invitedBy', 'username displayName')
    .populate('clubMemberships.club', 'name image')
    .populate('activeClub', 'name image');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Format clubs for easier frontend consumption
  const clubs = user.clubMemberships?.map((m) => ({
    _id: m.club?._id,
    name: m.club?.name,
    image: m.club?.image,
    role: m.role,
    isActive: m.isActive,
    joinedAt: m.joinedAt,
  })) || [];

  res.status(200).json({
    status: 'success',
    data: {
      user,
      clubs,
      activeClub: user.activeClub,
    },
  });
});

// =============================================================================
// FORGOT PASSWORD
// =============================================================================
// POST /api/auth/forgot-password
// Send password reset email
// =============================================================================

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // -------------------------------------------------------------------------
  // Step 1: Find user by email
  // -------------------------------------------------------------------------
  const user = await User.findOne({ email });

  // Always return success (don't reveal if email exists)
  if (!user) {
    return res.status(200).json({
      status: 'success',
      message: 'If an account exists with this email, a reset link has been sent.',
    });
  }

  // -------------------------------------------------------------------------
  // Step 2: Generate reset token
  // -------------------------------------------------------------------------
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // -------------------------------------------------------------------------
  // Step 3: Send email with reset link
  // -------------------------------------------------------------------------
  const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  // TODO: Implement email sending with nodemailer
  // For now, log the URL (remove in production!)
  console.log('[Password Reset] URL:', resetURL);

  // In a real app, you would send an email here:
  // await sendEmail({
  //   to: user.email,
  //   subject: 'Password Reset Request',
  //   text: `Reset your password: ${resetURL}`,
  // });

  res.status(200).json({
    status: 'success',
    message: 'If an account exists with this email, a reset link has been sent.',
    // Only include resetURL in development for testing
    ...(process.env.NODE_ENV === 'development' && { resetURL }),
  });
});

// =============================================================================
// RESET PASSWORD
// =============================================================================
// POST /api/auth/reset-password/:token
// Reset password using token from email
// =============================================================================

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  // -------------------------------------------------------------------------
  // Step 1: Hash the token and find user
  // -------------------------------------------------------------------------
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }, // Token not expired
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  // -------------------------------------------------------------------------
  // Step 2: Update password and clear reset token
  // -------------------------------------------------------------------------
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // -------------------------------------------------------------------------
  // Step 3: Log user in with new password
  // -------------------------------------------------------------------------
  const authToken = generateToken(user._id);

  res.cookie('token', authToken, cookieOptions);

  res.status(200).json({
    status: 'success',
    message: 'Password reset successfully',
    data: {
      token: authToken,
    },
  });
});

export default {
  signup,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
};
