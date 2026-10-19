const mongoose = require('mongoose');

const routingHistorySchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  routingScore: { type: Number },
  routingReason: { type: String },
  allScores: [{ type: mongoose.Schema.Types.Mixed }],
  eliminatedWarehouses: [{ type: mongoose.Schema.Types.Mixed }],
  weights: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

routingHistorySchema.index({ createdAt: -1 });
routingHistorySchema.index({ orderId: 1 });
module.exports = mongoose.model('RoutingHistory', routingHistorySchema);
