const mongoose      = require("mongoose");
const paymentModel  = require("../models/paymentModel");

// Helper – generate invoice number  e.g. INV-2026-00001
const generateInvoiceNo = async () => {
    let count = await paymentModel.countDocuments();
    let serial = String(count + 1).padStart(5, "0");
    return `INV-${new Date().getFullYear()}-${serial}`;
};

// Generate Invoice (landlord initiates, or tenant can request)
exports.generateInvoice = async (req, res) => {
    try {
        let landlordId = req.headers._id;
        let { tenantId, propertyId, amount, forMonth } = req.body;

        let invoiceNo = await generateInvoiceNo();

        let data = await paymentModel.create({
            tenant:    tenantId,
            landlord:  landlordId,
            property:  propertyId,
            amount,
            forMonth,
            invoiceNo,
            status:    "Pending"
        });

        res.status(201).json({ success: true, message: "Invoice generated successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Mark as Paid (tenant pays)
exports.markAsPaid = async (req, res) => {
    try {
        let { invoiceId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
            return res.status(400).json({ success: false, message: "Invalid invoice ID" });
        }

        let data = await paymentModel.findByIdAndUpdate(
            invoiceId,
            { status: "Paid", paidAt: new Date() },
            { new: true }
        );

        if (!data) {
            return res.status(404).json({ success: false, message: "Invoice not found" });
        }

        res.status(200).json({ success: true, message: "Rent marked as paid", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Payment History (for logged-in user — tenant or landlord)
exports.paymentHistory = async (req, res) => {
    try {
        let userId = new mongoose.Types.ObjectId(req.headers._id);
        let role   = req.headers.role;

        let matchStage = role === "landlord"
            ? { $match: { landlord: userId } }
            : { $match: { tenant: userId } };

        let joinProperty = {
            $lookup: { from: "properties", localField: "property", foreignField: "_id", as: "propertyInfo" }
        };
        let joinTenant = {
            $lookup: { from: "users", localField: "tenant", foreignField: "_id", as: "tenantInfo" }
        };
        let projectStage = {
            $project: {
                "tenantInfo.password": 0
            }
        };
        let sortStage = { $sort: { createdAt: -1 } };

        let data = await paymentModel.aggregate([matchStage, joinProperty, joinTenant, projectStage, sortStage]);

        res.status(200).json({ success: true, message: "Payment history", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Single Invoice
exports.singleInvoice = async (req, res) => {
    try {
        let { invoiceId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
            return res.status(400).json({ success: false, message: "Invalid invoice ID" });
        }

        let matchStage = { $match: { _id: new mongoose.Types.ObjectId(invoiceId) } };
        let joinProperty = {
            $lookup: { from: "properties", localField: "property", foreignField: "_id", as: "propertyInfo" }
        };
        let joinTenant = {
            $lookup: { from: "users", localField: "tenant", foreignField: "_id", as: "tenantInfo" }
        };
        let joinLandlord = {
            $lookup: { from: "users", localField: "landlord", foreignField: "_id", as: "landlordInfo" }
        };
        let projectStage = {
            $project: { "tenantInfo.password": 0, "landlordInfo.password": 0 }
        };

        let data = await paymentModel.aggregate([matchStage, joinProperty, joinTenant, joinLandlord, projectStage]);

        res.status(200).json({ success: true, message: "Invoice details", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

