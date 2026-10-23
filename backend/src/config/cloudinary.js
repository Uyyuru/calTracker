const cloudinary = require("cloudinary").v2;
const AppError = require("../utils/AppError");

let configured = false;

const configureCloudinary = () => {
  if (configured) {
    return cloudinary;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError("Cloudinary is not configured", 500);
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configured = true;
  return cloudinary;
};

module.exports = { configureCloudinary };
