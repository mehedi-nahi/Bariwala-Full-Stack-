const mongoose       = require("mongoose");
const propertyModel  = require("../models/propertyModel");

// Create Property
exports.createProperty = async (req, res) => {
    try {
        let landlordId = req.headers._id;
        let role       = req.headers.role;

        // Only landlord can add a property
        if (role !== "landlord") {
            return res.status(403).json({ success: false, message: "Only landlords can add properties." });
        }

        let { propertyType, monthlyRent, advanceDeposit, address, area,
              location, distanceFromMainRoad, facilities, availability } = req.body;

        // collect uploaded image filenames
        let images = req.files ? req.files.map(f => f.filename) : [];

        // facilities might come as JSON string from form-data
        let parsedFacilities = facilities;
        if (typeof facilities === "string") {
            try { parsedFacilities = JSON.parse(facilities); } catch { parsedFacilities = [facilities]; }
        }

        let parsedLocation = location;
        if (typeof location === "string") {
            try { parsedLocation = JSON.parse(location); } catch { parsedLocation = {}; }
        }

        let data = await propertyModel.create({
            landlord: landlordId,
            propertyType, monthlyRent, advanceDeposit,
            address, area,
            location: parsedLocation,
            distanceFromMainRoad,
            facilities: parsedFacilities,
            images, availability
        });

        res.status(201).json({ success: true, message: "Property created successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// All Properties (public — with search & filters)
exports.allProperties = async (req, res) => {
    try {
        let { area, minRent, maxRent, propertyType, availability, pageNo = 1, perPage = 20 } = req.query;

        let matchStage = { isRemoved: false };

        const role = req.headers.role;
        const canViewRented = role === "landlord" || role === "admin";

        // If no availability filter is specified default to Available for public browsing
        if (availability && canViewRented) {
            matchStage.availability = availability;
        } else {
            matchStage.availability = "Available";
        }

        if (area)         matchStage.area         = { $regex: area, $options: "i" };
        if (propertyType) matchStage.propertyType  = propertyType;
        if (minRent || maxRent) {
            matchStage.monthlyRent = {};
            if (minRent) matchStage.monthlyRent.$gte = Number(minRent);
            if (maxRent) matchStage.monthlyRent.$lte = Number(maxRent);
        }

        let skipRow  = (Number(pageNo) - 1) * Number(perPage);

        let faceStage = {
            $facet: {
                totalCount:  [{ $count: "count" }],
                properties: [
                    { $sort:  { createdAt: -1 } },
                    { $skip:  skipRow },
                    { $limit: Number(perPage) }
                ]
            }
        };

        let result = await propertyModel.aggregate([
            { $match: matchStage },
            faceStage
        ]);

        res.status(200).json({ success: true, message: "All properties", data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Single Property
exports.singleProperty = async (req, res) => {
    try {
        let { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid property ID" });
        }

        const role = req.headers.role;
        const userId = req.headers._id;

        const property = await propertyModel.findById(id).select("landlord availability isRemoved").lean();
        if (!property || property.isRemoved) {
            return res.status(404).json({ success: false, message: "Property not found." });
        }

        const isOwner = userId && String(property.landlord) === String(userId);
        const canViewRented = role === "landlord" || role === "admin" || isOwner;
        if (property.availability !== "Available" && !canViewRented) {
            return res.status(404).json({ success: false, message: "Property not found." });
        }

        let matchStage = { $match: { _id: new mongoose.Types.ObjectId(id) } };
        let joinLandlord = {
            $lookup: { from: "users", localField: "landlord", foreignField: "_id", as: "landlordInfo" }
        };
        let joinReviews = {
            $lookup: { from: "reviews", localField: "_id", foreignField: "property", as: "reviews" }
        };

        let data = await propertyModel.aggregate([matchStage, joinLandlord, joinReviews]);
        res.status(200).json({ success: true, message: "Property details", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// My Properties (landlord)
exports.myProperties = async (req, res) => {
    try {
        let landlordId = req.headers._id;
        let data = await propertyModel.find({ landlord: landlordId, isRemoved: false }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, message: "Your properties", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Update Property
exports.updateProperty = async (req, res) => {
    try {
        let { id } = req.params;
        let landlordId = req.headers._id;

        // Verify ownership
        const existing = await propertyModel.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: "Property not found." });
        if (String(existing.landlord) !== String(landlordId)) {
            return res.status(403).json({ success: false, message: "You can only update your own properties." });
        }

        let { propertyType, monthlyRent, advanceDeposit, address, area,
              location, distanceFromMainRoad, facilities, availability } = req.body;

        // parse facilities if sent as JSON string from FormData
        let parsedFacilities = facilities;
        if (typeof facilities === "string") {
            try { parsedFacilities = JSON.parse(facilities); } catch { parsedFacilities = [facilities]; }
        }

        let updateData = {
            propertyType, monthlyRent, advanceDeposit,
            address, area, location, distanceFromMainRoad,
            facilities: parsedFacilities, availability
        };

        // if new images were uploaded, replace existing images
        if (req.files && req.files.length > 0) {
            updateData.images = req.files.map(f => f.filename);
        }

        let data = await propertyModel.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json({ success: true, message: "Property updated successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Delete Property
exports.deleteProperty = async (req, res) => {
    try {
        let { id } = req.params;
        let landlordId = req.headers._id;

        const existing = await propertyModel.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: "Property not found." });
        if (String(existing.landlord) !== String(landlordId)) {
            return res.status(403).json({ success: false, message: "You can only delete your own properties." });
        }

        let data = await propertyModel.findByIdAndUpdate(id, { isRemoved: true }, { new: true });
        res.status(200).json({ success: true, message: "Property deleted successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Change Availability
exports.changeAvailability = async (req, res) => {
    try {
        let { id } = req.params;
        let landlordId = req.headers._id;
        let { availability } = req.body;  // "Available" or "Rented"

        const existing = await propertyModel.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: "Property not found." });
        if (String(existing.landlord) !== String(landlordId)) {
            return res.status(403).json({ success: false, message: "You can only update your own properties." });
        }

        let data = await propertyModel.findByIdAndUpdate(id, { availability }, { new: true });
        res.status(200).json({ success: true, message: "Availability updated", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};
