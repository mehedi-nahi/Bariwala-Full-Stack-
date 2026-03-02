const reportModel = require("../models/reportModel");

// Create Report (tenant, landlord, or marketplace user)
// reportType: "property" = report fake listing | "marketplace" = report fake item | "user" = report bad behavior
exports.createReport = async (req, res) => {
    try {
        let reportedBy = req.headers._id;
        let role       = req.headers.role;

        // All registered users can submit reports
        if (!["tenant", "landlord", "marketplace"].includes(role)) {
            return res.status(403).json({ success: false, message: "Only registered users can submit reports." });
        }

        let { reportType, reportedEntity, reason } = req.body;

        // Validate reportType
        if (!["property", "marketplace", "user"].includes(reportType)) {
            return res.status(400).json({ success: false, message: "reportType must be 'property', 'marketplace', or 'user'." });
        }

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
