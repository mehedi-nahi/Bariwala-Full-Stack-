const mongoose = require("mongoose");

// A tenant sends a rental request to a landlord for a specific property.
// Landlord must Accept the request before an invoice can be generated for that tenant.
const DataSchema = new mongoose.Schema({
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    landlord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "properties",
        required: true
    },
    // Optional message from the tenant when requesting
    message: {
        type: String,
        default: "",
        trim: true
    },
    // Pending | Accepted | Rejected
    status: {
        type: String,
        enum: ["Pending", "Accepted", "Rejected"],
        default: "Pending"
    }
}, {
    versionKey: false,
    timestamps: true
});

// One active request per tenant per property at a time
DataSchema.index({ tenant: 1, property: 1 }, { unique: true });

const rentalRequestModel = mongoose.model("rentalrequests", DataSchema);
module.exports = rentalRequestModel;

