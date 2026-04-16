const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  updateOrderStatus,
  getDashboard,
} = require('../controllers/orderController');
const { protect } = require('../utils/authMiddleware');

router.use(protect); // Protect all order routes

router.post('/', createOrder);
router.get('/', getOrders);
router.patch('/:id/status', updateOrderStatus);
router.get('/dashboard', getDashboard);

module.exports = router;
