import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { myRentalRequestsAPI, cancelRentalRequestAPI } from "../../api/rentalRequestAPI";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { getErrorMessage } from "../../utils/errors";
import { fmtDate, money } from "../../utils/format";
import useAsync from "../../hooks/useAsync";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Button, EmptyState, ErrorState, PageHeader, StatusBadge, TableSkeleton } from "../../components/ui";
import Icon from "../../components/Icon";

const FILTERS = ["All", "Pending", "Accepted", "Rejected"];

const MyRequests = () => {
    useDocumentTitle("My rental requests");
    const toast = useToast();
    const confirm = useConfirm();
    const { data, loading, error, reload } = useAsync(() => myRentalRequestsAPI().then(r => r.data.data || []), []);
    const [filter, setFilter] = useState("All");
    const [busyId, setBusyId] = useState(null);

    const requests = useMemo(() => data || [], [data]);
    const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f, f === "All" ? requests.length : requests.filter(r => r.status === f).length])), [requests]);
    const shown = filter === "All" ? requests : requests.filter(r => r.status === filter);

    const cancel = async (r) => {
        const p = r.propertyInfo?.[0];
        const ok = await confirm({
            title: "Cancel this request?", message: `Your request for ${p ? `${p.propertyType} in ${p.area}` : "this home"} will be withdrawn.`,
            confirmText: "Cancel request", tone: "danger",
        });
        if (!ok) return;
        setBusyId(r._id);
        try {
            await cancelRentalRequestAPI(r._id);
            toast.success("Request cancelled.");
            reload(true);
        } catch (err) { toast.error(getErrorMessage(err)); }
        finally { setBusyId(null); }
    };

    return (
        <div className="container page">
            <PageHeader
                title="My rental requests"
                subtitle="Track every home you've asked about and what the landlord said."
                actions={<Link to="/" className="btn btn-primary"><Icon name="search" size={16} /> Find more homes</Link>}
            />

            {loading && !data && <TableSkeleton rows={4} />}
            {error && !data && <ErrorState message={error} onRetry={reload} />}

            {data && (requests.length === 0 ? (
                <EmptyState icon="key" title="No requests yet" action={<Link to="/" className="btn btn-primary">Browse homes</Link>}>
                    When you click “Request to rent” on a property, it will show up here with its status.
                </EmptyState>
            ) : (<>
                <div className="tabs mb-2" role="tablist">
                    {FILTERS.map(f => (
                        <button key={f} role="tab" className="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
                            {f} <span className="muted">({counts[f]})</span>
                        </button>
                    ))}
                </div>

                {shown.length === 0 ? <EmptyState icon="search" title={`No ${filter.toLowerCase()} requests`} /> : (
                    <div className="stack stack-md">
                        {shown.map(r => {
                            const p = r.propertyInfo?.[0];
                            const landlord = r.landlordInfo?.[0];
                            return (
                                <article key={r._id} className="card manage-row">
                                    <div className="manage-thumb">
                                        {p?.images?.[0] ? <img src={p.images[0]} alt="" loading="lazy" /> : <Icon name="home" size={24} />}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div className="row-wrap" style={{ gap: "0.5rem" }}>
                                            <strong>{p ? `${p.propertyType} in ${p.area}` : "Property no longer available"}</strong>
                                            <StatusBadge status={r.status} />
                                            {p && p.availability === "Rented" && r.status !== "Accepted" && <span className="badge">Now rented</span>}
                                        </div>
                                        <div className="small muted truncate">{p?.address}</div>
                                        <div className="small muted">
                                            {p && <>{money(p.monthlyRent)}/mo · </>}Landlord: {landlord?.name || "—"} · Updated {fmtDate(r.updatedAt || r.createdAt)}
                                        </div>
                                        {r.message && <div className="small mt-1 clamp-2">“{r.message}”</div>}
                                    </div>
                                    <div className="manage-actions">
                                        {p && <Link to={`/property/${p._id}`} className="btn btn-secondary btn-sm">View home</Link>}
                                        {r.status === "Accepted" && <Link to="/tenant/payments" className="btn btn-primary btn-sm">Invoices</Link>}
                                        {r.status === "Pending" && <Button variant="danger-outline" size="sm" loading={busyId === r._id} onClick={() => cancel(r)}>Cancel</Button>}
                                        {r.status === "Rejected" && p?.availability === "Available" && <Link to={`/property/${p._id}`} className="btn btn-primary btn-sm">Ask again</Link>}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </>))}
        </div>
    );
};

export default MyRequests;
