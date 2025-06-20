const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const auth = require('../middlewares/auth');

// POST /doctor/availability
router.post('/availability', auth.protect, doctorController.setAvailability);

module.exports = router;
