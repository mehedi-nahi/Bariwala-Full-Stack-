const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "bariwala_fallback_secret";
const JWT_EXPIRE  = process.env.JWT_EXPIRE  || "7d";

exports.EncodeToken = (email, _id, role) => {
    let payload = { email, _id, role };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

exports.DecodeToken = (token) => {
    let key = JWT_SECRET;
    try {
        return jwt.verify(token, key);
    } catch (e) {
        return null;
    }
};

