import { useEffect, useState } from "react";
import { adminAllReportsAPI, adminUpdateReportAPI, adminRemoveListingAPI, adminRemoveItemAPI, adminBlockUserAPI } from "../../api/adminAPI";

/* ── helpers ── */
const SVG = ({ d, size = 16, stroke = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={d}/>
    </svg>
);
const ICONS = {
    flag:    "M3 21V5.5L12 3l9 2.5V21M12 3v18",
    user:    "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
    home:    "M3 9.5L12 3l9 6.5V21H15v-6H9v6H3z",
    bag:     "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 3H8L6 7h12l-2-4z",
    check:   "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    clock:   "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    eye:     "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 12m-3 0a3 3 0 106 0 3 3 0 00-6 0",
    trash:   "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2",
    block:   "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
    resolve: "M5 13l4 4L19 7",
    filter:  "M3 4h18M7 8h10M11 12h4M13 16h2",
};

const TYPE_CONFIG = {
    property:    { icon: "home", label: "Property",    bg: "#f0f2ff", color: "#2980b9" },
    marketplace: { icon: "bag",  label: "Marketplace", bg: "#fff7f0", color: "#f39c12" },
    user:        { icon: "user", label: "User",        bg: "#fdecea", color: "#e74c3c" },
};
const STATUS_CONFIG = {
    Pending:  { bg: "#fef3cd", color: "#856404", dot: "#f59e0b" },
    Reviewed: { bg: "#e8f4fd", color: "#1a5276", dot: "#2980b9" },
    Resolved: { bg: "#d1f2eb", color: "#1a6e3c", dot: "#27ae60" },
};

/* ── Stat pill ── */
const StatPill = ({ label, value, color, bg }) => (
    <div style={{ background: bg, borderRadius: 12, padding: "0.9rem 1.2rem",
        display: "flex", flexDirection: "column", gap: "0.2rem", minWidth: 100 }}>
        <span style={{ fontSize: "1.6rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color, textTransform: "uppercase",
            letterSpacing: "0.06em", opacity: 0.75 }}>{label}</span>
    </div>
);

/* ── Report card ── */
const ReportCard = ({ r, onStatus, onRemove, onBlock }) => {
    const tc = TYPE_CONFIG[r.reportType]   || TYPE_CONFIG.user;
    const sc = STATUS_CONFIG[r.status]     || STATUS_CONFIG.Pending;
    const [expanded, setExpanded] = useState(false);

    return (
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
            border: "1px solid #f0f0f0", overflow: "hidden",
            transition: "box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.12)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)"}>

            {/* Top accent bar */}
            <div style={{ height: 4, background: tc.color, opacity: 0.7 }} />

            <div style={{ padding: "1rem 1.2rem" }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        {/* Type badge */}
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: tc.bg, color: tc.color,
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <SVG d={ICONS[tc.icon]} size={17} />
                        </div>
                        <div>
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: tc.color, background: tc.bg,
                                padding: "0.15rem 0.55rem", borderRadius: 20, textTransform: "uppercase",
                                letterSpacing: "0.06em" }}>
                                {tc.label} Report
                            </span>
                            <div style={{ fontSize: "0.72rem", color: "#aaa", marginTop: 3 }}>
                                {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </div>
                        </div>
                    </div>

                    {/* Status badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem",
                        background: sc.bg, color: sc.color,
                        padding: "0.28rem 0.75rem", borderRadius: 20, flexShrink: 0 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: sc.dot }} />
                        <span style={{ fontSize: "0.73rem", fontWeight: 700 }}>{r.status}</span>
                    </div>
                </div>

                {/* Reason */}
                <div style={{ background: "#f8f9fb", borderRadius: 9, padding: "0.65rem 0.85rem", marginBottom: "0.75rem" }}>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#aaa", textTransform: "uppercase",
                        letterSpacing: "0.07em", marginBottom: "0.3rem" }}>Reason</div>
                    <p style={{ margin: 0, fontSize: "0.84rem", color: "#333", lineHeight: 1.55 }}>
                        {expanded || r.reason.length <= 120
                            ? r.reason
                            : r.reason.slice(0, 120) + "…"}
                        {r.reason.length > 120 && (
                            <button onClick={() => setExpanded(e => !e)}
                                style={{ background: "none", border: "none", color: "#e94560", cursor: "pointer",
                                    fontSize: "0.76rem", fontWeight: 600, marginLeft: "0.35rem", padding: 0 }}>
                                {expanded ? "less" : "more"}
                            </button>
                        )}
                    </p>
                </div>

                {/* Reported by */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.9rem" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#e94560",
                        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: "0.7rem", flexShrink: 0 }}>
                        {r.reportedByInfo?.[0]?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                        <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#333" }}>
                            {r.reportedByInfo?.[0]?.name || "Unknown"}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "#aaa", textTransform: "capitalize" }}>
                            {r.reportedByInfo?.[0]?.role || "—"}
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                {r.status !== "Resolved" && (
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {r.status === "Pending" && (
                            <button onClick={() => onStatus(r._id, "Reviewed")}
                                style={{ display: "flex", alignItems: "center", gap: "0.35rem",
                                    background: "#f0f2ff", color: "#2980b9", border: "1px solid #d5e8fa",
                                    borderRadius: 8, padding: "0.4rem 0.9rem", fontSize: "0.78rem",
                                    fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                                <SVG d={ICONS.eye} size={13} /> Mark Reviewed
                            </button>
                        )}
                        {r.status === "Reviewed" && (
                            <button onClick={() => onStatus(r._id, "Resolved")}
                                style={{ display: "flex", alignItems: "center", gap: "0.35rem",
                                    background: "#d1f2eb", color: "#1a6e3c", border: "1px solid #a9dfcd",
                                    borderRadius: 8, padding: "0.4rem 0.9rem", fontSize: "0.78rem",
                                    fontWeight: 700, cursor: "pointer" }}>
                                <SVG d={ICONS.resolve} size={13} /> Resolve
                            </button>
                        )}
                        {(r.reportType === "property" || r.reportType === "marketplace") && (
                            <button onClick={() => onRemove(r)}
                                style={{ display: "flex", alignItems: "center", gap: "0.35rem",
                                    background: "#fdecea", color: "#c0392b", border: "1px solid #f5c6c6",
                                    borderRadius: 8, padding: "0.4rem 0.9rem", fontSize: "0.78rem",
                                    fontWeight: 700, cursor: "pointer" }}>
                                <SVG d={ICONS.trash} size={13} /> Remove Content
                            </button>
                        )}
                        {r.reportType === "user" && (
                            <button onClick={() => onBlock(r)}
                                style={{ display: "flex", alignItems: "center", gap: "0.35rem",
                                    background: "#fdecea", color: "#c0392b", border: "1px solid #f5c6c6",
                                    borderRadius: 8, padding: "0.4rem 0.9rem", fontSize: "0.78rem",
                                    fontWeight: 700, cursor: "pointer" }}>
                                <SVG d={ICONS.block} size={13} /> Block User
                            </button>
                        )}
                    </div>
                )}
                {r.status === "Resolved" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem",
                        color: "#27ae60", fontSize: "0.78rem", fontWeight: 600 }}>
                        <SVG d={ICONS.check} size={14} stroke="#27ae60" /> Resolved — no further action needed
                    </div>
                )}
            </div>
        </div>
    );
};

