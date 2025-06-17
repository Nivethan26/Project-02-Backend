const Inventory = require('../models/inventory');

// Get all inventory items
exports.getInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find().sort({ createdAt: -1 });
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add new inventory item
exports.addInventory = async (req, res) => {
  try {
    const { name, description, category, price, stock, status, prescription, image } = req.body;

    const inventory = new Inventory({
      name,
      description,
      category,
      price: Number(price),
      stock: Number(stock),
      status: status || 'active',
      prescription: prescription || 'not_required',
      image: image || ''
    });

    const savedInventory = await inventory.save();
    res.status(201).json(savedInventory);
  } catch (error) {
    console.error('Add inventory error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Update inventory item
exports.updateInventory = async (req, res) => {
  try {
    const { name, description, category, price, stock, status, prescription, image } = req.body;
    
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    inventory.name = name || inventory.name;
    inventory.description = description || inventory.description;
    inventory.category = category || inventory.category;
    inventory.price = price || inventory.price;
    inventory.stock = stock || inventory.stock;
    inventory.status = status || inventory.status;
    inventory.prescription = prescription || inventory.prescription;
    inventory.image = image || inventory.image;

    const updatedInventory = await inventory.save();
    res.json(updatedInventory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete inventory item
exports.deleteInventory = async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    await inventory.deleteOne();
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 