import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerAPI } from "../../api/userAPI";

const Register = () => {
    const navigate = useNavigate();
    const [form, setForm]     = useState({ name: "", email: "", phone: "", password: "", role: "tenant" });
    const [error, setError]   = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        // phone: digits only, max 11
        if (name === "phone") {
            setForm({ ...form, phone: value.replace(/[^0-9]/g, "").slice(0, 11) });
        } else {
            setForm({ ...form, [name]: value });
        }
    };

    const validate = () => {
        if (!form.email.includes("@") || !form.email.includes(".")) {
            setError("Please enter a valid email address (must contain @ and .)");
            return false;
        }
        if (form.phone && form.phone.length !== 11) {
            setError("Phone number must be exactly 11 digits.");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
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
                <input name="name"     placeholder="Full Name"              value={form.name}     onChange={handleChange} required />
                <input name="email"    placeholder="Email (e.g. user@email.com)" value={form.email} onChange={handleChange} required type="email" />
                <input name="phone"    placeholder="Phone (11 digits)"      value={form.phone}    onChange={handleChange}
                       type="tel" maxLength={11} pattern="[0-9]{11}"
                       title="Phone number must be exactly 11 digits"
                       onKeyDown={e => {
                           const allowed = ["Backspace","Delete","Tab","ArrowLeft","ArrowRight","Home","End"];
                           if (!allowed.includes(e.key) && !/^[0-9]$/.test(e.key)) e.preventDefault();
                       }}
                />
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

