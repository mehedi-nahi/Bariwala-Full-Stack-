import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { singleItemAPI } from "../../api/marketplaceAPI";
import { sendMessageAPI } from "../../api/messageAPI";
import { createReportAPI } from "../../api/reportAPI";

const AVATAR_COLORS = ["#e94560","#1a1a2e","#2980b9","#27ae60","#8e44ad","#e67e22"];
const Avatar = ({ name, size=44 }) => {
    const bg = AVATAR_COLORS[(name?.charCodeAt(0)||0) % AVATAR_COLORS.length];
    const initials = name ? name.trim().split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?";
    return (
        <div style={{width:size,height:size,borderRadius:"50%",background:bg,color:"#fff",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontWeight:700,fontSize:size*0.35,flexShrink:0}}>
            {initials}
        </div>
    );
};

// ── Cart helpers via localStorage ──
const getCart  = ()        => { try { return JSON.parse(localStorage.getItem("mktCart")||"[]"); } catch { return []; } };
const saveCart = (c)       => localStorage.setItem("mktCart", JSON.stringify(c));
const isInCart = (itemId)  => getCart().some(i => i._id === itemId);
const addCart  = (item)    => {
    const c = getCart();
    if (!c.find(i => i._id === item._id)) saveCart([...c, item]);
};

