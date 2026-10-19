import { useCallback, useEffect, useState } from "react";
import { adminAllTransactionsAPI } from "../../api/adminAPI";
import { getErrorMessage } from "../../utils/errors";
import { fmtDate, money } from "../../utils/format";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { EmptyState, ErrorState, PageHeader, Pagination, Stat, StatusBadge, TableSkeleton } from "../../components/ui";

const PER_PAGE = 20;
const FILTERS = ["", "Paid", "Pending", "Overdue"];

const AdminTransactions = () => {
    useDocumentTitle("Transactions");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [state, setState] = useState({ rows: [], count: 0, summary: {}, loading: true, error: "" });

    const load = useCallback(async () => {
        setState(s => ({ ...s, loading: true, error: "" }));
        try {
            const res = await adminAllTransactionsAPI({ pageNo: page, perPage: PER_PAGE, status: status || undefined });
            const f = res.data.data[0] || {};
            setState({
                rows: f.transactions || [], count: f.totalCount?.[0]?.count || 0, loading: false, error: "",
                summary: { paid: f.revenue?.[0], pending: f.pending?.[0], overdue: f.overdue?.[0] },
            });
        } catch (e) { setState(s => ({ ...s, loading: false, error: getErrorMessage(e) })); }
    }, [page, status]);

    useEffect(() => { load(); }, [load]);

    const totalPages = Math.max(1, Math.ceil(state.count / PER_PAGE));
    const { paid, pending, overdue } = state.summary;

    return (
        <div className="container page">
            <PageHeader title="Transactions" subtitle="Every rent invoice on the platform and its payment status." />

            <div className="stats mb-3">
                <Stat icon="money" label="Collected" value={money(paid?.total || 0)} tone="success" />
                <Stat icon="check-circle" label="Paid invoices" value={paid?.count || 0} tone="success" />
                <Stat icon="clock" label={`Pending (${pending?.count || 0})`} value={money(pending?.total || 0)} tone={pending?.count ? "warning" : undefined} />
                <Stat icon="alert" label={`Overdue (${overdue?.count || 0})`} value={money(overdue?.total || 0)} tone={overdue?.count ? "danger" : undefined} />
            </div>

            <div className="tabs mb-2" role="tablist">
                {FILTERS.map(f => <button key={f || "all"} role="tab" className="tab" aria-selected={status === f} onClick={() => { setStatus(f); setPage(1); }}>{f || "All"}</button>)}
            </div>

            {state.loading && !state.rows.length && <TableSkeleton rows={6} />}
            {state.error && <ErrorState message={state.error} onRetry={load} />}
            {!state.loading && !state.error && state.rows.length === 0 && <EmptyState icon="receipt" title="No transactions">{status ? `No ${status.toLowerCase()} invoices.` : "No invoices have been created yet."}</EmptyState>}

            {!state.error && state.rows.length > 0 && (<>
                <div className="table-wrap" style={{ opacity: state.loading ? 0.6 : 1 }}>
                    <table style={{ minWidth: 860 }}>
                        <thead><tr><th>Invoice</th><th>Tenant</th><th>Landlord</th><th>Property</th><th>Month</th><th>Amount</th><th>Method</th><th>Paid / due</th><th>Status</th></tr></thead>
                        <tbody>
                            {state.rows.map(t => (
                                <tr key={t._id}>
                                    <td><strong>{t.invoiceNo}</strong>{t.transactionRef && <span className="sub mono">{t.transactionRef}</span>}</td>
                                    <td>{t.tenantInfo?.[0]?.name || "—"}</td>
                                    <td>{t.landlordInfo?.[0]?.name || "—"}</td>
                                    <td>{t.propertyInfo?.[0]?.area || "—"}</td>
                                    <td>{t.forMonth}</td>
                                    <td><strong>{money(t.amount)}</strong></td>
                                    <td>{t.paymentMethod || "—"}</td>
                                    <td>{t.status === "Paid" ? fmtDate(t.paidAt) : <>Due {fmtDate(t.dueDate)}</>}</td>
                                    <td><StatusBadge status={t.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </>)}
        </div>
    );
};

export default AdminTransactions;
