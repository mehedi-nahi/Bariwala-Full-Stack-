import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { generateInvoiceAPI, paymentHistoryAPI, extendInvoiceAPI } from "../../api/paymentAPI";
import { incomingRentalRequestsAPI } from "../../api/rentalRequestAPI";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../utils/errors";
import { daysUntil, fmtDate, money } from "../../utils/format";
import useAsync from "../../hooks/useAsync";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Button, EmptyState, ErrorState, Field, PageHeader, Stat, StatusBadge, TableSkeleton } from "../../components/ui";
import Modal from "../../components/Modal";
import ReceiptModal from "../../components/ReceiptModal";
import Select from "../../components/Select";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthOptions = () => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 2 + i, 1);
        return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    });
};
const currentMonth = () => { const d = new Date(); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const FILTERS = ["All", "Pending", "Overdue", "Paid"];

const ExtendModal = ({ invoice, onClose, onDone }) => {
    const toast = useToast();
    const [days, setDays] = useState("3");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setError("");
        try {
            await extendInvoiceAPI(invoice._id, Number(days));
            toast.success(`Invoice extended by ${days} days.`);
            onDone();
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setBusy(false); }
    };
    return (
        <Modal title="Extend due date" size="sm" onClose={onClose}
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="extend-form" loading={busy}>Extend</Button></>}>
            <form id="extend-form" onSubmit={submit} noValidate>
                <p>Give {invoice.tenantInfo?.[0]?.name || "the tenant"} more time to pay <strong>{invoice.invoiceNo}</strong> (currently due {fmtDate(invoice.dueDate)}). An invoice can be extended once; overdue invoices are counted from today and become pending again.</p>
                {error && <Alert tone="error">{error}</Alert>}
                <Field label="Extra days">
                    <Select value={days} onChange={e => setDays(e.target.value)}>{[3, 4, 5, 6, 7].map(d => <option key={d} value={d}>{d} days</option>)}</Select>
                </Field>
            </form>
        </Modal>
    );
};

