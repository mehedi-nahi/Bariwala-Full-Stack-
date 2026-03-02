import { useEffect, useState } from "react";
import { adminAllReportsAPI, adminUpdateReportAPI, adminRemoveListingAPI, adminRemoveItemAPI, adminBlockUserAPI } from "../../api/adminAPI";

const AdminReports = () => {
    const [reports,  setReports]  = useState([]);
    const [total,    setTotal]    = useState(0);
    const [page,     setPage]     = useState(1);
    const [filter,   setFilter]   = useState("");
    const [msg,      setMsg]      = useState("");
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState("");
    const PER_PAGE = 20;

    const load = async (p = page, status = filter) => {
        setLoading(true); setError("");
        try {
            const params = { pageNo: p, perPage: PER_PAGE };
            if (status) params.status = status;
            const res = await adminAllReportsAPI(params);
            const facet = res.data.data[0] || {};
            setReports(facet.reports || []);
            setTotal(facet.totalCount?.[0]?.count || 0);
        } catch (e) {
            setError(e.response?.data?.message || "Failed to load reports.");
        } finally { setLoading(false); }
    };

    useEffect(() => { load(page, filter); }, [page, filter]); // eslint-disable-line

    const handleStatus = async (id, status) => {
        try {
            await adminUpdateReportAPI(id, { status });
            setMsg("Report status updated");
            load(page, filter);
        } catch (e) { setMsg(e.response?.data?.message || "Action failed"); }
    };

    const handleRemove = async (report) => {
        try {
            if (report.reportType === "property")    await adminRemoveListingAPI(report.reportedEntity);
            else if (report.reportType === "marketplace") await adminRemoveItemAPI(report.reportedEntity);
            await adminUpdateReportAPI(report._id, { status: "Resolved" });
            setMsg("Content removed and report resolved");
            load(page, filter);
        } catch (e) { setMsg(e.response?.data?.message || "Action failed"); }
    };

    const handleBlockUser = async (report) => {
        try {
            await adminBlockUserAPI(report.reportedEntity);
            await adminUpdateReportAPI(report._id, { status: "Resolved" });
            setMsg("User blocked and report resolved");
            load(page, filter);
        } catch (e) { setMsg(e.response?.data?.message || "Action failed"); }
    };

    const totalPages = Math.ceil(total / PER_PAGE);

    return (
        <div className="container">
            <h2>All Reports <span style={{ fontSize:"0.85rem", color:"#aaa", fontWeight:400 }}>({total} total)</span></h2>

            {/* Filter bar */}
            <div style={{ display:"flex", gap:"0.5rem", marginBottom:"1rem" }}>
                {["", "Pending", "Reviewed", "Resolved"].map(s => (
                    <button key={s} onClick={() => { setPage(1); setFilter(s); }}
                        style={{ background: filter === s ? "#111" : "#f5f5f5", color: filter === s ? "#fff" : "#555",
                            padding:"0.3rem 0.8rem", fontSize:"0.8rem" }}>
                        {s || "All"}
                    </button>
                ))}
            </div>

            {msg   && <p className="success">{msg}</p>}
            {error && <p className="error">{error}</p>}

            {loading ? (
                <p style={{ color:"#aaa", textAlign:"center", padding:"2rem" }}>Loading reports...</p>
            ) : (
                <>
                    <table>
                        <thead>
                            <tr><th>Type</th><th>Reason</th><th>Reported By</th><th>Date</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {reports.length === 0 && <tr><td colSpan="6" style={{ textAlign:"center", color:"#aaa" }}>No reports found.</td></tr>}
                            {reports.map(r => (
                                <tr key={r._id}>
                                    <td><span style={{ textTransform:"capitalize" }}>{r.reportType}</span></td>
                                    <td style={{ maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.reason}</td>
                                    <td>{r.reportedByInfo?.[0]?.name || "—"}</td>
                                    <td>{new Date(r.createdAt).toLocaleDateString("en-GB")}</td>
                                    <td><span className={`badge ${r.status === "Resolved" ? "green" : r.status === "Reviewed" ? "yellow" : "red"}`}>{r.status}</span></td>
                                    <td style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap" }}>
                                        {r.status === "Pending"  && <button onClick={() => handleStatus(r._id, "Reviewed")}>Mark Reviewed</button>}
                                        {r.status === "Reviewed" && <button onClick={() => handleStatus(r._id, "Resolved")}>Resolve</button>}
                                        {/* For property/marketplace reports — remove listing */}
                                        {(r.reportType === "property" || r.reportType === "marketplace") && r.status !== "Resolved" && (
                                            <button className="btn-danger" onClick={() => handleRemove(r)}>Remove Content</button>
                                        )}
                                        {/* For user reports — block the reported user */}
                                        {r.reportType === "user" && r.status !== "Resolved" && (
                                            <button className="btn-danger" onClick={() => handleBlockUser(r)}>Block User</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {totalPages > 1 && (
                        <div style={{ display:"flex", gap:"0.5rem", justifyContent:"center", marginTop:"1.5rem" }}>
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                            <span style={{ padding:"0.4rem 0.8rem", fontSize:"0.85rem", color:"#888" }}>Page {page} / {totalPages}</span>
                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminReports;

