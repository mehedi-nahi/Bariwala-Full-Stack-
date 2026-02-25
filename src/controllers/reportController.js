const reportModel = require("../models/reportModel");

// Create Report
exports.createReport = async (req, res) => {
    try {
        let reportedBy = req.headers._id;
        let { reportType, reportedEntity, reason } = req.body;

        let data = await reportModel.create({
            reportedBy,
            reportType,
            reportedEntity,
            reason
        });

        res.status(201).json({ success: true, message: "Report submitted successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// My Reports (reports submitted by logged-in user)
exports.myReports = async (req, res) => {
    try {
        let reportedBy = req.headers._id;
        let data = await reportModel.find({ reportedBy }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, message: "Your reports", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

