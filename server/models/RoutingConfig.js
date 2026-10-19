const mongoose = require('mongoose');

const routingConfigSchema = new mongoose.Schema({
  distanceWeight: { type: Number, required: true, default: 35, min: 0, max: 100 },
  inventoryWeight: { type: Number, required: true, default: 35, min: 0, max: 100 },
  deliveryWeight: { type: Number, required: true, default: 20, min: 0, max: 100 },
  costWeight: { type: Number, required: true, default: 10, min: 0, max: 100 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RoutingConfig', routingConfigSchema);
