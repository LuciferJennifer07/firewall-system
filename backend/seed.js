const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb://localhost:27017/firewall_db';

mongoose.connect(MONGO_URI).then(async () => {
  console.log('Connected to MongoDB!');
  const db = mongoose.connection.db;

  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash('Admin123', salt);

  await db.collection('users').updateOne(
    { email: 'admin@firewall.io' },
    { $setOnInsert: { username: 'admin', email: 'admin@firewall.io', password: hash, role: 'admin', isActive: true, createdAt: new Date() }},
    { upsert: true }
  );

  await db.collection('firewallrules').insertMany([
    { type: 'ip_block', value: '10.10.10.10', action: 'block', reason: 'Demo blocked IP', isActive: true, priority: 150, hitCount: 0, createdAt: new Date() },
    { type: 'domain_block', value: 'malicious.com', action: 'block', reason: 'Malware C2', isActive: true, priority: 150, hitCount: 0, createdAt: new Date() },
  ]).catch(() => console.log('Rules already exist, skipping.'));

  console.log('Seeding complete!');
  console.log('Login: admin@firewall.io / Admin123');
  process.exit(0);
}).catch(e => {
  console.error('Failed:', e.message);
  process.exit(1);
});