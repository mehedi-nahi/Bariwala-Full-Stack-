const mongoose          = require("mongoose");
const marketplaceModel  = require("../models/marketplaceModel");

// Create Item (tenant or landlord can post)
exports.createItem = async (req, res) => {
    try {
        let sellerId   = req.headers._id;
        let sellerRole = req.headers.role;

        // Only marketplace users can post items
        if (sellerRole !== "marketplace") {
            return res.status(403).json({ success: false, message: "Only marketplace users can post items." });
        }

        let { title, description, price, condition } = req.body;

        let images = req.files ? req.files.map(f => f.filename) : [];

        let data = await marketplaceModel.create({
            seller: sellerId,
            title,
            description,
            price,
            condition,
            images
        });

        res.status(201).json({ success: true, message: "Item posted successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// All Items (public)
exports.allItems = async (req, res) => {
    try {
        let { condition, minPrice, maxPrice, pageNo = 1, perPage = 10 } = req.query;

        let matchStage = { isRemoved: false };

        if (condition) matchStage.condition = condition;
        if (minPrice || maxPrice) {
            matchStage.price = {};
            if (minPrice) matchStage.price.$gte = Number(minPrice);
            if (maxPrice) matchStage.price.$lte = Number(maxPrice);
        }

        let skipRow = (Number(pageNo) - 1) * Number(perPage);

        let faceStage = {
            $facet: {
                totalCount: [{ $count: "count" }],
                items: [
                    { $sort:  { createdAt: -1 } },
                    { $skip:  skipRow },
                    { $limit: Number(perPage) },
                    {
                        $lookup: {
                            from: "users", localField: "seller",
                            foreignField: "_id", as: "sellerInfo"
                        }
                    },
                    { $project: { "sellerInfo.password": 0 } }
                ]
            }
        };

        let result = await marketplaceModel.aggregate([{ $match: matchStage }, faceStage]);

        res.status(200).json({ success: true, message: "All marketplace items", data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Single Item
exports.singleItem = async (req, res) => {
    try {
        let { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid item ID" });
        }

        let matchStage = { $match: { _id: new mongoose.Types.ObjectId(id) } };
        let joinSeller = {
            $lookup: { from: "users", localField: "seller", foreignField: "_id", as: "sellerInfo" }
        };
        let projectStage = { $project: { "sellerInfo.password": 0 } };

        let data = await marketplaceModel.aggregate([matchStage, joinSeller, projectStage]);

        res.status(200).json({ success: true, message: "Item details", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// My Items (seller) — returns all items including sold, excludes only admin-removed
exports.myItems = async (req, res) => {
    try {
        let sellerId = req.headers._id;
        // Include sold items (isSold:true) but exclude admin-removed (isRemoved:true AND isSold:false)
        let data = await marketplaceModel.find({
            seller: sellerId,
            $or: [{ isRemoved: false }, { isSold: true }]
        }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, message: "Your items", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Mark item as sold (called after buyer completes payment)
exports.markAsSold = async (req, res) => {
    try {
        let { id } = req.params;
        let { buyerName, buyerPhone, buyerArea, buyerCity, txnRef } = req.body;

        const existing = await marketplaceModel.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: "Item not found." });
        if (existing.isSold)  return res.status(400).json({ success: false, message: "Item is already sold." });

        let data = await marketplaceModel.findByIdAndUpdate(
            id,
            {
                isSold:    true,
                isRemoved: true,
                soldAt:    new Date(),
                buyerInfo: { name: buyerName, phone: buyerPhone, area: buyerArea, city: buyerCity, txnRef }
            },
            { new: true }
        );
        res.status(200).json({ success: true, message: "Item marked as sold.", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Update Item
exports.updateItem = async (req, res) => {
    try {
        let { id } = req.params;
        let sellerId = req.headers._id;

        const existing = await marketplaceModel.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: "Item not found." });
        if (String(existing.seller) !== String(sellerId)) {
            return res.status(403).json({ success: false, message: "You can only update your own items." });
        }

        let { title, description, price, condition } = req.body;

        let data = await marketplaceModel.findByIdAndUpdate(
            id,
            { title, description, price, condition },
            { new: true }
        );

        res.status(200).json({ success: true, message: "Item updated successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Delete Item
exports.deleteItem = async (req, res) => {
    try {
        let { id } = req.params;
        let sellerId = req.headers._id;

        const existing = await marketplaceModel.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: "Item not found." });
        if (String(existing.seller) !== String(sellerId)) {
            return res.status(403).json({ success: false, message: "You can only delete your own items." });
        }

        let data = await marketplaceModel.findByIdAndUpdate(id, { isRemoved: true }, { new: true });
        res.status(200).json({ success: true, message: "Item deleted successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

