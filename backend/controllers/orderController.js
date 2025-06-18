const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const Prescription = require('../models/Prescription');

// Create a POS order (direct sale without prescription)
exports.createPOSOrder = async (req, res) => {
  try {
    console.log('POS Order creation request received:', req.body);
    console.log('User from request:', req.user);

    const { customer, items, paymentMethod, subtotal, tax, total, description } = req.body;

    // Validate required fields
    if (!customer || !customer.name || !customer.phone) {
      return res.status(400).json({ 
        success: false,
        message: 'Customer name and phone are required' 
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Items array is required and must not be empty' 
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({ 
        success: false,
        message: 'Payment method is required' 
      });
    }

    // Validate items and calculate total
    let calculatedTotal = 0;
    const orderItems = [];

    for (const item of items) {
      console.log('Processing POS item:', item);
      
      if (!item.productId || !item.quantity || !item.price) {
        return res.status(400).json({ 
          success: false,
          message: 'Each item must have productId, quantity, and price' 
        });
      }

      const product = await Inventory.findById(item.productId);
      if (!product) {
        return res.status(404).json({ 
          success: false,
          message: `Product ${item.productId} not found` 
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
        });
      }

      console.log('Product before stock update:', {
        id: product._id,
        name: product.name,
        stock: product.stock,
        newStock: product.stock - item.quantity
      });

      // Update product stock
      product.stock = product.stock - item.quantity;
      
      // Ensure description is not empty
      if (!product.description || product.description.trim() === '') {
        product.description = `Product: ${product.name}`;
      }
      
      await product.save();

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: item.price
      });

      calculatedTotal += item.price * item.quantity;
    }

    console.log('POS Order items prepared:', orderItems);
    console.log('Calculated total:', calculatedTotal);

    // Create POS order
    const orderData = {
      customer: {
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone,
        address: customer.address || '',
        city: customer.city || ''
      },
      items: orderItems,
      totalAmount: total || calculatedTotal,
      subtotal: subtotal || calculatedTotal,
      tax: tax || 0,
      paymentMethod,
      description: description || `POS Sale - ${customer.name}`,
      orderType: 'pos_sale',
      status: 'completed'
    };

    // Only add createdBy if user exists
    if (req.user && req.user._id) {
      orderData.createdBy = req.user._id;
    }

    console.log('Creating POS order with data:', orderData);

    const order = await Order.create(orderData);

    console.log('POS Order created successfully:', order._id);

    res.status(201).json({
      success: true,
      message: 'POS Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Error creating POS order:', error);
    console.error('Error stack:', error.stack);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      console.error('Validation error details:', error.errors);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: Object.values(error.errors).map(err => `${err.path}: ${err.message}`)
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating POS order',
      error: error.message
    });
  }
};

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    console.log('Order creation request received:', req.body);
    console.log('User from request:', req.user);

    const { prescriptionId, items, paymentMethod } = req.body;

    // Validate required fields
    if (!prescriptionId) {
      return res.status(400).json({ 
        success: false,
        message: 'Prescription ID is required' 
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Items array is required and must not be empty' 
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({ 
        success: false,
        message: 'Payment method is required' 
      });
    }

    // Get prescription details
    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({ 
        success: false,
        message: 'Prescription not found' 
      });
    }

    console.log('Prescription found:', prescription.name);

    // Validate items and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      console.log('Processing item:', item);
      
      if (!item.productId || !item.quantity) {
        return res.status(400).json({ 
          success: false,
          message: 'Each item must have productId and quantity' 
        });
      }

      const product = await Inventory.findById(item.productId);
      if (!product) {
        return res.status(404).json({ 
          success: false,
          message: `Product ${item.productId} not found` 
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
        });
      }

      console.log('Product before stock update:', {
        id: product._id,
        name: product.name,
        description: product.description,
        stock: product.stock,
        newStock: product.stock - item.quantity
      });

      // Update product stock - preserve all existing fields
      product.stock = product.stock - item.quantity;
      
      // Ensure description is not empty
      if (!product.description || product.description.trim() === '') {
        product.description = `Product: ${product.name}`;
      }
      
      await product.save();

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });

      totalAmount += product.price * item.quantity;
    }

    console.log('Order items prepared:', orderItems);
    console.log('Total amount:', totalAmount);

    // Create order
    const orderData = {
      prescription: prescriptionId,
      customer: {
        name: prescription.name,
        email: prescription.email,
        phone: prescription.phone,
        address: prescription.address,
        city: prescription.city
      },
      items: orderItems,
      totalAmount,
      paymentMethod,
      description: `Order for prescription ${prescription.name} - ${prescription.duration}`
    };

    // Only add createdBy if user exists
    if (req.user && req.user._id) {
      orderData.createdBy = req.user._id;
    }

    console.log('Creating order with data:', orderData);
    console.log('Order data JSON:', JSON.stringify(orderData, null, 2));

    const order = await Order.create(orderData);

    console.log('Order created successfully:', order._id);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    console.error('Error stack:', error.stack);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      console.error('Validation error details:', error.errors);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: Object.values(error.errors).map(err => `${err.path}: ${err.message}`)
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
};
