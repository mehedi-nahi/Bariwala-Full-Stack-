import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPropertyAPI } from "../../api/propertyAPI";

const FACILITIES = ["Gas","Water","Lift","WiFi","Parking","Generator","Security","CCTV","AC","Furnished"];

const SectionCard = ({ icon, title, children }) => (
    <div style={{background:"#fff",borderRadius:14,padding:"1.4rem 1.5rem",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",marginBottom:"1.2rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1.1rem",paddingBottom:"0.7rem",borderBottom:"1px solid #f5f5f5"}}>
            <span style={{fontSize:"1.2rem"}}>{icon}</span>
            <h3 style={{fontWeight:700,fontSize:"0.95rem",color:"#1a1a2e",margin:0}}>{title}</h3>
        </div>
        {children}
    </div>
);

const Field = ({ label, required, children }) => (
    <div style={{marginBottom:"1rem"}}>
        <label style={{display:"block",fontWeight:600,fontSize:"0.82rem",color:"#555",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:"0.4rem"}}>
            {label}{required && <span style={{color:"#e94560",marginLeft:2}}>*</span>}
        </label>
        {children}
    </div>
);

const inputStyle = { padding:"0.65rem 0.9rem",border:"1px solid #e8e8e8",borderRadius:9,fontSize:"0.92rem",background:"#fafafa",width:"100%",boxSizing:"border-box",outline:"none",transition:"border 0.15s" };

const AddProperty = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        propertyType:"Flat", monthlyRent:"", advanceDeposit:"",
        address:"", area:"", distanceFromMainRoad:"",
        location:{ lat:"", lng:"", mapLink:"" },
        facilities:[], availability:"Available"
    });
    const [images,  setImages]  = useState([]);
    const [preview, setPreview] = useState([]);
    const [error,   setError]   = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
    const handleLocation = e => setForm({ ...form, location:{ ...form.location, [e.target.name]: e.target.value } });
    const toggleFacility = f => setForm({ ...form, facilities: form.facilities.includes(f) ? form.facilities.filter(x=>x!==f) : [...form.facilities,f] });

    const handleImages = e => {
        const files = [...e.target.files];
        setImages(files);
        setPreview(files.map(f => URL.createObjectURL(f)));
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            const fd = new FormData();
            Object.keys(form).forEach(k => {
                if (k === "facilities") fd.append("facilities", JSON.stringify(form.facilities));
                else if (k === "location") fd.append("location", JSON.stringify(form.location));
                else fd.append(k, form[k]);
            });
            images.forEach(img => fd.append("images", img));
            await createPropertyAPI(fd);
            navigate("/landlord/properties");
        } catch (err) { setError(err.response?.data?.message || "Failed to create property"); }
        finally { setLoading(false); }
    };

    return (
        <div style={{background:"#f5f6fa",minHeight:"100vh",paddingBottom:"3rem"}}>
            <style>{`
                @keyframes spin{to{transform:rotate(360deg)}}
                .add-prop-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
                .add-prop-grid-3{display:grid;grid-template-columns:1fr 1fr 2fr;gap:1rem}
                @media(max-width:600px){
                    .add-prop-grid-2{grid-template-columns:1fr!important}
                    .add-prop-grid-3{grid-template-columns:1fr!important}
                    .add-prop-actions{flex-direction:column!important}
                    .add-prop-actions a,.add-prop-actions button{width:100%!important;text-align:center!important}
                }
            `}</style>
            {/* Header */}
            <div style={{background:"linear-gradient(135deg,#1a1a2e 60%,#e94560)",padding:"1.5rem 1rem 3rem",color:"#fff"}}>
                <div style={{maxWidth:820,margin:"0 auto"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.6rem",fontSize:"0.82rem",color:"#aaa",marginBottom:"0.8rem",flexWrap:"wrap"}}>
                        <Link to="/" style={{color:"#e94560",textDecoration:"none"}}>Home</Link>
                        <span>›</span>
                        <Link to="/landlord/properties" style={{color:"#aaa",textDecoration:"none"}}>My Properties</Link>
                        <span>›</span><span style={{color:"#fff"}}>Add Property</span>
                    </div>
                    <h1 style={{fontSize:"1.5rem",fontWeight:800,margin:0}}>Add New Property</h1>
                    <p style={{opacity:0.75,marginTop:"0.3rem",fontSize:"0.88rem"}}>Fill in the details below to list your rental property.</p>
                </div>
            </div>

            <div style={{maxWidth:820,margin:"-1.5rem auto 0",padding:"0 1rem"}}>
                {error && (
                    <div style={{background:"#fdecea",border:"1px solid #e74c3c",color:"#c0392b",borderRadius:10,padding:"0.8rem 1.2rem",marginBottom:"1.2rem",fontWeight:600,fontSize:"0.88rem"}}>
                        ❌ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Basic Info */}
                    <SectionCard icon="🏠" title="Basic Information">
                        <div className="add-prop-grid-2">
                            <Field label="Property Type" required>
                                <select name="propertyType" value={form.propertyType} onChange={handleChange} style={inputStyle}>
                                    <option value="Flat">Flat</option>
                                    <option value="Room">Room</option>
                                    <option value="Sublet">Sublet</option>
                                </select>
                            </Field>
                            <Field label="Availability">
                                <select name="availability" value={form.availability} onChange={handleChange} style={inputStyle}>
                                    <option value="Available">Available</option>
                                    <option value="Rented">Rented</option>
                                </select>
                            </Field>
                            <Field label="Monthly Rent (BDT)" required>
                                <input name="monthlyRent" type="number" min="0" placeholder="e.g. 12000" value={form.monthlyRent} onChange={handleChange} required style={inputStyle} />
                            </Field>
                            <Field label="Advance / Deposit (BDT)">
                                <input name="advanceDeposit" type="number" min="0" placeholder="e.g. 24000" value={form.advanceDeposit} onChange={handleChange} style={inputStyle} />
                            </Field>
                        </div>
                    </SectionCard>

                    {/* Location */}
                    <SectionCard icon="📍" title="Location Details">
                        <div className="add-prop-grid-2">
                            <Field label="Area / Neighborhood" required>
                                <input name="area" placeholder="e.g. Mirpur, Dhanmondi" value={form.area} onChange={handleChange} required style={inputStyle} />
                            </Field>
                            <Field label="Distance from Main Road">
                                <input name="distanceFromMainRoad" placeholder="e.g. 200 meters" value={form.distanceFromMainRoad} onChange={handleChange} style={inputStyle} />
                            </Field>
                        </div>
                        <Field label="Full Address" required>
                            <input name="address" placeholder="House no, road, area, city" value={form.address} onChange={handleChange} required style={inputStyle} />
                        </Field>
                        <div className="add-prop-grid-3">
                            <Field label="Latitude">
                                <input name="lat" type="number" step="any" placeholder="23.8103" value={form.location.lat} onChange={handleLocation} style={inputStyle} />
                            </Field>
                            <Field label="Longitude">
                                <input name="lng" type="number" step="any" placeholder="90.4125" value={form.location.lng} onChange={handleLocation} style={inputStyle} />
                            </Field>
                            <Field label="Google Maps Link">
                                <input name="mapLink" placeholder="https://maps.google.com/..." value={form.location.mapLink} onChange={handleLocation} style={inputStyle} />
                            </Field>
                        </div>
                    </SectionCard>

                    {/* Facilities */}
                    <SectionCard icon="✨" title="Facilities & Amenities">
                        <div style={{display:"flex",flexWrap:"wrap",gap:"0.6rem"}}>
                            {FACILITIES.map(f => (
                                <button key={f} type="button" onClick={()=>toggleFacility(f)} style={{
                                    background: form.facilities.includes(f) ? "#e94560" : "#f5f5f5",
                                    color:      form.facilities.includes(f) ? "#fff" : "#555",
                                    border:"none",borderRadius:22,padding:"0.42rem 1rem",
                                    fontWeight:600,fontSize:"0.85rem",cursor:"pointer",
                                    transition:"all 0.15s",
                                    boxShadow: form.facilities.includes(f) ? "0 2px 8px rgba(233,69,96,0.3)" : "none"
                                }}>
                                    {form.facilities.includes(f) ? "✓ " : ""}{f}
                                </button>
                            ))}
                        </div>
                        {form.facilities.length > 0 && (
                            <p style={{marginTop:"0.8rem",fontSize:"0.8rem",color:"#27ae60",fontWeight:600}}>
                                ✅ {form.facilities.length} facilit{form.facilities.length===1?"y":"ies"} selected
                            </p>
                        )}
                    </SectionCard>

                    {/* Images */}
                    <SectionCard icon="📷" title="Property Images">
                        <label style={{
                            display:"block",border:"2px dashed #e8e8e8",borderRadius:12,
                            padding:"1.5rem",textAlign:"center",cursor:"pointer",
                            background:"#fafafa",transition:"border 0.15s"
                        }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor="#e94560"}
                        onMouseLeave={e=>e.currentTarget.style.borderColor="#e8e8e8"}>
                            <input type="file" multiple accept="image/*" onChange={handleImages} style={{display:"none"}} />
                            <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>📸</div>
                            <div style={{fontWeight:600,color:"#555",fontSize:"0.88rem"}}>Click to upload images</div>
                            <div style={{color:"#aaa",fontSize:"0.78rem",marginTop:"0.3rem"}}>JPEG, PNG, WebP · Max 5 images</div>
                        </label>
                        {preview.length > 0 && (
                            <div style={{display:"flex",gap:"0.6rem",flexWrap:"wrap",marginTop:"1rem"}}>
                                {preview.map((src,i) => (
                                    <div key={i} style={{position:"relative"}}>
                                        <img src={src} alt="" style={{width:80,height:64,objectFit:"cover",borderRadius:8,border:"2px solid #eee"}} />
                                        <span style={{position:"absolute",bottom:4,right:4,background:"rgba(0,0,0,0.55)",color:"#fff",fontSize:"0.6rem",padding:"0.1rem 0.35rem",borderRadius:4}}>{i+1}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    {/* Submit */}
                    <div className="add-prop-actions" style={{display:"flex",gap:"0.8rem",justifyContent:"flex-end",flexWrap:"wrap"}}>
                        <Link to="/landlord/properties" style={{
                            background:"#f5f5f5",color:"#555",textDecoration:"none",
                            padding:"0.75rem 1.8rem",borderRadius:10,fontWeight:600,fontSize:"0.92rem"
                        }}>Cancel</Link>
                        <button type="submit" disabled={loading} style={{
                            background: loading ? "#ccc" : "#e94560",
                            color:"#fff",border:"none",padding:"0.75rem 2.2rem",
                            borderRadius:10,fontWeight:700,fontSize:"0.95rem",cursor: loading?"not-allowed":"pointer",
                            boxShadow:"0 4px 14px rgba(233,69,96,0.3)",display:"flex",alignItems:"center",gap:"0.5rem"
                        }}>
                            {loading ? <><span style={{display:"inline-block",width:14,height:14,border:"2px solid #fff",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite"}} />Saving...</> : "➕ Add Property"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProperty;

