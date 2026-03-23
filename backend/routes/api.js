// routes/api.js
const express = require('express');
const router = express.Router();
const { getData, getPublicData } = require('../controllers/dataController');
const { protect } = require('../middleware/auth');

router.get('/data', protect, getData);
router.get('/public', getPublicData);

module.exports = router;
