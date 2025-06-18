const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const Prescription = require('../models/Prescription');

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const { prescriptionId, items, paymentMethod } = req.body;

    // Get prescription details
    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Validate items and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Inventory.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }

      // Update product stock
      product.stock -= item.quantity;
      await product.save();

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });

      totalAmount += product.price * item.quantity;
    }

    // Create order
    const order = await Order.create({
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
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
};
