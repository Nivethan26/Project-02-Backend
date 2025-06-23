const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { sendOTPEmail } = require("../services/emailService");
const crypto = require("crypto");

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Create initial admin user if not exists
const createInitialAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: "admin@skmedicals.com" });
    if (!adminExists) {
      await User.create({
        firstName: "Admin",
        lastName: "User",
        email: "admin@skmedicals.com",
        password: "Admin@123",
        role: "admin",
        address: "Admin Office",
        phone: "1234567890",
      });
      console.log("Initial admin user created");
    }
  } catch (error) {
    console.error("Error creating initial admin:", error);
  }
};

// Call this when the server starts
createInitialAdmin();

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, address } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user with customer role
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      address,
      role: "customer",
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Server error during login",
      error: error.message,
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Staff login (admin impersonation)
// @route   POST /api/auth/staff-login
// @access  Private/Admin
exports.staffLogin = async (req, res) => {
  try {
    const { email, role } = req.body;

    // Verify admin is making the request
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admin can perform this action" });
    }

    // Find the staff member
    const staff = await User.findOne({ email, role });

    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    if (staff.status !== "active") {
      return res.status(400).json({ message: "Staff member is not active" });
    }

    // Generate a temporary token for staff access
    const token = generateToken(staff._id);

    res.json({
      token,
      user: {
        id: staff._id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        role: staff.role,
        phone: staff.phone,
        address: staff.address,
      },
    });
  } catch (error) {
    console.error("Staff login error:", error);
    res.status(500).json({ message: "Server error during staff login" });
  }
};

// @desc    Get current user's cart
// @route   GET /api/auth/cart
// @access  Private
exports.getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("cart.product");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Filter out cart items where product is null (product was deleted)
    const validCartItems = user.cart.filter((item) => item.product !== null);

    // If there are invalid items, update the user's cart to remove them
    if (validCartItems.length !== user.cart.length) {
      user.cart = validCartItems;
      await user.save();
    }

    res.json(validCartItems);
    //res.json(user.cart);
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update current user's cart
// @route   POST /api/auth/cart
// @access  Private
exports.updateCart = async (req, res) => {
  try {
    const { cart } = req.body;

    if (!Array.isArray(cart)) {
      return res.status(400).json({ message: "Cart must be an array" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate and format cart items
    user.cart = cart.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    }));

    await user.save();
    const populatedUser = await User.findById(req.user.id).populate(
      "cart.product"
    );
    res.json(populatedUser.cart);
  } catch (error) {
    console.error("Update cart error:", error.message);
    res.status(500).json({ message: "Server error", details: error.message });
  }
};

// @desc    Forgot Password - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetOTP = otp;
  user.resetOTPExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();
  await sendOTPEmail(email, otp);
  res.json({ message: "OTP sent to your email" });
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (
    !user ||
    user.resetOTP !== otp ||
    !user.resetOTPExpiry ||
    user.resetOTPExpiry < Date.now()
  ) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }
  res.json({ message: "OTP verified" });
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email });
  if (
    !user ||
    user.resetOTP !== otp ||
    !user.resetOTPExpiry ||
    user.resetOTPExpiry < Date.now()
  ) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  user.resetOTP = null;
  user.resetOTPExpiry = null;
  await user.save();
  res.json({ message: "Password reset successful" });
};

// @desc    Update current user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Only allow updating these fields
    const { firstName, lastName, email, phone, address } = req.body;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    await user.save();
    const updatedUser = await User.findById(req.user.id).select("-password");
    res.json(updatedUser);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Change current user password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Both current and new password are required." });
    }
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete current user profile
// @route   DELETE /api/auth/profile
// @access  Private
exports.deleteProfile = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "Account deleted successfully." });
  } catch (error) {
    console.error("Delete profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
