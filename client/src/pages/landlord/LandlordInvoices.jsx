import { useEffect, useState } from "react";
import { generateInvoiceAPI, paymentHistoryAPI } from "../../api/paymentAPI";
import { myPropertiesAPI } from "../../api/propertyAPI";

const LandlordInvoices = ({ user }) => {
    const [invoices, setInvoices]     = useState([]);
    const [properties, setProperties] = useState([]);
    const [form, setForm]             = useState({ tenantId: "", propertyId: "", amount: "", forMonth: "" });
    const [msg, setMsg]               = useState("");

    const load = () => {
        paymentHistoryAPI().then(res => setInvoices(res.data.data));
        myPropertiesAPI().then(res => setProperties(res.data.data));
    };

    useEffect(() => { load(); }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleGenerate = async (e) => {
        e.preventDefault();
        setMsg("");
        try {
            await generateInvoiceAPI(form);
            setMsg("Invoice generated successfully!");
            setForm({ tenantId: "", propertyId: "", amount: "", forMonth: "" });
            load();
        } catch (err) {
            setMsg(err.response?.data?.message || "Failed to generate invoice");
        }
    };

    return (
        <div className="container">
            <h2>Invoice Management</h2>

            <div className="message-box">
                <h3>Generate New Invoice</h3>
                {msg && <p className="success">{msg}</p>}
                <form onSubmit={handleGenerate}>
                    <input name="tenantId"   placeholder="Tenant ID"          value={form.tenantId}   onChange={handleChange} required />
                    <select name="propertyId" value={form.propertyId} onChange={handleChange} required>
                        <option value="">Select Property</option>
                        {properties.map(p => (
                            <option key={p._id} value={p._id}>{p.propertyType} — {p.area}</option>
                        ))}
                    </select>
                    <input name="amount"   placeholder="Amount (BDT)" value={form.amount}   onChange={handleChange} required type="number" />
                    <input name="forMonth" placeholder="For Month (e.g. February 2026)" value={form.forMonth} onChange={handleChange} required />
                    <button type="submit">Generate Invoice</button>
                </form>
            </div>

            <h3 style={{ marginTop: "2rem" }}>Invoice History</h3>
            <table>
                <thead>
                    <tr><th>Invoice No</th><th>Tenant</th><th>Property</th><th>Amount</th><th>Month</th><th>Status</th></tr>
                </thead>
                <tbody>
                    {invoices.map(inv => (
                        <tr key={inv._id}>
                            <td>{inv.invoiceNo}</td>
                            <td>{inv.tenantInfo?.[0]?.name || inv.tenant}</td>
                            <td>{inv.propertyInfo?.[0]?.area}</td>
                            <td>৳{inv.amount}</td>
                            <td>{inv.forMonth}</td>
                            <td><span className={`badge ${inv.status === "Paid" ? "green" : "red"}`}>{inv.status}</span></td>
                        </tr>
                    ))}
                    {invoices.length === 0 && <tr><td colSpan="6">No invoices yet.</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

export default LandlordInvoices;

