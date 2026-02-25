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
    }
}, {
    versionKey: false,
    timestamps: true
});

const marketplaceModel = mongoose.model("marketplaces", DataSchema);
module.exports = marketplaceModel;

