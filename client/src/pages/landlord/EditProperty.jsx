import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { singlePropertyAPI, updatePropertyAPI } from "../../api/propertyAPI";

const FACILITIES = ["Gas", "Water", "Lift", "WiFi", "Parking", "Generator"];

const EditProperty = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm]   = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        singlePropertyAPI(id).then(res => {
            let p = res.data.data[0];
            setForm({
                propertyType: p.propertyType, monthlyRent: p.monthlyRent,
                advanceDeposit: p.advanceDeposit, address: p.address,
                area: p.area, distanceFromMainRoad: p.distanceFromMainRoad,
                facilities: p.facilities || [], availability: p.availability
            });
        });
    }, [id]);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const toggleFacility = (f) => {
        let updated = form.facilities.includes(f)
            ? form.facilities.filter(x => x !== f)
            : [...form.facilities, f];
        setForm({ ...form, facilities: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await updatePropertyAPI(id, form);
            navigate("/landlord/properties");
        } catch (err) {
            setError(err.response?.data?.message || "Update failed");
        }
    };

    if (!form) return <p>Loading...</p>;

    return (
        <div className="container">
            <h2>Edit Property</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
                <select name="propertyType" value={form.propertyType} onChange={handleChange}>
                    <option value="Flat">Flat</option>
                    <option value="Room">Room</option>
                    <option value="Sublet">Sublet</option>
                </select>
                <input name="monthlyRent"          placeholder="Monthly Rent"    value={form.monthlyRent}           onChange={handleChange} required type="number" />
                <input name="advanceDeposit"       placeholder="Advance Deposit" value={form.advanceDeposit}        onChange={handleChange} type="number" />
                <input name="address"              placeholder="Address"         value={form.address}               onChange={handleChange} required />
                <input name="area"                 placeholder="Area"            value={form.area}                  onChange={handleChange} required />
                <input name="distanceFromMainRoad" placeholder="Distance from Main Road" value={form.distanceFromMainRoad} onChange={handleChange} />
                <div className="facilities">
                    <p>Facilities:</p>
                    {FACILITIES.map(f => (
                        <label key={f}>
                            <input type="checkbox" checked={form.facilities.includes(f)} onChange={() => toggleFacility(f)} /> {f}
                        </label>
                    ))}
                </div>
                <select name="availability" value={form.availability} onChange={handleChange}>
                    <option value="Available">Available</option>
                    <option value="Rented">Rented</option>
                </select>
                <button type="submit">Update Property</button>
            </form>
        </div>
    );
};

export default EditProperty;

