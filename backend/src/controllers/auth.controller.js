const User = require('../models/User.model');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt.utils');
const {
  sendSuccess, sendCreated, sendError,
  sendUnauthorized, sendServerError,
} = require('../utils/response.utils');

/**
 * POST /api/auth/signup
 */
const signup = async (req, res) => {
  try {
    const { name, email, password, role = 'employee' } = req.body;

    // Check duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return sendError(res, 'Email already registered', 409);

    // Create user — password hashed via pre-save hook in model
    const user = await User.create({ name: name.trim(), email, password, role });

    // Generate tokens
    const tokenPayload = { sub: user._id.toString(), email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const { token: refreshToken, expiresAt } = generateRefreshToken(user._id);

    // Store refresh token in user document
    user.refreshTokens.push({ token: refreshToken, expiresAt });
    await user.save();

    return sendCreated(res, {
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      tokens: { accessToken, refreshToken },
    }, 'Account created successfully');
  } catch (error) {
    if (error.code === 11000) return sendError(res, 'Email already registered', 409);
    console.error('Signup error:', error);
    return sendServerError(res);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // select: false on password — must explicitly include it
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) return sendUnauthorized(res, 'Invalid credentials');
    if (!user.isActive) return sendUnauthorized(res, 'Account deactivated. Contact admin.');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return sendUnauthorized(res, 'Invalid credentials');

    const tokenPayload = { sub: user._id.toString(), email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const { token: refreshToken, expiresAt } = generateRefreshToken(user._id);

    // Clean expired tokens + store new refresh token
    user.cleanExpiredTokens();
    user.refreshTokens.push({ token: refreshToken, expiresAt });
    await user.save();

    return sendSuccess(res, {
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      tokens: { accessToken, refreshToken },
    }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    return sendServerError(res);
  }
};

/**
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return sendError(res, 'Refresh token required', 400);

    // Verify the token signature
    const decoded = verifyRefreshToken(token);

    // Find user and check token is still stored (not revoked)
    const user = await User.findOne({
      _id: decoded.sub,
      'refreshTokens.token': token,
      'refreshTokens.expiresAt': { $gt: new Date() },
    });

    if (!user || !user.isActive) return sendUnauthorized(res, 'Invalid or expired refresh token');

    // Rotate: remove old token, issue new one
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== token);
    const { token: newRefreshToken, expiresAt } = generateRefreshToken(user._id);
    user.refreshTokens.push({ token: newRefreshToken, expiresAt });
    await user.save();

    const tokenPayload = { sub: user._id.toString(), email: user.email, role: user.role };
    const newAccessToken = generateAccessToken(tokenPayload);

    return sendSuccess(res, {
      tokens: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    }, 'Token refreshed');
  } catch {
    return sendUnauthorized(res, 'Invalid or expired refresh token');
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    const { refreshToken: token, logoutAll = false } = req.body;
    const user = await User.findById(req.user._id);

    if (logoutAll) {
      user.refreshTokens = [];
    } else if (token) {
      user.refreshTokens = user.refreshTokens.filter((t) => t.token !== token);
    }

    await user.save();
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    return sendServerError(res);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return sendUnauthorized(res, 'User not found');
    return sendSuccess(res, { user });
  } catch {
    return sendServerError(res);
  }
};

module.exports = { signup, login, refreshToken, logout, getMe };
