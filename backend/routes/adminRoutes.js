const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/auth');
const ContactMessage = require('../models/ContactMessage');
const {
  createStaffMember,
  getStaffMembers,
  deleteStaffMember,
  updateStaffMember,
  getAllUsers,
  updateUserStatus,
  deleteUser
} = require('../controllers/adminController');
const { staffUpload } = require('../middlewares/upload');

// All routes are protected and require admin role
router.use(protect);
router.use(admin);

// Get all users
router.get('/users', getAllUsers);

router.get('/messages', async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching messages', error: err.message });
  }
});

// Update user status
router.patch('/users/:id/status', updateUserStatus);

// Delete user
router.delete('/users/:id', deleteUser);

// Staff management routes
router.route('/staff')
  .post(staffUpload.single('profilePhoto'), createStaffMember)
  .get(getStaffMembers);

router.route('/staff/:id')
  .put(staffUpload.single('profilePhoto'), updateStaffMember)
  .delete(deleteStaffMember);

module.exports = router;
