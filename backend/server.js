require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/database');
const { firewallMiddleware } = require('./middleware/firewallEngine');
const { sendError } = require('./utils/response');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Connect DB
connectDB();

// ✅ Security
app.use(helmet());
app.use(cors({ origin: "*" }));

// ✅ Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Rate limiting
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100
}));

// ✅ Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// 🔥 Firewall middleware
app.use(firewallMiddleware);

// ✅ Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// ✅ Static frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error(err.message);
  sendError(res, err.message, 500);
});

// ✅ 404
app.use((req, res) => {
  sendError(res, "Route not found", 404);
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
