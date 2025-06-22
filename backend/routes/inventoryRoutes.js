const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { protect, admin, staff } = require('../middlewares/auth');
//const upload = require('../middlewares/upload');
const {
  getInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventory
} = require('../controllers/inventoryController');


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

// All routes require authentication
router.use(protect);

// GET - Staff can view inventory (admin, pharmacist, doctor)
router.get('/', staff, getInventory);

// POST - Only admin can add inventory
router.post('/', admin, upload.array('images', 5), addInventoryItem);

// PUT - Only admin can update inventory
router.put('/:id', admin, upload.array('images', 5), updateInventoryItem);

// DELETE - Only admin can delete inventory
router.delete('/:id', admin, deleteInventory);

module.exports = router; 