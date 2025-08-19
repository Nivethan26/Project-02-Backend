// routes/consultationRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth");
const consultationController = require("../controllers/consultationController");

router.post("/confirmation", protect, consultationController.bookConsultation);
router.get("/user", protect, consultationController.getUserConsultations);
// Admin route to list all consultation bookings
router.get("/admin/all", protect, consultationController.getAllConsultations);

module.exports = router;
