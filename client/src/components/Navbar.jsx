import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logoutAPI } from "../api/userAPI";

const Brand = ({ role }) => {
    const to = role === "marketplace" ? "/marketplace/items" : "/";
    return (
        <Link to={to} className="nav-brand" style={{ display:"flex", alignItems:"center", gap:"0.55rem", textDecoration:"none" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9.5L12 3l9 6.5V21H15v-6H9v6H3z"/>
            </svg>
            <span style={{ fontWeight:800, fontSize:"0.95rem", letterSpacing:"0.14em", textTransform:"uppercase", color:"#fff" }}>
                BARIWALA<span style={{ color:"#c0392b" }}>MARKET</span>
            </span>
        </Link>
    );
};

const Navbar = ({ user, setUser }) => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    const handleLogout = async () => {
        await logoutAPI(); setUser(null); navigate("/login"); setOpen(false);
    };

    const close = () => setOpen(false);

    const links = (
        <>
            {!user && <>
                <Link to="/login" onClick={close}>Login</Link>
                <Link to="/register" onClick={close}>Register</Link>
            </>}
            {user?.role === "landlord" && <>
                <Link to="/" onClick={close}>Home</Link>
                <Link to="/landlord/properties" onClick={close}>Properties</Link>
                <Link to="/landlord/add-property" onClick={close}>Add</Link>
                <Link to="/landlord/invoices" onClick={close}>Invoices</Link>
                <Link to="/landlord/inbox" onClick={close}>Inbox</Link>
            </>}
            {user?.role === "tenant" && <>
                <Link to="/" onClick={close}>Home</Link>
                <Link to="/tenant/inbox" onClick={close}>Inbox</Link>
                <Link to="/tenant/payments" onClick={close}>Payments</Link>
            </>}
            {user?.role === "marketplace" && <>
                <Link to="/marketplace/items" onClick={close}>Home</Link>
                <Link to="/marketplace/add-item" onClick={close}>Sell</Link>
                <Link to="/marketplace/my-items" onClick={close}>My Items</Link>
                <Link to="/marketplace/inbox" onClick={close}>Inbox</Link>
            </>}
            {user?.role === "admin" && <>
                <Link to="/" onClick={close}>Rentals</Link>
                <Link to="/marketplace/items" onClick={close}>Marketplace</Link>
                <Link to="/admin/users" onClick={close}>Users</Link>
                <Link to="/admin/reports" onClick={close}>Reports</Link>
                <Link to="/admin/transactions" onClick={close}>Transactions</Link>
                <Link to="/admin/inbox" onClick={close}>Inbox</Link>
            </>}
            {user && <>
                <Link to="/profile" onClick={close}>Profile</Link>
                <button onClick={handleLogout}>Logout</button>
            </>}
        </>
    );

    return (
        <nav className="navbar">
            <Brand role={user?.role} />

            {/* Desktop links */}
            <div className="nav-links nav-links-desktop">{links}</div>

            {/* Hamburger button (mobile) */}
            <button
                className="nav-hamburger"
                onClick={() => setOpen(o => !o)}
                aria-label="Toggle menu"
            >
                <span/><span/><span/>
            </button>

            {/* Mobile drawer */}
            {open && (
                <div className="nav-mobile-menu">
                    {links}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
