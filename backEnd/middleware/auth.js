const jwt = require('jsonwebtoken');
require('dotenv').config();

// Protect Middleware (Validate Token)
const protect = async (req, res, next) => {
  let token;
  // IMPORT INSIDE to break require cycles
  const User = require('../models/User');

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: 'User no longer exists' });
      }

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Session expired' });
      }
      return res.status(401).json({ message: 'Not authorized' });
    }
  } else {
    return res.status(401).json({ message: 'No token provided' });
  }
};

// Generic Role Authorization (Keep this if you use it elsewhere)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    next();
  };
};

// Admin Middleware (SPECIFICALLY FOR ADMIN ROUTES)
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

// EXPORT ALL THREE
module.exports = { protect, authorize, admin };