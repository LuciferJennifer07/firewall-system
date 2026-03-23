<<<<<<< HEAD
﻿require("dotenv").config({ path: require("path").join(__dirname, "../backend/.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({ username: String, email: String, password: String, role: String, isActive: { type: Boolean, default: true } }, { timestamps: true });
const FirewallRuleSchema = new mongoose.Schema({ type: String, value: String, action: String, reason: String, isActive: { type: Boolean, default: true }, priority: Number, hitCount: { type: Number, default: 0 } }, { timestamps: true });
const User = mongoose.model("User", UserSchema);
const FirewallRule = mongoose.model("FirewallRule", FirewallRuleSchema);

async function seed() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/firewall_db";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB:", uri);

  const existingAdmin = await User.findOne({ email: "admin@firewall.io" });
  if (!existingAdmin) {
    const hashed = await bcrypt.hash("Admin123", 12);
    await User.create({ username: "admin", email: "admin@firewall.io", password: hashed, role: "admin" });
    console.log("Admin created: admin@firewall.io / Admin123");
  } else { console.log("Admin already exists."); }

  const count = await FirewallRule.countDocuments();
  if (count === 0) {
    await FirewallRule.insertMany([
      { type: "ip_block", value: "10.10.10.10", action: "block", reason: "Demo blocked IP", priority: 150 },
      { type: "ip_block", value: "192.0.2.1", action: "block", reason: "Known malicious IP", priority: 150 },
      { type: "domain_block", value: "malicious.com", action: "block", reason: "Malware C2 server", priority: 150 },
      { type: "domain_block", value: "phishing.net", action: "block", reason: "Phishing domain", priority: 150 },
      { type: "ip_allow", value: "127.0.0.1", action: "allow", reason: "Localhost always allowed", priority: 300 },
    ]);
    console.log("Sample firewall rules created.");
  }

  console.log("\nSeeding complete!");
  console.log("Login: admin@firewall.io / Admin123\n");
=======
// scripts/seed.js
// Seeds the database with default admin user and sample firewall rules
// Run: node scripts/seed.js

require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');

// Inline models to avoid import issues
const bcrypt = require('bcryptjs');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/firewall_db';
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB:', uri);
};

const UserSchema = new mongoose.Schema({
  username: String, email: String, password: String, role: String, isActive: { type: Boolean, default: true }
}, { timestamps: true });

const FirewallRuleSchema = new mongoose.Schema({
  type: String, value: String, action: String, reason: String, isActive: { type: Boolean, default: true },
  priority: Number, hitCount: { type: Number, default: 0 }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const FirewallRule = mongoose.model('FirewallRule', FirewallRuleSchema);

async function seed() {
  await connectDB();

  console.log('\n🌱 Seeding database...\n');

  // ── Admin User ──
  const existingAdmin = await User.findOne({ email: 'admin@firewall.io' });
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash('Admin123', salt);
    await User.create({
      username: 'admin',
      email: 'admin@firewall.io',
      password: hashed,
      role: 'admin',
    });
    console.log('👤 Admin created: admin@firewall.io / Admin123');
  } else {
    console.log('👤 Admin already exists, skipping.');
  }

  // ── Demo User ──
  const existingUser = await User.findOne({ email: 'user@firewall.io' });
  if (!existingUser) {
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash('User1234', salt);
    await User.create({
      username: 'demouser',
      email: 'user@firewall.io',
      password: hashed,
      role: 'user',
    });
    console.log('👤 Demo user created: user@firewall.io / User1234');
  }

  // ── Sample Firewall Rules ──
  const ruleCount = await FirewallRule.countDocuments();
  if (ruleCount === 0) {
    await FirewallRule.insertMany([
      { type: 'ip_block', value: '10.10.10.10', action: 'block', reason: 'Demo blocked IP', priority: 150 },
      { type: 'ip_block', value: '192.0.2.1', action: 'block', reason: 'Known malicious IP', priority: 150 },
      { type: 'domain_block', value: 'malicious.com', action: 'block', reason: 'Malware C2 server', priority: 150 },
      { type: 'domain_block', value: 'phishing.net', action: 'block', reason: 'Phishing domain', priority: 150 },
      { type: 'ip_allow', value: '127.0.0.1', action: 'allow', reason: 'Localhost always allowed', priority: 300 },
    ]);
    console.log('📜 Sample firewall rules created (5 rules)');
  } else {
    console.log(`📜 ${ruleCount} rules already exist, skipping.`);
  }

  console.log('\n✅ Seeding complete!\n');
  console.log('Default credentials:');
  console.log('  Admin: admin@firewall.io / Admin123');
  console.log('  User:  user@firewall.io / User1234\n');

>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
  await mongoose.connection.close();
  process.exit(0);
}

<<<<<<< HEAD
seed().catch(err => { console.error("Seed failed:", err.message); process.exit(1); });
=======
seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
