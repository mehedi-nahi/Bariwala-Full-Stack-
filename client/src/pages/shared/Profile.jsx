import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { profileAPI, updateProfileAPI, changePasswordAPI } from "../../api/userAPI";
import { myPropertiesAPI } from "../../api/propertyAPI";
import { paymentHistoryAPI } from "../../api/paymentAPI";
import { incomingRentalRequestsAPI, myRentalRequestsAPI } from "../../api/rentalRequestAPI";
import { myItemsAPI, myOrdersAPI } from "../../api/marketplaceAPI";
import { adminOverviewAPI } from "../../api/adminAPI";
import { broadcastMessageAPI } from "../../api/messageAPI";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../utils/errors";
import { fmtDate, money, plural } from "../../utils/format";
import { ROLE_LABEL } from "../../utils/constants";
import { digitsOnly, passwordStrength, STRENGTH_COLOR, STRENGTH_LABEL } from "../../utils/validate";
import useAsync from "../../hooks/useAsync";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Avatar, Button, EmptyState, ErrorState, Field, PageHeader, PageLoader, Skeleton, Stat, StatusBadge } from "../../components/ui";
import Icon from "../../components/Icon";
import PasswordInput from "../../components/PasswordInput";
import Select from "../../components/Select";

/* ── small building blocks ─────────────────────────────── */
const QuickLink = ({ to, icon, title, desc }) => (
    <Link to={to} className="quick-link">
        <span className="qi"><Icon name={icon} size={18} /></span>
        <span><b>{title}</b><span className="d">{desc}</span></span>
    </Link>
);

const Section = ({ title, to, linkText = "View all", children }) => (
    <section className="mt-3">
        <div className="row-between mb-1"><h3>{title}</h3>{to && <Link to={to} className="small strong">{linkText} →</Link>}</div>
        {children}
    </section>
);

const DashLoading = () => (
    <div className="stack stack-md" aria-busy="true"><div className="stats">{[0, 1, 2, 3].map(i => <Skeleton key={i} h={72} style={{ borderRadius: 10 }} />)}</div><Skeleton h={120} /></div>
);

