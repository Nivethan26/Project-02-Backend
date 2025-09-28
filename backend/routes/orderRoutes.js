const express = require("express");
const router = express.Router();
const { protect, staff } = require("../middlewares/auth");
//const { createOrder, createPOSOrder } = require('../controllers/orderController');
const {
  createOrder,
  createPOSOrder,
  createOnlineOrder,
  getCustomerOrders,
  getOrderById,
  getAvailableProducts,
  checkDataIntegrity,
  getOrdersByStatus,
  updateOrderStatus,
  getAllOrders,
} = require("../controllers/orderController");
const Order = require("../models/Order");

// Test endpoint to verify authentication
router.get("/test-auth", protect, staff, (req, res) => {
  res.json({
    success: true,
    message: "Authentication working",
    user: {
      id: req.user._id,
      role: req.user.role,
      email: req.user.email,
    },
  });
});

// Test endpoint for POS route
router.get("/pos-test", (req, res) => {
  res.json({
    success: true,
    message: "POS route is accessible",
    timestamp: new Date().toISOString(),
  });
});

// Test endpoint to check Order model schema
router.get("/test-model", async (req, res) => {
  try {
    // Get the schema paths to see what fields are defined
    const schemaPaths = Object.keys(Order.schema.paths);
    const requiredPaths = [];

    for (const path of schemaPaths) {
      const pathObj = Order.schema.paths[path];
      if (pathObj.isRequired) {
        requiredPaths.push(path);
      }
    }

    res.json({
      success: true,
      message: "Order model schema info",
      schemaPaths,
      requiredPaths,
      schema: Order.schema.obj,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error getting model info",
      error: error.message,
    });
  }
});

// Get available products (for debugging)
router.get("/debug/products", getAvailableProducts);

// Check data integrity (for debugging)
router.get("/debug/integrity", checkDataIntegrity);

// Get customer orders (public endpoint - no auth required)
router.get("/customer", getCustomerOrders);

// Get all orders for admin dashboard (protected route)
router.get("/admin/all", protect, staff, getAllOrders);

// Get all orders by status (for delivery dashboard)
router.get("/", getOrdersByStatus);

// Get specific order by ID (public endpoint - no auth required)
router.get("/:orderId", getOrderById);

// Create online order (from frontend payment - no auth required)
router.post('/online', createOnlineOrder);

// Create POS order (direct sale without prescription)
router.post("/pos", protect, staff, createPOSOrder);

// Create order (prescription-based)
router.post("/", protect, staff, createOrder);

// Update order status by ID (for delivery dashboard)
router.patch("/:orderId/status", updateOrderStatus);

// Update order items
router.patch('/:orderId/items', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    order.items = items;
    // Recalculate totalAmount (sum of item.price * item.quantity + shipping + tax)
    order.totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      + (order.shipping || 0)
      + (order.tax || 0);
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm order (customizationConfirmed = true)
router.patch('/:orderId/confirm', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    order.customizationConfirmed = true;
    order.status = 'confirmed';
    // Ensure customerId is set for prescription orders
    if (order.orderType === 'prescription' && !order.customerId && order.customer && order.customer.email) {
      const User = require('../models/User');
      const user = await User.findOne({ email: order.customer.email });
      if (user) {
        order.customerId = user._id;
      }
    }
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// Cancel (delete) order if not confirmed
router.delete('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    // Allow delete only if not confirmed (customizationConfirmed is false or status is not 'confirmed')
    if (order.customizationConfirmed || order.status === 'confirmed') {
      return res.status(400).json({ error: 'Cannot cancel a confirmed order' });
    }
    // Delete associated prescription if present
    if (order.prescription) {
      const Prescription = require('../models/Prescription');
      await Prescription.findByIdAndDelete(order.prescription);
    }
    await order.deleteOne();
    res.json({ success: true, message: 'Order and prescription cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
