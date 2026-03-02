const mongoose = require("mongoose");

const DataSchema = new mongoose.Schema({
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ""
    },
    price: {
        type: Number,
        required: true
    },
    // New | Used
    condition: {
        type: String,
        enum: ["New", "Used"],
        required: true
    },
    images: {
        type: [String],
        default: []
    },
    isRemoved: {
        type: Boolean,
        default: false
    },
    isSold: {
        type: Boolean,
        default: false
    },
    soldAt: {
        type: Date,
        default: null
    },
    buyerInfo: {
        name:    { type: String, default: "" },
        phone:   { type: String, default: "" },
        area:    { type: String, default: "" },
        city:    { type: String, default: "" },
        txnRef:  { type: String, default: "" }
    }
}, {
    versionKey: false,
    timestamps: true
});

const marketplaceModel = mongoose.model("marketplaces", DataSchema);
module.exports = marketplaceModel;

