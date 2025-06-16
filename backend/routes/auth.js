const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/auth');
const {
  createStaffMember,
  getStaffMembers,
  deleteStaffMember,
  updateStaffMember,
  getAllUsers,
  updateUserStatus,
  deleteUser
} = require('../controllers/adminController');

// All routes are protected and require admin role
router.use(protect);
router.use(admin);

// Get all users
router.get('/users', getAllUsers);

// Update user status
router.patch('/users/:id/status', updateUserStatus);

// Delete user
router.delete('/users/:id', deleteUser);

// Staff management routes
router.route('/staff')
  .post(createStaffMember)
  .get(getStaffMembers);

router.route('/staff/:id')
  .put(updateStaffMember)
  .delete(deleteStaffMember);

module.exports = router;
