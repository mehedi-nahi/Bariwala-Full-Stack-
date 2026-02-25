import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { myItemsAPI } from "../../api/marketplaceAPI";

const MarketplaceDashboard = ({ user }) => {
    const [items, setItems] = useState([]);

    useEffect(() => { myItemsAPI().then(res => setItems(res.data.data)); }, []);

    return (
        <div className="container">
            <h2>Welcome, {user?.name}</h2>
            <div className="dashboard-stats">
                <div className="stat-card"><h3>{items.length}</h3><p>My Listed Items</p></div>
            </div>
            <div className="dashboard-actions">
                <Link to="/marketplace/add-item" className="btn">+ Sell an Item</Link>
                <Link to="/marketplace/items"    className="btn">Browse All Items</Link>
                <Link to="/marketplace/my-items" className="btn">My Listings</Link>
            </div>
        </div>
    );
};

export default MarketplaceDashboard;

