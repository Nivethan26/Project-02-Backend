const Order = require("../models/Order");
const Inventory = require("../models/Inventory");
const Prescription = require("../models/Prescription");
const { sendOrderProcessingEmail } = require("../services/emailService");

// Create a POS order (direct sale without prescription)
exports.createPOSOrder = async (req, res) => {
  try {
    console.log("POS Order creation request received:", req.body);
    console.log("User from request:", req.user);

    const {
      customer,
      items,
      paymentMethod,
      subtotal,
      tax,
      total,
      description,
    } = req.body;

    // Validate required fields
    if (!customer || !customer.name || !customer.phone) {
      return res.status(400).json({
        success: false,
        message: "Customer name and phone are required",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required and must not be empty",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    // Validate items and calculate total
    let calculatedTotal = 0;
    const orderItems = [];

    for (const item of items) {
      console.log("Processing POS item:", item);

      if (!item.productId || !item.quantity || !item.price) {
        return res.status(400).json({
          success: false,
          message: "Each item must have productId, quantity, and price",
        });
      }

      const product = await Inventory.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
        });
      }

      console.log("Product before stock update:", {
        id: product._id,
        name: product.name,
        stock: product.stock,
        newStock: product.stock - item.quantity,
      });

      // Update product stock
      product.stock = product.stock - item.quantity;

      // Ensure description is not empty
      if (!product.description || product.description.trim() === "") {
        product.description = `Product: ${product.name}`;
      }

      await product.save();

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: item.price,
      });

      calculatedTotal += item.price * item.quantity;
    }

    console.log("POS Order items prepared:", orderItems);
    console.log("Calculated total:", calculatedTotal);

    // Create POS order
    const orderData = {
      customer: {
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone,
        address: customer.address || "",
        city: customer.city || "",
      },
      items: orderItems,
      totalAmount: total || calculatedTotal,
      subtotal: subtotal || calculatedTotal,
      tax: tax || 0,
      paymentMethod,
      description: description || `POS Sale - ${customer.name}`,
      orderType: "pos_sale",
      status: "completed",
    };

    // Only add createdBy if user exists
    if (req.user && req.user._id) {
      orderData.createdBy = req.user._id;
    }

    console.log("Creating POS order with data:", orderData);

    const order = await Order.create(orderData);

    console.log("POS Order created successfully:", order._id);

    res.status(201).json({
      success: true,
      message: "POS Order created successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error creating POS order:", error);
    console.error("Error stack:", error.stack);

    // Handle specific MongoDB errors
    if (error.name === "ValidationError") {
      console.error("Validation error details:", error.errors);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: Object.values(error.errors).map(
          (err) => `${err.path}: ${err.message}`
        ),
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating POS order",
      error: error.message,
    });
  }
};

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    console.log("Order creation request received:", req.body);
    console.log("User from request:", req.user);

    const { prescriptionId, items, paymentMethod } = req.body;

    // Validate required fields
    if (!prescriptionId) {
      return res.status(400).json({
        success: false,
        message: "Prescription ID is required",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required and must not be empty",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    // Get prescription details
    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    console.log("Prescription found:", prescription.name);

    // Validate items and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      console.log("Processing item:", item);

      if (!item.productId || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: "Each item must have productId and quantity",
        });
      }

      const product = await Inventory.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
        });
      }

      console.log("Product before stock update:", {
        id: product._id,
        name: product.name,
        description: product.description,
        stock: product.stock,
        newStock: product.stock - item.quantity,
      });

      // Update product stock - preserve all existing fields
      product.stock = product.stock - item.quantity;

      // Ensure description is not empty
      if (!product.description || product.description.trim() === "") {
        product.description = `Product: ${product.name}`;
      }

      await product.save();

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });

      totalAmount += product.price * item.quantity;
    }

    console.log("Order items prepared:", orderItems);
    console.log("Total amount:", totalAmount);

    // Create order
    const orderData = {
      prescription: prescriptionId,
      customer: {
        name: prescription.name,
        email: prescription.email,
        phone: prescription.phone,
        address: prescription.address,
        city: prescription.city,
      },
      items: orderItems,
      totalAmount,
      paymentMethod,
      description: `Order for prescription ${prescription.name} - ${prescription.duration}`,
    };

    // Only add createdBy if user exists
    if (req.user && req.user._id) {
      orderData.createdBy = req.user._id;
    }

    console.log("Creating order with data:", orderData);
    console.log("Order data JSON:", JSON.stringify(orderData, null, 2));

    const order = await Order.create(orderData);

    // Send order processing email to user
    if (prescription.email) {
      try {
        await sendOrderProcessingEmail(
          prescription.email,
          prescription.name || "Customer",
          order._id
        );
      } catch (emailErr) {
        console.error("Failed to send order processing email:", emailErr);
      }
    }

    console.log("Order created successfully:", order._id);

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    console.error("Error stack:", error.stack);

    // Handle specific MongoDB errors
    if (error.name === "ValidationError") {
      console.error("Validation error details:", error.errors);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: Object.values(error.errors).map(
          (err) => `${err.path}: ${err.message}`
        ),
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating order",
      error: error.message,
    });
  }
};

