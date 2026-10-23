const express = require("express");
const extractController = require("../controllers/extractController");
const auth = require("../middleware/auth");
const { imageUpload, pdfUpload } = require("../middleware/upload");

const router = express.Router();

router.use(auth);
router.post("/image", imageUpload, extractController.image);
router.post("/pdf", pdfUpload, extractController.pdf);
router.post("/discard", extractController.discard);

module.exports = router;
