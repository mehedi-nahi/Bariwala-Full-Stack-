import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerAPI } from "../../api/userAPI";
import { getErrorMessage } from "../../utils/errors";
import { EMAIL_RE, STRENGTH_COLOR, STRENGTH_LABEL, digitsOnly, passwordStrength } from "../../utils/validate";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Button, Field } from "../../components/ui";
import PasswordInput from "../../components/PasswordInput";

const ROLES = [
    { id: "tenant",      title: "Tenant",      desc: "Find a home, pay rent, message landlords" },
    { id: "landlord",    title: "Landlord",    desc: "List properties, manage tenants & invoices" },
    { id: "marketplace", title: "Marketplace", desc: "Buy and sell furniture & household items" },
];

const Register = () => {
    useDocumentTitle("Create account");
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "", role: "tenant" });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");
    const [loading, setLoading] = useState(false);

    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); setServerError(""); };
    const strength = passwordStrength(form.password);

    const validate = () => {
        const e = {};
        if (form.name.trim().length < 2) e.name = "Enter your full name.";
        if (!EMAIL_RE.test(form.email.trim())) e.email = "Enter a valid email address.";
        if (form.phone && form.phone.length !== 11) e.phone = "Phone number must be exactly 11 digits (e.g. 01712345678).";
        if (form.password.length < 8) e.password = "Use at least 8 characters.";
        if (form.confirm !== form.password) e.confirm = "Passwords don't match.";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        if (!validate()) return;
        setLoading(true);
        setServerError("");
        try {
            await registerAPI({ name: form.name.trim(), email: form.email.trim(), phone: form.phone, password: form.password, role: form.role });
            navigate("/login", { replace: true, state: { registered: true, email: form.email.trim() } });
        } catch (err) {
            setServerError(getErrorMessage(err, "Registration failed. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrap">
            <div className="card card-pad auth-card" style={{ maxWidth: 520 }}>
                <h1>Create your account</h1>
                <p className="muted mb-2">Free and takes less than a minute.</p>

                {serverError && <div className="mb-2"><Alert tone="error">{serverError}</Alert></div>}

                <form onSubmit={handleSubmit} noValidate>
                    <fieldset style={{ border: 0, minWidth: 0 }}>
                        <legend className="field-label mb-1">I want to…</legend>
                        <div className="choice-grid" role="radiogroup" aria-label="Account type">
                            {ROLES.map(r => (
                                <button key={r.id} type="button" role="radio" aria-checked={form.role === r.id} className="choice" onClick={() => set("role", r.id)}>
                                    <span className="choice-title">{r.title}</span>
                                    <span className="choice-desc">{r.desc}</span>
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <Field label="Full name" error={errors.name} required>
                        <input autoComplete="name" placeholder="Your full name" value={form.name} onChange={e => set("name", e.target.value)} />
                    </Field>
                    <div className="form-grid">
                        <Field label="Email" error={errors.email} required>
                            <input type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={form.email} onChange={e => set("email", e.target.value)} />
                        </Field>
                        <Field label="Phone" error={errors.phone} optional hint="11 digits, e.g. 01712345678">
                            <input type="tel" inputMode="numeric" autoComplete="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={e => set("phone", digitsOnly(e.target.value, 11))} />
                        </Field>
                    </div>
                    <Field label="Password" error={errors.password} required hint="At least 8 characters. A longer, mixed password is safer.">
                        <PasswordInput autoComplete="new-password" value={form.password} onChange={e => set("password", e.target.value)} />
                    </Field>
                    {form.password && (
                        <div aria-live="polite" style={{ marginTop: "-0.4rem" }}>
                            <div className="pw-meter"><span style={{ width: `${strength * 25}%`, background: STRENGTH_COLOR[strength] }} /></div>
                            <span className="xs muted">Password strength: <strong>{STRENGTH_LABEL[strength]}</strong></span>
                        </div>
                    )}
                    <Field label="Confirm password" error={errors.confirm} required>
                        <PasswordInput autoComplete="new-password" value={form.confirm} onChange={e => set("confirm", e.target.value)} />
                    </Field>

                    <Button type="submit" size="lg" block loading={loading}>{loading ? "Creating account…" : "Create account"}</Button>
                </form>

                <p className="center small mt-3 muted">Already have an account? <Link to="/login"><strong>Log in</strong></Link></p>
            </div>
        </div>
    );
};

export default Register;
