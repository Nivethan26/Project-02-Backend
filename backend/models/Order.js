const mongoose = require("mongoose");

// Check if the model exists before creating it
// const Order =
//   mongoose.models.Order ||
//   mongoose.model(
//     "Order",
//     new mongoose.Schema(
//       {
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: false, // Changed to false since it's auto-generated
    },
    prescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
      required: false, // Made optional for POS orders
    },
    customer: {
      name: {
        type: String,
        required: true,
      },
      email: String,
      phone: {
        type: String,
        required: true,
      },
      address: String,
      city: String,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // For registered customers
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Inventory",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: false,
      min: 0,
    },
    shipping: {
      type: Number,
      required: false,
      min: 0,
      default: 500,
    },
    tax: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "completed",
        "cancelled",
        "confirmed",
      ],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    orderType: {
      type: String,
      enum: ["prescription", "pos_sale", "online"],
      default: "prescription",
    },
    description: {
      type: String,
      default: "Order created from prescription",
    },
    estimatedDelivery: {
      type: Date,
      required: false,
    },
    trackingNumber: {
      type: String,
      required: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Add Counter model for atomic order number generation
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: Number
});
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

// Pre-save middleware to generate order number
orderSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.orderNumber) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const counterId = `order-${year}${month}${day}`;
      const counter = await Counter.findByIdAndUpdate(
        counterId,
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
      );
      const sequence = String(counter.seq).padStart(3, "0");
      this.orderNumber = `ORD-${year}${month}${day}-${sequence}`;
    }
    // Set estimated delivery to 2-3 business days from now
    if (this.isNew && !this.estimatedDelivery) {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 3); // 3 days from now
      this.estimatedDelivery = deliveryDate;
    }
    next();
  } catch (error) {
    console.error("Error in pre-save middleware:", error);
    next(error);
  }
});
// Check if the model exists before creating it
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
module.exports = Order;
