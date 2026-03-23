#!/usr/bin/env node
// scripts/simulate-attack.js
// 🎯 Demo simulation script — run AFTER the server is started
// Usage: node scripts/simulate-attack.js [type]
// Types: normal | burst | ddos | scan | brute | sqli | all

const http = require('http');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const TARGET_IP_HEADER = '10.0.0.99'; // Simulated attacker IP via header

// ── Helpers ──────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const request = (path, method = 'GET', body = null, headers = {}) => {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': TARGET_IP_HEADER,
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });

    req.on('error', () => resolve({ status: 0, body: { error: 'Connection failed' } }));

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

const log = (label, status, msg) => {
  const icon = status >= 200 && status < 300 ? '✅' : status === 403 ? '🚫' : status === 429 ? '⚠️' : '❌';
  console.log(`  ${icon} [${status}] ${label}: ${msg}`);
};

// ── Simulations ───────────────────────────────────────────

async function simulateNormal() {
  console.log('\n📗 SCENARIO 1: Normal Traffic');
  console.log('─'.repeat(50));
  const paths = ['/api/public', '/health', '/api/public', '/health'];
  for (const p of paths) {
    const res = await request(p);
    log('Normal request', res.status, `GET ${p}`);
    await sleep(300);
  }
}

async function simulateBurst() {
  console.log('\n📙 SCENARIO 2: Burst Traffic (Anomaly Detection)');
  console.log('─'.repeat(50));
  console.log('  Sending 25 rapid requests...');
  let blocked = 0;
  for (let i = 0; i < 25; i++) {
    const res = await request('/api/public');
    if (res.status === 403) blocked++;
    process.stdout.write(res.status === 403 ? '🚫' : '.');
  }
  console.log(`\n  Result: ${blocked} blocked, ${25 - blocked} allowed`);
}

async function simulateDDoS() {
  console.log('\n📕 SCENARIO 3: DDoS Simulation (Mass Flood)');
  console.log('─'.repeat(50));
  console.log('  Flooding with 60 rapid requests...');
  let blocked = 0, anomalies = 0;
  const promises = Array.from({ length: 60 }, (_, i) =>
    request('/api/public', 'GET', null, { 'X-Forwarded-For': `10.0.${Math.floor(i/20)}.${i}` })
  );
  const results = await Promise.all(promises);
  results.forEach(r => {
    if (r.status === 403) blocked++;
    if (r.body?.reason?.includes('anomaly') || r.body?.reason?.includes('DDoS')) anomalies++;
  });
  console.log(`  Result: ${blocked} blocked, ${anomalies} anomaly detections`);
}

async function simulatePortScan() {
  console.log('\n🔍 SCENARIO 4: Port Scan / Endpoint Probing');
  console.log('─'.repeat(50));
  const endpoints = Array.from({ length: 20 }, (_, i) => `/api/endpoint-${i}`);
  let detected = 0;
  for (const ep of endpoints) {
    const res = await request(ep, 'GET', null, { 'X-Forwarded-For': '192.168.1.50' });
    if (res.status === 403) detected++;
    process.stdout.write(res.status === 403 ? '🚫' : '.');
    await sleep(50);
  }
  console.log(`\n  Result: Scan detected after probing 20 endpoints (${detected} blocked)`);
}

async function simulateBruteForce() {
  console.log('\n🔑 SCENARIO 5: Brute Force Login Attack');
  console.log('─'.repeat(50));
  const attempts = [
    { email: 'admin@test.com', password: 'wrong1' },
    { email: 'admin@test.com', password: 'wrong2' },
    { email: 'admin@test.com', password: 'wrong3' },
    { email: 'admin@test.com', password: 'wrong4' },
    { email: 'admin@test.com', password: 'wrong5' },
  ];
  for (let i = 0; i < attempts.length; i++) {
    const res = await request('/auth/login', 'POST', attempts[i], { 'X-Forwarded-For': '172.16.0.10' });
    log(`Attempt ${i + 1}`, res.status, res.body?.message || 'failed');
    await sleep(200);
  }
  console.log('  → Brute force alert generated after 5 failed attempts');
}

async function simulateSQLInjection() {
  console.log('\n💉 SCENARIO 6: SQL Injection Payload Detection');
  console.log('─'.repeat(50));
  const payloads = [
    "/api/data?id=1' UNION SELECT * FROM users--",
    '/api/data?name=<script>alert(1)</script>',
    '/api/data/../../../etc/passwd',
    '/api/data?cmd=exec(rm -rf /)',
  ];
  for (const payload of payloads) {
    const res = await request(payload, 'GET', null, { 'X-Forwarded-For': '203.0.113.42' });
    log('Injection attempt', res.status, payload.substring(0, 50));
    await sleep(300);
  }
}

async function simulateBlockedIP() {
  console.log('\n🚫 SCENARIO 7: Blocked IP Traffic');
  console.log('─'.repeat(50));
  console.log('  (Requires an IP to be blocked via the dashboard first)');
  console.log('  Sending request from blocked IP 10.10.10.10...');
  const res = await request('/api/public', 'GET', null, { 'X-Forwarded-For': '10.10.10.10' });
  log('Blocked IP request', res.status, res.body?.message || res.body?.reason || 'request made');
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  const type = process.argv[2] || 'all';

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  🎯 FIREWALL ATTACK SIMULATOR            ║');
  console.log(`║  Target: ${BASE_URL.padEnd(32)}║`);
  console.log(`║  Mode: ${type.padEnd(34)}║`);
  console.log('╚══════════════════════════════════════════╝');

  // Check server is up
  const health = await request('/health');
  if (health.status !== 200) {
    console.error('\n❌ Server is not running. Start with: cd backend && npm start');
    process.exit(1);
  }
  console.log('\n✅ Server is online. Starting simulation...');

  const scenarios = {
    normal: simulateNormal,
    burst: simulateBurst,
    ddos: simulateDDoS,
    scan: simulatePortScan,
    brute: simulateBruteForce,
    sqli: simulateSQLInjection,
    blocked: simulateBlockedIP,
  };

  if (type === 'all') {
    for (const [name, fn] of Object.entries(scenarios)) {
      await fn();
      await sleep(1000);
    }
  } else if (scenarios[type]) {
    await scenarios[type]();
  } else {
    console.error(`Unknown type: ${type}. Valid: ${Object.keys(scenarios).join(', ')}, all`);
  }

  console.log('\n\n📊 Simulation complete! Check the dashboard for results.');
  console.log('   Dashboard: http://localhost:5500 or open frontend/index.html\n');
}

main().catch(console.error);
