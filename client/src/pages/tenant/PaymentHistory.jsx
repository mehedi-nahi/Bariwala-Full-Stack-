import { useEffect, useState } from "react";
import { paymentHistoryAPI, markAsPaidAPI } from "../../api/paymentAPI";

const PaymentHistory = () => {
    const [payments, setPayments] = useState([]);
    const [msg, setMsg]           = useState("");

    const load = () => paymentHistoryAPI().then(res => setPayments(res.data.data));

    useEffect(() => { load(); }, []);

    const handlePay = async (invoiceId) => {
        try {
            await markAsPaidAPI(invoiceId);
            setMsg("Payment marked as paid!");
            load();
        } catch (err) {
            setMsg(err.response?.data?.message || "Payment failed");
        }
    };

    return (
        <div className="container">
            <h2>Payment History</h2>
            {msg && <p className="success">{msg}</p>}
            {payments.length === 0 && <p>No invoices yet.</p>}
            <table>
                <thead>
                    <tr>
                        <th>Invoice No</th>
                        <th>For Month</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {payments.map(p => (
                        <tr key={p._id}>
                            <td>{p.invoiceNo}</td>
                            <td>{p.forMonth}</td>
                            <td>৳{p.amount}</td>
                            <td><span className={`badge ${p.status === "Paid" ? "green" : "red"}`}>{p.status}</span></td>
                            <td>
                                {p.status === "Pending" &&
                                    <button onClick={() => handlePay(p._id)}>Pay Now</button>
                                }
                                {p.status === "Paid" && <span>✓ Paid on {new Date(p.paidAt).toLocaleDateString()}</span>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PaymentHistory;

