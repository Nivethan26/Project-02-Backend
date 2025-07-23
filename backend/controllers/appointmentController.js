const Appointment = require('../models/Appointment');
const User = require('../models/User'); // Adjust path if necessary

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
    const { doctorId, date, time, notes, paymentIntentId } = req.body;

    const newAppointment = await Appointment.create({
      customer: req.user.id,
      doctor: doctorId,
      date,
      time,
      notes: notes || '',
      paymentIntentId,
      status: 'confirmed',
    });

    res.status(201).json(newAppointment);
  } catch (err) {
    console.error("Error creating appointment:", err);
    res.status(500).json({ error: err.message });
  }
};
