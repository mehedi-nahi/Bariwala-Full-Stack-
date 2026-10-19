const userModel       = require("../models/userModel");
const propertyModel    = require("../models/propertyModel");
const marketplaceModel = require("../models/marketplaceModel");
const paymentModel     = require("../models/paymentModel");
const reportModel      = require("../models/reportModel");
const { sendError }                      = require("../utility/errorUtility");
const { isId, escapeRegex, clampInt }    = require("../utility/validators");

const paging = (query, defaultPerPage = 20) => {
    const pageNo  = clampInt(query.pageNo, 1, 1, 100000);
    const perPage = clampInt(query.perPage, defaultPerPage, 1, 100);
    return { pageNo, perPage, skip: (pageNo - 1) * perPage };
};

exports.allUsers = async (req, res) => {
    try {
        const { skip, perPage } = paging(req.query);
        const { q, role, status } = req.query;

        // filters apply to the table only – the headline counts always describe the whole platform
        const filter = {};
        if (["landlord", "tenant", "marketplace", "admin"].includes(role)) filter.role = role;
        if (status === "blocked") filter.isBlocked = true;
        if (status === "active")  filter.isBlocked = false;
        if (typeof q === "string" && q.trim()) {
            const rx = { $regex: escapeRegex(q.trim()), $options: "i" };
            filter.$or = [{ name: rx }, { email: rx }];
        }

        let result = await userModel.aggregate([
            {
                $facet: {
                    totalCount:    [{ $count: "count" }],
                    landlordCount: [{ $match: { role: "landlord" } }, { $count: "count" }],
                    tenantCount:   [{ $match: { role: "tenant"   } }, { $count: "count" }],
                    blockedCount:  [{ $match: { isBlocked: true  } }, { $count: "count" }],
                    filteredCount: [{ $match: filter }, { $count: "count" }],
                    users: [
                        { $match:   filter },
                        { $sort:    { createdAt: -1 } },
                        { $skip:    skip },
                        { $limit:   perPage },
                        { $project: { password: 0 } }
                    ]
                }
            }
        ]);
        res.status(200).json({ success: true, message: "All users", data: result });
    } catch (e) {
        sendError(res, e);
    }
};

exports.blockUser = async (req, res) => {
    try {
        let { id } = req.params;
        if (!isId(id))
            return res.status(400).json({ success: false, message: "Invalid user ID" });

        let user = await userModel.findById(id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (user.role === "admin")
            return res.status(400).json({ success: false, message: "Admin accounts cannot be blocked." });

        let newBlockedState = !user.isBlocked;
        let updated = await userModel.findByIdAndUpdate(id, { isBlocked: newBlockedState }, { returnDocument: "after" }).select("-password");

        res.status(200).json({
            success: true,
            message: newBlockedState ? "User blocked successfully" : "User unblocked successfully",
            data: { id: updated._id, isBlocked: updated.isBlocked }
        });
    } catch (e) {
        sendError(res, e);
    }
};

exports.removeListing = async (req, res) => {
    try {
        let { id } = req.params;
        if (!isId(id))
            return res.status(400).json({ success: false, message: "Invalid listing ID" });

        let data = await propertyModel.findByIdAndUpdate(id, { isRemoved: true }, { returnDocument: "after" });
        if (!data) return res.status(404).json({ success: false, message: "Listing not found" });

        res.status(200).json({ success: true, message: "Listing removed successfully", data });
    } catch (e) {
        sendError(res, e);
    }
};

exports.removeItem = async (req, res) => {
    try {
        let { id } = req.params;
        if (!isId(id))
            return res.status(400).json({ success: false, message: "Invalid item ID" });

        let data = await marketplaceModel.findByIdAndUpdate(id, { isRemoved: true }, { returnDocument: "after" });
        if (!data) return res.status(404).json({ success: false, message: "Item not found" });
        res.status(200).json({ success: true, message: "Item removed successfully", data });
    } catch (e) {
        sendError(res, e);
    }
};

exports.allReports = async (req, res) => {
    try {
        const { skip, perPage } = paging(req.query);
        const { status } = req.query;
        let matchStage = {};
        if (["Pending", "Reviewed", "Resolved"].includes(status)) matchStage.status = status;

        let result = await reportModel.aggregate([
            {
                $facet: {
                    totalCount:    [{ $match: matchStage }, { $count: "count" }],
                    pendingCount:  [{ $match: { status: "Pending"  } }, { $count: "count" }],
                    reviewedCount: [{ $match: { status: "Reviewed" } }, { $count: "count" }],
                    resolvedCount: [{ $match: { status: "Resolved" } }, { $count: "count" }],
                    reports: [
                        { $match: matchStage },
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: perPage },
                        { $lookup: { from: "users",        localField: "reportedBy",     foreignField: "_id", as: "reportedByInfo" } },
                        // what was reported – lets the admin see the target instead of a bare ID
                        { $lookup: { from: "properties",   localField: "reportedEntity", foreignField: "_id", as: "propertyTarget" } },
                        { $lookup: { from: "marketplaces", localField: "reportedEntity", foreignField: "_id", as: "itemTarget" } },
                        { $lookup: { from: "users",        localField: "reportedEntity", foreignField: "_id", as: "userTarget" } },
                        { $project: {
                            "reportedByInfo.password": 0, "reportedByInfo.phone": 0, "reportedByInfo.isBlocked": 0,
                            "propertyTarget.images": 0, "propertyTarget.facilities": 0, "propertyTarget.location": 0,
                            "itemTarget.images": 0, "itemTarget.description": 0, "itemTarget.buyerInfo": 0,
                            "userTarget.password": 0, "userTarget.phone": 0
                        } }
                    ]
                }
            }
        ]);
        res.status(200).json({ success: true, message: "All reports", data: result });
    } catch (e) {
        sendError(res, e);
    }
};

