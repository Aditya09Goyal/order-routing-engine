const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.post('/generate-random', verifyToken, requireRole('admin'), orderController.generateRandomOrderRoute);
router.get('/', verifyToken, orderController.getOrders);
// IMPORTANT: '/stats' must come BEFORE '/:id', otherwise Express treats "stats" as an order id
router.get('/stats', verifyToken, orderController.getOrderStats);
router.get('/:id', verifyToken, orderController.getOrderById);
router.put('/:id', verifyToken, requireRole('admin', 'manager'), orderController.updateOrder);

module.exports = router;