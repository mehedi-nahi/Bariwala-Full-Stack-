const mongoose           = require("mongoose");
const paymentModel       = require("../models/paymentModel");
const propertyModel      = require("../models/propertyModel");
const rentalRequestModel = require("../models/rentalRequestModel");

const generateInvoiceNo = () => {
    const year = new Date().getFullYear();
    const ts   = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `INV-${year}-${ts}-${rand}`;
};

const autoExpirePending = async () => {
    await paymentModel.updateMany(
        { status: "Pending", expiresAt: { $lte: new Date() } },
        { $set: { status: "Overdue" } }
    );
};

exports.generateInvoice = async (req, res) => {
    try {
        if (req.headers.role !== "landlord")
            return res.status(403).json({ success: false, message: "Only landlords can generate invoices." });

        let landlordId = req.headers._id;
        let { tenantId, propertyId, amount, forMonth, note, dueDays } = req.body;

        if (!tenantId || !propertyId || !forMonth)
            return res.status(400).json({ success: false, message: "tenantId, propertyId and forMonth are required." });

        const accepted = await rentalRequestModel.findOne({
            tenant: tenantId, property: propertyId, landlord: landlordId, status: "Accepted"
        });
        if (!accepted)
            return res.status(403).json({ success: false, message: "Cannot generate invoice: tenant has not been accepted for this property." });

        let finalAmount = amount;
        if (!finalAmount) {
            let prop = await propertyModel.findById(propertyId);
            if (!prop) return res.status(404).json({ success: false, message: "Property not found." });
            finalAmount = prop.monthlyRent;
        }

        let existing = await paymentModel.findOne({ tenant: tenantId, property: propertyId, forMonth });
        if (existing)
            return res.status(400).json({ success: false, message: `Invoice for ${forMonth} already exists for this tenant and property.` });

        const days      = parseInt(dueDays) || 7;
        const dueDate   = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        let data = await paymentModel.create({
            tenant: tenantId, landlord: landlordId, property: propertyId,
            amount: finalAmount, forMonth, invoiceNo: generateInvoiceNo(),
            note: note || "", dueDate, expiresAt, status: "Pending"
        });

        res.status(201).json({ success: true, message: "Invoice generated successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.extendInvoice = async (req, res) => {
    try {
        if (req.headers.role !== "landlord")
            return res.status(403).json({ success: false, message: "Only landlords can extend invoices." });

        const { invoiceId } = req.params;
        const extraDays = parseInt(req.body.days);

        if (!mongoose.Types.ObjectId.isValid(invoiceId))
            return res.status(400).json({ success: false, message: "Invalid invoice ID." });
        if (!extraDays || extraDays < 3 || extraDays > 7)
            return res.status(400).json({ success: false, message: "Extension must be between 3 and 7 days." });

        const invoice = await paymentModel.findById(invoiceId);
        if (!invoice)                                           return res.status(404).json({ success: false, message: "Invoice not found." });
        if (String(invoice.landlord) !== String(req.headers._id)) return res.status(403).json({ success: false, message: "Not your invoice." });
        if (invoice.status !== "Pending")                      return res.status(400).json({ success: false, message: "Only pending invoices can be extended." });
        if (invoice.extendedDays > 0)                         return res.status(400).json({ success: false, message: "Invoice has already been extended once." });

        const newExpiresAt = new Date((invoice.expiresAt || new Date()).getTime() + extraDays * 24 * 60 * 60 * 1000);
        const newDueDate   = new Date((invoice.dueDate   || new Date()).getTime() + extraDays * 24 * 60 * 60 * 1000);

        const updated = await paymentModel.findByIdAndUpdate(
            invoiceId,
            { expiresAt: newExpiresAt, dueDate: newDueDate, extendedDays: extraDays },
            { new: true }
        );

        res.status(200).json({ success: true, message: `Invoice extended by ${extraDays} days.`, data: updated });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

const generateTxnRef = (method) => {
    const date   = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const suffix = Math.random().toString(36).toUpperCase().slice(2, 8);
    const prefix = { bKash: "BK", Nagad: "NG", Rocket: "RK", Card: "CD", "Bank Transfer": "BT" }[method] || "TX";
    return `${prefix}-${date}-${suffix}`;
};

exports.markAsPaid = async (req, res) => {
    try {
        if (req.headers.role !== "tenant")
            return res.status(403).json({ success: false, message: "Only tenants can mark invoices as paid." });

        let { invoiceId } = req.params;
        let { paymentMethod } = req.body;

        const allowedMethods = ["bKash", "Nagad", "Rocket", "Card", "Bank Transfer"];
        if (!paymentMethod || !allowedMethods.includes(paymentMethod))
            return res.status(400).json({ success: false, message: "Valid paymentMethod is required." });
        if (!mongoose.Types.ObjectId.isValid(invoiceId))
            return res.status(400).json({ success: false, message: "Invalid invoice ID" });

        let invoice = await paymentModel.findById(invoiceId);
        if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found." });
        if (String(invoice.tenant) !== String(req.headers._id))
            return res.status(403).json({ success: false, message: "This invoice does not belong to you." });
        if (invoice.status === "Paid")
            return res.status(400).json({ success: false, message: "Invoice is already paid." });
        if (invoice.status !== "Pending" && invoice.status !== "Overdue")
            return res.status(400).json({ success: false, message: "Invoice cannot be paid in its current state." });

        const txnRef = generateTxnRef(paymentMethod);
        let data = await paymentModel.findByIdAndUpdate(
            invoiceId,
            { status: "Paid", paidAt: new Date(), transactionRef: txnRef, paymentMethod },
            { new: true }
        );

        res.status(200).json({ success: true, message: "Payment successful", transactionRef: txnRef, paymentMethod, data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.paymentHistory = async (req, res) => {
    try {
        await autoExpirePending();

        let userId = new mongoose.Types.ObjectId(req.headers._id);
        let role   = req.headers.role;
        let matchField = role === "landlord" ? { landlord: userId } : { tenant: userId };

        let data = await paymentModel.aggregate([
            { $match: matchField },
            { $lookup: { from: "properties", localField: "property", foreignField: "_id", as: "propertyInfo" } },
            { $lookup: { from: "users",      localField: "tenant",   foreignField: "_id", as: "tenantInfo" } },
            { $lookup: { from: "users",      localField: "landlord", foreignField: "_id", as: "landlordInfo" } },
            { $project: { "tenantInfo.password": 0, "landlordInfo.password": 0 } },
            { $sort: { createdAt: -1 } }
        ]);

        res.status(200).json({ success: true, message: "Payment history", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.singleInvoice = async (req, res) => {
    try {
        let { invoiceId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(invoiceId))
            return res.status(400).json({ success: false, message: "Invalid invoice ID" });

        let data = await paymentModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(invoiceId) } },
            { $lookup: { from: "properties", localField: "property", foreignField: "_id", as: "propertyInfo" } },
            { $lookup: { from: "users",      localField: "tenant",   foreignField: "_id", as: "tenantInfo" } },
            { $lookup: { from: "users",      localField: "landlord", foreignField: "_id", as: "landlordInfo" } },
            { $project: { "tenantInfo.password": 0, "landlordInfo.password": 0 } }
        ]);

        res.status(200).json({ success: true, message: "Invoice details", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};
