# 🛡️ Centralized AI-Powered Application Firewall System

A production-ready, hackathon-grade firewall system with AI anomaly detection, real-time monitoring, and an admin dashboard.

---

## 📁 Folder Structure

```
firewall-system/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js    # Register, login, profile
│   │   ├── adminController.js   # Rules, logs, alerts, stats
│   │   └── dataController.js    # Protected API endpoints
│   ├── middleware/
│   │   ├── firewallEngine.js    # 🔥 Core firewall engine
│   │   ├── auth.js              # JWT + role-based auth
│   │   └── validation.js        # Input validation rules
│   ├── models/
│   │   ├── User.js              # User schema (bcrypt, roles)
│   │   ├── FirewallRule.js      # IP/domain block rules
│   │   ├── RequestLog.js        # Request audit log
│   │   └── Alert.js             # Anomaly detection alerts
│   ├── routes/
│   │   ├── auth.js              # /auth/*
│   │   ├── admin.js             # /admin/*
│   │   └── api.js               # /api/*
│   ├── utils/
│   │   ├── anomalyDetector.js   # 🤖 AI anomaly engine
│   │   ├── jwt.js               # Token generation
│   │   └── response.js          # Standardized responses
│   ├── server.js                # Express entry point
│   ├── .env.example             # Environment variables template
│   └── package.json
├── frontend/
│   └── index.html               # Complete admin dashboard (SPA)
├── scripts/
│   ├── seed.js                  # Database seeder
│   └── simulate-attack.js       # Attack simulation CLI
├── package.json                 # Root scripts
└── README.md
```

---

## 🏗️ System Architecture

```
User/Attacker
     │
     ▼
[Express Server] ─── Helmet (Security Headers)
     │            ─── CORS
     │            ─── Global Rate Limiter (DDoS)
     │
     ▼
[🔥 Firewall Middleware Engine]
     ├── IP Block Check (in-memory cache)
     ├── Domain Block Check (in-memory cache)
     ├── 🤖 Anomaly Detector
     │     ├── Burst Traffic Detection
     │     ├── DDoS Detection
     │     ├── Port Scan Detection
     │     ├── Brute Force Detection
     │     └── Payload Inspection (XSS, SQLi, traversal)
     └── Request Logger (async, non-blocking)
           │
           ▼
      [MongoDB]
           │
     ├── users
     ├── firewallrules
     ├── requestlogs
     └── alerts
           │
           ▼
[JWT Auth Middleware] → [Route Controllers]
           │
           ▼
[Admin Dashboard] ─── Real-time stats
                   ─── Log viewer
                   ─── Alert feed
                   ─── Rule management
                   ─── Attack simulator
```

---

## ⚙️ Installation

### Prerequisites
- Node.js ≥ 16.x
- MongoDB (local or Atlas)

### Step 1: Clone / Download

```bash
cd firewall-system
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Configure Environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/firewall_db
JWT_SECRET=your_super_secret_key_change_me_minimum_32_chars
JWT_EXPIRE=24h
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
ANOMALY_BURST_THRESHOLD=20
ANOMALY_WINDOW_SECONDS=10
ANOMALY_FLAG_THRESHOLD=50
```

### Step 4: Seed the Database

```bash
# From project root
node scripts/seed.js
```

This creates:
- Admin: `admin@firewall.io` / `Admin123`
- User: `user@firewall.io` / `User1234`
- Sample firewall rules (blocked IPs + domains)

---

## 🚀 Running the Project

### Start Backend Server

```bash
cd backend
npm start
# or for development with hot-reload:
npm run dev
```

Server starts at: `http://localhost:5000`

### Open Frontend Dashboard

Simply open `frontend/index.html` in your browser.

Or serve it with a local server:
```bash
npx serve frontend -p 5500
# Then open: http://localhost:5500
```

Login with: `admin@firewall.io` / `Admin123`

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/me` | Current user profile |

### Protected API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data` | Protected data (requires JWT) |
| GET | `/api/public` | Public endpoint (firewall applies) |

### Admin (requires admin JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/block/ip` | Block an IP address |
| POST | `/admin/block/domain` | Block a domain |
| GET | `/admin/rules` | List all firewall rules |
| DELETE | `/admin/rules/:id` | Remove a rule |
| GET | `/admin/logs` | Request logs (with filters) |
| GET | `/admin/alerts` | Anomaly detection alerts |
| PATCH | `/admin/alerts/:id/resolve` | Mark alert resolved |
| GET | `/admin/stats` | Dashboard statistics |
| POST | `/admin/simulate/attack` | Simulate attack (dev only) |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |

