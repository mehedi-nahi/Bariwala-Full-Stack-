import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createItemAPI } from "../../api/marketplaceAPI";

const AddItem = () => {
    const navigate = useNavigate();
    const [form, setForm]     = useState({ title: "", description: "", price: "", condition: "Used" });
    const [images, setImages] = useState([]);
    const [error, setError]   = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            let formData = new FormData();
            Object.keys(form).forEach(key => formData.append(key, form[key]));
            images.forEach(img => formData.append("images", img));
            await createItemAPI(formData);
            navigate("/marketplace/my-items");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to post item");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <h2>Sell an Item</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
                <input name="title"       placeholder="Item Title"       value={form.title}       onChange={handleChange} required />
                <textarea name="description" placeholder="Description"   value={form.description} onChange={handleChange} />
                <input name="price"       placeholder="Price (BDT)"      value={form.price}       onChange={handleChange} required type="number" />
                <select name="condition" value={form.condition} onChange={handleChange}>
                    <option value="New">New</option>
                    <option value="Used">Used</option>
                </select>
                <input type="file" multiple accept="image/*" onChange={e => setImages([...e.target.files])} />
                <button type="submit" disabled={loading}>{loading ? "Posting..." : "Post Item"}</button>
            </form>
        </div>
    );
};

export default AddItem;

