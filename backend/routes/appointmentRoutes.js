const express = require('express');
const router = express.Router();
const {
  getDoctorAppointments,
  getCustomerAppointments,
  createAppointment,
  cancelByDoctor
} = require('../controllers/appointmentController'); // ✅ Correct import

const verifyToken = require('../middlewares/authMiddleware'); // ✅ your custom JWT middleware
// Doctor cancels appointment (refund + email)
router.post('/doctor/cancel/:id', verifyToken, cancelByDoctor);

// Get all appointments for the logged-in doctor
router.get('/doctor', verifyToken, getDoctorAppointments);

// Get all appointments for the logged-in customer
router.get('/customer', verifyToken, getCustomerAppointments);

// Create a new appointment (usually after payment)
router.post('/create', verifyToken, createAppointment);

module.exports = router;
