<<<<<<< HEAD
﻿const express = require("express");
const router = express.Router();
const { blockIP, blockDomain, removeRule, getRules, getLogs, getAlerts, resolveAlert, getStats, simulateAttack } = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");
const { blockIPRules, blockDomainRules, validate } = require("../middleware/validation");

router.use(protect, authorize("admin"));
router.post("/block/ip", blockIPRules, validate, blockIP);
router.post("/block/domain", blockDomainRules, validate, blockDomain);
router.get("/rules", getRules);
router.delete("/rules/:id", removeRule);
router.get("/logs", getLogs);
router.get("/alerts", getAlerts);
router.patch("/alerts/:id/resolve", resolveAlert);
router.get("/stats", getStats);
router.post("/simulate/attack", simulateAttack);
=======
// routes/admin.js
const express = require('express');
const router = express.Router();
const {
  blockIP, blockDomain, removeRule, getRules,
  getLogs, getAlerts, resolveAlert, getStats, simulateAttack,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const { blockIPRules, blockDomainRules, validate } = require('../middleware/validation');

// All admin routes require authentication + admin role
router.use(protect, authorize('admin'));

// Rules
router.post('/block/ip', blockIPRules, validate, blockIP);
router.post('/block/domain', blockDomainRules, validate, blockDomain);
router.get('/rules', getRules);
router.delete('/rules/:id', removeRule);

// Logs
router.get('/logs', getLogs);

// Alerts
router.get('/alerts', getAlerts);
router.patch('/alerts/:id/resolve', resolveAlert);

// Stats
router.get('/stats', getStats);

// Demo simulation (dev only)
router.post('/simulate/attack', simulateAttack);
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5

module.exports = router;