const ItemDetail = ({ user }) => {
    const { id }      = useParams();
    const navigate    = useNavigate();
    const [item,      setItem]     = useState(null);
    const [activeImg, setActiveImg]= useState(0);
    const [msg,       setMsg]      = useState("");
    const [msgSent,   setMsgSent]  = useState("");
    const [reportMsg, setReportMsg]= useState("");
    const [tab,       setTab]      = useState("overview");
    const [inCart,    setInCart]   = useState(false);

    useEffect(() => {
        singleItemAPI(id).then(res => {
            setItem(res.data.data[0]);
            setInCart(isInCart(id));
        });
    }, [id]);

    const handleAddCart = () => {
        if (!item) return;
        addCart(item);
        setInCart(true);
    };

    const handleContact = async () => {
        if (!msg.trim()) return;
        try {
            await sendMessageAPI({ itemId: id, receiverId: item.sellerInfo[0]._id, message: msg });
            setMsgSent("✅ Message sent to seller!");
            setMsg("");
        } catch { setMsgSent("❌ Failed to send message."); }
    };

    const handleReport = async (type) => {
        try {
            const reportedEntity = type === "item" ? id : item.sellerInfo[0]._id;
            const reportType     = type === "item" ? "marketplace" : "user";
            const reason         = type === "item" ? "Fake or inappropriate listing" : "Bad behavior";
            await createReportAPI({ reportType, reportedEntity, reason });
            setReportMsg("✅ Report submitted. Our team will review it.");
        } catch { setReportMsg("❌ Failed to submit report."); }
    };

    if (!item) return (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",
            flexDirection:"column",gap:"1rem",color:"#aaa"}}>
            <div style={{fontSize:"2.5rem"}}>📦</div>
            <p>Loading item details…</p>
        </div>
    );

    const seller     = item.sellerInfo?.[0];
    const images     = item.images || [];
    const isLoggedIn = !!user;
    // Both marketplace users AND other roles can message the seller in the marketplace
    const canMessage = isLoggedIn && seller && user._id !== seller._id;

    const TABS = [
        { id:"overview", label:"Overview" },
        ...(canMessage ? [{ id:"contact", label:"Contact Seller" }] : []),
    ];

    return (
        <div style={{background:"#f5f6fa",minHeight:"100vh",paddingBottom:"3rem"}}>

            {/* ── BREADCRUMB ── */}
            <div style={{background:"#1a1a2e",padding:"0.8rem 2rem",display:"flex",alignItems:"center",gap:"0.5rem",fontSize:"0.82rem",color:"#aaa"}}>
                <span onClick={()=>navigate("/marketplace/items")} style={{cursor:"pointer",color:"#e94560"}}>Marketplace</span>
                <span>›</span>
                <span style={{color:"#fff"}}>{item.title}</span>
            </div>

            <div style={{maxWidth:1100,margin:"0 auto",padding:"2rem 1.5rem"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:"1.8rem",alignItems:"flex-start"}}>

                    {/* ── LEFT ── */}
                    <div>
                        {/* Image Gallery */}
                        <div style={{borderRadius:16,overflow:"hidden",marginBottom:"1.5rem",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
                            {images.length > 0 ? (
                                <>
                                    <div style={{position:"relative",height:340,background:"#f0f2ff"}}>
                                        <img src={images[activeImg]} alt={item.title}
                                            style={{width:"100%",height:"100%",objectFit:"cover"}}
                                            onError={e=>e.target.style.display="none"}/>
                                        {images.length > 1 && (
                                            <>
                                                <button onClick={()=>setActiveImg(i=>(i-1+images.length)%images.length)}
                                                    style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.4)",color:"#fff",border:"none",borderRadius:"50%",width:36,height:36,cursor:"pointer",fontSize:"1rem"}}>‹</button>
                                                <button onClick={()=>setActiveImg(i=>(i+1)%images.length)}
                                                    style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.4)",color:"#fff",border:"none",borderRadius:"50%",width:36,height:36,cursor:"pointer",fontSize:"1rem"}}>›</button>
                                                <div style={{position:"absolute",bottom:10,right:12,background:"rgba(0,0,0,0.5)",color:"#fff",fontSize:"0.75rem",padding:"0.2rem 0.6rem",borderRadius:20}}>
                                                    {activeImg+1}/{images.length}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {images.length > 1 && (
                                        <div style={{display:"flex",gap:"0.5rem",padding:"0.6rem",background:"#fff",overflowX:"auto"}}>
                                            {images.map((img,i)=>(
                                                <img key={i} src={img} alt=""
                                                    onClick={()=>setActiveImg(i)}
                                                    style={{width:64,height:52,objectFit:"cover",borderRadius:6,cursor:"pointer",
                                                        border:`2px solid ${i===activeImg?"#e94560":"transparent"}`,flexShrink:0}}
                                                    onError={e=>e.target.style.display="none"}/>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{height:340,background:"#f0f2ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"5rem",color:"#ddd"}}>📦</div>
                            )}
                        </div>

                        {/* Title + badge */}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.6rem",flexWrap:"wrap",gap:"0.5rem"}}>
                            <h1 style={{fontSize:"1.45rem",fontWeight:800,color:"#1a1a2e",margin:0}}>{item.title}</h1>
                            <span style={{background:item.condition==="New"?"#27ae60":"#e94560",color:"#fff",
                                fontSize:"0.78rem",fontWeight:700,padding:"0.3rem 0.9rem",borderRadius:20}}>
                                {item.condition}
                            </span>
                        </div>

                        {/* Tab Nav */}
                        <div style={{display:"flex",gap:0,borderBottom:"2px solid #eee",marginBottom:"1.5rem",marginTop:"1.2rem"}}>
                            {TABS.map(t=>(
                                <button key={t.id} onClick={()=>setTab(t.id)} style={{
                                    background:"none",border:"none",padding:"0.7rem 1.2rem",cursor:"pointer",
                                    fontSize:"0.88rem",fontWeight:700,
                                    color:tab===t.id?"#e94560":"#888",
                                    borderBottom:tab===t.id?"2px solid #e94560":"2px solid transparent",
                                    marginBottom:"-2px",transition:"color 0.15s"
                                }}>{t.label}</button>
                            ))}
                        </div>

                        {/* ── OVERVIEW TAB ── */}
                        {tab==="overview" && (
                            <div>
                                {/* Key details */}
                                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:"0.8rem",marginBottom:"1.5rem"}}>
                                    {[
                                        {icon:"💰",label:"Price",value:"৳"+item.price?.toLocaleString()},
                                        {icon:"📦",label:"Condition",value:item.condition},
                                        ...(item.category ? [{icon:"🏷️",label:"Category",value:item.category}] : []),
                                    ].map(d=>(
                                        <div key={d.label} style={{background:"#fff",borderRadius:10,padding:"0.9rem 1rem",
                                            boxShadow:"0 2px 8px rgba(0,0,0,0.05)",display:"flex",alignItems:"center",gap:"0.7rem"}}>
                                            <span style={{fontSize:"1.4rem"}}>{d.icon}</span>
                                            <div>
                                                <div style={{fontSize:"0.7rem",color:"#aaa",fontWeight:600,textTransform:"uppercase"}}>{d.label}</div>
                                                <div style={{fontWeight:700,color:"#1a1a2e",fontSize:"0.92rem"}}>{d.value}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Description */}
                                {item.description && (
                                    <div style={{background:"#fff",borderRadius:12,padding:"1.2rem",
                                        boxShadow:"0 2px 8px rgba(0,0,0,0.05)",marginBottom:"1rem"}}>
                                        <h3 style={{fontWeight:700,color:"#1a1a2e",fontSize:"0.95rem",marginBottom:"0.6rem"}}>📝 Description</h3>
                                        <p style={{fontSize:"0.9rem",color:"#555",lineHeight:1.7,margin:0}}>{item.description}</p>
                                    </div>
                                )}

                                {/* Report buttons */}
                                {isLoggedIn && (
                                    <div style={{marginTop:"1.2rem",display:"flex",gap:"0.6rem",flexWrap:"wrap"}}>
                                        <button onClick={()=>handleReport("item")} style={{background:"none",border:"1px solid #e74c3c",color:"#e74c3c",padding:"0.4rem 1rem",borderRadius:8,cursor:"pointer",fontSize:"0.82rem",fontWeight:600}}>🚩 Report Listing</button>
                                        {seller && user._id !== seller._id && (
                                            <button onClick={()=>handleReport("user")} style={{background:"none",border:"1px solid #e74c3c",color:"#e74c3c",padding:"0.4rem 1rem",borderRadius:8,cursor:"pointer",fontSize:"0.82rem",fontWeight:600}}>🚩 Report Seller</button>
                                        )}
                                    </div>
                                )}
                                {!isLoggedIn && (
                                    <div style={{marginTop:"1.2rem"}}>
                                        <a href="/login" style={{display:"inline-flex",alignItems:"center",gap:"0.4rem",background:"none",border:"1px solid #aaa",color:"#888",padding:"0.4rem 1rem",borderRadius:8,fontSize:"0.82rem",fontWeight:600,textDecoration:"none"}}>
                                            🔒 Login to report this listing
                                        </a>
                                    </div>
                                )}
                                {reportMsg && <p style={{marginTop:"0.5rem",fontSize:"0.82rem",color:reportMsg.startsWith("✅")?"#27ae60":"#e74c3c"}}>{reportMsg}</p>}
                            </div>
                        )}

                        {/* ── CONTACT TAB ── */}
                        {tab==="contact" && (
                            <div>
                                {canMessage ? (
                                    <div style={{background:"#fff",borderRadius:12,padding:"1.4rem",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                                        <h3 style={{fontWeight:700,color:"#1a1a2e",marginBottom:"1rem",fontSize:"1rem"}}>💬 Send a Message to Seller</h3>
                                        <textarea value={msg} onChange={e=>setMsg(e.target.value)}
                                            placeholder="Hi, I'm interested in this item…"
                                            style={{width:"100%",minHeight:100,padding:"0.75rem",borderRadius:8,
                                                border:"1px solid #eee",fontSize:"0.9rem",resize:"vertical",
                                                boxSizing:"border-box",outline:"none"}}/>
                                        <button onClick={handleContact}
                                            style={{marginTop:"0.6rem",background:"#e94560",color:"#fff",border:"none",
                                                padding:"0.65rem 1.6rem",borderRadius:8,cursor:"pointer",fontWeight:700}}>
                                            Send Message
                                        </button>
                                        {msgSent && <p style={{marginTop:"0.6rem",fontSize:"0.85rem",color:msgSent.startsWith("✅")?"#27ae60":"#e74c3c"}}>{msgSent}</p>}
                                    </div>
                                ) : !isLoggedIn ? (
                                    <div style={{background:"#fff",borderRadius:12,padding:"2.5rem",boxShadow:"0 2px 8px rgba(0,0,0,0.05)",textAlign:"center"}}>
                                        <div style={{width:56,height:56,borderRadius:"50%",background:"#fff0f2",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem"}}>
                                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e94560" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                        </div>
                                        <h3 style={{color:"#1a1a2e",fontWeight:700,marginBottom:"0.5rem"}}>Login to Contact</h3>
                                        <p style={{color:"#888",fontSize:"0.88rem",marginBottom:"1.2rem"}}>You need to log in to message this seller.</p>
                                        <div style={{display:"flex",gap:"0.8rem",justifyContent:"center"}}>
                                            <a href="/login" style={{background:"#e94560",color:"#fff",padding:"0.6rem 1.6rem",borderRadius:8,fontWeight:700,fontSize:"0.9rem",textDecoration:"none"}}>Login</a>
                                            <a href="/register" style={{background:"#f5f5f5",color:"#555",padding:"0.6rem 1.6rem",borderRadius:8,fontWeight:700,fontSize:"0.9rem",textDecoration:"none"}}>Register</a>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>

                    {/* ── RIGHT STICKY PANEL ── */}
                    <div style={{position:"sticky",top:80}}>
                        {/* Price card */}
                        <div style={{background:"#fff",borderRadius:14,padding:"1.4rem",
                            boxShadow:"0 4px 20px rgba(0,0,0,0.09)",marginBottom:"1rem"}}>
                            <div style={{fontWeight:800,fontSize:"2rem",color:"#e94560",lineHeight:1}}>
                                ৳{item.price?.toLocaleString()}
                            </div>
                            <div style={{borderTop:"1px solid #f5f5f5",paddingTop:"0.8rem",marginTop:"0.8rem",
                                display:"flex",flexDirection:"column",gap:"0.4rem"}}>
                                <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.85rem"}}>
                                    <span style={{color:"#888"}}>Condition</span>
                                    <span style={{fontWeight:600,color:item.condition==="New"?"#27ae60":"#e67e22"}}>{item.condition}</span>
                                </div>
                                {item.category && (
                                    <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.85rem"}}>
                                        <span style={{color:"#888"}}>Category</span>
                                        <span style={{fontWeight:600}}>{item.category}</span>
                                    </div>
                                )}
                            </div>
                            {canMessage && (
                                <button onClick={()=>setTab("contact")}
                                    style={{marginTop:"1rem",width:"100%",background:"#e94560",color:"#fff",
                                        border:"none",padding:"0.8rem",borderRadius:10,fontWeight:700,
                                        cursor:"pointer",fontSize:"0.95rem"}}>
                                    💬 Contact Seller
                                </button>
                            )}
                            {/* ── ADD TO CART ── */}
                            <button
                                onClick={handleAddCart}
                                disabled={inCart || item.isSold}
                                style={{marginTop:"0.6rem",width:"100%",
                                    background: item.isSold ? "#f0f0f0" : inCart ? "#f0faf4" : "linear-gradient(90deg,#1a1a2e,#2c3e50)",
                                    color: item.isSold ? "#aaa" : inCart ? "#27ae60" : "#fff",
                                    border:`1px solid ${item.isSold?"#ddd":inCart?"#c3e6cb":"transparent"}`,
                                    padding:"0.8rem",borderRadius:10,fontWeight:700,
                                    cursor: (inCart||item.isSold) ? "default":"pointer",fontSize:"0.9rem",
                                    boxShadow: (inCart||item.isSold) ? "none":"0 4px 12px rgba(26,26,46,0.25)"}}>
                                {item.isSold ? "🚫 Already Sold" : inCart ? "✓ Added to Cart" : "🛒 Add to Cart"}
                            </button>
                            {inCart && !item.isSold && (
                                <div style={{textAlign:"center",marginTop:"0.4rem"}}>
                                    <a href="/marketplace/items" style={{fontSize:"0.78rem",color:"#e94560",fontWeight:600,textDecoration:"none"}}>
                                        → Go to Cart on Homepage
                                    </a>
                                </div>
                            )}
                            {!isLoggedIn && (
                                <a href="/login"
                                    style={{marginTop:"1rem",display:"block",width:"100%",background:"#e94560",color:"#fff",
                                        border:"none",padding:"0.8rem",borderRadius:10,fontWeight:700,
                                        cursor:"pointer",fontSize:"0.95rem",textAlign:"center",textDecoration:"none",boxSizing:"border-box"}}>
                                    🔒 Login to Contact
                                </a>
                            )}
                            <button onClick={()=>navigate("/marketplace/items")}
                                style={{marginTop:"0.5rem",width:"100%",background:"none",border:"1px solid #eee",
                                    color:"#888",padding:"0.6rem",borderRadius:10,cursor:"pointer",fontSize:"0.85rem"}}>
                                ← Back to Marketplace
                            </button>
                        </div>

                        {/* Seller card */}
                        {seller && (
                            <div style={{background:"#fff",borderRadius:14,padding:"1.2rem",
                                boxShadow:"0 4px 20px rgba(0,0,0,0.09)"}}>
                                <h4 style={{fontSize:"0.78rem",fontWeight:700,color:"#aaa",textTransform:"uppercase",
                                    letterSpacing:"0.05em",marginBottom:"0.8rem"}}>Listed By</h4>
                                <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.6rem"}}>
                                    <Avatar name={seller.name} size={44}/>
                                    <div>
                                        <div style={{fontWeight:700,color:"#1a1a2e",fontSize:"0.95rem"}}>{seller.name}</div>
                                        <span style={{background:"#f0f2ff",color:"#2980b9",fontSize:"0.68rem",
                                            padding:"0.12rem 0.5rem",borderRadius:20,fontWeight:600}}>Seller</span>
                                    </div>
                                </div>
                                <div style={{fontSize:"0.82rem",color:"#aaa"}}>{seller.email}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemDetail;
