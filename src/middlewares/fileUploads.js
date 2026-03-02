const multer = require("multer");

const fileStorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const sanitizedFilename = file.originalname.replace(/\s+/g, "");
        cb(null, "bariwala-" + Date.now() + "-" + sanitizedFilename);
    }
});

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

const uploadFile = multer({
    storage: fileStorageEngine,
    limits: {
        fileSize: 8 * 1024 * 1024  // 8 MB
    },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return cb(new Error("Only image files (jpg, jpeg, png, webp, gif) are allowed."), false);
        }
        cb(null, true);
    }
});

module.exports = uploadFile;

