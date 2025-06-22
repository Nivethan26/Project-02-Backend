const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const productController = require('../controllers/productController');

// Ensure uploads/products directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/products/');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});

const upload = multer({ storage: storage });

// GET all products
router.get('/', productController.getProducts);

// GET a single product by ID
router.get('/:id', productController.getProductById);

// GET related products by ID
router.get('/:id/related', productController.getRelatedProducts);

// POST a new product (example of an admin route)
router.post('/', upload.array('images', 5), productController.createProduct);

module.exports = router;
