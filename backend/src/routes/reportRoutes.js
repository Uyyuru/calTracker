const express = require("express");
const reportController = require("../controllers/reportController");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);
router.get("/weekly", reportController.weekly);
router.get("/macros", reportController.macros);
router.get("/micros", reportController.micros);
router.get("/goals-vs-actual", reportController.goalsVsActual);

module.exports = router;
