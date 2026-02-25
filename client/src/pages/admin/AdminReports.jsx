import { useEffect, useState } from "react";
import { adminAllReportsAPI, adminUpdateReportAPI, adminRemoveListingAPI, adminRemoveItemAPI } from "../../api/adminAPI";

const AdminReports = () => {
    const [reports, setReports] = useState([]);
    const [msg, setMsg]         = useState("");

    const load = () => adminAllReportsAPI().then(res => setReports(res.data.data[0]?.reports || []));

    useEffect(() => { load(); }, []);

    const handleStatus = async (id, status) => {
        await adminUpdateReportAPI(id, { status });
        setMsg("Report status updated");
        load();
    };

    const handleRemove = async (report) => {
        if (report.reportType === "property") await adminRemoveListingAPI(report.reportedEntity);
        else if (report.reportType === "marketplace") await adminRemoveItemAPI(report.reportedEntity);
        await adminUpdateReportAPI(report._id, { status: "Resolved" });
        setMsg("Listing removed and report resolved");
        load();
    };

    return (
        <div className="container">
            <h2>All Reports</h2>
            {msg && <p className="success">{msg}</p>}
            <table>
                <thead>
                    <tr><th>Type</th><th>Reason</th><th>Reported By</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    {reports.map(r => (
                        <tr key={r._id}>
                            <td>{r.reportType}</td>
                            <td>{r.reason}</td>
                            <td>{r.reportedByInfo?.[0]?.name}</td>
                            <td><span className={`badge ${r.status === "Resolved" ? "green" : r.status === "Reviewed" ? "yellow" : "red"}`}>{r.status}</span></td>
                            <td>
                                {r.status === "Pending"   && <button onClick={() => handleStatus(r._id, "Reviewed")}>Mark Reviewed</button>}
                                {r.status === "Reviewed"  && <button onClick={() => handleStatus(r._id, "Resolved")}>Resolve</button>}
                                {r.reportType !== "user"  && <button className="btn-danger" onClick={() => handleRemove(r)}>Remove Listing</button>}
                            </td>
                        </tr>
                    ))}
                    {reports.length === 0 && <tr><td colSpan="5">No reports found.</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

export default AdminReports;

