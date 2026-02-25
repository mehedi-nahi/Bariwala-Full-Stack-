import { Link } from "react-router-dom";

const TenantDashboard = ({ user }) => {
    return (
        <div className="container">
            <h2>Welcome, {user?.name}</h2>
            <div className="dashboard-actions">
                <Link to="/tenant/search"   className="btn">Search Properties</Link>
                <Link to="/tenant/inbox"    className="btn">Inbox</Link>
                <Link to="/tenant/payments" className="btn">Payment History</Link>
                <Link to="/profile"         className="btn">My Profile</Link>
            </div>
        </div>
    );
};

export default TenantDashboard;

