const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/auth');
const {
  getInventory,
  addInventory,
  updateInventory,
  deleteInventory
} = require('../controllers/inventoryController');

// Get all inventory items
router.get('/', protect, getInventory);

// Add new inventory item
router.post('/', protect, admin, addInventory);

// Update inventory item
router.put('/:id', protect, admin, updateInventory);

// Delete inventory item
router.delete('/:id', protect, admin, deleteInventory);

module.exports = router; 