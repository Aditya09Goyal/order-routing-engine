// RACE TEST — can two orders buy the same stock at the same moment?
// Creates a fake product with 5 units, fires 20 orders AT THE SAME TIME.
//   FAIL = more than 5 orders succeed (overselling)
//   PASS = exactly 5 succeed, stock never goes below 0
// Run from the server folder:  node scripts/race-test.js
// Uses a temporary in-memory MongoDB, so your real data is never touched.

process.env.ROAD_DISTANCE = 'off'; // no map API calls
delete process.env.GROQ_API_KEY;   // no AI calls

const mongoose = require('mongoose');
const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Order = require('../models/Order');
const orderService = require('../services/orderService');

const STOCK = 5;
const ORDERS = 20;

async function main() {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri(), { dbName: 'race_test' });

  const warehouse = await Warehouse.create({
    warehouseName: 'Test WH', city: 'Ranchi', latitude: 23.34, longitude: 85.31, capacity: 1000,
  });
  const product = await Product.create({ productName: 'Test item', category: 'test', sku: 'RACE-1' });
  await Inventory.create({ warehouseId: warehouse._id, productId: product._id, availableQuantity: STOCK });

  console.log(`Stock: ${STOCK} units. Firing ${ORDERS} orders at the same time...`);
  const results = await Promise.allSettled(
    Array.from({ length: ORDERS }, (_, i) =>
      orderService.processAndRouteOrder({
        customerLat: 23.3, customerLng: 85.3, productId: product._id, quantity: 1, customerName: `buyer-${i}`,
      })
    )
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
  const inv = await Inventory.findOne({ productId: product._id });

  console.log(`Orders that succeeded : ${succeeded}`);
  console.log(`Stock left            : available ${inv.availableQuantity}, reserved ${inv.reservedQuantity}`);
  console.log(succeeded === STOCK && inv.availableQuantity === 0 && inv.reservedQuantity === STOCK
    ? '✅ PASS — no overselling'
    : `❌ FAIL — ${succeeded} orders accepted for only ${STOCK} units (overselling)`);

  await mongoose.disconnect();
  await memoryServer.stop();
}

main().catch((e) => { console.error(e); process.exit(1); });