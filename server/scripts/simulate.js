process.env.ROAD_DISTANCE = 'off';
const path = require('path');
const root = path.join(__dirname, '..');
let W;
require.cache[require.resolve(path.join(root, 'models/RoutingConfig'))] = { exports: { findOne: async () => W } };
const engine = require(path.join(root, 'services/routingEngine'));
const whs = [
  { warehouseName: 'Mumbai', latitude: 19.0760, longitude: 72.8777, dispatchTime: 12, costPerKm: 5, shipmentSpeed: 220 },
  { warehouseName: 'Delhi', latitude: 28.7041, longitude: 77.1025, dispatchTime: 24, costPerKm: 7, shipmentSpeed: 200 },
  { warehouseName: 'Bangalore', latitude: 12.9716, longitude: 77.5946, dispatchTime: 36, costPerKm: 6, shipmentSpeed: 180 },
  { warehouseName: 'Chennai', latitude: 13.0827, longitude: 80.2707, dispatchTime: 48, costPerKm: 9, shipmentSpeed: 160 },
  { warehouseName: 'Hyderabad', latitude: 17.3850, longitude: 78.4867, dispatchTime: 18, costPerKm: 8, shipmentSpeed: 190 },
].map(w => ({ ...w, activeStatus: true }));
const cities = [[19.07,72.88,20],[28.61,77.21,20],[12.97,77.59,12],[13.08,80.27,10],[17.38,78.49,10],[22.57,88.36,14],[18.52,73.86,8],[23.02,72.57,8],[26.91,75.79,6],[26.85,80.95,6],[21.15,79.09,4],[30.73,76.78,4],[9.93,76.27,4],[25.59,85.14,5],[22.72,75.86,4]];
const tot = cities.reduce((a, c) => a + c[2], 0);
const R = 6371, rad = d => d * Math.PI / 180;
const km = (a, b, c, d) => { const x = Math.sin(rad(c - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2; return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); };
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const cust = () => { let r = rnd() * tot; for (const c of cities) { if ((r -= c[2]) <= 0) return [c[0] + (rnd() - .5) * .8, c[1] + (rnd() - .5) * .8]; } };

async function sim(weights, strategy) {
  W = weights; const T = { cost: 0, days: 0, n: 0, fail: 0, spread: 0 };
  for (let k = 0; k < 200; k++) {
    seed = 5000 + k;
    const inv = whs.map(w => ({ warehouseId: w, availableQuantity: 200 + Math.floor(rnd() * 200), reservedQuantity: 0 }));
    for (let i = 0; i < 300; i++) {
      const [lat, lng] = cust(), q = Math.floor(rnd() * 5) + 1;
      const el = inv.filter(x => x.availableQuantity >= q);
      if (!el.length) { T.fail++; continue; }
      let p;
      if (strategy === 'nearest') p = el.reduce((a, b) => km(lat, lng, a.warehouseId.latitude, a.warehouseId.longitude) <= km(lat, lng, b.warehouseId.latitude, b.warehouseId.longitude) ? a : b);
      else p = (await engine.selectBestWarehouse(inv, q, lat, lng)).selectedInventory;
      const w = p.warehouseId, d = km(lat, lng, w.latitude, w.longitude);
      T.cost += d * w.costPerKm; T.days += d / w.shipmentSpeed + w.dispatchTime / 24; T.n++;
      p.availableQuantity -= q; p.reservedQuantity += q;
    }
    const used = inv.map(x => x.reservedQuantity / (x.reservedQuantity + x.availableQuantity));
    const m = used.reduce((a, b) => a + b) / used.length; T.spread += Math.sqrt(used.reduce((a, b) => a + (b - m) ** 2, 0) / used.length);
  }
  return { cost: T.cost / T.n, days: T.days / T.n, fail: T.fail / 200, spread: T.spread / 200 };
}
(async () => {
  const cfgs = [
    ['nearest (baseline)', null, 'nearest'],
    ['default 35/35/20/10', { distanceWeight: 35, inventoryWeight: 35, deliveryWeight: 20, costWeight: 10 }],
    ['cost-first 10/10/10/70', { distanceWeight: 10, inventoryWeight: 10, deliveryWeight: 10, costWeight: 70 }],
    ['speed-first 10/10/70/10', { distanceWeight: 10, inventoryWeight: 10, deliveryWeight: 70, costWeight: 10 }],
    ['balance-stock 10/70/10/10', { distanceWeight: 10, inventoryWeight: 70, deliveryWeight: 10, costWeight: 10 }],
  ];
  for (const [n, w, s] of cfgs) { const r = await sim(w, s); console.log(n.padEnd(27), `cost ₹${r.cost.toFixed(0)} | days ${r.days.toFixed(2)} | failed/run ${r.fail.toFixed(1)} | stock-use spread ${(r.spread * 100).toFixed(1)}%`); }
})();