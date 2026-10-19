import { fmtDateTime, money } from "../utils/format";
import Modal from "./Modal";
import Icon from "./Icon";
import { Button } from "./ui";

/** Payment receipt for a paid invoice. `viewer` decides whether we show the landlord or the tenant as the "other party". */
const ReceiptModal = ({ invoice, viewer = "tenant", onClose }) => {
    const prop = invoice.propertyInfo?.[0];
    const other = viewer === "tenant" ? invoice.landlordInfo?.[0] : invoice.tenantInfo?.[0];
    const rows = [
        ["Invoice no.", invoice.invoiceNo],
        ["Transaction ref.", invoice.transactionRef || "—"],
        ["Payment method", invoice.paymentMethod || "—"],
        [viewer === "tenant" ? "Landlord" : "Tenant", other?.name || "—"],
        ["Property", prop ? `${prop.propertyType} — ${prop.area}` : "—"],
        ...(prop?.address ? [["Address", prop.address]] : []),
        ["For month", invoice.forMonth],
        ...(invoice.note ? [["Note", invoice.note]] : []),
        ["Paid on", fmtDateTime(invoice.paidAt)],
    ];
    return (
        <Modal
            title="Payment receipt" onClose={onClose}
            footer={<>
                <Button variant="secondary" icon="printer" onClick={() => window.print()} className="no-print">Print</Button>
                <Button onClick={onClose} className="no-print">Close</Button>
            </>}
        >
            <div className="center mb-2">
                <div className="success-ring" style={{ width: 56, height: 56, marginBottom: "0.5rem" }}><Icon name="check" size={28} stroke={2.6} /></div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em" }}>{money(invoice.amount)}</div>
                <span className="badge badge-success badge-dot mt-1">Paid &amp; verified</span>
            </div>
            <div className="summary-box">
                {rows.map(([k, v]) => <div className="kv" key={k}><span>{k}</span><span className={k.includes("ref") ? "mono" : ""}>{v}</span></div>)}
            </div>
            <p className="xs muted center mt-2">Bariwala · Demo payment receipt – no real money was transferred.</p>
        </Modal>
    );
};

export default ReceiptModal;
