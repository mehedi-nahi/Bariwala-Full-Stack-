const mongoose      = require("mongoose");
const propertyModel = require("../models/propertyModel");
const rentalRequestModel = require("../models/rentalRequestModel");
const { sendError }                  = require("../utility/errorUtility");
const { isId, escapeRegex, clampInt } = require("../utility/validators");

const PROPERTY_TYPES = ["Flat", "Room", "Sublet"];
const AVAILABILITY   = ["Available", "Rented"];

const parseJSON = (value, fallback) => {
    if (typeof value !== "string") return value ?? fallback;
    try { return JSON.parse(value); } catch { return fallback; }
};

const toNumberOrNull = (v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
};

// Normalises the free-form location object coming from the form.
const cleanLocation = (raw) => {
    const loc = parseJSON(raw, {});
    const lat = toNumberOrNull(loc?.lat);
    const lng = toNumberOrNull(loc?.lng);
    return {
        lat: Number.isNaN(lat) || lat === null ? 0 : lat,
        lng: Number.isNaN(lng) || lng === null ? 0 : lng,
        mapLink: typeof loc?.mapLink === "string" ? loc.mapLink.trim() : "",
    };
};

const cleanFacilities = (raw) => {
    let list = parseJSON(raw, []);
    if (typeof list === "string") list = [list];
    if (!Array.isArray(list)) return [];
    return [...new Set(list.map(f => String(f).trim()).filter(Boolean))].slice(0, 20);
};

// Returns an error string when the numeric / enum fields are not acceptable, otherwise null.
const validateCore = ({ propertyType, monthlyRent, advanceDeposit, availability }, { partial = false } = {}) => {
    if (!partial || propertyType !== undefined)
        if (!PROPERTY_TYPES.includes(propertyType)) return "Property type must be Flat, Room or Sublet.";
    if (!partial || monthlyRent !== undefined) {
        const rent = Number(monthlyRent);
        if (!Number.isFinite(rent) || rent <= 0) return "Monthly rent must be a number greater than 0.";
    }
    if (advanceDeposit !== undefined && advanceDeposit !== "") {
        const dep = Number(advanceDeposit);
        if (!Number.isFinite(dep) || dep < 0) return "Advance deposit cannot be negative.";
    }
    if (availability !== undefined && !AVAILABILITY.includes(availability))
        return "Availability must be Available or Rented.";
    return null;
};

exports.createProperty = async (req, res) => {
    try {
        let landlordId = req.headers._id;
        if (req.headers.role !== "landlord")
            return res.status(403).json({ success: false, message: "Only landlords can add properties." });

        const body = req.body;
        const problem = validateCore(body);
        if (problem) return res.status(400).json({ success: false, message: problem });
        if (!body.address?.trim() || !body.area?.trim())
            return res.status(400).json({ success: false, message: "Area and full address are required." });

        let images = req.files ? req.files.map(f => f.path) : [];

        let data = await propertyModel.create({
            landlord: landlordId,
            propertyType: body.propertyType,
            monthlyRent: Number(body.monthlyRent),
            advanceDeposit: body.advanceDeposit === "" || body.advanceDeposit === undefined ? 0 : Number(body.advanceDeposit),
            address: body.address.trim(),
            area: body.area.trim(),
            location: cleanLocation(body.location),
            distanceFromMainRoad: (body.distanceFromMainRoad || "").trim(),
            facilities: cleanFacilities(body.facilities),
            images,
            availability: body.availability || "Available"
        });

        res.status(201).json({ success: true, message: "Property created successfully", data });
    } catch (e) {
        sendError(res, e);
    }
};

exports.allProperties = async (req, res) => {
    try {
        let { area, q, minRent, maxRent, propertyType, availability, facilities, sort } = req.query;
        const pageNo  = clampInt(req.query.pageNo, 1, 1, 100000);
        const perPage = clampInt(req.query.perPage, 20, 1, 50);

        let matchStage = { isRemoved: false };
        const role = req.headers.role;

        if (availability && (role === "landlord" || role === "admin")) {
            matchStage.availability = availability;
        } else {
            matchStage.availability = "Available";
        }

        // `area` kept for backwards compatibility; `q` searches area OR address.
        const text = (typeof q === "string" && q.trim()) || (typeof area === "string" && area.trim()) || "";
        if (text) {
            const rx = { $regex: escapeRegex(text), $options: "i" };
            matchStage.$or = [{ area: rx }, { address: rx }];
        }
        if (propertyType && PROPERTY_TYPES.includes(propertyType)) matchStage.propertyType = propertyType;
        if (minRent || maxRent) {
            matchStage.monthlyRent = {};
            if (minRent && !Number.isNaN(Number(minRent))) matchStage.monthlyRent.$gte = Number(minRent);
            if (maxRent && !Number.isNaN(Number(maxRent))) matchStage.monthlyRent.$lte = Number(maxRent);
            if (!Object.keys(matchStage.monthlyRent).length) delete matchStage.monthlyRent;
        }
        if (typeof facilities === "string" && facilities.trim()) {
            const list = facilities.split(",").map(f => f.trim()).filter(Boolean);
            if (list.length) matchStage.facilities = { $all: list };
        }

        const sortStage =
            sort === "price-asc"  ? { monthlyRent:  1, _id: -1 } :
            sort === "price-desc" ? { monthlyRent: -1, _id: -1 } :
                                    { createdAt:   -1, _id: -1 };

        let result = await propertyModel.aggregate([
            { $match: matchStage },
            {
                $facet: {
                    totalCount:  [{ $count: "count" }],
                    properties: [
                        { $sort: sortStage },
                        { $skip: (pageNo - 1) * perPage },
                        { $limit: perPage }
                    ]
                }
            }
        ]);

        res.status(200).json({ success: true, message: "All properties", data: result });
    } catch (e) {
        sendError(res, e);
    }
};

