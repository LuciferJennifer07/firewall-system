<<<<<<< HEAD
﻿const express = require("express");
const router = express.Router();
const { register, login, getProfile, listUsers } = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");
const { registerRules, loginRules, validate } = require("../middleware/validation");

router.post("/register", registerRules, validate, register);
router.post("/login", loginRules, validate, login);
router.get("/me", protect, getProfile);
router.get("/users", protect, authorize("admin"), listUsers);
=======
// routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login, getProfile, listUsers } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { registerRules, loginRules, validate } = require('../middleware/validation');

router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);
router.get('/me', protect, getProfile);
router.get('/users', protect, authorize('admin'), listUsers);
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5

module.exports = router;
