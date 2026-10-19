// Promote an existing user to admin (run by the system owner, never from the website).
// Usage, from the server folder:   node scripts/make-admin.js <username>
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
if (process.env.DNS_SERVERS) {
  require('dns').setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean));
}
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  const username = process.argv[2];
  if (!username) {
    console.log('Usage: node scripts/make-admin.js <username>');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 30000 });
  const user = await User.findOneAndUpdate({ username }, { role: 'admin' }, { returnDocument: 'after' });
  console.log(user ? `OK: "${user.username}" is now ${user.role}. Log out and log in again.` : `No user named "${username}" was found.`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
