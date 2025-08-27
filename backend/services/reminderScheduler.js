// backend/services/reminderScheduler.js
const Reminder = require('../models/Reminder');
const { verifyTransport, sendReminderEmail } = require('./emailService');

const POLL_MS = 30 * 1000;     // check every 30s
const MAX_ATTEMPTS = 5;
const SWEEP_GRACE_MS = 5 * 60 * 1000; // 5 min grace for sweep

function logReminder(r, prefix = '[SCHED]') {
  const obj = r.toObject ? r.toObject() : r;
  console.log(
    `${prefix} {_id:${obj._id}, userId:${obj.userId}, status:${obj.status}, sent:${obj.sent}, attempts:${obj.attempts}, ` +
    `reminderDate:${obj.reminderDate}, reminderTime:${obj.reminderTime}, scheduledAt:${new Date(obj.scheduledAt).toISOString()}}`
  );
}

async function checkDueReminders() {
  const now = new Date();
  const windowStart = new Date(now.getTime() - POLL_MS - 5000);

  console.log(`[SCHED] Tick at ${now.toISOString()} windowStart=${windowStart.toISOString()}`);

  let due = [];
  try {
    due = await Reminder.find({
      status: 'active',
      sent: false,
      attempts: { $lt: MAX_ATTEMPTS },
      scheduledAt: { $lte: now, $gte: windowStart },
    }).sort({ scheduledAt: 1 });

    console.log(`[SCHED] Query returned ${due.length} reminder(s)`);
    due.forEach(r => logReminder(r, '[SCHED] DUE'));
  } catch (err) {
    console.error('[SCHED] Query error:', err.message);
    if (err.stack) console.error(err.stack);
    return;
  }

  for (const r of due) {
    logReminder(r, '[SCHED] sending');
    const update = { $set: { lastAttemptAt: new Date(), status: 'completed' }, $inc: { attempts: 1 } };

    try {
      // Try to send mail (unless you intentionally disable via env)
      if (process.env.DISABLE_EMAIL === 'true') {
        console.log('[SCHED] Email sending disabled via DISABLE_EMAIL=true. Marking as completed without sending.');
        update.$set.lastError = 'email disabled';
      } else {
        const result = await sendReminderEmail(
          r.userId, r.customerName || '', r.toObject ? r.toObject() : r, r.items || []
        );

        if (result && result.success) {
          update.$set.sent = true;
          update.$set.sentAt = new Date();
          update.$set.lastError = null;
          console.log(`[SCHED] ✅ email sent for ${r._id}`);
        } else {
          const msg = (result && result.error) || 'unknown mail error';
          update.$set.lastError = msg;
          console.error(`[SCHED] ❌ email failed for ${r._id}: ${msg}`);
        }
      }
    } catch (err) {
      update.$set.lastError = err.message || String(err);
      console.error(`[SCHED] ❌ exception sending ${r._id}:`, err.message);
      if (err.stack) console.error(err.stack);
    }

    // Always mark status as completed when it’s due (email outcome already captured)
    const saved = await Reminder.findByIdAndUpdate(r._id, update, { new: true });
    console.log(`[SCHED] DB update -> _id=${saved._id} status=${saved.status} sent=${saved.sent} attempts=${saved.attempts} lastError=${saved.lastError || 'none'}`);
  }

  // Final safety sweep: anything still active but way past due (email may have crashed earlier)
  try {
    const sweepResult = await Reminder.updateMany(
      { status: 'active', scheduledAt: { $lt: new Date(Date.now() - SWEEP_GRACE_MS) } },
      { $set: { status: 'completed' } }
    );
    if (sweepResult.modifiedCount) {
      console.log(`[SCHED] Sweep completed -> set completed on ${sweepResult.modifiedCount} old active reminder(s)`);
    }
  } catch (err) {
    console.error('[SCHED] Sweep error:', err.message);
  }
}

function initializeReminderScheduler() {
  console.log('⏰ [SCHED] Initializing reminder scheduler...');
  verifyTransport().catch(() => {});
  setTimeout(checkDueReminders, 5000);
  setInterval(checkDueReminders, POLL_MS);
}

// Run a single scheduler cycle (used by debug route)
async function runSchedulerOnce() {
  try {
    await checkDueReminders();
  } catch (err) {
    console.error('[SCHED] runSchedulerOnce error:', err && err.message ? err.message : err);
    throw err;
  }
}

async function sendReminderNow(reminderId) {
  try {
    const r = await Reminder.findById(reminderId);
    if (!r) {
      console.error('[SCHED] Manual send: reminder not found', reminderId);
      return { success: false, error: 'Reminder not found' };
    }

    logReminder(r, '[SCHED] Manual');
    let emailOk = false;
    let lastErr = null;

    try {
      if (process.env.DISABLE_EMAIL === 'true') {
        console.log('[SCHED] Manual send: email disabled');
        lastErr = 'email disabled';
      } else {
        const res = await sendReminderEmail(r.userId, r.customerName || '', r.toObject(), r.items || []);
        emailOk = !!(res && res.success);
        lastErr = emailOk ? null : (res && res.error) || 'unknown mail error';
      }
    } catch (err) {
      lastErr = err.message || String(err);
    }

    const update = {
      $set: {
        lastAttemptAt: new Date(),
        status: 'completed',            // always mark completed on manual trigger
        lastError: lastErr,
        ...(emailOk ? { sent: true, sentAt: new Date() } : {}),
      },
      $inc: { attempts: 1 },
    };

    const saved = await Reminder.findByIdAndUpdate(r._id, update, { new: true });
    console.log(`[SCHED] ✅ Manual update -> _id=${saved._id} status=${saved.status} sent=${saved.sent} attempts=${saved.attempts} lastError=${saved.lastError || 'none'}`);
    return { success: true };
  } catch (err) {
    console.error('[SCHED] Manual send failed:', err.message);
    if (err.stack) console.error(err.stack);
    return { success: false, error: err.message };
  }
}

module.exports = { initializeReminderScheduler, sendReminderNow, checkDueReminders, runSchedulerOnce };
