const asyncHandler = require("../utils/asyncHandler");
const { listImports } = require("../services/pdfImportService");

const list = asyncHandler(async (req, res) => {
  const data = await listImports(req.user._id, req.query);
  res.json(data);
});

module.exports = { list };
