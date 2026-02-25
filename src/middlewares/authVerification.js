const { DecodeToken } = require("../utility/tokenUtility");

const authVerification = (req, res, next) => {
    // Support cookie token OR Authorization: Bearer <token> header (useful for Postman)
    let token = req.cookies["token"];
    if (!token && req.headers["authorization"]) {
        const parts = req.headers["authorization"].split(" ");
        if (parts.length === 2 && parts[0] === "Bearer") token = parts[1];
    }

    let decoded = DecodeToken(token);

    if (decoded === null) {
        return res.status(401).json({
            success: false,
            message: "Authentication failed. Invalid or missing token."
        });
    } else {
        req.headers.email = decoded.email;
        req.headers._id   = decoded._id;
        req.headers.role  = decoded.role;
        next();
    }
};

module.exports = authVerification;

