import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createItemAPI } from "../../api/marketplaceAPI";

const SectionCard = ({ icon, title, children }) => (
    <div style={{background:"#fff",borderRadius:14,padding:"1.4rem 1.5rem",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",marginBottom:"1.2rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1.1rem",paddingBottom:"0.7rem",borderBottom:"1px solid #f5f5f5"}}>
            <span style={{fontSize:"1.2rem"}}>{icon}</span>
            <h3 style={{fontWeight:700,fontSize:"0.95rem",color:"#1a1a2e",margin:0}}>{title}</h3>
        </div>
        {children}
    </div>
);

const Field = ({ label, required, children, hint }) => (
    <div style={{marginBottom:"1rem"}}>
        <label style={{display:"block",fontWeight:600,fontSize:"0.82rem",color:"#555",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:"0.4rem"}}>
            {label}{required && <span style={{color:"#e94560",marginLeft:2}}>*</span>}
        </label>
        {children}
        {hint && <p style={{fontSize:"0.75rem",color:"#aaa",margin:"0.3rem 0 0"}}>{hint}</p>}
    </div>
);

const inp = {padding:"0.65rem 0.9rem",border:"1px solid #e8e8e8",borderRadius:9,fontSize:"0.92rem",background:"#fafafa",width:"100%",boxSizing:"border-box",outline:"none",transition:"border 0.15s"};

const AddItem = () => {
    const navigate = useNavigate();
    const [form, setForm]     = useState({ title:"", description:"", price:"", condition:"Used" });
    const [images, setImages] = useState([]);
    const [preview, setPreview] = useState([]);
    const [error,   setError]   = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

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
            Object.keys(form).forEach(k => fd.append(k, form[k]));
            images.forEach(img => fd.append("images", img));
            await createItemAPI(fd);
            navigate("/marketplace/my-items");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to post item");
        } finally { setLoading(false); }
    };

    return (
        <div style={{background:"#f5f6fa",minHeight:"100vh",paddingBottom:"3rem"}}>
            <style>{`
                .add-item-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
                .add-item-actions{display:flex;gap:1rem;justify-content:flex-end;margin-top:0.5rem;flex-wrap:wrap}
                @media(max-width:600px){
                    .add-item-grid{grid-template-columns:1fr!important}
                    .add-item-actions{flex-direction:column!important}
                    .add-item-actions a,.add-item-actions button{width:100%!important;text-align:center!important}
                }
            `}</style>
            {/* Header */}
            <div style={{background:"linear-gradient(135deg,#1a1a2e 60%,#e94560)",padding:"1.5rem 1rem 3rem",color:"#fff"}}>
                <div style={{maxWidth:820,margin:"0 auto"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.6rem",fontSize:"0.82rem",color:"#aaa",marginBottom:"0.8rem",flexWrap:"wrap"}}>
                        <Link to="/marketplace/items" style={{color:"#e94560",textDecoration:"none"}}>Home</Link>
                        <span>›</span>
                        <Link to="/marketplace/my-items" style={{color:"#aaa",textDecoration:"none"}}>My Items</Link>
                        <span>›</span>
                        <span style={{color:"#fff"}}>Sell Item</span>
                    </div>
                    <h1 style={{fontSize:"1.5rem",fontWeight:800,margin:0}}>List an Item for Sale</h1>
                    <p style={{opacity:0.75,marginTop:"0.3rem",fontSize:"0.88rem"}}>Fill in the details below to list your item on the marketplace.</p>
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
                    <SectionCard icon="🏷️" title="Item Details">
                        <div className="add-item-grid">
                            <Field label="Item Title" required>
                                <input name="title" value={form.title} onChange={handleChange}
                                    placeholder="e.g. Wooden Dining Table" style={inp} required
                                    onFocus={e=>e.target.style.borderColor="#e94560"}
                                    onBlur={e=>e.target.style.borderColor="#e8e8e8"}/>
                            </Field>
                            <Field label="Condition" required>
                                <select name="condition" value={form.condition} onChange={handleChange} style={inp}>
                                    <option value="New">New</option>
                                    <option value="Used">Used</option>
                                </select>
                            </Field>
                        </div>
                        <Field label="Description" hint="Describe the item, its features, dimensions, and why you're selling it.">
                            <textarea name="description" value={form.description} onChange={handleChange}
                                placeholder="Describe your item in detail..."
                                style={{...inp,minHeight:100,resize:"vertical"}}
                                onFocus={e=>e.target.style.borderColor="#e94560"}
                                onBlur={e=>e.target.style.borderColor="#e8e8e8"}/>
                        </Field>
                    </SectionCard>

                    {/* Pricing */}
                    <SectionCard icon="💰" title="Pricing">
                        <div className="add-item-grid">
                            <Field label="Asking Price (BDT)" required>
                                <div style={{position:"relative"}}>
                                    <span style={{position:"absolute",left:"0.75rem",top:"50%",transform:"translateY(-50%)",color:"#888",fontWeight:700,fontSize:"0.9rem"}}>৳</span>
                                    <input name="price" value={form.price} onChange={handleChange}
                                        placeholder="0" type="number" min="0" required
                                        style={{...inp,paddingLeft:"1.8rem"}}
                                        onFocus={e=>e.target.style.borderColor="#e94560"}
                                        onBlur={e=>e.target.style.borderColor="#e8e8e8"}/>
                                </div>
                            </Field>
                            <Field label="Negotiable?">
                                <select style={inp}>
                                    <option>Yes, open to offers</option>
                                    <option>No, fixed price</option>
                                </select>
                            </Field>
                        </div>
                    </SectionCard>

                    {/* Images */}
                    <SectionCard icon="📸" title="Item Photos">
                        <Field label="Upload Images" hint="Upload clear photos from multiple angles. Max 6 images.">
                            <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                                border:"2px dashed #e94560",borderRadius:10,padding:"1.5rem",cursor:"pointer",
                                background:"#fff0f2",gap:"0.5rem",textAlign:"center"}}>
                                <span style={{fontSize:"2rem"}}>📷</span>
                                <span style={{fontWeight:600,color:"#e94560",fontSize:"0.88rem"}}>Click to upload photos</span>
                                <span style={{fontSize:"0.75rem",color:"#aaa"}}>JPG, PNG, WEBP — up to 6 files</span>
                                <input type="file" multiple accept="image/*" onChange={handleImages}
                                    style={{display:"none"}} max={6}/>
                            </label>
                        </Field>
                        {preview.length > 0 && (
                            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))",gap:"0.6rem",marginTop:"0.8rem"}}>
                                {preview.map((src,i)=>(
                                    <div key={i} style={{borderRadius:8,overflow:"hidden",height:90,background:"#f5f5f5",position:"relative"}}>
                                        <img src={src} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                                        {i===0 && <span style={{position:"absolute",bottom:4,left:4,background:"#e94560",color:"#fff",fontSize:"0.6rem",fontWeight:700,padding:"0.1rem 0.4rem",borderRadius:4}}>Cover</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    {/* Submit */}
                    <div className="add-item-actions">
                        <Link to="/marketplace/my-items"
                            style={{padding:"0.8rem 1.8rem",borderRadius:10,border:"1px solid #e0e0e0",
                                color:"#666",textDecoration:"none",fontWeight:600,fontSize:"0.9rem",
                                display:"flex",alignItems:"center",background:"#fff"}}>
                            Cancel
                        </Link>
                        <button type="submit" disabled={loading}
                            style={{background:loading?"#ccc":"#e94560",color:"#fff",border:"none",
                                borderRadius:10,padding:"0.8rem 2.2rem",fontWeight:700,fontSize:"0.9rem",
                                cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:"0.5rem"}}>
                            {loading ? "Posting…" : "🛒 Post Item for Sale"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddItem;
