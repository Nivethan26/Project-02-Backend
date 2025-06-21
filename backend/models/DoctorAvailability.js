const mongoose = require('mongoose');

const doctorAvailabilitySchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // ISO date string (YYYY-MM-DD)
    required: true
  },
  slots: [
    {
      type: String // e.g., '09:00', '09:30'
    }
  ]
});

doctorAvailabilitySchema.index({ doctor: 1, date: 1 }, { unique: true });

const DoctorAvailability = mongoose.model('DoctorAvailability', doctorAvailabilitySchema);

module.exports = DoctorAvailability; 