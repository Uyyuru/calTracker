const AppError = require("../utils/AppError");
const { configureCloudinary } = require("../config/cloudinary");

const folderFor = (userId, kind) => `calorie-tracker/${String(userId)}/${kind}`;

const assertOwned = (userId, publicId) => {
  const prefix = `calorie-tracker/${String(userId)}/`;
  if (!publicId || !String(publicId).startsWith(prefix)) {
    throw new AppError("File not found", 404);
  }
};

const signedUrl = (publicId, resourceType) => {
  const cloudinary = configureCloudinary();
  return cloudinary.url(publicId, {
    resource_type: resourceType || "image",
    type: "authenticated",
    sign_url: true,
    secure: true,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  });
};

const uploadBuffer = ({ userId, file, kind, resourceType }) => {
  const cloudinary = configureCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folderFor(userId, kind),
        resource_type: resourceType,
        type: "authenticated",
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(new AppError("File upload failed", 502));
          return;
        }
        resolve({
          secureUrl: signedUrl(result.public_id, result.resource_type),
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format || "",
          bytes: result.bytes || file.size || 0,
          originalName: file.originalname,
        });
      }
    );
    stream.end(file.buffer);
  });
};

const uploadImage = (userId, file) =>
  uploadBuffer({ userId, file, kind: "images", resourceType: "image" });

const uploadPdf = (userId, file) =>
  uploadBuffer({ userId, file, kind: "pdfs", resourceType: "raw" });

const destroyAsset = async (publicId, resourceType) => {
  const cloudinary = configureCloudinary();
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType || "image",
    type: "authenticated",
    invalidate: true,
  });
};

const destroyIfOwned = async (userId, publicId, resourceType) => {
  if (!publicId) {
    return;
  }
  assertOwned(userId, publicId);
  await destroyAsset(publicId, resourceType);
};

module.exports = {
  assertOwned,
  signedUrl,
  uploadImage,
  uploadPdf,
  destroyIfOwned,
};
