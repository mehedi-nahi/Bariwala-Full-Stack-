const dotENV = require("dotenv");
dotENV.config();

const path          = require("path");
const express       = require("express");
const rateLimit     = require("express-rate-limit");
const helmet        = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const hpp           = require("hpp");
const cors          = require("cors");
const cookieParser  = require("cookie-parser");
const mongoose      = require("mongoose");

const connectDB = require("./src/config/db");
const router    = require("./src/routes/api.js");

const app = express();

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET)
    console.warn("[security] JWT_SECRET is not set – tokens are signed with an insecure fallback secret!");

// Behind Vercel / a reverse proxy: needed so rate limiting sees the real client IP.
app.set("trust proxy", 1);

// Lazy DB connection — connect on first request, reuse cached connection.
// Correct pattern for Vercel serverless (no persistent process).
app.use(async (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        try {
            await connectDB();
        } catch (err) {
            console.error("DB connection error:", err.message);
            return res.status(503).json({ success: false, message: "Database is temporarily unavailable. Please try again shortly." });
        }
    }
    next();
});

app.use(cookieParser());

// Allow Cloudinary images, blob: previews (image upload preview) and Google Fonts.
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            "img-src":    ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
            "style-src":  ["'self'", "https:", "'unsafe-inline'"],
            "font-src":   ["'self'", "https:", "data:"],
            "connect-src": ["'self'"],
        },
    },
}));

// The React build is served by this same server, so cross-origin access is off by default.
// Set CLIENT_ORIGIN (comma separated) only if the client is hosted on a different domain.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
if (allowedOrigins.length) app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// Handlers read req.body unconditionally; make sure it always exists (e.g. a POST with no body).
app.use((req, res, next) => {
    if (req.body === undefined) req.body = {};
    next();
});

// Identity headers are filled in by the auth middlewares from the verified token.
// Drop anything a client tries to send so it can never be spoofed.
app.use((req, res, next) => {
    delete req.headers._id;
    delete req.headers.role;
    delete req.headers.email;
    next();
});

// Sanitising must run AFTER the body has been parsed, otherwise it has nothing to clean.
// Express v5: req.query is read-only, so only the body is sanitised (ids are validated in the controllers).
app.use((req, res, next) => {
    req.body = mongoSanitize.sanitize(req.body, { allowDots: true, replaceWith: "_" });
    next();
});

app.use(hpp());

// Generous general limit: the inbox polls every few seconds, so a normal session makes many small requests.
// Login / register / password change have their own, much stricter limiter in routes/api.js.
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 3000, standardHeaders: true, legacyHeaders: false }));

app.use("/api/v1", router);

// Unknown API routes should answer with JSON, not the React page.
app.use("/api", (req, res) => res.status(404).json({ success: false, message: "API route not found." }));

// Serve React build (works both locally and on Vercel serverless)
const clientDist = path.join(__dirname, "client", "dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
    if (err.isUploadError)
        return res.status(502).json({ success: false, message: err.message });
    if (err.message?.includes("Only image files"))
        return res.status(400).json({ success: false, message: err.message });
    if (err.code === "LIMIT_FILE_SIZE")
        return res.status(400).json({ success: false, message: "File is too large. Maximum allowed size is 8 MB." });
    if (err.code === "LIMIT_UNEXPECTED_FILE")
        return res.status(400).json({ success: false, message: "Too many images. You can upload up to 5 images." });
    if (err.type === "entity.too.large")
        return res.status(413).json({ success: false, message: "Request is too large." });
    if (err instanceof SyntaxError && err.status === 400)
        return res.status(400).json({ success: false, message: "Malformed request body." });
    console.error("Unhandled error:", err.message);
    res.status(500).json({ success: false, message: "Internal server error." });
});

module.exports = app;
