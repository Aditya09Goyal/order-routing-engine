const RoutingConfig = require('../models/RoutingConfig');

exports.getConfig = async (req, res) => {
  try {
    let config = await RoutingConfig.findOne();
    
    // If no document exists in the DB, instantiate a new one in memory.
    // Mongoose will automatically apply the default values from the schema!
    if (!config) {
      config = new RoutingConfig(); 
    }
    
    return res.status(200).json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateConfig = async (req, res) => {  
  try {
    // Each weight must be a real number from 0 to 100, and together they must add up to 100.
    // Before, only the sum was checked, so 150 + (-50) + 0 + 0 = 100 was accepted
    // and a NEGATIVE weight made the engine prefer the WORST warehouse for that factor.
    const names = ['distanceWeight', 'inventoryWeight', 'deliveryWeight', 'costWeight'];
    const weights = {};
    for (const name of names) {
      const value = Number(req.body[name]);
      if (req.body[name] === undefined || req.body[name] === '' || !Number.isFinite(value) || value < 0 || value > 100) {
        return res.status(400).json({ success: false, message: `${name} must be a number from 0 to 100.` });
      }
      weights[name] = value;
    }

    const sum = names.reduce((total, name) => total + weights[name], 0);
    if (Math.abs(sum - 100) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Weights must sum to exactly 100. Current sum is ${sum}.`
      });
    }
    const { distanceWeight, inventoryWeight, deliveryWeight, costWeight } = weights;

    // Upsert the singleton config
    let config = await RoutingConfig.findOne();
    if (!config) {
      config = new RoutingConfig();
    }

    config.distanceWeight = distanceWeight;
    config.inventoryWeight = inventoryWeight;
    config.deliveryWeight = deliveryWeight;
    config.costWeight = costWeight;
    config.updatedBy = req.user.id; // user id injected by verifyToken middleware
    config.updatedAt = Date.now();

    await config.save();
    
    // Return the updated config with user populated
    const populatedConfig = await RoutingConfig.findById(config._id).populate('updatedBy', 'username');

    res.status(200).json({ success: true, data: populatedConfig, message: 'Configuration updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
