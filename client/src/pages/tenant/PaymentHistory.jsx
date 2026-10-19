import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { paymentHistoryAPI, markAsPaidAPI } from "../../api/paymentAPI";
import { daysUntil, fmtDate, money } from "../../utils/format";
import useAsync from "../../hooks/useAsync";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Button, EmptyState, ErrorState, PageHeader, Stat, StatusBadge, TableSkeleton } from "../../components/ui";
import Modal from "../../components/Modal";
import DemoPayment from "../../components/DemoPayment";
import ReceiptModal from "../../components/ReceiptModal";
import ReportModal from "../../components/ReportModal";
import Icon from "../../components/Icon";

const DueCell = ({ inv }) => {
    if (!inv.dueDate) return "—";
    const d = daysUntil(inv.dueDate);
    const overdue = inv.status === "Overdue" || d < 0;
    return (
        <>
            {fmtDate(inv.dueDate)}
            <span className="sub" style={{ color: overdue ? "var(--danger)" : undefined }}>
                {overdue ? `${Math.max(1, Math.abs(d))} day${Math.abs(d) === 1 ? "" : "s"} overdue` : d === 0 ? "due today" : `in ${d} day${d === 1 ? "" : "s"}`}
            </span>
        </>
    );
};

const PaymentHistory = () => {
    useDocumentTitle("My payments");
    const { data, loading, error, reload } = useAsync(() => paymentHistoryAPI().then(r => r.data.data || []), []);
    const [paying, setPaying] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [reportTarget, setReportTarget] = useState(null);

    const payments = useMemo(() => data || [], [data]);
    const unpaid = useMemo(() => payments.filter(p => p.status !== "Paid").sort((a, b) => (a.status === "Overdue" ? -1 : 1) - (b.status === "Overdue" ? -1 : 1)), [payments]);
    const paid = useMemo(() => payments.filter(p => p.status === "Paid"), [payments]);
    const overdueCount = unpaid.filter(p => p.status === "Overdue").length;
    const outstanding = unpaid.reduce((s, p) => s + (p.amount || 0), 0);
    const totalPaid = paid.reduce((s, p) => s + (p.amount || 0), 0);

    const closePay = () => { if (processing) return; setPaying(null); reload(true); };

    return (
        <div className="container page">
            <PageHeader title="My payments" subtitle="Pay rent invoices from your landlords and keep your receipts." />

            {loading && !data && <TableSkeleton rows={5} />}
            {error && !data && <ErrorState message={error} onRetry={reload} />}

            {data && (<div className="stack stack-lg">
                <div className="stats">
                    <Stat icon="clock" label="Outstanding" value={money(outstanding)} tone={unpaid.length ? "warning" : undefined} />
                    <Stat icon="alert" label="Overdue invoices" value={overdueCount} tone={overdueCount ? "danger" : undefined} />
                    <Stat icon="check-circle" label="Total paid" value={money(totalPaid)} tone="success" />
                    <Stat icon="receipt" label="Receipts" value={paid.length} tone="info" />
                </div>

                {overdueCount > 0 && (
                    <Alert tone="error" title={`${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""}`}>
                        Please pay as soon as possible to avoid problems with your landlord.
                    </Alert>
                )}

                <section aria-labelledby="unpaid-h">
                    <div className="row-between mb-1"><h2 id="unpaid-h">Unpaid invoices</h2>{unpaid.length > 0 && <span className="badge badge-warning">{unpaid.length} to pay</span>}</div>
                    {unpaid.length === 0 ? (
                        <EmptyState icon="check-circle" title="You're all caught up">
                            {payments.length === 0
                                ? <>No invoices yet. Once a landlord accepts your rental request they can send you invoices here. <Link to="/tenant/requests">View my requests</Link></>
                                : "No invoices are waiting for payment."}
                        </EmptyState>
                    ) : (
                        <div className="table-wrap">
                            <table style={{ minWidth: 760 }}>
                                <thead><tr><th>Invoice</th><th>Property</th><th>Landlord</th><th>Month</th><th>Amount</th><th>Due</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead>
                                <tbody>
                                    {unpaid.map(p => {
                                        const prop = p.propertyInfo?.[0], landlord = p.landlordInfo?.[0];
                                        return (
                                            <tr key={p._id}>
                                                <td><strong>{p.invoiceNo}</strong>{p.note && <span className="sub">{p.note}</span>}</td>
                                                <td>{prop ? `${prop.propertyType} — ${prop.area}` : "—"}<span className="sub">{prop?.address}</span></td>
                                                <td>{landlord?.name || "—"}
                                                    {landlord && <button className="link-btn xs" style={{ display: "block", color: "var(--muted)" }} onClick={() => setReportTarget({ id: landlord._id, name: landlord.name })}>Report</button>}
                                                </td>
                                                <td>{p.forMonth}</td>
                                                <td><strong>{money(p.amount)}</strong></td>
                                                <td><DueCell inv={p} /></td>
                                                <td><StatusBadge status={p.status} /></td>
                                                <td><Button size="sm" variant={p.status === "Overdue" ? "danger" : "primary"} onClick={() => setPaying(p)}>Pay now</Button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section aria-labelledby="paid-h">
                    <h2 id="paid-h" className="mb-1">Payment history</h2>
                    {paid.length === 0 ? <EmptyState icon="receipt" title="No payments yet">Your receipts will appear here after you pay an invoice.</EmptyState> : (
                        <div className="table-wrap">
                            <table style={{ minWidth: 720 }}>
                                <thead><tr><th>Invoice</th><th>Property</th><th>Month</th><th>Amount</th><th>Method</th><th>Paid on</th><th><span className="sr-only">Receipt</span></th></tr></thead>
                                <tbody>
                                    {paid.map(p => (
                                        <tr key={p._id}>
                                            <td><strong>{p.invoiceNo}</strong><span className="sub mono">{p.transactionRef}</span></td>
                                            <td>{p.propertyInfo?.[0] ? `${p.propertyInfo[0].propertyType} — ${p.propertyInfo[0].area}` : "—"}</td>
                                            <td>{p.forMonth}</td>
                                            <td><strong>{money(p.amount)}</strong></td>
                                            <td>{p.paymentMethod || "—"}</td>
                                            <td>{fmtDate(p.paidAt)}</td>
                                            <td><Button size="sm" variant="secondary" icon="receipt" onClick={() => setReceipt(p)}>Receipt</Button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>)}

            {paying && (
                <Modal title={`Pay invoice ${paying.invoiceNo}`} onClose={closePay} dismissible={!processing}>
                    <DemoPayment
                        amount={paying.amount}
                        summary={[["Invoice", paying.invoiceNo], ["For month", paying.forMonth], ["Property", paying.propertyInfo?.[0]?.area || "—"]]}
                        onProcessing={setProcessing}
                        onPay={(method) => markAsPaidAPI(paying._id, method.id).then(r => r.data)}
                        renderSuccess={(res, method) => (
                            <>
                                <h3>Payment successful</h3>
                                <p className="small muted mt-1">Your rent for <strong>{paying.forMonth}</strong> has been paid with {method.label}.</p>
                                <div className="summary-box mt-2" style={{ textAlign: "left" }}>
                                    <div className="kv"><span>Invoice</span><span>{paying.invoiceNo}</span></div>
                                    <div className="kv"><span>Transaction ref.</span><span className="mono">{res.transactionRef}</span></div>
                                    <div className="kv"><span>Amount paid</span><span style={{ color: "var(--success)" }}>{money(paying.amount)}</span></div>
                                </div>
                                <Button block className="mt-2" onClick={closePay}>Done</Button>
                            </>
                        )}
                    />
                </Modal>
            )}

            {receipt && <ReceiptModal invoice={receipt} viewer="tenant" onClose={() => setReceipt(null)} />}
            {reportTarget && <ReportModal type="user" entityId={reportTarget.id} subject={reportTarget.name} onClose={() => setReportTarget(null)} />}
            <p className="xs muted center mt-3"><Icon name="shield" size={12} /> Payments are simulated – no real money moves.</p>
        </div>
    );
};

export default PaymentHistory;
