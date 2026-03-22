require("dotenv").config({ path: require("path").join(__dirname, "../backend/.env") });
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
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch(err => { console.error("Seed failed:", err.message); process.exit(1); });
