async function sendAppointmentCancellationEmail(to, patientName, doctorName, reason) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Your Consultation Appointment Was Cancelled',
    text: `Dear ${patientName},\n\nYour consultation appointment has been cancelled by Dr. ${doctorName}.\n\nReason: ${reason || 'Doctor unavailable'}\n\nYou will receive a refund for your payment.\n\nIf you have any questions, please contact us.\n\nBest regards,\nSK Medicals Team`,
  };
  await transporter.sendMail(mailOptions);
}
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


async function sendOTPEmail(to, otp) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Your Password Reset OTP',
    text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
  };
  await transporter.sendMail(mailOptions);
}

async function sendPrescriptionRejectionEmail(to, patientName, reason) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Your Prescription Was Rejected',
    text: `Dear ${patientName},\n\nWe regret to inform you that your prescription has been rejected.\n\nReason: ${reason}\n\nIf you have any questions, please contact us.\n\nBest regards,\nPharmacy Team`,
  };
  await transporter.sendMail(mailOptions);
}

async function sendOrderProcessingEmail(to, patientName, orderId) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Your Prescription Order is Processing',
    text: `Dear ${patientName},\n\nYour prescription has been approved and your order (Order ID: ${orderId}) is now being processed.\n\nWe will notify you once your order is confirmed or shipped.\n\nThank you for choosing our pharmacy!\n\nBest regards,\nPharmacy Team`,
  };
  await transporter.sendMail(mailOptions);
}

// Sanity check the transport on boot
async function verifyTransport() {
  try {
    console.log('📧 [MAIL] verifying transport for', process.env.EMAIL_USER);
    await transporter.verify();
    console.log('✅ [MAIL] transport ready');
  } catch (err) {
    console.error('❌ [MAIL] transport verify failed:', err && (err.message || err));
    if (err && err.response) console.error('SMTP response:', err.response);
  }
}

async function sendReminderEmail(to, customerName, reminder, orderItems = []) {
  console.log('📤 [MAIL] sendReminderEmail start → to:', to, 'reminderId:', reminder?._id);

  const medsHtml = (orderItems || [])
    .map(i => `• ${i.name} (Quantity: ${i.quantity})`)
    .join('<br/>');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:16px">
      <h2>🕐 Medication Reminder</h2>
      <p>Hello ${customerName || 'Valued Customer'},</p>
      <p>This is a friendly reminder for:</p>
      <ul>
        <li><b>Date:</b> ${reminder.reminderDate}</li>
        <li><b>Time:</b> ${reminder.reminderTime}</li>
      </ul>
      ${reminder.notes ? `<p><b>Notes:</b> ${reminder.notes}</p>` : ''}
      ${medsHtml ? `<h3>Medications</h3><p>${medsHtml}</p>` : ''}
      <p>Thank you for choosing SK Medicals!</p>
    </div>
  `;

  const mail = {
    from: `"SK Medicals" <${process.env.EMAIL_USER}>`,
    to,
    subject: `🕐 Medication Reminder - ${reminder.reminderDate} ${reminder.reminderTime}`,
    html,
  };

  try {
    console.log('📤 [MAIL] sending...', { to: mail.to, subject: mail.subject });
    const info = await transporter.sendMail(mail);
    console.log('✅ [MAIL] sent. messageId:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ [MAIL] send failed:', err && (err.message || err));
    if (err) {
      if (err.code) console.error('code:', err.code);
      if (err.command) console.error('command:', err.command);
      if (err.responseCode) console.error('responseCode:', err.responseCode);
      if (err.response) console.error('response:', err.response);
      if (err.stack) console.error(err.stack);
    }
    return { success: false, error: err && err.message ? err.message : String(err) };
  }
}

module.exports = { verifyTransport, sendOTPEmail, sendPrescriptionRejectionEmail, sendOrderProcessingEmail, sendReminderEmail, sendAppointmentCancellationEmail };
