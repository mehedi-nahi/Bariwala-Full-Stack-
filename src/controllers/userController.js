const userModel = require("../models/userModel");
const bcrypt     = require("bcryptjs");
const { EncodeToken } = require("../utility/tokenUtility");

// Register
exports.register = async (req, res) => {
    try {
        let { name, email, phone, password, role } = req.body;
        let result = await userModel.create({ name, email, phone, password, role });
        result.password = undefined;
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: result
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;
        let user = await userModel.findOne({ email });

        if (!user) {
            return res.status(401).json({ success: false, message: "User not found." });
        }
        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: "Your account has been blocked." });
        }

        let isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Password does not match." });
        }

        let token = EncodeToken(user.email, user._id.toString(), user.role);

        let option = {
            maxAge:   parseInt(process.env.COOKIE_EXPIRE) * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: "none",
            secure:   true
        };

        res.cookie("token", token, option);
        res.status(200).json({
            success: true,
            message: "Login successful",
            data: { id: user._id, email: user.email, role: user.role, name: user.name }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Logout
exports.logout = (req, res) => {
    try {
        res.clearCookie("token");
        res.status(200).json({ success: true, message: "Logout successful" });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Profile
exports.profile = async (req, res) => {
    try {
        let email = req.headers.email;

        let matchStage  = { $match: { email: email } };
        let projectStage = { $project: { password: 0 } };

        let result = await userModel.aggregate([matchStage, projectStage]);
        res.status(200).json({ success: true, message: "Profile retrieved", data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Update Profile
exports.updateProfile = async (req, res) => {
    try {
        let userID = req.headers._id;
        let { name, phone, role, profileImg } = req.body;

        let updatedData = { name, phone, role, profileImg };

        let result = await userModel.findByIdAndUpdate(userID, updatedData, { new: true }).select("-password");
        res.status(200).json({ success: true, message: "Profile updated successfully", data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// File Upload
exports.uploadFile = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: "File uploaded successfully",
            data: req.file
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

