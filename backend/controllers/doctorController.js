const DoctorAvailability = require('../models/DoctorAvailability');

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
