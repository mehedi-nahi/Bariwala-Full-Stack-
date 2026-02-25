import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { allItemsAPI } from "../../api/marketplaceAPI";

const AllItems = () => {
    const [items, setItems]     = useState([]);
    const [filters, setFilters] = useState({ condition: "", minPrice: "", maxPrice: "" });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

    const load = async () => {
        setLoading(true);
        try {
            let res = await allItemsAPI(filters);
            setItems(res.data.data[0]?.items || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    return (
        <div className="container">
            <h2>Marketplace</h2>
            <div className="filter-bar">
                <select name="condition" value={filters.condition} onChange={handleChange}>
                    <option value="">All Conditions</option>
                    <option value="New">New</option>
                    <option value="Used">Used</option>
                </select>
                <input name="minPrice" placeholder="Min Price" value={filters.minPrice} onChange={handleChange} type="number" />
                <input name="maxPrice" placeholder="Max Price" value={filters.maxPrice} onChange={handleChange} type="number" />
                <button onClick={load}>Filter</button>
            </div>
            {loading && <p>Loading...</p>}
            <div className="card-grid">
                {items.map(item => (
                    <div className="card" key={item._id}>
                        {item.images?.[0] && <img src={`/api/v1/get-file/${item.images[0]}`} alt="item" />}
                        <h3>{item.title}</h3>
                        <p>৳{item.price}</p>
                        <span className="badge">{item.condition}</span>
                        <p><small>Seller: {item.sellerInfo?.[0]?.name}</small></p>
                        <Link to={`/marketplace/item/${item._id}`} className="btn">View</Link>
                    </div>
                ))}
                {!loading && items.length === 0 && <p>No items found.</p>}
            </div>
        </div>
    );
};

export default AllItems;

