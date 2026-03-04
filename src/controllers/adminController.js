const mongoose         = require("mongoose");
const userModel        = require("../models/userModel");
const propertyModel    = require("../models/propertyModel");
const marketplaceModel = require("../models/marketplaceModel");
const paymentModel     = require("../models/paymentModel");
const reportModel      = require("../models/reportModel");

exports.allUsers = async (req, res) => {
    try {
        let { pageNo = 1, perPage = 20 } = req.query;
        let skipRow = (Number(pageNo) - 1) * Number(perPage);

        let result = await userModel.aggregate([
            {
                $facet: {
                    totalCount:    [{ $count: "count" }],
                    landlordCount: [{ $match: { role: "landlord" } }, { $count: "count" }],
                    tenantCount:   [{ $match: { role: "tenant"   } }, { $count: "count" }],
                    blockedCount:  [{ $match: { isBlocked: true  } }, { $count: "count" }],
                    users: [
                        { $sort:    { createdAt: -1 } },
                        { $skip:    skipRow },
                        { $limit:   Number(perPage) },
                        { $project: { password: 0 } }
                    ]
                }
            }
        ]);
        res.status(200).json({ success: true, message: "All users", data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.blockUser = async (req, res) => {
    try {
        let { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ success: false, message: "Invalid user ID" });

        let user = await userModel.findById(id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        let newBlockedState = !user.isBlocked;
        let updated = await userModel.findByIdAndUpdate(id, { isBlocked: newBlockedState }, { new: true }).select("-password");

        res.status(200).json({
            success: true,
            message: newBlockedState ? "User blocked successfully" : "User unblocked successfully",
            data: { id: updated._id, isBlocked: updated.isBlocked }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.removeListing = async (req, res) => {
    try {
        let { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ success: false, message: "Invalid listing ID" });

        let data = await propertyModel.findByIdAndUpdate(id, { isRemoved: true }, { new: true });
        if (!data) return res.status(404).json({ success: false, message: "Listing not found" });

        res.status(200).json({ success: true, message: "Listing removed successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.removeItem = async (req, res) => {
    try {
        let { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ success: false, message: "Invalid item ID" });

        let data = await marketplaceModel.findByIdAndUpdate(id, { isRemoved: true }, { new: true });
        res.status(200).json({ success: true, message: "Item removed successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.allReports = async (req, res) => {
    try {
        let { status, pageNo = 1, perPage = 20 } = req.query;
        let skipRow = (Number(pageNo) - 1) * Number(perPage);
        let matchStage = {};
        if (status) matchStage.status = status;

        let result = await reportModel.aggregate([
            { $match: matchStage },
            {
                $facet: {
                    totalCount: [{ $count: "count" }],
                    reports: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skipRow },
                        { $limit: Number(perPage) },
                        { $lookup: { from: "users", localField: "reportedBy", foreignField: "_id", as: "reportedByInfo" } },
                        { $project: { "reportedByInfo.password": 0 } }
                    ]
                }
            }
        ]);
        res.status(200).json({ success: true, message: "All reports", data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.updateReport = async (req, res) => {
    try {
        let { id } = req.params;
        let { status } = req.body;

        if (!["Pending", "Reviewed", "Resolved"].includes(status))
            return res.status(400).json({ success: false, message: "Status must be 'Pending', 'Reviewed', or 'Resolved'." });

        let data = await reportModel.findByIdAndUpdate(id, { status }, { new: true });
        if (!data) return res.status(404).json({ success: false, message: "Report not found" });

        res.status(200).json({ success: true, message: "Report status updated", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.allTransactions = async (req, res) => {
    try {
        let { pageNo = 1, perPage = 20 } = req.query;
        let skipRow = (Number(pageNo) - 1) * Number(perPage);

        let result = await paymentModel.aggregate([
            {
                $facet: {
                    totalCount: [{ $count: "count" }],
                    transactions: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skipRow },
                        { $limit: Number(perPage) },
                        { $lookup: { from: "properties", localField: "property", foreignField: "_id", as: "propertyInfo" } },
                        { $lookup: { from: "users",      localField: "tenant",   foreignField: "_id", as: "tenantInfo" } },
                        { $lookup: { from: "users",      localField: "landlord", foreignField: "_id", as: "landlordInfo" } },
                        { $project: { "tenantInfo.password": 0, "landlordInfo.password": 0 } }
                    ]
                }
            }
        ]);
        res.status(200).json({ success: true, message: "All transactions", data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.allMarketplaceItems = async (req, res) => {
    try {
        let { pageNo = 1, perPage = 20, status } = req.query;
        let skipRow = (Number(pageNo) - 1) * Number(perPage);
        let matchStage = {};
        if (status === "active")   matchStage = { isRemoved: false, isSold: false };
        else if (status === "sold")    matchStage = { isSold: true };
        else if (status === "removed") matchStage = { isRemoved: true, isSold: false };

        let result = await marketplaceModel.aggregate([
            { $match: matchStage },
            {
                $facet: {
                    totalCount:   [{ $count: "count" }],
                    activeCount:  [{ $match: { isRemoved: false, isSold: false } }, { $count: "count" }],
                    soldCount:    [{ $match: { isSold: true } },                    { $count: "count" }],
                    removedCount: [{ $match: { isRemoved: true, isSold: false } },  { $count: "count" }],
                    items: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skipRow },
                        { $limit: Number(perPage) },
                        { $lookup: { from: "users", localField: "seller", foreignField: "_id", as: "sellerInfo" } },
                        { $project: { "sellerInfo.password": 0 } }
                    ]
                }
            }
        ]);
        res.status(200).json({ success: true, message: "All marketplace items", data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.allMarketplaceUsers = async (req, res) => {
    try {
        let { pageNo = 1, perPage = 20 } = req.query;
        let skipRow = (Number(pageNo) - 1) * Number(perPage);

        let result = await userModel.aggregate([
            { $match: { role: "marketplace" } },
            {
                $facet: {
                    totalCount: [{ $count: "count" }],
                    users: [
                        { $sort:    { createdAt: -1 } },
                        { $skip:    skipRow },
                        { $limit:   Number(perPage) },
                        { $project: { password: 0 } }
                    ]
                }
            }
        ]);
        res.status(200).json({ success: true, message: "All marketplace users", data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};