exports.updateReport = async (req, res) => {
    try {
        let { id } = req.params;
        let { status } = req.body;

        if (!isId(id))
            return res.status(400).json({ success: false, message: "Invalid report ID" });
        if (!["Pending", "Reviewed", "Resolved"].includes(status))
            return res.status(400).json({ success: false, message: "Status must be 'Pending', 'Reviewed', or 'Resolved'." });

        let data = await reportModel.findByIdAndUpdate(id, { status }, { returnDocument: "after" });
        if (!data) return res.status(404).json({ success: false, message: "Report not found" });

        res.status(200).json({ success: true, message: "Report status updated", data });
    } catch (e) {
        sendError(res, e);
    }
};

exports.allTransactions = async (req, res) => {
    try {
        const { skip, perPage } = paging(req.query);
        const { status } = req.query;
        const matchStage = {};
        if (["Pending", "Paid", "Overdue"].includes(status)) matchStage.status = status;

        // keep overdue flags honest for the admin view too
        await paymentModel.updateMany(
            { status: "Pending", expiresAt: { $lte: new Date() } },
            { $set: { status: "Overdue" } }
        );

        let result = await paymentModel.aggregate([
            {
                $facet: {
                    totalCount: [{ $match: matchStage }, { $count: "count" }],
                    revenue:    [{ $match: { status: "Paid" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }],
                    pending:    [{ $match: { status: "Pending" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }],
                    overdue:    [{ $match: { status: "Overdue" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }],
                    transactions: [
                        { $match: matchStage },
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: perPage },
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
        sendError(res, e);
    }
};

exports.allMarketplaceItems = async (req, res) => {
    try {
        const { skip, perPage } = paging(req.query);
        const { status } = req.query;
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
                        { $skip: skip },
                        { $limit: perPage },
                        { $lookup: { from: "users", localField: "seller", foreignField: "_id", as: "sellerInfo" } },
                        { $project: { "sellerInfo.password": 0 } }
                    ]
                }
            }
        ]);
        res.status(200).json({ success: true, message: "All marketplace items", data: result });
    } catch (e) {
        sendError(res, e);
    }
};

exports.allMarketplaceUsers = async (req, res) => {
    try {
        const { skip, perPage } = paging(req.query);

        let result = await userModel.aggregate([
            { $match: { role: "marketplace" } },
            {
                $facet: {
                    totalCount: [{ $count: "count" }],
                    users: [
                        { $sort:    { createdAt: -1 } },
                        { $skip:    skip },
                        { $limit:   perPage },
                        { $project: { password: 0 } }
                    ]
                }
            }
        ]);
        res.status(200).json({ success: true, message: "All marketplace users", data: result });
    } catch (e) {
        sendError(res, e);
    }
};

// Platform-wide numbers for the admin dashboard in a single call
exports.overview = async (req, res) => {
    try {
        const [users, pendingReports, txn, items] = await Promise.all([
            userModel.aggregate([{ $group: { _id: "$role", count: { $sum: 1 }, blocked: { $sum: { $cond: ["$isBlocked", 1, 0] } } } }]),
            reportModel.aggregate([{ $match: { status: "Pending" } }, { $group: { _id: "$reportType", count: { $sum: 1 } } }]),
            paymentModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } }]),
            marketplaceModel.aggregate([{ $group: {
                _id: null,
                total:  { $sum: 1 },
                active: { $sum: { $cond: [{ $and: [{ $eq: ["$isRemoved", false] }, { $eq: ["$isSold", false] }] }, 1, 0] } },
                sold:   { $sum: { $cond: ["$isSold", 1, 0] } },
                soldValue: { $sum: { $cond: ["$isSold", "$price", 0] } }
            } }])
        ]);
        res.status(200).json({ success: true, data: { users, pendingReports, txn, items: items[0] || {} } });
    } catch (e) {
        sendError(res, e);
    }
};
