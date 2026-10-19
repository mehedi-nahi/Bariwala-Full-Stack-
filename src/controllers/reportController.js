const reportModel      = require("../models/reportModel");
const propertyModel    = require("../models/propertyModel");
const marketplaceModel = require("../models/marketplaceModel");
const userModel        = require("../models/userModel");
const { sendError }    = require("../utility/errorUtility");
const { isId }         = require("../utility/validators");

const ENTITY_MODEL = { property: propertyModel, marketplace: marketplaceModel, user: userModel };

exports.createReport = async (req, res) => {
    try {
        let role = req.headers.role;
        if (!["tenant", "landlord", "marketplace"].includes(role))
            return res.status(403).json({ success: false, message: "Only registered users can submit reports." });

        let { reportType, reportedEntity, reason } = req.body;
        if (!["property", "marketplace", "user"].includes(reportType))
            return res.status(400).json({ success: false, message: "reportType must be 'property', 'marketplace', or 'user'." });
        if (!isId(reportedEntity))
            return res.status(400).json({ success: false, message: "Invalid report target." });
        reason = typeof reason === "string" ? reason.trim() : "";
        if (reason.length < 10)
            return res.status(400).json({ success: false, message: "Please describe the problem in at least 10 characters." });
        if (reason.length > 500)
            return res.status(400).json({ success: false, message: "Reason can be at most 500 characters." });

        if (reportType === "user" && String(reportedEntity) === String(req.headers._id))
            return res.status(400).json({ success: false, message: "You cannot report yourself." });
        if (!(await ENTITY_MODEL[reportType].exists({ _id: reportedEntity })))
            return res.status(404).json({ success: false, message: "The reported item no longer exists." });

        // one open report per person per target is enough
        const duplicate = await reportModel.exists({
            reportedBy: req.headers._id, reportType, reportedEntity, status: { $ne: "Resolved" }
        });
        if (duplicate)
            return res.status(400).json({ success: false, message: "You have already reported this. Our team is reviewing it." });

        let data = await reportModel.create({
            reportedBy: req.headers._id, reportType, reportedEntity, reason
        });

        res.status(201).json({ success: true, message: "Report submitted. Our team will review it.", data });
    } catch (e) {
        sendError(res, e);
    }
};

exports.myReports = async (req, res) => {
    try {
        let data = await reportModel.find({ reportedBy: req.headers._id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, message: "Your reports", data });
    } catch (e) {
        sendError(res, e);
    }
};
