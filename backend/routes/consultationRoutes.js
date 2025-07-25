// routes/consultationRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth");
const consultationController = require("../controllers/consultationController");

router.post("/confirmation", protect, consultationController.bookConsultation);
router.get("/user", protect, consultationController.getUserConsultations);

module.exports = router;
