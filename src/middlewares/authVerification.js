const { DecodeToken } = require("../utility/tokenUtility");
const userModel       = require("../models/userModel");

const authVerification = async (req, res, next) => {
    // Support cookie token OR Authorization: Bearer <token> header (useful for Postman)
    let token = req.cookies["token"];
    if (!token && req.headers["authorization"]) {
        const parts = req.headers["authorization"].split(" ");
        if (parts.length === 2 && parts[0] === "Bearer") token = parts[1];
    }

    const decoded = DecodeToken(token);
    if (decoded === null) {
        return res.status(401).json({
            success: false,
            message: "Authentication failed. Invalid or missing token."
        });
    }

    try {
        // Re-check the account on every request so a blocked / deleted user loses access
        // immediately instead of when their token expires.
        const user = await userModel.findById(decoded._id).select("email role isBlocked").lean();
        if (!user)
            return res.status(401).json({ success: false, message: "Account no longer exists. Please log in again." });
        if (user.isBlocked)
            return res.status(403).json({ success: false, message: "Your account has been blocked." });

        req.headers.email = user.email;
        req.headers._id   = String(user._id);
        req.headers.role  = user.role;
        next();
    } catch (e) {
        console.error("Auth lookup failed:", e.message);
        res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
    }
};

module.exports = authVerification;
