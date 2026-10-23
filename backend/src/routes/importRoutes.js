const express = require("express");
const importController = require("../controllers/importController");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);
router.get("/", importController.list);

module.exports = router;
