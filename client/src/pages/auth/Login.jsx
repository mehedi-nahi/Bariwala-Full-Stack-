import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginAPI } from "../../api/userAPI";

const Login = ({ setUser }) => {
    const navigate = useNavigate();
    const [form, setForm]       = useState({ email: "", password: "" });
    const [error, setError]     = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            let res = await loginAPI(form);
            setUser(res.data.data);
            let role = res.data.data.role;
            if (role === "landlord")    navigate("/landlord/dashboard");
            else if (role === "tenant") navigate("/tenant/dashboard");
            else if (role === "marketplace") navigate("/marketplace/dashboard");
            else if (role === "admin")  navigate("/admin/dashboard");
        } catch (err) {
            setError(err.response?.data?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <h2>Login</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
                <input name="email"    placeholder="Email"    value={form.email}    onChange={handleChange} required type="email" />
                <input name="password" placeholder="Password" value={form.password} onChange={handleChange} required type="password" />
                <button type="submit" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
            </form>
            <p>No account? <Link to="/register">Register</Link></p>
        </div>
    );
};

export default Login;

