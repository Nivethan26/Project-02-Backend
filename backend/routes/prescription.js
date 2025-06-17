const express = require('express');
const multer = require('multer');
const Prescription = require('../models/Prescription');
const path = require('path');
const fs = require('fs');

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
    const prescription = new Prescription({ ...req.body, images });
    await prescription.save();
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
    await prescription.save();
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
    await prescription.save();
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

module.exports = router;

