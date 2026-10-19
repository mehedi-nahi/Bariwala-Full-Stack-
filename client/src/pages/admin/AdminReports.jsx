import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminAllReportsAPI, adminUpdateReportAPI, adminRemoveListingAPI, adminRemoveItemAPI, adminBlockUserAPI } from "../../api/adminAPI";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { getErrorMessage } from "../../utils/errors";
import { fmtDate } from "../../utils/format";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Avatar, Button, EmptyState, ErrorState, PageHeader, Pagination, Skeleton, Stat, StatusBadge } from "../../components/ui";
import Icon from "../../components/Icon";

const PER_PAGE = 12;
const FILTERS = ["", "Pending", "Reviewed", "Resolved"];
const TYPE = { property: { icon: "home", label: "Property listing" }, marketplace: { icon: "bag", label: "Marketplace item" }, user: { icon: "user", label: "User" } };

/* what was reported, in words (not an ID) */
const targetOf = (r) => {
    if (r.reportType === "property") {
        const p = r.propertyTarget?.[0];
        return p ? { name: `${p.propertyType} in ${p.area}`, to: `/property/${p._id}`, gone: p.isRemoved } : { name: "Listing no longer exists", gone: true };
    }
    if (r.reportType === "marketplace") {
        const i = r.itemTarget?.[0];
        return i ? { name: i.title, to: `/marketplace/item/${i._id}`, gone: i.isRemoved } : { name: "Item no longer exists", gone: true };
    }
    const u = r.userTarget?.[0];
    return u ? { name: `${u.name} (${u.role})`, blocked: u.isBlocked } : { name: "User no longer exists", gone: true };
};

const ReportCard = ({ r, busy, onStatus, onRemove, onBlock }) => {
    const t = TYPE[r.reportType] || TYPE.user;
    const target = targetOf(r);
    const by = r.reportedByInfo?.[0];
    return (
        <article className="card card-pad stack stack-md">
            <div className="row-between">
                <span className="badge badge-brand"><Icon name={t.icon} size={12} /> {t.label}</span>
                <StatusBadge status={r.status} />
            </div>
            <div>
                <div className="xs muted">Reported</div>
                <div className="strong">
                    {target.to ? <Link to={target.to}>{target.name}</Link> : target.name}
                    {target.gone && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Removed</span>}
                    {target.blocked && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Blocked</span>}
                </div>
            </div>
            <blockquote style={{ background: "var(--surface-2)", padding: "0.7rem 0.9rem", borderRadius: 8, borderLeft: "3px solid var(--line-strong)" }}>
                <p style={{ whiteSpace: "pre-wrap" }}>{r.reason}</p>
            </blockquote>
            <div className="row small muted"><Avatar name={by?.name} size={24} /> <span>{by?.name || "Unknown"} · {fmtDate(r.createdAt)}</span></div>

            {r.status !== "Resolved" ? (
                <div className="row-wrap">
                    {r.status === "Pending" && <Button size="sm" variant="secondary" icon="eye" loading={busy} onClick={() => onStatus(r, "Reviewed")}>Mark reviewed</Button>}
                    <Button size="sm" variant="success" icon="check" loading={busy} onClick={() => onStatus(r, "Resolved")}>Resolve</Button>
                    {r.reportType !== "user" && !target.gone && <Button size="sm" variant="danger-outline" icon="trash" loading={busy} onClick={() => onRemove(r, target)}>Remove content</Button>}
                    {r.reportType === "user" && !target.gone && !target.blocked && <Button size="sm" variant="danger-outline" icon="ban" loading={busy} onClick={() => onBlock(r, target)}>Block user</Button>}
                </div>
            ) : <div className="small" style={{ color: "var(--success)" }}><Icon name="check-circle" size={14} /> Resolved</div>}
        </article>
    );
};

