const Consultation = require('../models/Consultation');
const ConsultationPayment = require('../models/ConsultationPayment');
const Payment = require('../models/Payment');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

// Book a consultation (called after payment)

exports.bookConsultation = async (req, res) => {
  try {
    const { doctorId, date, time, amount, method } = req.body;
    const user = req.user && req.user._id;

    if (!user || !doctorId || !date || !time || !amount || !method) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Step 1: Create payment first
    const payment = await ConsultationPayment.create({
      user,
      doctor: doctorId,
      amount,
      method,
      status: 'paid'
    });

    // Step 2: Create consultation and attach paymentId
    const consultation = await Consultation.create({
      user,
      doctor: doctorId,
      date,
      time,
      paymentId: payment._id,
      status: 'confirmed',
    });

    // Step 3: Link consultation to payment
    payment.consultationId = consultation._id;
    await payment.save();

    // Step 4: Also persist a generic Payment entry for reporting/consistency
    await Payment.create({
      consultationId: consultation._id,
      user,
      doctor: doctorId,
      amount,
      paymentMethod: method === 'card_payment' ? 'card_payment' : method || 'card',
      paymentType: 'consultation',
      status: 'paid'
    });

    // Step 5: Create appointment
    await Appointment.create({
      customer: user,
      doctor: doctorId,
      date,
      time,
      status: 'confirmed',
      notes: '',
      paymentIntentId: payment._id.toString(),
    });

    res.status(201).json({ consultation, payment });
  } catch (err) {
    console.error("🔥 Book consultation error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get consultations for a user
exports.getUserConsultations = async (req, res) => {
  try {
    const userId = req.user._id;
    const consultations = await Consultation.find({ user: userId })
      .populate('doctor', 'firstName lastName speciality')
      .populate('paymentId');
    res.json(consultations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch consultations.' });
  }
};

// Get appointments for a doctor
exports.getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const appointments = await Appointment.find({ doctor: doctorId })
      .populate('customer', 'firstName lastName email')
      .populate('doctor', 'firstName lastName');
    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch appointments.' });
  }
}; 

// Admin: Get all consultation bookings (with optional filters)
exports.getAllConsultations = async (req, res) => {
  try {
    const { doctorId, userId, startDate, endDate, status } = req.query;
    const filter = {};
    if (doctorId) filter.doctor = doctorId;
    if (userId) filter.user = userId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const consultations = await Consultation.find(filter)
      .sort({ createdAt: -1 })
      .populate('doctor', 'firstName lastName email speciality')
      .populate('user', 'firstName lastName email phone')
      .populate('paymentId');

    res.json({ success: true, data: consultations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch consultation bookings.' });
  }
};