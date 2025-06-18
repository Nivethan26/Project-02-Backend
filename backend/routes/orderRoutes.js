const express = require('express');
const router = express.Router();
const { protect, staff } = require('../middlewares/auth');
const { createOrder } = require('../controllers/orderController');

// Create order (protected, staff only)
router.post('/', protect, staff, createOrder);

module.exports = router;
