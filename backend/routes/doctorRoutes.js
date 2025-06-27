const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const auth = require('../middlewares/auth');

// POST /doctor/availability
router.post('/availability', auth.protect, doctorController.setAvailability);

// Route to add/update a single time slot
router.put('/availability/slot', auth.protect, doctorController.updateAvailabilitySlot);

// Route to delete a single time slot
router.delete('/availability/slot', auth.protect, doctorController.deleteAvailabilitySlot);

// GET /doctor/availability
router.get('/availability', auth.protect, doctorController.getAvailability);

// GET /doctor/list
router.get('/list', doctorController.listDoctors);

module.exports = router;
