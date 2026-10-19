const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerLatitude: { type: Number, required: true },
  customerLongitude: { type: Number, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  assignedWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  status: { type: String, enum: ['pending', 'assigned', 'fulfilled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.model('Order', orderSchema);
