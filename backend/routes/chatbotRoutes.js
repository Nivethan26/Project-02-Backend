const express = require('express');
const router = express.Router();
const { handleChat } = require('../services/chatbotService');

router.post('/chat', async (req, res) => {
  try {
    const { userId, conversationId, message } = req.body || {};
    const result = await handleChat(userId || null, conversationId || null, message || '');
    res.json({ success: true, message: result });
  } catch (err) {
    console.error('[CHATBOT] error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;


