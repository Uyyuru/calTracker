const express = require("express");
const mealController = require("../controllers/mealController");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);
router.post("/", mealController.create);
router.get("/", mealController.list);
router.get("/:id", mealController.getOne);
router.patch("/:id", mealController.update);
router.delete("/:id", mealController.remove);

module.exports = router;


