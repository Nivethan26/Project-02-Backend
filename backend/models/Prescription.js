const mongoose = require('mongoose');

// Check if the model exists before creating it
const Prescription = mongoose.models.Prescription || mongoose.model('Prescription', new mongoose.Schema({
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
}));

module.exports = Prescription;

