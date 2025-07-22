const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');

// Create a new payment
router.post('/', async (req, res) => {
  try {
    console.log('Received payment data:', req.body); // Debug log
    const payment = new Payment(req.body);
    await payment.save();
    res.json({ success: true, payment });
  } catch (err) {
    console.error('Payment save error:', err); // Debug log
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router; 