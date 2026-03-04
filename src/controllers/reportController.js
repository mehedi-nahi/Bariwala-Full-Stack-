const reportModel = require("../models/reportModel");

exports.createReport = async (req, res) => {
    try {
        let role = req.headers.role;
        if (!["tenant", "landlord", "marketplace"].includes(role))
            return res.status(403).json({ success: false, message: "Only registered users can submit reports." });

        let { reportType, reportedEntity, reason } = req.body;
        if (!["property", "marketplace", "user"].includes(reportType))
            return res.status(400).json({ success: false, message: "reportType must be 'property', 'marketplace', or 'user'." });

        let data = await reportModel.create({
            reportedBy: req.headers._id, reportType, reportedEntity, reason
        });

        res.status(201).json({ success: true, message: "Report submitted successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.myReports = async (req, res) => {
    try {
        let data = await reportModel.find({ reportedBy: req.headers._id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, message: "Your reports", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};
