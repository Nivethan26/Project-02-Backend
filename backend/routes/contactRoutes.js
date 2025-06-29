const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

router.post('/', contactController.leaveMessage);
router.get('/admin/notifications', contactController.getUnreadMessages);
router.patch('/admin/notifications/:id/read', contactController.markMessageAsRead);

module.exports = router;