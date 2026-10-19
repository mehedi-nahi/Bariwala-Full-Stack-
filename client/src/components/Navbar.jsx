import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { logoutAPI } from "../api/userAPI";
import { unreadCountAPI } from "../api/messageAPI";
import { useToast } from "../context/ToastContext";
import { useCart } from "../context/CartContext";
import { INBOX_PATH, ROLE_LABEL } from "../utils/constants";
import { Avatar } from "./ui";
import Icon from "./Icon";

/* What each kind of visitor sees in the top bar. Keep these short – everything else lives in the account menu. */
const LINKS = {
    guest: [
        { to: "/", label: "Rentals", end: true },
        { to: "/marketplace/items", label: "Marketplace" },
        { to: "/blog", label: "Blog" },
        { to: "/about", label: "About" },
    ],
    tenant: [
        { to: "/", label: "Find a home", end: true },
        { to: "/tenant/requests", label: "My requests" },
        { to: "/tenant/payments", label: "Payments" },
        { to: "/marketplace/items", label: "Marketplace" },
    ],
    landlord: [
        { to: "/landlord/properties", label: "My properties" },
        { to: "/landlord/invoices", label: "Invoices" },
        { to: "/", label: "Browse rentals", end: true },
        { to: "/marketplace/items", label: "Marketplace" },
    ],
    marketplace: [
        { to: "/marketplace/items", label: "Shop" },
        { to: "/marketplace/my-items", label: "My listings" },
        { to: "/marketplace/orders", label: "My orders" },
        { to: "/", label: "Rentals", end: true },
    ],
    admin: [
        { to: "/profile", label: "Overview" },
        { to: "/admin/users", label: "Users" },
        { to: "/admin/reports", label: "Reports" },
        { to: "/admin/transactions", label: "Transactions" },
    ],
};

const Brand = ({ role }) => (
    <Link to={role === "marketplace" ? "/marketplace/items" : "/"} className="brand" aria-label="Bariwala home">
        <span className="brand-mark"><Icon name="home" size={17} stroke={2.2} /></span>
        <span>Bari<em>wala</em></span>
    </Link>
);

