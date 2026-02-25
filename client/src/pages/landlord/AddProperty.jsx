import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPropertyAPI } from "../../api/propertyAPI";

const FACILITIES = ["Gas", "Water", "Lift", "WiFi", "Parking", "Generator"];

const AddProperty = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        propertyType: "Flat", monthlyRent: "", advanceDeposit: "",
        address: "", area: "", distanceFromMainRoad: "",
        location: { lat: "", lng: "", mapLink: "" },
        facilities: [], availability: "Available"
    });
    const [images, setImages]   = useState([]);
    const [error, setError]     = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleLocation = (e) => setForm({ ...form, location: { ...form.location, [e.target.name]: e.target.value } });

    const toggleFacility = (f) => {
        let updated = form.facilities.includes(f)
            ? form.facilities.filter(x => x !== f)
            : [...form.facilities, f];
        setForm({ ...form, facilities: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            let formData = new FormData();
            Object.keys(form).forEach(key => {
                if (key === "facilities") formData.append("facilities", JSON.stringify(form.facilities));
                else if (key === "location") formData.append("location", JSON.stringify(form.location));
                else formData.append(key, form[key]);
            });
            images.forEach(img => formData.append("images", img));
            await createPropertyAPI(formData);
            navigate("/landlord/properties");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create property");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <h2>Add Property</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
                <select name="propertyType" value={form.propertyType} onChange={handleChange}>
                    <option value="Flat">Flat</option>
                    <option value="Room">Room</option>
                    <option value="Sublet">Sublet</option>
                </select>
                <input name="monthlyRent"        placeholder="Monthly Rent (BDT)"   value={form.monthlyRent}        onChange={handleChange} required type="number" />
                <input name="advanceDeposit"     placeholder="Advance/Deposit (BDT)" value={form.advanceDeposit}    onChange={handleChange} type="number" />
                <input name="address"            placeholder="Full Address"          value={form.address}           onChange={handleChange} required />
                <input name="area"               placeholder="Area (e.g. Mirpur)"    value={form.area}              onChange={handleChange} required />
                <input name="distanceFromMainRoad" placeholder="Distance from Main Road" value={form.distanceFromMainRoad} onChange={handleChange} />
                <input name="lat"     placeholder="Latitude"    value={form.location.lat}     onChange={handleLocation} type="number" />
                <input name="lng"     placeholder="Longitude"   value={form.location.lng}     onChange={handleLocation} type="number" />
                <input name="mapLink" placeholder="Google Map Link" value={form.location.mapLink} onChange={handleLocation} />
                <div className="facilities">
                    <p>Facilities:</p>
                    {FACILITIES.map(f => (
                        <label key={f}>
                            <input type="checkbox" checked={form.facilities.includes(f)} onChange={() => toggleFacility(f)} /> {f}
                        </label>
                    ))}
                </div>
                <input type="file" multiple accept="image/*" onChange={e => setImages([...e.target.files])} />
                <select name="availability" value={form.availability} onChange={handleChange}>
                    <option value="Available">Available</option>
                    <option value="Rented">Rented</option>
                </select>
                <button type="submit" disabled={loading}>{loading ? "Saving..." : "Add Property"}</button>
            </form>
        </div>
    );
};

export default AddProperty;

