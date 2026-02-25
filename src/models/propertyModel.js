const mongoose = require("mongoose");

const DataSchema = new mongoose.Schema({
    landlord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    // Flat | Room | Sublet
    propertyType: {
        type: String,
        enum: ["Flat", "Room", "Sublet"],
        required: true
    },
    monthlyRent: {
        type: Number,
        required: true
    },
    advanceDeposit: {
        type: Number,
        default: 0
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    area: {
        type: String,
        required: true,
        trim: true
    },
    // Manual lat/lng  OR google place
    location: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
        mapLink: { type: String, default: "" }
    },
    distanceFromMainRoad: {
        type: String,
        default: ""
    },
    // Array of facility strings: ["Gas","Water","Lift","WiFi"]
    facilities: {
        type: [String],
        default: []
    },
    images: {
        type: [String],
        default: []
    },
    // Available | Rented
    availability: {
        type: String,
        enum: ["Available", "Rented"],
        default: "Available"
    },
    isRemoved: {
        type: Boolean,
        default: false
    }
}, {
    versionKey: false,
    timestamps: true
});

const propertyModel = mongoose.model("properties", DataSchema);
module.exports = propertyModel;

