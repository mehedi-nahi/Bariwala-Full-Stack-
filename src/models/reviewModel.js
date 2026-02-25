const mongoose = require("mongoose");

const DataSchema = new mongoose.Schema({
    // who writes the review
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    // who is being reviewed
    reviewee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "properties",
        required: true
    },
    // tenant-to-landlord | landlord-to-tenant
    reviewType: {
        type: String,
        enum: ["tenant-to-landlord", "landlord-to-tenant"],
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comment: {
        type: String,
        default: ""
    }
}, {
    versionKey: false,
    timestamps: true
});

const reviewModel = mongoose.model("reviews", DataSchema);
module.exports = reviewModel;

