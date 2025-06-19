const Inventory = require('../models/Inventory');

// Get all inventory items
exports.getInventory = async (req, res) => {
  try {
    console.log('Getting inventory items...');
    const inventory = await Inventory.find().sort({ createdAt: -1 });
    console.log(`Found ${inventory.length} inventory items`);
    res.json(inventory);
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add new inventory item
exports.addInventory = async (req, res) => {
  try {
    console.log('Adding new inventory item...');
    console.log('Request body:', req.body);
    
    const { name, description, category, price, stock, status, prescription, image } = req.body;

    // Validate required fields
    if (!name || !category || !price || !stock) {
      console.log('Missing required fields:', { name, category, price, stock });
      return res.status(400).json({ 
        message: 'Missing required fields: name, category, price, stock' 
      });
    }

    const inventoryData = {
      name: name.trim(),
      description: description ? description.trim() : '',
      category: category.trim(),
      price: Number(price),
      stock: Number(stock),
      status: status || 'active',
      prescription: prescription || 'not_required',
      image: image || ''
    };

    console.log('Creating inventory with data:', inventoryData);

    const inventory = new Inventory(inventoryData);
    const savedInventory = await inventory.save();
    
    console.log('Inventory item saved successfully:', savedInventory._id);
    res.status(201).json(savedInventory);
  } catch (error) {
    console.error('Add inventory error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update inventory item
exports.updateInventory = async (req, res) => {
  try {
    console.log('Updating inventory item...');
    console.log('Item ID:', req.params.id);
    console.log('Request body:', req.body);
    
    const { name, description, category, price, stock, status, prescription, image } = req.body;
    
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      console.log('Inventory item not found:', req.params.id);
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Update fields if provided
    if (name !== undefined) inventory.name = name.trim();
    if (description !== undefined) inventory.description = description.trim();
    if (category !== undefined) inventory.category = category.trim();
    if (price !== undefined) inventory.price = Number(price);
    if (stock !== undefined) inventory.stock = Number(stock);
    if (status !== undefined) inventory.status = status;
    if (prescription !== undefined) inventory.prescription = prescription;
    if (image !== undefined) inventory.image = image;

    const updatedInventory = await inventory.save();
    console.log('Inventory item updated successfully:', updatedInventory._id);
    res.json(updatedInventory);
  } catch (error) {
    console.error('Update inventory error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete inventory item
exports.deleteInventory = async (req, res) => {
  try {
    console.log('Deleting inventory item...');
    console.log('Item ID:', req.params.id);
    
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      console.log('Inventory item not found:', req.params.id);
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    await inventory.deleteOne();
    console.log('Inventory item deleted successfully:', req.params.id);
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Delete inventory error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 