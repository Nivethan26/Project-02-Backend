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

module.exports = { sendOTPEmail, sendPrescriptionRejectionEmail, sendOrderProcessingEmail };
