const axios = require('axios');

// Auth service configuration
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

/**
 * Middleware to check if user is authenticated
 * Calls the auth service to verify the session
 */
const requireAuth = async (req, res, next) => {
  try {
    // Forward the session cookie to the auth service
    const sessionId = req.cookies.sessionId;
    
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'No session cookie found'
      });
    }

    // Call the auth service to verify the session
    const authResponse = await axios.get(`${AUTH_SERVICE_URL}/is-logged-in`, {
      headers: {
        'Cookie': `sessionId=${sessionId}`
      },
      timeout: 5000 // 5 second timeout
    });

    if (authResponse.data.success && authResponse.data.isLoggedIn) {
      // Add user info to request object for use in route handlers
      req.user = authResponse.data.user;
      next();
    } else {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        error: 'Invalid or expired session'
      });
    }

  } catch (error) {
    console.error('Auth middleware error:', error.message);
    
    // Handle different types of errors
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Authentication service unavailable',
        error: 'Cannot connect to auth service'
      });
    }
    
    if (error.response && error.response.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        error: 'Invalid session'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'Authentication check failed'
    });
  }
};

/**
 * Optional middleware to get user info without requiring authentication
 * Useful for endpoints that work differently for logged-in vs anonymous users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const sessionId = req.cookies.sessionId;
    
    if (!sessionId) {
      req.user = null;
      return next();
    }

    const authResponse = await axios.get(`${AUTH_SERVICE_URL}/is-logged-in`, {
      headers: {
        'Cookie': `sessionId=${sessionId}`
      },
      timeout: 5000
    });

    if (authResponse.data.success && authResponse.data.isLoggedIn) {
      req.user = authResponse.data.user;
    } else {
      req.user = null;
    }

    next();

  } catch (error) {
    console.error('Optional auth middleware error:', error.message);
    req.user = null;
    next();
  }
};

module.exports = {
  requireAuth,
  optionalAuth
};
