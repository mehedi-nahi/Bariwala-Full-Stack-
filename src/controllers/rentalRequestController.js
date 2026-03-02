const mongoose           = require("mongoose");
const rentalRequestModel = require("../models/rentalRequestModel");
const propertyModel      = require("../models/propertyModel");

// ── Tenant: Send a rental request for a property ──────────────────────────
exports.sendRequest = async (req, res) => {
    try {
        const tenantId   = req.headers._id;
        const role       = req.headers.role;

        if (role !== "tenant") {
            return res.status(403).json({ success: false, message: "Only tenants can send rental requests." });
        }

        const { propertyId, message } = req.body;

        if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId)) {
            return res.status(400).json({ success: false, message: "Valid propertyId is required." });
        }

        // Fetch property to get landlord
        const property = await propertyModel.findById(propertyId);
        if (!property) return res.status(404).json({ success: false, message: "Property not found." });
        if (property.isRemoved) {
            return res.status(404).json({ success: false, message: "Property not found." });
        }
        if (property.availability === "Rented") {
            return res.status(400).json({ success: false, message: "This property is already rented." });
        }

        if (String(property.landlord) === String(tenantId)) {
            return res.status(400).json({ success: false, message: "You cannot request your own property." });
        }

        // Upsert — if already exists, just update message (re-opens a rejected request)
        const existing = await rentalRequestModel.findOne({ tenant: tenantId, property: propertyId });

        if (existing) {
            if (existing.status === "Accepted") {
                return res.status(400).json({ success: false, message: "Your request for this property is already accepted." });
            }
            if (existing.status === "Pending") {
                return res.status(400).json({ success: false, message: "You already have a pending request for this property." });
            }
            // Rejected — allow re-request
            existing.status  = "Pending";
            existing.message = message || "";
            await existing.save();
            return res.status(200).json({ success: true, message: "Request re-sent to landlord.", data: existing });
        }

        const data = await rentalRequestModel.create({
            tenant:   tenantId,
            landlord: property.landlord,
            property: propertyId,
            message:  message || ""
        });

        res.status(201).json({ success: true, message: "Rental request sent to landlord.", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// ── Landlord: View incoming requests ──────────────────────────────────────
exports.incomingRequests = async (req, res) => {
    try {
        const landlordId = req.headers._id;
        const role       = req.headers.role;

        if (role !== "landlord") {
            return res.status(403).json({ success: false, message: "Only landlords can view incoming requests." });
        }

        const data = await rentalRequestModel.aggregate([
            { $match: { landlord: new mongoose.Types.ObjectId(landlordId) } },
            { $lookup: { from: "properties", localField: "property", foreignField: "_id", as: "propertyInfo" } },
            { $lookup: { from: "users",      localField: "tenant",   foreignField: "_id", as: "tenantInfo"   } },
            { $project: { "tenantInfo.password": 0 } },
            { $sort: { createdAt: -1 } }
        ]);

        res.status(200).json({ success: true, message: "Incoming rental requests", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// ── Landlord: Accept or Reject a request ──────────────────────────────────
exports.respondRequest = async (req, res) => {
    try {
        const landlordId = req.headers._id;
        const role       = req.headers.role;

        if (role !== "landlord") {
            return res.status(403).json({ success: false, message: "Only landlords can respond to requests." });
        }

        const { requestId } = req.params;
        const { action }    = req.body; // "accept" | "reject"

        if (!["accept", "reject"].includes(action)) {
            return res.status(400).json({ success: false, message: "action must be 'accept' or 'reject'." });
        }

        if (!mongoose.Types.ObjectId.isValid(requestId)) {
            return res.status(400).json({ success: false, message: "Invalid request ID." });
        }

        const request = await rentalRequestModel.findById(requestId);
        if (!request) return res.status(404).json({ success: false, message: "Request not found." });

        if (String(request.landlord) !== String(landlordId)) {
            return res.status(403).json({ success: false, message: "This request is not for your property." });
        }

        if (request.status !== "Pending") {
            return res.status(400).json({ success: false, message: `Request is already ${request.status}.` });
        }

        request.status = action === "accept" ? "Accepted" : "Rejected";
        await request.save();

        res.status(200).json({ success: true, message: `Request ${request.status}.`, data: request });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// ── Check request status for a tenant+property (used by frontend) ─────────
exports.checkRequestStatus = async (req, res) => {
    try {
        const userId     = req.headers._id;
        const { propertyId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(propertyId)) {
            return res.status(400).json({ success: false, message: "Invalid property ID." });
        }

        const request = await rentalRequestModel.findOne({ tenant: userId, property: propertyId });
        res.status(200).json({ success: true, data: request || null });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};
