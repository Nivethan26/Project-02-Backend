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

// Get specific order by ID (public endpoint - no auth required)
router.get("/:orderId", getOrderById);

// Create online order (from frontend payment - no auth required)
router.post('/online', createOnlineOrder);

// Create POS order (direct sale without prescription)
router.post("/pos", protect, staff, createPOSOrder);

// Create order (prescription-based)
router.post("/", protect, staff, createOrder);

module.exports = router;
