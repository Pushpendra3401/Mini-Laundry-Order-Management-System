const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const memoryStorage = require('./memoryStorage');
const { isDbConnected } = require('./dbStatus');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'fallback_secret_for_demo_mode';

      const decoded = jwt.verify(token, secret);

      if (isDbConnected() && mongoose.Types.ObjectId.isValid(decoded.id)) {
        req.user = await User.findById(decoded.id).select('-password');
      } else {
        // In-memory/Stateless Demo Mode
        req.user = memoryStorage.users.find(u => u._id === decoded.id);
        
        // If not in memory (due to Vercel statelessness), but it's the admin-id, 
        // reconstruct the admin user object
        if (!req.user && decoded.id === 'admin-id') {
          req.user = { _id: 'admin-id', username: 'admin' };
        }
      }

      if (!req.user) {
        res.status(401);
        return next(new Error('Not authorized, user not found'));
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      next(new Error('Not authorized, token failed'));
    }
    return; // Add return to prevent executing the next block
  }

  if (!token) {
    res.status(401);
    next(new Error('Not authorized, no token'));
  }
};

module.exports = { protect };