exports.singleProperty = async (req, res) => {
    try {
        let { id } = req.params;
        if (!isId(id))
            return res.status(400).json({ success: false, message: "Invalid property ID" });

        const role   = req.headers.role;
        const userId = req.headers._id;
        const property = await propertyModel.findById(id).select("landlord availability isRemoved").lean();

        if (!property || property.isRemoved)
            return res.status(404).json({ success: false, message: "Property not found." });

        const isOwner = userId && String(property.landlord) === String(userId);
        if (property.availability !== "Available" && role !== "admin" && !isOwner) {
            // tenants who already have a request for this property may still open it
            const hasRequest = userId && role === "tenant" &&
                await rentalRequestModel.exists({ tenant: userId, property: id });
            if (!hasRequest)
                return res.status(404).json({ success: false, message: "This property is no longer available." });
        }

        let data = await propertyModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },
            { $lookup: { from: "users",    localField: "landlord", foreignField: "_id", as: "landlordInfo" } },
            { $lookup: { from: "reviews",  localField: "_id",      foreignField: "property", as: "reviews" } },
            // never ship the password hash or private contact details of the landlord to the browser (use in-app messaging)
            { $project: { "landlordInfo.password": 0, "landlordInfo.email": 0, "landlordInfo.phone": 0, "landlordInfo.isBlocked": 0 } }
        ]);

        res.status(200).json({ success: true, message: "Property details", data });
    } catch (e) {
        sendError(res, e);
    }
};

exports.myProperties = async (req, res) => {
    try {
        let data = await propertyModel.find({ landlord: req.headers._id, isRemoved: false }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, message: "Your properties", data });
    } catch (e) {
        sendError(res, e);
    }
};

exports.updateProperty = async (req, res) => {
    try {
        let { id } = req.params;
        let landlordId = req.headers._id;
        if (!isId(id)) return res.status(400).json({ success: false, message: "Invalid property ID" });

        const existing = await propertyModel.findById(id);
        if (!existing || existing.isRemoved) return res.status(404).json({ success: false, message: "Property not found." });
        if (String(existing.landlord) !== String(landlordId))
            return res.status(403).json({ success: false, message: "You can only update your own properties." });

        const body = req.body;
        const problem = validateCore(body, { partial: true });
        if (problem) return res.status(400).json({ success: false, message: problem });

        const updateData = {};
        if (body.propertyType !== undefined)  updateData.propertyType = body.propertyType;
        if (body.monthlyRent !== undefined)   updateData.monthlyRent = Number(body.monthlyRent);
        if (body.advanceDeposit !== undefined) updateData.advanceDeposit = body.advanceDeposit === "" ? 0 : Number(body.advanceDeposit);
        if (body.address !== undefined) {
            if (!body.address.trim()) return res.status(400).json({ success: false, message: "Address cannot be empty." });
            updateData.address = body.address.trim();
        }
        if (body.area !== undefined) {
            if (!body.area.trim()) return res.status(400).json({ success: false, message: "Area cannot be empty." });
            updateData.area = body.area.trim();
        }
        if (body.distanceFromMainRoad !== undefined) updateData.distanceFromMainRoad = body.distanceFromMainRoad.trim();
        if (body.availability !== undefined)  updateData.availability = body.availability;
        if (body.facilities !== undefined)    updateData.facilities = cleanFacilities(body.facilities);
        if (body.location !== undefined)      updateData.location = cleanLocation(body.location);

        if (req.files && req.files.length > 0)
            updateData.images = req.files.map(f => f.path);

        let data = await propertyModel.findByIdAndUpdate(id, updateData, { returnDocument: "after", runValidators: true });
        res.status(200).json({ success: true, message: "Property updated successfully", data });
    } catch (e) {
        sendError(res, e);
    }
};

exports.deleteProperty = async (req, res) => {
    try {
        let { id } = req.params;
        let landlordId = req.headers._id;
        if (!isId(id)) return res.status(400).json({ success: false, message: "Invalid property ID" });

        const existing = await propertyModel.findById(id);
        if (!existing || existing.isRemoved) return res.status(404).json({ success: false, message: "Property not found." });
        if (String(existing.landlord) !== String(landlordId))
            return res.status(403).json({ success: false, message: "You can only delete your own properties." });

        let data = await propertyModel.findByIdAndUpdate(id, { isRemoved: true }, { returnDocument: "after" });
        // tenants should not be left waiting on a listing that no longer exists
        await rentalRequestModel.updateMany({ property: id, status: "Pending" }, { $set: { status: "Rejected" } });
        res.status(200).json({ success: true, message: "Property deleted successfully", data });
    } catch (e) {
        sendError(res, e);
    }
};

exports.changeAvailability = async (req, res) => {
    try {
        let { id } = req.params;
        let landlordId = req.headers._id;
        if (!isId(id)) return res.status(400).json({ success: false, message: "Invalid property ID" });
        if (!AVAILABILITY.includes(req.body.availability))
            return res.status(400).json({ success: false, message: "Availability must be Available or Rented." });

        const existing = await propertyModel.findById(id);
        if (!existing || existing.isRemoved) return res.status(404).json({ success: false, message: "Property not found." });
        if (String(existing.landlord) !== String(landlordId))
            return res.status(403).json({ success: false, message: "You can only update your own properties." });

        let data = await propertyModel.findByIdAndUpdate(id, { availability: req.body.availability }, { returnDocument: "after" });
        res.status(200).json({ success: true, message: "Availability updated", data });
    } catch (e) {
        sendError(res, e);
    }
};
