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
    res.status(500).json({ message: 'Error fetching products', error: error.message });
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
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
};

exports.getRelatedProducts = async (req, res) => {
  try {
    const currentProduct = await Inventory.findById(req.params.id);
    if (!currentProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const relatedProducts = await Inventory.find({
      category: currentProduct.category,
      _id: { $ne: req.params.id }
    }).limit(4);

    res.json(relatedProducts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching related products', error: error.message });
  }
};

exports.createProduct = async (req, res) => {
  // This is a placeholder that redirects to the inventory controller logic.
  // In a real app, you might have separate logic for "products" vs "inventory".
  const inventoryController = require('./inventoryController');
  inventoryController.addInventoryItem(req, res);
};
