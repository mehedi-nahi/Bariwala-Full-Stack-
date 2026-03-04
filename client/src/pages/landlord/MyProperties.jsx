import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { myPropertiesAPI, deletePropertyAPI, changeAvailabilityAPI } from "../../api/propertyAPI";
import { incomingRentalRequestsAPI, respondRentalRequestAPI } from "../../api/rentalRequestAPI";

const API_BASE = "";

const IC = ({ d, size=15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
        <path d={d}/>
    </svg>
);
const D = {
    edit:     "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    view:     "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
    trash:    "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    plus:     "M12 4v16m-8-8h16",
    home:     "M3 9.5L12 3l9 6.5V21H15v-6H9v6H3z",
    check:    "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    key:      "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
    inbox:    "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    invoice:  "M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z",
    requests: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
};

const Btn = ({ label, icon, onClick, color="#555", bg="#f5f5f5", border="1px solid #eee", disabled=false, to }) => {
    const s = {
        display:"inline-flex", alignItems:"center", gap:"0.3rem",
        padding:"0.38rem 0.75rem", fontWeight:600, fontSize:"0.76rem",
        cursor:disabled?"not-allowed":"pointer", background:disabled?"#f0f0f0":bg,
        color:disabled?"#aaa":color, border,
        textDecoration:"none", transition:"opacity 0.15s",
        opacity:disabled?0.6:1, whiteSpace:"nowrap",
        letterSpacing:"0.02em", textTransform:"none"
    };
    if (to) return <Link to={to} style={s}><IC d={D[icon]} size={13}/>{label}</Link>;
    return <button onClick={onClick} disabled={disabled} style={s}><IC d={D[icon]} size={13}/>{label}</button>;
};

/* ── Per-property rental requests panel ── */
const RequestsPanel = ({ propertyId, propertyType, propertyArea, monthlyRent, onResponded }) => {
    const [requests,   setRequests]   = useState(null); // null = loading
    const [expanded,   setExpanded]   = useState(false);
    const [responding, setResponding] = useState(null);
    const navigate = useNavigate();

    // Lazily load when expanded
    useEffect(() => {
        if (!expanded) return;
        incomingRentalRequestsAPI()
            .then(r => {
                const all = r.data.data || [];
                // Filter to only requests for this property
                setRequests(all.filter(req => String(req.propertyInfo?.[0]?._id) === String(propertyId)));
            })
            .catch(() => setRequests([]));
    }, [expanded, propertyId]);

    const handleRespond = async (reqId, action) => {
        setResponding(reqId);
        try {
            await respondRentalRequestAPI(reqId, action);
            // Reload
            const r = await incomingRentalRequestsAPI();
            const all = r.data.data || [];
            setRequests(all.filter(req => String(req.propertyInfo?.[0]?._id) === String(propertyId)));
            onResponded?.();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to respond");
        } finally { setResponding(null); }
    };

    const goToInvoice = (tenant) => {
        // Navigate to invoice page with prefill state
        navigate("/landlord/invoices", {
            state: {
                prefill: {
                    propertyId:   String(propertyId),
                    propertyLabel:`${propertyType} — ${propertyArea}`,
                    monthlyRent:  monthlyRent,
                    tenantId:     String(tenant._id),
                    tenantName:   tenant.name,
                    tenantEmail:  tenant.email,
                }
            }
        });
    };

    const pending  = requests ? requests.filter(r => r.status === "Pending").length  : 0;
    const accepted = requests ? requests.filter(r => r.status === "Accepted").length : 0;

    return (
        <div style={{ borderTop:"1px solid #f0ede8", marginTop:"0.5rem" }}>
            <button
                onClick={() => setExpanded(e => !e)}
                style={{
                    width:"100%", background:"none", border:"none",
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"0.55rem 0.75rem", cursor:"pointer",
                    color:"#555", fontSize:"0.76rem", fontWeight:600,
                    textTransform:"none", letterSpacing:0,
                    borderTop: expanded ? "none" : "none",
                }}>
                <span style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
                    <IC d={D.requests} size={13}/>
                    Rental Requests
                    {pending > 0 && (
                        <span style={{
                            background:"#c0392b", color:"#fff",
                            fontSize:"0.65rem", fontWeight:700,
                            padding:"0.08rem 0.45rem", borderRadius:10,
                            lineHeight:1.4
                        }}>{pending} pending</span>
                    )}
                    {accepted > 0 && (
                        <span style={{
                            background:"#2e7d32", color:"#fff",
                            fontSize:"0.65rem", fontWeight:700,
                            padding:"0.08rem 0.45rem", borderRadius:10,
                            lineHeight:1.4
                        }}>{accepted} accepted</span>
                    )}
                </span>
                <IC d={expanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} size={13}/>
            </button>

            {expanded && (
                <div style={{ background:"#fafaf8", borderTop:"1px solid #f0ede8", padding:"0.75rem" }}>
                    {requests === null ? (
                        <p style={{ color:"#aaa", fontSize:"0.8rem", padding:"0.5rem 0" }}>Loading…</p>
                    ) : requests.length === 0 ? (
                        <p style={{ color:"#aaa", fontSize:"0.8rem", padding:"0.25rem 0" }}>No rental requests for this property yet.</p>
                    ) : (
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            {requests.map(req => {
                                const tenant = req.tenantInfo?.[0];
                                const isPending  = req.status === "Pending";
                                const isAccepted = req.status === "Accepted";
                                const isRejected = req.status === "Rejected";
                                return (
                                    <div key={req._id} style={{
                                        background:"#fff",
                                        border:`1px solid ${isPending?"#fce09b":isAccepted?"#c8e6c9":"#f5c6cb"}`,
                                        borderRadius:2, padding:"0.7rem 0.9rem",
                                        display:"flex", alignItems:"center",
                                        justifyContent:"space-between", gap:"0.75rem",
                                        flexWrap:"wrap"
                                    }}>
                                        {/* Tenant info */}
                                        <div style={{ flex:1, minWidth:120 }}>
                                            <div style={{ fontWeight:700, fontSize:"0.83rem", color:"#111" }}>
                                                {tenant?.name || "Unknown"}
                                            </div>
                                            <div style={{ fontSize:"0.74rem", color:"#888" }}>{tenant?.email}</div>
                                            {req.message && (
                                                <div style={{ fontSize:"0.76rem", color:"#555", marginTop:2,
                                                    fontStyle:"italic", maxWidth:260,
                                                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                                    "{req.message}"
                                                </div>
                                            )}
                                            <div style={{ fontSize:"0.7rem", color:"#aaa", marginTop:2 }}>
                                                {new Date(req.createdAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
                                            </div>
                                        </div>

                                        {/* Status + actions */}
                                        <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", flexWrap:"wrap" }}>
                                            <span style={{
                                                fontSize:"0.7rem", fontWeight:700,
                                                padding:"0.18rem 0.55rem", borderRadius:2,
                                                background:isPending?"#fffbf0":isAccepted?"#f0f8f0":"#fdf0f0",
                                                color:isPending?"#8a6914":isAccepted?"#2e7d32":"#c0392b",
                                                border:`1px solid ${isPending?"#fce09b":isAccepted?"#c8e6c9":"#f5c6cb"}`,
                                                textTransform:"uppercase", letterSpacing:"0.04em"
                                            }}>{req.status}</span>

                                            {isPending && (
                                                <>
                                                    <button onClick={() => handleRespond(req._id, "accept")}
                                                        disabled={responding === req._id}
                                                        style={{
                                                            background:"#2e7d32", color:"#fff", border:"none",
                                                            padding:"0.3rem 0.7rem", fontSize:"0.72rem",
                                                            fontWeight:700, cursor:"pointer",
                                                            opacity: responding===req._id?0.5:1,
                                                            textTransform:"none", letterSpacing:0
                                                        }}>✓ Accept</button>
                                                    <button onClick={() => handleRespond(req._id, "reject")}
                                                        disabled={responding === req._id}
                                                        style={{
                                                            background:"none", color:"#c0392b",
                                                            border:"1px solid #c0392b",
                                                            padding:"0.3rem 0.7rem", fontSize:"0.72rem",
                                                            fontWeight:700, cursor:"pointer",
                                                            textTransform:"none", letterSpacing:0
                                                        }}>✕ Reject</button>
                                                </>
                                            )}

                                            {isAccepted && tenant && (
                                                <button onClick={() => goToInvoice(tenant)}
                                                    style={{
                                                        background:"#111", color:"#fff", border:"none",
                                                        padding:"0.32rem 0.8rem", fontSize:"0.72rem",
                                                        fontWeight:700, cursor:"pointer",
                                                        display:"flex", alignItems:"center", gap:"0.3rem",
                                                        textTransform:"none", letterSpacing:0
                                                    }}>
                                                    <IC d={D.invoice} size={12}/> Generate Invoice
                                                </button>
                                            )}

                                            {isRejected && (
                                                <span style={{ fontSize:"0.7rem", color:"#aaa" }}>Closed</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ── Main Component ── */
const MyProperties = () => {
    const [properties,   setProperties]   = useState([]);
    const [allRequests,  setAllRequests]  = useState([]); // all incoming rental requests
    const [msg,          setMsg]          = useState({ text:"", type:"" });
    const [deleting,     setDeleting]     = useState(null);
    const [toggling,     setToggling]     = useState(null);

    const loadRequests = () =>
        incomingRentalRequestsAPI()
            .then(r => setAllRequests(r.data.data || []))
            .catch(() => {});

    const load = () =>
        myPropertiesAPI()
            .then(r => setProperties(r.data.data || []));

    useEffect(() => {
        Promise.all([load(), loadRequests()]);
    }, []);

    // Count requests per property (any status)
    const requestCount = (propertyId) =>
        allRequests.filter(r => String(r.propertyInfo?.[0]?._id) === String(propertyId)).length;

    const pendingCount = (propertyId) =>
        allRequests.filter(r => String(r.propertyInfo?.[0]?._id) === String(propertyId) && r.status === "Pending").length;

    // Sort: properties with pending requests first, then those with any requests, then rest
    const sortedProperties = [...properties].sort((a, b) => {
        const pa = pendingCount(a._id), pb = pendingCount(b._id);
        if (pa !== pb) return pb - pa;
        const ra = requestCount(a._id), rb = requestCount(b._id);
        return rb - ra;
    });

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this property? This cannot be undone.")) return;
        setDeleting(id);
        try { await deletePropertyAPI(id); setMsg({text:"Property deleted.",type:"success"}); load(); }
        catch { setMsg({text:"Failed to delete.",type:"error"}); }
        finally { setDeleting(null); }
    };

    const toggleAvail = async (id, current) => {
        setToggling(id);
        try { await changeAvailabilityAPI(id,{availability:current==="Available"?"Rented":"Available"}); load(); }
        finally { setToggling(null); }
    };

    const avail  = properties.filter(p=>p.availability==="Available").length;
    const rented = properties.filter(p=>p.availability==="Rented").length;
    const totalPending = allRequests.filter(r => r.status === "Pending").length;

    // Properties split into two groups for section labels
    const withRequests    = sortedProperties.filter(p => requestCount(p._id) > 0);
    const withoutRequests = sortedProperties.filter(p => requestCount(p._id) === 0);

    const renderRow = (p) => (
        <div key={p._id} style={{background:"#fff"}}>
            {/* Main row */}
            <div style={{
                display:"grid",
                gridTemplateColumns:"52px 1fr 110px 110px 120px 180px",
                padding:"0.85rem 1rem",alignItems:"center"}}
                onMouseEnter={e=>e.currentTarget.style.background="#fafaf8"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

                {/* Thumbnail */}
                <div style={{width:40,height:40,overflow:"hidden",background:"#f5f2ee",flexShrink:0}}>
                    {p.images?.[0]
                        ? <img src={API_BASE+p.images[0]} alt=""
                            style={{width:"100%",height:"100%",objectFit:"cover"}}
                            onError={e=>e.target.style.display="none"}/>
                        : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"#ccc"}}>
                            <IC d={D.home} size={16}/>
                          </div>}
                </div>

                {/* Title */}
                <div style={{paddingLeft:"0.75rem",minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:"0.86rem",color:"#111",
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {p.propertyType} in {p.area}
                        {pendingCount(p._id) > 0 && (
                            <span style={{
                                marginLeft:7, background:"#c0392b", color:"#fff",
                                fontSize:"0.6rem", fontWeight:700,
                                padding:"0.1rem 0.45rem", verticalAlign:"middle"
                            }}>{pendingCount(p._id)} pending</span>
                        )}
                    </div>
                    <div style={{fontSize:"0.72rem",color:"#aaa",marginTop:2,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        📍 {p.address}
                    </div>
                    {p.facilities?.length>0 && (
                        <div style={{display:"flex",gap:"0.2rem",marginTop:"0.3rem",flexWrap:"wrap"}}>
                            {p.facilities.slice(0,3).map(f=>(
                                <span key={f} style={{background:"#f5f2ee",color:"#555",fontSize:"0.6rem",padding:"0.1rem 0.4rem",fontWeight:600}}>{f}</span>
                            ))}
                            {p.facilities.length>3 && <span style={{fontSize:"0.6rem",color:"#aaa"}}>+{p.facilities.length-3}</span>}
                        </div>
                    )}
                </div>

                {/* Type */}
                <div>
                    <span style={{background:"#f5f2ee",color:"#555",fontSize:"0.72rem",padding:"0.2rem 0.6rem",fontWeight:600}}>
                        {p.propertyType}
                    </span>
                </div>

                {/* Rent */}
                <div>
                    <div style={{fontWeight:800,fontSize:"0.9rem",color:"#111"}}>৳{p.monthlyRent?.toLocaleString()}</div>
                    {p.advanceDeposit&&<div style={{fontSize:"0.68rem",color:"#aaa"}}>Dep: ৳{p.advanceDeposit?.toLocaleString()}</div>}
                </div>

                {/* Status toggle */}
                <div>
                    <button onClick={()=>toggleAvail(p._id,p.availability)} disabled={toggling===p._id}
                        style={{
                            display:"inline-flex",alignItems:"center",gap:"0.3rem",
                            padding:"0.28rem 0.7rem",fontWeight:700,fontSize:"0.7rem",cursor:"pointer",
                            border:`1px solid ${p.availability==="Available"?"#c8e6c9":"#fce09b"}`,
                            background:p.availability==="Available"?"#f0f8f0":"#fffbf0",
                            color:p.availability==="Available"?"#2e7d32":"#8a6914",
                            opacity:toggling===p._id?0.6:1,
                            textTransform:"none",letterSpacing:0}}>
                        <IC d={p.availability==="Available"?D.check:D.key} size={11}/>
                        {toggling===p._id?"…":p.availability}
                    </button>
                </div>

                {/* Actions */}
                <div style={{display:"flex",gap:"0.35rem",justifyContent:"flex-end",flexWrap:"wrap"}}>
                    <Btn label="View"   icon="view"  to={"/property/"+p._id}               color="#555"   bg="#fff" border="1px solid #e8e4dc"/>
                    <Btn label="Edit"   icon="edit"  to={"/landlord/edit-property/"+p._id} color="#555"   bg="#fff" border="1px solid #e8e4dc"/>
                    <Btn label={deleting===p._id?"…":"Delete"} icon="trash"
                        onClick={()=>handleDelete(p._id)} disabled={deleting===p._id}
                        color="#c0392b" bg="#fff" border="1px solid #f5c6cb"/>
                </div>
            </div>

            {/* ── Rental Requests accordion — only shown when this property has requests ── */}
            {requestCount(p._id) > 0 && (
                <RequestsPanel
                    propertyId={p._id}
                    propertyType={p.propertyType}
                    propertyArea={p.area}
                    monthlyRent={p.monthlyRent}
                    onResponded={() => { load(); loadRequests(); }}
                />
            )}
        </div>
    );

    return (
        <div style={{background:"#fafaf8",minHeight:"100vh",paddingBottom:"4rem"}}>

            {/* ── Header ── */}
            <div style={{background:"#111",borderBottom:"1px solid #222"}}>
                <div style={{maxWidth:1120,margin:"0 auto",padding:"1.4rem 1rem",
                    display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}>
                    <div>
                        <div style={{display:"flex",alignItems:"center",gap:"0.5rem",fontSize:"0.72rem",color:"#666",marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.06em"}}>
                            <Link to="/" style={{color:"#888",textDecoration:"none"}}>Home</Link>
                            <span style={{color:"#444"}}>/</span>
                            <span style={{color:"#999"}}>My Properties</span>
                        </div>
                        <h1 style={{color:"#fff",fontWeight:800,fontSize:"1.3rem",margin:0,letterSpacing:"-0.02em"}}>My Properties</h1>
                        <p style={{color:"#666",fontSize:"0.78rem",marginTop:"0.2rem",margin:0}}>
                            {properties.length} listing{properties.length!==1?"s":""}
                            <span style={{color:"#555",margin:"0 0.4rem"}}>·</span>
                            <span style={{color:"#4caf50"}}>{avail} available</span>
                            <span style={{color:"#555",margin:"0 0.4rem"}}>·</span>
                            <span style={{color:"#f39c12"}}>{rented} rented</span>
                            {totalPending > 0 && <>
                                <span style={{color:"#555",margin:"0 0.4rem"}}>·</span>
                                <span style={{color:"#c0392b",fontWeight:700}}>{totalPending} pending request{totalPending!==1?"s":""}</span>
                            </>}
                        </p>
                    </div>
                    <Link to="/landlord/add-property" style={{
                        display:"inline-flex",alignItems:"center",gap:"0.4rem",
                        background:"#c0392b",color:"#fff",textDecoration:"none",
                        padding:"0.55rem 1.2rem",fontWeight:700,fontSize:"0.78rem",
                        letterSpacing:"0.06em",textTransform:"uppercase"}}>
                        <IC d={D.plus} size={13}/> Add Property
                    </Link>
                </div>
            </div>

            <div style={{maxWidth:1120,margin:"2rem auto",padding:"0 1rem"}}>

                {/* Alert */}
                {msg.text && (
                    <div style={{
                        display:"flex",justifyContent:"space-between",alignItems:"center",
                        background:msg.type==="success"?"#f0f8f0":"#fdf0f0",
                        border:`1px solid ${msg.type==="success"?"#c8e6c9":"#f5c6cb"}`,
                        color:msg.type==="success"?"#2e7d32":"#c0392b",
                        padding:"0.65rem 1rem",marginBottom:"1.2rem",fontSize:"0.84rem",fontWeight:600}}>
                        {msg.text}
                        <button onClick={()=>setMsg({text:"",type:""})}
                            style={{background:"none",border:"none",cursor:"pointer",opacity:0.5,fontSize:"1rem",padding:0,textTransform:"none",letterSpacing:0}}>✕</button>
                    </div>
                )}

                {/* Empty state */}
                {properties.length===0 && (
                    <div style={{background:"#fff",border:"1px solid #e8e4dc",padding:"5rem 2rem",textAlign:"center"}}>
                        <IC d={D.home} size={40}/>
                        <h3 style={{color:"#111",margin:"1rem 0 0.4rem",fontWeight:700}}>No properties yet</h3>
                        <p style={{color:"#aaa",marginBottom:"1.5rem",fontSize:"0.88rem"}}>Add your first rental listing to get started.</p>
                        <Link to="/landlord/add-property" style={{
                            background:"#111",color:"#fff",textDecoration:"none",
                            padding:"0.65rem 1.8rem",fontWeight:700,fontSize:"0.82rem",
                            letterSpacing:"0.06em",textTransform:"uppercase"}}>
                            Add First Property
                        </Link>
                    </div>
                )}

                {/* Property list */}
                {sortedProperties.length > 0 && (
                    <div className="properties-table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                    <div style={{display:"flex",flexDirection:"column",gap:1,border:"1px solid #e8e4dc",background:"#e8e4dc",minWidth:700}}>

                        {/* Column header */}
                        <div style={{
                            display:"grid",
                            gridTemplateColumns:"52px 1fr 110px 110px 120px 180px",
                            padding:"0.55rem 1rem",background:"#111",
                            fontSize:"0.68rem",fontWeight:700,color:"#888",
                            textTransform:"uppercase",letterSpacing:"0.06em"}}>
                            <div/>
                            <div>Property</div>
                            <div>Type</div>
                            <div>Rent / mo</div>
                            <div>Status</div>
                            <div style={{textAlign:"right"}}>Actions</div>
                        </div>

                        {/* Properties WITH requests — shown first */}
                        {withRequests.length > 0 && (
                            <>
                                <div style={{
                                    padding:"0.45rem 1rem",
                                    background:"#fffbf0",
                                    borderBottom:"1px solid #fce09b",
                                    fontSize:"0.7rem",fontWeight:700,
                                    color:"#8a6914",textTransform:"uppercase",letterSpacing:"0.06em",
                                    display:"flex",alignItems:"center",gap:"0.4rem"
                                }}>
                                    <IC d={D.requests} size={12}/>
                                    {totalPending} Pending Rental Request{totalPending!==1?"s":""} — Action Required
                                </div>
                                {withRequests.map(p => renderRow(p))}
                            </>
                        )}

                        {/* Divider between groups */}
                        {withRequests.length > 0 && withoutRequests.length > 0 && (
                            <div style={{
                                padding:"0.45rem 1rem",
                                background:"#f5f2ee",
                                fontSize:"0.68rem",fontWeight:700,
                                color:"#aaa",textTransform:"uppercase",letterSpacing:"0.06em"
                            }}>
                                Other Listings
                            </div>
                        )}

                        {/* Properties WITHOUT requests */}
                        {withoutRequests.map(p => renderRow(p))}
                    </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyProperties;

