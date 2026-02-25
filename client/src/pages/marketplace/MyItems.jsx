import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { myItemsAPI, deleteItemAPI } from "../../api/marketplaceAPI";

const MyItems = () => {
    const [items, setItems] = useState([]);
    const [msg, setMsg]     = useState("");

    const load = () => myItemsAPI().then(res => setItems(res.data.data));

    useEffect(() => { load(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this item?")) return;
        await deleteItemAPI(id);
        setMsg("Item deleted");
        load();
    };

    return (
        <div className="container">
            <h2>My Listed Items</h2>
            {msg && <p className="success">{msg}</p>}
            {items.length === 0 && <p>No items listed. <Link to="/marketplace/add-item">Sell one</Link></p>}
            <div className="card-grid">
                {items.map(item => (
                    <div className="card" key={item._id}>
                        {item.images?.[0] && <img src={`/api/v1/get-file/${item.images[0]}`} alt="item" />}
                        <h3>{item.title}</h3>
                        <p>৳{item.price} — {item.condition}</p>
                        <div className="card-actions">
                            <button className="btn-danger" onClick={() => handleDelete(item._id)}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MyItems;

