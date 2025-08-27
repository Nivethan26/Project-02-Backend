const mongoose = require('mongoose');

const consultationPaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' },
  amount: { type: Number, required: true },
  method: { type: String, default: 'card' },
  status: { type: String, default: 'paid' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ConsultationPayment', consultationPaymentSchema); 