/* ── Getting-started checklist (computed from the user's real data) ── */
const Onboarding = ({ userId, role, steps }) => {
    const key = `onboard-hidden:${userId}:${role}`;
    const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(key) === "1"; } catch { return false; } });
    const done = steps.filter(s => s.done).length;
    if (hidden || done === steps.length) return null;
    const hide = () => { setHidden(true); try { localStorage.setItem(key, "1"); } catch { /* ignore */ } };
    return (
        <motion.section className="card card-pad onboard mb-3" aria-labelledby="onboard-h"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="onboard-head">
                <div>
                    <h3 id="onboard-h">Getting started</h3>
                    <p className="small muted">{done} of {steps.length} done – finish these to get the most out of Bariwala.</p>
                </div>
                <button type="button" className="link-btn small" onClick={hide}>Hide</button>
            </div>
            <div className="onboard-progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done}>
                <motion.span initial={{ width: 0 }} animate={{ width: `${(done / steps.length) * 100}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <div className="onboard-steps">
                {steps.map(st => st.done ? (
                    <div key={st.label} className="onboard-step done"><span className="onboard-tick"><Icon name="check" size={14} stroke={3} /></span><span className="onboard-label">{st.label}</span></div>
                ) : (
                    <Link key={st.label} to={st.to} className="onboard-step"><span className="onboard-tick" /><span className="onboard-label">{st.label}</span><Icon name="chevron-right" size={16} className="chev" /></Link>
                ))}
            </div>
        </motion.section>
    );
};

/* ── Landlord ──────────────────────────────────────────── */
const LandlordDashboard = ({ profile }) => {
    const { data, loading, error, reload } = useAsync(async () => {
        const [props, inv, reqs] = await Promise.all([myPropertiesAPI(), paymentHistoryAPI(), incomingRentalRequestsAPI()]);
        return { props: props.data.data || [], inv: inv.data.data || [], reqs: reqs.data.data || [] };
    }, []);
    if (loading && !data) return <DashLoading />;
    if (error && !data) return <ErrorState message={error} onRetry={reload} />;
    const { props, inv, reqs } = data;
    const pendingReqs = reqs.filter(r => r.status === "Pending").length;
    const unpaid = inv.filter(i => i.status !== "Paid");
    const revenue = inv.filter(i => i.status === "Paid").reduce((s, i) => s + (i.amount || 0), 0);

    return (
        <>
            <Onboarding userId={profile._id} role="landlord" steps={[
                { label: "Add a phone number to your profile", done: !!profile.phone, to: "/profile" },
                { label: "List your first property", done: props.length > 0, to: "/landlord/add-property" },
                { label: "Accept a tenant's rental request", done: reqs.some(r => r.status === "Accepted"), to: "/landlord/properties" },
                { label: "Send your first rent invoice", done: inv.length > 0, to: "/landlord/invoices" },
            ]} />
            {pendingReqs > 0 && (
                <div className="mb-2"><Alert tone="warning" title={`${plural(pendingReqs, "rental request")} waiting for your reply`}>
                    <Link to="/landlord/properties">Review requests →</Link>
                </Alert></div>
            )}
            <div className="stats">
                <Stat icon="building" label="Properties" value={props.length} />
                <Stat icon="check-circle" label="Available" value={props.filter(p => p.availability === "Available").length} tone="success" />
                <Stat icon="key" label="Rented" value={props.filter(p => p.availability === "Rented").length} tone="info" />
                <Stat icon="money" label="Rent collected" value={money(revenue)} tone="success" />
                <Stat icon="clock" label="Unpaid invoices" value={unpaid.length} tone={unpaid.length ? "warning" : undefined} />
            </div>
            <Section title="Quick actions">
                <div className="auto-grid" style={{ "--min": "185px" }}>
                    <QuickLink to="/landlord/add-property" icon="plus" title="Add a property" desc="List a new rental" />
                    <QuickLink to="/landlord/properties" icon="building" title="My properties" desc="Edit, rent status, requests" />
                    <QuickLink to="/landlord/invoices" icon="receipt" title="Invoices" desc="Bill tenants & track payments" />
                    <QuickLink to="/landlord/inbox" icon="mail" title="Inbox" desc="Chat with tenants" />
                </div>
            </Section>
            <Section title="Recent properties" to="/landlord/properties">
                {props.length === 0 ? (
                    <EmptyState icon="building" title="No properties yet" action={<Link to="/landlord/add-property" className="btn btn-primary">Add your first property</Link>}>List a home to start receiving rental requests.</EmptyState>
                ) : (
                    <div className="card">
                        {props.slice(0, 4).map((p, i) => (
                            <Link key={p._id} to={`/property/${p._id}`} className="card-pad row-between" style={{ borderTop: i ? "1px solid var(--line)" : 0, color: "inherit" }}>
                                <span><strong>{p.propertyType} in {p.area}</strong><span className="small muted" style={{ display: "block" }}>{p.address}</span></span>
                                <span className="row"><strong>{money(p.monthlyRent)}</strong><StatusBadge status={p.availability} /></span>
                            </Link>
                        ))}
                    </div>
                )}
            </Section>
        </>
    );
};

/* ── Tenant ────────────────────────────────────────────── */
const TenantDashboard = ({ profile }) => {
    const { data, loading, error, reload } = useAsync(async () => {
        const [inv, reqs] = await Promise.all([paymentHistoryAPI(), myRentalRequestsAPI()]);
        return { inv: inv.data.data || [], reqs: reqs.data.data || [] };
    }, []);
    if (loading && !data) return <DashLoading />;
    if (error && !data) return <ErrorState message={error} onRetry={reload} />;
    const { inv, reqs } = data;
    const unpaid = inv.filter(i => i.status !== "Paid");
    const overdue = unpaid.filter(i => i.status === "Overdue");
    const paidTotal = inv.filter(i => i.status === "Paid").reduce((s, i) => s + (i.amount || 0), 0);

    return (
        <>
            <Onboarding userId={profile._id} role="tenant" steps={[
                { label: "Add a phone number to your profile", done: !!profile.phone, to: "/profile" },
                { label: "Send a rental request for a home you like", done: reqs.length > 0, to: "/" },
                { label: "Get a request accepted by a landlord", done: reqs.some(r => r.status === "Accepted"), to: "/tenant/requests" },
                { label: "Pay your first rent invoice online", done: inv.some(i => i.status === "Paid"), to: "/tenant/payments" },
            ]} />
            {unpaid.length > 0 && (
                <div className="mb-2"><Alert tone={overdue.length ? "error" : "warning"} title={overdue.length ? `${plural(overdue.length, "overdue invoice")}` : `${plural(unpaid.length, "invoice")} to pay`}>
                    <Link to="/tenant/payments">Pay now →</Link>
                </Alert></div>
            )}
            <div className="stats">
                <Stat icon="clock" label="To pay" value={money(unpaid.reduce((s, i) => s + (i.amount || 0), 0))} tone={unpaid.length ? "warning" : undefined} />
                <Stat icon="alert" label="Overdue" value={overdue.length} tone={overdue.length ? "danger" : undefined} />
                <Stat icon="check-circle" label="Total paid" value={money(paidTotal)} tone="success" />
                <Stat icon="key" label="Active requests" value={reqs.filter(r => r.status === "Pending").length} tone="info" />
            </div>
            <Section title="Quick actions">
                <div className="auto-grid" style={{ "--min": "185px" }}>
                    <QuickLink to="/" icon="search" title="Find a home" desc="Search listings" />
                    <QuickLink to="/tenant/requests" icon="key" title="My requests" desc="Track your applications" />
                    <QuickLink to="/tenant/payments" icon="card" title="Payments" desc="Pay rent & view receipts" />
                    <QuickLink to="/tenant/inbox" icon="mail" title="Inbox" desc="Chat with landlords" />
                </div>
            </Section>
            <Section title="Recent requests" to="/tenant/requests">
                {reqs.length === 0 ? (
                    <EmptyState icon="key" title="You haven't requested a home yet" action={<Link to="/" className="btn btn-primary">Browse homes</Link>}>Found something you like? Click “Request to rent” on the listing.</EmptyState>
                ) : (
                    <div className="card">
                        {reqs.slice(0, 4).map((r, i) => {
                            const p = r.propertyInfo?.[0];
                            return (
                                <Link key={r._id} to={p ? `/property/${p._id}` : "/tenant/requests"} className="card-pad row-between" style={{ borderTop: i ? "1px solid var(--line)" : 0, color: "inherit" }}>
                                    <span><strong>{p ? `${p.propertyType} in ${p.area}` : "Property removed"}</strong><span className="small muted" style={{ display: "block" }}>{fmtDate(r.updatedAt || r.createdAt)}</span></span>
                                    <StatusBadge status={r.status} />
                                </Link>
                            );
                        })}
                    </div>
                )}
            </Section>
        </>
    );
};

/* ── Marketplace ───────────────────────────────────────── */
const MarketplaceDashboard = ({ profile }) => {
    const { data, loading, error, reload } = useAsync(async () => {
        const [items, orders] = await Promise.all([myItemsAPI(), myOrdersAPI()]);
        return { items: items.data.data || [], orders: orders.data.data || [] };
    }, []);
    if (loading && !data) return <DashLoading />;
    if (error && !data) return <ErrorState message={error} onRetry={reload} />;
    const { items, orders } = data;
    const active = items.filter(i => !i.isSold && !i.isRemoved);
    const sold = items.filter(i => i.isSold);

    return (
        <>
            <Onboarding userId={profile._id} role="marketplace" steps={[
                { label: "Add a phone number to your profile", done: !!profile.phone, to: "/profile" },
                { label: "List your first item for sale", done: items.length > 0, to: "/marketplace/add-item" },
                { label: "Make your first sale", done: sold.length > 0, to: "/marketplace/my-items" },
                { label: "Buy something from a neighbour", done: orders.length > 0, to: "/marketplace/items" },
            ]} />
            <div className="stats">
                <Stat icon="tag" label="Active listings" value={active.length} />
                <Stat icon="check-circle" label="Items sold" value={sold.length} tone="success" />
                <Stat icon="money" label="Sales value" value={money(sold.reduce((s, i) => s + (i.price || 0), 0))} tone="success" />
                <Stat icon="package" label="Orders placed" value={orders.length} tone="info" />
            </div>
            <Section title="Quick actions">
                <div className="auto-grid" style={{ "--min": "185px" }}>
                    <QuickLink to="/marketplace/add-item" icon="plus" title="Sell an item" desc="Create a new listing" />
                    <QuickLink to="/marketplace/my-items" icon="tag" title="My listings" desc="Edit, remove, see sales" />
                    <QuickLink to="/marketplace/orders" icon="package" title="My orders" desc="Things you've bought" />
                    <QuickLink to="/marketplace/inbox" icon="mail" title="Inbox" desc="Chat with buyers & sellers" />
                </div>
            </Section>
            <Section title="Latest listings" to="/marketplace/my-items">
                {active.length === 0 ? (
                    <EmptyState icon="tag" title="No active listings" action={<Link to="/marketplace/add-item" className="btn btn-primary">Sell your first item</Link>}>Photos and a fair price help items sell faster.</EmptyState>
                ) : (
                    <div className="card">
                        {active.slice(0, 4).map((i, idx) => (
                            <Link key={i._id} to={`/marketplace/item/${i._id}`} className="card-pad row-between" style={{ borderTop: idx ? "1px solid var(--line)" : 0, color: "inherit" }}>
                                <strong>{i.title}</strong><span className="row"><span className="badge">{i.condition}</span><strong>{money(i.price)}</strong></span>
                            </Link>
                        ))}
                    </div>
                )}
            </Section>
        </>
    );
};

/* ── Admin ─────────────────────────────────────────────── */
const AdminDashboard = () => {
    const toast = useToast();
    const { data, loading, error, reload } = useAsync(() => adminOverviewAPI().then(r => r.data.data), []);
    const [tab, setTab] = useState("overview");
    const [role, setRole] = useState("");
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [err, setErr] = useState("");

    if (loading && !data) return <DashLoading />;
    if (error && !data) return <ErrorState message={error} onRetry={reload} />;

    const byRole = Object.fromEntries((data.users || []).map(u => [u._id, u]));
    const totalUsers = (data.users || []).reduce((s, u) => s + u.count, 0);
    const blocked = (data.users || []).reduce((s, u) => s + u.blocked, 0);
    const pendingReports = (data.pendingReports || []).reduce((s, r) => s + r.count, 0);
    const txn = Object.fromEntries((data.txn || []).map(t => [t._id, t]));
    const items = data.items || {};

    const broadcast = async (e) => {
        e.preventDefault();
        if (!text.trim()) { setErr("Write the announcement first."); return; }
        setSending(true); setErr("");
        try {
            const res = await broadcastMessageAPI({ message: text.trim(), targetRole: role || undefined });
            toast.success(res.data.message);
            setText(""); setRole("");
        } catch (e2) { setErr(getErrorMessage(e2)); }
        finally { setSending(false); }
    };

    return (
        <>
            <div className="tabs mb-2" role="tablist">
                <button className="tab" role="tab" aria-selected={tab === "overview"} onClick={() => setTab("overview")}>Overview</button>
                <button className="tab" role="tab" aria-selected={tab === "broadcast"} onClick={() => setTab("broadcast")}>Announcement</button>
            </div>

            {tab === "overview" && (<>
                {pendingReports > 0 && (
                    <div className="mb-2"><Alert tone="warning" title={`${plural(pendingReports, "report")} need review`}><Link to="/admin/reports">Open reports →</Link></Alert></div>
                )}
                <div className="stats">
                    <Stat icon="users" label="Total users" value={totalUsers} />
                    <Stat icon="building" label="Landlords" value={byRole.landlord?.count || 0} tone="info" />
                    <Stat icon="key" label="Tenants" value={byRole.tenant?.count || 0} tone="success" />
                    <Stat icon="bag" label="Marketplace users" value={byRole.marketplace?.count || 0} tone="warning" />
                    <Stat icon="ban" label="Blocked" value={blocked} tone={blocked ? "danger" : undefined} />
                    <Stat icon="flag" label="Pending reports" value={pendingReports} tone={pendingReports ? "danger" : undefined} />
                </div>
                <Section title="Money">
                    <div className="stats">
                        <Stat icon="money" label="Rent collected" value={money(txn.Paid?.total || 0)} tone="success" />
                        <Stat icon="clock" label={`Pending invoices (${txn.Pending?.count || 0})`} value={money(txn.Pending?.total || 0)} tone="warning" />
                        <Stat icon="alert" label={`Overdue invoices (${txn.Overdue?.count || 0})`} value={money(txn.Overdue?.total || 0)} tone={txn.Overdue?.count ? "danger" : undefined} />
                        <Stat icon="tag" label={`Active items · ${items.sold || 0} sold`} value={items.active || 0} />
                    </div>
                </Section>
                <Section title="Manage">
                    <div className="auto-grid" style={{ "--min": "185px" }}>
                        <QuickLink to="/admin/users" icon="users" title="Users" desc="Search, block, unblock" />
                        <QuickLink to="/admin/reports" icon="flag" title="Reports" desc="Moderate listings & users" />
                        <QuickLink to="/admin/transactions" icon="card" title="Transactions" desc="All rent payments" />
                        <QuickLink to="/admin/inbox" icon="mail" title="Inbox" desc="Messages & replies" />
                    </div>
                </Section>
            </>)}

            {tab === "broadcast" && (
                <form className="card card-pad" onSubmit={broadcast} noValidate style={{ maxWidth: 560 }}>
                    <h3>Send an announcement</h3>
                    <p className="small muted">Delivered to each person&apos;s inbox. They can reply to you directly.</p>
                    {err && <Alert tone="error">{err}</Alert>}
                    <Field label="Send to">
                        <Select value={role} onChange={e => setRole(e.target.value)}>
                            <option value="">Everyone</option>
                            <option value="tenant">Tenants only</option>
                            <option value="landlord">Landlords only</option>
                            <option value="marketplace">Marketplace users only</option>
                        </Select>
                    </Field>
                    <Field label="Message" required>
                        <textarea value={text} maxLength={500} onChange={e => { setText(e.target.value); setErr(""); }} placeholder="Type your announcement…" />
                    </Field>
                    <div className="row-between"><span className="char-count">{text.length}/500</span><Button type="submit" icon="send" loading={sending} disabled={!text.trim()}>Send announcement</Button></div>
                </form>
            )}
        </>
    );
};

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

const DASHBOARDS = { landlord: LandlordDashboard, tenant: TenantDashboard, marketplace: MarketplaceDashboard, admin: AdminDashboard };

/* ── Edit profile + password ───────────────────────────── */
const EditProfile = ({ profile, onSaved, onCancel }) => {
    const toast = useToast();
    const [form, setForm] = useState({ name: profile.name || "", phone: profile.phone || "", bio: profile.bio || "" });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

    const submit = async (e) => {
        e.preventDefault();
        const err = {};
        if (form.name.trim().length < 2) err.name = "Enter your full name.";
        if (form.phone && form.phone.length !== 11) err.phone = "Phone number must be exactly 11 digits.";
        setErrors(err);
        if (Object.keys(err).length) return;
        setSaving(true);
        try {
            const res = await updateProfileAPI({ name: form.name.trim(), phone: form.phone, bio: form.bio.trim() });
            toast.success("Profile updated.");
            onSaved(res.data.data);
        } catch (e2) { toast.error(getErrorMessage(e2, "Could not update your profile.")); }
        finally { setSaving(false); }
    };

    return (
        <form onSubmit={submit} noValidate>
            <Field label="Full name" error={errors.name} required><input value={form.name} onChange={e => set("name", e.target.value)} autoComplete="name" /></Field>
            <Field label="Phone" error={errors.phone} optional hint="11 digits">
                <input type="tel" inputMode="numeric" value={form.phone} placeholder="01XXXXXXXXX" onChange={e => set("phone", digitsOnly(e.target.value, 11))} />
            </Field>
            <Field label="About you" optional><textarea value={form.bio} maxLength={200} onChange={e => set("bio", e.target.value)} placeholder="A short bio others can see" /></Field>
            <div className="char-count">{form.bio.length}/200</div>
            <div className="form-actions"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" loading={saving}>Save changes</Button></div>
        </form>
    );
};

const ChangePassword = () => {
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ current: "", next: "", confirm: "" });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };
    const strength = passwordStrength(form.next);

    const submit = async (e) => {
        e.preventDefault();
        const err = {};
        if (!form.current) err.current = "Enter your current password.";
        if (form.next.length < 8) err.next = "Use at least 8 characters.";
        if (form.confirm !== form.next) err.confirm = "Passwords don't match.";
        setErrors(err);
        if (Object.keys(err).length) return;
        setSaving(true);
        try {
            await changePasswordAPI({ currentPassword: form.current, newPassword: form.next });
            toast.success("Password changed.");
            setForm({ current: "", next: "", confirm: "" });
            setOpen(false);
        } catch (e2) { setErrors({ current: getErrorMessage(e2, "Could not change password.") }); }
        finally { setSaving(false); }
    };

    if (!open) return <Button variant="secondary" block icon="lock" onClick={() => setOpen(true)}>Change password</Button>;
    return (
        <form onSubmit={submit} noValidate>
            <Field label="Current password" error={errors.current}><PasswordInput autoComplete="current-password" value={form.current} onChange={e => set("current", e.target.value)} /></Field>
            <Field label="New password" error={errors.next}><PasswordInput autoComplete="new-password" value={form.next} onChange={e => set("next", e.target.value)} /></Field>
            {form.next && <div style={{ marginTop: "-0.4rem" }}><div className="pw-meter"><span style={{ width: `${strength * 25}%`, background: STRENGTH_COLOR[strength] }} /></div><span className="xs muted">Strength: <strong>{STRENGTH_LABEL[strength]}</strong></span></div>}
            <Field label="Confirm new password" error={errors.confirm}><PasswordInput autoComplete="new-password" value={form.confirm} onChange={e => set("confirm", e.target.value)} /></Field>
            <div className="form-actions"><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={saving}>Update password</Button></div>
        </form>
    );
};

/* ══════════════════════════════════════════════════════════ */
const Profile = ({ setUser }) => {
    useDocumentTitle("Dashboard");
    const { data: profile, loading, error, reload, setData } = useAsync(() => profileAPI().then(r => r.data.data[0]), []);
    const [editing, setEditing] = useState(false);

    if (loading && !profile) return <PageLoader label="Loading your dashboard…" />;
    if (error && !profile) return <div className="container page"><ErrorState message={error} onRetry={reload} /></div>;

    const Dashboard = DASHBOARDS[profile.role];
    const firstName = profile.name.split(" ")[0];

    return (
        <div className="container page">
            <PageHeader
                title={`${greeting()}, ${firstName}`}
                subtitle={<span className="greet-sub">{ROLE_LABEL[profile.role]} dashboard · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>}
            />
            <div className="dash-grid">
                <aside className="stack stack-md">
                    <div className="card card-pad">
                        <div className="row" style={{ gap: "0.9rem" }}>
                            <Avatar name={profile.name} size={56} />
                            <div style={{ minWidth: 0 }}>
                                <strong className="truncate" style={{ display: "block", fontSize: "1.05rem" }}>{profile.name}</strong>
                                <span className="badge badge-brand">{ROLE_LABEL[profile.role]}</span>
                            </div>
                        </div>
                        {editing ? (
                            <div className="mt-2">
                                <EditProfile profile={profile} onCancel={() => setEditing(false)} onSaved={(p) => {
                                    setData(prev => ({ ...prev, ...p }));
                                    setUser(u => ({ ...u, name: p.name }));
                                    setEditing(false);
                                }} />
                            </div>
                        ) : (<>
                            <div className="mt-2">
                                <div className="kv"><span><Icon name="mail" size={14} /> Email</span><span className="truncate">{profile.email}</span></div>
                                <div className="kv"><span><Icon name="phone" size={14} /> Phone</span><span>{profile.phone || <span className="faint">Not added</span>}</span></div>
                                <div className="kv"><span><Icon name="calendar" size={14} /> Joined</span><span>{fmtDate(profile.createdAt)}</span></div>
                            </div>
                            {profile.bio && <p className="small mt-2" style={{ background: "var(--surface-2)", padding: "0.7rem", borderRadius: 8 }}>{profile.bio}</p>}
                            <Button variant="secondary" block icon="edit" className="mt-2" onClick={() => setEditing(true)}>Edit profile</Button>
                        </>)}
                    </div>
                    <div className="card card-pad stack stack-sm">
                        <h3>Security</h3>
                        <ChangePassword />
                    </div>
                </aside>

                <section aria-label="Dashboard">{Dashboard && <Dashboard profile={profile} />}</section>
            </div>
        </div>
    );
};

export default Profile;
