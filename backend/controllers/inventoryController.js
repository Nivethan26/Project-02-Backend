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

// Add a new inventory item
exports.addInventoryItem = async (req, res) => {
  try {
    const { name, description, price, packPrice, stock, category, brand, packSize, tags, status, prescription } = req.body;
    
    let imagePaths = [];
    if (req.files && req.files.length > 0) {
      imagePaths = req.files.map(file => file.filename);
    }

    const newItem = new Inventory({
      name,
      description,
      price,
      packPrice,
      stock,
      category,
      brand,
      packSize,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(tag => tag.trim()) : []),
      images: imagePaths,
      status,
      prescription
    });

    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(400).json({ message: 'Error adding inventory item', error: error.message });
  }
};

exports.updateInventoryItem = async (req, res) => {
  try {
    const { name, description, price, packPrice, stock, category, brand, packSize, tags, status, prescription } = req.body;
    
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // On-the-fly migration for legacy 'image' field
    if (item.image) {
      item.images = item.images || [];
      if (!item.images.includes(item.image)) {
        item.images.push(item.image);
      }
      item.image = undefined;
    }

    item.name = name || item.name;
    item.description = description || item.description;
    item.price = price || item.price;
    item.packPrice = packPrice || item.packPrice;
    item.stock = stock || item.stock;
    item.category = category || item.category;
    item.brand = brand || item.brand;
    item.packSize = packSize || item.packSize;
    item.status = status || item.status;
    item.prescription = prescription || item.prescription;
    
    if (tags) {
      item.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
    }
    
    // Handle multiple new images
    if (req.files && req.files.length > 0) {
      const newImagePaths = req.files.map(file => file.filename);
      item.images = [...(item.images || []), ...newImagePaths];
    } else if (req.body.images) {
      // Handle when images are passed as stringified array or array
      try {
        const parsedImages = JSON.parse(req.body.images);
        item.images = Array.isArray(parsedImages) ? parsedImages : [parsedImages];
      } catch (e) {
        item.images = req.body.images;
      }
    }

    const updatedItem = await item.save();
    res.json(updatedItem);

  } catch (error) {
    res.status(400).json({ message: 'Error updating inventory item', error: error.message });
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