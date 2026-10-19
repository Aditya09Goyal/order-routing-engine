const mongoose = require('mongoose');
const RoutingHistory = require('../models/RoutingHistory');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const routingEngine = require('./routingEngine');
const aiExplanation = require('./aiExplanation');

const MAX_QUANTITY = 1000; // one order can't ask for more than this
const AI_WAIT_MS = 2500;   // longest we make an order wait for the AI explanation

// An error that should become HTTP 400 ("your request is wrong"), not 500 ("our server broke")
const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

exports.processAndRouteOrder = async (input) => {
  // ---- Step 0: validate input BEFORE touching stock ----
  // Before this, quantity -5 passed every check and ADDED 5 units to the warehouse.
  const quantity = Number(input.quantity);
  const customerLat = Number(input.customerLat);
  const customerLng = Number(input.customerLng);
  const { productId } = input;
  const customerName = typeof input.customerName === 'string' ? input.customerName.trim().slice(0, 100) : '';

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw badRequest(`Quantity must be a whole number between 1 and ${MAX_QUANTITY}`);
  }
  if (!Number.isFinite(customerLat) || customerLat < -90 || customerLat > 90) {
    throw badRequest('Customer latitude must be between -90 and 90');
  }
  if (!Number.isFinite(customerLng) || customerLng < -180 || customerLng > 180) {
    throw badRequest('Customer longitude must be between -180 and 180');
  }
  if (!mongoose.isValidObjectId(productId)) {
    throw badRequest('A valid productId is required');
  }

  // Step 1: Query inventory
  const inventories = await Inventory.find({ productId }).populate('warehouseId');
  const product = await Product.findById(productId);
  const productName = product ? product.productName : 'Product';

  // Step 2 & 3: Score and rank warehouses
  const { rankedCandidates, allScores, eliminatedWarehouses, weights } = await routingEngine.selectBestWarehouse(
    inventories,
    quantity,
    customerLat,
    customerLng
  );

  if (rankedCandidates.length === 0) {
    return {
      success: false,
      message: 'No eligible warehouses with sufficient stock found',
      data: { eliminatedWarehouses, weights }
    };
  }

  // Step 4: Reserve inventory ATOMICALLY.
  // One database operation checks "is there still enough stock?" AND takes it, so two orders
  // arriving at the same moment can never both get the same units (no overselling).
  // If another order took the stock first, we simply try the next-best warehouse.
  let selected = null;
  for (const candidate of rankedCandidates) {
    const reserved = await Inventory.findOneAndUpdate(
      { _id: candidate.inv._id, availableQuantity: { $gte: quantity } },
      { $inc: { availableQuantity: -quantity, reservedQuantity: quantity }, $set: { updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (reserved) {
      selected = candidate;
      break;
    }
  }

  if (!selected) {
    return {
      success: false,
      message: 'Stock ran out while placing this order (other orders took it first). Please try again.',
      data: { eliminatedWarehouses, weights }
    };
  }

  const selectedWarehouse = selected.warehouse;
  const finalScore = selected.finalScore;

  // Create Order. If saving it fails, give the reserved stock back so it isn't lost.
  const newOrder = new Order({
    customerName: customerName || 'Guest',
    customerLatitude: customerLat,
    customerLongitude: customerLng,
    productId,
    quantity,
    assignedWarehouseId: selectedWarehouse._id,
    status: 'assigned'
  });
  try {
    await newOrder.save();
  } catch (err) {
    await Inventory.updateOne(
      { _id: selected.inv._id },
      { $inc: { availableQuantity: quantity, reservedQuantity: -quantity } }
    );
    throw err;
  }

  // Step 5: AI explanation — a nice-to-have, so it must never slow the order down.
  // We wait at most AI_WAIT_MS. If Groq is slower (or fails), the customer gets an instant
  // built-in explanation now, and the AI text replaces it in Routing History when it arrives.
  const selectedScoreData = selected.scoreData;
  const rejectedScores = allScores.filter(s => s !== selectedScoreData);
  const aiPromise = aiExplanation.generateExplanation({
    productName,
    selectedWarehouse: selectedWarehouse.warehouseName,
    distance: selectedScoreData.distance_km,
    inventory: selectedScoreData.inventory,
    deliveryDays: selectedScoreData.delivery_days,
    cost: selectedScoreData.cost,
    finalScore,
    distScore: selectedScoreData.distScore,
    invScore: selectedScoreData.invScore,
    delScore: selectedScoreData.delScore,
    costScore: selectedScoreData.costScore,
    weights,
    rejectedWarehouses: rejectedScores
  });

  let timer;
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(null), AI_WAIT_MS); });
  const aiText = await Promise.race([aiPromise, timeout]);
  clearTimeout(timer);

  const aiExplanationText = aiText || aiExplanation.fallbackExplanation({
    selectedWarehouse: selectedWarehouse.warehouseName,
    scoreData: selectedScoreData,
    otherCount: rejectedScores.length
  });

  // Step 6: Save to Routing History
  const routingHistory = new RoutingHistory({
    orderId: newOrder._id,
    warehouseId: selectedWarehouse._id,
    routingScore: finalScore,
    routingReason: aiExplanationText,
    allScores,
    eliminatedWarehouses,
    weights
  });
  await routingHistory.save();

  // AI was too slow: when it finally answers, upgrade the saved explanation in the background.
  if (!aiText) {
    aiPromise
      .then((late) => late && RoutingHistory.updateOne({ _id: routingHistory._id }, { routingReason: late }))
      .catch((err) => console.error('Late AI explanation update failed:', err.message));
  }

  return {
    success: true,
    data: {
      order: newOrder,
      selectedWarehouse,
      routingScore: finalScore,
      routingReason: aiExplanationText,
      allScores,
      eliminatedWarehouses,
      weights
    }
  };
};