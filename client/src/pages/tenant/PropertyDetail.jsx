import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { singlePropertyAPI } from "../../api/propertyAPI";
import { userReviewsAPI, createReviewAPI } from "../../api/reviewAPI";
import {
    sendRentalRequestAPI, rentalRequestStatusAPI, cancelRentalRequestAPI, incomingRentalRequestsAPI,
} from "../../api/rentalRequestAPI";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { getErrorMessage } from "../../utils/errors";
import { fmtDate, money } from "../../utils/format";
import useAsync from "../../hooks/useAsync";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Avatar, Button, EmptyState, ErrorState, Field, PageHeader, PageLoader, StarInput, Stars, StatusBadge } from "../../components/ui";
import Modal from "../../components/Modal";
import ImageGallery from "../../components/ImageGallery";
import Icon from "../../components/Icon";
import LoginPromptModal from "../../components/LoginPromptModal";
import ReportModal from "../../components/ReportModal";
import MessageComposer from "../../components/MessageComposer";
import Select from "../../components/Select";

/* ── Rental request dialog ─────────────────────────────── */
const RequestModal = ({ property, onClose, onSent }) => {
    const toast = useToast();
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            const res = await sendRentalRequestAPI({ propertyId: property._id, message: note.trim() });
            toast.success("Request sent! The landlord will review it soon.");
            onSent(res.data.data);
        } catch (err) {
            setError(getErrorMessage(err, "Could not send your request."));
        } finally { setBusy(false); }
    };

    return (
        <Modal
            title="Request to rent" onClose={onClose} dismissible={!busy}
            footer={<>
                <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
                <Button type="submit" form="rent-form" loading={busy}>Send request</Button>
            </>}
        >
            <form id="rent-form" onSubmit={submit} noValidate>
                <div className="summary-box">
                    <div className="kv"><span>Property</span><span>{property.propertyType} · {property.area}</span></div>
                    <div className="kv"><span>Monthly rent</span><span>{money(property.monthlyRent)}</span></div>
                    {property.advanceDeposit > 0 && <div className="kv"><span>Advance deposit</span><span>{money(property.advanceDeposit)}</span></div>}
                </div>
                {error && <Alert tone="error">{error}</Alert>}
                <Field label="Message to landlord" optional hint="Introduce yourself – who will live here, when you'd like to move in.">
                    <textarea value={note} maxLength={500} onChange={e => setNote(e.target.value)} placeholder="Hi, I'm interested in this home…" data-autofocus />
                </Field>
                <div className="char-count">{note.length}/500</div>
            </form>
        </Modal>
    );
};

