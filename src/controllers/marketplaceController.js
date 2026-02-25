const mongoose          = require("mongoose");
const marketplaceModel  = require("../models/marketplaceModel");

// Create Item
exports.createItem = async (req, res) => {
    try {
        let sellerId = req.headers._id;
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

// My Items (seller)
exports.myItems = async (req, res) => {
    try {
        let sellerId = req.headers._id;
        let data = await marketplaceModel.find({ seller: sellerId, isRemoved: false }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, message: "Your items", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Update Item
exports.updateItem = async (req, res) => {
    try {
        let { id } = req.params;
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
        let data = await marketplaceModel.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Item deleted successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