const AdminReports = () => {
    useDocumentTitle("Reports");
    const toast = useToast();
    const confirm = useConfirm();
    const [filter, setFilter] = useState("");
    const [page, setPage] = useState(1);
    const [busyId, setBusyId] = useState(null);
    const [state, setState] = useState({ reports: [], count: 0, counts: {}, loading: true, error: "" });

    const load = useCallback(async (silent = false) => {
        if (!silent) setState(s => ({ ...s, loading: true, error: "" }));
        try {
            const res = await adminAllReportsAPI({ pageNo: page, perPage: PER_PAGE, status: filter || undefined });
            const f = res.data.data[0] || {};
            setState({
                reports: f.reports || [], count: f.totalCount?.[0]?.count || 0, loading: false, error: "",
                counts: { Pending: f.pendingCount?.[0]?.count || 0, Reviewed: f.reviewedCount?.[0]?.count || 0, Resolved: f.resolvedCount?.[0]?.count || 0 },
            });
        } catch (e) { setState(s => ({ ...s, loading: false, error: getErrorMessage(e) })); }
    }, [page, filter]);

    useEffect(() => { load(); }, [load]);

    const run = async (r, work, success) => {
        setBusyId(r._id);
        try { await work(); toast.success(success); load(true); }
        catch (e) { toast.error(getErrorMessage(e, "Action failed.")); }
        finally { setBusyId(null); }
    };

    const onStatus = (r, status) => run(r, () => adminUpdateReportAPI(r._id, { status }), `Report marked ${status.toLowerCase()}.`);
    const onRemove = async (r, target) => {
        const ok = await confirm({ title: "Remove this content?", message: `“${target.name}” will be taken down and this report marked resolved.`, confirmText: "Remove content", tone: "danger" });
        if (!ok) return;
        run(r, async () => {
            if (r.reportType === "property") await adminRemoveListingAPI(r.reportedEntity); else await adminRemoveItemAPI(r.reportedEntity);
            await adminUpdateReportAPI(r._id, { status: "Resolved" });
        }, "Content removed and report resolved.");
    };
    const onBlock = async (r, target) => {
        const ok = await confirm({ title: "Block this user?", message: `${target.name} won't be able to log in. The report will be marked resolved.`, confirmText: "Block user", tone: "danger" });
        if (!ok) return;
        run(r, async () => { await adminBlockUserAPI(r.reportedEntity); await adminUpdateReportAPI(r._id, { status: "Resolved" }); }, "User blocked and report resolved.");
    };

    const totalPages = Math.max(1, Math.ceil(state.count / PER_PAGE));
    const all = state.counts.Pending + state.counts.Reviewed + state.counts.Resolved || 0;

    return (
        <div className="container page">
            <PageHeader title="Reports" subtitle="Review flagged listings, items and users." />

            <div className="stats mb-3">
                <Stat icon="flag" label="All reports" value={all} />
                <Stat icon="clock" label="Pending" value={state.counts.Pending ?? 0} tone={state.counts.Pending ? "warning" : undefined} />
                <Stat icon="eye" label="Reviewed" value={state.counts.Reviewed ?? 0} tone="info" />
                <Stat icon="check-circle" label="Resolved" value={state.counts.Resolved ?? 0} tone="success" />
            </div>

            <div className="tabs mb-2" role="tablist">
                {FILTERS.map(f => <button key={f || "all"} role="tab" className="tab" aria-selected={filter === f} onClick={() => { setFilter(f); setPage(1); }}>{f || "All"}</button>)}
            </div>

            {state.loading && !state.reports.length && <div className="auto-grid" style={{ "--min": "320px" }}>{[0, 1, 2].map(i => <Skeleton key={i} h={220} style={{ borderRadius: 10 }} />)}</div>}
            {state.error && <ErrorState message={state.error} onRetry={load} />}
            {!state.loading && !state.error && state.reports.length === 0 && <EmptyState icon="flag" title="No reports here">{filter ? `There are no ${filter.toLowerCase()} reports.` : "Nobody has reported anything yet."}</EmptyState>}

            {!state.error && state.reports.length > 0 && (<>
                <div className="auto-grid" style={{ "--min": "340px", opacity: state.loading ? 0.6 : 1 }}>
                    {state.reports.map(r => <ReportCard key={r._id} r={r} busy={busyId === r._id} onStatus={onStatus} onRemove={onRemove} onBlock={onBlock} />)}
                </div>
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </>)}
        </div>
    );
};

export default AdminReports;
