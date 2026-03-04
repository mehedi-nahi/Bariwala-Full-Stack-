const userModel = require("../models/userModel");const bcrypt    = require("bcryptjs");
const { EncodeToken } = require("../utility/tokenUtility");

exports.register = async (req, res) => {
    try {
        let { name, email, phone, password, role } = req.body;

        const allowedRoles = ["landlord", "tenant", "marketplace"];
        if (!allowedRoles.includes(role))
            return res.status(400).json({ success: false, message: "Role must be 'landlord', 'tenant', or 'marketplace'." });

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return res.status(400).json({ success: false, message: "Invalid email address." });

        if (phone && !/^[0-9]{11}$/.test(phone))
            return res.status(400).json({ success: false, message: "Phone number must be exactly 11 digits." });

        let result = await userModel.create({ name, email, phone, password, role });
        result.password = undefined;
        res.status(201).json({ success: true, message: "User registered successfully", data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;
        let user = await userModel.findOne({ email });

        if (!user)
            return res.status(401).json({ success: false, message: "User not found." });
        if (user.isBlocked)
            return res.status(403).json({ success: false, message: "Your account has been blocked." });

        let isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(401).json({ success: false, message: "Password does not match." });

        let token = EncodeToken(user.email, user._id.toString(), user.role);
        let isProduction = process.env.NODE_ENV === "production";

        res.cookie("token", token, {
            maxAge:   parseInt(process.env.COOKIE_EXPIRE) * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: isProduction ? "none" : "lax",
            secure:   isProduction
        });

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            data: { id: user._id, email: user.email, role: user.role, name: user.name }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.logout = (req, res) => {
    try {
        res.clearCookie("token");
        res.status(200).json({ success: true, message: "Logout successful" });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.profile = async (req, res) => {
    try {
        let result = await userModel.aggregate([
            { $match: { email: req.headers.email } },
            { $project: { password: 0 } }
        ]);
        res.status(200).json({ success: true, message: "Profile retrieved", data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        let { name, phone, bio } = req.body;
        if (phone && !/^[0-9]{11}$/.test(phone))
            return res.status(400).json({ success: false, message: "Phone number must be exactly 11 digits." });

        let result = await userModel.findByIdAndUpdate(
            req.headers._id,
            { name, phone, bio },
            { new: true }
        ).select("-password");

        res.status(200).json({ success: true, message: "Profile updated successfully", data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.searchTenants = async (req, res) => {
    try {
        let { q } = req.query;
        if (!q || q.trim().length < 2)
            return res.status(200).json({ success: true, data: [] });

        const regex = new RegExp(q.trim(), "i");
        let users = await userModel.find({
            role: "tenant", isBlocked: false,
            $or: [{ name: regex }, { email: regex }]
        }).select("_id name email").limit(10).lean();

        res.status(200).json({ success: true, data: users });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.publicProfile = async (req, res) => {
    try {
        let { userId } = req.params;
        if (!require("mongoose").Types.ObjectId.isValid(userId))
            return res.status(400).json({ success: false, message: "Invalid user ID." });

        let user = await userModel.findById(userId).select("name role profileImg bio createdAt").lean();
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        res.status(200).json({
            success: true,
            message: "Public profile retrieved",
            data: {
                _id:         user._id,
                name:        user.name,
                role:        user.role,
                profileImg:  user.profileImg || "",
                bio:         user.bio || "",
                memberSince: user.createdAt
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded." });
        res.status(200).json({ success: true, message: "File uploaded successfully", filename: req.file.path });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};
