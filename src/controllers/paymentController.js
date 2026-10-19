const mongoose           = require("mongoose");
const paymentModel       = require("../models/paymentModel");
const propertyModel      = require("../models/propertyModel");
const rentalRequestModel = require("../models/rentalRequestModel");
const { sendError }      = require("../utility/errorUtility");
const { isId }           = require("../utility/validators");

const generateInvoiceNo = () => {
    const year = new Date().getFullYear();
    const ts   = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `INV-${year}-${ts}-${rand}`;
};

const MONTH_RE = /^(January|February|March|April|May|June|July|August|September|October|November|December) (20\d{2})$/;

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
        if (!isId(tenantId) || !isId(propertyId))
            return res.status(400).json({ success: false, message: "Invalid tenant or property." });
        if (amount !== undefined && amount !== "" && (!Number.isFinite(Number(amount)) || Number(amount) <= 0))
            return res.status(400).json({ success: false, message: "Amount must be a number greater than 0." });
        if (dueDays !== undefined && dueDays !== "" && (!Number.isInteger(Number(dueDays)) || Number(dueDays) < 1 || Number(dueDays) > 30))
            return res.status(400).json({ success: false, message: "Due days must be a whole number between 1 and 30." });
        if (!MONTH_RE.test(String(forMonth)))
            return res.status(400).json({ success: false, message: "forMonth must look like \"October 2026\"." });
        if (note && String(note).length > 200)
            return res.status(400).json({ success: false, message: "Note can be at most 200 characters." });

        const accepted = await rentalRequestModel.findOne({
            tenant: tenantId, property: propertyId, landlord: landlordId, status: "Accepted"
        });
        if (!accepted)
            return res.status(403).json({ success: false, message: "Cannot generate invoice: tenant has not been accepted for this property." });

        let prop = await propertyModel.findById(propertyId).select("monthlyRent isRemoved").lean();
        if (!prop || prop.isRemoved) return res.status(404).json({ success: false, message: "Property not found." });
        let finalAmount = amount ? Number(amount) : prop.monthlyRent;

        let existing = await paymentModel.findOne({ tenant: tenantId, property: propertyId, forMonth });
        if (existing)
            return res.status(400).json({ success: false, message: `Invoice for ${forMonth} already exists for this tenant and property.` });

        const days      = parseInt(dueDays) || 7;
        const dueDate   = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        // An invoice only becomes overdue after its due date (previously it expired after a fixed
        // 7 days, even when the landlord had given the tenant longer).
        const expiresAt = dueDate;

        let data = await paymentModel.create({
            tenant: tenantId, landlord: landlordId, property: propertyId,
            amount: finalAmount, forMonth, invoiceNo: generateInvoiceNo(),
            note: note || "", dueDate, expiresAt, status: "Pending"
        });

        res.status(201).json({ success: true, message: "Invoice generated successfully", data });
    } catch (e) {
        sendError(res, e);
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
        if (invoice.status === "Paid")                          return res.status(400).json({ success: false, message: "Paid invoices cannot be extended." });
        if (invoice.extendedDays > 0)                         return res.status(400).json({ success: false, message: "Invoice has already been extended once." });

        // Overdue invoices can be extended too: the new due date counts from today if the old one already passed.
        const DAY = 24 * 60 * 60 * 1000;
        const base = Math.max(Date.now(), (invoice.dueDate || new Date()).getTime());
        const newDueDate = new Date(base + extraDays * DAY);

        const updated = await paymentModel.findByIdAndUpdate(
            invoiceId,
            { expiresAt: newDueDate, dueDate: newDueDate, extendedDays: extraDays, status: "Pending" },
            { returnDocument: "after" }
        );

        res.status(200).json({ success: true, message: `Invoice extended by ${extraDays} days.`, data: updated });
    } catch (e) {
        sendError(res, e);
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

        // Atomic: only one request can flip an unpaid invoice to Paid, so double clicks / two tabs never pay twice.
        const txnRef = generateTxnRef(paymentMethod);
        let data = await paymentModel.findOneAndUpdate(
            { _id: invoiceId, tenant: req.headers._id, status: { $in: ["Pending", "Overdue"] } },
            { status: "Paid", paidAt: new Date(), transactionRef: txnRef, paymentMethod },
            { returnDocument: "after" }
        );
        if (!data) return res.status(409).json({ success: false, message: "This invoice was just paid." });

        res.status(200).json({ success: true, message: "Payment successful", transactionRef: txnRef, paymentMethod, data });
    } catch (e) {
        sendError(res, e);
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
        sendError(res, e);
    }
};

exports.singleInvoice = async (req, res) => {
    try {
        let { invoiceId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(invoiceId))
            return res.status(400).json({ success: false, message: "Invalid invoice ID" });

        // only the two parties of the invoice (and admins) may read it
        const owner = await paymentModel.findById(invoiceId).select("tenant landlord").lean();
        if (!owner) return res.status(404).json({ success: false, message: "Invoice not found." });
        const uid = String(req.headers._id);
        if (req.headers.role !== "admin" && String(owner.tenant) !== uid && String(owner.landlord) !== uid)
            return res.status(403).json({ success: false, message: "You do not have access to this invoice." });

        let data = await paymentModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(invoiceId) } },
            { $lookup: { from: "properties", localField: "property", foreignField: "_id", as: "propertyInfo" } },
            { $lookup: { from: "users",      localField: "tenant",   foreignField: "_id", as: "tenantInfo" } },
            { $lookup: { from: "users",      localField: "landlord", foreignField: "_id", as: "landlordInfo" } },
            { $project: { "tenantInfo.password": 0, "landlordInfo.password": 0 } }
        ]);

        res.status(200).json({ success: true, message: "Invoice details", data });
    } catch (e) {
        sendError(res, e);
    }
};
