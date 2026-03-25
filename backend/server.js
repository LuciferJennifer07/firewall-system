require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/database');
const firewallMiddleware = require('./middleware/firewallEngine'); // ✅ fixed import
const { sendError } = require('./utils/response');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Connect Database
connectDB();

// ✅ Security Middlewares
app.use(helmet());
app.use(cors()); // ✅ simplified

// ✅ Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Rate Limiter
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later"
}));

// ✅ Logging (only dev)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// 🔥 Firewall Middleware
app.use(firewallMiddleware);

// ✅ Health Check Route
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// ✅ API Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// ✅ Static Frontend (FIXED PATH)
app.use(express.static(path.join(__dirname, 'frontend')));

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  sendError(res, err.message || "Internal Server Error", 500);
});

// ✅ 404 Handler
app.use((req, res) => {
  sendError(res, "Route not found", 404);
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(🔥 Server running on port ${PORT});
});
✅ middleware/firewallEngine.js
const firewallMiddleware = (req, res, next) => {
  const suspiciousPatterns = [
    "<script>",
    "SELECT *",
    "DROP TABLE",
    "--",
    "INSERT INTO"
  ];

  const requestData = JSON.stringify(req.body) + req.url;

  for (let pattern of suspiciousPatterns) {
    if (requestData.includes(pattern)) {
      return res.status(403).json({
        success: false,
        message: "Blocked by Firewall 🚫"
      });
    }
  }

  next();
};

module.exports = firewallMiddleware;
✅ config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ DB Error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
✅ utils/response.js
const sendError = (res, message, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = { sendError };
✅ routes/auth.js
const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ message: "Auth route working ✅" });
});

module.exports = router;
✅ routes/api.js
const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ message: "API route working ✅" });
});

module.exports = router;
✅ routes/admin.js
const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ message: "Admin route working ✅" });
});

module.exports = router;
✅ .env file (IMPORTANT)
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/firewallDB
NODE_ENV=development
