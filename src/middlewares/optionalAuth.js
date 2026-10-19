const { DecodeToken } = require("../utility/tokenUtility");

// For public routes that behave differently for logged-in users (e.g. landlords can
// see their rented listings). Never rejects – it only fills req.headers when the
// cookie/bearer token is valid. Identity headers sent by the client are stripped
// globally in app.js, so they cannot be spoofed.
const optionalAuth = (req, res, next) => {
    let token = req.cookies?.["token"];
    if (!token && req.headers["authorization"]) {
        const parts = req.headers["authorization"].split(" ");
        if (parts.length === 2 && parts[0] === "Bearer") token = parts[1];
    }
    const decoded = token ? DecodeToken(token) : null;
    if (decoded) {
        req.headers.email = decoded.email;
        req.headers._id   = decoded._id;
        req.headers.role  = decoded.role;
    }
    next();
};

module.exports = optionalAuth;
