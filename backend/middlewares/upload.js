// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');

// // Ensure uploads/products directory exists
// const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/products/');
//   },
//   filename: function (req, file, cb) {
//     cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
//   }
// });

// const upload = multer({ storage: storage });

// module.exports = upload;
