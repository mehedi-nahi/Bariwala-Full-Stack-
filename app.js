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
// Lazy DB connection — connect on first request, reuse cached connection.
// Correct pattern for Vercel serverless (no persistent process).
app.use(async (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        try {
            await connectDB();
        } catch (err) {
            console.error("DB connection error:", err.message);
            return res.status(503).json({ success: false, message: "Database unavailable. " + err.message });
        }
    }
    next();
});

app.use(cookieParser());
app.use(helmet());

// Express v5: req.query is read-only, so sanitize only body and params
app.use((req, res, next) => {
    const opts = { allowDots: true, replaceWith: "_" };
    if (req.body)   req.body   = mongoSanitize.sanitize(req.body,   opts);
    if (req.params) req.params = mongoSanitize.sanitize(req.params, opts);
    next();
});

app.use(hpp());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

app.use("/api/v1", router);

// Serve React build in local production (not needed on Vercel — CDN handles it)
if (process.env.NODE_ENV !== "production") {
    const clientDist = path.join(__dirname, "client", "dist");
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path.join(clientDist, "index.html"));
    });
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
    if (err.message?.includes("Only image files"))
        return res.status(400).json({ success: false, message: err.message });
    if (err.code === "LIMIT_FILE_SIZE")
        return res.status(400).json({ success: false, message: "File is too large. Maximum allowed size is 8 MB." });
    console.error("Unhandled error:", err.message);
    res.status(500).json({ success: false, message: "Internal server error." });
});

module.exports = app;
