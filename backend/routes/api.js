<<<<<<< HEAD
﻿const express = require("express");
const router = express.Router();
const { getData, getPublicData } = require("../controllers/dataController");
const { protect } = require("../middleware/auth");

router.get("/data", protect, getData);
router.get("/public", getPublicData);
=======
// routes/api.js
const express = require('express');
const router = express.Router();
const { getData, getPublicData } = require('../controllers/dataController');
const { protect } = require('../middleware/auth');

router.get('/data', protect, getData);
router.get('/public', getPublicData);
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5

module.exports = router;
