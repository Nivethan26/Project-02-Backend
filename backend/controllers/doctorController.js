const DoctorAvailability = require('../models/DoctorAvailability');
const User = require('../models/User');

// POST /doctor/availability
exports.setAvailability = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { availability } = req.body; // [{ date, slots }]
    if (!Array.isArray(availability)) {
      return res.status(400).json({ message: 'Invalid availability format.' });
    }
    for (const entry of availability) {
      if (!entry.date || !Array.isArray(entry.slots)) continue;
      await DoctorAvailability.findOneAndUpdate(
        { doctor: doctorId, date: entry.date },
        { $set: { slots: entry.slots } },
        { upsert: true, new: true }
      );
    }
    res.json({ message: 'Availability updated successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update availability.' });
  }
};

exports.getAvailability = async (req, res) => {
  try {
    const doctorId = req.query.doctorId || req.user._id;
    if (!doctorId) return res.status(400).json({ message: 'doctorId is required.' });
    const records = await DoctorAvailability.find({ doctor: doctorId });
    res.json(records.map(r => ({
      date: r.date,
      slots: r.slots
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch availability.' });
  }
};

exports.listDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor', status: 'active' })
      .select('firstName lastName email phone address speciality profilePhoto');
    // Fetch availability for each doctor
    const now = new Date();
    const doctorIds = doctors.map(doc => doc._id);
    const availabilities = await DoctorAvailability.find({
      doctor: { $in: doctorIds }
    });
    // Map doctorId to available future dates and slots
    const availMap = {};
    availabilities.forEach(a => {
      if (!availMap[a.doctor]) availMap[a.doctor] = [];
      const dateObj = new Date(a.date);
      if (dateObj >= now) {
        availMap[a.doctor].push({ date: a.date, slots: a.slots });
      }
    });
    // Attach availableDates and availableSlots to each doctor
    const result = doctors.map(doc => ({
      ...doc.toObject(),
      availableDates: (availMap[doc._id] || []).map(a => a.date),
      availableSlots: availMap[doc._id] || []
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch doctors.' });
  }
};

exports.updateAvailabilitySlot = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { date, slot } = req.body;
    if (!date || !slot) {
      return res.status(400).json({ message: 'Date and slot are required.' });
    }
    const availability = await DoctorAvailability.findOneAndUpdate(
      { doctor: doctorId, date },
      { $addToSet: { slots: slot } },
      { upsert: true, new: true }
    );
    res.json(availability);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add slot.' });
  }
};

exports.deleteAvailabilitySlot = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { date, slot } = req.body;
    if (!date || !slot) {
      return res.status(400).json({ message: 'Date and slot are required.' });
    }
    const availability = await DoctorAvailability.findOneAndUpdate(
      { doctor: doctorId, date },
      { $pull: { slots: slot } },
      { new: true }
    );
    if (availability && availability.slots.length === 0) {
      await DoctorAvailability.findByIdAndDelete(availability._id);
      return res.json({ message: 'Slot removed and day cleared.' });
    }
    res.json(availability);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to remove slot.' });
  }
};
