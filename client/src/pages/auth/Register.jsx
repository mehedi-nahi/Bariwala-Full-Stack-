import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerAPI } from "../../api/userAPI";

const Register = () => {
    const navigate = useNavigate();
    const [form, setForm]     = useState({ name: "", email: "", phone: "", password: "", role: "tenant" });
    const [error, setError]   = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await registerAPI(form);
            navigate("/login");
        } catch (err) {
            setError(err.response?.data?.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <h2>Register</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
                <input name="name"     placeholder="Full Name"    value={form.name}     onChange={handleChange} required />
                <input name="email"    placeholder="Email"        value={form.email}    onChange={handleChange} required type="email" />
                <input name="phone"    placeholder="Phone"        value={form.phone}    onChange={handleChange} />
                <input name="password" placeholder="Password"     value={form.password} onChange={handleChange} required type="password" />
                <select name="role" value={form.role} onChange={handleChange}>
                    <option value="tenant">Tenant</option>
                    <option value="landlord">Landlord</option>
                    <option value="marketplace">Marketplace User</option>
                </select>
                <button type="submit" disabled={loading}>{loading ? "Registering..." : "Register"}</button>
            </form>
            <p>Already have an account? <Link to="/login">Login</Link></p>
        </div>
    );
};

export default Register;

