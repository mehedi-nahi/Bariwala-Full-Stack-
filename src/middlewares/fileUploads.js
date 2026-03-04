const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Custom Multer storage — pipes the file buffer directly to Cloudinary v2
const cloudinaryStorage = {
    _handleFile(req, file, cb) {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "bariwala",
                resource_type: "image",
                transformation: [{ quality: "auto", fetch_format: "auto" }],
            },
            (error, result) => {
                if (error) return cb(error);
                cb(null, {
                    path: result.secure_url,
                    filename: result.public_id,
                    size: result.bytes,
                });
            }
        );
        Readable.from(file.stream).pipe(uploadStream);
    },
    _removeFile(_req, file, cb) {
        cloudinary.uploader.destroy(file.filename, cb);
    },
};

const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

const uploadFile = multer({
    storage: cloudinaryStorage,
    limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype))
            return cb(new Error("Only image files (jpg, jpeg, png, webp, gif) are allowed."), false);
        cb(null, true);
    },
});

module.exports = uploadFile;
