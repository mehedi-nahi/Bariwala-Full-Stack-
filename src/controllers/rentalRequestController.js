const mongoose           = require("mongoose");
const rentalRequestModel = require("../models/rentalRequestModel");
const propertyModel      = require("../models/propertyModel");
const { sendError }      = require("../utility/errorUtility");
const { isId }           = require("../utility/validators");

exports.sendRequest = async (req, res) => {
    try {
        if (req.headers.role !== "tenant")
            return res.status(403).json({ success: false, message: "Only tenants can send rental requests." });

        const tenantId = req.headers._id;
        const { propertyId } = req.body;
        const message = typeof req.body.message === "string" ? req.body.message.trim() : "";

        if (!propertyId || !isId(propertyId))
            return res.status(400).json({ success: false, message: "Valid propertyId is required." });
        if (message.length > 500)
            return res.status(400).json({ success: false, message: "Your message can be at most 500 characters." });

        const property = await propertyModel.findById(propertyId);
        if (!property || property.isRemoved)
            return res.status(404).json({ success: false, message: "Property not found." });
        if (property.availability === "Rented")
            return res.status(400).json({ success: false, message: "This property is already rented." });
        if (String(property.landlord) === String(tenantId))
            return res.status(400).json({ success: false, message: "You cannot request your own property." });

        const existing = await rentalRequestModel.findOne({ tenant: tenantId, property: propertyId });
        if (existing) {
            if (existing.status === "Accepted")
                return res.status(400).json({ success: false, message: "Your request for this property is already accepted." });
            if (existing.status === "Pending")
                return res.status(400).json({ success: false, message: "You already have a pending request for this property." });
            existing.status  = "Pending";
            existing.message = message;
            await existing.save();
            return res.status(200).json({ success: true, message: "Request re-sent to landlord.", data: existing });
        }

        const data = await rentalRequestModel.create({
            tenant: tenantId, landlord: property.landlord,
            property: propertyId, message
        });

        res.status(201).json({ success: true, message: "Rental request sent to landlord.", data });
    } catch (e) {
        sendError(res, e);
    }
};

// Tenant withdraws a request that has not been answered yet.
exports.cancelRequest = async (req, res) => {
    try {
        if (req.headers.role !== "tenant")
            return res.status(403).json({ success: false, message: "Only tenants can cancel their requests." });

        const { requestId } = req.params;
        if (!isId(requestId))
            return res.status(400).json({ success: false, message: "Invalid request ID." });

        const request = await rentalRequestModel.findById(requestId);
        if (!request || String(request.tenant) !== String(req.headers._id))
            return res.status(404).json({ success: false, message: "Request not found." });
        if (request.status !== "Pending")
            return res.status(400).json({ success: false, message: `Only pending requests can be cancelled (this one is ${request.status}).` });

        await request.deleteOne();
        res.status(200).json({ success: true, message: "Request cancelled." });
    } catch (e) {
        sendError(res, e);
    }
};

exports.incomingRequests = async (req, res) => {
    try {
        if (req.headers.role !== "landlord")
            return res.status(403).json({ success: false, message: "Only landlords can view incoming requests." });

        const data = await rentalRequestModel.aggregate([
            { $match: { landlord: new mongoose.Types.ObjectId(req.headers._id) } },
            { $lookup: { from: "properties", localField: "property", foreignField: "_id", as: "propertyInfo" } },
            { $lookup: { from: "users",      localField: "tenant",   foreignField: "_id", as: "tenantInfo" } },
            { $project: { "tenantInfo.password": 0, "tenantInfo.isBlocked": 0 } },
            { $sort: { createdAt: -1 } }
        ]);

        res.status(200).json({ success: true, message: "Incoming rental requests", data });
    } catch (e) {
        sendError(res, e);
    }
};

exports.respondRequest = async (req, res) => {
    try {
        if (req.headers.role !== "landlord")
            return res.status(403).json({ success: false, message: "Only landlords can respond to requests." });

        const { requestId } = req.params;
        const { action }    = req.body;

        if (!["accept", "reject"].includes(action))
            return res.status(400).json({ success: false, message: "action must be 'accept' or 'reject'." });
        if (!isId(requestId))
            return res.status(400).json({ success: false, message: "Invalid request ID." });

        const request = await rentalRequestModel.findById(requestId);
        if (!request) return res.status(404).json({ success: false, message: "Request not found." });
        if (String(request.landlord) !== String(req.headers._id))
            return res.status(403).json({ success: false, message: "This request is not for your property." });
        if (request.status !== "Pending")
            return res.status(400).json({ success: false, message: `Request is already ${request.status}.` });

        request.status = action === "accept" ? "Accepted" : "Rejected";
        await request.save();

        res.status(200).json({ success: true, message: `Request ${request.status}.`, data: request });
    } catch (e) {
        sendError(res, e);
    }
};

exports.checkRequestStatus = async (req, res) => {
    try {
        const { propertyId } = req.params;
        if (!isId(propertyId))
            return res.status(400).json({ success: false, message: "Invalid property ID." });

        const request = await rentalRequestModel.findOne({ tenant: req.headers._id, property: propertyId });
        res.status(200).json({ success: true, data: request || null });
    } catch (e) {
        sendError(res, e);
    }
};

exports.myRentalRequests = async (req, res) => {
    try {
        const data = await rentalRequestModel.aggregate([
            { $match: { tenant: new mongoose.Types.ObjectId(req.headers._id) } },
            { $lookup: { from: "properties", localField: "property", foreignField: "_id", as: "propertyInfo" } },
            { $lookup: { from: "users",      localField: "landlord", foreignField: "_id", as: "landlordInfo" } },
            { $project: { "landlordInfo.password": 0, "landlordInfo.email": 0, "landlordInfo.phone": 0, "landlordInfo.isBlocked": 0 } },
            { $sort: { updatedAt: -1 } }
        ]);
        res.status(200).json({ success: true, message: "Your rental requests", data });
    } catch (e) {
        sendError(res, e);
    }
};
