const express = require('express');
const multer = require('multer');
const Prescription = require('../models/Prescription');
const path = require('path');
const fs = require('fs');
const { sendOTPEmail, sendPrescriptionRejectionEmail } = require('../services/emailService');
const Order = require('../models/Order');
const User = require('../models/User');

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'prescriptions');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage });

// Get all prescriptions
router.get('/', async (req, res) => {
  try {
    const prescriptions = await Prescription.find().sort({ createdAt: -1 });
    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload new prescription
router.post('/', upload.array('prescription', 5), async (req, res) => {
  try {
    const images = req.files.map(f => `/uploads/prescriptions/${path.basename(f.path)}`);
    const prescriptionData = { ...req.body, images };
    if (req.body.customerId) {
      prescriptionData.customerId = req.body.customerId;
    }
    console.log('Received prescription upload:', req.body);
    const prescription = new Prescription(prescriptionData);
    await prescription.save();
    console.log('Saved prescription:', prescription);
    res.status(201).json({ message: 'Prescription uploaded!', prescription });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify prescription
router.put('/:id/verify', async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    prescription.status = 'processing';
    prescription.rejectionReason = '';
    await prescription.save();
    res.json({ message: 'Prescription is being processed', prescription });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve prescription
router.put('/:id/approve', async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    if (prescription.status !== 'processing') {
      return res.status(400).json({ error: 'Prescription must be in processing state to be approved' });
    }
    prescription.status = 'approved';
    prescription.rejectionReason = '';
    await prescription.save();

    // Create an order if not already created for this prescription
    const existingOrder = await Order.findOne({ prescription: prescription._id });
    if (!existingOrder) {
      let customerId = prescription.customerId;
      // If customerId is not present, try to look up by email
      if (!customerId && prescription.email) {
        const user = await User.findOne({ email: prescription.email });
        if (user) {
          customerId = user._id;
        }
      }
      const orderData = {
        prescription: prescription._id,
        customer: {
          name: prescription.name,
          email: prescription.email,
          phone: prescription.phone,
          address: prescription.address,
          city: prescription.city,
        },
        customerId: customerId || undefined,
        items: [], // You may want to fill this with actual products if available
        totalAmount: 0, // Set to actual total if you have it
        paymentMethod: prescription.payment || 'N/A',
        orderType: 'prescription',
        description: `Order for prescription ${prescription.name || ''}`,
        createdBy: prescription.createdBy || null
      };
      console.log('Order data JSON:', JSON.stringify(orderData, null, 2));
      const order = new Order(orderData);
      await order.save();
    }

    res.json({ message: 'Prescription approved', prescription });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject prescription
router.put('/:id/reject', async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    if (prescription.status !== 'processing') {
      return res.status(400).json({ error: 'Prescription must be in processing state to be rejected' });
    }
    prescription.status = 'rejected';
    prescription.rejectionReason = req.body.rejectionReason || '';
    await prescription.save();

    // Send rejection email
    if (prescription.email) {
      try {
        await sendPrescriptionRejectionEmail(
          prescription.email,
          prescription.name || 'Customer',
          prescription.rejectionReason
        );
      } catch (emailErr) {
        console.error('Failed to send rejection email:', emailErr);
      }
    }

    res.json({ message: 'Prescription rejected', prescription });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete prescription
router.delete('/:id', async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Delete associated files
    if (prescription.images && prescription.images.length > 0) {
      prescription.images.forEach(imagePath => {
        const fullPath = path.join(__dirname, '..', imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }

    await Prescription.findByIdAndDelete(req.params.id);
    res.json({ message: 'Prescription deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get prescriptions for a specific customer
router.get('/customer/:email', async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ email: req.params.email })
      .sort({ createdAt: -1 });
    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get prescriptions for a specific customer (by customerId, email, phone, and optionally orderType)
router.get('/customer', async (req, res) => {
  try {
    const { customerId, email, phone, orderType } = req.query;
    const query = {};
    if (customerId) query.customerId = customerId;
    if (!customerId && email) query.email = email;
    if (phone) query.phone = phone;
    if (orderType) query.orderType = orderType;
    console.log('Prescription query:', query);
    const prescriptions = await Prescription.find(query).sort({ createdAt: -1 });
    res.json({ data: prescriptions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

