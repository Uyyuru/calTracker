const express = require("express");
const chatController = require("../controllers/chatController");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);
router.post("/", chatController.create);
router.get("/", chatController.list);
router.get("/:id/messages", chatController.listMessages);
router.post("/:id/messages", chatController.send);

module.exports = router;
