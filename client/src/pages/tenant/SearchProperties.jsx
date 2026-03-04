import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { allPropertiesAPI } from "../../api/propertyAPI";

const API_BASE   = "";
const PER_PAGE   = 20;
const FACILITIES = ["Gas","Water","Lift","WiFi","Generator","Parking","Security","CCTV","AC","Furnished"];

const IC = ({ d, size=16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
        <path d={d}/>
    </svg>
);

/* ── Register Prompt Modal (for marketplace users) ── */
const RegisterPromptModal = ({ onClose }) => (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:2000,
        display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}
        onClick={onClose}>
        <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:440,
            boxShadow:"0 20px 60px rgba(0,0,0,0.3)",overflow:"hidden"}}
            onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{background:"linear-gradient(135deg,#1a1a2e 60%,#e94560)",padding:"1.5rem 1.5rem 1.2rem",color:"#fff"}}>
                <div style={{fontSize:"2rem",marginBottom:"0.4rem"}}>🏠</div>
                <h3 style={{margin:0,fontSize:"1.15rem",fontWeight:800}}>Want to rent a property?</h3>
                <p style={{margin:"0.3rem 0 0",opacity:0.75,fontSize:"0.85rem"}}>
                    Create a tenant or landlord account to access full features.
                </p>
            </div>
            {/* Body */}
            <div style={{padding:"1.4rem 1.5rem"}}>
                <p style={{fontSize:"0.85rem",color:"#666",marginBottom:"1.2rem",lineHeight:1.6}}>
                    Your current <strong>Marketplace</strong> account doesn't include rental features.
                    Register a new account to message landlords, view full details, and more.
                </p>
                <div style={{display:"flex",flexDirection:"column",gap:"0.75rem",marginBottom:"1.2rem"}}>
                    <Link to="/register" style={{
                        display:"flex",alignItems:"center",gap:"1rem",padding:"0.85rem 1rem",
                        background:"#fff0f2",border:"2px solid #e94560",borderRadius:10,
                        textDecoration:"none",color:"#1a1a2e",fontWeight:700,fontSize:"0.9rem"}}>
                        <span style={{fontSize:"1.4rem"}}>🏘️</span>
                        <div>
                            <div>Register as Tenant</div>
                            <div style={{fontSize:"0.75rem",fontWeight:400,color:"#888"}}>Search & rent properties, message landlords</div>
                        </div>
                    </Link>
                    <Link to="/register" style={{
                        display:"flex",alignItems:"center",gap:"1rem",padding:"0.85rem 1rem",
                        background:"#f0f7ff",border:"2px solid #2980b9",borderRadius:10,
                        textDecoration:"none",color:"#1a1a2e",fontWeight:700,fontSize:"0.9rem"}}>
                        <span style={{fontSize:"1.4rem"}}>🔑</span>
                        <div>
                            <div>Register as Landlord</div>
                            <div style={{fontSize:"0.75rem",fontWeight:400,color:"#888"}}>List your properties, manage tenants</div>
                        </div>
                    </Link>
                </div>
                <button onClick={onClose}
                    style={{width:"100%",background:"#f5f5f5",border:"none",borderRadius:8,
                        padding:"0.6rem",color:"#888",cursor:"pointer",fontSize:"0.85rem"}}>
                    Continue browsing →
                </button>
            </div>
        </div>
    </div>
);

