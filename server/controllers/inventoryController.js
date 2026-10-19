const Inventory = require('../models/Inventory');

exports.createInventory = async (req, res) => {
  try {
    const inventory = new Inventory(req.body);
    await inventory.save();
    res.status(201).json({ success: true, data: inventory, message: 'Inventory created' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find().populate('warehouseId').populate('productId');
    res.status(200).json({ success: true, data: inventory, message: 'Inventory fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateInventory = async (req, res) => {
  try {
    // Only the available stock can be edited here, and it must be a whole number >= 0.
    // Before, the whole request body was saved (e.g. reservedQuantity, productId could be changed).
    const availableQuantity = Number(req.body.availableQuantity);
    if (!Number.isInteger(availableQuantity) || availableQuantity < 0) {
      return res.status(400).json({ success: false, message: 'availableQuantity must be a whole number of 0 or more' });
    }
    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      { availableQuantity, updatedAt: Date.now() },
      { returnDocument: 'after', runValidators: true }
    );
    if (!inventory) return res.status(404).json({ success: false, message: 'Inventory not found' });
    res.status(200).json({ success: true, data: inventory, message: 'Inventory updated' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
