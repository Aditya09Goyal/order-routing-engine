const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  availableQuantity: { type: Number, required: true, default: 0, min: 0 },
  reservedQuantity: { type: Number, required: true, default: 0, min: 0 },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Inventory', inventorySchema);