const LandlordInvoices = () => {
    useDocumentTitle("Invoices");
    const toast = useToast();
    const location = useLocation();
    const prefill = location.state?.prefill;

    const inv = useAsync(() => paymentHistoryAPI().then(r => r.data.data || []), []);
    const reqs = useAsync(() => incomingRentalRequestsAPI().then(r => r.data.data || []), []);

    const [form, setForm] = useState(() => ({
        propertyId: prefill?.propertyId || "", tenantId: prefill?.tenantId || "",
        forMonth: currentMonth(), amount: prefill?.monthlyRent ? String(prefill.monthlyRent) : "", dueDays: "7", note: "",
    }));
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");
    const [creating, setCreating] = useState(false);
    const [filter, setFilter] = useState("All");
    const [receipt, setReceipt] = useState(null);
    const [extend, setExtend] = useState(null);

    const invoices = useMemo(() => inv.data || [], [inv.data]);
    const months = useMemo(monthOptions, []);

    /* properties that have at least one accepted tenant – the only ones an invoice can be created for */
    const properties = useMemo(() => {
        const map = new Map();
        (reqs.data || []).filter(r => r.status === "Accepted").forEach(r => {
            const p = r.propertyInfo?.[0], t = r.tenantInfo?.[0];
            if (!p || !t) return;
            if (!map.has(p._id)) map.set(p._id, { ...p, tenants: [] });
            map.get(p._id).tenants.push(t);
        });
        return [...map.values()];
    }, [reqs.data]);

    const property = properties.find(p => p._id === form.propertyId);
    const duplicate = form.tenantId && invoices.some(i =>
        String(i.tenantInfo?.[0]?._id) === form.tenantId && String(i.propertyInfo?.[0]?._id) === form.propertyId && i.forMonth === form.forMonth);

    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); setServerError(""); };
    const pickProperty = (id) => {
        const p = properties.find(x => x._id === id);
        setForm(f => ({ ...f, propertyId: id, tenantId: p?.tenants.length === 1 ? p.tenants[0]._id : "", amount: p ? String(p.monthlyRent) : "" }));
        setErrors({}); setServerError("");
    };

    const create = async (e) => {
        e.preventDefault();
        const err = {};
        if (!form.propertyId) err.propertyId = "Choose a property.";
        if (!form.tenantId) err.tenantId = "Choose a tenant.";
        if (!form.amount || Number(form.amount) <= 0) err.amount = "Enter an amount greater than 0.";
        const dd = Number(form.dueDays);
        if (!Number.isInteger(dd) || dd < 1 || dd > 30) err.dueDays = "Enter 1–30 days.";
        if (duplicate) err.forMonth = "An invoice for this tenant and month already exists.";
        setErrors(err);
        if (Object.keys(err).length) return;
        setCreating(true); setServerError("");
        try {
            const res = await generateInvoiceAPI({ ...form, amount: Number(form.amount), dueDays: dd, note: form.note.trim() });
            toast.success(`Invoice ${res.data.data.invoiceNo} sent to the tenant.`);
            setForm(f => ({ ...f, note: "" }));
            inv.reload(true);
        } catch (e2) { setServerError(getErrorMessage(e2, "Could not create the invoice.")); }
        finally { setCreating(false); }
    };

    const summary = {
        paid: invoices.filter(i => i.status === "Paid"),
        pending: invoices.filter(i => i.status === "Pending"),
        overdue: invoices.filter(i => i.status === "Overdue"),
    };
    const shown = filter === "All" ? invoices : invoices.filter(i => i.status === filter);
    const loading = (inv.loading && !inv.data) || (reqs.loading && !reqs.data);

    return (
        <div className="container page">
            <PageHeader title="Invoices" subtitle="Bill your tenants for rent and see what has been paid." />

            {loading && <TableSkeleton rows={5} />}
            {(inv.error && !inv.data) && <ErrorState message={inv.error} onRetry={inv.reload} />}

            {inv.data && (<div className="stack stack-lg">
                <div className="stats">
                    <Stat icon="receipt" label="Total invoices" value={invoices.length} />
                    <Stat icon="check-circle" label="Paid" value={summary.paid.length} tone="success" />
                    <Stat icon="clock" label="Pending" value={summary.pending.length} tone={summary.pending.length ? "warning" : undefined} />
                    <Stat icon="alert" label="Overdue" value={summary.overdue.length} tone={summary.overdue.length ? "danger" : undefined} />
                    <Stat icon="money" label="Collected" value={money(summary.paid.reduce((s, i) => s + (i.amount || 0), 0))} tone="success" />
                </div>

                <section className="card card-pad" aria-labelledby="create-h">
                    <h2 id="create-h" className="mb-1">Create an invoice</h2>
                    {properties.length === 0 && !reqs.loading ? (
                        <Alert tone="info" title="No accepted tenants yet">
                            Invoices can be sent to tenants whose rental request you&apos;ve accepted. <Link to="/landlord/properties">Review your requests →</Link>
                        </Alert>
                    ) : (
                        <form onSubmit={create} noValidate>
                            {serverError && <Alert tone="error">{serverError}</Alert>}
                            <div className="form-grid">
                                <Field label="Property" error={errors.propertyId} required>
                                    <Select value={form.propertyId} onChange={e => pickProperty(e.target.value)}>
                                        <option value="">Select a property</option>
                                        {properties.map(p => <option key={p._id} value={p._id}>{p.propertyType} — {p.area} ({money(p.monthlyRent)}/mo)</option>)}
                                    </Select>
                                </Field>
                                <Field label="Tenant" error={errors.tenantId} required hint={property ? undefined : "Choose a property first."}>
                                    <Select value={form.tenantId} onChange={e => set("tenantId", e.target.value)} disabled={!property}>
                                        <option value="">Select a tenant</option>
                                        {property?.tenants.map(t => <option key={t._id} value={t._id}>{t.name} ({t.email})</option>)}
                                    </Select>
                                </Field>
                                <Field label="For month" error={errors.forMonth} required>
                                    <Select value={form.forMonth} onChange={e => set("forMonth", e.target.value)}>{months.map(m => <option key={m}>{m}</option>)}</Select>
                                </Field>
                                <Field label="Amount" error={errors.amount} required htmlFor="inv-amount">
                                    <div className="input-group"><span className="input-prefix">৳</span><input id="inv-amount" type="number" min="1" inputMode="numeric" value={form.amount} onChange={e => set("amount", e.target.value)} /></div>
                                </Field>
                                <Field label="Payment due in (days)" error={errors.dueDays} hint="The tenant sees this deadline on the invoice.">
                                    <input type="number" min="1" max="30" value={form.dueDays} onChange={e => set("dueDays", e.target.value)} />
                                </Field>
                                <Field label="Note to tenant" optional>
                                    <input maxLength={200} placeholder="e.g. includes utility charges" value={form.note} onChange={e => set("note", e.target.value)} />
                                </Field>
                            </div>
                            {duplicate && <Alert tone="warning">You&apos;ve already invoiced this tenant for {form.forMonth}.</Alert>}
                            <div className="form-actions"><Button type="submit" size="lg" icon="send" loading={creating} disabled={!!duplicate}>Send invoice</Button></div>
                        </form>
                    )}
                </section>

                <section aria-labelledby="hist-h">
                    <h2 id="hist-h" className="mb-1">Invoice history</h2>
                    {invoices.length === 0 ? (
                        <EmptyState icon="receipt" title="No invoices yet">Invoices you create appear here with their payment status.</EmptyState>
                    ) : (<>
                        <div className="tabs mb-2" role="tablist">
                            {FILTERS.map(f => (
                                <button key={f} role="tab" className="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
                                    {f} <span className="muted">({f === "All" ? invoices.length : invoices.filter(i => i.status === f).length})</span>
                                </button>
                            ))}
                        </div>
                        {shown.length === 0 ? <EmptyState icon="search" title={`No ${filter.toLowerCase()} invoices`} /> : (
                            <div className="table-wrap">
                                <table style={{ minWidth: 820 }}>
                                    <thead><tr><th>Invoice</th><th>Tenant</th><th>Property</th><th>Month</th><th>Amount</th><th>Due</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
                                    <tbody>
                                        {shown.map(i => {
                                            const d = i.dueDate ? daysUntil(i.dueDate) : null;
                                            return (
                                                <tr key={i._id}>
                                                    <td><strong>{i.invoiceNo}</strong>{i.note && <span className="sub">{i.note}</span>}</td>
                                                    <td>{i.tenantInfo?.[0]?.name || "—"}<span className="sub">{i.tenantInfo?.[0]?.email}</span></td>
                                                    <td>{i.propertyInfo?.[0] ? `${i.propertyInfo[0].propertyType} — ${i.propertyInfo[0].area}` : "—"}</td>
                                                    <td>{i.forMonth}</td>
                                                    <td><strong>{money(i.amount)}</strong></td>
                                                    <td>{i.status === "Paid" ? <>Paid {fmtDate(i.paidAt)}<span className="sub">{i.paymentMethod}</span></> : <>{fmtDate(i.dueDate)}<span className="sub" style={{ color: d < 0 ? "var(--danger)" : undefined }}>{d === null ? "" : d < 0 ? `${-d}d overdue` : d === 0 ? "due today" : `in ${d}d`}</span></>}</td>
                                                    <td><StatusBadge status={i.status} /></td>
                                                    <td>
                                                        {i.status === "Paid" && <Button size="sm" variant="secondary" icon="receipt" onClick={() => setReceipt(i)}>Receipt</Button>}
                                                        {i.status !== "Paid" && !i.extendedDays && <Button size="sm" variant="secondary" icon="clock" onClick={() => setExtend(i)}>Extend</Button>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>)}
                </section>
            </div>)}

            {receipt && <ReceiptModal invoice={receipt} viewer="landlord" onClose={() => setReceipt(null)} />}
            {extend && <ExtendModal invoice={extend} onClose={() => setExtend(null)} onDone={() => { setExtend(null); inv.reload(true); }} />}
        </div>
    );
};

export default LandlordInvoices;
