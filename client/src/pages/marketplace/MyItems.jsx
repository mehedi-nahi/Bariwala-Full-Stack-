import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { myItemsAPI, deleteItemAPI, updateItemAPI, markAsSoldAPI } from "../../api/marketplaceAPI";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { CATEGORIES, CONDITIONS } from "../../utils/constants";
import { getErrorMessage } from "../../utils/errors";
import { fmtDate, money, plural } from "../../utils/format";
import useAsync from "../../hooks/useAsync";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Button, EmptyState, ErrorState, Field, PageHeader, TableSkeleton } from "../../components/ui";
import Modal from "../../components/Modal";
import Icon from "../../components/Icon";
import Select from "../../components/Select";

const EditModal = ({ item, onClose, onSaved }) => {
    const toast = useToast();
    const [form, setForm] = useState({ title: item.title, description: item.description || "", price: String(item.price), condition: item.condition, category: item.category || "Other" });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");
    const [saving, setSaving] = useState(false);
    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); setServerError(""); };

    const submit = async (e) => {
        e.preventDefault();
        const err = {};
        if (form.title.trim().length < 3) err.title = "Title must be at least 3 characters.";
        if (!form.price || Number(form.price) <= 0) err.price = "Enter a price greater than 0.";
        setErrors(err);
        if (Object.keys(err).length) return;
        setSaving(true);
        try {
            await updateItemAPI(item._id, { ...form, title: form.title.trim(), price: Number(form.price) });
            toast.success("Listing updated.");
            onSaved();
        } catch (e2) { setServerError(getErrorMessage(e2, "Could not update the listing.")); }
        finally { setSaving(false); }
    };

    return (
        <Modal title="Edit listing" size="lg" onClose={onClose} dismissible={!saving}
            footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" form="edit-item" loading={saving}>Save changes</Button></>}>
            <form id="edit-item" onSubmit={submit} noValidate>
                {serverError && <Alert tone="error">{serverError}</Alert>}
                <Field label="Title" error={errors.title} required><input maxLength={100} value={form.title} onChange={e => set("title", e.target.value)} /></Field>
                <div className="form-grid">
                    <Field label="Price (৳)" error={errors.price} required><input type="number" min="1" inputMode="numeric" value={form.price} onChange={e => set("price", e.target.value)} /></Field>
                    <Field label="Condition"><Select value={form.condition} onChange={e => set("condition", e.target.value)}>{CONDITIONS.map(c => <option key={c}>{c}</option>)}</Select></Field>
                    <Field label="Category" className="span-2"><Select value={form.category} onChange={e => set("category", e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</Select></Field>
                </div>
                <Field label="Description" optional><textarea maxLength={2000} value={form.description} onChange={e => set("description", e.target.value)} /></Field>
            </form>
        </Modal>
    );
};

const MyItems = () => {
    useDocumentTitle("My listings");
    const toast = useToast();
    const confirm = useConfirm();
    const { data, loading, error, reload } = useAsync(() => myItemsAPI().then(r => r.data.data || []), []);
    const [tab, setTab] = useState("active");
    const [editing, setEditing] = useState(null);
    const [busy, setBusy] = useState(null);

    const items = useMemo(() => data || [], [data]);
    const active = items.filter(i => !i.isSold);
    const sold = items.filter(i => i.isSold);
    const list = tab === "active" ? active : sold;

    const remove = async (i) => {
        const ok = await confirm({ title: "Delete this listing?", message: `“${i.title}” will no longer be visible to buyers.`, confirmText: "Delete", tone: "danger" });
        if (!ok) return;
        setBusy(i._id);
        try { await deleteItemAPI(i._id); toast.success("Listing deleted."); reload(true); }
        catch (e) { toast.error(getErrorMessage(e)); } finally { setBusy(null); }
    };

    const markSold = async (i) => {
        const ok = await confirm({ title: "Mark as sold?", message: `“${i.title}” will be removed from the marketplace. Use this if you sold it outside Bariwala.`, confirmText: "Mark as sold" });
        if (!ok) return;
        setBusy(i._id);
        try { await markAsSoldAPI(i._id); toast.success("Marked as sold."); reload(true); }
        catch (e) { toast.error(getErrorMessage(e)); } finally { setBusy(null); }
    };

    return (
        <div className="container page">
            <PageHeader
                title="My listings"
                subtitle={items.length ? `${plural(active.length, "active listing")} · ${sold.length} sold` : "Everything you're selling, in one place."}
                actions={<Link to="/marketplace/add-item" className="btn btn-primary"><Icon name="plus" size={16} /> Sell an item</Link>}
            />

            {loading && !data && <TableSkeleton rows={4} />}
            {error && !data && <ErrorState message={error} onRetry={reload} />}

            {data && (items.length === 0 ? (
                <EmptyState icon="tag" title="You haven't listed anything yet" action={<Link to="/marketplace/add-item" className="btn btn-primary">Post your first item</Link>}>
                    Furniture, appliances, books – anything your neighbours might need.
                </EmptyState>
            ) : (<>
                <div className="tabs mb-2" role="tablist">
                    <button role="tab" className="tab" aria-selected={tab === "active"} onClick={() => setTab("active")}>Active <span className="muted">({active.length})</span></button>
                    <button role="tab" className="tab" aria-selected={tab === "sold"} onClick={() => setTab("sold")}>Sold <span className="muted">({sold.length})</span></button>
                </div>

                {list.length === 0 ? <EmptyState icon={tab === "active" ? "tag" : "check-circle"} title={tab === "active" ? "No active listings" : "Nothing sold yet"} /> : (
                    <div className="stack stack-md">
                        {list.map(i => (
                            <article key={i._id} className="card">
                                <div className="manage-row">
                                    <Link to={`/marketplace/item/${i._id}`} className="manage-thumb" aria-label={`View ${i.title}`}>
                                        {i.images?.[0] ? <img src={i.images[0]} alt="" loading="lazy" /> : <Icon name="package" size={24} />}
                                    </Link>
                                    <div style={{ minWidth: 0 }}>
                                        <div className="row-wrap" style={{ gap: "0.5rem" }}>
                                            <strong className="truncate">{i.title}</strong>
                                            <span className={`badge ${i.condition === "New" ? "badge-success" : "badge-warning"}`}>{i.condition}</span>
                                            {i.category && <span className="badge">{i.category}</span>}
                                            {i.isSold && <span className="badge badge-success">Sold</span>}
                                        </div>
                                        <div className="strong" style={{ color: "var(--brand)" }}>{money(i.price)}</div>
                                        {!i.isSold && i.description && <div className="small muted truncate">{i.description}</div>}
                                        {i.isSold && <div className="small muted">Sold on {fmtDate(i.soldAt)}</div>}
                                    </div>
                                    {!i.isSold && (
                                        <div className="manage-actions">
                                            <Button size="sm" variant="secondary" icon="edit" onClick={() => setEditing(i)}>Edit</Button>
                                            <Button size="sm" variant="secondary" icon="check" loading={busy === i._id} onClick={() => markSold(i)}>Mark sold</Button>
                                            <Button size="sm" variant="danger-outline" icon="trash" onClick={() => remove(i)} aria-label={`Delete ${i.title}`} />
                                        </div>
                                    )}
                                </div>
                                {i.isSold && (
                                    <div className="request-row" style={{ alignItems: "flex-start" }}>
                                        {i.buyerInfo?.name ? (
                                            <div className="small">
                                                <strong>Deliver to:</strong> {i.buyerInfo.name}{i.buyerInfo.phone && <> · <a href={`tel:${i.buyerInfo.phone}`}>{i.buyerInfo.phone}</a></>}<br />
                                                <span className="muted">{[i.buyerInfo.addressLine, i.buyerInfo.area, i.buyerInfo.city].filter(Boolean).join(", ")}</span>
                                                {i.buyerInfo.txnRef && <><br /><span className="muted">Ref: </span><span className="mono">{i.buyerInfo.txnRef}</span></>}
                                            </div>
                                        ) : <span className="small muted">Marked as sold manually – no buyer details.</span>}
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </>))}

            {editing && <EditModal item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(true); }} />}
        </div>
    );
};

export default MyItems;
