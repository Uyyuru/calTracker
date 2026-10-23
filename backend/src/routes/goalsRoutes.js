const express = require("express");
const goalsController = require("../controllers/goalsController");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);
router.get("/", goalsController.getMyGoals);
router.put("/", goalsController.updateMyGoals);

module.exports = router;
