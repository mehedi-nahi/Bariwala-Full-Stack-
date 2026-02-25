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

const uploadFile = multer({
    storage: fileStorageEngine,
    limits: {
        fileSize: 8 * 1024 * 1024  // 8 MB
    },
    fileFilter: (req, file, cb) => {
        cb(null, true);
    }
});

module.exports = uploadFile;

