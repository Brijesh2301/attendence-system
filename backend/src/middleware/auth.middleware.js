const { verifyAccessToken } = require('../utils/jwt.utils');
const { sendUnauthorized, sendForbidden } = require('../utils/response.utils');
const User = require('../models/User.model');

/**
 * Authenticate — verify JWT and attach user to req
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) return sendUnauthorized(res, 'Invalid token format');

    const decoded = verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await User.findById(decoded.sub).select('-password -refreshTokens');

    if (!user)          return sendUnauthorized(res, 'User not found');
    if (!user.isActive) return sendUnauthorized(res, 'Account is deactivated');

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError')  return sendUnauthorized(res, 'Token expired');
    if (error.name === 'JsonWebTokenError')  return sendUnauthorized(res, 'Invalid token');
    return sendUnauthorized(res, 'Authentication failed');
  }
};

/**
 * Authorize — RBAC middleware factory
 * Usage: authorize('manager', 'admin')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return sendUnauthorized(res, 'Not authenticated');
  if (!roles.includes(req.user.role)) {
    return sendForbidden(res, `Access denied. Required roles: ${roles.join(', ')}`);
  }
  next();
};

module.exports = { authenticate, authorize };
