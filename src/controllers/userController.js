const userModel = require("../models/userModel");
const bcrypt    = require("bcryptjs");
const { EncodeToken }                           = require("../utility/tokenUtility");
const { sendError }                             = require("../utility/errorUtility");
const { isId, escapeRegex, EMAIL_RE }           = require("../utility/validators");

const isProduction = () => process.env.NODE_ENV === "production";

// Same-origin deployment uses "lax". If the client lives on another domain (CLIENT_ORIGIN set)
// the cookie has to be sent cross-site, which requires SameSite=None + Secure.
const cookieOptions = () => {
    const crossSite = !!process.env.CLIENT_ORIGIN;
    return {
        httpOnly: true,
        sameSite: crossSite ? "none" : "lax",
        secure:   crossSite || isProduction(),
    };
};

exports.register = async (req, res) => {
    try {
        let { name, email, phone, password, role } = req.body;
        name  = typeof name  === "string" ? name.trim()  : "";
        email = typeof email === "string" ? email.trim().toLowerCase() : "";
        phone = typeof phone === "string" ? phone.trim() : "";

        const allowedRoles = ["landlord", "tenant", "marketplace"];
        if (!allowedRoles.includes(role))
            return res.status(400).json({ success: false, message: "Please choose a valid account type." });
        if (name.length < 2)
            return res.status(400).json({ success: false, message: "Please enter your full name." });
        if (!EMAIL_RE.test(email))
            return res.status(400).json({ success: false, message: "Please enter a valid email address." });
        if (phone && !/^[0-9]{11}$/.test(phone))
            return res.status(400).json({ success: false, message: "Phone number must be exactly 11 digits." });
        if (typeof password !== "string" || password.length < 8)
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });

        if (await userModel.exists({ email }))
            return res.status(409).json({ success: false, message: "An account with this email already exists. Try logging in instead." });

        let result = await userModel.create({ name, email, phone, password, role });
        result.password = undefined;
        res.status(201).json({ success: true, message: "Account created successfully. You can log in now.", data: result });
    } catch (e) {
        sendError(res, e);
    }
};

exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;
        email = typeof email === "string" ? email.trim().toLowerCase() : "";
        if (!email || typeof password !== "string" || !password)
            return res.status(400).json({ success: false, message: "Please enter your email and password." });

        let user = await userModel.findOne({ email });

        // Same message for unknown user and wrong password, so accounts cannot be enumerated.
        const invalid = () => res.status(401).json({ success: false, message: "Incorrect email or password." });
        if (!user) return invalid();

        let isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return invalid();

        if (user.isBlocked)
            return res.status(403).json({ success: false, message: "Your account has been blocked. Please contact support." });

        let token = EncodeToken(user.email, user._id.toString(), user.role);

        res.cookie("token", token, {
            ...cookieOptions(),
            maxAge: (parseInt(process.env.COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            data: { id: user._id, _id: user._id, email: user.email, role: user.role, name: user.name }
        });
    } catch (e) {
        sendError(res, e);
    }
};

exports.logout = (req, res) => {
    try {
        res.clearCookie("token", cookieOptions());
        res.status(200).json({ success: true, message: "Logout successful" });
    } catch (e) {
        sendError(res, e);
    }
};

// Used by the app on start-up. Unlike /profile it never answers 401 for guests – it simply
// reports "nobody is logged in" – so anonymous visitors don't get errors in their console.
exports.session = async (req, res) => {
    try {
        if (!req.headers._id) return res.status(200).json({ success: true, data: null });
        const user = await userModel.findById(req.headers._id).select("-password").lean();
        if (!user || user.isBlocked) return res.status(200).json({ success: true, data: null });
        res.status(200).json({ success: true, data: user });
    } catch (e) {
        sendError(res, e);
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
        sendError(res, e);
    }
};

exports.updateProfile = async (req, res) => {
    try {
        let { name, phone, bio } = req.body;
        const update = {};

        if (name !== undefined) {
            name = String(name).trim();
            if (name.length < 2)
                return res.status(400).json({ success: false, message: "Please enter your full name." });
            update.name = name;
        }
        if (phone !== undefined) {
            phone = String(phone).trim();
            if (phone && !/^[0-9]{11}$/.test(phone))
                return res.status(400).json({ success: false, message: "Phone number must be exactly 11 digits." });
            update.phone = phone;
        }
        if (bio !== undefined) {
            bio = String(bio).trim();
            if (bio.length > 200)
                return res.status(400).json({ success: false, message: "Bio can be at most 200 characters." });
            update.bio = bio;
        }

        let result = await userModel.findByIdAndUpdate(
            req.headers._id, update, { returnDocument: "after", runValidators: true }
        ).select("-password");

        res.status(200).json({ success: true, message: "Profile updated successfully", data: result });
    } catch (e) {
        sendError(res, e);
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (typeof currentPassword !== "string" || !currentPassword)
            return res.status(400).json({ success: false, message: "Please enter your current password." });
        if (typeof newPassword !== "string" || newPassword.length < 8)
            return res.status(400).json({ success: false, message: "New password must be at least 8 characters long." });
        if (newPassword === currentPassword)
            return res.status(400).json({ success: false, message: "New password must be different from the current one." });

        const user = await userModel.findById(req.headers._id);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        if (!(await bcrypt.compare(currentPassword, user.password)))
            return res.status(400).json({ success: false, message: "Current password is incorrect." });

        user.password = newPassword; // hashed by the pre-save hook
        await user.save();
        res.status(200).json({ success: true, message: "Password changed successfully." });
    } catch (e) {
        sendError(res, e);
    }
};

exports.searchTenants = async (req, res) => {
    try {
        if (req.headers.role !== "landlord")
            return res.status(403).json({ success: false, message: "Only landlords can search tenants." });

        let { q } = req.query;
        if (typeof q !== "string" || q.trim().length < 2)
            return res.status(200).json({ success: true, data: [] });

        const regex = new RegExp(escapeRegex(q.trim()), "i");
        let users = await userModel.find({
            role: "tenant", isBlocked: false,
            $or: [{ name: regex }, { email: regex }]
        }).select("_id name email").limit(10).lean();

        res.status(200).json({ success: true, data: users });
    } catch (e) {
        sendError(res, e);
    }
};

exports.publicProfile = async (req, res) => {
    try {
        let { userId } = req.params;
        if (!isId(userId))
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
        sendError(res, e);
    }
};

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded." });
        res.status(200).json({ success: true, message: "File uploaded successfully", filename: req.file.path });
    } catch (e) {
        sendError(res, e);
    }
};