/* ── Property Card ── */
const PropCard = ({ p, onClick, isMarketplace }) => {
    const img   = p.images?.[0] ? API_BASE + p.images[0] : null;
    const avail = p.availability === "Available";
    return (
        <div onClick={onClick} style={{background:"#fff",borderRadius:10,overflow:"hidden",
            boxShadow:"0 1px 6px rgba(0,0,0,0.08)",cursor:"pointer",display:"flex",flexDirection:"column",
            transition:"transform 0.18s,box-shadow 0.18s",border:"1px solid #f0f0f0",position:"relative"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 22px rgba(233,69,96,0.13)";e.currentTarget.style.border="1px solid #e94560";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 1px 6px rgba(0,0,0,0.08)";e.currentTarget.style.border="1px solid #f0f0f0";}}>
            <div style={{position:"relative",height:136,background:"#f5f5f5",overflow:"hidden"}}>
                {img
                    ? <img src={img} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
                    : <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"#ddd"}}>
                        <IC d="M3 9.5L12 3l9 6.5V21H15v-6H9v6H3z" size={36}/>
                      </div>}
                <span style={{position:"absolute",top:7,right:7,background:avail?"#27ae60":"#e74c3c",
                    color:"#fff",fontSize:"0.62rem",fontWeight:700,padding:"0.15rem 0.52rem",borderRadius:20}}>
                    {p.availability}
                </span>
                <span style={{position:"absolute",top:7,left:7,background:"rgba(26,26,46,0.82)",
                    color:"#fff",fontSize:"0.62rem",fontWeight:600,padding:"0.15rem 0.52rem",borderRadius:20}}>
                    {p.propertyType}
                </span>
                {isMarketplace && (
                    <div style={{position:"absolute",bottom:6,left:6,right:6,
                        background:"rgba(26,26,46,0.78)",borderRadius:6,
                        display:"flex",alignItems:"center",justifyContent:"center",padding:"0.28rem 0.5rem",gap:"0.4rem"}}>
                        <span style={{color:"#fff",fontSize:"0.68rem",fontWeight:700}}>Register as Tenant to contact</span>
                    </div>
                )}
            </div>
            <div style={{padding:"0.7rem",flex:1,display:"flex",flexDirection:"column",gap:"0.22rem"}}>
                <div style={{fontWeight:700,fontSize:"0.83rem",color:"#1a1a2e",lineHeight:1.3}}>
                    {p.propertyType} · {p.area}
                </div>
                <div style={{fontSize:"0.72rem",color:"#999",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    📍 {p.address}
                </div>
                {p.facilities?.length > 0 && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:"0.2rem"}}>
                        {p.facilities.slice(0,2).map(f=>(
                            <span key={f} style={{background:"#f0f2ff",color:"#2980b9",fontSize:"0.6rem",padding:"0.1rem 0.42rem",borderRadius:20,fontWeight:600}}>{f}</span>
                        ))}
                        {p.facilities.length>2 && <span style={{background:"#f5f5f5",color:"#aaa",fontSize:"0.6rem",padding:"0.1rem 0.42rem",borderRadius:20}}>+{p.facilities.length-2}</span>}
                    </div>
                )}
                <div style={{marginTop:"auto",paddingTop:"0.42rem",borderTop:"1px solid #f5f5f5",
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontWeight:800,fontSize:"0.92rem",color:"#e94560"}}>
                        ৳{p.monthlyRent?.toLocaleString()}<span style={{fontWeight:400,fontSize:"0.68rem",color:"#aaa"}}>/mo</span>
                    </div>
                    <span style={{background:"#e94560",color:"#fff",fontSize:"0.66rem",fontWeight:700,
                        padding:"0.28rem 0.62rem",borderRadius:6}}>
                        {isMarketplace ? "Register →" : "View →"}
                    </span>
                </div>
            </div>
        </div>
    );
};

/* ── Filter Chip ── */
const Chip = ({ label, onRemove }) => (
    <span style={{display:"inline-flex",alignItems:"center",gap:"0.3rem",background:"#fff0f2",
        color:"#e94560",border:"1px solid #f8c8d0",borderRadius:20,fontSize:"0.77rem",
        padding:"0.2rem 0.62rem",fontWeight:600}}>
        {label}
        <button onClick={onRemove} style={{background:"none",border:"none",color:"#e94560",
            cursor:"pointer",padding:0,fontSize:"0.82rem",lineHeight:1}}>×</button>
    </span>
);

