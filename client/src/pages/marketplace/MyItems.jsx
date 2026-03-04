import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { myItemsAPI, deleteItemAPI, updateItemAPI } from "../../api/marketplaceAPI";

const API_BASE = "";

const IC = ({ d, size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d={d} />
    </svg>
);

const D = {
    edit:    "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    view:    "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
    trash:   "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    plus:    "M12 4v16m-8-8h16",
    check:   "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    package: "M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
    x:       "M18 6L6 18M6 6l12 12",
};

const Badge = ({ label, color, bg }) => (
    <span style={{
        display: "inline-flex", alignItems: "center", gap: "0.3rem",
        fontSize: "0.72rem", fontWeight: 700,
        padding: "0.2rem 0.65rem", borderRadius: 20,
        background: bg, color, letterSpacing: "0.02em",
    }}>
        {label}
    </span>
);

const Btn = ({ label, icon, onClick, color = "#555", bg = "#f5f5f5", border = "1px solid #eee", disabled = false, to }) => {
    const s = {
        display: "inline-flex", alignItems: "center", gap: "0.3rem",
        padding: "0.38rem 0.75rem", borderRadius: 7, fontWeight: 600,
        fontSize: "0.76rem", cursor: disabled ? "not-allowed" : "pointer",
        background: disabled ? "#f0f0f0" : bg, color: disabled ? "#aaa" : color,
        border, textDecoration: "none", transition: "opacity 0.15s",
        opacity: disabled ? 0.6 : 1, whiteSpace: "nowrap",
    };
    if (to) return <Link to={to} style={s}><IC d={D[icon]} size={13} />{label}</Link>;
    return <button onClick={onClick} disabled={disabled} style={s}><IC d={D[icon]} size={13} />{label}</button>;
};

const inp = (extra = {}) => ({
    padding: "0.55rem 0.75rem", border: "1px solid #e0e0e0",
    borderRadius: 8, fontSize: "0.88rem", background: "#fff",
    width: "100%", boxSizing: "border-box", outline: "none", color: "#1a1a2e",
    ...extra,
});

const MyItems = () => {
    const [items,    setItems]    = useState([]);
    const [msg,      setMsg]      = useState({ text: "", type: "" });
    const [editId,   setEditId]   = useState(null);
    const [editForm, setEditForm] = useState({ title: "", description: "", price: "", condition: "Used" });
    const [saving,   setSaving]   = useState(false);
    const [deleting, setDeleting] = useState(null);

    const load = () => myItemsAPI().then(res => setItems(res.data.data || []));
    useEffect(() => { load(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Permanently delete this listing? This cannot be undone.")) return;
        setDeleting(id);
        try {
            await deleteItemAPI(id);
            setMsg({ text: "Listing removed successfully.", type: "success" });
            load();
        } catch {
            setMsg({ text: "Failed to delete listing.", type: "error" });
        } finally { setDeleting(null); }
    };

    const startEdit = (item) => {
        setEditId(item._id);
        setMsg({ text: "", type: "" });
        setEditForm({ title: item.title, description: item.description || "", price: item.price, condition: item.condition || "Used" });
    };

    const cancelEdit = () => { setEditId(null); setMsg({ text: "", type: "" }); };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateItemAPI(editId, editForm);
            setMsg({ text: "Listing updated successfully.", type: "success" });
            setEditId(null);
            load();
        } catch {
            setMsg({ text: "Failed to update listing. Please try again.", type: "error" });
        } finally { setSaving(false); }
    };

    const newCount  = items.filter(i => i.condition === "New"  && !i.isSold).length;
    const usedCount = items.filter(i => i.condition === "Used" && !i.isSold).length;
    const soldCount = items.filter(i => i.isSold).length;
    const activeItems = items.filter(i => !i.isSold);
    const soldItems   = items.filter(i => i.isSold);

    return (
        <div style={{ background: "#f5f6fa", minHeight: "100vh", paddingBottom: "4rem" }}>
            <style>{`
                .my-items-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
                .my-items-row { min-width: 560px; }
            `}</style>

            {/* ── Header ── */}
            <div style={{ background: "#1a1a2e", borderBottom: "3px solid #e94560" }}>
                <div style={{
                    maxWidth: 1100, margin: "0 auto", padding: "1.4rem 1rem",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    flexWrap: "wrap", gap: "1rem",
                }}>
                    <div>
                        <div style={{
                            display: "flex", alignItems: "center", gap: "0.5rem",
                            fontSize: "0.75rem", color: "#888", marginBottom: "0.4rem",
                        }}>
                            <Link to="/marketplace/items" style={{ color: "#e94560", textDecoration: "none" }}>Marketplace</Link>
                            <span>/</span>
                            <span style={{ color: "#ccc" }}>My Listings</span>
                        </div>
                        <h1 style={{ color: "#fff", fontWeight: 800, fontSize: "1.45rem", margin: 0 }}>My Listings</h1>
                        <p style={{ color: "#888", fontSize: "0.82rem", marginTop: "0.25rem", margin: 0 }}>
                            {items.length} listing{items.length !== 1 ? "s" : ""} &nbsp;·&nbsp;
                            <span style={{ color: "#27ae60" }}>{newCount} new</span> &nbsp;·&nbsp;
                            <span style={{ color: "#f39c12" }}>{usedCount} used</span> &nbsp;·&nbsp;
                            <span style={{ color: "#e94560" }}>{soldCount} sold</span>
                        </p>
                    </div>
                    <Link to="/marketplace/add-item" style={{
                        display: "inline-flex", alignItems: "center", gap: "0.4rem",
                        background: "#e94560", color: "#fff", textDecoration: "none",
                        padding: "0.6rem 1.3rem", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem",
                        boxShadow: "0 4px 14px rgba(233,69,96,0.35)",
                    }}>
                        <IC d={D.plus} size={14} /> New Listing
                    </Link>
                </div>
            </div>

            <div style={{ maxWidth: 1100, margin: "2rem auto", padding: "0 1rem" }}>

                {/* Alert */}
                {msg.text && (
                    <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        background: msg.type === "success" ? "#f0faf4" : "#fdecea",
                        border: `1px solid ${msg.type === "success" ? "#a9dfbf" : "#f5c6cb"}`,
                        color: msg.type === "success" ? "#1a6e3c" : "#c0392b",
                        borderRadius: 8, padding: "0.7rem 1rem", marginBottom: "1.2rem",
                        fontSize: "0.85rem", fontWeight: 600,
                    }}>
                        {msg.text}
                        <button onClick={() => setMsg({ text: "", type: "" })}
                            style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, fontSize: "1rem", padding: 0 }}>✕</button>
                    </div>
                )}

                {/* Empty */}
                {items.length === 0 && (
                    <div style={{ background: "#fff", borderRadius: 12, padding: "5rem 2rem", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                        <IC d={D.package} size={40} />
                        <h3 style={{ color: "#1a1a2e", margin: "1rem 0 0.4rem", fontWeight: 700 }}>No listings yet</h3>
                        <p style={{ color: "#aaa", marginBottom: "1.5rem", fontSize: "0.88rem" }}>Post your first item to start selling on the marketplace.</p>
                        <Link to="/marketplace/add-item" style={{
                            background: "#e94560", color: "#fff", textDecoration: "none",
                            padding: "0.65rem 1.8rem", borderRadius: 8, fontWeight: 700, fontSize: "0.88rem",
                        }}>
                            Post First Item
                        </Link>
                    </div>
                )}

                {/* Active Listings Table */}
                {activeItems.length > 0 && (
                    <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden", marginBottom: "1.5rem" }}>
                        <div style={{ padding: "0.7rem 1rem", background: "#f8f9fa", borderBottom: "2px solid #e94560", display:"flex", alignItems:"center", gap:"0.5rem" }}>
                            <span style={{ fontWeight: 800, fontSize: "0.78rem", color: "#1a1a2e", textTransform:"uppercase", letterSpacing:"0.06em" }}>🟢 Active Listings</span>
                            <span style={{ fontSize:"0.72rem", color:"#888" }}>({activeItems.length})</span>
                        </div>
                        <div className="my-items-table-wrap">
                        {/* Table header */}
                        <div className="my-items-row" style={{
                            display: "grid", gridTemplateColumns: "56px 1fr 120px 120px 160px",
                            padding: "0.6rem 1rem", background: "#f8f9fa", borderBottom: "1px solid #eee",
                            fontSize: "0.7rem", fontWeight: 700, color: "#888",
                            textTransform: "uppercase", letterSpacing: "0.05em",
                        }}>
                            <div /><div>Item</div><div>Price</div><div>Condition</div>
                            <div style={{ textAlign: "right" }}>Actions</div>
                        </div>
                        {activeItems.map((item, idx) => {
                            const isLast = idx === activeItems.length - 1;
                            return (
                                <div key={item._id}>
                                    {editId === item._id ? (
                                        <div style={{ padding: "1.4rem 1.5rem", borderBottom: isLast ? "none" : "1px solid #f5f5f5", background: "#fffbfb", borderLeft: "3px solid #e94560" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                                                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1a1a2e" }}>Edit Listing</div>
                                                <button onClick={cancelEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", padding: 0 }}>
                                                    <IC d={D.x} size={14} /> Cancel
                                                </button>
                                            </div>
                                            <form onSubmit={handleSave}>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", marginBottom: "0.8rem" }}>
                                                    <div>
                                                        <label style={{ fontSize: "0.74rem", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Title *</label>
                                                        <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} style={inp()} required />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: "0.74rem", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Price (BDT) *</label>
                                                        <input value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} type="number" min="0" style={inp()} required />
                                                    </div>
                                                </div>
                                                <div style={{ marginBottom: "0.8rem" }}>
                                                    <label style={{ fontSize: "0.74rem", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Condition</label>
                                                    <select value={editForm.condition} onChange={e => setEditForm({ ...editForm, condition: e.target.value })} style={inp()}>
                                                        <option value="New">New</option>
                                                        <option value="Used">Used</option>
                                                    </select>
                                                </div>
                                                <div style={{ marginBottom: "1.2rem" }}>
                                                    <label style={{ fontSize: "0.74rem", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Description</label>
                                                    <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} style={{ ...inp(), minHeight: 80, resize: "vertical" }} />
                                                </div>
                                                <div style={{ display: "flex", gap: "0.6rem" }}>
                                                    <button type="submit" disabled={saving} style={{ background: saving ? "#e0e0e0" : "#e94560", color: "#fff", border: "none", borderRadius: 8, padding: "0.6rem 1.5rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                        <IC d={D.check} size={14} />{saving ? "Saving…" : "Save Changes"}
                                                    </button>
                                                    <button type="button" onClick={cancelEdit} style={{ background: "#f5f5f5", color: "#666", border: "none", borderRadius: 8, padding: "0.6rem 1.2rem", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}>Discard</button>
                                                </div>
                                            </form>
                                        </div>
                                    ) : (
                                        <div className="my-items-row" style={{ display: "grid", gridTemplateColumns: "56px 1fr 120px 120px 160px", padding: "0.85rem 1rem", borderBottom: isLast ? "none" : "1px solid #f5f5f5", alignItems: "center", transition: "background 0.12s" }}
                                            onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                            <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: "#f5f5f5", flexShrink: 0 }}>
                                                {item.images?.[0] ? <img src={API_BASE + item.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                                                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc" }}><IC d={D.package} size={18} /></div>}
                                            </div>
                                            <div style={{ paddingLeft: "0.75rem", minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                                                {item.description && <div style={{ fontSize: "0.74rem", color: "#999", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>}
                                            </div>
                                            <div><div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#e94560" }}>৳{item.price?.toLocaleString()}</div></div>
                                            <div><Badge label={item.condition || "Used"} color={item.condition === "New" ? "#1a7a4a" : "#b7600a"} bg={item.condition === "New" ? "#e8f8f0" : "#fff8e1"} /></div>
                                            <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
                                                <Btn label="View" icon="view" to={"/marketplace/item/" + item._id} color="#555" bg="#f5f5f5" border="1px solid #eee" />
                                                <Btn label="Edit" icon="edit" onClick={() => startEdit(item)} color="#2980b9" bg="#f0f2ff" border="1px solid #d6e0f5" />
                                                <Btn label={deleting === item._id ? "…" : "Delete"} icon="trash" onClick={() => handleDelete(item._id)} disabled={deleting === item._id} color="#e74c3c" bg="#fdecea" border="1px solid #f5c6cb" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        </div>{/* end scroll wrap */}
                    </div>
                )}

                {/* Sold Items Section */}
                {soldItems.length > 0 && (
                    <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                        <div style={{ padding: "0.7rem 1rem", background: "#f8f9fa", borderBottom: "2px solid #27ae60", display:"flex", alignItems:"center", gap:"0.5rem" }}>
                            <span style={{ fontWeight: 800, fontSize: "0.78rem", color: "#1a1a2e", textTransform:"uppercase", letterSpacing:"0.06em" }}>✅ Sold Items</span>
                            <span style={{ fontSize:"0.72rem", color:"#888" }}>({soldItems.length})</span>
                        </div>
                        <div className="my-items-table-wrap">
                        <div className="my-items-row" style={{ display: "grid", gridTemplateColumns: "56px 1fr 120px 160px 200px", padding: "0.6rem 1rem", background: "#f8f9fa", borderBottom: "1px solid #eee", fontSize: "0.7rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            <div /><div>Item</div><div>Price</div><div>Sold On</div><div>Buyer Info</div>
                        </div>
                        {soldItems.map((item, idx) => (
                            <div key={item._id} className="my-items-row" style={{ display: "grid", gridTemplateColumns: "56px 1fr 120px 160px 200px", padding: "0.85rem 1rem", borderBottom: idx < soldItems.length - 1 ? "1px solid #f5f5f5" : "none", alignItems: "center", background:"#f9fffe" }}>
                                <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: "#f5f5f5", flexShrink: 0 }}>
                                    {item.images?.[0] ? <img src={API_BASE + item.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc" }}><IC d={D.package} size={18} /></div>}
                                </div>
                                <div style={{ paddingLeft: "0.75rem", minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                                    <Badge label="SOLD" color="#fff" bg="#27ae60" />
                                </div>
                                <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#27ae60" }}>৳{item.price?.toLocaleString()}</div>
                                <div style={{ fontSize: "0.78rem", color: "#888" }}>
                                    {item.soldAt ? new Date(item.soldAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—"}
                                </div>
                                <div style={{ fontSize: "0.77rem", color: "#555" }}>
                                    {item.buyerInfo?.name ? (
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{item.buyerInfo.name}</div>
                                            <div style={{ color: "#aaa" }}>{item.buyerInfo.area}{item.buyerInfo.city ? `, ${item.buyerInfo.city}` : ""}</div>
                                            {item.buyerInfo.txnRef && <div style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "#2980b9" }}>{item.buyerInfo.txnRef}</div>}
                                        </div>
                                    ) : <span style={{ color: "#ccc" }}>—</span>}
                                </div>
                            </div>
                        ))}
                        </div>{/* end scroll wrap */}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyItems;
