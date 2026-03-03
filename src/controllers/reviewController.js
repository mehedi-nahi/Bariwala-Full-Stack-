const mongoose     = require("mongoose");
const reviewModel  = require("../models/reviewModel");

// Create Review
exports.createReview = async (req, res) => {
    try {
        let reviewerId = req.headers._id;
        let role       = req.headers.role;
        let { revieweeId, propertyId, reviewType, rating, comment } = req.body;

        // Only tenant and landlord can submit reviews
        if (!["tenant", "landlord"].includes(role)) {
            return res.status(403).json({ success: false, message: "Only tenant or landlord can submit reviews." });
        }

        // Validate rating range 1–5
        if (!rating || Number(rating) < 1 || Number(rating) > 5) {
            return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
        }

        // Tenant can only submit tenant-to-landlord review
        if (role === "tenant" && reviewType !== "tenant-to-landlord") {
            return res.status(403).json({ success: false, message: "Tenants can only rate landlords." });
        }

        // Landlord can only submit landlord-to-tenant review
        if (role === "landlord" && reviewType !== "landlord-to-tenant") {
            return res.status(403).json({ success: false, message: "Landlords can only rate tenants." });
        }

        // prevent duplicate review for same property by same reviewer
        let existing = await reviewModel.findOne({
            reviewer: reviewerId,
            reviewee: revieweeId,
            property: propertyId,
            reviewType
        });

        if (existing) {
            return res.status(400).json({ success: false, message: "You have already reviewed this user for this property." });
        }

        let data = await reviewModel.create({
            reviewer:   reviewerId,
            reviewee:   revieweeId,
            property:   propertyId,
            reviewType,
            rating,
            comment
        });

        res.status(201).json({ success: true, message: "Review submitted successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// All Reviews for a User (with avg rating)
exports.userReviews = async (req, res) => {
    try {
        let { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        let matchStage = { $match: { reviewee: new mongoose.Types.ObjectId(userId) } };

        let joinReviewer = {
            $lookup: { from: "users", localField: "reviewer", foreignField: "_id", as: "reviewerInfo" }
        };

        let joinProperty = {
            $lookup: { from: "properties", localField: "property", foreignField: "_id", as: "propertyInfo" }
        };

        let projectStage = {
            $project: { "reviewerInfo.password": 0 }
        };

        let sortStage = { $sort: { createdAt: -1 } };

        let reviews = await reviewModel.aggregate([matchStage, joinReviewer, joinProperty, projectStage, sortStage]);

        // calculate average rating
        let avgResult = await reviewModel.aggregate([
            { $match: { reviewee: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: null, avgRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } }
        ]);

        let avgRating    = avgResult.length > 0 ? avgResult[0].avgRating.toFixed(1) : "0";
        let totalReviews = avgResult.length > 0 ? avgResult[0].totalReviews : 0;

        res.status(200).json({
            success: true,
            message: "User reviews",
            avgRating,
            totalReviews,
            data: reviews
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};
