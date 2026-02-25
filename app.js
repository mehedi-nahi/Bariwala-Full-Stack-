const dotENV = require("dotenv");
dotENV.config({ quiet: true });

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
    max: 100
});
app.use(limiter);

// API endpoint
app.use("/api/v1", router);

app.use(express.static("client"));
app.use("/api/v1/get-file", express.static("uploads"));

module.exports = app;
