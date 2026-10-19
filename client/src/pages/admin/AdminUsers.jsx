import { useCallback, useEffect, useState } from "react";
import { adminAllUsersAPI, adminBlockUserAPI } from "../../api/adminAPI";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { ROLE_LABEL } from "../../utils/constants";
import { getErrorMessage } from "../../utils/errors";
import { fmtDate } from "../../utils/format";
import useDebounce from "../../hooks/useDebounce";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Avatar, Button, EmptyState, ErrorState, PageHeader, Pagination, Stat, StatusBadge, TableSkeleton } from "../../components/ui";
import Icon from "../../components/Icon";
import Select from "../../components/Select";

const PER_PAGE = 20;

const AdminUsers = () => {
    useDocumentTitle("Users");
    const toast = useToast();
    const confirm = useConfirm();
    const [q, setQ] = useState("");
    const dq = useDebounce(q);
    const [role, setRole] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [state, setState] = useState({ users: [], filtered: 0, totals: {}, loading: true, error: "" });
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async (silent = false) => {
        if (!silent) setState(s => ({ ...s, loading: true, error: "" }));
        try {
            const res = await adminAllUsersAPI({ pageNo: page, perPage: PER_PAGE, q: dq.trim() || undefined, role: role || undefined, status: status || undefined });
            const f = res.data.data[0] || {};
            setState({
                users: f.users || [], filtered: f.filteredCount?.[0]?.count || 0, loading: false, error: "",
                totals: { all: f.totalCount?.[0]?.count || 0, landlords: f.landlordCount?.[0]?.count || 0, tenants: f.tenantCount?.[0]?.count || 0, blocked: f.blockedCount?.[0]?.count || 0 },
            });
        } catch (e) { setState(s => ({ ...s, loading: false, error: getErrorMessage(e) })); }
    }, [page, dq, role, status]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [dq, role, status]);

    const toggleBlock = async (u) => {
        const blocking = !u.isBlocked;
        const ok = await confirm({
            title: blocking ? `Block ${u.name}?` : `Unblock ${u.name}?`,
            message: blocking ? "They will be logged out of every device and won't be able to log in until unblocked." : "They will be able to log in and use Bariwala again.",
            confirmText: blocking ? "Block user" : "Unblock", tone: blocking ? "danger" : "primary",
        });
        if (!ok) return;
        setBusyId(u._id);
        try {
            await adminBlockUserAPI(u._id);
            toast.success(blocking ? `${u.name} was blocked.` : `${u.name} was unblocked.`);
            load(true);
        } catch (e) { toast.error(getErrorMessage(e)); }
        finally { setBusyId(null); }
    };

    const totalPages = Math.max(1, Math.ceil(state.filtered / PER_PAGE));
    const filtering = dq || role || status;

    return (
        <div className="container page">
            <PageHeader title="Users" subtitle="Search accounts and block anyone who breaks the rules." />

            <div className="stats mb-3">
                <Stat icon="users" label="All users" value={state.totals.all ?? "—"} />
                <Stat icon="building" label="Landlords" value={state.totals.landlords ?? "—"} tone="info" />
                <Stat icon="key" label="Tenants" value={state.totals.tenants ?? "—"} tone="success" />
                <Stat icon="ban" label="Blocked" value={state.totals.blocked ?? "—"} tone={state.totals.blocked ? "danger" : undefined} />
            </div>

            <div className="card card-pad row-wrap mb-2" role="search">
                <div className="input-icon grow" style={{ minWidth: 220 }}>
                    <Icon name="search" size={16} />
                    <input type="search" placeholder="Search by name or email" aria-label="Search users" value={q} onChange={e => setQ(e.target.value)} />
                </div>
                <Select value={role} onChange={e => setRole(e.target.value)} aria-label="Filter by role">
                    <option value="">All roles</option>
                    {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
                <Select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status">
                    <option value="">Any status</option><option value="active">Active</option><option value="blocked">Blocked</option>
                </Select>
                {filtering && <Button variant="ghost" onClick={() => { setQ(""); setRole(""); setStatus(""); }}>Clear</Button>}
            </div>

            {state.loading && !state.users.length && <TableSkeleton rows={6} />}
            {state.error && <ErrorState message={state.error} onRetry={load} />}
            {!state.loading && !state.error && state.users.length === 0 && <EmptyState icon="users" title="No users found">{filtering ? "Try different search terms or filters." : "No one has signed up yet."}</EmptyState>}

            {!state.error && state.users.length > 0 && (<>
                <div className="table-wrap" style={{ opacity: state.loading ? 0.6 : 1 }}>
                    <table style={{ minWidth: 700 }}>
                        <thead><tr><th>User</th><th>Role</th><th>Phone</th><th>Joined</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead>
                        <tbody>
                            {state.users.map(u => (
                                <tr key={u._id}>
                                    <td><div className="row"><Avatar name={u.name} size={34} /><div style={{ minWidth: 0 }}><strong className="truncate" style={{ display: "block" }}>{u.name}</strong><span className="sub">{u.email}</span></div></div></td>
                                    <td><span className="badge">{ROLE_LABEL[u.role] || u.role}</span></td>
                                    <td>{u.phone || <span className="faint">—</span>}</td>
                                    <td>{fmtDate(u.createdAt)}</td>
                                    <td><StatusBadge status={u.isBlocked ? "Blocked" : "Active"} /></td>
                                    <td>
                                        {u.role !== "admin" && (
                                            <Button size="sm" variant={u.isBlocked ? "secondary" : "danger-outline"} icon={u.isBlocked ? "refresh" : "ban"} loading={busyId === u._id} onClick={() => toggleBlock(u)}>
                                                {u.isBlocked ? "Unblock" : "Block"}
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="small muted mt-1">{state.filtered} {state.filtered === 1 ? "user" : "users"}{filtering ? " match" : ""}</p>
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </>)}
        </div>
    );
};

export default AdminUsers;
