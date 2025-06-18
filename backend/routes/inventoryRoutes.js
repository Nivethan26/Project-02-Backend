const express = require('express');
const router = express.Router();
const { protect, admin, staff } = require('../middlewares/auth');
const {
  getInventory,
  addInventory,
  updateInventory,
  deleteInventory
} = require('../controllers/inventoryController');

// All routes require authentication
router.use(protect);

// GET - Staff can view inventory (admin, pharmacist, doctor)
router.get('/', staff, getInventory);

// POST - Only admin can add inventory
router.post('/', admin, addInventory);

// PUT - Only admin can update inventory
router.put('/:id', admin, updateInventory);

// DELETE - Only admin can delete inventory
router.delete('/:id', admin, deleteInventory);

module.exports = router; 