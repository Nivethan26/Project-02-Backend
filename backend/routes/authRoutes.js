const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/auth');
const {
  register,
  login,
  getProfile,
  staffLogin,
  getCart,
  updateCart,
  forgotPassword,
  verifyOTP,
  resetPassword,
  updateProfile,
  changePassword,
  deleteProfile
} = require('../controllers/authController');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/staff-login', protect, admin, staffLogin);

// Cart routes
router.get('/cart', protect, getCart);
router.post('/cart', protect, updateCart);

// Forgot password/OTP routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

router.put('/change-password', protect, changePassword);

router.delete('/profile', protect, deleteProfile);

module.exports = router;
