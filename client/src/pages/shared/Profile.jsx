import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { profileAPI, updateProfileAPI } from "../../api/userAPI";
import { myPropertiesAPI } from "../../api/propertyAPI";
import { paymentHistoryAPI } from "../../api/paymentAPI";
import { myItemsAPI } from "../../api/marketplaceAPI";
import { adminAllUsersAPI, adminAllReportsAPI, adminAllTransactionsAPI, adminMarketplaceItemsAPI, adminMarketplaceUsersAPI } from "../../api/adminAPI";
import { broadcastMessageAPI } from "../../api/messageAPI";

const ROLE_COLOR = { landlord:"#1a1a2e", tenant:"#2980b9", marketplace:"#27ae60", admin:"#e74c3c" };
const ROLE_LABEL = { landlord:"Landlord", tenant:"Tenant", marketplace:"Marketplace User", admin:"Admin" };
const API_BASE   = "";

/* ─── SVG helper ─── */
const SVGIcon = ({ d, size=18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);

const ICONS = {
    home:    "M3 9.5L12 3l9 6.5V21H15v-6H9v6H3z",
    prop:    "M4 6h16M4 10h16M4 14h16M4 18h16",
    plus:    "M12 4v16m-8-8h16",
    invoice: "M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z",
    inbox:   "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    search:  "M21 21l-4.35-4.35m0 0A7 7 0 103.65 3.65a7 7 0 0012.99 13z",
    pay:     "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    check:   "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    key:     "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
    clock:   "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    money:   "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    bag:     "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 3H8L6 7h12l-2-4z",
    users:   "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    report:  "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    card:    "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    edit:    "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    close:   "M6 18L18 6M6 6l12 12",
    email:   "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    phone:   "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
    cal:     "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
};

/* ─── Avatar ─── */
const Avatar = ({ name, size=72 }) => {
    const initials = name ? name.trim().split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?";
    const colors   = ["#e94560","#1a1a2e","#2980b9","#27ae60","#8e44ad","#e67e22"];
    const bg       = colors[(name?.charCodeAt(0)||0) % colors.length];
    return <div style={{width:size,height:size,borderRadius:"50%",background:bg,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*0.3,flexShrink:0}}>{initials}</div>;
};

/* ─── Stat card ─── */
const StatCard = ({ iconKey, label, value, bg, color }) => (
    <div style={{background:"#fff",borderRadius:12,padding:"0.9rem 1rem",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",display:"flex",alignItems:"center",gap:"0.8rem"}}>
        <div style={{width:42,height:42,borderRadius:10,background:bg,color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <SVGIcon d={ICONS[iconKey]} size={20}/>
        </div>
        <div>
            <div style={{fontSize:"1.3rem",fontWeight:800,color,lineHeight:1}}>{value}</div>
            <div style={{fontSize:"0.7rem",color:"#888",fontWeight:600,textTransform:"uppercase",marginTop:2}}>{label}</div>
        </div>
    </div>
);

/* ─── Action card ─── */
const ActionCard = ({ iconKey, label, desc, to }) => (
    <Link to={to} style={{textDecoration:"none",background:"#fff",borderRadius:12,padding:"0.9rem",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",display:"flex",flexDirection:"column",gap:"0.25rem",border:"1px solid transparent",transition:"all 0.15s"}}
        onMouseEnter={e=>{e.currentTarget.style.border="1px solid #e94560";e.currentTarget.style.boxShadow="0 4px 16px rgba(233,69,96,0.12)";}}
        onMouseLeave={e=>{e.currentTarget.style.border="1px solid transparent";e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,0.06)";}}>
        <div style={{width:34,height:34,borderRadius:8,background:"#fff0f2",color:"#e94560",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:2}}>
            <SVGIcon d={ICONS[iconKey]} size={17}/>
        </div>
        <div style={{fontWeight:700,fontSize:"0.85rem",color:"#1a1a2e"}}>{label}</div>
        <div style={{fontSize:"0.74rem",color:"#aaa"}}>{desc}</div>
    </Link>
);

/* ─── Section header ─── */
const SH = ({ title, to }) => (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"1.4rem 0 0.8rem"}}>
        <h3 style={{fontWeight:700,fontSize:"0.95rem",color:"#1a1a2e",margin:0}}>{title}</h3>
        {to && <Link to={to} style={{color:"#e94560",fontSize:"0.8rem",fontWeight:600,textDecoration:"none"}}>View All →</Link>}
    </div>
);

/* ─── Property mini-card ─── */
const PropCard = ({ p, onClick }) => (
    <div onClick={onClick} style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.07)",cursor:"pointer",transition:"transform 0.15s"}}
        onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
        {p.images?.[0] ? <img src={API_BASE+p.images[0]} alt="" style={{width:"100%",height:100,objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
            : <div style={{height:100,background:"#f5f6fa",display:"flex",alignItems:"center",justifyContent:"center",color:"#ccc"}}><SVGIcon d={ICONS.home} size={32}/></div>}
        <div style={{padding:"0.6rem"}}>
            <div style={{fontWeight:700,fontSize:"0.8rem",color:"#1a1a2e"}}>{p.propertyType} · {p.area}</div>
            <div style={{fontSize:"0.7rem",color:"#888",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.address}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"0.4rem"}}>
                <span style={{fontWeight:800,fontSize:"0.85rem",color:"#e94560"}}>৳{p.monthlyRent?.toLocaleString()}/mo</span>
                <span style={{fontSize:"0.62rem",fontWeight:700,padding:"0.12rem 0.5rem",borderRadius:20,background:p.availability==="Available"?"#f0faf4":"#fff7f0",color:p.availability==="Available"?"#27ae60":"#e67e22"}}>{p.availability}</span>
            </div>
        </div>
    </div>
);

/* ─── Marketplace mini-card ─── */
const ItemCard = ({ item, onClick }) => (
    <div onClick={onClick} style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.07)",cursor:"pointer",transition:"transform 0.15s"}}
        onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
        {item.images?.[0] ? <img src={API_BASE+item.images[0]} alt="" style={{width:"100%",height:100,objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
            : <div style={{height:100,background:"#f5f6fa",display:"flex",alignItems:"center",justifyContent:"center",color:"#ccc"}}><SVGIcon d={ICONS.bag} size={32}/></div>}
        <div style={{padding:"0.6rem"}}>
            <div style={{fontWeight:700,fontSize:"0.8rem",color:"#1a1a2e"}}>{item.title}</div>
            <div style={{fontSize:"0.7rem",color:"#888",marginTop:2}}>{item.condition} · {item.category}</div>
            <div style={{fontWeight:800,fontSize:"0.85rem",color:"#e94560",marginTop:"0.4rem"}}>৳{item.price?.toLocaleString()}</div>
        </div>
    </div>
);

/* ══ LANDLORD SECTION ══ */
const LandlordSection = () => {
    const [properties, setProperties] = useState([]);
    const [payments,   setPayments]   = useState([]);
    const navigate = useNavigate();
    useEffect(() => {
        myPropertiesAPI().then(r => setProperties(r.data.data || []));
        paymentHistoryAPI().then(r => setPayments(r.data.data || []));
    }, []);
    const paid = payments.filter(p=>p.status==="Paid");
    const pending = payments.filter(p=>p.status==="Pending");
    return (
        <div>
            {pending.length>0 && <div style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:"0.75rem 1rem",marginBottom:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:"#856404",fontWeight:600,fontSize:"0.85rem"}}>{pending.length} pending invoice{pending.length>1?"s":""}!</span>
                <Link to="/landlord/invoices" style={{background:"#e94560",color:"#fff",padding:"0.3rem 0.8rem",borderRadius:6,fontSize:"0.76rem",textDecoration:"none",fontWeight:700}}>View</Link>
            </div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"0.75rem"}}>
                {[
                    {iconKey:"home",    label:"Properties",    value:properties.length,                                                   bg:"#fff0f2",color:"#e94560"},
                    {iconKey:"check",   label:"Available",     value:properties.filter(p=>p.availability==="Available").length,            bg:"#f0faf4",color:"#27ae60"},
                    {iconKey:"key",     label:"Rented",        value:properties.filter(p=>p.availability==="Rented").length,              bg:"#fff7f0",color:"#f39c12"},
                    {iconKey:"invoice", label:"Paid Invoices", value:paid.length,                                                          bg:"#f0f2ff",color:"#2980b9"},
                    {iconKey:"clock",   label:"Pending",       value:pending.length,                                                       bg:"#fff3cd",color:"#856404"},
                    {iconKey:"money",   label:"Revenue",       value:"৳"+paid.reduce((s,p)=>s+(p.amount||0),0).toLocaleString(),          bg:"#f0faf4",color:"#1a6e3c"},
                ].map(s=><StatCard key={s.label} {...s}/>)}
            </div>
            <SH title="Quick Actions"/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"0.75rem"}}>
                {[
                    {iconKey:"plus",    label:"Add Property",  desc:"List a new rental",         to:"/landlord/add-property"},
                    {iconKey:"prop",    label:"My Properties", desc:"Manage your listings",       to:"/landlord/properties"},
                    {iconKey:"invoice", label:"Invoices",      desc:"Generate & manage invoices", to:"/landlord/invoices"},
                    {iconKey:"inbox",   label:"Inbox",         desc:"Chat with tenants",          to:"/landlord/inbox"},
                ].map(a=><ActionCard key={a.label} {...a}/>)}
            </div>
            <SH title="Recent Properties" to="/landlord/properties"/>
            {properties.length===0
                ? <div style={{background:"#fff",borderRadius:10,padding:"1.5rem",textAlign:"center",color:"#aaa",fontSize:"0.85rem"}}>No properties. <Link to="/landlord/add-property" style={{color:"#e94560"}}>Add one</Link></div>
                : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"0.75rem"}}>
                    {properties.slice(0,4).map(p=><PropCard key={p._id} p={p} onClick={()=>navigate("/landlord/properties")}/>)}
                  </div>}
        </div>
    );
};

