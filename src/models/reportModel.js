const mongoose = require("mongoose");

const DataSchema = new mongoose.Schema({
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    // property | user | marketplace
    reportType: {
        type: String,
        enum: ["property", "user", "marketplace"],
        required: true
    },
    // the id of the reported entity
    reportedEntity: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    // Pending | Reviewed | Resolved
    status: {
        type: String,
        enum: ["Pending", "Reviewed", "Resolved"],
        default: "Pending"
    }
}, {
    versionKey: false,
    timestamps: true
});

const reportModel = mongoose.model("reports", DataSchema);
module.exports = reportModel;

