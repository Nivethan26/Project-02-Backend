// backend/models/Reminder.js
const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  userId: { type: String, required: true },            // customer's email
  reminderDate: { type: String, required: true },      // "YYYY-MM-DD" (display only)
  reminderTime: { type: String, required: true },      // "HH:mm" (display only)
  scheduledAt: { type: Date, required: true },         // actual UTC time to send

  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  sent: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
  lastAttemptAt: { type: Date },
  sentAt: { type: Date },
  lastError: { type: String },
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Reminder', reminderSchema);
