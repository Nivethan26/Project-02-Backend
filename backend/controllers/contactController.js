const ContactMessage = require('../models/ContactMessage');

exports.leaveMessage = async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        if (!name || !email || !message) {
          return res.status(400).json({ message: 'All fields are required.' });
        }
        const newMessage = await ContactMessage.create({ name, email, phone, message });
        res.status(201).json({ message: 'Message sent successfully', newMessage });
      } catch (error) {
        res.status(500).json({ message: 'Error sending message' });
      }
    };

exports.getUnreadMessages = async (req, res) => {
    try {
      const messages = await ContactMessage.find({ isRead: false }).sort({ createdAt: -1 });
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching messages' });
    }
  };

  exports.markMessageAsRead = async (req, res) => {
    try {
      const { id } = req.params;
      await ContactMessage.findByIdAndUpdate(id, { isRead: true });
      res.json({ message: 'Message marked as read' });
    } catch (error) {
      res.status(500).json({ message: 'Error updating message' });
    }
  };

  exports.getAllMessages = async (req, res) => {
    try {
      const messages = await ContactMessage.find().sort({ createdAt: -1 });
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching messages' });
    }
  };