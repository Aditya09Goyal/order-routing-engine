const Warehouse = require('../models/Warehouse');

// Only these fields can be set from a request (anything else in the body is ignored).
// Empty form fields ('') are skipped so they don't overwrite values with nothing.
const FIELDS = ['warehouseName', 'city', 'latitude', 'longitude', 'capacity', 'activeStatus', 'dispatchTime', 'costPerKm', 'shipmentSpeed'];
const pickFields = (body = {}) =>
  Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined && body[k] !== '').map((k) => [k, body[k]]));

exports.createWarehouse = async (req, res) => {
  try {
    const warehouse = new Warehouse(pickFields(req.body));
    await warehouse.save();
    res.status(201).json({ success: true, data: warehouse, message: 'Warehouse created' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find();
    res.status(200).json({ success: true, data: warehouses, message: 'Warehouses fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWarehouseById = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });
    res.status(200).json({ success: true, data: warehouse, message: 'Warehouse fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, pickFields(req.body), { returnDocument: 'after', runValidators: true });
    if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });
    res.status(200).json({ success: true, data: warehouse, message: 'Warehouse updated' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};