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

exports.getRoutingHistory = async (req, res) => {
  try {
    const history = await RoutingHistory.find()
      .populate({
        path: 'orderId',
        populate: {
          path: 'productId',
          model: 'Product'
        }
      })
      .populate('warehouseId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: history, message: 'Routing history fetched' });
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
