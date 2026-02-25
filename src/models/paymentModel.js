const mongoose = require("mongoose");

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
    amount: {
        type: Number,
        required: true
    },
    // Invoice number  e.g. INV-2024-0001
    invoiceNo: {
        type: String,
        unique: true
    },
    // Month being paid for  e.g. "January 2025"
    forMonth: {
        type: String,
        required: true
    },
    // Pending | Paid
    status: {
        type: String,
        enum: ["Pending", "Paid"],
        default: "Pending"
    },
    paidAt: {
        type: Date,
        default: null
    }
}, {
    versionKey: false,
    timestamps: true
});

const paymentModel = mongoose.model("payments", DataSchema);
module.exports = paymentModel;

