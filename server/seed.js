require('dotenv').config({ path: require('path').join(__dirname, '.env') });
// Same DNS workaround as server.js (some networks can't resolve Atlas "mongodb+srv" addresses)
if (process.env.DNS_SERVERS) {
  require('dns').setServers(process.env.DNS_SERVERS.split(',').map((x) => x.trim()).filter(Boolean));
}
const mongoose = require('mongoose');
const crypto = require('crypto');
const Warehouse = require('./models/Warehouse');
const Product = require('./models/Product');
const Inventory = require('./models/Inventory');
const Order = require('./models/Order');
const RoutingHistory = require('./models/RoutingHistory');
const User = require('./models/User');
const RoutingConfig = require('./models/RoutingConfig');

const seedData = async () => {
  try {
    // Connect FIRST and wait. If it fails we stop here with a clear message,
    // instead of letting deleteMany() hang for 10 seconds and time out.
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      tls: true
    });
    console.log('Connected to MongoDB for seeding');

    // Clear existing
    await Warehouse.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});
    await Order.deleteMany({});
    await RoutingHistory.deleteMany({});
    await User.deleteMany({});
    await RoutingConfig.deleteMany({});

    // Users
    // No hard-coded passwords. Use SEED_ADMIN_PASSWORD / SEED_MANAGER_PASSWORD from .env,
    // or a random one is generated and printed once at the end of the seed.
    const randomPassword = () => crypto.randomBytes(9).toString('base64url'); // 12 characters
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || randomPassword();
    const managerPassword = process.env.SEED_MANAGER_PASSWORD || randomPassword();
    const adminUser = new User({ username: 'admin', password: adminPassword, role: 'admin' });
    const managerUser = new User({ username: 'manager', password: managerPassword, role: 'manager' });
    await adminUser.save();
    await managerUser.save();

    // Routing Config
    const defaultConfig = new RoutingConfig({
      distanceWeight: 35,
      inventoryWeight: 35,
      deliveryWeight: 20,
      costWeight: 10,
      updatedBy: adminUser._id
    });
    await defaultConfig.save();

    // Warehouses in Indian Cities
    // Each warehouse has unique logistics characteristics that affect routing decisions
    const warehousesData = [
      {
        warehouseName: 'Mumbai Central Hub',
        city: 'Mumbai',
        latitude: 19.0760, longitude: 72.8777,
        capacity: 10000, activeStatus: true,
        dispatchTime: 12,   // hours — fastest dispatcher
        costPerKm: 5,       // ₹/km — cheapest rate
        shipmentSpeed: 220  // km/day — fastest delivery network
      },
      {
        warehouseName: 'Delhi NCR Depot',
        city: 'Delhi',
        latitude: 28.7041, longitude: 77.1025,
        capacity: 15000, activeStatus: true,
        dispatchTime: 24,   // hours
        costPerKm: 7,       // ₹/km
        shipmentSpeed: 200  // km/day
      },
      {
        warehouseName: 'Bangalore Tech Park Storage',
        city: 'Bangalore',
        latitude: 12.9716, longitude: 77.5946,
        capacity: 12000, activeStatus: true,
        dispatchTime: 36,   // hours — slower to dispatch
        costPerKm: 6,       // ₹/km
        shipmentSpeed: 180  // km/day
      },
      {
        warehouseName: 'Chennai Coastal Warehouse',
        city: 'Chennai',
        latitude: 13.0827, longitude: 80.2707,
        capacity: 8000, activeStatus: true,
        dispatchTime: 48,   // hours — slowest dispatcher
        costPerKm: 9,       // ₹/km — expensive rate
        shipmentSpeed: 160  // km/day — slowest network
      },
      {
        warehouseName: 'Hyderabad Logistics Center',
        city: 'Hyderabad',
        latitude: 17.3850, longitude: 78.4867,
        capacity: 9000, activeStatus: true,
        dispatchTime: 18,   // hours
        costPerKm: 8,       // ₹/km
        shipmentSpeed: 190  // km/day
      },
    ];

    
    const warehouses = await Warehouse.insertMany(warehousesData);

    // Products
    const productsData = [
      { productName: 'Laptop', category: 'Electronics', sku: 'ELEC-LAP-001' },
      { productName: 'Smartphone', category: 'Electronics', sku: 'ELEC-PHO-002' },
      { productName: 'Headphones', category: 'Electronics', sku: 'ELEC-HDP-003' }
    ];

    const products = await Product.insertMany(productsData);

    // Inventory
    const inventoryData = [];
    for (const w of warehouses) {
      for (const p of products) {
        // Random available quantity between 5 and 50
        const randomQty = Math.floor(Math.random() * 46) + 5;
        inventoryData.push({
          warehouseId: w._id,
          productId: p._id,
          availableQuantity: randomQty,
          reservedQuantity: 0
        });
      }
    }

    // Explicitly make some low stock (< 10) to test the badge
    inventoryData[0].availableQuantity = 5;
    inventoryData[1].availableQuantity = 2;
    inventoryData[5].availableQuantity = 8; // some other warehouse

    await Inventory.insertMany(inventoryData);

    console.log('Database seeded successfully!');
    console.log('\n=== Seed logins (save these now; they are not stored anywhere in plain text) ===');
    console.log(`admin   / ${adminPassword}`);
    console.log(`manager / ${managerPassword}\n`);
    process.exit();
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();