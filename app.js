const dotENV = require("dotenv");
dotENV.config();

const path           = require("path");
const express        = require("express");
const rateLimit      = require("express-rate-limit");
const helmet         = require("helmet");
const mongoSanitize  = require("express-mongo-sanitize");
const hpp            = require("hpp");
const cors           = require("cors");
const cookieParser   = require("cookie-parser");

const connectDB = require("./src/config/db");
const router    = require("./src/routes/api.js");

const app = express();

// Database Connection
connectDB();

app.use(cookieParser());
app.use(helmet());
// express-mongo-sanitize tries to overwrite req.query which is read-only in Express v5
// Manually sanitize only body and params
const mongoSanitizeMiddleware = (req, res, next) => {
    const opts = { allowDots: true, replaceWith: '_' };
    if (req.body)   req.body   = mongoSanitize.sanitize(req.body,   opts);
    if (req.params) req.params = mongoSanitize.sanitize(req.params, opts);
    next();
};
app.use(mongoSanitizeMiddleware);
app.use(hpp());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500
});
app.use(limiter);

// API endpoint
app.use("/api/v1", router);

// ── Static uploads (images) — must come BEFORE the SPA catch-all ──
app.use("/api/v1/get-file", express.static(path.join(__dirname, "uploads")));

// ── Serve React build (production) ──
const clientDist = path.join(__dirname, "client", "dist");
app.use(express.static(clientDist));

// ── SPA fallback — send index.html for any non-API route so React Router works ──
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
});

// ─── Global Error Handler ───────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    // Multer file type / size errors
    if (err.message && err.message.includes("Only image files")) {
        return res.status(400).json({ success: false, message: err.message });
    }
    if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "File is too large. Maximum allowed size is 8 MB." });
    }
    console.error("⚠️  Unhandled error:", err.message);
    res.status(500).json({ success: false, message: "Internal server error." });
});

module.exports = app;