---

## 🎯 Demo / Attack Simulation

### Option A: CLI Simulator

```bash
# Run all attack scenarios
node scripts/simulate-attack.js all

# Individual scenarios
node scripts/simulate-attack.js normal   # Normal traffic
node scripts/simulate-attack.js burst    # Burst traffic anomaly
node scripts/simulate-attack.js ddos     # DDoS flood detection
node scripts/simulate-attack.js scan     # Port scanning detection
node scripts/simulate-attack.js brute    # Brute force login
node scripts/simulate-attack.js sqli     # SQL injection detection
node scripts/simulate-attack.js blocked  # Blocked IP test
```

### Option B: Dashboard Simulator

1. Login to dashboard → click **Attack Simulator** in sidebar
2. Click **Burst Traffic**, **DDoS Flood**, or **Brute Force**
3. Watch alerts appear in real-time on the Dashboard

### Option C: Manual curl

```bash
# Normal request
curl http://localhost:5000/api/public

# Blocked IP (add to block list first via dashboard)
curl -H "X-Forwarded-For: 10.10.10.10" http://localhost:5000/api/public

# SQLi payload (auto-detected)
curl "http://localhost:5000/api/data?id=1'+UNION+SELECT+*+FROM+users--"

# Brute force login
for i in {1..6}; do curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@firewall.io","password":"wrong"}'; done
```

---

## 🤖 Anomaly Detection Logic

| Detection Type | Trigger |
|---------------|---------|
| **Burst Traffic** | ≥20 requests from same IP in 10 seconds |
| **DDoS Attempt** | ≥50 requests from same IP in 60 seconds → **auto-blocks IP** |
| **Port Scan** | ≥15 unique endpoints accessed in 30 seconds |
| **Brute Force** | ≥5 failed logins from same IP in 60 seconds |
| **SQL Injection** | Pattern match: `UNION SELECT`, `exec(`, `eval` etc. |
| **XSS Attempt** | `<script>` tags detected in URL |
| **Path Traversal** | `../`, `//`, `etc/passwd` patterns |

All anomalies are:
1. Logged to MongoDB with full metadata
2. Visible in the dashboard alert feed
3. Critical anomalies auto-block the source IP

---

## 🔐 Security Features

- ✅ **JWT Authentication** — RS256 tokens, configurable expiry
- ✅ **Password Hashing** — bcrypt with salt rounds 12
- ✅ **Rate Limiting** — Global + per-route limits
- ✅ **Account Lockout** — 5 failed attempts → 15 min lock
- ✅ **Secure Headers** — Helmet.js (CSP, HSTS, X-Frame, etc.)
- ✅ **Input Validation** — express-validator on all endpoints
- ✅ **Body Size Limit** — 10KB max payload
- ✅ **CORS** — Configurable origins
- ✅ **Role-Based Access** — admin / user separation
- ✅ **Rule Cache** — In-memory cache (30s TTL) for fast rule lookups

---

## 🚢 Deployment

### Render (Backend)
1. Connect GitHub repo to Render
2. Set build command: `cd backend && npm install`
3. Set start command: `cd backend && npm start`
4. Add environment variables from `.env.example`
5. Use MongoDB Atlas for `MONGO_URI`

### Vercel / Netlify (Frontend)
1. Deploy `frontend/` folder
2. Update `API` constant in `frontend/index.html` to your Render URL

### MongoDB Atlas
1. Create free cluster at mongodb.com/atlas
2. Get connection string
3. Set as `MONGO_URI` in environment

---

## 📊 Dashboard Features

| Feature | Description |
|---------|-------------|
| Live Stats | Total/allowed/blocked/anomaly counts (24h) |
| Traffic Chart | Hourly bar chart (allowed vs blocked) |
| Top Blocked IPs | Ranked by block frequency |
| Alert Feed | Real-time anomaly alerts with severity |
| Log Viewer | Filterable, exportable request logs |
| Rule Manager | View/remove active firewall rules |
| Block UI | Add IP/domain blocks with reason & expiry |
| Attack Simulator | One-click attack demos |

---

## ⚡ Hackathon Tips

- The firewall middleware runs **before every route** — no request escapes it
- Cache refreshes every 30s automatically — rule changes apply near-instantly
- Logs use MongoDB TTL index — auto-deleted after 30 days
- Alerts deduplicate within 60s windows — no alert spam
- All responses follow a unified `{ success, data, message, timestamp }` format