/* ══ TENANT SECTION ══ */
const TenantSection = () => {
    const [payments, setPayments] = useState([]);
    useEffect(() => {
        paymentHistoryAPI().then(r=>setPayments(r.data.data||[]));
    }, []);
    const paid    = payments.filter(p=>p.status==="Paid");
    const pending = payments.filter(p=>p.status==="Pending");
    const overdue = payments.filter(p=>p.status==="Overdue");
    return (
        <div>
            {(pending.length>0||overdue.length>0) && (
                <div style={{background:"#fffbf0",border:"1px solid #fce09b",borderRadius:2,padding:"0.75rem 1rem",marginBottom:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{color:"#8a6914",fontWeight:600,fontSize:"0.85rem"}}>
                        {overdue.length>0?`${overdue.length} overdue invoice${overdue.length>1?"s":""}!`:`${pending.length} unpaid invoice${pending.length>1?"s":""}.`}
                    </span>
                    <Link to="/tenant/payments" style={{background:"#111",color:"#fff",padding:"0.3rem 0.8rem",fontSize:"0.74rem",textDecoration:"none",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em"}}>Pay Now</Link>
                </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"1px",background:"#e8e4dc",border:"1px solid #e8e4dc",marginBottom:"1.2rem"}}>
                {[
                    {iconKey:"clock", label:"Pending Bills", value:pending.length,                                                  bg:"#fffbf0",color:"#8a6914"},
                    {iconKey:"close", label:"Overdue",       value:overdue.length,                                                  bg:"#fdf0f0",color:"#c0392b"},
                    {iconKey:"check", label:"Paid Invoices", value:paid.length,                                                     bg:"#f0f8f0",color:"#2e7d32"},
                    {iconKey:"money", label:"Total Paid",    value:"৳"+paid.reduce((s,p)=>s+(p.amount||0),0).toLocaleString(),     bg:"#f5f2ff",color:"#7b5ea7"},
                ].map(s=><StatCard key={s.label} {...s}/>)}
            </div>
            <SH title="Quick Actions"/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"0.75rem"}}>
                {[
                    {iconKey:"search", label:"Search",    desc:"Find your next home",    to:"/tenant/search"},
                    {iconKey:"pay",    label:"Payments",  desc:"View & pay invoices",    to:"/tenant/payments"},
                    {iconKey:"inbox",  label:"Inbox",     desc:"Chat with landlords",    to:"/tenant/inbox"},
                    {iconKey:"home",   label:"Browse",    desc:"All property listings",  to:"/"},
                ].map(a=><ActionCard key={a.label} {...a}/>)}
            </div>
        </div>
    );
};

/* ══ MARKETPLACE SECTION ══ */
const MarketplaceSection = () => {
    const [myItems, setMyItems] = useState([]);
    const navigate = useNavigate();
    useEffect(() => {
        myItemsAPI().then(r => setMyItems(r.data.data || []));
    }, []);
    const activeItems = myItems.filter(i => !i.isSold && !i.isRemoved);
    const soldItems   = myItems.filter(i => i.isSold);
    const recentItems = activeItems.slice(0, 4);
    return (
        <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"0.75rem"}}>
                {[
                    {iconKey:"bag",   label:"My Listings", value:myItems.length,    bg:"#fff0f2",color:"#e94560"},
                    {iconKey:"check", label:"Active",      value:activeItems.length, bg:"#f0faf4",color:"#27ae60"},
                    {iconKey:"card",  label:"Sold",        value:soldItems.length,   bg:"#f0f2ff",color:"#2980b9"},
                    {iconKey:"money", label:"Sold Revenue",value:"৳"+soldItems.reduce((s,i)=>s+(i.price||0),0).toLocaleString(), bg:"#fff7f0",color:"#f39c12"},
                ].map(s=><StatCard key={s.label} {...s}/>)}
            </div>
            <SH title="Quick Actions"/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"0.75rem"}}>
                {[
                    {iconKey:"plus", label:"Sell an Item", desc:"List furniture or goods",   to:"/marketplace/add-item"},
                    {iconKey:"prop", label:"My Listings",  desc:"Edit or remove your items", to:"/marketplace/my-items"},
                    {iconKey:"bag",  label:"Browse All",   desc:"Find items to buy",          to:"/marketplace/items"},
                    {iconKey:"inbox",label:"Inbox",        desc:"Chat with buyers/sellers",   to:"/marketplace/inbox"},
                ].map(a=><ActionCard key={a.label} {...a}/>)}
            </div>
            <SH title="Latest Active Listings" to="/marketplace/items"/>
            {recentItems.length===0
                ? <div style={{background:"#fff",borderRadius:10,padding:"1.5rem",textAlign:"center",color:"#aaa",fontSize:"0.85rem"}}>No active items. <Link to="/marketplace/add-item" style={{color:"#e94560"}}>List the first item</Link></div>
                : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"0.75rem"}}>
                    {recentItems.map(item=><ItemCard key={item._id} item={item} onClick={()=>navigate("/marketplace/item/"+item._id)}/>)}
                  </div>}
        </div>
    );
};

