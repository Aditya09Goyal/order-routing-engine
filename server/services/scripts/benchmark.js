process.env.ROAD_DISTANCE = 'off';
const S = require('path').join(__dirname, '..') + '/';
process.env.JWT_SECRET = 'bench'; delete process.env.GROQ_API_KEY;
const r = (p) => require(S + p);
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose'), express = require('express');
(async () => {
  const m = await MongoMemoryServer.create(); await mongoose.connect(m.getUri());
  const [Warehouse, Product, Inventory, User, RoutingConfig] = ['Warehouse', 'Product', 'Inventory', 'User', 'RoutingConfig'].map(x => r('models/' + x));
  await new User({ username: 'admin', password: 'admin123', role: 'admin' }).save();
  await new RoutingConfig({ distanceWeight: 35, inventoryWeight: 35, deliveryWeight: 20, costWeight: 10 }).save();
  const ws = await Warehouse.insertMany([
    ['Mumbai', 19.076, 72.8777, 12, 5, 220], ['Delhi', 28.7041, 77.1025, 24, 7, 200], ['Bangalore', 12.9716, 77.5946, 36, 6, 180], ['Chennai', 13.0827, 80.2707, 48, 9, 160], ['Hyderabad', 17.385, 78.4867, 18, 8, 190]
  ].map(([c, la, lo, dt, cpk, sp]) => ({ warehouseName: c + ' Hub', city: c, latitude: la, longitude: lo, capacity: 10000, activeStatus: true, dispatchTime: dt, costPerKm: cpk, shipmentSpeed: sp })));
  const ps = await Product.insertMany([{ productName: 'Laptop', category: 'E', sku: 'A1' }, { productName: 'Phone', category: 'E', sku: 'A2' }, { productName: 'Race', category: 'E', sku: 'A3' }]);
  const inv = [];
  for (const w of ws) for (const p of ps.slice(0, 2)) inv.push({ warehouseId: w._id, productId: p._id, availableQuantity: 100000, reservedQuantity: 0 });
  inv.push({ warehouseId: ws[0]._id, productId: ps[2]._id, availableQuantity: 10, reservedQuantity: 0 });
  await Inventory.insertMany(inv);

  const app = express(); app.use(express.json());
  app.use('/api/auth', r('routes/authRoutes')); app.use('/api/routing', r('routes/routingRoutes'));
  const srv = app.listen(5099); const B = 'http://localhost:5099';
  const lg = await (await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123', role: 'admin' }) })).json();
  const tok = lg.data?.token || lg.token; const H = { 'content-type': 'application/json', authorization: 'Bearer ' + tok };
  const order = (pid, q = 1) => ({ customerName: 'Bench', customerLat: 8.4 + Math.random() * 29, customerLng: 68.7 + Math.random() * 28, productId: pid, quantity: q });
  const call = async (body) => { const t = performance.now(); const res = await fetch(B + '/api/routing/route-order', { method: 'POST', headers: H, body: JSON.stringify(body) }); const j = await res.json(); return [performance.now() - t, j.success]; };
  const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) * p)].toFixed(1); };

  for (let i = 0; i < 20; i++) await call(order(ps[0]._id));
  const seq = []; let okc = 0; for (let i = 0; i < 500; i++) { const [t, ok] = await call(order(ps[i % 2]._id)); seq.push(t); if (ok) okc++; }
  console.log(`sequential 500 orders: ${okc} routed | p50 ${pct(seq, .5)} ms  p95 ${pct(seq, .95)} ms`);

  for (const c of [10, 50]) {
    const t0 = performance.now(), lat = [];
    await Promise.all(Array.from({ length: c }, async () => { for (let i = 0; i < 1000 / c; i++) { const [t] = await call(order(ps[i % 2]._id)); lat.push(t); } }));
    const sec = (performance.now() - t0) / 1000;
    console.log(`concurrency ${c}: 1000 orders in ${sec.toFixed(1)} s = ${(1000 / sec).toFixed(0)} orders/s | p50 ${pct(lat, .5)} ms p95 ${pct(lat, .95)} ms`);
  }

  srv.close(); await mongoose.disconnect(); await m.stop(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });