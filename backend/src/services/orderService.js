const Order = require('../models/Order');
const { VALID_STATUS_TRANSITIONS, ORDER_STATUS, GARMENT_PRICES } = require('../utils/constants');
const memoryStorage = require('../utils/memoryStorage');
const { isDbConnected } = require('../utils/dbStatus');

const calculateIntelligentDeliveryDate = async (orderData) => {
  let orders = [];
  if (isDbConnected()) {
    orders = await Order.find({ status: { $in: [ORDER_STATUS.READY, ORDER_STATUS.DELIVERED] } });
  } else {
    orders = memoryStorage.orders.filter(o => [ORDER_STATUS.READY, ORDER_STATUS.DELIVERED].includes(o.status));
  }

  // Calculate base processing time per garment (in ms)
  let baseTimePerGarmentMs = 24 * 60 * 60 * 1000; // Default 1 day per garment

  if (orders.length > 0) {
    const totalProcessingTime = orders.reduce((acc, order) => {
      const processingTime = new Date(order.updatedAt) - new Date(order.createdAt);
      const totalGarments = order.garments.reduce((sum, g) => sum + g.quantity, 0);
      return acc + (processingTime / (totalGarments || 1));
    }, 0);
    baseTimePerGarmentMs = totalProcessingTime / orders.length;
  }

  const currentOrderGarments = orderData.garments.reduce((sum, g) => sum + g.quantity, 0);
  const bufferTimeMs = 12 * 60 * 60 * 1000; // 12 hours fixed buffer
  
  const estimatedDate = new Date();
  const predictedTime = (baseTimePerGarmentMs * currentOrderGarments) + bufferTimeMs;
  
  // Ensure at least 1 day and max 7 days for realism
  const minTime = 24 * 60 * 60 * 1000;
  const maxTime = 7 * 24 * 60 * 60 * 1000;
  const finalTime = Math.min(Math.max(predictedTime, minTime), maxTime);

  estimatedDate.setTime(estimatedDate.getTime() + finalTime);
  return estimatedDate;
};

const createOrder = async (orderData) => {
  // Enforce server-side pricing
  orderData.garments = orderData.garments.map(g => ({
    ...g,
    pricePerItem: GARMENT_PRICES[g.garmentType] || 10
  }));

  const intelligentDate = await calculateIntelligentDeliveryDate(orderData);
  
  if (isDbConnected()) {
    const order = new Order({
      ...orderData,
      estimatedDeliveryDate: intelligentDate
    });
    return await order.save();
  } else {
    const order = {
      _id: Date.now().toString(),
      orderId: 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      ...orderData,
      status: ORDER_STATUS.RECEIVED,
      totalAmount: orderData.garments.reduce((acc, item) => acc + (item.quantity * item.pricePerItem), 0),
      estimatedDeliveryDate: intelligentDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStorage.orders.push(order);
    return order;
  }
};

const getOrders = async (filters) => {
  if (isDbConnected()) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.customerName) query.customerName = { $regex: filters.customerName, $options: 'i' };
    if (filters.phoneNumber) query.phoneNumber = filters.phoneNumber;
    if (filters.garmentType) query['garments.garmentType'] = { $regex: filters.garmentType, $options: 'i' };
    return await Order.find(query).sort({ createdAt: -1 });
  } else {
    let filtered = [...memoryStorage.orders];
    if (filters.status) filtered = filtered.filter(o => o.status === filters.status);
    if (filters.customerName) filtered = filtered.filter(o => o.customerName.toLowerCase().includes(filters.customerName.toLowerCase()));
    if (filters.phoneNumber) filtered = filtered.filter(o => o.phoneNumber === filters.phoneNumber);
    if (filters.garmentType) {
      filtered = filtered.filter(o => 
        o.garments.some(g => g.garmentType.toLowerCase().includes(filters.garmentType.toLowerCase()))
      );
    }
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }
};

const updateOrderStatus = async (id, newStatus) => {
  if (isDbConnected()) {
    const order = await Order.findById(id);
    if (!order) throw new Error('Order not found');
    const currentStatus = order.status;
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
    order.status = newStatus;
    return await order.save();
  } else {
    // Check if ID is a timestamp (from memoryStorage) or a Mongo ID
    const order = memoryStorage.orders.find(o => o._id === id);
    if (!order) {
      // In Demo Mode on Vercel, we can't update orders across requests because memory is cleared.
      // We throw a more descriptive error.
      throw new Error('Order not found (Demo Mode: Orders are temporary and cleared when the server restarts)');
    }
    order.status = newStatus;
    order.updatedAt = new Date();
    return order;
  }
};

const getDashboardStats = async () => {
  let allOrders = [];
  if (isDbConnected()) {
    allOrders = await Order.find();
  } else {
    allOrders = memoryStorage.orders;
  }

  const completedOrders = allOrders.filter(o => [ORDER_STATUS.READY, ORDER_STATUS.DELIVERED].includes(o.status));
  let avgProcessingTimeDays = 3; // Default

  if (completedOrders.length > 0) {
    const totalMs = completedOrders.reduce((acc, o) => acc + (new Date(o.updatedAt) - new Date(o.createdAt)), 0);
    avgProcessingTimeDays = (totalMs / completedOrders.length / (1000 * 60 * 60 * 24)).toFixed(1);
  }

  const totalOrders = allOrders.length;
  const totalRevenue = allOrders.reduce((acc, order) => acc + order.totalAmount, 0);
  
  const statusCounts = allOrders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  const ordersByStatus = Object.keys(statusCounts).map(status => ({
    _id: status,
    count: statusCounts[status]
  }));

  return {
    totalOrders,
    totalRevenue,
    ordersByStatus,
    avgProcessingTimeDays
  };
};

module.exports = {
  createOrder,
  getOrders,
  updateOrderStatus,
  getDashboardStats,
};
