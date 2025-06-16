const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Create a new staff member (pharmacist, doctor, delivery)
// @route   POST /api/admin/staff
// @access  Private/Admin
exports.createStaffMember = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, address, role } = req.body;

    // Validate role
    if (!['pharmacist', 'doctor', 'delivery'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new staff member
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      address,
      role
    });

    res.status(201).json({
      message: 'Staff member created successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ message: error.message || 'Server error during staff creation' });
  }
};

// @desc    Get all staff members
// @route   GET /api/admin/staff
// @access  Private/Admin
exports.getStaffMembers = async (req, res) => {
  try {
    const staffMembers = await User.find({
      role: { $in: ['pharmacist', 'doctor', 'delivery'] }
    }).select('-password');

    res.json(staffMembers);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ message: 'Server error while fetching staff members' });
  }
};

// @desc    Delete a staff member
// @route   DELETE /api/admin/staff/:id
// @access  Private/Admin
exports.deleteStaffMember = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!['pharmacist', 'doctor', 'delivery'].includes(user.role)) {
      return res.status(400).json({ message: 'Can only delete staff members' });
    }

    await user.deleteOne();
    res.json({ message: 'Staff member removed' });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ message: 'Server error while deleting staff member' });
  }
};

// @desc    Update a staff member
// @route   PUT /api/admin/staff/:id
// @access  Private/Admin
exports.updateStaffMember = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, address, role } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!['pharmacist', 'doctor', 'delivery'].includes(user.role)) {
      return res.status(400).json({ message: 'Can only update staff members' });
    }

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    user.role = role || user.role;

    const updatedUser = await user.save();

    res.json({
      message: 'Staff member updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ message: 'Server error while updating staff member' });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
};

// @desc    Update user status
// @route   PATCH /api/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot change admin status' });
    }

    user.status = status;
    await user.save();

    res.json({
      message: 'User status updated successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error while updating user status' });
  }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin users' });
    }

    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
};
