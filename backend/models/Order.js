const mongoose = require('mongoose');

// Check if the model exists before creating it
const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({
  prescription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    required: false // Made optional for POS orders
  },
  customer: {
    name: {
      type: String,
      required: true
    },
    email: String,
    phone: {
      type: String,
      required: true
    },
    address: String,
    city: String
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: false,
    min: 0
  },
  tax: {
    type: Number,
    required: false,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    required: true
  },
  orderType: {
    type: String,
    enum: ['prescription', 'pos_sale'],
    default: 'prescription'
  },
  description: {
    type: String,
    default: 'Order created from prescription'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
}));

module.exports = Order;
