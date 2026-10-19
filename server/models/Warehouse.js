const mongoose = require('mongoose');

// Validation lives in the schema, so EVERY way of saving a warehouse is checked.
// Before, shipmentSpeed 0 made delivery time infinite and negative costs were accepted.
const warehouseSchema = new mongoose.Schema({
  warehouseName: { type: String, required: true, trim: true, maxlength: 100 },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  capacity: { type: Number, required: true, min: 1 },
  activeStatus: { type: Boolean, default: true },
  // Logistics attributes — used by the routing engine
  dispatchTime:  { type: Number, default: 24,  min: 0, max: 720 },  // hours before warehouse begins shipping
  costPerKm:     { type: Number, default: 5,   min: 0 },            // ₹ per km shipping rate
  shipmentSpeed: { type: Number, default: 200, min: 1, max: 2000 }, // km per day travel speed (0 would mean "never arrives")
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Warehouse', warehouseSchema);