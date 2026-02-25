import { Link, useNavigate } from "react-router-dom";
import { logoutAPI } from "../api/userAPI";

const Navbar = ({ user, setUser }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logoutAPI();
        setUser(null);
        navigate("/login");
    };

    return (
        <nav className="navbar">
            <Link to="/" className="nav-brand">Bariwala</Link>
            <div className="nav-links">
                {!user && <>
                    <Link to="/login">Login</Link>
                    <Link to="/register">Register</Link>
                </>}

                {user?.role === "landlord" && <>
                    <Link to="/landlord/dashboard">Dashboard</Link>
                    <Link to="/landlord/properties">My Properties</Link>
                    <Link to="/landlord/add-property">Add Property</Link>
                    <Link to="/landlord/invoices">Invoices</Link>
                    <Link to="/landlord/inbox">Inbox</Link>
                </>}

                {user?.role === "tenant" && <>
                    <Link to="/tenant/dashboard">Dashboard</Link>
                    <Link to="/tenant/search">Search</Link>
                    <Link to="/tenant/inbox">Inbox</Link>
                    <Link to="/tenant/payments">Payments</Link>
                </>}

                {user?.role === "marketplace" && <>
                    <Link to="/marketplace/dashboard">Dashboard</Link>
                    <Link to="/marketplace/items">Browse Items</Link>
                    <Link to="/marketplace/add-item">Sell Item</Link>
                </>}

                {user?.role === "admin" && <>
                    <Link to="/admin/dashboard">Dashboard</Link>
                    <Link to="/admin/users">Users</Link>
                    <Link to="/admin/reports">Reports</Link>
                    <Link to="/admin/transactions">Transactions</Link>
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