// Get customer orders
exports.getCustomerOrders = async (req, res) => {
  try {
    const { customerId, email, phone } = req.query;

    console.log("=== GET CUSTOMER ORDERS START ===");
    console.log("Query parameters:", { customerId, email, phone });

    let query = {};

    // Build query based on provided parameters
    if (customerId) {
      query.customerId = customerId;
    } else if (email) {
      query["customer.email"] = email;
    } else if (phone) {
      query["customer.phone"] = phone;
    } else {
      return res.status(400).json({
        success: false,
        message: "Please provide customerId, email, or phone to fetch orders",
      });
    }

    console.log("MongoDB query:", JSON.stringify(query, null, 2));

    const orders = await Order.find(query)
      .populate({
        path: "items.product",
        select: "name description price image stock category",
      })
      .populate("customerId", "name email")
      .sort({ createdAt: -1 }) // Most recent first
      .lean();

    console.log("Raw orders from database:", orders.length);
    console.log(
      "Sample order structure:",
      orders.length > 0 ? JSON.stringify(orders[0], null, 2) : "No orders found"
    );

    // Transform the data to match frontend expectations
    const transformedOrders = orders.map((order) => {
      console.log(`Processing order ${order._id}:`, {
        itemsCount: order.items?.length,
        itemsWithProducts: order.items?.filter((item) => item.product).length,
        itemsWithoutProducts: order.items?.filter((item) => !item.product)
          .length,
      });

      return {
        id: order._id,
        orderNumber: order.orderNumber,
        date: order.createdAt,
        status: order.status,
        total: order.totalAmount,
        items: order.items.map((item) => {
          // Add null check for item.product
          if (!item.product) {
            console.warn(
              `Product not found for item in order ${order._id}, item:`,
              item
            );
            return {
              id: item.product || "unknown",
              name: "Product not available",
              price: item.price || 0,
              quantity: item.quantity || 0,
              image: null,
            };
          }

          return {
            id: item.product._id,
            name: item.product.name || "Unknown Product",
            price: item.price,
            quantity: item.quantity,
            image: item.product.image || null,
          };
        }),
        shippingAddress: `${order.customer.address || ""} ${
          order.customer.city || ""
        }`.trim(),
        paymentMethod: order.paymentMethod,
        estimatedDelivery: order.estimatedDelivery,
        customer: order.customer,
        trackingNumber: order.trackingNumber,
        orderType: order.orderType,
      };
    });

    console.log("Transformed orders count:", transformedOrders.length);
    console.log("=== GET CUSTOMER ORDERS SUCCESS ===");

    res.status(200).json({
      success: true,
      message: "Customer orders retrieved successfully",
      data: transformedOrders,
    });
  } catch (error) {
    console.error("=== GET CUSTOMER ORDERS ERROR ===");
    console.error("Error fetching customer orders:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Error fetching customer orders",
      error: error.message,
    });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate({
        path: "items.product",
        select: "name description price image stock category",
      })
      .populate("customerId", "name email")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Transform the data to match frontend expectations
    const transformedOrder = {
      id: order._id,
      orderNumber: order.orderNumber,
      date: order.createdAt,
      status: order.status,
      total: order.totalAmount,
      items: order.items.map((item) => {
        // Add null check for item.product
        if (!item.product) {
          console.warn(
            `Product not found for item in order ${order._id}, item:`,
            item
          );
          return {
            id: item.product || "unknown",
            name: "Product not available",
            price: item.price || 0,
            quantity: item.quantity || 0,
            image: null,
          };
        }

        return {
          id: item.product._id,
          name: item.product.name || "Unknown Product",
          price: item.price,
          quantity: item.quantity,
          image: item.product.image || null,
        };
      }),
      shippingAddress: `${order.customer.address || ""} ${
        order.customer.city || ""
      }`.trim(),
      paymentMethod: order.paymentMethod,
      estimatedDelivery: order.estimatedDelivery,
      customer: order.customer,
      trackingNumber: order.trackingNumber,
      orderType: order.orderType,
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
    };

    res.status(200).json({
      success: true,
      message: "Order retrieved successfully",
      data: transformedOrder,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order",
      error: error.message,
    });
  }
};