/* ══ ADMIN SECTION ══ */
const AdminSection = () => {
    const [activePanel,  setActivePanel]  = useState("rental"); // "rental" | "marketplace"
    // ── Rental data ──
    const [users,        setUsers]        = useState([]);
    const [reports,      setReports]      = useState([]);
    const [transactions, setTransactions] = useState([]);
    // ── Marketplace data ──
    const [mktUsers,     setMktUsers]     = useState([]);
    const [mktReports,   setMktReports]   = useState([]);
    const [mktItems,     setMktItems]     = useState([]);
    // ── Broadcast ──
    const [bcMsg,        setBcMsg]        = useState("");
    const [bcRole,       setBcRole]       = useState("");
    const [bcStatus,     setBcStatus]     = useState("");
    const [bcLoading,    setBcLoading]    = useState(false);

    useEffect(() => {
        adminAllUsersAPI().then(r=>setUsers(r.data.data||[]));
        adminAllReportsAPI().then(r=>setReports(r.data.data||[]));
        adminAllTransactionsAPI().then(r=>setTransactions(r.data.data||[]));
        adminMarketplaceUsersAPI().then(r=>setMktUsers(r.data.data||[]));
        adminAllReportsAPI({ status:"" }).then(r=>setMktReports(r.data.data||[]));
        adminMarketplaceItemsAPI().then(r=>setMktItems(r.data.data||[]));
    }, []);

    // ── Rental stats ──
    const facet          = users[0] || {};
    const totalUsers     = facet.totalCount?.[0]?.count    || 0;
    const totalTxn       = transactions[0]?.totalCount?.[0]?.count || 0;
    const userList       = facet.users || [];
    const rentalReports  = reports[0]?.reports || [];
    const pendingRental  = rentalReports.filter(r=>r.status==="Pending").length;
    const revenue        = (transactions[0]?.transactions||[]).filter(t=>t.status==="Paid").reduce((s,t)=>s+(t.amount||0),0);
    const recentUsers    = userList.slice(0,5);
    const recentTxn      = (transactions[0]?.transactions||[]).slice(0,5);

    // ── Marketplace stats ──
    const mktFacet       = mktUsers[0] || {};
    const totalMktUsers  = mktFacet.totalCount?.[0]?.count || 0;
    const mktItemFacet   = mktItems[0] || {};
    const totalMktItems  = mktItemFacet.totalCount?.[0]?.count  || 0;
    const activeMktItems = mktItemFacet.activeCount?.[0]?.count || 0;
    const soldMktItems   = mktItemFacet.soldCount?.[0]?.count   || 0;
    const allMktReports  = mktReports[0]?.reports || [];
    const pendingMkt     = allMktReports.filter(r=>r.status==="Pending"&&r.reportType==="marketplace").length;
    const recentMktUsers = (mktFacet.users||[]).slice(0,5);
    const recentMktItems = (mktItemFacet.items||[]).slice(0,4);

    const handleBroadcast = async (e) => {
        e.preventDefault();
        if (!bcMsg.trim()) return;
        setBcLoading(true); setBcStatus("");
        try {
            const res = await broadcastMessageAPI({ message: bcMsg.trim(), targetRole: bcRole||undefined });
            setBcStatus(`✅ Sent to ${res.data.count} user(s) successfully.`);
            setBcMsg(""); setBcRole("");
        } catch(err) {
            setBcStatus("❌ " + (err.response?.data?.message || "Failed to send."));
        } finally { setBcLoading(false); }
    };

    /* ── Tab button ── */
    const Tab = ({ id, icon, label, alert }) => (
        <button onClick={()=>setActivePanel(id)}
            style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.65rem 1.3rem",border:"none",borderBottom:`3px solid ${activePanel===id?"#e94560":"transparent"}`,background:"transparent",color:activePanel===id?"#e94560":"#888",fontWeight:700,fontSize:"0.84rem",cursor:"pointer",transition:"all 0.15s",position:"relative"}}>
            <SVGIcon d={ICONS[icon]} size={15}/>
            {label}
            {alert>0 && <span style={{position:"absolute",top:4,right:4,background:"#e94560",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:"0.6rem",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>{alert}</span>}
        </button>
    );

    return (
        <div>
            {/* ── Panel tabs ── */}
            <div style={{display:"flex",borderBottom:"2px solid #f0f0f0",marginBottom:"1.4rem",gap:"0.25rem"}}>
                <Tab id="rental"      icon="home"   label="🏠 Rental Service"  alert={pendingRental}/>
                <Tab id="marketplace" icon="bag"    label="🛒 Marketplace"     alert={pendingMkt}/>
                <Tab id="broadcast"   icon="inbox"  label="📢 Broadcast"       alert={0}/>
            </div>

            {/* ══════════════════════════════════
                RENTAL PANEL
            ══════════════════════════════════ */}
            {activePanel === "rental" && (
                <div>
                    {pendingRental>0 && (
                        <div style={{background:"#fdecea",border:"1px solid #e74c3c",borderRadius:10,padding:"0.75rem 1rem",marginBottom:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{color:"#c0392b",fontWeight:600,fontSize:"0.85rem"}}>{pendingRental} rental report{pendingRental>1?"s":""} need review!</span>
                            <Link to="/admin/reports" style={{background:"#e74c3c",color:"#fff",padding:"0.3rem 0.8rem",borderRadius:6,fontSize:"0.76rem",textDecoration:"none",fontWeight:700}}>Review</Link>
                        </div>
                    )}

                    {/* Rental stats */}
                    <div style={{fontSize:"0.7rem",fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"0.5rem"}}>Rental Platform Stats</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"0.75rem",marginBottom:"1.2rem"}}>
                        {[
                            {iconKey:"users", label:"Total Users",    value:totalUsers,                             bg:"#fff0f2",color:"#e94560"},
                            {iconKey:"home",  label:"Landlords",      value:facet.landlordCount?.[0]?.count||0,     bg:"#f0f2ff",color:"#2980b9"},
                            {iconKey:"key",   label:"Tenants",        value:facet.tenantCount?.[0]?.count||0,       bg:"#f0faf4",color:"#27ae60"},
                            {iconKey:"close", label:"Blocked Users",  value:facet.blockedCount?.[0]?.count||0,      bg:"#fdecea",color:"#e74c3c"},
                            {iconKey:"report",label:"Pending Reports",value:pendingRental,                          bg:"#fff3cd",color:"#856404"},
                            {iconKey:"card",  label:"Transactions",   value:totalTxn,                              bg:"#f5f0ff",color:"#8e44ad"},
                            {iconKey:"money", label:"Rental Revenue", value:"৳"+revenue.toLocaleString(),          bg:"#f0faf4",color:"#1a6e3c"},
                        ].map(s=><StatCard key={s.label} {...s}/>)}
                    </div>

                    {/* Rental actions */}
                    <SH title="Rental Panel Actions"/>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"0.75rem",marginBottom:"1.4rem"}}>
                        {[
                            {iconKey:"users", label:"Manage Users",    desc:"View, block or remove",     to:"/admin/users"},
                            {iconKey:"report",label:"Reports",         desc:"Review flagged properties",  to:"/admin/reports"},
                            {iconKey:"card",  label:"Transactions",    desc:"All rental payments",        to:"/admin/transactions"},
                            {iconKey:"inbox", label:"Inbox",           desc:"All messages",               to:"/admin/inbox"},
                            {iconKey:"home",  label:"Browse Rentals",  desc:"All property listings",      to:"/"},
                        ].map(a=><ActionCard key={a.label} {...a}/>)}
                    </div>

                    {/* Recent Users + Recent Transactions */}
                    <div className="admin-two-col">
                        <div>
                            <SH title="Recent Rental Users" to="/admin/users"/>
                            <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                                {recentUsers.length===0
                                    ? <p style={{padding:"1rem",color:"#aaa",fontSize:"0.83rem"}}>No users yet</p>
                                    : recentUsers.map(u=>(
                                        <div key={u._id} style={{display:"flex",alignItems:"center",gap:"0.7rem",padding:"0.6rem 0.9rem",borderBottom:"1px solid #f5f5f5"}}>
                                            <div style={{width:30,height:30,borderRadius:"50%",background:"#e94560",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"0.75rem",flexShrink:0}}>{u.name?.[0]?.toUpperCase()}</div>
                                            <div style={{flex:1,minWidth:0}}>
                                                <div style={{fontWeight:600,fontSize:"0.8rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</div>
                                                <div style={{fontSize:"0.7rem",color:"#aaa",textTransform:"capitalize"}}>{u.role}</div>
                                            </div>
                                            {u.isBlocked && <span style={{background:"#fdecea",color:"#e74c3c",fontSize:"0.63rem",fontWeight:700,padding:"0.12rem 0.45rem",borderRadius:20}}>Blocked</span>}
                                        </div>
                                    ))}
                            </div>
                        </div>
                        <div>
                            <SH title="Recent Transactions" to="/admin/transactions"/>
                            <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                                {recentTxn.length===0
                                    ? <p style={{padding:"1rem",color:"#aaa",fontSize:"0.83rem"}}>No transactions yet</p>
                                    : recentTxn.map(t=>(
                                        <div key={t._id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.6rem 0.9rem",borderBottom:"1px solid #f5f5f5"}}>
                                            <div>
                                                <div style={{fontWeight:600,fontSize:"0.78rem"}}>{t.invoiceNo}</div>
                                                <div style={{fontSize:"0.7rem",color:"#aaa"}}>{t.forMonth}</div>
                                            </div>
                                            <div style={{textAlign:"right"}}>
                                                <div style={{fontWeight:700,color:"#e94560",fontSize:"0.8rem"}}>৳{t.amount?.toLocaleString()}</div>
                                                <span style={{fontSize:"0.62rem",fontWeight:700,padding:"0.12rem 0.45rem",borderRadius:20,background:t.status==="Paid"?"#f0faf4":"#fff3cd",color:t.status==="Paid"?"#27ae60":"#856404"}}>{t.status}</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════
                MARKETPLACE PANEL
            ══════════════════════════════════ */}
            {activePanel === "marketplace" && (
                <div>
                    {pendingMkt>0 && (
                        <div style={{background:"#fff7f0",border:"1px solid #f39c12",borderRadius:10,padding:"0.75rem 1rem",marginBottom:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{color:"#8a4f00",fontWeight:600,fontSize:"0.85rem"}}>{pendingMkt} marketplace report{pendingMkt>1?"s":""} need review!</span>
                            <Link to="/admin/reports" style={{background:"#f39c12",color:"#fff",padding:"0.3rem 0.8rem",borderRadius:6,fontSize:"0.76rem",textDecoration:"none",fontWeight:700}}>Review</Link>
                        </div>
                    )}

                    {/* Marketplace stats */}
                    <div style={{fontSize:"0.7rem",fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"0.5rem"}}>Marketplace Platform Stats</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"0.75rem",marginBottom:"1.2rem"}}>
                        {[
                            {iconKey:"users", label:"Mkt Sellers",    value:totalMktUsers,    bg:"#fff0f2",color:"#e94560"},
                            {iconKey:"bag",   label:"Total Items",    value:totalMktItems,    bg:"#fff7f0",color:"#f39c12"},
                            {iconKey:"check", label:"Active Items",   value:activeMktItems,   bg:"#f0faf4",color:"#27ae60"},
                            {iconKey:"card",  label:"Sold Items",     value:soldMktItems,     bg:"#f0f2ff",color:"#2980b9"},
                            {iconKey:"report",label:"Mkt Reports",    value:pendingMkt,       bg:"#fff3cd",color:"#856404"},
                            {iconKey:"close", label:"Removed",        value:mktItemFacet.removedCount?.[0]?.count||0, bg:"#fdecea",color:"#e74c3c"},
                        ].map(s=><StatCard key={s.label} {...s}/>)}
                    </div>

                    {/* Marketplace actions */}
                    <SH title="Marketplace Panel Actions"/>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"0.75rem",marginBottom:"1.4rem"}}>
                        {[
                            {iconKey:"report",label:"Mkt Reports",    desc:"Review flagged items/users",   to:"/admin/reports"},
                            {iconKey:"inbox", label:"Inbox",          desc:"Messages to sellers/buyers",   to:"/admin/inbox"},
                            {iconKey:"bag",   label:"Browse Market",  desc:"All marketplace listings",     to:"/marketplace/items"},
                        ].map(a=><ActionCard key={a.label} {...a}/>)}
                    </div>

                    {/* Recent Marketplace Users + Recent Items side by side */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                        <div>
                            <SH title="Recent Marketplace Sellers"/>
                            <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                                {recentMktUsers.length===0
                                    ? <p style={{padding:"1rem",color:"#aaa",fontSize:"0.83rem"}}>No marketplace users yet</p>
                                    : recentMktUsers.map(u=>(
                                        <div key={u._id} style={{display:"flex",alignItems:"center",gap:"0.7rem",padding:"0.6rem 0.9rem",borderBottom:"1px solid #f5f5f5"}}>
                                            <div style={{width:30,height:30,borderRadius:"50%",background:"#27ae60",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"0.75rem",flexShrink:0}}>{u.name?.[0]?.toUpperCase()}</div>
                                            <div style={{flex:1,minWidth:0}}>
                                                <div style={{fontWeight:600,fontSize:"0.8rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</div>
                                                <div style={{fontSize:"0.7rem",color:"#aaa"}}>{u.email}</div>
                                            </div>
                                            {u.isBlocked && <span style={{background:"#fdecea",color:"#e74c3c",fontSize:"0.63rem",fontWeight:700,padding:"0.12rem 0.45rem",borderRadius:20}}>Blocked</span>}
                                        </div>
                                    ))}
                            </div>
                        </div>
                        <div>
                            <SH title="Recent Marketplace Items" to="/marketplace/items"/>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem"}}>
                                {recentMktItems.length===0
                                    ? <p style={{color:"#aaa",fontSize:"0.83rem",gridColumn:"span 2"}}>No items yet</p>
                                    : recentMktItems.map(item=>(
                                        <div key={item._id} style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                                            {item.images?.[0]
                                                ? <img src={item.images[0]} alt="" style={{width:"100%",height:65,objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
                                                : <div style={{height:65,background:"#f5f6fa",display:"flex",alignItems:"center",justifyContent:"center",color:"#ccc"}}><SVGIcon d={ICONS.bag} size={22}/></div>}
                                            <div style={{padding:"0.45rem 0.6rem"}}>
                                                <div style={{fontWeight:700,fontSize:"0.75rem",color:"#1a1a2e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</div>
                                                <div style={{fontWeight:800,fontSize:"0.78rem",color:"#e94560"}}>৳{item.price?.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════
                BROADCAST PANEL
            ══════════════════════════════════ */}
            {activePanel === "broadcast" && (
                <div>
                    <div style={{background:"#fff",borderRadius:14,boxShadow:"0 2px 10px rgba(0,0,0,0.07)",padding:"1.4rem",border:"1px solid #f0f0f0",maxWidth:560}}>
                        <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1.1rem",paddingBottom:"0.8rem",borderBottom:"1px solid #f5f5f5"}}>
                            <div style={{width:38,height:38,borderRadius:10,background:"#fff0f2",color:"#e94560",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <SVGIcon d={ICONS.inbox} size={18}/>
                            </div>
                            <div>
                                <div style={{fontWeight:800,fontSize:"0.95rem",color:"#1a1a2e"}}>Broadcast Message</div>
                                <div style={{fontSize:"0.73rem",color:"#aaa"}}>Send a message to all users or a specific role group</div>
                            </div>
                        </div>
                        <form onSubmit={handleBroadcast} style={{display:"flex",flexDirection:"column",gap:"0.9rem"}}>
                            <div>
                                <label style={{display:"block",fontSize:"0.7rem",fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"0.3rem"}}>Target Audience</label>
                                <select value={bcRole} onChange={e=>setBcRole(e.target.value)}
                                    style={{width:"100%",padding:"0.55rem 0.85rem",border:"1px solid #e8e8e8",borderRadius:9,fontSize:"0.86rem",background:"#fafafa",outline:"none",boxSizing:"border-box"}}>
                                    <option value="">Everyone (all users)</option>
                                    <option value="tenant">Tenants only</option>
                                    <option value="landlord">Landlords only</option>
                                    <option value="marketplace">Marketplace sellers only</option>
                                </select>
                            </div>
                            <div>
                                <label style={{display:"block",fontSize:"0.7rem",fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"0.3rem"}}>Message <span style={{color:"#aaa",textTransform:"none",fontWeight:400}}>(max 500 chars)</span></label>
                                <textarea value={bcMsg} onChange={e=>setBcMsg(e.target.value)} maxLength={500}
                                    placeholder="Type your announcement here…"
                                    style={{width:"100%",padding:"0.65rem 0.9rem",border:"1px solid #e8e8e8",borderRadius:9,fontSize:"0.86rem",background:"#fafafa",outline:"none",resize:"vertical",minHeight:100,boxSizing:"border-box"}}/>
                                <div style={{textAlign:"right",fontSize:"0.7rem",color:"#aaa",marginTop:2}}>{bcMsg.length}/500</div>
                            </div>
                            {bcStatus && (
                                <div style={{background:bcStatus.startsWith("✅")?"#f0faf4":"#fdecea",border:`1px solid ${bcStatus.startsWith("✅")?"#a9dfcd":"#f5c6c6"}`,color:bcStatus.startsWith("✅")?"#1a6e3c":"#c0392b",borderRadius:8,padding:"0.55rem 0.85rem",fontSize:"0.83rem",fontWeight:600}}>{bcStatus}</div>
                            )}
                            <div style={{display:"flex",justifyContent:"flex-end"}}>
                                <button type="submit" disabled={bcLoading||!bcMsg.trim()}
                                    style={{background:bcLoading||!bcMsg.trim()?"#ccc":"#e94560",color:"#fff",border:"none",padding:"0.6rem 1.8rem",borderRadius:9,fontWeight:700,fontSize:"0.86rem",cursor:bcLoading||!bcMsg.trim()?"not-allowed":"pointer",boxShadow:bcLoading||!bcMsg.trim()?"none":"0 3px 12px rgba(233,69,96,0.28)"}}>
                                    {bcLoading?"Sending…":"📢 Send Broadcast"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};


/* ══ QUICK NAV per role ══ */
const ROLE_NAV = {
    landlord:    [{label:"My Properties",to:"/landlord/properties",iconKey:"prop"},{label:"Add Property",to:"/landlord/add-property",iconKey:"plus"},{label:"Invoices",to:"/landlord/invoices",iconKey:"invoice"}],
    tenant:      [{label:"Search",to:"/tenant/search",iconKey:"search"},{label:"Payments",to:"/tenant/payments",iconKey:"pay"}],
    marketplace: [{label:"Browse Items",to:"/marketplace/items",iconKey:"bag"},{label:"Sell Item",to:"/marketplace/add-item",iconKey:"plus"},{label:"My Items",to:"/marketplace/my-items",iconKey:"prop"}],
    admin:       [{label:"Users",to:"/admin/users",iconKey:"users"},{label:"Reports",to:"/admin/reports",iconKey:"report"},{label:"Transactions",to:"/admin/transactions",iconKey:"card"},{label:"Inbox",to:"/admin/inbox",iconKey:"inbox"},{label:"Browse Market",to:"/marketplace/items",iconKey:"bag"},{label:"Browse Rentals",to:"/",iconKey:"home"}],
};

/* ══ MAIN PROFILE COMPONENT ══ */
const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [form,    setForm]    = useState({ name:"", phone:"", bio:"" });
    const [msg,     setMsg]     = useState("");
    const [msgType, setMsgType] = useState("success");
    const [editing, setEditing] = useState(false);

    const load = () => profileAPI().then(res => {
        const d = res.data.data[0];
        setProfile(d);
        setForm({ name:d.name||"", phone:d.phone||"", bio:d.bio||"" });
    });

    useEffect(() => { load(); }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name==="phone") setForm(f=>({...f,phone:value.replace(/[^0-9]/g,"").slice(0,11)}));
        else                setForm(f=>({...f,[name]:value}));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.phone && form.phone.length!==11) { setMsg("Phone must be 11 digits."); setMsgType("error"); return; }
        try {
            await updateProfileAPI(form);
            setMsg("Profile updated!"); setMsgType("success"); setEditing(false); load();
        } catch (err) { setMsg(err.response?.data?.message||"Update failed"); setMsgType("error"); }
    };

    if (!profile) return (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",flexDirection:"column",gap:"1rem",color:"#aaa"}}>
            <SVGIcon d={ICONS.users} size={40}/><p>Loading profile...</p>
        </div>
    );

    const joined   = new Date(profile.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});
    const navLinks = ROLE_NAV[profile.role] || [];
    const roleBg   = ROLE_COLOR[profile.role] || "#888";
    const DashSection = { landlord:LandlordSection, tenant:TenantSection, marketplace:MarketplaceSection, admin:AdminSection }[profile.role];

    return (
        <div style={{background:"#f5f6fa",minHeight:"100vh",paddingBottom:"3rem"}}>
            <style>{`
                .profile-main-grid{display:grid;grid-template-columns:240px 1fr;gap:1.4rem;align-items:flex-start}
                .admin-two-col{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
                @media(max-width:768px){
                    .profile-main-grid{grid-template-columns:1fr!important}
                    .admin-two-col{grid-template-columns:1fr!important}
                    .profile-header{padding:1.5rem 1rem 4rem!important}
                    .profile-main-wrap{padding:0 0.75rem!important}
                }
            `}</style>

            {/* Header */}
            <div className="profile-header" style={{background:"linear-gradient(135deg,#1a1a2e 60%,#e94560)",padding:"2rem 2rem 5rem",color:"#fff"}}>
                <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",gap:"1.2rem",flexWrap:"wrap"}}>
                    <Avatar name={profile.name} size={60}/>
                    <div>
                        <h1 style={{fontSize:"1.5rem",fontWeight:800,margin:0}}>{profile.name}</h1>
                        <span style={{display:"inline-block",marginTop:"0.3rem",background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:"0.7rem",padding:"0.2rem 0.7rem",borderRadius:20,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>
                            {ROLE_LABEL[profile.role]||profile.role}
                        </span>
                        <div style={{fontSize:"0.8rem",opacity:0.65,marginTop:"0.25rem"}}>{profile.email}</div>
                    </div>
                </div>
            </div>

            {/* Main grid */}
            <div className="profile-main-wrap profile-main-grid" style={{maxWidth:1100,margin:"-3rem auto 0",padding:"0 1.5rem"}}>

                {/* LEFT column */}
                <div>
                    {/* Profile info */}
                    <div style={{background:"#fff",borderRadius:16,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",overflow:"hidden",marginBottom:"1rem"}}>
                        <div style={{height:5,background:`linear-gradient(90deg,${roleBg},#e94560)`}}/>
                        <div style={{padding:"1.2rem"}}>
                            {[
                                {iconKey:"email",label:"Email",  value:profile.email},
                                {iconKey:"phone",label:"Phone",  value:profile.phone||"Not set"},
                                {iconKey:"cal",  label:"Joined", value:joined},
                            ].map(row=>(
                                <div key={row.label} style={{display:"flex",alignItems:"center",gap:"0.65rem",padding:"0.45rem 0",borderBottom:"1px solid #fafafa"}}>
                                    <div style={{width:28,height:28,borderRadius:7,background:"#f5f6fa",display:"flex",alignItems:"center",justifyContent:"center",color:"#e94560",flexShrink:0}}>
                                        <SVGIcon d={ICONS[row.iconKey]} size={14}/>
                                    </div>
                                    <div>
                                        <div style={{fontSize:"0.66rem",color:"#aaa",fontWeight:600,textTransform:"uppercase"}}>{row.label}</div>
                                        <div style={{fontSize:"0.82rem",color:"#333",fontWeight:500}}>{row.value}</div>
                                    </div>
                                </div>
                            ))}
                            {profile.bio && <div style={{marginTop:"0.75rem",padding:"0.65rem",background:"#f9f9f9",borderRadius:8,fontSize:"0.8rem",color:"#555",lineHeight:1.5}}>{profile.bio}</div>}
                            <button onClick={()=>setEditing(e=>!e)} style={{marginTop:"0.9rem",width:"100%",background:editing?"#f5f5f5":"#1a1a2e",color:editing?"#888":"#fff",border:"none",padding:"0.5rem",borderRadius:9,cursor:"pointer",fontWeight:600,fontSize:"0.83rem",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.4rem"}}>
                                <SVGIcon d={editing?ICONS.close:ICONS.edit} size={14}/>{editing?"Cancel":"Edit Profile"}
                            </button>
                        </div>
                    </div>

                    {/* Quick nav */}
                    <div style={{background:"#fff",borderRadius:16,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",overflow:"hidden",marginBottom:"1rem"}}>
                        <div style={{background:"linear-gradient(135deg,#1a1a2e,#2c3e50)",padding:"0.85rem 1rem"}}>
                            <h3 style={{color:"#fff",fontWeight:700,fontSize:"0.78rem",margin:0,textTransform:"uppercase",letterSpacing:"0.06em"}}>Quick Navigation</h3>
                        </div>
                        <div style={{padding:"0.25rem 0"}}>
                            {navLinks.map((link,i)=>(
                                <Link key={i} to={link.to} style={{display:"flex",alignItems:"center",gap:"0.65rem",padding:"0.6rem 0.9rem",textDecoration:"none",color:"#333",borderBottom:i<navLinks.length-1?"1px solid #fafafa":"none",transition:"background 0.15s",fontSize:"0.83rem",fontWeight:500}}
                                    onMouseEnter={e=>{e.currentTarget.style.background="#fff0f2";e.currentTarget.style.color="#e94560";}}
                                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#333";}}>
                                    <div style={{width:26,height:26,borderRadius:6,background:"#f5f6fa",display:"flex",alignItems:"center",justifyContent:"center",color:"#e94560",flexShrink:0}}>
                                        <SVGIcon d={ICONS[link.iconKey]} size={13}/>
                                    </div>
                                    {link.label}
                                    <svg style={{marginLeft:"auto",opacity:0.3}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Member ID */}
                    <div style={{background:"#fff",borderRadius:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",padding:"0.9rem"}}>
                        <div style={{fontSize:"0.65rem",color:"#aaa",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"0.45rem"}}>Member ID</div>
                        <code style={{fontSize:"0.68rem",color:"#555",background:"#f5f6fa",padding:"0.3rem 0.6rem",borderRadius:6,display:"block",wordBreak:"break-all"}}>{profile._id}</code>
                    </div>
                </div>

                {/* RIGHT column */}
                <div>
                    {/* Edit form */}
                    {editing && (
                        <div style={{background:"#fff",borderRadius:16,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",padding:"1.4rem",marginBottom:"1.2rem"}}>
                            <h3 style={{fontWeight:700,color:"#1a1a2e",fontSize:"0.97rem",marginBottom:"1.1rem",paddingBottom:"0.65rem",borderBottom:"1px solid #f5f5f5"}}>Edit Profile</h3>
                            {msg && <div style={{background:msgType==="error"?"#fdecea":"#f0faf4",border:`1px solid ${msgType==="error"?"#e74c3c":"#27ae60"}`,color:msgType==="error"?"#c0392b":"#1a6e3c",borderRadius:8,padding:"0.6rem 0.9rem",marginBottom:"1rem",fontSize:"0.83rem",fontWeight:600}}>{msg}</div>}
                            <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:"0.9rem"}}>
                                {[{name:"name",label:"Full Name",type:"text",placeholder:"Your full name"},{name:"phone",label:"Phone (11 digits)",type:"tel",placeholder:"01XXXXXXXXX",maxLength:11}].map(f=>(
                                    <div key={f.name}>
                                        <label style={{display:"block",fontWeight:600,fontSize:"0.75rem",color:"#555",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:"0.3rem"}}>{f.label}</label>
                                        <input name={f.name} type={f.type} placeholder={f.placeholder} value={form[f.name]} onChange={handleChange} maxLength={f.maxLength}
                                            onKeyDown={f.name==="phone"?e=>{const ok=["Backspace","Delete","Tab","ArrowLeft","ArrowRight","Home","End"];if(!ok.includes(e.key)&&!/^[0-9]$/.test(e.key))e.preventDefault();}:undefined}
                                            style={{padding:"0.6rem 0.85rem",border:"1px solid #e8e8e8",borderRadius:9,fontSize:"0.88rem",background:"#fafafa",width:"100%",boxSizing:"border-box",outline:"none"}}/>
                                    </div>
                                ))}
                                <div>
                                    <label style={{display:"block",fontWeight:600,fontSize:"0.75rem",color:"#555",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:"0.3rem"}}>Bio <span style={{color:"#aaa",textTransform:"none",fontWeight:400}}>(max 200)</span></label>
                                    <textarea name="bio" placeholder="Short bio..." value={form.bio} onChange={handleChange} maxLength={200} style={{padding:"0.6rem 0.85rem",border:"1px solid #e8e8e8",borderRadius:9,fontSize:"0.85rem",background:"#fafafa",width:"100%",boxSizing:"border-box",outline:"none",resize:"vertical",minHeight:75}}/>
                                    <div style={{textAlign:"right",fontSize:"0.7rem",color:"#aaa",marginTop:2}}>{form.bio.length}/200</div>
                                </div>
                                <div style={{display:"flex",gap:"0.75rem",justifyContent:"flex-end"}}>
                                    <button type="button" onClick={()=>setEditing(false)} style={{background:"#f5f5f5",color:"#888",border:"none",padding:"0.55rem 1.3rem",borderRadius:9,fontWeight:600,cursor:"pointer",fontSize:"0.85rem"}}>Cancel</button>
                                    <button type="submit" style={{background:"#e94560",color:"#fff",border:"none",padding:"0.55rem 1.5rem",borderRadius:9,fontWeight:700,cursor:"pointer",fontSize:"0.85rem",boxShadow:"0 3px 10px rgba(233,69,96,0.25)"}}>Save Changes</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Dashboard section */}
                    <div style={{background:"#fff",borderRadius:16,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",padding:"1.4rem"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"1.2rem",paddingBottom:"0.85rem",borderBottom:"2px solid #f5f5f5"}}>
                            <div style={{width:4,height:24,background:"#e94560",borderRadius:4}}/>
                            <h2 style={{fontSize:"1rem",fontWeight:800,color:"#1a1a2e",margin:0}}>{ROLE_LABEL[profile.role]} Dashboard</h2>
                        </div>
                        {DashSection && <DashSection/>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;

