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
    // Invoice number  e.g. INV-2026-00001
    invoiceNo: {
        type: String,
        unique: true
    },
    // Month being paid for  e.g. "January 2025"
    forMonth: {
        type: String,
        required: true
    },
    // Optional note from landlord e.g. "Includes utility charges"
    note: {
        type: String,
        default: ""
    },
    // Pending | Paid | Overdue
    status: {
        type: String,
        enum: ["Pending", "Paid", "Overdue"],
        default: "Pending"
    },
    // Due date — landlord sets when invoice is issued (default 7 days from creation)
    dueDate: {
        type: Date,
        default: null
    },
    // Pending invoices auto-expire 7 days after creation unless extended by landlord
    expiresAt: {
        type: Date,
        default: null
    },
    // Extra days added by landlord via extend (3–7 days, one-time only)
    extendedDays: {
        type: Number,
        default: 0
    },
    paidAt: {
        type: Date,
        default: null
    },
    // Auto-generated transaction reference on payment e.g. TXN-20260305-XXXXX
    transactionRef: {
        type: String,
        default: null
    },
    // Payment method chosen by tenant
    paymentMethod: {
        type: String,
        enum: ["bKash", "Nagad", "Rocket", "Card", "Bank Transfer", null],
        default: null
    }
}, {
    versionKey: false,
    timestamps: true
});

const paymentModel = mongoose.model("payments", DataSchema);
module.exports = paymentModel;
