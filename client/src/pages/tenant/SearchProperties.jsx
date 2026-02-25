import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { allPropertiesAPI } from "../../api/propertyAPI";

const SearchProperties = () => {
    const [properties, setProperties] = useState([]);
    const [filters, setFilters] = useState({ area: "", minRent: "", maxRent: "", propertyType: "" });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

    const load = async () => {
        setLoading(true);
        try {
            let res = await allPropertiesAPI(filters);
            setProperties(res.data.data[0]?.properties || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    return (
        <div className="container">
            <h2>Search Properties</h2>
            <div className="filter-bar">
                <input name="area"         placeholder="Area"       value={filters.area}         onChange={handleChange} />
                <input name="minRent"      placeholder="Min Rent"   value={filters.minRent}      onChange={handleChange} type="number" />
                <input name="maxRent"      placeholder="Max Rent"   value={filters.maxRent}      onChange={handleChange} type="number" />
                <select name="propertyType" value={filters.propertyType} onChange={handleChange}>
                    <option value="">All Types</option>
                    <option value="Flat">Flat</option>
                    <option value="Room">Room</option>
                    <option value="Sublet">Sublet</option>
                </select>
                <button onClick={load}>Search</button>
            </div>
            {loading && <p>Loading...</p>}
            <div className="card-grid">
                {properties.map(p => (
                    <div className="card" key={p._id}>
                        {p.images?.[0] && <img src={`/api/v1/get-file/${p.images[0]}`} alt="property" />}
                        <h3>{p.propertyType} — {p.area}</h3>
                        <p>৳{p.monthlyRent}/month</p>
                        <p>{p.address}</p>
                        <span className={`badge ${p.availability === "Available" ? "green" : "red"}`}>{p.availability}</span>
                        <Link to={`/property/${p._id}`} className="btn">View Details</Link>
                    </div>
                ))}
                {!loading && properties.length === 0 && <p>No properties found.</p>}
            </div>
        </div>
    );
};

export default SearchProperties;

