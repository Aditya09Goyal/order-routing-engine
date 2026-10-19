const mongoose = require('mongoose');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const RoutingHistory = require('../models/RoutingHistory');
const routingEngine = require('../services/routingEngine');
const aiExplanation = require('../services/aiExplanation');
const { generateRandomOrder } = require('../services/orderGenerator');
const orderService = require('../services/orderService');
const { getPaging, pageMeta } = require('../utils/paginate');

const ORDER_STATUSES = ['pending', 'assigned', 'fulfilled'];

exports.createOrder = async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json({ success: true, data: order, message: 'Order created' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/orders?page=1&limit=20&status=assigned,fulfilled
// Returns one page (newest first) instead of every order ever placed.
exports.getOrders = async (req, res) => {
  try {
    const { page, limit, skip } = getPaging(req.query, 20, 200);

    const filter = {};
    if (req.query.status) {
      const wanted = String(req.query.status).split(',').filter((s) => ORDER_STATUSES.includes(s));
      if (wanted.length) filter.status = { $in: wanted };
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1, _id: -1 }) // _id breaks ties so rows never repeat/skip between pages
        .skip(skip)
        .limit(limit)
        .populate('productId')
        .populate('assignedWarehouseId'),
      Order.countDocuments(filter)
    ]);

    res.status(200).json({ success: true, data: orders, pagination: pageMeta(page, limit, total), message: 'Orders fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/stats — counts for the Dashboard, so it doesn't download every order
exports.getOrderStats = async (req, res) => {
  try {
    const rows = await Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const by = Object.fromEntries(rows.map((r) => [r._id, r.count]));
    const pending = by.pending || 0;
    const assigned = by.assigned || 0;
    const fulfilled = by.fulfilled || 0;
    res.status(200).json({
      success: true,
      data: { pending, assigned, fulfilled, active: pending + assigned, total: pending + assigned + fulfilled }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    // A malformed id (like "abc") is simply "not found", not a server crash
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const order = await Order.findById(req.params.id).populate('productId').populate('assignedWarehouseId');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.status(200).json({ success: true, data: order, message: 'Order fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    // Only { "status": "fulfilled" } is allowed.
    if (req.body.status !== 'fulfilled') {
      return res.status(400).json({ success: false, message: 'Only { "status": "fulfilled" } can be updated' });
    }

    // Step A: flip assigned -> fulfilled in ONE atomic operation.
    // The filter `status: 'assigned'` means a second request (double click) matches nothing,
    // so the reserved stock can never be released twice.
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, status: 'assigned' },
      { status: 'fulfilled' },
      { returnDocument: 'after' }
    );

    if (!order) {
      // Nothing matched: either the order doesn't exist, or it isn't in 'assigned' state.
      const existing = await Order.findById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, message: 'Order not found' });
      return res.status(409).json({
        success: false,
        message: `Order is already "${existing.status}". Only "assigned" orders can be fulfilled.`
      });
    }

    // Step B: the goods have shipped, so they are no longer "reserved" in the warehouse.
    // The $gte guard stops reservedQuantity from ever going negative.
    await Inventory.updateOne(
      {
        warehouseId: order.assignedWarehouseId,
        productId: order.productId,
        reservedQuantity: { $gte: order.quantity }
      },
      { $inc: { reservedQuantity: -order.quantity }, $set: { updatedAt: new Date() } }
    );

    res.status(200).json({ success: true, data: order, message: 'Order fulfilled and reserved stock released' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.generateRandomOrderRoute = async (req, res) => {
  try {
    const fakeCustomer = await generateRandomOrder();
    const result = await orderService.processAndRouteOrder({
      customerName: fakeCustomer.customerName,
      customerLat: fakeCustomer.customerLatitude,
      customerLng: fakeCustomer.customerLongitude,
      productId: fakeCustomer.productId,
      quantity: fakeCustomer.quantity
    });

    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'No eligible warehouses with sufficient stock found for random order',
        data: result.data
      });
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Random order generated and routed successfully'
    });

  } catch (error) {
    console.error('Random Order Route error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
