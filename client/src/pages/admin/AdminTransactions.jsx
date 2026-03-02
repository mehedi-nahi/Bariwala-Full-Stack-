import { useEffect, useState } from "react";
import { adminAllTransactionsAPI } from "../../api/adminAPI";

const statusBadge = (s) => {
    const cls = s === "Paid" ? "green" : s === "Overdue" ? "red" : "yellow";
    return <span className={`badge ${cls}`}>{s}</span>;
};

const AdminTransactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [total,        setTotal]        = useState(0);
    const [page,         setPage]         = useState(1);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState("");
    const PER_PAGE = 20;

    const load = async (p = page) => {
        setLoading(true); setError("");
        try {
            const res = await adminAllTransactionsAPI({ pageNo: p, perPage: PER_PAGE });
            const facet = res.data.data[0] || {};
            setTransactions(facet.transactions || []);
            setTotal(facet.totalCount?.[0]?.count || 0);
        } catch (e) {
            setError(e.response?.data?.message || "Failed to load transactions.");
        } finally { setLoading(false); }
    };

    useEffect(() => { load(page); }, [page]); // eslint-disable-line

    const totalPages = Math.ceil(total / PER_PAGE);

    return (
        <div className="container">
            <h2>All Transactions <span style={{ fontSize:"0.85rem", color:"#aaa", fontWeight:400 }}>({total} total)</span></h2>
            {error && <p className="error">{error}</p>}
            {loading ? (
                <p style={{ color:"#aaa", textAlign:"center", padding:"2rem" }}>Loading transactions...</p>
            ) : (
                <>
                    <table>
                        <thead>
                            <tr><th>Invoice No</th><th>Tenant</th><th>Landlord</th><th>Property</th><th>Amount</th><th>Month</th><th>Method</th><th>Date</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            {transactions.length === 0 && <tr><td colSpan="9" style={{ textAlign:"center", color:"#aaa" }}>No transactions yet.</td></tr>}
                            {transactions.map(t => (
                                <tr key={t._id}>
                                    <td><strong>{t.invoiceNo}</strong></td>
                                    <td>{t.tenantInfo?.[0]?.name || "—"}</td>
                                    <td>{t.landlordInfo?.[0]?.name || "—"}</td>
                                    <td>{t.propertyInfo?.[0]?.area || "—"}</td>
                                    <td>৳{t.amount?.toLocaleString()}</td>
                                    <td>{t.forMonth}</td>
                                    <td>{t.paymentMethod || "—"}</td>
                                    <td>{t.paidAt ? new Date(t.paidAt).toLocaleDateString("en-GB") : "—"}</td>
                                    <td>{statusBadge(t.status)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {totalPages > 1 && (
                        <div style={{ display:"flex", gap:"0.5rem", justifyContent:"center", marginTop:"1.5rem" }}>
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                            <span style={{ padding:"0.4rem 0.8rem", fontSize:"0.85rem", color:"#888" }}>Page {page} / {totalPages}</span>
                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminTransactions;

