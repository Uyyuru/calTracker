const path = require("path");
const multer = require("multer");
const AppError = require("../utils/AppError");

const storage = multer.memoryStorage();

const extension = (file) => path.extname(file.originalname || "").toLowerCase();

const imageUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = new Set([".jpg", ".jpeg", ".png", ".webp"]);
    const mimeOk = ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.mimetype);
    if (!mimeOk || !allowed.has(extension(file))) {
      return cb(new AppError("Only JPEG, PNG, and WebP images are allowed", 400));
    }
    cb(null, true);
  },
});

const pdfUpload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf" || extension(file) !== ".pdf") {
      return cb(new AppError("Only PDF files are allowed", 400));
    }
    cb(null, true);
  },
});

const asMiddleware = (uploader) => (req, res, next) => {
  uploader(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new AppError("File is too large", 400));
      return;
    }
    next(error);
  });
};

module.exports = {
  imageUpload: asMiddleware(imageUpload.single("image")),
  pdfUpload: asMiddleware(pdfUpload.single("file")),
};
