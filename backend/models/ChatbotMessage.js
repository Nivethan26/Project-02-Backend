const mongoose = require('mongoose');

const chatbotMessageSchema = new mongoose.Schema({
  conversationId: { type: String, index: true },
  userId: { type: String },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  tokens: { type: Number },
  sources: { type: [Object], default: [] },
}, { timestamps: true });

module.exports = mongoose.models.ChatbotMessage || mongoose.model('ChatbotMessage', chatbotMessageSchema);


