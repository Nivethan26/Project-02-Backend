const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('Token received:', token ? 'Yes' : 'No');

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully, user ID:', decoded.id);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');
      console.log('User found:', req.user ? 'Yes' : 'No', 'Role:', req.user?.role);

      next();
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    console.log('No token provided');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  console.log('Checking admin role for user:', req.user?.role);
  if (req.user && req.user.role === 'admin') {
    console.log('Admin access granted');
    next();
  } else {
    console.log('Admin access denied');
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

const staff = (req, res, next) => {
  console.log('Checking staff role for user:', req.user?.role);
  if (req.user && ['admin', 'pharmacist', 'doctor'].includes(req.user.role)) {
    console.log('Staff access granted');
    next();
  } else {
    console.log('Staff access denied');
    res.status(401).json({ message: 'Not authorized as staff' });
  }
};

module.exports = { protect, admin, staff };
