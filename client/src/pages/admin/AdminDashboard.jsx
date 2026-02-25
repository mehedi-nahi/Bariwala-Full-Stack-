import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminAllUsersAPI, adminAllReportsAPI, adminAllTransactionsAPI } from "../../api/adminAPI";

const AdminDashboard = ({ user }) => {
    const [stats, setStats] = useState({ users: 0, reports: 0, transactions: 0 });

    useEffect(() => {
        Promise.all([
            adminAllUsersAPI(),
            adminAllReportsAPI(),
            adminAllTransactionsAPI()
        ]).then(([u, r, t]) => {
            setStats({
                users:        u.data.data[0]?.totalCount[0]?.count || 0,
                reports:      r.data.data[0]?.totalCount[0]?.count || 0,
                transactions: t.data.data[0]?.totalCount[0]?.count || 0
            });
        });
    }, []);

    return (
        <div className="container">
            <h2>Admin Dashboard</h2>
            <div className="dashboard-stats">
                <div className="stat-card"><h3>{stats.users}</h3><p>Total Users</p></div>
                <div className="stat-card"><h3>{stats.reports}</h3><p>Reports</p></div>
                <div className="stat-card"><h3>{stats.transactions}</h3><p>Transactions</p></div>
            </div>
            <div className="dashboard-actions">
                <Link to="/admin/users"        className="btn">Manage Users</Link>
                <Link to="/admin/reports"      className="btn">View Reports</Link>
                <Link to="/admin/transactions" className="btn">Transactions</Link>
            </div>
        </div>
    );
};

export default AdminDashboard;

