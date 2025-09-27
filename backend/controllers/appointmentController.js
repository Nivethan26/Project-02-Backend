const Payment = require('../models/Payment');
const { sendOrderProcessingEmail, sendAppointmentCancellationEmail } = require('../services/emailService');
const ConsultationPayment = require('../models/ConsultationPayment');
const Appointment = require('../models/Appointment');
const User = require('../models/User'); // Adjust path if necessary
const Consultation = require('../models/Consultation'); // <-- Add this import

// Cancel appointment by doctor
exports.cancelByDoctor = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const doctorId = req.user._id || req.user.id;
    const { reason } = req.body;
    console.log('[CANCEL] Doctor:', doctorId, 'Appointment:', appointmentId);
    const appointment = await Appointment.findOne({ _id: appointmentId, doctor: doctorId }).populate('customer', 'email firstName lastName');
    console.log('[CANCEL] Lookup result:', appointment);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found for this doctor or already cancelled.' });
    }
    if (appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'Appointment already cancelled' });
    }
    appointment.status = 'cancelled';
    appointment.notes = reason || 'Doctor unavailable';
    await appointment.save();
    // Also cancel related consultation if exists
    const updateResult = await Consultation.updateMany({
      doctor: appointment.doctor,
      date: appointment.date,
      time: appointment.time,
      user: appointment.customer
    }, { status: 'cancelled' });
    console.log('[CANCEL] Consultation update result:', updateResult);
    // Refund payment if exists
    if (appointment.paymentId) {
      await ConsultationPayment.updateOne({ _id: appointment.paymentId }, { status: 'refunded' });
      await Payment.updateMany({ appointmentId: appointment._id }, { status: 'refunded' });
    }
    // Send email to customer with doctor's name and reason
    const customerEmail = appointment.customer.email;
    const customerName = appointment.customer.firstName + ' ' + appointment.customer.lastName;
    const doctorUser = await User.findById(doctorId);
    const doctorName = doctorUser ? (doctorUser.firstName + ' ' + doctorUser.lastName) : 'Doctor';
    await sendAppointmentCancellationEmail(customerEmail, customerName, doctorName, reason);
    res.json({ success: true, message: 'Appointment and consultation cancelled, customer notified/refunded.' });
  } catch (err) {
    console.error('Cancel by doctor error:', err);
    res.status(500).json({ message: 'Failed to cancel appointment.' });
  }
};

// ✅ Get appointments for the logged-in doctor
exports.getDoctorAppointments = async (req, res) => {
  try {
    console.log("Doctor ID from token:", req.user.id);

    const appointments = await Appointment.find({ doctor: req.user.id })
      .populate('customer', 'firstName lastName email')
      .sort({ date: -1 });

    console.log("Appointments found:", appointments);
    res.status(200).json(appointments);
  } catch (err) {
    console.error("Error fetching doctor appointments:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get appointments for the logged-in customer
exports.getCustomerAppointments = async (req, res) => {
  try {
    const customerId = req.user.id;

    const appointments = await Appointment.find({ customer: customerId })
      .populate('doctor', 'firstName lastName speciality email')
      .sort({ date: -1 });

    res.status(200).json(appointments);
  } catch (err) {
    console.error("Error fetching customer appointments:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Create appointment (e.g. after payment)
exports.createAppointment = async (req, res) => {
  try {
    const { doctorId, date, time, notes, paymentId } = req.body; // 🔄 Changed from paymentIntentId

    const newAppointment = await Appointment.create({
      customer: req.user.id,
      doctor: doctorId,
      date,
      time,
      notes: notes || '',
      paymentId, // ✅ Correct field name
      status: 'confirmed',
    });

    res.status(201).json(newAppointment);
  } catch (err) {
    console.error("Error creating appointment:", err);
    res.status(500).json({ error: err.message });
  }
};
