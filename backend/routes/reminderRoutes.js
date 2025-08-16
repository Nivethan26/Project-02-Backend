// backend/routes/reminderRoutes.js
const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');
const { sendReminderNow, runSchedulerOnce } = require('../services/reminderScheduler.js');

// Convert form date/time in Colombo (+05:30) to UTC Date
function colomboToUtc(reminderDate, reminderTime) {
  const localISO = `${reminderDate}T${reminderTime}:00.000+05:30`;
  const d = new Date(localISO);
  console.log('[REMINDERS] convert', { reminderDate, reminderTime, localISO, utcISO: d.toISOString() });
  return d;
}

// Create a new reminder
router.post('/', async (req, res) => {
  try {
    console.log('[REMINDERS] POST / -> body:', req.body);
    const { reminderDate, reminderTime, ...rest } = req.body;

    if (!reminderDate || !reminderTime) {
      console.log('[REMINDERS] missing date/time');
      return res.status(400).json({ success: false, message: 'reminderDate and reminderTime are required' });
    }

    const scheduledAt = colomboToUtc(reminderDate, reminderTime);
    const now = new Date();
    console.log('[REMINDERS] computed scheduledAt:', scheduledAt.toISOString(), 'now:', now.toISOString(), 'Δms=', scheduledAt - now);

    const reminder = await Reminder.create({
      ...rest,
      reminderDate,
      reminderTime,
      scheduledAt,
      status: 'active',
      sent: false,
      attempts: 0,
    });

    console.log(`[REMINDERS] created _id=${reminder._id}`);
    res.json({ success: true, reminder });
  } catch (err) {
    console.error('Create reminder error:', err.message);
    if (err.stack) console.error(err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get reminders by user email
router.get('/user/:email', async (req, res) => {
  try {
    console.log('[REMINDERS] GET /user/:email', req.params.email);
    const reminders = await Reminder.find({ userId: req.params.email }).sort({ createdAt: -1 });
    console.log('[REMINDERS] found count:', reminders.length);
    res.json({ success: true, data: reminders });
  } catch (err) {
    console.error('Error fetching reminders:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch reminders' });
  }
});

// Force-run scheduler once (debug)
router.post('/debug/run', async (_req, res) => {
  try {
    console.log('[REMINDERS] POST /debug/run');
    await runSchedulerOnce();
    res.json({ success: true });
  } catch (err) {
    console.error('debug/run error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Manually trigger a specific reminder (testing)
router.post('/test/:reminderId', async (req, res) => {
  try {
    console.log('[REMINDERS] POST /test/:reminderId', req.params.reminderId);
    const result = await sendReminderNow(req.params.reminderId);
    if (result.success) res.json({ success: true, message: 'Test reminder sent successfully' });
    else res.status(500).json({ success: false, message: result.error || 'Failed to send test reminder' });
  } catch (err) {
    console.error('Error sending test reminder:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send test reminder' });
  }
});

// Health + server time
router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Reminders API is working', now: new Date().toISOString() });
});

module.exports = router;
