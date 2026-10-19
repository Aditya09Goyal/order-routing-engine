require('dotenv').config();
if (process.env.DNS_SERVERS) {
  require('dns').setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean));
}
// Refuse to start without a real JWT secret (before, a public fallback text was used,
// so anyone could forge an admin login token if the env var was missing)
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is missing or shorter than 32 characters. Set it in server/.env (and on Render).');
  process.exit(1);
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes will go here
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/warehouses', require('./routes/warehouseRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/routing', require('./routes/routingRoutes'));
app.use('/api/config', require('./routes/configRoutes'));

const cron = require('node-cron');
const { runAutoOrder } = require('./services/orderGenerator');

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  tls: true,
  // tlsAllowInvalidCertificates: true
})
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      if (process.env.ENABLE_AUTO_ORDERS === 'true') {
        cron.schedule('*/30 * * * * *', runAutoOrder);
        console.log('Auto-order cron job started (every 30 seconds)');
      }
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });
