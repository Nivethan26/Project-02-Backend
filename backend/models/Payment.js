const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Order-related payment (optional when payment is for consultation)
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },

  // Consultation-related payment (optional when payment is for an order)
  consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  paymentMethod: { type: String, enum: ['cash', 'card_payment', 'card'], required: true },
  amount: { type: Number, required: true },
  paymentType: { type: String, enum: ['pos', 'online', 'prescription', 'consultation'], required: true },
  status: { type: String, default: 'paid' },
  cardDetails: {
    cardholderName: String,
    last4: String,
  },
  paidAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema); 