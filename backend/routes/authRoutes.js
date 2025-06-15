const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/auth');
const {
  register,
  login,
  getProfile,
  staffLogin
} = require('../controllers/authController');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', protect, getProfile);
router.post('/staff-login', protect, admin, staffLogin);

module.exports = router;
