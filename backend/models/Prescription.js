const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  address: String,
  city: String,
  duration: String,
  gender: String,
  allergies: String,
  hasAllergies: String,
  payment: String,
  substitutes: String,
  frequency: String,
  notes: String,
  agree: Boolean,
  images: [String], // file paths
  status: {
    type: String,
    enum: ['pending', 'processing', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Prescription', prescriptionSchema);

