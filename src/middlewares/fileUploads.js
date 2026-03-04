const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary SDK with environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage engine — files go to the "bariwala" folder on Cloudinary CDN
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "bariwala",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        transformation: [{ quality: "auto", fetch_format: "auto" }],
    },
});

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

const uploadFile = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return cb(new Error("Only image files (jpg, jpeg, png, webp, gif) are allowed."), false);
        }
        cb(null, true);
    },
});

module.exports = uploadFile;