// Create online order (from frontend payment)
exports.createOnlineOrder = async (req, res) => {
  try {
    console.log("=== ONLINE ORDER CREATION START ===");
    console.log("Online Order creation request received:", req.body);
    console.log("Request headers:", req.headers);

    const {
      customer,
      items,
      paymentMethod,
      subtotal,
      shipping,
      tax,
      total,
      customerId,
    } = req.body;

    console.log("Parsed data:", {
      customer: customer,
      itemsCount: items?.length,
      items: items,
      paymentMethod,
      subtotal,
      shipping,
      tax,
      total,
      customerId,
    });

    // Validate required fields
    if (!customer || !customer.name || !customer.phone) {
      console.log("Validation failed - customer data:", customer);
      return res.status(400).json({
        success: false,
        message: "Customer name and phone are required",
        received: { customer },
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log("Validation failed - items data:", items);
      return res.status(400).json({
        success: false,
        message: "Items array is required and must not be empty",
        received: { items },
      });
    }

    if (!paymentMethod) {
      console.log("Validation failed - payment method missing");
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
        received: { paymentMethod },
      });
    }

    console.log("=== VALIDATION PASSED ===");

    // Validate items and calculate total
    let calculatedTotal = 0;
    const orderItems = [];

    for (const item of items) {
      console.log("Processing online order item:", item);

      if (!item.id || !item.quantity || !item.price) {
        console.log("Item validation failed:", item);
        return res.status(400).json({
          success: false,
          message: "Each item must have id, quantity, and price",
          received: { item },
        });
      }

      const product = await Inventory.findById(item.id);
      if (!product) {
        console.log("Product not found:", item.id);
        return res.status(404).json({
          success: false,
          message: `Product ${item.id} not found`,
        });
      }

      if (product.stock < item.quantity) {
        console.log("Insufficient stock:", {
          product: product.name,
          available: product.stock,
          requested: item.quantity,
        });
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
        });
      }

      console.log("Product before stock update:", {
        id: product._id,
        name: product.name,
        stock: product.stock,
        newStock: product.stock - item.quantity,
      });

      // Update product stock
      product.stock = product.stock - item.quantity;
      await product.save();

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: item.price,
      });

      calculatedTotal += item.price * item.quantity;
    }

    console.log("Online Order items prepared:", orderItems);
    console.log("Calculated total:", calculatedTotal);

    // Create online order
    const orderData = {
      customer: {
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone,
        address: customer.billingAddress || "",
        city: customer.city || "",
        postalCode: customer.postalCode || "",
      },
      customerId: customerId || null,
      items: orderItems,
      totalAmount: total || calculatedTotal,
      subtotal: subtotal || calculatedTotal,
      shipping: shipping || 500,
      tax: tax || 0,
      paymentMethod,
      description: `Online Order - ${customer.name}`,
      orderType: "online",
      status: "pending",
    };

    console.log("Creating online order with data:", orderData);

    const order = await Order.create(orderData);

    console.log("Online Order created successfully:", order._id);
    console.log("=== ONLINE ORDER CREATION COMPLETE ===");

    // Debug: Log the order data being sent back
    console.log("=== ORDER DATA BEING SENT BACK ===");
    console.log("Order ID:", order._id);
    console.log("Order Number:", order.orderNumber);
    console.log("Total Amount:", order.totalAmount);
    console.log("Subtotal:", order.subtotal);
    console.log("Shipping:", order.shipping);
    console.log("Items count:", order.items?.length);
    console.log("Payment Method:", order.paymentMethod);
    console.log("Status:", order.status);
    console.log("Full order object:", order.toObject());

    res.status(201).json({
      success: true,
      message: "Online Order created successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error creating online order:", error);
    console.error("Error stack:", error.stack);

    // Handle specific MongoDB errors
    if (error.name === "ValidationError") {
      console.error("Validation error details:", error.errors);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: Object.values(error.errors).map(
          (err) => `${err.path}: ${err.message}`
        ),
        details: error.errors,
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating online order",
      error: error.message,
    });
  }
};

// Get available products for debugging
exports.getAvailableProducts = async (req, res) => {
  try {
    const products = await Inventory.find({}, "name _id stock price").limit(10);

    res.status(200).json({
      success: true,
      message: "Available products retrieved successfully",
      data: products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message,
    });
  }
};

// Check data integrity - find orders with orphaned product references
exports.checkDataIntegrity = async (req, res) => {
  try {
    console.log("=== DATA INTEGRITY CHECK START ===");

    // Get all orders
    const orders = await Order.find({})
      .populate({
        path: "items.product",
        select: "name _id",
      })
      .lean();

    console.log("Total orders found:", orders.length);

    const integrityIssues = [];

    orders.forEach((order) => {
      const orphanedItems = order.items.filter((item) => !item.product);
      if (orphanedItems.length > 0) {
        integrityIssues.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          orphanedItemsCount: orphanedItems.length,
          orphanedItems: orphanedItems.map((item) => ({
            productId: item.product,
            quantity: item.quantity,
            price: item.price,
          })),
        });
      }
    });

    console.log("Data integrity issues found:", integrityIssues.length);
    console.log("Sample issues:", integrityIssues.slice(0, 3));

    res.status(200).json({
      success: true,
      message: "Data integrity check completed",
      data: {
        totalOrders: orders.length,
        ordersWithIssues: integrityIssues.length,
        issues: integrityIssues,
      },
    });
  } catch (error) {
    console.error("Error checking data integrity:", error);
    res.status(500).json({
      success: false,
      message: "Error checking data integrity",
      error: error.message,
    });
  }
};
