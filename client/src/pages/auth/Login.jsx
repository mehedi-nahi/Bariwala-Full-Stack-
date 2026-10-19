import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginAPI } from "../../api/userAPI";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../utils/errors";
import { EMAIL_RE } from "../../utils/validate";
import { ROLE_HOME } from "../../utils/constants";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Button, Field } from "../../components/ui";
import PasswordInput from "../../components/PasswordInput";

const Login = ({ setUser }) => {
    useDocumentTitle("Log in");
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const justRegistered = location.state?.registered;
    const [form, setForm] = useState({ email: location.state?.email || "", password: "" });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");
    const [loading, setLoading] = useState(false);

    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); setServerError(""); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const err = {};
        if (!EMAIL_RE.test(form.email.trim())) err.email = "Enter a valid email address.";
        if (!form.password) err.password = "Enter your password.";
        setErrors(err);
        if (Object.keys(err).length) return;

        setLoading(true);
        setServerError("");
        try {
            const res = await loginAPI({ email: form.email.trim(), password: form.password });
            const u = res.data.data;
            setUser({ ...u, _id: u._id || u.id, id: u.id || u._id });
            toast.success(`Welcome back, ${u.name.split(" ")[0]}!`);
            navigate(location.state?.from || ROLE_HOME[u.role] || "/", { replace: true });
        } catch (err2) {
            setServerError(getErrorMessage(err2, "Login failed. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrap">
            <div className="card card-pad auth-card">
                <h1>Welcome back</h1>
                <p className="muted mb-2">Log in to manage your rentals, messages and orders.</p>

                {justRegistered && <div className="mb-2"><Alert tone="success" title="Account created">Log in with your new details to get started.</Alert></div>}
                {location.state?.from && !justRegistered && <div className="mb-2"><Alert tone="info">Please log in to continue.</Alert></div>}
                {serverError && <div className="mb-2"><Alert tone="error">{serverError}</Alert></div>}

                <form onSubmit={handleSubmit} noValidate>
                    <Field label="Email" error={errors.email} required>
                        <input type="email" autoComplete="email" inputMode="email" placeholder="you@example.com"
                            value={form.email} onChange={e => set("email", e.target.value)} autoFocus />
                    </Field>
                    <Field label="Password" error={errors.password} required>
                        <PasswordInput id="login-password" autoComplete="current-password" placeholder="Your password"
                            value={form.password} onChange={e => set("password", e.target.value)} />
                    </Field>
                    <Button type="submit" size="lg" block loading={loading}>{loading ? "Logging in…" : "Log in"}</Button>
                </form>

                <p className="center small mt-3 muted">
                    New to Bariwala? <Link to="/register" state={location.state?.from ? { from: location.state.from } : undefined}><strong>Create a free account</strong></Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
