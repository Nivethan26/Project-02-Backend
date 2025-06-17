const express = require('express');
const router = express.Router();
const { protect, admin, staff } = require('../middlewares/auth');
const {
  getInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory
} = require('../controllers/inventoryController');

// GET /api/admin/inventory
router.get('/', protect, staff, getInventory);

// GET /api/admin/inventory/:id
router.get('/:id', protect, staff, getInventoryById);

// POST /api/admin/inventory
router.post('/', protect, admin, createInventory);

// PUT /api/admin/inventory/:id
router.put('/:id', protect, admin, updateInventory);

// DELETE /api/admin/inventory/:id
router.delete('/:id', protect, admin, deleteInventory);

module.exports = router; 