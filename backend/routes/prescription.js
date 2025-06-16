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

module.exports = router;

