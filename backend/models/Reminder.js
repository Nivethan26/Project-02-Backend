const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  // Add more fields as needed (e.g., userId, prescriptionId, frequency, etc.)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reminder', reminderSchema);
