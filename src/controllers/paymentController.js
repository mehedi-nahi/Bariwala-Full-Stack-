const mongoose           = require("mongoose");
const paymentModel       = require("../models/paymentModel");
const propertyModel      = require("../models/propertyModel");
const rentalRequestModel = require("../models/rentalRequestModel");

// Helper - generate unique invoice number e.g. INV-2026-1709123456-A3F
// Uses timestamp + random hex to avoid countDocuments race condition under concurrent load
const generateInvoiceNo = () => {
    const year   = new Date().getFullYear();
    const ts     = Date.now().toString(36).toUpperCase();          // base-36 timestamp
    const rand   = Math.random().toString(36).slice(2,5).toUpperCase(); // 3 random chars
    return `INV-${year}-${ts}-${rand}`;
};

// Helper — expire any pending invoices whose expiresAt has passed
const autoExpirePending = async () => {
    await paymentModel.updateMany(
        { status: "Pending", expiresAt: { $lte: new Date() } },
        { $set: { status: "Overdue" } }
    );
};

// Generate Invoice (landlord only)
exports.generateInvoice = async (req, res) => {
    try {
        let landlordId = req.headers._id;
        let role       = req.headers.role;

        if (role !== "landlord") {
            return res.status(403).json({ success: false, message: "Only landlords can generate invoices." });
        }

        let { tenantId, propertyId, amount, forMonth, note, dueDays } = req.body;

        if (!tenantId || !propertyId || !forMonth) {
            return res.status(400).json({ success: false, message: "tenantId, propertyId and forMonth are required." });
        }

        // ── GUARD: tenant must have an Accepted rental request for this property ──
        const accepted = await rentalRequestModel.findOne({
            tenant:   tenantId,
            property: propertyId,
            landlord: landlordId,
            status:   "Accepted"
        });
        if (!accepted) {
            return res.status(403).json({
                success: false,
                message: "Cannot generate invoice: this tenant has not been accepted for this property. Accept the tenant's rental request first."
            });
        }

        // Auto-fill amount from property's monthlyRent if not provided
        let finalAmount = amount;
        if (!finalAmount) {
            let prop = await propertyModel.findById(propertyId);
            if (!prop) return res.status(404).json({ success: false, message: "Property not found." });
            finalAmount = prop.monthlyRent;
        }

        // Prevent duplicate invoice for same tenant + property + month
        let existing = await paymentModel.findOne({ tenant: tenantId, property: propertyId, forMonth });
        if (existing) {
            return res.status(400).json({ success: false, message: "Invoice for " + forMonth + " already exists for this tenant and property." });
        }

        // Compute due date - default 7 days
        const days    = parseInt(dueDays) || 7;
        const dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        // expiresAt: always 7 days from creation (pending invoices auto-delete after this)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        let invoiceNo = generateInvoiceNo();

        let data = await paymentModel.create({
            tenant:    tenantId,
            landlord:  landlordId,
            property:  propertyId,
            amount:    finalAmount,
            forMonth:  forMonth,
            invoiceNo: invoiceNo,
            note:      note || "",
            dueDate:   dueDate,
            expiresAt: expiresAt,
            status:    "Pending"
        });

        res.status(201).json({ success: true, message: "Invoice generated successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Extend a pending invoice by 3–7 extra days (landlord only, one-time)
exports.extendInvoice = async (req, res) => {
    try {
        const landlordId = req.headers._id;
        const role       = req.headers.role;

        if (role !== "landlord") {
            return res.status(403).json({ success: false, message: "Only landlords can extend invoices." });
        }

        const { invoiceId } = req.params;
        const { days }      = req.body; // 3–7

        if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
            return res.status(400).json({ success: false, message: "Invalid invoice ID." });
        }

        const extraDays = parseInt(days);
        if (!extraDays || extraDays < 3 || extraDays > 7) {
            return res.status(400).json({ success: false, message: "Extension must be between 3 and 7 days." });
        }

        const invoice = await paymentModel.findById(invoiceId);
        if (!invoice)                                           return res.status(404).json({ success: false, message: "Invoice not found." });
        if (String(invoice.landlord) !== String(landlordId))   return res.status(403).json({ success: false, message: "Not your invoice." });
        if (invoice.status !== "Pending")                      return res.status(400).json({ success: false, message: "Only pending invoices can be extended." });
        if (invoice.extendedDays > 0)                          return res.status(400).json({ success: false, message: "Invoice has already been extended once." });

        // Push expiresAt and dueDate forward
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

// Helper - transaction reference
const generateTxnRef = (method) => {
    const date   = new Date().toISOString().slice(0,10).replace(/-/g,"");
    const suffix = Math.random().toString(36).toUpperCase().slice(2,8);
    const prefixMap = { bKash:"BK", Nagad:"NG", Rocket:"RK", Card:"CD", "Bank Transfer":"BT" };
    const prefix = prefixMap[method] || "TX";
    return prefix + "-" + date + "-" + suffix;
};

// Mark as Paid (tenant pays)
exports.markAsPaid = async (req, res) => {
    try {
        let tenantId = req.headers._id;
        let role     = req.headers.role;

        if (role !== "tenant") {
            return res.status(403).json({ success: false, message: "Only tenants can mark invoices as paid." });
        }

        let { invoiceId } = req.params;
        let { paymentMethod } = req.body;

        const allowedMethods = ["bKash", "Nagad", "Rocket", "Card", "Bank Transfer"];
        if (!paymentMethod || !allowedMethods.includes(paymentMethod)) {
            return res.status(400).json({ success: false, message: "Valid paymentMethod is required." });
        }

        if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
            return res.status(400).json({ success: false, message: "Invalid invoice ID" });
        }

        let invoice = await paymentModel.findById(invoiceId);
        if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found." });
        if (String(invoice.tenant) !== String(tenantId)) {
            return res.status(403).json({ success: false, message: "This invoice does not belong to you." });
        }
        if (invoice.status === "Paid") {
            return res.status(400).json({ success: false, message: "Invoice is already paid." });
        }
        // Allow payment on Overdue invoices too (expired but not deleted)
        if (invoice.status !== "Pending" && invoice.status !== "Overdue") {
            return res.status(400).json({ success: false, message: "Invoice cannot be paid in its current state." });
        }

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

// Payment History (for logged-in user — tenant or landlord)
exports.paymentHistory = async (req, res) => {
    try {
        // Auto-expire before returning results
        await autoExpirePending();

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
        let joinLandlord = {
            $lookup: { from: "users", localField: "landlord", foreignField: "_id", as: "landlordInfo" }
        };
        let projectStage = {
            $project: {
                "tenantInfo.password":   0,
                "landlordInfo.password": 0
            }
        };
        let sortStage = { $sort: { createdAt: -1 } };

        let data = await paymentModel.aggregate([
            matchStage, joinProperty, joinTenant, joinLandlord, projectStage, sortStage
        ]);

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

        let matchStage   = { $match: { _id: new mongoose.Types.ObjectId(invoiceId) } };
        let joinProperty = { $lookup: { from: "properties", localField: "property", foreignField: "_id", as: "propertyInfo" } };
        let joinTenant   = { $lookup: { from: "users", localField: "tenant",   foreignField: "_id", as: "tenantInfo" } };
        let joinLandlord = { $lookup: { from: "users", localField: "landlord", foreignField: "_id", as: "landlordInfo" } };
        let projectStage = { $project: { "tenantInfo.password": 0, "landlordInfo.password": 0 } };

        let data = await paymentModel.aggregate([matchStage, joinProperty, joinTenant, joinLandlord, projectStage]);

        res.status(200).json({ success: true, message: "Invoice details", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};
