import { useState } from "react";
import { Link } from "react-router-dom";
import { checkoutAPI } from "../api/marketplaceAPI";
import { useToast } from "../context/ToastContext";
import { money } from "../utils/format";
import { BD_MOBILE_RE, EMAIL_RE, digitsOnly } from "../utils/validate";
import { PAYMENT_METHODS } from "../utils/constants";
import Modal from "./Modal";
import DemoPayment from "./DemoPayment";
import { Alert, Button, Field } from "./ui";

const METHODS = PAYMENT_METHODS.filter(m => m.id !== "Bank Transfer");
const newRef = () => `MKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const CheckoutModal = ({ items, total, user, onClose, onPurchased }) => {
    const toast = useToast();
    const [stage, setStage] = useState("info");   // info → pay
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [txnRef] = useState(newRef);
    const [info, setInfo] = useState({ fullName: user?.name || "", phone: "", email: "", addressLine: "", city: "", area: "" });
    const [errors, setErrors] = useState({});

    const set = (k, v) => { setInfo(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

    const submitInfo = (e) => {
        e.preventDefault();
        const err = {};
        if (info.fullName.trim().length < 2) err.fullName = "Enter your full name.";
        if (!BD_MOBILE_RE.test(info.phone)) err.phone = "Enter a valid 11-digit mobile number (e.g. 01712345678).";
        if (info.email && !EMAIL_RE.test(info.email)) err.email = "That email doesn't look right.";
        if (!info.addressLine.trim()) err.addressLine = "Enter your street address.";
        if (!info.city.trim()) err.city = "Enter your city.";
        if (!info.area.trim()) err.area = "Enter your area.";
        setErrors(err);
        if (Object.keys(err).length === 0) setStage("pay");
    };

    const pay = async () => {
        try {
            const res = await checkoutAPI({ itemIds: items.map(i => i._id), buyer: info, txnRef });
            const { purchased = [], failed = [] } = res.data;
            onPurchased(purchased.map(p => p._id), failed.map(f => f._id));
            setDone(true);
            toast.success("Order placed!");
            return res.data;
        } catch (err) {
            const failed = err.response?.data?.failed;
            if (failed?.length) onPurchased([], failed.map(f => f._id));
            throw err;
        }
    };

    const stepClass = (n) => {
        const current = done ? 3 : stage === "pay" ? 2 : 1;
        return `step${n < current ? " done" : n === current ? " active" : ""}`;
    };

    return (
        <Modal title="Checkout" size="md" onClose={onClose} dismissible={!busy}>
            <div className="stepper" aria-label="Checkout progress">
                <div className={stepClass(1)}>1 · Delivery</div>
                <div className={stepClass(2)}>2 · Payment</div>
                <div className={stepClass(3)}>3 · Done</div>
            </div>

            {stage === "info" && (
                <form onSubmit={submitInfo} noValidate>
                    <div className="summary-box">
                        {items.map(i => <div className="kv" key={i._id}><span className="truncate" style={{ maxWidth: "65%" }}>{i.title}</span><span>{money(i.price)}</span></div>)}
                        <div className="kv"><span>Total</span><span style={{ color: "var(--brand)" }}>{money(total)}</span></div>
                    </div>
                    <div className="form-grid">
                        <Field label="Full name" error={errors.fullName} required>
                            <input value={info.fullName} onChange={e => set("fullName", e.target.value)} autoComplete="name" />
                        </Field>
                        <Field label="Mobile number" error={errors.phone} required>
                            <input type="tel" inputMode="numeric" placeholder="01XXXXXXXXX" value={info.phone} onChange={e => set("phone", digitsOnly(e.target.value, 11))} autoComplete="tel" />
                        </Field>
                        <Field label="Email" error={errors.email} optional className="span-2">
                            <input type="email" value={info.email} onChange={e => set("email", e.target.value)} autoComplete="email" />
                        </Field>
                        <Field label="Street address" error={errors.addressLine} required className="span-2">
                            <input placeholder="House, road, block" value={info.addressLine} onChange={e => set("addressLine", e.target.value)} autoComplete="street-address" />
                        </Field>
                        <Field label="City" error={errors.city} required>
                            <input placeholder="Dhaka" value={info.city} onChange={e => set("city", e.target.value)} />
                        </Field>
                        <Field label="Area" error={errors.area} required>
                            <input placeholder="Mirpur 10" value={info.area} onChange={e => set("area", e.target.value)} />
                        </Field>
                    </div>
                    <div className="form-actions">
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Continue to payment</Button>
                    </div>
                </form>
            )}

            {stage === "pay" && (
                <DemoPayment
                    methods={METHODS}
                    amount={total}
                    summary={[["Items", `${items.length}`], ["Deliver to", `${info.area}, ${info.city}`], ["Reference", txnRef]]}
                    onProcessing={setBusy}
                    onBack={() => setStage("info")}
                    onPay={pay}
                    renderSuccess={(res, method) => (
                            <div className="stack stack-md" style={{ textAlign: "left" }}>
                                <div className="center">
                                    <h3>Order placed</h3>
                                    <p className="small muted">Paid {money(res.total)} with {method.label}. The sellers will contact you to arrange delivery.</p>
                                </div>
                                <div className="summary-box">
                                    {res.purchased.map(p => <div className="kv" key={p._id}><span className="truncate" style={{ maxWidth: "65%" }}>{p.title}</span><span>{money(p.price)}</span></div>)}
                                    <div className="kv"><span>Reference</span><span className="mono">{txnRef}</span></div>
                                    <div className="kv"><span>Deliver to</span><span>{info.fullName}, {info.addressLine}, {info.area}, {info.city}</span></div>
                                </div>
                                {res.failed.length > 0 && (
                                    <Alert tone="warning" title="Some items were not purchased">
                                        {res.failed.map(f => <div key={f._id}>{f.title} — {f.reason}</div>)}
                                    </Alert>
                                )}
                                <div className="form-actions">
                                    <Link to="/marketplace/orders" className="btn btn-secondary" onClick={onClose}>View my orders</Link>
                                    <Button onClick={onClose}>Done</Button>
                                </div>
                            </div>
                    )}
                />
            )}
        </Modal>
    );
};

export default CheckoutModal;
