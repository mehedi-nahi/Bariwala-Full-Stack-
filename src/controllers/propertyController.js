const mongoose       = require("mongoose");
const propertyModel  = require("../models/propertyModel");

// Create Property
exports.createProperty = async (req, res) => {
    try {
        let landlordId = req.headers._id;
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
        let { area, minRent, maxRent, propertyType, pageNo = 1, perPage = 10 } = req.query;

        let matchStage = { isRemoved: false };

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
        let { propertyType, monthlyRent, advanceDeposit, address, area,
              location, distanceFromMainRoad, facilities, availability } = req.body;

        let data = await propertyModel.findByIdAndUpdate(
            id,
            { propertyType, monthlyRent, advanceDeposit, address, area,
              location, distanceFromMainRoad, facilities, availability },
            { new: true }
        );
        res.status(200).json({ success: true, message: "Property updated successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Delete Property
exports.deleteProperty = async (req, res) => {
    try {
        let { id } = req.params;
        let data = await propertyModel.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Property deleted successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Change Availability
exports.changeAvailability = async (req, res) => {
    try {
        let { id } = req.params;
        let { availability } = req.body;  // "Available" or "Rented"

        let data = await propertyModel.findByIdAndUpdate(id, { availability }, { new: true });
        res.status(200).json({ success: true, message: "Availability updated", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

