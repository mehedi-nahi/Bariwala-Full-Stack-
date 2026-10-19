const mongoose           = require("mongoose");
const reviewModel        = require("../models/reviewModel");
const rentalRequestModel = require("../models/rentalRequestModel");
const { sendError }      = require("../utility/errorUtility");
const { isId }           = require("../utility/validators");

exports.createReview = async (req, res) => {
    try {
        let reviewerId = req.headers._id;
        let role       = req.headers.role;
        let { revieweeId, propertyId, reviewType, rating, comment } = req.body;

        if (!["tenant", "landlord"].includes(role))
            return res.status(403).json({ success: false, message: "Only tenant or landlord can submit reviews." });
        if (!isId(revieweeId) || !isId(propertyId))
            return res.status(400).json({ success: false, message: "Invalid user or property." });
        rating = Number(rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5)
            return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
        comment = typeof comment === "string" ? comment.trim() : "";
        if (comment.length > 500)
            return res.status(400).json({ success: false, message: "Comment can be at most 500 characters." });
        if (role === "tenant" && reviewType !== "tenant-to-landlord")
            return res.status(403).json({ success: false, message: "Tenants can only rate landlords." });
        if (role === "landlord" && reviewType !== "landlord-to-tenant")
            return res.status(403).json({ success: false, message: "Landlords can only rate tenants." });
        if (String(revieweeId) === String(reviewerId))
            return res.status(400).json({ success: false, message: "You cannot review yourself." });

        // Reviews must be backed by a real relationship: an accepted rental request between the two.
        const pair = role === "tenant"
            ? { tenant: reviewerId, landlord: revieweeId }
            : { tenant: revieweeId, landlord: reviewerId };
        const accepted = await rentalRequestModel.exists({ ...pair, property: propertyId, status: "Accepted" });
        if (!accepted)
            return res.status(403).json({
                success: false,
                message: role === "tenant"
                    ? "You can review a landlord after your rental request for this property was accepted."
                    : "You can review a tenant after accepting their rental request for this property."
            });

        let existing = await reviewModel.findOne({ reviewer: reviewerId, reviewee: revieweeId, property: propertyId, reviewType });
        if (existing)
            return res.status(400).json({ success: false, message: "You have already reviewed this user for this property." });

        let data = await reviewModel.create({ reviewer: reviewerId, reviewee: revieweeId, property: propertyId, reviewType, rating, comment });
        res.status(201).json({ success: true, message: "Review submitted successfully", data });
    } catch (e) {
        sendError(res, e);
    }
};

exports.userReviews = async (req, res) => {
    try {
        let { userId } = req.params;
        if (!isId(userId))
            return res.status(400).json({ success: false, message: "Invalid user ID" });

        let reviews = await reviewModel.aggregate([
            { $match: { reviewee: new mongoose.Types.ObjectId(userId) } },
            { $lookup: { from: "users",      localField: "reviewer", foreignField: "_id", as: "reviewerInfo" } },
            { $lookup: { from: "properties", localField: "property", foreignField: "_id", as: "propertyInfo" } },
            { $project: { "reviewerInfo.password": 0, "reviewerInfo.email": 0, "reviewerInfo.phone": 0, "reviewerInfo.isBlocked": 0 } },
            { $sort: { createdAt: -1 } }
        ]);

        let avgResult = await reviewModel.aggregate([
            { $match: { reviewee: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: null, avgRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } }
        ]);

        let avgRating    = avgResult.length > 0 ? avgResult[0].avgRating.toFixed(1) : "0";
        let totalReviews = avgResult.length > 0 ? avgResult[0].totalReviews : 0;

        res.status(200).json({ success: true, message: "User reviews", avgRating, totalReviews, data: reviews });
    } catch (e) {
        sendError(res, e);
    }
};
