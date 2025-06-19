const Inventory = require('../models/Inventory');

// Get all active products
exports.getProducts = async (req, res) => {
  try {
    console.log('Getting all active products...');
    const products = await Inventory.find({ status: 'active' }).sort({ createdAt: -1 });
    console.log(`Found ${products.length} active products`);
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    console.log('Getting product by ID:', req.params.id);
    const product = await Inventory.findOne({ 
      _id: req.params.id,
      status: 'active'
    });
    
    if (!product) {
      console.log('Product not found:', req.params.id);
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log('Product found:', product._id);
    res.json(product);
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ message: error.message });
  }
};
