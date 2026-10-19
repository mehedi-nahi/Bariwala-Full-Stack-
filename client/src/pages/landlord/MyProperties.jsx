import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { myPropertiesAPI, deletePropertyAPI, changeAvailabilityAPI } from "../../api/propertyAPI";
import { incomingRentalRequestsAPI, respondRentalRequestAPI } from "../../api/rentalRequestAPI";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { getErrorMessage } from "../../utils/errors";
import { fmtDate, money, plural } from "../../utils/format";
import useAsync from "../../hooks/useAsync";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Avatar, Button, EmptyState, ErrorState, PageHeader, StatusBadge, TableSkeleton } from "../../components/ui";
import Icon from "../../components/Icon";

/* Rental requests for one property, shown under its row */
const RequestsPanel = ({ property, requests, onChanged }) => {
    const toast = useToast();
    const confirm = useConfirm();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(null);

    const respond = async (req, action) => {
        const tenant = req.tenantInfo?.[0];
        if (action === "reject") {
            const ok = await confirm({ title: "Decline this request?", message: `${tenant?.name || "The tenant"} will be told their request was declined.`, confirmText: "Decline", tone: "danger" });
            if (!ok) return;
        }
        setBusy(req._id + action);
        try {
            await respondRentalRequestAPI(req._id, action);
            toast.success(action === "accept" ? `Accepted ${tenant?.name || "request"}. You can now invoice them.` : "Request declined.");
            onChanged();
        } catch (e) { toast.error(getErrorMessage(e)); }
        finally { setBusy(null); }
    };

    return (
        <div>
            {requests.map(req => {
                const t = req.tenantInfo?.[0];
                return (
                    <div className="request-row" key={req._id}>
                        <div className="row" style={{ minWidth: 0, flex: "1 1 240px" }}>
                            <Avatar name={t?.name} size={36} />
                            <div style={{ minWidth: 0 }}>
                                <div className="strong truncate">{t?.name || "Unknown tenant"} <StatusBadge status={req.status} /></div>
                                <div className="xs muted truncate">{t?.email}{t?.phone ? ` · ${t.phone}` : ""} · {fmtDate(req.createdAt)}</div>
                                {req.message && <div className="small clamp-2 mt-1">“{req.message}”</div>}
                            </div>
                        </div>
                        <div className="row-wrap">
                            {req.status === "Pending" && (<>
                                <Button size="sm" variant="success" icon="check" loading={busy === req._id + "accept"} onClick={() => respond(req, "accept")}>Accept</Button>
                                <Button size="sm" variant="danger-outline" icon="x" loading={busy === req._id + "reject"} onClick={() => respond(req, "reject")}>Decline</Button>
                            </>)}
                            {req.status === "Accepted" && t && (
                                <Button size="sm" icon="receipt" onClick={() => navigate("/landlord/invoices", {
                                    state: { prefill: { propertyId: property._id, propertyLabel: `${property.propertyType} — ${property.area}`, monthlyRent: property.monthlyRent, tenantId: t._id, tenantName: t.name, tenantEmail: t.email } },
                                })}>Create invoice</Button>
                            )}
                            <Link to={`/property/${property._id}`} state={{ tab: "tenants" }} className="btn btn-ghost btn-sm">Message</Link>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const MyProperties = () => {
    useDocumentTitle("My properties");
    const toast = useToast();
    const confirm = useConfirm();
    const props = useAsync(() => myPropertiesAPI().then(r => r.data.data || []), []);
    const reqs = useAsync(() => incomingRentalRequestsAPI().then(r => r.data.data || []), []);
    const [filter, setFilter] = useState("All");
    const [open, setOpen] = useState({});
    const [busy, setBusy] = useState(null);

    const properties = useMemo(() => props.data || [], [props.data]);
    const requestsBy = useMemo(() => {
        const map = {};
        (reqs.data || []).forEach(r => { const pid = String(r.propertyInfo?.[0]?._id || r.property); (map[pid] ||= []).push(r); });
        return map;
    }, [reqs.data]);
    const pendingOf = (id) => (requestsBy[id] || []).filter(r => r.status === "Pending").length;
    const totalPending = (reqs.data || []).filter(r => r.status === "Pending").length;

    const sorted = useMemo(() => [...properties].sort((a, b) => pendingOf(b._id) - pendingOf(a._id)), [properties, requestsBy]); // eslint-disable-line react-hooks/exhaustive-deps
    const shown = filter === "All" ? sorted : sorted.filter(p => p.availability === filter);
    const counts = { All: properties.length, Available: properties.filter(p => p.availability === "Available").length, Rented: properties.filter(p => p.availability === "Rented").length };

    const refresh = () => { props.reload(true); reqs.reload(true); };

    const remove = async (p) => {
        const ok = await confirm({ title: "Delete this property?", message: `“${p.propertyType} in ${p.area}” will be removed from search results. This can't be undone.`, confirmText: "Delete property", tone: "danger" });
        if (!ok) return;
        setBusy(p._id);
        try { await deletePropertyAPI(p._id); toast.success("Property deleted."); refresh(); }
        catch (e) { toast.error(getErrorMessage(e)); }
        finally { setBusy(null); }
    };

    const toggle = async (p) => {
        const next = p.availability === "Available" ? "Rented" : "Available";
        setBusy(p._id);
        try {
            await changeAvailabilityAPI(p._id, { availability: next });
            toast.success(next === "Rented" ? "Marked as rented – hidden from search." : "Marked as available – visible in search again.");
            props.reload(true);
        } catch (e) { toast.error(getErrorMessage(e)); }
        finally { setBusy(null); }
    };

    return (
        <div className="container page">
            <PageHeader
                title="My properties"
                subtitle={properties.length ? `${plural(properties.length, "listing")} · ${counts.Available} available · ${counts.Rented} rented` : "Manage your listings, requests and tenants."}
                actions={<Link to="/landlord/add-property" className="btn btn-primary"><Icon name="plus" size={16} /> Add property</Link>}
            />

            {props.loading && !props.data && <TableSkeleton rows={4} />}
            {props.error && !props.data && <ErrorState message={props.error} onRetry={props.reload} />}

            {props.data && (properties.length === 0 ? (
                <EmptyState icon="building" title="No properties yet" action={<Link to="/landlord/add-property" className="btn btn-primary">Add your first property</Link>}>
                    Add a listing with photos and a price – tenants can find it and send you rental requests.
                </EmptyState>
            ) : (<>
                {totalPending > 0 && <div className="mb-2"><Alert tone="warning" title={`${plural(totalPending, "rental request")} waiting`}>Open “Requests” on a listing to accept or decline.</Alert></div>}

                <div className="tabs mb-2" role="tablist">
                    {["All", "Available", "Rented"].map(f => <button key={f} role="tab" className="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>{f} <span className="muted">({counts[f]})</span></button>)}
                </div>

                <div className="stack stack-md">
                    {shown.length === 0 && <EmptyState icon="search" title={`No ${filter.toLowerCase()} properties`} />}
                    {shown.map(p => {
                        const list = requestsBy[p._id] || [];
                        const pending = pendingOf(p._id);
                        const isOpen = open[p._id] ?? pending > 0;   // requests needing a reply are expanded by default
                        return (
                            <article key={p._id} className="card" style={{ overflow: "hidden" }}>
                                <div className="manage-row">
                                    <Link to={`/property/${p._id}`} className="manage-thumb" aria-label={`View ${p.propertyType} in ${p.area}`}>
                                        {p.images?.[0] ? <img src={p.images[0]} alt="" loading="lazy" /> : <Icon name="home" size={24} />}
                                    </Link>
                                    <div style={{ minWidth: 0 }}>
                                        <div className="row-wrap" style={{ gap: "0.5rem" }}>
                                            <strong>{p.propertyType} in {p.area}</strong>
                                            <StatusBadge status={p.availability} />
                                            {pending > 0 && <span className="badge badge-brand">{pending} new request{pending > 1 ? "s" : ""}</span>}
                                        </div>
                                        <div className="small muted truncate">{p.address}</div>
                                        <div className="small"><strong>{money(p.monthlyRent)}</strong><span className="muted"> / month</span>{p.advanceDeposit > 0 && <span className="muted"> · deposit {money(p.advanceDeposit)}</span>}</div>
                                    </div>
                                    <div className="manage-actions">
                                        <Button size="sm" variant="secondary" loading={busy === p._id} onClick={() => toggle(p)}>
                                            {p.availability === "Available" ? "Mark rented" : "Mark available"}
                                        </Button>
                                        <Link to={`/property/${p._id}`} className="btn btn-secondary btn-sm">View</Link>
                                        <Link to={`/landlord/edit-property/${p._id}`} className="btn btn-secondary btn-sm"><Icon name="edit" size={14} /> Edit</Link>
                                        <Button size="sm" variant="danger-outline" icon="trash" onClick={() => remove(p)} aria-label={`Delete ${p.propertyType} in ${p.area}`} />
                                    </div>
                                </div>
                                {list.length > 0 && (
                                    <>
                                        <button className="request-row" style={{ width: "100%", justifyContent: "space-between", cursor: "pointer" }} aria-expanded={isOpen}
                                            onClick={() => setOpen(o => ({ ...o, [p._id]: !isOpen }))}>
                                            <span className="strong small"><Icon name="users" size={14} /> Rental requests ({list.length})</span>
                                            <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={16} />
                                        </button>
                                        {isOpen && <RequestsPanel property={p} requests={list} onChanged={refresh} />}
                                    </>
                                )}
                            </article>
                        );
                    })}
                </div>
            </>))}
        </div>
    );
};

export default MyProperties;