/* ══════════════════════════════════════ */
const SearchProperties = ({ user }) => {
    const [properties, setProperties] = useState([]);
    const [filters,    setFilters]    = useState({ area:"", minRent:"", maxRent:"", propertyType:"" });
    const [facilities, setFacilities] = useState([]);
    const [loading,    setLoading]    = useState(false);
    const [loadingMore,setLoadingMore]= useState(false);
    const [total,      setTotal]      = useState(0);
    const [page,       setPage]       = useState(1);
    const [sort,       setSort]       = useState("newest");
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const isMarketplace = user?.role === "marketplace";
    const navigate = useNavigate();

    const blockNonNumeric = e => {
        const ok = ["Backspace","Delete","Tab","ArrowLeft","ArrowRight","Home","End"];
        if (!ok.includes(e.key) && !/^[0-9]$/.test(e.key)) e.preventDefault();
    };

    const buildParams = (pageNo=1) => {
        const p = { ...filters, pageNo, perPage: PER_PAGE };
        if (facilities.length > 0) p.facilities = facilities.join(",");
        return p;
    };

    const applySort = data => {
        if (sort==="price-asc")  return [...data].sort((a,b)=>a.monthlyRent-b.monthlyRent);
        if (sort==="price-desc") return [...data].sort((a,b)=>b.monthlyRent-a.monthlyRent);
        return data;
    };

    const load = async () => {
        setLoading(true); setPage(1);
        try {
            const res = await allPropertiesAPI(buildParams(1));
            const data = res.data.data[0]?.properties || [];
            setTotal(res.data.data[0]?.totalCount?.[0]?.count || data.length);
            setProperties(applySort(data));
        } finally { setLoading(false); }
    };

    const loadMore = async () => {
        const next = page + 1;
        setLoadingMore(true);
        try {
            const res = await allPropertiesAPI(buildParams(next));
            const more = res.data.data[0]?.properties || [];
            setTotal(res.data.data[0]?.totalCount?.[0]?.count || 0);
            setProperties(prev => applySort([...prev, ...more]));
            setPage(next);
        } finally { setLoadingMore(false); }
    };

    useEffect(() => {
        load();
        // Show register prompt for marketplace users when they visit
        if (isMarketplace) setShowRegisterModal(true);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleChange = e => {
        const { name, value } = e.target;
        if (name==="minRent"||name==="maxRent")
            setFilters(f=>({...f,[name]:value.replace(/[^0-9]/g,"")}));
        else setFilters(f=>({...f,[name]:value}));
    };

    const toggleFacility = f => setFacilities(prev => prev.includes(f) ? prev.filter(x=>x!==f) : [...prev,f]);

    const handleReset = () => {
        setFilters({area:"",minRent:"",maxRent:"",propertyType:""});
        setFacilities([]); setSort("newest"); setPage(1);
        setTimeout(load, 0);
    };

    const lbl = {fontWeight:700,fontSize:"0.75rem",color:"#888",textTransform:"uppercase",
        letterSpacing:"0.05em",marginBottom:"0.5rem",display:"block"};
    const inp = {padding:"0.5rem 0.7rem",border:"1px solid #eee",borderRadius:8,
        fontSize:"0.86rem",background:"#fafafa",outline:"none",width:"100%",boxSizing:"border-box"};

    const hasFilters = filters.area||filters.propertyType||filters.minRent||filters.maxRent||facilities.length>0;

    return (
        <div style={{background:"#fafaf8",minHeight:"100vh"}}>

            {/* ══ HERO ══ */}
            <div style={{background:"#111",color:"#fff",padding:"3rem 2rem 3.5rem",textAlign:"center",borderBottom:"1px solid #222"}}>
                <div style={{maxWidth:640,margin:"0 auto"}}>
                    <p style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",
                        color:"#c0392b",marginBottom:"0.9rem"}}>
                        BARIWALA — RENTAL PLATFORM
                    </p>
                    <h1 style={{fontSize:"2rem",fontWeight:800,lineHeight:1.15,margin:"0 0 0.8rem",
                        letterSpacing:"-0.03em",color:"#fff"}}>
                        Find your next home.
                    </h1>
                    <p style={{fontSize:"0.9rem",color:"#888",marginBottom:"2rem",lineHeight:1.7,fontWeight:400}}>
                        Verified flats, rooms &amp; sublets across Bangladesh.
                        Connect directly with landlords — no agents, no fees.
                    </p>

                    {/* Search bar */}
                    <div style={{background:"#fff",display:"flex",alignItems:"center",
                        overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,0.3)",maxWidth:580,margin:"0 auto",
                        border:"1px solid #e8e4dc"}}>
                        <div style={{paddingLeft:"1.1rem",color:"#bbb",display:"flex",alignItems:"center",flexShrink:0}}>
                            <IC d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" size={16}/>
                        </div>
                        <input name="area" value={filters.area} onChange={handleChange}
                            placeholder="Search by area or city…"
                            style={{flex:1,border:"none",background:"transparent",padding:"0.85rem 0.9rem",fontSize:"0.9rem",outline:"none",color:"#111"}}
                            onKeyDown={e=>e.key==="Enter"&&load()}/>
                        <button onClick={load} style={{background:"#c0392b",color:"#fff",border:"none",
                            padding:"0.85rem 1.6rem",fontSize:"0.84rem",fontWeight:700,cursor:"pointer",
                            whiteSpace:"nowrap",flexShrink:0,letterSpacing:"0.04em",textTransform:"uppercase"}}>
                            Search
                        </button>
                    </div>

                    {/* Quick stats */}
                    <div style={{display:"flex",gap:"2.5rem",justifyContent:"center",marginTop:"2rem",flexWrap:"wrap"}}>
                        {[
                            {v:"1,000+", l:"Listings"},
                            {v:"500+",   l:"Available Now"},
                            {v:"50+",    l:"Areas"},
                            {v:"4.8★",   l:"Avg Rating"},
                        ].map(s=>(
                            <div key={s.l} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.15rem"}}>
                                <span style={{fontSize:"1rem",fontWeight:800,color:"#fff"}}>{s.v}</span>
                                <span style={{fontSize:"0.7rem",color:"#555",letterSpacing:"0.04em",textTransform:"uppercase"}}>{s.l}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Guest banner */}
            {!user && (
                <div style={{background:"#1a1a1a",borderBottom:"1px solid #2a2a2a",padding:"0.6rem 2rem",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:"1.2rem",flexWrap:"wrap",textAlign:"center"}}>
                    <span style={{color:"#666",fontSize:"0.8rem",letterSpacing:"0.02em"}}>
                        Login to message landlords or report listings
                    </span>
                    <div style={{display:"flex",gap:"0.5rem"}}>
                        <Link to="/login" style={{background:"#c0392b",color:"#fff",textDecoration:"none",
                            padding:"0.28rem 0.9rem",fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.04em",textTransform:"uppercase"}}>Login</Link>
                        <Link to="/register" style={{background:"transparent",color:"#888",textDecoration:"none",
                            padding:"0.28rem 0.9rem",fontSize:"0.75rem",fontWeight:700,border:"1px solid #333",letterSpacing:"0.04em",textTransform:"uppercase"}}>Register</Link>
                    </div>
                </div>
            )}

            {/* Marketplace user banner */}
            {isMarketplace && (
                <div style={{background:"#fffbf0",borderBottom:"1px solid #fce09b",padding:"0.6rem 2rem",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",flexWrap:"wrap",textAlign:"center"}}>
                    <span style={{fontSize:"0.8rem",color:"#8a6914",letterSpacing:"0.01em"}}>
                        You are browsing as a <strong>Marketplace user</strong> — register as Tenant or Landlord to access rental features.
                    </span>
                    <button onClick={()=>setShowRegisterModal(true)}
                        style={{background:"#111",color:"#fff",border:"none",
                            padding:"0.28rem 0.9rem",fontSize:"0.75rem",fontWeight:700,cursor:"pointer",
                            letterSpacing:"0.04em",textTransform:"uppercase"}}>
                        Register Now
                    </button>
                </div>
            )}

            {/* ══ MAIN LAYOUT ══ */}
            <div style={{maxWidth:1240,margin:"0 auto",padding:"2rem 1rem",display:"flex",gap:"1.5rem",alignItems:"flex-start",flexWrap:"wrap"}}>

                {/* Mobile filter toggle */}
                <div style={{width:"100%",display:"none"}} className="mobile-filter-toggle">
                    <button onClick={()=>setShowFilters(f=>!f)} style={{
                        width:"100%",background:"#111",color:"#fff",border:"none",
                        padding:"0.65rem",borderRadius:9,fontWeight:700,cursor:"pointer",fontSize:"0.88rem",
                        display:"flex",alignItems:"center",justifyContent:"center",gap:"0.4rem"}}>
                        <IC d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" size={14}/>
                        {showFilters ? "Hide Filters" : "Show Filters"}
                        {(facilities.length>0||(filters.area||filters.propertyType||filters.minRent||filters.maxRent)) && (
                            <span style={{background:"#c0392b",color:"#fff",borderRadius:10,fontSize:"0.65rem",padding:"0.05rem 0.45rem",fontWeight:700}}>Active</span>
                        )}
                    </button>
                </div>

                {/* ── SIDEBAR ── */}
                <div className={`search-sidebar${showFilters ? " sidebar-open" : ""}`} style={{width:210,flexShrink:0,background:"#fff",borderRadius:12,
                    boxShadow:"0 1px 8px rgba(0,0,0,0.07)",padding:"1.2rem",position:"sticky",top:72}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.1rem"}}>
                        <h3 style={{fontWeight:700,color:"#1a1a2e",fontSize:"0.92rem",margin:0,display:"flex",alignItems:"center",gap:"0.4rem"}}>
                            <IC d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" size={14}/>
                            Filters
                        </h3>
                        <button onClick={handleReset} style={{background:"none",border:"none",color:"#e94560",fontSize:"0.78rem",cursor:"pointer",fontWeight:700,padding:0}}>Reset</button>
                    </div>

                    {/* Property Type */}
                    <div style={{marginBottom:"1.1rem"}}>
                        <span style={lbl}>Property Type</span>
                        {["","Flat","Room","Sublet"].map(t=>(
                            <label key={t} style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.28rem 0",cursor:"pointer",fontSize:"0.85rem",color:filters.propertyType===t?"#e94560":"#444"}}>
                                <input type="radio" name="propertyType" value={t} checked={filters.propertyType===t} onChange={handleChange} style={{accentColor:"#e94560",width:"auto"}}/>
                                {t||"All Types"}
                            </label>
                        ))}
                    </div>


                    {/* Rent Range */}
                    <div style={{marginBottom:"1.1rem"}}>
                        <span style={lbl}>Rent Range (BDT)</span>
                        <div style={{display:"flex",gap:"0.4rem"}}>
                            <input name="minRent" value={filters.minRent} onChange={handleChange} onKeyDown={blockNonNumeric}
                                placeholder="Min" type="number" min="0" style={{...inp,flex:1}}/>
                            <input name="maxRent" value={filters.maxRent} onChange={handleChange} onKeyDown={blockNonNumeric}
                                placeholder="Max" type="number" min="0" style={{...inp,flex:1}}/>
                        </div>
                    </div>

                    {/* Facilities */}
                    <div style={{marginBottom:"1.2rem"}}>
                        <span style={lbl}>Facilities</span>
                        <div style={{display:"flex",flexWrap:"wrap",gap:"0.35rem"}}>
                            {FACILITIES.map(f=>(
                                <button key={f} onClick={()=>toggleFacility(f)} style={{
                                    background:facilities.includes(f)?"#e94560":"#f5f5f5",
                                    color:facilities.includes(f)?"#fff":"#555",
                                    border:"none",borderRadius:20,fontSize:"0.72rem",
                                    padding:"0.26rem 0.6rem",cursor:"pointer",fontWeight:600,transition:"all 0.15s"}}>
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={()=>{load();setShowFilters(false);}} style={{width:"100%",background:"#e94560",color:"#fff",border:"none",
                        padding:"0.65rem",borderRadius:9,fontWeight:700,cursor:"pointer",fontSize:"0.88rem",
                        display:"flex",alignItems:"center",justifyContent:"center",gap:"0.4rem"}}>
                        <IC d="M21 21l-4.35-4.35m0 0A7 7 0 103.65 3.65a7 7 0 0012.99 13z" size={14}/>
                        Apply Filters
                    </button>
                </div>

                {/* ── RESULTS ── */}
                <div style={{flex:1,minWidth:0}}>
                    {/* Toolbar */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:"0.5rem"}}>
                        <div style={{fontWeight:600,color:"#555",fontSize:"0.88rem"}}>
                            {loading ? "Searching…" : (
                                <>Showing <strong style={{color:"#1a1a2e"}}>{properties.length}</strong>
                                {total>properties.length && <> of <strong style={{color:"#1a1a2e"}}>{total}</strong></>} properties</>
                            )}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                            <span style={{fontSize:"0.82rem",color:"#888"}}>Sort:</span>
                            <select value={sort} onChange={e=>{
                                const s=e.target.value; setSort(s);
                                setProperties(prev=>{
                                    const d=[...prev];
                                    if(s==="price-asc")  return d.sort((a,b)=>a.monthlyRent-b.monthlyRent);
                                    if(s==="price-desc") return d.sort((a,b)=>b.monthlyRent-a.monthlyRent);
                                    return d;
                                });
                            }} style={{...inp,width:"auto",fontSize:"0.83rem",cursor:"pointer"}}>
                                <option value="newest">Newest</option>
                                <option value="price-asc">Price: Low → High</option>
                                <option value="price-desc">Price: High → Low</option>
                            </select>
                        </div>
                    </div>

                    {/* Active filter chips */}
                    {hasFilters && (
                        <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem",marginBottom:"1rem"}}>
                            {filters.area && <Chip label={"📍 "+filters.area} onRemove={()=>setFilters(f=>({...f,area:""}))}/>}
                            {filters.propertyType && <Chip label={"🏠 "+filters.propertyType} onRemove={()=>setFilters(f=>({...f,propertyType:""}))}/>}
                            {filters.availability && <Chip label={"✅ "+filters.availability} onRemove={()=>setFilters(f=>({...f,availability:""}))}/>}
                            {filters.minRent && <Chip label={"Min ৳"+filters.minRent} onRemove={()=>setFilters(f=>({...f,minRent:""}))}/>}
                            {filters.maxRent && <Chip label={"Max ৳"+filters.maxRent} onRemove={()=>setFilters(f=>({...f,maxRent:""}))}/>}
                            {facilities.map(f=><Chip key={f} label={f} onRemove={()=>toggleFacility(f)}/>)}
                        </div>
                    )}

                    {/* Grid */}
                    {loading ? (
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:"0.9rem"}}>
                            {Array.from({length:10}).map((_,i)=>(
                                <div key={i} style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}}>
                                    <div style={{height:136,background:"linear-gradient(90deg,#f5f5f5 25%,#eee 50%,#f5f5f5 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.2s infinite"}}/>
                                    <div style={{padding:"0.7rem"}}>
                                        {[80,60,45].map(w=><div key={w} style={{height:9,background:"#f0f0f0",borderRadius:6,marginBottom:7,width:w+"%"}}/>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : properties.length===0 ? (
                        <div style={{textAlign:"center",padding:"4rem 2rem",background:"#fff",borderRadius:12,boxShadow:"0 1px 8px rgba(0,0,0,0.06)"}}>
                            <IC d="M21 21l-4.35-4.35m0 0A7 7 0 103.65 3.65a7 7 0 0012.99 13z" size={40}/>
                            <h3 style={{color:"#1a1a2e",margin:"1rem 0 0.4rem",fontWeight:700}}>No properties found</h3>
                            <p style={{color:"#aaa",marginBottom:"1.5rem",fontSize:"0.88rem"}}>Try adjusting your filters or searching a different area.</p>
                            <button onClick={handleReset} style={{background:"#e94560",color:"#fff",border:"none",padding:"0.6rem 1.8rem",borderRadius:8,cursor:"pointer",fontWeight:700}}>Clear Filters</button>
                        </div>
                    ) : (
                        <>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:"0.9rem"}}>
                                {properties.map(p=>(
                                    <PropCard key={p._id} p={p}
                                        isMarketplace={isMarketplace}
                                        onClick={()=> isMarketplace ? setShowRegisterModal(true) : navigate("/property/"+p._id)}/>
                                ))}
                            </div>

                            {/* Load more */}
                            {total>0 && (
                                <div style={{marginTop:"2rem",textAlign:"center"}}>
                                    <div style={{maxWidth:360,margin:"0 auto 0.75rem",background:"#e8e8e8",borderRadius:20,height:5,overflow:"hidden"}}>
                                        <div style={{height:"100%",background:"#e94560",borderRadius:20,
                                            width:Math.min(100,Math.round(properties.length/total*100))+"%",transition:"width 0.4s"}}/>
                                    </div>
                                    <p style={{color:"#999",fontSize:"0.83rem",marginBottom:"1rem"}}>
                                        <strong>{properties.length}</strong> of <strong>{total}</strong> properties shown
                                    </p>
                                    {properties.length<total && (
                                        <button onClick={loadMore} disabled={loadingMore} style={{
                                            background:loadingMore?"#ddd":"#1a1a2e",color:"#fff",border:"none",
                                            padding:"0.75rem 2.2rem",borderRadius:9,fontWeight:700,fontSize:"0.9rem",
                                            cursor:loadingMore?"not-allowed":"pointer",
                                            display:"inline-flex",alignItems:"center",gap:"0.55rem",transition:"background 0.2s"}}>
                                            {loadingMore
                                                ? <><span style={{display:"inline-block",width:15,height:15,border:"2px solid #fff",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/> Loading…</>
                                                : <>Load More (+{Math.min(PER_PAGE,total-properties.length)}) ↓</>
                                            }
                                        </button>
                                    )}
                                    {properties.length>=total && total>PER_PAGE && (
                                        <p style={{color:"#27ae60",fontWeight:600,fontSize:"0.85rem"}}>✅ All {total} properties loaded</p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

        <style>{`
                @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
                @keyframes spin    { to{transform:rotate(360deg)} }
                .search-sidebar { display: block; }
                @media (max-width: 768px) {
                    .mobile-filter-toggle { display: block !important; }
                    .search-sidebar { display: none; width: 100% !important; position: static !important; }
                    .search-sidebar.sidebar-open { display: block; }
                }
            `}</style>
            {showRegisterModal && <RegisterPromptModal onClose={()=>setShowRegisterModal(false)}/>}
        </div>
    );
};

export default SearchProperties;

