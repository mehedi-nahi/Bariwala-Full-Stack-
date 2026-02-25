const jwt = require("jsonwebtoken");

exports.EncodeToken = (email, _id, role) => {
    let key    = process.env.JWT_SECRET;
    let expire = process.env.JWT_EXPIRE;
    let payload = { email, _id, role };
    return jwt.sign(payload, key, { expiresIn: expire });
};

exports.DecodeToken = (token) => {
    let key = process.env.JWT_SECRET;
    try {
        return jwt.verify(token, key);
    } catch (e) {
        return null;
    }
};

