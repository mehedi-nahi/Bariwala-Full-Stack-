const adminVerification = (req, res, next) => {
    let role = req.headers.role;

    if (role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admins only."
        });
    }
    next();
};

module.exports = adminVerification;

