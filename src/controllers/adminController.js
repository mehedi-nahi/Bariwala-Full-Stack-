const mongoose          = require("mongoose");
const userModel         = require("../models/userModel");
const propertyModel     = require("../models/propertyModel");
const marketplaceModel  = require("../models/marketplaceModel");
const reportModel       = require("../models/reportModel");
const paymentModel      = require("../models/paymentModel");

// View All Users
exports.allUsers = async (req, res) => {
    try {
        let { pageNo = 1, perPage = 20 } = req.query;
        let skipRow = (Number(pageNo) - 1) * Number(perPage);

        let faceStage = {
            $facet: {
                totalCount: [{ $count: "count" }],
                users: [
                    { $sort:    { createdAt: -1 } },
                    { $skip:    skipRow },
                    { $limit:   Number(perPage) },
                    { $project: { password: 0 } }
                ]
            }
        };

        let result = await userModel.aggregate([faceStage]);
        res.status(200).json({ success: true, message: "All users", data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Block / Unblock User
exports.blockUser = async (req, res) => {
    try {
        let { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        let user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        let msg = user.isBlocked ? "User blocked successfully" : "User unblocked successfully";
        res.status(200).json({ success: true, message: msg, data: { id: user._id, isBlocked: user.isBlocked } });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Remove Property Listing
exports.removeListing = async (req, res) => {
    try {
        let { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid listing ID" });
        }

        let data = await propertyModel.findByIdAndUpdate(id, { isRemoved: true }, { new: true });
        res.status(200).json({ success: true, message: "Listing removed successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Remove Marketplace Item
exports.removeItem = async (req, res) => {
    try {
        let { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid item ID" });
        }

        let data = await marketplaceModel.findByIdAndUpdate(id, { isRemoved: true }, { new: true });
        res.status(200).json({ success: true, message: "Item removed successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// All Reports
exports.allReports = async (req, res) => {
    try {
        let { status, pageNo = 1, perPage = 20 } = req.query;
        let skipRow = (Number(pageNo) - 1) * Number(perPage);

        let matchStage = {};
        if (status) matchStage.status = status;

        let joinReporter = {
            $lookup: { from: "users", localField: "reportedBy", foreignField: "_id", as: "reportedByInfo" }
        };
        let projectStage = { $project: { "reportedByInfo.password": 0 } };
        let sortStage    = { $sort: { createdAt: -1 } };

        let faceStage = {
            $facet: {
                totalCount: [{ $count: "count" }],
                reports: [
                    sortStage,
                    { $skip:  skipRow },
                    { $limit: Number(perPage) },
                    joinReporter,
                    projectStage
                ]
            }
        };

        let result = await reportModel.aggregate([{ $match: matchStage }, faceStage]);
        res.status(200).json({ success: true, message: "All reports", data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Update Report Status  (Pending → Reviewed → Resolved)
exports.updateReport = async (req, res) => {
    try {
        let { id } = req.params;
        let { status } = req.body;

        let data = await reportModel.findByIdAndUpdate(id, { status }, { new: true });
        res.status(200).json({ success: true, message: "Report status updated", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// All Transactions
exports.allTransactions = async (req, res) => {
    try {
        let { pageNo = 1, perPage = 20 } = req.query;
        let skipRow = (Number(pageNo) - 1) * Number(perPage);

        let joinProperty = {
            $lookup: { from: "properties", localField: "property", foreignField: "_id", as: "propertyInfo" }
        };
        let joinTenant = {
            $lookup: { from: "users", localField: "tenant", foreignField: "_id", as: "tenantInfo" }
        };
        let joinLandlord = {
            $lookup: { from: "users", localField: "landlord", foreignField: "_id", as: "landlordInfo" }
        };
        let projectStage = {
            $project: { "tenantInfo.password": 0, "landlordInfo.password": 0 }
        };

        let faceStage = {
            $facet: {
                totalCount:   [{ $count: "count" }],
                transactions: [
                    { $sort:  { createdAt: -1 } },
                    { $skip:  skipRow },
                    { $limit: Number(perPage) },
                    joinProperty,
                    joinTenant,
                    joinLandlord,
                    projectStage
                ]
            }
        };

        let result = await paymentModel.aggregate([faceStage]);
        res.status(200).json({ success: true, message: "All transactions", data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

