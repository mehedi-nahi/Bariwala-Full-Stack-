import { useEffect, useRef, useState } from "react";
import { PAYMENT_METHODS } from "../utils/constants";
import { BD_MOBILE_RE, digitsOnly } from "../utils/validate";
import { getErrorMessage } from "../utils/errors";
import { money } from "../utils/format";
import { Alert, Button, Field } from "./ui";
import Icon from "./Icon";
import Select from "./Select";

const BANKS = ["Dutch-Bangla Bank", "BRAC Bank", "Islami Bank", "City Bank", "Southeast Bank", "Prime Bank", "Sonali Bank", "Eastern Bank"];
const wait = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Simulated payment gateway used for rent invoices and marketplace checkout.
 * No card / PIN / OTP value is ever sent anywhere – only the chosen method reaches `onPay`.
 *
 *   onPay(method)          async; perform the real API call, return its result (throw to fail)
 *   renderSuccess(result)  node shown on the confirmation step
 *   onProcessing(bool)     lets the parent lock its modal while the payment is being processed
 */
const DemoPayment = ({ methods, amount, summary = [], onPay, renderSuccess, onProcessing, onBack }) => {
    const options = methods || PAYMENT_METHODS;
    const [step, setStep] = useState("select");
    const [method, setMethod] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [errors, setErrors] = useState({});
    const [f, setF] = useState({ account: "", pin: "", otp: "", card: "", exp: "", cvv: "", holder: "", bank: "", bankAcc: "" });
    const alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

    const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

    const choose = (m) => { setMethod(m); setError(""); setErrors({}); setStep("details"); };

    const run = async (m) => {
        setStep("processing");
        onProcessing?.(true);
        try {
            const [res] = await Promise.all([onPay(m), wait(1600)]);
            if (!alive.current) return;
            setResult(res);
            setStep("success");
        } catch (e) {
            if (!alive.current) return;
            setError(getErrorMessage(e, "Payment failed. You were not charged."));
            setStep("details");
        } finally {
            onProcessing?.(false);
        }
    };

    const validateDetails = () => {
        const e = {};
        if (method.type === "mobile") {
            if (!BD_MOBILE_RE.test(f.account)) e.account = "Enter a valid 11-digit mobile number (e.g. 01712345678).";
            if (!/^\d{5}$/.test(f.pin)) e.pin = "PIN must be 5 digits.";
        } else if (method.type === "card") {
            if (f.card.replace(/\s/g, "").length !== 16) e.card = "Card number must be 16 digits.";
            if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(f.exp)) e.exp = "Use MM/YY.";
            if (!/^\d{3}$/.test(f.cvv)) e.cvv = "3 digits.";
            if (!f.holder.trim()) e.holder = "Enter the name on the card.";
        } else {
            if (!f.bank) e.bank = "Choose your bank.";
            if (f.bankAcc.length < 8) e.bankAcc = "Enter a valid account number (at least 8 digits).";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submitDetails = (ev) => {
        ev.preventDefault();
        setError("");
        if (!validateDetails()) return;
        if (method.type === "mobile") { setF(p => ({ ...p, otp: "" })); setStep("otp"); }
        else run(method);
    };

    const submitOtp = (ev) => {
        ev.preventDefault();
        if (f.otp.length !== 6) { setErrors({ otp: "Enter the 6-digit code." }); return; }
        run(method);
    };

    const summaryBox = (
        <div className="summary-box">
            {summary.map(([k, v]) => <div className="kv" key={k}><span>{k}</span><span>{v}</span></div>)}
            <div className="kv"><span>Total</span><span style={{ color: "var(--brand)", fontSize: "1.05rem" }}>{money(amount)}</span></div>
        </div>
    );

    if (step === "success") {
        return (
            <div className="center">
                <div className="success-ring"><Icon name="check" size={36} stroke={2.6} /></div>
                {renderSuccess(result, method)}
            </div>
        );
    }

    if (step === "processing") {
        return (
            <div className="page-loader" role="status" aria-live="polite">
                <span className="spinner spinner-lg" />
                <strong>Processing your payment…</strong>
                <span className="small">Please don&apos;t close this window.</span>
            </div>
        );
    }

    return (
        <div className="stack stack-md">
            <Alert tone="warning" icon="shield">
                <strong>Demo payment.</strong> No real money moves. Please don&apos;t enter real card numbers, PINs or OTPs – any made-up values in the right format will work.
            </Alert>

            {step === "select" && (
                <>
                    {summaryBox}
                    <div>
                        <p className="strong small mb-1">Choose a payment method</p>
                        <div className="method-list">
                            {options.map(m => (
                                <button key={m.id} type="button" className="method" style={{ "--m": m.color }} onClick={() => choose(m)}>
                                    <span className="method-badge">{m.short}</span>
                                    <span className="grow"><span className="strong" style={{ display: "block" }}>{m.label}</span><span className="small muted">{m.desc}</span></span>
                                    <Icon name="chevron-right" size={18} />
                                </button>
                            ))}
                        </div>
                    </div>
                    {onBack && <Button variant="ghost" icon="arrow-left" onClick={onBack}>Back</Button>}
                </>
            )}

            {step === "details" && method && (
                <form onSubmit={submitDetails} noValidate>
                    <button type="button" className="link-btn small row" onClick={() => { setStep("select"); setError(""); }}>
                        <Icon name="arrow-left" size={14} /> Change method
                    </button>
                    <div className="row"><span className="method-badge" style={{ "--m": method.color }}>{method.short}</span><strong>{method.label}</strong></div>
                    {error && <Alert tone="error">{error}</Alert>}

                    {method.type === "mobile" && (<>
                        <Field label={`${method.label} account number`} error={errors.account} required>
                            <input type="tel" inputMode="numeric" autoComplete="off" placeholder="01XXXXXXXXX" value={f.account} onChange={e => set("account", digitsOnly(e.target.value, 11))} />
                        </Field>
                        <Field label="PIN (5 digits)" error={errors.pin} required>
                            <input type="password" inputMode="numeric" autoComplete="off" placeholder="• • • • •" value={f.pin} onChange={e => set("pin", digitsOnly(e.target.value, 5))} />
                        </Field>
                    </>)}

                    {method.type === "card" && (<>
                        <Field label="Card number" error={errors.card} required>
                            <input inputMode="numeric" autoComplete="off" placeholder="1234 5678 9012 3456" value={f.card}
                                onChange={e => set("card", digitsOnly(e.target.value, 16).replace(/(.{4})/g, "$1 ").trim())} />
                        </Field>
                        <div className="form-grid">
                            <Field label="Expiry (MM/YY)" error={errors.exp} required>
                                <input inputMode="numeric" autoComplete="off" placeholder="06/28" maxLength={5} value={f.exp}
                                    onChange={e => { let v = digitsOnly(e.target.value, 4); if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2); set("exp", v); }} />
                            </Field>
                            <Field label="CVV" error={errors.cvv} required>
                                <input type="password" inputMode="numeric" autoComplete="off" placeholder="123" value={f.cvv} onChange={e => set("cvv", digitsOnly(e.target.value, 3))} />
                            </Field>
                        </div>
                        <Field label="Name on card" error={errors.holder} required>
                            <input autoComplete="off" placeholder="As printed on the card" value={f.holder} onChange={e => set("holder", e.target.value)} />
                        </Field>
                    </>)}

                    {method.type === "bank" && (<>
                        <Field label="Bank" error={errors.bank} required>
                            <Select value={f.bank} onChange={e => set("bank", e.target.value)}>
                                <option value="">Select your bank</option>
                                {BANKS.map(b => <option key={b}>{b}</option>)}
                            </Select>
                        </Field>
                        <Field label="Account number" error={errors.bankAcc} required>
                            <input inputMode="numeric" autoComplete="off" placeholder="Account number" value={f.bankAcc} onChange={e => set("bankAcc", digitsOnly(e.target.value, 18))} />
                        </Field>
                    </>)}

                    {summaryBox}
                    <Button type="submit" size="lg" block style={{ background: method.color }}>
                        {method.type === "mobile" ? "Continue" : `Pay ${money(amount)}`}
                    </Button>
                </form>
            )}

            {step === "otp" && (
                <form onSubmit={submitOtp} noValidate>
                    <div className="center">
                        <h3>Verify it&apos;s you</h3>
                        <p className="small muted mt-1">Enter the 6-digit code “sent” to {f.account}. <strong>Demo:</strong> type any 6 digits.</p>
                    </div>
                    <Field label="One-time code" error={errors.otp}>
                        <input className="otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" value={f.otp}
                            onChange={e => set("otp", digitsOnly(e.target.value, 6))} data-autofocus />
                    </Field>
                    <Button type="submit" size="lg" block style={{ background: method.color }}>Verify &amp; pay {money(amount)}</Button>
                    <Button variant="ghost" onClick={() => setStep("details")}>Back</Button>
                </form>
            )}
        </div>
    );
};

export default DemoPayment;
