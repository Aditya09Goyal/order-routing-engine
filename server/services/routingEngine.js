const RoutingConfig = require('../models/RoutingConfig');
const { getRoadDistances } = require('./roadDistance');

exports.selectBestWarehouse = async (inventories, quantity, customerLat, customerLng) => {
  let bestScore = -1;
  let selectedWarehouse = null;
  let selectedInventory = null;
  const allScores = [];
  const eliminatedWarehouses = [];
  const rankedCandidates = []; // every eligible warehouse with its score, best first

  let config = await RoutingConfig.findOne();
  if (!config) {
    config = new RoutingConfig();
  }

  const wDist = config.distanceWeight / 100;
  const wInv = config.inventoryWeight / 100;
  const wDel = config.deliveryWeight / 100;
  const wCost = config.costWeight / 100;

  const eligibleInventories = [];

  for (const inv of inventories) {
    const warehouse = inv.warehouseId;
    if (!warehouse) continue;

    if (warehouse.activeStatus !== true || inv.availableQuantity < quantity) {
      eliminatedWarehouses.push({
        warehouseName: warehouse.warehouseName,
        availableQuantity: inv.availableQuantity,
        reason: warehouse.activeStatus !== true ? 'Inactive' : 'Insufficient stock'
      });
      continue;
    }

    eligibleInventories.push(inv);
  }

  if (eligibleInventories.length === 0) {
    return {
      selectedWarehouse: null,
      finalScore: 0,
      rankedCandidates: [], // empty list (not undefined) so callers can safely check .length
      allScores: [],
      eliminatedWarehouses,
      selectedInventory: null,
      weights: {
        distanceWeight: config.distanceWeight,
        inventoryWeight: config.inventoryWeight,
        deliveryWeight: config.deliveryWeight,
        costWeight: config.costWeight
      }
    };
  }

  const rawScores = [];
  let minRawDist = Infinity, maxRawDist = -Infinity;
  let minRawInv  = Infinity, maxRawInv  = -Infinity;
  let minRawDel  = Infinity, maxRawDel  = -Infinity;
  let minRawCost = Infinity, maxRawCost = -Infinity;

  // One OSRM call returns road distances from the customer to every eligible warehouse
  const roads = await getRoadDistances(customerLat, customerLng, eligibleInventories.map((inv) => inv.warehouseId));

  for (const [idx, inv] of eligibleInventories.entries()) {
    const warehouse = inv.warehouseId;
    const road = roads[idx];
    const distance_km = road.km;

    // Raw Distance Score — closer is better
    const rawDistScore = 1 / (1 + distance_km);

    // Raw Inventory Score — more units on the shelf is better.
    // Before, this was available / (available + reserved), a RATIO. A nearly empty warehouse
    // (2 units, none reserved) scored 1.0 and beat a full one (900 units, 100 reserved = 0.9).
    // Now we use the absolute stock; min-max normalization below scales it against the other candidates.
    const rawInvScore = inv.availableQuantity;

    // Raw Delivery Score — uses per-warehouse shipment speed + dispatch time
    // delivery_days = transit days + dispatch overhead (in days)
    const dispatchTime  = warehouse.dispatchTime  ?? 24;   // hours, fallback for old docs
    const shipmentSpeed = warehouse.shipmentSpeed ?? 200;  // km/day, fallback for old docs
    const transitDays   = distance_km / shipmentSpeed;
    const dispatchDays  = dispatchTime / 24;
    const delivery_days = transitDays + dispatchDays;
    const rawDelScore   = 1 / (delivery_days > 0 ? delivery_days : 0.001);

    // Raw Cost Score — uses per-warehouse cost rate
    const costPerKm  = warehouse.costPerKm ?? 5;           // ₹/km, fallback for old docs
    const cost        = distance_km * costPerKm;
    const rawCostScore = 1 / (1 + cost);

    // Track min/max for normalization
    minRawDist = Math.min(minRawDist, rawDistScore);
    maxRawDist = Math.max(maxRawDist, rawDistScore);
    minRawInv  = Math.min(minRawInv,  rawInvScore);
    maxRawInv  = Math.max(maxRawInv,  rawInvScore);
    minRawDel  = Math.min(minRawDel,  rawDelScore);
    maxRawDel  = Math.max(maxRawDel,  rawDelScore);
    minRawCost = Math.min(minRawCost, rawCostScore);
    maxRawCost = Math.max(maxRawCost, rawCostScore);

    rawScores.push({
      warehouse, inv,
      distance_km, delivery_days, cost, dispatchTime, shipmentSpeed, costPerKm, road,
      rawDistScore, rawInvScore, rawDelScore, rawCostScore
    });
  }

  for (const item of rawScores) {
    const {
      warehouse, inv,
      distance_km, delivery_days, cost, dispatchTime, shipmentSpeed, costPerKm, road,
      rawDistScore, rawInvScore, rawDelScore, rawCostScore
    } = item;

    // Min-Max Normalization — if all candidates tie on a factor, everyone gets 1
    const distScore = maxRawDist === minRawDist ? 1 : (rawDistScore - minRawDist) / (maxRawDist - minRawDist);
    const invScore  = maxRawInv  === minRawInv  ? 1 : (rawInvScore  - minRawInv)  / (maxRawInv  - minRawInv);
    const delScore  = maxRawDel  === minRawDel  ? 1 : (rawDelScore  - minRawDel)  / (maxRawDel  - minRawDel);
    const costScore = maxRawCost === minRawCost ? 1 : (rawCostScore - minRawCost) / (maxRawCost - minRawCost);

    // Weighted Final Score
    const finalScore = (wDist * distScore) + (wInv * invScore) + (wDel * delScore) + (wCost * costScore);

    const scoreData = {
      warehouseId: String(warehouse._id), // identify by ID: two warehouses can share a name
      warehouseName: warehouse.warehouseName,
      distance_km,
      straightLineKm: road.straightKm,
      distanceSource: road.source,
      delivery_days,
      dispatchTime,
      shipmentSpeed,
      cost,
      costPerKm,
      distScore,
      invScore,
      delScore,
      costScore,
      distWeighted:  wDist * distScore,
      invWeighted:   wInv  * invScore,
      delWeighted:   wDel  * delScore,
      costWeighted:  wCost * costScore,
      finalScore,
      inventory: inv.availableQuantity
    };
    allScores.push(scoreData);
    rankedCandidates.push({ warehouse, inv, finalScore, scoreData }); // keep the score row with its warehouse

    if (finalScore > bestScore) {
      bestScore = finalScore;
      selectedWarehouse = warehouse;
      selectedInventory = inv;
    }
  }
  rankedCandidates.sort((a, b) => b.finalScore - a.finalScore);
  return {
    selectedWarehouse,
    finalScore: bestScore,
    rankedCandidates,
    allScores,
    eliminatedWarehouses,
    selectedInventory,
    weights: {
      distanceWeight: config.distanceWeight,
      inventoryWeight: config.inventoryWeight,
      deliveryWeight: config.deliveryWeight,
      costWeight: config.costWeight
    }
  };
};