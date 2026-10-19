const Order = require('../models/Order');
const Warehouse = require('../models/Warehouse');
const { getPaging, pageMeta, escapeRegex } = require('../utils/paginate');
const RoutingHistory = require('../models/RoutingHistory');
const orderService = require('../services/orderService');

exports.routeOrder = async (req, res) => {
  try {
    const result = await orderService.processAndRouteOrder(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        message: result.message,
        data: result.data
      });
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Order routed successfully'
    });

  } catch (error) {
    if (!error.status) console.error('Routing error:', error); // log only real server errors
    res.status(error.status || 500).json({ success: false, message: error.message }); // 400 for bad input
  }
};

// GET /api/routing/routing-history?page=1&limit=10&search=mumbai
// One page at a time. `search` matches customer name or warehouse name (done in the database).
exports.getRoutingHistory = async (req, res) => {
  try {
    const { page, limit, skip } = getPaging(req.query, 10, 100);

    const filter = {};
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      const [orderIds, warehouseIds] = await Promise.all([
        Order.find({ customerName: rx }).distinct('_id'),
        Warehouse.find({ warehouseName: rx }).distinct('_id')
      ]);
      filter.$or = [{ orderId: { $in: orderIds } }, { warehouseId: { $in: warehouseIds } }];
    }

    const [history, total] = await Promise.all([
      RoutingHistory.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'orderId', populate: { path: 'productId', model: 'Product' } })
        .populate('warehouseId'),
      RoutingHistory.countDocuments(filter)
    ]);

    res.status(200).json({ success: true, data: history, pagination: pageMeta(page, limit, total), message: 'Routing history fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRoutingHistoryById = async (req, res) => {
  try {
    const history = await RoutingHistory.findOne({ orderId: req.params.orderId })
      .populate({
        path: 'orderId',
        populate: {
          path: 'productId',
          model: 'Product'
        }
      })
      .populate('warehouseId');
      
    if (!history) {
      return res.status(404).json({ success: false, message: 'Routing history not found' });
    }
    
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
