const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads/staff directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'staff');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const staffStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/staff/');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});

const staffUpload = multer({ storage: staffStorage });

module.exports = { staffUpload };
