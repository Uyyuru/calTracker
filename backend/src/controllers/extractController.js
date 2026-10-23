const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const Meal = require("../models/mealModel");
const ImportJob = require("../models/ImportJob");
const { extractFromImage } = require("../services/aiService");
const { previewPdf } = require("../services/pdfImportService");
const uploadService = require("../services/uploadService");

const image = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("Image file is required", 400);
  }

  const file = await uploadService.uploadImage(req.user._id, req.file);
  try {
    const data = await extractFromImage(req.file);
    res.json({ ...data, file });
  } catch (error) {
    try {
      await uploadService.destroyIfOwned(req.user._id, file.publicId, file.resourceType);
    } catch (cleanupError) {
      console.error("Could not delete stored image");
    }
    throw error;
  }
});

const pdf = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("PDF file is required", 400);
  }

  const file = await uploadService.uploadPdf(req.user._id, req.file);
  try {
    const data = await previewPdf(req.file);
    await ImportJob.create({
      userId: req.user._id,
      filename: file.originalName || req.file.originalname,
      status: "completed",
      importedCount: data.entries.length,
      publicId: file.publicId,
      resourceType: file.resourceType,
      format: file.format,
      bytes: file.bytes,
    });
    res.json({ ...data, file });
  } catch (error) {
    try {
      await uploadService.destroyIfOwned(req.user._id, file.publicId, file.resourceType);
    } catch (cleanupError) {
      console.error("Could not delete stored PDF");
    }
    throw error;
  }
});

const discard = asyncHandler(async (req, res) => {
  const publicId = req.body.publicId;
  const resourceType = req.body.resourceType || "image";
  uploadService.assertOwned(req.user._id, publicId);

  const [meal, job] = await Promise.all([
    Meal.findOne({ userId: req.user._id, imagePublicId: publicId }),
    ImportJob.findOne({ userId: req.user._id, publicId }),
  ]);
  if (meal || job) {
    throw new AppError("File is already saved", 409);
  }

  await uploadService.destroyIfOwned(req.user._id, publicId, resourceType);
  res.json({ message: "File removed" });
});

module.exports = { image, pdf, discard };
