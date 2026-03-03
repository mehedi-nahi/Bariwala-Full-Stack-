import { Link, useNavigate } from "react-router-dom";
import { logoutAPI } from "../api/userAPI";

/* ── Brand: BARIWALA editorial wordmark ── */
const Brand = ({ role }) => {
    const to = role === "marketplace" ? "/marketplace/items" : "/";
    return (
        <Link to={to} className="nav-brand" style={{ display:"flex", alignItems:"center", gap:"0.55rem", textDecoration:"none" }}>
            {/* minimal house mark */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9.5L12 3l9 6.5V21H15v-6H9v6H3z"/>
            </svg>
            <span style={{ fontWeight:800, fontSize:"0.95rem", letterSpacing:"0.14em", textTransform:"uppercase", color:"#fff" }}>
                BARI<span style={{ color:"#c0392b" }}>WALA</span>
            </span>
        </Link>
    );
};

const Navbar = ({ user, setUser }) => {
    const navigate = useNavigate();
    const handleLogout = async () => {
        await logoutAPI(); setUser(null); navigate("/login");
    };

    return (
        <nav className="navbar">
            <Brand role={user?.role} />
            <div className="nav-links">
                {!user && <>
                    <Link to="/login">Login</Link>
                    <Link to="/register">Register</Link>
                </>}
                {user?.role === "landlord" && <>
                    <Link to="/">Home</Link>
                    <Link to="/landlord/properties">Properties</Link>
                    <Link to="/landlord/add-property">Add</Link>
                    <Link to="/landlord/invoices">Invoices</Link>
                    <Link to="/landlord/inbox">Inbox</Link>
                </>}
                {user?.role === "tenant" && <>
                    <Link to="/">Home</Link>
                    <Link to="/tenant/inbox">Inbox</Link>
                    <Link to="/tenant/payments">Payments</Link>
                </>}
                {user?.role === "marketplace" && <>
                    <Link to="/marketplace/items">Home</Link>
                    <Link to="/marketplace/add-item">Sell</Link>
                    <Link to="/marketplace/my-items">My Items</Link>
                    <Link to="/marketplace/inbox">Inbox</Link>
                </>}
                {user?.role === "admin" && <>
                    <Link to="/">Rentals</Link>
                    <Link to="/marketplace/items">Marketplace</Link>
                    <Link to="/admin/users">Users</Link>
                    <Link to="/admin/reports">Reports</Link>
                    <Link to="/admin/transactions">Transactions</Link>
                    <Link to="/admin/inbox">Inbox</Link>
                </>}
                {user && <>
                    <Link to="/profile">Profile</Link>
                    <button onClick={handleLogout}>Logout</button>
                </>}
            </div>
        </nav>
    );
};

export default Navbar;
