const mongoose         = require("mongoose");
const marketplaceModel = require("../models/marketplaceModel");
const { sendError }                                  = require("../utility/errorUtility");
const { isId, escapeRegex, clampInt, PHONE_RE }      = require("../utility/validators");

const CATEGORIES = ["Furniture", "Electronics", "Appliances", "Books", "Clothing", "Sports", "Other"];
const CONDITIONS = ["New", "Used"];

// Validates the editable fields of a listing. Returns an error string or null.
const validateItem = ({ title, description, price, condition, category }, { partial = false } = {}) => {
    if (!partial || title !== undefined) {
        const t = typeof title === "string" ? title.trim() : "";
        if (t.length < 3 || t.length > 100) return "Title must be between 3 and 100 characters.";
    }
    if (!partial || price !== undefined) {
        const p = Number(price);
        if (!Number.isFinite(p) || p <= 0) return "Price must be a number greater than 0.";
    }
    if (!partial || condition !== undefined)
        if (!CONDITIONS.includes(condition)) return "Condition must be New or Used.";
    if (category !== undefined && !CATEGORIES.includes(category)) return "Please choose a valid category.";
    if (description !== undefined && String(description).length > 2000) return "Description can be at most 2000 characters.";
    return null;
};

exports.createItem = async (req, res) => {
    try {
        if (req.headers.role !== "marketplace")
            return res.status(403).json({ success: false, message: "Only marketplace users can post items." });

        let { title, description, price, condition, category } = req.body;
        const problem = validateItem({ title, description, price, condition, category });
        if (problem) return res.status(400).json({ success: false, message: problem });

        let images = req.files ? req.files.map(f => f.path) : [];

        let data = await marketplaceModel.create({
            seller: req.headers._id,
            title: title.trim(),
            description: (description || "").trim(),
            price: Number(price),
            condition,
            category: category || "Other",
            images
        });

        res.status(201).json({ success: true, message: "Item posted successfully", data });
    } catch (e) {
        sendError(res, e);
    }
};

exports.allItems = async (req, res) => {
    try {
        let { q, condition, category, minPrice, maxPrice, sort } = req.query;
        const pageNo  = clampInt(req.query.pageNo, 1, 1, 100000);
        const perPage = clampInt(req.query.perPage, 12, 1, 50);

        let matchStage = { isRemoved: false };
        if (CONDITIONS.includes(condition)) matchStage.condition = condition;
        if (CATEGORIES.includes(category))  matchStage.category  = category;
        if (typeof q === "string" && q.trim())
            matchStage.title = { $regex: escapeRegex(q.trim()), $options: "i" };
        if (minPrice || maxPrice) {
            matchStage.price = {};
            if (minPrice && !Number.isNaN(Number(minPrice))) matchStage.price.$gte = Number(minPrice);
            if (maxPrice && !Number.isNaN(Number(maxPrice))) matchStage.price.$lte = Number(maxPrice);
            if (!Object.keys(matchStage.price).length) delete matchStage.price;
        }

        const sortStage =
            sort === "price-asc"  ? { price:  1, _id: -1 } :
            sort === "price-desc" ? { price: -1, _id: -1 } :
                                    { createdAt: -1, _id: -1 };

        let result = await marketplaceModel.aggregate([
            { $match: matchStage },
            {
                $facet: {
                    totalCount: [{ $count: "count" }],
                    items: [
                        { $sort: sortStage },
                        { $skip: (pageNo - 1) * perPage },
                        { $limit: perPage },
                        { $lookup: { from: "users", localField: "seller", foreignField: "_id", as: "sellerInfo" } },
                        { $project: { "sellerInfo.password": 0, "sellerInfo.email": 0, "sellerInfo.phone": 0, "sellerInfo.isBlocked": 0, buyerInfo: 0, buyer: 0 } }
                    ]
                }
            }
        ]);

        res.status(200).json({ success: true, message: "All marketplace items", data: result });
    } catch (e) {
        sendError(res, e);
    }
};

exports.singleItem = async (req, res) => {
    try {
        let { id } = req.params;
        if (!isId(id))
            return res.status(400).json({ success: false, message: "Invalid item ID" });

        let data = await marketplaceModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },
            { $lookup: { from: "users", localField: "seller", foreignField: "_id", as: "sellerInfo" } },
            { $project: { "sellerInfo.password": 0, "sellerInfo.email": 0, "sellerInfo.phone": 0, "sellerInfo.isBlocked": 0, buyerInfo: 0, buyer: 0 } }
        ]);

        const item = data[0];
        const isOwner = item && req.headers._id && String(item.seller) === String(req.headers._id);
        const visible = item && (!item.isRemoved || item.isSold || isOwner || req.headers.role === "admin");
        if (!visible)
            return res.status(404).json({ success: false, message: "This item is no longer available." });

        res.status(200).json({ success: true, message: "Item details", data });
    } catch (e) {
        sendError(res, e);
    }
};

exports.myItems = async (req, res) => {
    try {
        let data = await marketplaceModel.find({
            seller: req.headers._id,
            $or: [{ isRemoved: false }, { isSold: true }]
        }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, message: "Your items", data });
    } catch (e) {
        sendError(res, e);
    }
};