/* ══ MAIN PAGE ══ */
const AdminReports = () => {
    const [reports,  setReports]  = useState([]);
    const [total,    setTotal]    = useState(0);
    const [page,     setPage]     = useState(1);
    const [filter,   setFilter]   = useState("");
    const [toast,    setToast]    = useState("");
    const [toastOk,  setToastOk]  = useState(true);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState("");
    const PER_PAGE = 20;

    const showToast = (msg, ok = true) => {
        setToast(msg); setToastOk(ok);
        setTimeout(() => setToast(""), 3500);
    };

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
            showToast("Report status updated successfully.");
            load(page, filter);
        } catch (e) { showToast(e.response?.data?.message || "Action failed.", false); }
    };

    const handleRemove = async (report) => {
        try {
            if (report.reportType === "property")    await adminRemoveListingAPI(report.reportedEntity);
            else if (report.reportType === "marketplace") await adminRemoveItemAPI(report.reportedEntity);
            await adminUpdateReportAPI(report._id, { status: "Resolved" });
            showToast("Content removed and report resolved.");
            load(page, filter);
        } catch (e) { showToast(e.response?.data?.message || "Action failed.", false); }
    };

    const handleBlock = async (report) => {
        try {
            await adminBlockUserAPI(report.reportedEntity);
            await adminUpdateReportAPI(report._id, { status: "Resolved" });
            showToast("User blocked and report resolved.");
            load(page, filter);
        } catch (e) { showToast(e.response?.data?.message || "Action failed.", false); }
    };

    const totalPages = Math.ceil(total / PER_PAGE);
    const pending    = reports.filter(r => r.status === "Pending").length;
    const reviewed   = reports.filter(r => r.status === "Reviewed").length;
    const resolved   = reports.filter(r => r.status === "Resolved").length;

    const FILTERS = [
        { val: "",         label: "All",      count: total },
        { val: "Pending",  label: "Pending",  count: pending },
        { val: "Reviewed", label: "Reviewed", count: reviewed },
        { val: "Resolved", label: "Resolved", count: resolved },
    ];

    return (
        <div style={{ background: "#f5f6fa", minHeight: "100vh", padding: "2rem 2rem 3rem", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>

                {/* ── Page header ── */}
                <div style={{ marginBottom: "1.8rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "0.4rem" }}>
                        <div style={{ width: 4, height: 28, background: "#e94560", borderRadius: 4 }} />
                        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#1a1a2e" }}>
                            Reports
                        </h1>
                        <span style={{ background: "#fdecea", color: "#c0392b", fontSize: "0.7rem",
                            fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: 20 }}>
                            {total} total
                        </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.84rem", color: "#888", paddingLeft: "0.75rem" }}>
                        Review flagged properties, marketplace items and user behaviour reports.
                    </p>
                </div>

                {/* ── Stat row ── */}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.6rem" }}>
                    <StatPill label="Total"    value={total}    color="#e94560" bg="#fff0f2" />
                    <StatPill label="Pending"  value={pending}  color="#856404" bg="#fef3cd" />
                    <StatPill label="Reviewed" value={reviewed} color="#1a5276" bg="#e8f4fd" />
                    <StatPill label="Resolved" value={resolved} color="#1a6e3c" bg="#d1f2eb" />
                </div>

                {/* ── Filter bar ── */}
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.4rem", flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginRight: "0.25rem", color: "#888" }}>
                        <SVG d={ICONS.filter} size={14} />
                        <span style={{ fontSize: "0.76rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Filter:</span>
                    </div>
                    {FILTERS.map(f => (
                        <button key={f.val} onClick={() => { setPage(1); setFilter(f.val); }}
                            style={{ background: filter === f.val ? "#1a1a2e" : "#fff",
                                color: filter === f.val ? "#fff" : "#555",
                                border: `1px solid ${filter === f.val ? "#1a1a2e" : "#e0e0e0"}`,
                                padding: "0.38rem 1rem", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600,
                                cursor: "pointer", transition: "all 0.15s",
                                display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* ── Toast ── */}
                {toast && (
                    <div style={{ background: toastOk ? "#d1f2eb" : "#fdecea",
                        border: `1px solid ${toastOk ? "#a9dfcd" : "#f5c6c6"}`,
                        color: toastOk ? "#1a6e3c" : "#c0392b",
                        borderRadius: 10, padding: "0.7rem 1.1rem", marginBottom: "1.2rem",
                        fontSize: "0.85rem", fontWeight: 600,
                        display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <SVG d={toastOk ? ICONS.check : ICONS.block} size={15}
                            stroke={toastOk ? "#1a6e3c" : "#c0392b"} />
                        {toast}
                    </div>
                )}

                {/* ── Error ── */}
                {error && (
                    <div style={{ background: "#fdecea", border: "1px solid #f5c6c6", color: "#c0392b",
                        borderRadius: 10, padding: "0.7rem 1.1rem", marginBottom: "1.2rem",
                        fontSize: "0.85rem", fontWeight: 600 }}>
                        {error}
                    </div>
                )}

                {/* ── Content ── */}
                {loading ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: "1rem" }}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} style={{ background: "#fff", borderRadius: 14, height: 200,
                                backgroundImage: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                                backgroundSize: "200% 100%",
                                animation: "shimmer 1.2s infinite" }} />
                        ))}
                        <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
                    </div>
                ) : reports.length === 0 ? (
                    <div style={{ background: "#fff", borderRadius: 16, padding: "4rem 2rem",
                        textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                        <SVG d={ICONS.flag} size={48} stroke="#ddd" />
                        <h3 style={{ color: "#bbb", margin: "1rem 0 0.4rem", fontWeight: 700 }}>No reports found</h3>
                        <p style={{ color: "#ccc", fontSize: "0.85rem" }}>
                            {filter ? `No "${filter}" reports at the moment.` : "No reports submitted yet."}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: "1rem" }}>
                        {reports.map(r => (
                            <ReportCard key={r._id} r={r}
                                onStatus={handleStatus}
                                onRemove={handleRemove}
                                onBlock={handleBlock} />
                        ))}
                    </div>
                )}

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                        gap: "0.5rem", marginTop: "2rem" }}>
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                            style={{ background: page === 1 ? "#f5f5f5" : "#1a1a2e",
                                color: page === 1 ? "#ccc" : "#fff", border: "none",
                                padding: "0.5rem 1.2rem", borderRadius: 9, fontSize: "0.82rem",
                                fontWeight: 700, cursor: page === 1 ? "not-allowed" : "pointer" }}>
                            ← Prev
                        </button>
                        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 9,
                            padding: "0.5rem 1.2rem", fontSize: "0.82rem", color: "#555", fontWeight: 600 }}>
                            Page {page} / {totalPages}
                        </div>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                            style={{ background: page >= totalPages ? "#f5f5f5" : "#1a1a2e",
                                color: page >= totalPages ? "#ccc" : "#fff", border: "none",
                                padding: "0.5rem 1.2rem", borderRadius: 9, fontSize: "0.82rem",
                                fontWeight: 700, cursor: page >= totalPages ? "not-allowed" : "pointer" }}>
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminReports;

