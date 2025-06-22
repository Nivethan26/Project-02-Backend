const mongoose = require('mongoose');

// Check if the model exists before creating it
const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  packPrice: {
    type: Number
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    default: ''
  },
  packSize: {
    type: String,
    default: ''
  },
  tags: {
    type: [String],
    default: []
  },
  images: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  prescription: {
    type: String,
    enum: ['required', 'not_required'],
    default: 'not_required'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
}));

module.exports = Inventory;
