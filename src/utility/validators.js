const mongoose = require("mongoose");

exports.isId = (v) => typeof v === "string" && mongoose.Types.ObjectId.isValid(v);

// Escape user text before it is used inside a RegExp (prevents regex injection / ReDoS).
exports.escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Parse an integer query param and clamp it to [min, max].
exports.clampInt = (value, fallback, min, max) => {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(Math.max(n, min), max);
};

exports.EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
exports.PHONE_RE = /^01[3-9][0-9]{8}$/;
