import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { myPropertiesAPI } from "../../api/propertyAPI";
import { paymentHistoryAPI } from "../../api/paymentAPI";

const LandlordDashboard = ({ user }) => {
    const [properties, setProperties] = useState([]);
    const [payments, setPayments]     = useState([]);

    useEffect(() => {
        myPropertiesAPI().then(res => setProperties(res.data.data));
        paymentHistoryAPI().then(res => setPayments(res.data.data));
    }, []);

    return (
        <div className="container">
            <h2>Welcome, {user?.name}</h2>
            <div className="dashboard-stats">
                <div className="stat-card"><h3>{properties.length}</h3><p>Total Properties</p></div>
                <div className="stat-card"><h3>{properties.filter(p => p.availability === "Available").length}</h3><p>Available</p></div>
                <div className="stat-card"><h3>{properties.filter(p => p.availability === "Rented").length}</h3><p>Rented</p></div>
                <div className="stat-card"><h3>{payments.filter(p => p.status === "Paid").length}</h3><p>Payments Received</p></div>
            </div>
            <div className="dashboard-actions">
                <Link to="/landlord/add-property" className="btn">+ Add Property</Link>
                <Link to="/landlord/properties"   className="btn">My Properties</Link>
                <Link to="/landlord/invoices"     className="btn">Invoices</Link>
                <Link to="/landlord/inbox"        className="btn">Inbox</Link>
            </div>
        </div>
    );
};

export default LandlordDashboard;

