const mongoose = require('mongoose');
const { ORDER_STATUS } = require('../utils/constants');

const garmentSchema = new mongoose.Schema({
  garmentType: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  pricePerItem: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  garments: [garmentSchema],
  totalAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.RECEIVED,
  },
  estimatedDeliveryDate: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Middleware to calculate total amount before saving if not provided
orderSchema.pre('validate', function(next) {
  if (this.garments && this.garments.length > 0) {
    this.totalAmount = this.garments.reduce((acc, item) => {
      return acc + (item.quantity * item.pricePerItem);
    }, 0);
  }
  
  if (!this.orderId) {
    this.orderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  
  if (!this.estimatedDeliveryDate) {
    const date = new Date();
    date.setDate(date.getDate() + 3); // Default 3 days delivery
    this.estimatedDeliveryDate = date;
  }
  
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
