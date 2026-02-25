import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { myPropertiesAPI, deletePropertyAPI, changeAvailabilityAPI } from "../../api/propertyAPI";

const MyProperties = () => {
    const [properties, setProperties] = useState([]);
    const [msg, setMsg] = useState("");

    const load = () => myPropertiesAPI().then(res => setProperties(res.data.data));

    useEffect(() => { load(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this property?")) return;
        await deletePropertyAPI(id);
        setMsg("Deleted successfully");
        load();
    };

    const toggleAvailability = async (id, current) => {
        let next = current === "Available" ? "Rented" : "Available";
        await changeAvailabilityAPI(id, { availability: next });
        load();
    };

    return (
        <div className="container">
            <h2>My Properties</h2>
            {msg && <p className="success">{msg}</p>}
            {properties.length === 0 && <p>No properties yet. <Link to="/landlord/add-property">Add one</Link></p>}
            <div className="card-grid">
                {properties.map(p => (
                    <div className="card" key={p._id}>
                        {p.images[0] && <img src={`/api/v1/get-file/${p.images[0]}`} alt="property" />}
                        <h3>{p.propertyType} — {p.area}</h3>
                        <p>Rent: ৳{p.monthlyRent}/month</p>
                        <p>Address: {p.address}</p>
                        <span className={`badge ${p.availability === "Available" ? "green" : "red"}`}>{p.availability}</span>
                        <div className="card-actions">
                            <button onClick={() => toggleAvailability(p._id, p.availability)}>
                                Mark {p.availability === "Available" ? "Rented" : "Available"}
                            </button>
                            <Link to={`/property/${p._id}`}               className="btn">View / Rate</Link>
                            <Link to={`/landlord/edit-property/${p._id}`} className="btn">Edit</Link>
                            <button className="btn-danger" onClick={() => handleDelete(p._id)}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MyProperties;

