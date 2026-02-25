const { DecodeToken } = require("../utility/tokenUtility");

const authVerification = (req, res, next) => {
    let token = req.cookies["token"];

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

