const express = require("express");
const router = express.Router();
const { register, login, getProfile, listUsers } = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");
const { registerRules, loginRules, validate } = require("../middleware/validation");

router.post("/register", registerRules, validate, register);
router.post("/login", loginRules, validate, login);
router.get("/me", protect, getProfile);
router.get("/users", protect, authorize("admin"), listUsers);

module.exports = router;
