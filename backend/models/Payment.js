const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  paymentMethod: { type: String, enum: ['cash', 'card_payment'], required: true },
  amount: { type: Number, required: true },
  paymentType: { type: String, enum: ['pos', 'online', 'prescription'], required: true },
  cardDetails: {
    cardholderName: String,
    last4: String,
    // Add more fields if needed, but never store full card numbers!
  },
  paidAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema); 