/* ── Reviews ───────────────────────────────────────────── */
const ReviewsTab = ({ property, landlord, reviews, avg, user, canReview, acceptedTenants, onReviewed }) => {
    const toast = useToast();
    const isLandlordOwner = user?.role === "landlord";
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [tenantId, setTenantId] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        if (isLandlordOwner && !tenantId) { setError("Choose which tenant you are reviewing."); return; }
        setSending(true);
        setError("");
        try {
            await createReviewAPI({
                revieweeId: isLandlordOwner ? tenantId : landlord._id,
                propertyId: property._id,
                reviewType: isLandlordOwner ? "landlord-to-tenant" : "tenant-to-landlord",
                rating, comment: comment.trim(),
            });
            toast.success("Thanks! Your review was posted.");
            setComment("");
            onReviewed();
        } catch (err) {
            setError(getErrorMessage(err, "Could not post your review."));
        } finally { setSending(false); }
    };

    return (
        <div className="stack stack-md">
            {avg && (
                <div className="card card-pad row" style={{ gap: "1.2rem" }}>
                    <div style={{ fontSize: "2.6rem", fontWeight: 800, lineHeight: 1 }}>{avg}</div>
                    <div><Stars value={avg} /><div className="small muted">Landlord rating · {reviews.length} review{reviews.length === 1 ? "" : "s"}</div></div>
                </div>
            )}

            {reviews.length === 0 ? (
                <EmptyState icon="star" title="No reviews yet">Reviews appear here after tenants and landlords have worked together.</EmptyState>
            ) : (
                <div className="card">
                    {reviews.map((r, idx) => (
                        <div key={r._id} className="card-pad row row-top" style={{ gap: "0.8rem", borderTop: idx ? "1px solid var(--line)" : 0 }}>
                            <Avatar name={r.reviewerInfo?.[0]?.name} size={38} />
                            <div className="grow">
                                <div className="row-between"><strong>{r.reviewerInfo?.[0]?.name || "Anonymous"}</strong><span className="xs muted">{fmtDate(r.createdAt)}</span></div>
                                <Stars value={r.rating} />
                                {r.comment && <p className="mt-1">{r.comment}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {canReview ? (
                <form className="card card-pad" onSubmit={submit} noValidate>
                    <h3>{isLandlordOwner ? "Review a tenant" : "Review this landlord"}</h3>
                    {error && <Alert tone="error">{error}</Alert>}
                    {isLandlordOwner && (
                        <Field label="Tenant" required>
                            <Select value={tenantId} onChange={e => { setTenantId(e.target.value); setError(""); }}>
                                <option value="">Select a tenant</option>
                                {acceptedTenants.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </Select>
                        </Field>
                    )}
                    <div><div className="field-label mb-1">Your rating</div><StarInput value={rating} onChange={setRating} /></div>
                    <Field label="Comment" optional>
                        <textarea value={comment} maxLength={500} onChange={e => setComment(e.target.value)} placeholder="Share your experience…" />
                    </Field>
                    <div className="form-actions"><Button type="submit" loading={sending}>Post review</Button></div>
                </form>
            ) : user && ["tenant", "landlord"].includes(user.role) ? (
                <Alert tone="info">
                    {user.role === "tenant"
                        ? "You can review this landlord once your rental request for this property has been accepted."
                        : isLandlordOwner && acceptedTenants.length === 0
                            ? "Once you accept a tenant's request for this property you can review them here."
                            : "Only the landlord of this property can review its tenants."}
                </Alert>
            ) : null}
        </div>
    );
};

/* ── Landlord: message & manage people who asked about this home ── */
const TenantsTab = ({ propertyId, requests }) => {
    const [selected, setSelected] = useState(requests[0]?.tenantInfo?.[0] || null);
    const navigate = useNavigate();

    if (requests.length === 0)
        return <EmptyState icon="users" title="No tenants yet">When tenants send a rental request for this property, they will appear here so you can message them.</EmptyState>;

    const selectedRequest = requests.find(r => r.tenantInfo?.[0]?._id === selected?._id);

    return (
        <div className="grid" style={{ gridTemplateColumns: "minmax(0,240px) minmax(0,1fr)", alignItems: "start" }}>
            <div className="card" role="listbox" aria-label="Tenants">
                {requests.map(r => {
                    const t = r.tenantInfo?.[0];
                    if (!t) return null;
                    return (
                        <button key={r._id} role="option" aria-selected={selected?._id === t._id} className="thread" aria-current={selected?._id === t._id}
                            onClick={() => setSelected(t)}>
                            <Avatar name={t.name} size={36} />
                            <span className="grow"><span className="strong truncate" style={{ display: "block" }}>{t.name}</span><StatusBadge status={r.status} /></span>
                        </button>
                    );
                })}
            </div>
            <div className="card card-pad">
                {selected ? (
                    <div className="stack stack-md">
                        <div className="row"><Avatar name={selected.name} size={42} /><div><strong>{selected.name}</strong><div className="small muted">{selected.email}</div></div></div>
                        {selectedRequest?.message && <Alert tone="info" title="Their message">“{selectedRequest.message}”</Alert>}
                        <MessageComposer
                            payload={{ propertyId, receiverId: selected._id }} label="Message" sendLabel="Send message"
                            placeholder={`Hi ${selected.name.split(" ")[0]}, about your request…`} successText={`Message sent to ${selected.name.split(" ")[0]}.`}
                        />
                        {selectedRequest?.status === "Accepted" && (
                            <Button variant="secondary" icon="receipt" onClick={() => navigate("/landlord/invoices", { state: { prefill: { propertyId, tenantId: selected._id, tenantName: selected.name, tenantEmail: selected.email } } })}>
                                Create an invoice for {selected.name.split(" ")[0]}
                            </Button>
                        )}
                    </div>
                ) : <p className="muted">Select a tenant to start a message.</p>}
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════════════════════ */
const PropertyDetail = ({ user }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const confirm = useConfirm();

    const { data: property, loading, error, reload } = useAsync(
        () => singlePropertyAPI(id).then(r => r.data.data[0] || null), [id]
    );
    const landlord = property?.landlordInfo?.[0];

    const isTenant = user?.role === "tenant";
    const isOwner = user?.role === "landlord" && landlord && String(landlord._id) === String(user._id || user.id);

    const { data: reviewData, reload: reloadReviews } = useAsync(
        () => (landlord?._id ? userReviewsAPI(landlord._id).then(r => r.data.data || []) : Promise.resolve([])), [landlord?._id]
    );
    const reviews = useMemo(() => reviewData || [], [reviewData]);
    const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

    const { data: myRequest, setData: setMyRequest } = useAsync(
        () => (isTenant ? rentalRequestStatusAPI(id).then(r => r.data.data) : Promise.resolve(null)), [id, isTenant]
    );
    const { data: ownerRequests } = useAsync(
        () => (isOwner ? incomingRentalRequestsAPI().then(r => (r.data.data || []).filter(q => String(q.property) === String(id))) : Promise.resolve([])), [id, isOwner]
    );
    const acceptedTenants = useMemo(
        () => (ownerRequests || []).filter(r => r.status === "Accepted").map(r => r.tenantInfo?.[0]).filter(Boolean), [ownerRequests]
    );

    const [tab, setTab] = useState("overview");
    const [modal, setModal] = useState(null); // request | login | report-listing | report-landlord
    useDocumentTitle(property ? `${property.propertyType} in ${property.area}` : "Property");

    const cancelRequest = useCallback(async () => {
        const ok = await confirm({ title: "Cancel your request?", message: "The landlord won't see it any more. You can send a new one later.", confirmText: "Cancel request", tone: "danger" });
        if (!ok) return;
        try {
            await cancelRentalRequestAPI(myRequest._id);
            toast.success("Request cancelled.");
            setMyRequest(null);
        } catch (err) { toast.error(getErrorMessage(err)); }
    }, [confirm, myRequest, setMyRequest, toast]);

    useEffect(() => { setTab(location.state?.tab || "overview"); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading && !property) return <PageLoader label="Loading property…" />;
    if (error || !property) {
        return (
            <div className="container page">
                <ErrorState message={error || "This property may have been rented or removed."} onRetry={error ? reload : undefined} />
                <div className="center mt-2"><Link to="/" className="btn btn-primary">Browse other homes</Link></div>
            </div>
        );
    }

    const available = property.availability === "Available";
    const canReview = (isTenant && myRequest?.status === "Accepted") || (isOwner && acceptedTenants.length > 0);
    const hasMap = property.location?.mapLink && /^https?:\/\//i.test(property.location.mapLink);
    const guestPrompt = !user
        ? { title: "Log in to continue", message: "Create a free account or log in as a Tenant to message the landlord and request this home." }
        : { title: "Tenant account required", message: `You're logged in as a ${user.role}. Only Tenant accounts can request homes or message landlords – you can register a separate Tenant account with another email.` };

    const needTenant = (action) => (isTenant ? action() : setModal("login"));

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "reviews", label: `Reviews (${reviews.length})` },
        ...(isOwner ? [{ id: "tenants", label: `Tenants${ownerRequests?.length ? ` (${ownerRequests.length})` : ""}` }] : [{ id: "contact", label: "Message landlord" }]),
    ];

    return (
        <div className="container page">
            <PageHeader
                breadcrumbs={[{ label: "Rentals", to: "/" }, { label: property.area, to: `/?q=${encodeURIComponent(property.area)}` }, { label: property.propertyType }]}
                title={`${property.propertyType} in ${property.area}`}
                subtitle={<span className="row-wrap" style={{ gap: "0.5rem" }}><Icon name="pin" size={15} /> {property.address}{avg && <><span aria-hidden="true">·</span><Stars value={avg} /> {avg}</>}</span>}
            />

            <div className="detail-layout">
                <div className="stack stack-lg">
                    <ImageGallery
                        key={property._id} images={property.images || []} alt={`${property.propertyType} in ${property.area}`}
                        badge={<span className="badge" style={{ position: "absolute", top: 12, left: 12, zIndex: 2, background: property.availability === "Available" ? "var(--success)" : "var(--dark)", color: "#fff" }}>{property.availability}</span>}
                    />

                    <div>
                        <div className="tabs" role="tablist">
                            {tabs.map(t => (
                                <button key={t.id} role="tab" className="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
                            ))}
                        </div>

                        <div className="mt-3" role="tabpanel">
                            {tab === "overview" && (
                                <div className="stack stack-lg">
                                    <div className="spec-grid">
                                        {[
                                            ["Monthly rent", money(property.monthlyRent)],
                                            ["Advance deposit", property.advanceDeposit > 0 ? money(property.advanceDeposit) : "None"],
                                            ["Property type", property.propertyType],
                                            ["Distance from main road", property.distanceFromMainRoad || "Not specified"],
                                        ].map(([l, v]) => <div className="spec" key={l}><div className="spec-label">{l}</div><div className="spec-value">{v}</div></div>)}
                                    </div>

                                    {property.facilities?.length > 0 && (
                                        <section>
                                            <h3 className="mb-1">Facilities</h3>
                                            <div className="row-wrap">{property.facilities.map(f => <span className="badge badge-info" key={f}><Icon name="check" size={12} /> {f}</span>)}</div>
                                        </section>
                                    )}

                                    {hasMap && (
                                        <a className="btn btn-secondary" href={property.location.mapLink} target="_blank" rel="noopener noreferrer" style={{ alignSelf: "flex-start" }}>
                                            <Icon name="pin" size={16} /> View on map <Icon name="external" size={14} />
                                        </a>
                                    )}

                                    {user && !isOwner && ["tenant", "landlord", "marketplace"].includes(user.role) && (
                                        <div className="row-wrap">
                                            <Button variant="ghost" size="sm" icon="flag" onClick={() => setModal("report-listing")}>Report this listing</Button>
                                            {landlord && <Button variant="ghost" size="sm" icon="flag" onClick={() => setModal("report-landlord")}>Report landlord</Button>}
                                        </div>
                                    )}
                                </div>
                            )}

                            {tab === "reviews" && (
                                <ReviewsTab
                                    property={property} landlord={landlord} reviews={reviews} avg={avg} user={user}
                                    canReview={canReview} acceptedTenants={acceptedTenants} onReviewed={() => reloadReviews(true)}
                                />
                            )}

                            {tab === "contact" && (
                                isTenant && landlord ? (
                                    <div className="card card-pad">
                                        <h3 className="mb-1">Message {landlord.name.split(" ")[0]}</h3>
                                        <p className="muted small mb-2">Ask about availability, viewing times or anything else. Replies arrive in your inbox.</p>
                                        <MessageComposer
                                            payload={{ propertyId: property._id, receiverId: landlord._id }}
                                            placeholder="Hi, is this home still available? I'd like to arrange a visit…"
                                        />
                                    </div>
                                ) : (
                                    <div className="card card-pad center">
                                        <div className="empty-icon"><Icon name="lock" size={26} /></div>
                                        <h3>{user ? "Only tenants can message landlords" : "Log in to message the landlord"}</h3>
                                        <p className="muted mt-1 mb-2">{guestPrompt.message}</p>
                                        <div className="row" style={{ justifyContent: "center" }}>
                                            {!user && <Link to="/login" state={{ from: `/property/${id}` }} className="btn btn-secondary">Log in</Link>}
                                            <Link to="/register" className="btn btn-primary">Sign up as a tenant</Link>
                                        </div>
                                    </div>
                                )
                            )}

                            {tab === "tenants" && isOwner && <TenantsTab propertyId={property._id} requests={ownerRequests || []} />}
                        </div>
                    </div>
                </div>

                <aside className="sticky-panel stack stack-md" aria-label="Rent this property">
                    <div className="card card-pad">
                        <div className="price-big">{money(property.monthlyRent)} <small>/ month</small></div>
                        {property.advanceDeposit > 0 && <p className="small muted mt-1">+ {money(property.advanceDeposit)} advance deposit</p>}

                        <div className="mt-2">
                            <div className="kv"><span>Type</span><span>{property.propertyType}</span></div>
                            <div className="kv"><span>Area</span><span>{property.area}</span></div>
                            <div className="kv"><span>Status</span><span><StatusBadge status={property.availability} /></span></div>
                        </div>

                        <div className="stack stack-sm mt-2">
                            {isOwner ? (<>
                                <Link to={`/landlord/edit-property/${property._id}`} className="btn btn-primary btn-block"><Icon name="edit" size={16} /> Edit this listing</Link>
                                <Button variant="secondary" block icon="users" onClick={() => setTab("tenants")}>View tenants &amp; requests</Button>
                            </>) : isTenant && myRequest ? (<>
                                <div className={`alert alert-${myRequest.status === "Accepted" ? "success" : myRequest.status === "Rejected" ? "error" : "warning"}`} role="status">
                                    <Icon name={myRequest.status === "Accepted" ? "check-circle" : myRequest.status === "Rejected" ? "alert-circle" : "clock"} size={18} />
                                    <div>
                                        <div className="alert-title">{myRequest.status === "Accepted" ? "Request accepted" : myRequest.status === "Rejected" ? "Request declined" : "Request pending"}</div>
                                        <div className="small">
                                            {myRequest.status === "Accepted" && "The landlord can now send you rent invoices."}
                                            {myRequest.status === "Pending" && "Waiting for the landlord to respond."}
                                            {myRequest.status === "Rejected" && (available ? "You can send a new request." : "This home is no longer available.")}
                                        </div>
                                    </div>
                                </div>
                                {myRequest.status === "Pending" && <Button variant="danger-outline" block onClick={cancelRequest}>Cancel request</Button>}
                                {myRequest.status === "Rejected" && available && <Button block onClick={() => setModal("request")}>Send a new request</Button>}
                                {myRequest.status === "Accepted" && <Link to="/tenant/payments" className="btn btn-secondary btn-block"><Icon name="card" size={16} /> View my invoices</Link>}
                                <Button variant="secondary" block icon="chat" onClick={() => setTab("contact")}>Message landlord</Button>
                            </>) : available ? (<>
                                <Button size="lg" block icon="key" onClick={() => needTenant(() => setModal("request"))}>Request to rent</Button>
                                <Button variant="secondary" block icon="chat" onClick={() => needTenant(() => setTab("contact"))}>Message landlord</Button>
                                {!isTenant && <p className="xs muted center">{user ? "Tenant account needed to request this home." : "Free account needed – takes a minute."}</p>}
                            </>) : (
                                <Alert tone="warning">This home is currently rented. Browse similar homes below.</Alert>
                            )}
                            <Button variant="ghost" icon="arrow-left" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}>Back to results</Button>
                        </div>
                    </div>

                    {landlord && (
                        <div className="card card-pad">
                            <div className="eyebrow mb-1" style={{ color: "var(--muted)" }}>Listed by</div>
                            <div className="row">
                                <Avatar name={landlord.name} size={46} />
                                <div>
                                    <strong>{landlord.name}</strong>
                                    <div className="small muted">Member since {fmtDate(landlord.createdAt, { month: "short", year: "numeric" })}</div>
                                    {avg && <div className="small"><Stars value={avg} /> {avg} ({reviews.length})</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>

            {modal === "request" && isTenant && (
                <RequestModal property={property} onClose={() => setModal(null)} onSent={(req) => { setMyRequest(req); setModal(null); }} />
            )}
            {modal === "login" && <LoginPromptModal onClose={() => setModal(null)} title={guestPrompt.title} message={guestPrompt.message} cta={user ? "register" : "login"} />}
            {modal === "report-listing" && <ReportModal type="property" entityId={property._id} subject={`${property.propertyType} in ${property.area}`} onClose={() => setModal(null)} />}
            {modal === "report-landlord" && landlord && <ReportModal type="user" entityId={landlord._id} subject={landlord.name} onClose={() => setModal(null)} />}
        </div>
    );
};

export default PropertyDetail;
