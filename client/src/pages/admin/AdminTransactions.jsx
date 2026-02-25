import { useEffect, useState } from "react";
import { adminAllTransactionsAPI } from "../../api/adminAPI";

const AdminTransactions = () => {
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        adminAllTransactionsAPI().then(res => setTransactions(res.data.data[0]?.transactions || []));
    }, []);

    return (
        <div className="container">
            <h2>All Transactions</h2>
            <table>
                <thead>
                    <tr><th>Invoice No</th><th>Tenant</th><th>Landlord</th><th>Property</th><th>Amount</th><th>Month</th><th>Status</th></tr>
                </thead>
                <tbody>
                    {transactions.map(t => (
                        <tr key={t._id}>
                            <td>{t.invoiceNo}</td>
                            <td>{t.tenantInfo?.[0]?.name}</td>
                            <td>{t.landlordInfo?.[0]?.name}</td>
                            <td>{t.propertyInfo?.[0]?.area}</td>
                            <td>৳{t.amount}</td>
                            <td>{t.forMonth}</td>
                            <td><span className={`badge ${t.status === "Paid" ? "green" : "red"}`}>{t.status}</span></td>
                        </tr>
                    ))}
                    {transactions.length === 0 && <tr><td colSpan="7">No transactions yet.</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

export default AdminTransactions;