// Items the logged-in user has bought through checkout.
exports.myOrders = async (req, res) => {
    try {
        let data = await marketplaceModel.aggregate([
            { $match: { buyer: new mongoose.Types.ObjectId(req.headers._id) } },
            { $sort: { soldAt: -1 } },
            { $lookup: { from: "users", localField: "seller", foreignField: "_id", as: "sellerInfo" } },
            { $project: { "sellerInfo.password": 0, "sellerInfo.email": 0, "sellerInfo.phone": 0, "sellerInfo.isBlocked": 0 } }
        ]);
        res.status(200).json({ success: true, message: "Your orders", data });
    } catch (e) {
        sendError(res, e);
    }
};

// Seller marks one of their own listings as sold (e.g. sold offline).
exports.markAsSold = async (req, res) => {
    try {
        let { id } = req.params;
        if (!isId(id)) return res.status(400).json({ success: false, message: "Invalid item ID" });

        const existing = await marketplaceModel.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: "Item not found." });
        if (String(existing.seller) !== String(req.headers._id))
            return res.status(403).json({ success: false, message: "You can only mark your own items as sold." });
        if (existing.isSold) return res.status(400).json({ success: false, message: "Item is already sold." });

        let data = await marketplaceModel.findByIdAndUpdate(
            id, { isSold: true, isRemoved: true, soldAt: new Date() }, { returnDocument: "after" }
        );
        res.status(200).json({ success: true, message: "Item marked as sold.", data });
    } catch (e) {
        sendError(res, e);
    }
};

// Buyer checkout. Each item is claimed with one atomic update, so two buyers can never
// purchase the same listing, and items that disappeared since being added to the cart
// are reported back instead of being silently "bought".
exports.checkout = async (req, res) => {
    try {
        if (req.headers.role !== "marketplace")
            return res.status(403).json({ success: false, message: "Only marketplace accounts can place orders." });

        const { itemIds, buyer, txnRef } = req.body;
        if (!Array.isArray(itemIds) || itemIds.length === 0 || itemIds.length > 20 || !itemIds.every(isId))
            return res.status(400).json({ success: false, message: "Your cart is empty or contains invalid items." });

        const b = buyer || {};
        const info = {
            name:        String(b.fullName || "").trim(),
            phone:       String(b.phone || "").trim(),
            addressLine: String(b.addressLine || "").trim(),
            city:        String(b.city || "").trim(),
            area:        String(b.area || "").trim(),
            txnRef:      String(txnRef || "").trim().slice(0, 60),
        };
        if (!info.name || !info.addressLine || !info.city || !info.area)
            return res.status(400).json({ success: false, message: "Please fill in your name and full delivery address." });
        if (!PHONE_RE.test(info.phone))
            return res.status(400).json({ success: false, message: "Enter a valid 11-digit Bangladeshi mobile number." });

        const userId = req.headers._id;
        const unique = [...new Set(itemIds)];
        const purchased = [];
        const failed = [];

        for (const id of unique) {
            const item = await marketplaceModel.findOneAndUpdate(
                { _id: id, isSold: false, isRemoved: false, seller: { $ne: userId } },
                { isSold: true, isRemoved: true, soldAt: new Date(), buyer: userId, buyerInfo: info },
                { returnDocument: "after" }
            );
            if (item) { purchased.push({ _id: item._id, title: item.title, price: item.price }); continue; }

            const current = await marketplaceModel.findById(id).select("title seller").lean();
            failed.push({
                _id: id,
                title: current?.title || "Unknown item",
                reason: current && String(current.seller) === String(userId)
                    ? "You cannot buy your own item."
                    : "This item is no longer available."
            });
        }

        if (purchased.length === 0)
            return res.status(409).json({ success: false, message: "None of the items in your cart are available any more.", failed });

        res.status(200).json({
            success: true,
            message: failed.length ? "Order placed – some items were no longer available." : "Order placed successfully.",
            purchased, failed,
            total: purchased.reduce((s, i) => s + i.price, 0)
        });
    } catch (e) {
        sendError(res, e);
    }
};

exports.updateItem = async (req, res) => {
    try {
        let { id } = req.params;
        if (!isId(id)) return res.status(400).json({ success: false, message: "Invalid item ID" });

        const existing = await marketplaceModel.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: "Item not found." });
        if (String(existing.seller) !== String(req.headers._id))
            return res.status(403).json({ success: false, message: "You can only update your own items." });
        if (existing.isSold)
            return res.status(400).json({ success: false, message: "Sold items can no longer be edited." });

        let { title, description, price, condition, category } = req.body;
        const problem = validateItem({ title, description, price, condition, category }, { partial: true });
        if (problem) return res.status(400).json({ success: false, message: problem });

        const update = {};
        if (title !== undefined)       update.title = title.trim();
        if (description !== undefined) update.description = String(description).trim();
        if (price !== undefined)       update.price = Number(price);
        if (condition !== undefined)   update.condition = condition;
        if (category !== undefined)    update.category = category;

        let data = await marketplaceModel.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });
        res.status(200).json({ success: true, message: "Item updated successfully", data });
    } catch (e) {
        sendError(res, e);
    }
};

exports.deleteItem = async (req, res) => {
    try {
        let { id } = req.params;
        if (!isId(id)) return res.status(400).json({ success: false, message: "Invalid item ID" });

        const existing = await marketplaceModel.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: "Item not found." });
        if (String(existing.seller) !== String(req.headers._id))
            return res.status(403).json({ success: false, message: "You can only delete your own items." });
        if (existing.isSold)
            return res.status(400).json({ success: false, message: "Sold items are kept for your sales history." });

        let data = await marketplaceModel.findByIdAndUpdate(id, { isRemoved: true }, { returnDocument: "after" });
        res.status(200).json({ success: true, message: "Item deleted successfully", data });
    } catch (e) {
        sendError(res, e);
    }
};