const Navbar = ({ user, setUser }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const cart = useCart();
    const [menuOpen, setMenuOpen] = useState(false);
    const [acctOpen, setAcctOpen] = useState(false);
    const [unread, setUnread] = useState(0);
    const acctRef = useRef(null);

    const role = user?.role || "guest";
    const links = LINKS[role] || LINKS.guest;
    const inboxPath = user ? INBOX_PATH[user.role] : null;

    /* close menus whenever the page changes */
    useEffect(() => {
        const t = setTimeout(() => { setMenuOpen(false); setAcctOpen(false); }, 0);
        return () => clearTimeout(t);
    }, [location.pathname]);

    /* close the account menu on outside click / Esc */
    useEffect(() => {
        if (!acctOpen) return;
        const onDown = (e) => { if (acctRef.current && !acctRef.current.contains(e.target)) setAcctOpen(false); };
        const onKey = (e) => { if (e.key === "Escape") setAcctOpen(false); };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
    }, [acctOpen]);

    /* unread-message badge: refresh on navigation, when the inbox says it changed, and every 30 s */
    const refreshUnread = useCallback(() => {
        if (!user) return;
        unreadCountAPI().then(r => setUnread(r.data.count || 0)).catch(() => {});
    }, [user]);

    useEffect(() => {
        if (!user) return undefined;
        const first = setTimeout(refreshUnread, 0);
        const timer = setInterval(() => { if (!document.hidden) refreshUnread(); }, 30000);
        window.addEventListener("inbox:changed", refreshUnread);
        return () => { clearTimeout(first); clearInterval(timer); window.removeEventListener("inbox:changed", refreshUnread); };
    }, [user, refreshUnread, location.pathname]);

    const handleLogout = async () => {
        try { await logoutAPI(); } catch { /* cookie may already be gone – still log out locally */ }
        setUser(null);
        setUnread(0);
        setAcctOpen(false);
        setMenuOpen(false);
        toast.info("You have been logged out.");
        navigate("/login");
    };

    const unreadLabel = unread > 99 ? "99+" : unread;
    const linkClass = ({ isActive }) => `nav-link${isActive ? " active" : ""}`;

    return (
        <header className="navbar">
            <nav className="navbar-inner" aria-label="Main">
                <Brand role={user?.role} />

                <div className="nav-links">
                    {links.map(l => (
                        <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                            {({ isActive }) => (<>
                                {isActive && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                                <span className="nav-link-label">{l.label}</span>
                            </>)}
                        </NavLink>
                    ))}
                </div>

                <div className="nav-actions">
                    {user?.role === "landlord" && (
                        <Link to="/landlord/add-property" className="btn btn-primary btn-sm hide-mobile">
                            <Icon name="plus" size={14} /> Add property
                        </Link>
                    )}
                    {user?.role === "marketplace" && (
                        <Link to="/marketplace/add-item" className="btn btn-primary btn-sm hide-mobile">
                            <Icon name="plus" size={14} /> Sell an item
                        </Link>
                    )}
                    {user?.role === "marketplace" && (
                        <button className="nav-icon-btn" onClick={cart.open} aria-label={`Open cart, ${cart.count} items`}>
                            <Icon name="cart" size={20} />
                            <AnimatePresence>{cart.count > 0 && (
                                <motion.span className="nav-badge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 18 }}>
                                    <motion.span key={cart.count} initial={{ scale: 1.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>{cart.count}</motion.span>
                                </motion.span>
                            )}</AnimatePresence>
                        </button>
                    )}
                    {user && (
                        <Link to={inboxPath} className="nav-icon-btn" aria-label={unread ? `Inbox, ${unread} unread messages` : "Inbox"}>
                            <Icon name="mail" size={20} />
                            <AnimatePresence>{unread > 0 && (
                                <motion.span className="nav-badge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 18 }}>
                                    <motion.span key={unreadLabel} initial={{ scale: 1.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>{unreadLabel}</motion.span>
                                </motion.span>
                            )}</AnimatePresence>
                        </Link>
                    )}

                    {user ? (
                        <div className="nav-account" ref={acctRef}>
                            <button
                                className="nav-account-btn" onClick={() => setAcctOpen(o => !o)}
                                aria-haspopup="menu" aria-expanded={acctOpen} aria-label="Account menu"
                            >
                                <Avatar name={user.name} size={32} />
                                <span className="nav-account-name truncate">{user.name?.split(" ")[0]}</span>
                                <Icon name="chevron-down" size={14} />
                            </button>
                            <AnimatePresence>
                            {acctOpen && (
                                <motion.div className="dropdown" role="menu"
                                    initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.12 } }}
                                    transition={{ type: "spring", stiffness: 500, damping: 32 }} style={{ transformOrigin: "top right" }}>
                                    <div className="dropdown-head">
                                        <Avatar name={user.name} size={40} />
                                        <div style={{ minWidth: 0 }}>
                                            <div className="strong truncate">{user.name}</div>
                                            <div className="xs muted truncate">{user.email}</div>
                                            <span className="badge badge-brand mt-1">{ROLE_LABEL[user.role]}</span>
                                        </div>
                                    </div>
                                    <Link to="/profile" className="dropdown-item" role="menuitem"><span className="dd-icon"><Icon name="dashboard" size={16} /></span> Dashboard &amp; profile</Link>
                                    <Link to={inboxPath} className="dropdown-item" role="menuitem"><span className="dd-icon"><Icon name="mail" size={16} /></span> Inbox{unread > 0 && <span className="unread-dot" style={{ marginLeft: "auto" }}>{unreadLabel}</span>}</Link>
                                    {user.role !== "admin" && <Link to="/help" className="dropdown-item" role="menuitem"><span className="dd-icon"><Icon name="help" size={16} /></span> Help &amp; FAQ</Link>}
                                    {user.role === "admin" && <Link to="/" className="dropdown-item" role="menuitem"><span className="dd-icon"><Icon name="home" size={16} /></span> Browse rentals</Link>}
                                    {user.role === "admin" && <Link to="/marketplace/items" className="dropdown-item" role="menuitem"><span className="dd-icon"><Icon name="bag" size={16} /></span> Browse marketplace</Link>}
                                    <div className="dropdown-sep" role="separator" />
                                    <button className="dropdown-item danger" onClick={handleLogout} role="menuitem"><span className="dd-icon"><Icon name="logout" size={16} /></span> Log out</button>
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-ghost btn-sm hide-mobile" style={{ color: "#fff" }}>Log in</Link>
                            <Link to="/register" className="btn btn-primary btn-sm hide-mobile">Sign up</Link>
                        </>
                    )}

                    <button
                        className="nav-burger" onClick={() => setMenuOpen(o => !o)}
                        aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}
                    >
                        <Icon name={menuOpen ? "x" : "menu"} size={22} />
                    </button>
                </div>
            </nav>

            <AnimatePresence>
            {menuOpen && (
                <motion.div className="mobile-menu"
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0, transition: { duration: 0.18 } }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
                    {links.map(l => <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>{l.label}</NavLink>)}
                    {user?.role === "landlord" && <NavLink to="/landlord/add-property" className={linkClass}><Icon name="plus" size={16} /> Add property</NavLink>}
                    {user?.role === "marketplace" && <NavLink to="/marketplace/add-item" className={linkClass}><Icon name="plus" size={16} /> Sell an item</NavLink>}
                    <hr />
                    {user ? (
                        <>
                            <NavLink to="/profile" className={linkClass}>Dashboard &amp; profile</NavLink>
                            <NavLink to={inboxPath} className={linkClass}>Inbox{unread > 0 && <span className="unread-dot">{unreadLabel}</span>}</NavLink>
                            <button className="nav-link" style={{ width: "100%", textAlign: "left" }} onClick={handleLogout}>Log out</button>
                        </>
                    ) : (
                        <>
                            <NavLink to="/login" className={linkClass}>Log in</NavLink>
                            <Link to="/register" className="btn btn-primary btn-block mt-1">Create a free account</Link>
                        </>
                    )}
                </motion.div>
            )}
            </AnimatePresence>
        </header>
    );
};

export default Navbar;
