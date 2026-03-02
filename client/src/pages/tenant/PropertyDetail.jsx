import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { singlePropertyAPI } from "../../api/propertyAPI";
import { sendMessageAPI } from "../../api/messageAPI";
import { createReportAPI } from "../../api/reportAPI";
import { createReviewAPI, userReviewsAPI } from "../../api/reviewAPI";
import { sendRentalRequestAPI, rentalRequestStatusAPI } from "../../api/rentalRequestAPI";

const API_BASE = "/api/v1/get-file/";

/* ── small helpers ── */
const Stars = ({ n = 0 }) => (
    <span style={{ color:"#c0392b", fontSize:"0.9rem", letterSpacing:2 }}>
        {"★".repeat(Math.round(n))}{"☆".repeat(5 - Math.round(n))}
    </span>
);

const Avatar = ({ name, size = 40 }) => {
    const colors = ["#c0392b","#1a1a2e","#2980b9","#27ae60","#8e44ad","#e67e22"];
    const bg = colors[(name?.charCodeAt(0) || 0) % colors.length];
    const letters = name ? name.trim().split(/\s+/).map(w => w[0]).join("").slice(0,2).toUpperCase() : "?";
    return (
        <div style={{ width:size, height:size, borderRadius:"50%", background:bg, color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:700, fontSize:size*0.32, flexShrink:0 }}>
            {letters}
        </div>
    );
};

/* ── Request-to-Rent popup modal ── */
const RentRequestModal = ({ property, rentRequest, onClose, onSent }) => {
    const [note, setNote]       = useState("");
    const [msg,  setMsg]        = useState("");
    const [busy, setBusy]       = useState(false);

    const submit = async () => {
        setBusy(true); setMsg("");
        try {
            const res = await sendRentalRequestAPI({ propertyId: property._id, message: note });
            onSent(res.data.data);
            setMsg("✅ Request sent! The landlord will review it.");
        } catch (err) {
            setMsg(err.response?.data?.message || "❌ Failed to send request.");
        } finally { setBusy(false); }
    };

    return (
        <div style={{
            position:"fixed", inset:0, background:"rgba(0,0,0,0.55)",
            zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center",
            padding:"1rem"
        }} onClick={onClose}>
            <div style={{
                background:"#fff", width:"100%", maxWidth:480,
                border:"1px solid #e8e4dc",
                boxShadow:"0 20px 60px rgba(0,0,0,0.18)",
                overflow:"hidden"
            }} onClick={e => e.stopPropagation()}>

                {/* header bar */}
                <div style={{ background:"#111", padding:"1.1rem 1.5rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ color:"#fff", fontWeight:700, fontSize:"0.82rem", textTransform:"uppercase", letterSpacing:"0.1em" }}>Request to Rent</span>
                    <button onClick={onClose} style={{
                        background:"none", border:"none", color:"#888", cursor:"pointer",
                        fontSize:"1.2rem", lineHeight:1, padding:0, textTransform:"none", letterSpacing:0
                    }}>✕</button>
                </div>

                <div style={{ padding:"1.6rem" }}>
                    {/* property summary */}
                    <div style={{ display:"flex", gap:"0.9rem", alignItems:"center", marginBottom:"1.4rem",
                        padding:"0.9rem", background:"#fafaf8", border:"1px solid #f0ede8" }}>
                        {property.images?.[0] ? (
                            <img src={API_BASE + property.images[0]} alt=""
                                style={{ width:72, height:56, objectFit:"cover", flexShrink:0 }} />
                        ) : (
                            <div style={{ width:72, height:56, background:"#e8e4dc", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#aaa", fontSize:"1.4rem" }}>🏠</div>
                        )}
                        <div>
                            <div style={{ fontWeight:700, fontSize:"0.88rem", color:"#111" }}>
                                {property.propertyType} · {property.area}
                            </div>
                            <div style={{ fontSize:"0.78rem", color:"#888", marginTop:2 }}>{property.address}</div>
                            <div style={{ fontWeight:700, color:"#c0392b", fontSize:"0.9rem", marginTop:4 }}>
                                ৳{property.monthlyRent?.toLocaleString()} <span style={{ fontWeight:400, color:"#aaa", fontSize:"0.75rem" }}>/month</span>
                            </div>
                        </div>
                    </div>

                    {/* existing request status */}
                    {rentRequest ? (
                        <div style={{
                            padding:"1rem", border:`1px solid ${rentRequest.status==="Accepted"?"#c8e6c9":rentRequest.status==="Rejected"?"#f5c6cb":"#fce09b"}`,
                            background: rentRequest.status==="Accepted"?"#f0f8f0":rentRequest.status==="Rejected"?"#fdf0f0":"#fffbf0",
                            marginBottom:"1rem"
                        }}>
                            <div style={{ fontWeight:700, fontSize:"0.88rem",
                                color: rentRequest.status==="Accepted"?"#2e7d32":rentRequest.status==="Rejected"?"#c0392b":"#8a6914" }}>
                                {rentRequest.status === "Accepted" ? "✅ Your request was accepted" :
                                 rentRequest.status === "Rejected" ? "❌ Your request was rejected" :
                                 "⏳ Request is pending review"}
                            </div>
                            <div style={{ fontSize:"0.78rem", color:"#888", marginTop:4 }}>
                                {rentRequest.status === "Accepted" ? "The landlord can now generate an invoice for you." :
                                 rentRequest.status === "Rejected" ? "You may send a new request." :
                                 "The landlord will respond soon."}
                            </div>
                            {rentRequest.status === "Rejected" && (
                                <button onClick={() => onSent(null)} style={{
                                    marginTop:"0.7rem", background:"#111", color:"#fff", border:"none",
                                    padding:"0.45rem 1rem", cursor:"pointer", fontSize:"0.75rem",
                                    textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600
                                }}>Send New Request</button>
                            )}
                        </div>
                    ) : property.availability !== "Available" ? (
                        <div style={{ padding:"0.9rem", background:"#fdf0f0", border:"1px solid #f5c6cb", marginBottom:"1rem",
                            fontSize:"0.85rem", color:"#c0392b", fontWeight:600 }}>
                            ⚠️ This property is currently not available.
                        </div>
                    ) : (
                        <>
                            <div style={{ marginBottom:"0.5rem" }}>
                                <label style={{ display:"block", marginBottom:"0.4rem", fontSize:"0.72rem",
                                    fontWeight:600, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                                    Message to Landlord <span style={{ color:"#bbb", textTransform:"none" }}>(optional)</span>
                                </label>
                                <textarea value={note} onChange={e => setNote(e.target.value)}
                                    placeholder="Tell the landlord a bit about yourself..."
                                    style={{ width:"100%", minHeight:90, padding:"0.65rem 0.9rem",
                                        border:"1px solid #e0ddd8", borderRadius:2,
                                        fontSize:"0.88rem", resize:"vertical", boxSizing:"border-box",
                                        fontFamily:"inherit" }} />
                            </div>
                            {msg && <p style={{ fontSize:"0.82rem", marginBottom:"0.6rem",
                                color: msg.startsWith("✅") ? "#2e7d32" : "#c0392b" }}>{msg}</p>}
                            <button onClick={submit} disabled={busy} style={{
                                width:"100%", background:"#111", color:"#fff", border:"none",
                                padding:"0.75rem", cursor:busy?"not-allowed":"pointer",
                                fontSize:"0.8rem", textTransform:"uppercase", letterSpacing:"0.08em",
                                fontWeight:700, fontFamily:"inherit", opacity: busy ? 0.6 : 1
                            }}>
                                {busy ? "Sending…" : "Send Rental Request"}
                            </button>
                        </>
                    )}
                    {!rentRequest && msg && (
                        <p style={{ fontSize:"0.82rem", marginTop:"0.5rem",
                            color: msg.startsWith("✅") ? "#2e7d32" : "#c0392b" }}>{msg}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════════
   Main PropertyDetail Component
══════════════════════════════════════════════ */
const PropertyDetail = ({ user }) => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [property,  setProperty]  = useState(null);
    const [reviews,   setReviews]   = useState([]);
    const [activeImg, setActiveImg] = useState(0);
    const [msg,       setMsg]       = useState("");
    const [msgSent,   setMsgSent]   = useState("");
    const [review,    setReview]    = useState({ rating:5, comment:"", targetId:"" });
    const [reviewMsg, setReviewMsg] = useState("");
    const [reportMsg, setReportMsg] = useState("");
    const [tab,       setTab]       = useState("details"); // details | contact | reviews
    const [rentRequest,    setRentRequest]    = useState(null);
    const [showRentModal,  setShowRentModal]  = useState(false);

    useEffect(() => {
        singlePropertyAPI(id).then(res => {
            const p = res.data.data[0];
            setProperty(p);
            if (p?.landlordInfo?.[0]?._id)
                userReviewsAPI(p.landlordInfo[0]._id).then(r => setReviews(r.data.data || []));
        });
        if (user?.role === "tenant")
            rentalRequestStatusAPI(id).then(r => setRentRequest(r.data.data)).catch(() => {});
    }, [id]); // eslint-disable-line

    const handleMessage = async () => {
        if (!msg.trim()) return;
        try {
            await sendMessageAPI({ propertyId: id, receiverId: property.landlordInfo[0]._id, message: msg });
            setMsgSent("✅ Message sent! Check your inbox."); setMsg("");
        } catch { setMsgSent("❌ Failed to send message."); }
    };

    const handleReport = async (type) => {
        try {
            const reportedEntity = type === "property" ? id : property.landlordInfo[0]._id;
            await createReportAPI({ reportType: type === "property" ? "property" : "user", reportedEntity, reason: type === "property" ? "Fake/misleading listing" : "Bad behavior" });
            setReportMsg("✅ Report submitted.");
        } catch { setReportMsg("❌ Failed to submit report."); }
    };

    const handleReview = async (e) => {
        e.preventDefault(); setReviewMsg("");
        const isTenant = user?.role === "tenant";
        const revieweeId = isTenant ? property.landlordInfo[0]._id : review.targetId;
        const reviewType = isTenant ? "tenant-to-landlord" : "landlord-to-tenant";
        if (!isTenant && !review.targetId) { setReviewMsg("Enter Tenant ID."); return; }
        try {
            await createReviewAPI({ revieweeId, propertyId: id, reviewType, rating: review.rating, comment: review.comment });
            setReviewMsg("✅ Review submitted!");
            userReviewsAPI(property.landlordInfo[0]._id).then(r => setReviews(r.data.data || []));
        } catch (err) { setReviewMsg(err.response?.data?.message || "❌ Review failed."); }
    };

    if (!property) return (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
            height:"80vh", flexDirection:"column", gap:"0.8rem", color:"#aaa" }}>
            <div style={{ width:48, height:48, border:"2px solid #e8e4dc", borderTopColor:"#111",
                borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
            <p style={{ fontSize:"0.85rem", color:"#aaa" }}>Loading property…</p>
        </div>
    );

    const landlord  = property.landlordInfo?.[0];
    const isTenant  = user?.role === "tenant";
    const isLandlord = user?.role === "landlord";
    const images    = property.images || [];
    const avgRating = reviews.length ? (reviews.reduce((s,r) => s+r.rating, 0) / reviews.length).toFixed(1) : null;

    const TABS = [
        { id:"details",  label:"Details" },
        { id:"contact",  label:"Contact Landlord" },
        { id:"reviews",  label:`Reviews (${reviews.length})` },
    ];

    return (
        <div style={{ background:"#fafaf8", minHeight:"100vh" }}>

            {/* ── Breadcrumb ── */}
            <div style={{ background:"#fff", borderBottom:"1px solid #f0ede8",
                padding:"0.7rem 2rem", fontSize:"0.75rem", color:"#aaa",
                display:"flex", alignItems:"center", gap:"0.5rem" }}>
                <span onClick={() => navigate("/")} style={{ cursor:"pointer", color:"#888" }}>Home</span>
                <span>›</span>
                <span>{property.area}</span>
                <span>›</span>
                <span style={{ color:"#111" }}>{property.propertyType}</span>
            </div>

            <div style={{ maxWidth:1120, margin:"0 auto", padding:"2rem 1.5rem" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:"2.5rem", alignItems:"flex-start" }}>

                    {/* ────── LEFT ────── */}
                    <div>

                        {/* ── Image gallery ── */}
                        <div style={{ marginBottom:"2rem" }}>
                            {images.length > 0 ? (
                                <>
                                    <div style={{ position:"relative", background:"#e8e4dc", aspectRatio:"16/9", overflow:"hidden" }}>
                                        <img src={API_BASE + images[activeImg]} alt="property"
                                            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
                                            onError={e => e.target.style.display="none"} />
                                        {images.length > 1 && (
                                            <>
                                                <button onClick={() => setActiveImg(i => (i-1+images.length)%images.length)}
                                                    style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)",
                                                        background:"#fff", color:"#111", border:"1px solid #e8e4dc",
                                                        width:36, height:36, borderRadius:2, cursor:"pointer",
                                                        fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center",
                                                        padding:0, textTransform:"none", letterSpacing:0, fontWeight:400 }}>‹</button>
                                                <button onClick={() => setActiveImg(i => (i+1)%images.length)}
                                                    style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)",
                                                        background:"#fff", color:"#111", border:"1px solid #e8e4dc",
                                                        width:36, height:36, borderRadius:2, cursor:"pointer",
                                                        fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center",
                                                        padding:0, textTransform:"none", letterSpacing:0, fontWeight:400 }}>›</button>
                                                <div style={{ position:"absolute", bottom:12, right:16,
                                                    background:"rgba(0,0,0,0.5)", color:"#fff", fontSize:"0.72rem",
                                                    padding:"0.2rem 0.6rem" }}>
                                                    {activeImg+1} / {images.length}
                                                </div>
                                            </>
                                        )}
                                        {/* availability ribbon */}
                                        <div style={{ position:"absolute", top:16, left:0,
                                            background: property.availability === "Available" ? "#2e7d32" : "#c0392b",
                                            color:"#fff", fontSize:"0.7rem", fontWeight:700,
                                            padding:"0.3rem 0.9rem", letterSpacing:"0.06em", textTransform:"uppercase" }}>
                                            {property.availability}
                                        </div>
                                    </div>
                                    {/* thumbnails */}
                                    {images.length > 1 && (
                                        <div style={{ display:"flex", gap:4, marginTop:4 }}>
                                            {images.map((img, i) => (
                                                <img key={i} src={API_BASE + img} alt=""
                                                    onClick={() => setActiveImg(i)}
                                                    style={{ width:80, height:56, objectFit:"cover", cursor:"pointer",
                                                        outline: i===activeImg ? "2px solid #111" : "none",
                                                        outlineOffset:1, opacity: i===activeImg ? 1 : 0.55,
                                                        transition:"opacity 0.15s" }}
                                                    onError={e => e.target.style.display="none"} />
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ background:"#e8e4dc", aspectRatio:"16/9",
                                    display:"flex", alignItems:"center", justifyContent:"center",
                                    color:"#bbb", fontSize:"3rem" }}>🏠</div>
                            )}
                        </div>

                        {/* ── Title row ── */}
                        <div style={{ marginBottom:"1.6rem" }}>
                            <h1 style={{ fontSize:"1.8rem", fontWeight:700, color:"#111",
                                letterSpacing:"-0.03em", lineHeight:1.2, marginBottom:"0.4rem" }}>
                                {property.propertyType} in {property.area}
                            </h1>
                            <div style={{ fontSize:"0.85rem", color:"#888", display:"flex", alignItems:"center", gap:"0.6rem" }}>
                                <span>📍 {property.address}</span>
                                {avgRating && (
                                    <>
                                        <span style={{ color:"#ddd" }}>·</span>
                                        <Stars n={avgRating} />
                                        <span style={{ color:"#888" }}>{avgRating}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ── Tab nav ── */}
                        <div style={{ display:"flex", borderBottom:"1px solid #e8e4dc", marginBottom:"1.8rem" }}>
                            {TABS.map(t => (
                                <button key={t.id} onClick={() => setTab(t.id)} style={{
                                    background:"none", border:"none", borderBottom: tab===t.id ? "2px solid #111" : "2px solid transparent",
                                    padding:"0.65rem 1rem", cursor:"pointer", fontSize:"0.78rem",
                                    fontWeight: tab===t.id ? 700 : 500, color: tab===t.id ? "#111" : "#888",
                                    marginBottom:"-1px", textTransform:"uppercase", letterSpacing:"0.06em",
                                    transition:"color 0.15s"
                                }}>{t.label}</button>
                            ))}
                        </div>

                        {/* ── DETAILS TAB ── */}
                        {tab === "details" && (
                            <div>
                                {/* key specs — 2-column definition list */}
                                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0",
                                    border:"1px solid #e8e4dc", marginBottom:"1.8rem" }}>
                                    {[
                                        ["Monthly Rent",     "৳" + property.monthlyRent?.toLocaleString()],
                                        ["Advance Deposit",  property.advanceDeposit ? "৳" + property.advanceDeposit?.toLocaleString() : "—"],
                                        ["Property Type",    property.propertyType],
                                        ["Distance",         property.distanceFromMainRoad || "—"],
                                    ].map(([label, val], i) => (
                                        <div key={label} style={{
                                            padding:"0.9rem 1.1rem",
                                            borderBottom:"1px solid #f0ede8",
                                            borderRight: i%2===0 ? "1px solid #f0ede8" : "none",
                                            background:"#fff"
                                        }}>
                                            <div style={{ fontSize:"0.68rem", color:"#aaa", fontWeight:600,
                                                textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{label}</div>
                                            <div style={{ fontSize:"0.95rem", fontWeight:700, color:"#111" }}>{val}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* facilities */}
                                {property.facilities?.length > 0 && (
                                    <div style={{ marginBottom:"1.8rem" }}>
                                        <h3 style={{ fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase",
                                            letterSpacing:"0.08em", color:"#888", marginBottom:"0.8rem" }}>Facilities</h3>
                                        <div style={{ display:"flex", flexWrap:"wrap", gap:"0.45rem" }}>
                                            {property.facilities.map(f => (
                                                <span key={f} style={{ background:"#fff", border:"1px solid #e8e4dc",
                                                    fontSize:"0.8rem", padding:"0.3rem 0.8rem", color:"#555", fontWeight:500 }}>
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* map */}
                                {property.location?.mapLink && (
                                    <a href={property.location.mapLink} target="_blank" rel="noreferrer"
                                        style={{ display:"inline-flex", alignItems:"center", gap:"0.5rem",
                                            background:"#111", color:"#fff", padding:"0.6rem 1.2rem",
                                            fontSize:"0.78rem", textDecoration:"none",
                                            fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em",
                                            marginBottom:"1.5rem" }}>
                                        📍 View on Google Maps
                                    </a>
                                )}

                                {/* report */}
                                {user && isTenant && (
                                    <div style={{ display:"flex", gap:"0.6rem", flexWrap:"wrap", marginTop:"0.5rem" }}>
                                        <button onClick={() => handleReport("property")} style={{
                                            background:"none", border:"1px solid #e8e4dc", color:"#888",
                                            fontSize:"0.74rem", padding:"0.4rem 0.9rem", cursor:"pointer",
                                            textTransform:"uppercase", letterSpacing:"0.04em" }}>
                                            Report Listing
                                        </button>
                                        {landlord && (
                                            <button onClick={() => handleReport("user")} style={{
                                                background:"none", border:"1px solid #e8e4dc", color:"#888",
                                                fontSize:"0.74rem", padding:"0.4rem 0.9rem", cursor:"pointer",
                                                textTransform:"uppercase", letterSpacing:"0.04em" }}>
                                                Report Landlord
                                            </button>
                                        )}
                                    </div>
                                )}
                                {reportMsg && <p style={{ marginTop:"0.5rem", fontSize:"0.8rem",
                                    color: reportMsg.startsWith("✅") ? "#2e7d32" : "#c0392b" }}>{reportMsg}</p>}
                            </div>
                        )}

                        {/* ── CONTACT TAB ── */}
                        {tab === "contact" && (
                            <div>
                                {!user ? (
                                    <div style={{ background:"#fff", border:"1px solid #e8e4dc",
                                        padding:"2.5rem", textAlign:"center" }}>
                                        <p style={{ marginBottom:"1.2rem", fontSize:"0.88rem" }}>
                                            You must be logged in as a <strong>Tenant</strong> to message this landlord.
                                        </p>
                                        <div style={{ display:"flex", gap:"0.6rem", justifyContent:"center" }}>
                                            <a href="/login" style={{ background:"#111", color:"#fff",
                                                padding:"0.6rem 1.4rem", textDecoration:"none",
                                                fontSize:"0.78rem", fontWeight:600, textTransform:"uppercase",
                                                letterSpacing:"0.06em" }}>Login</a>
                                            <a href="/register" style={{ background:"#fff", color:"#111",
                                                border:"1px solid #e8e4dc", padding:"0.6rem 1.4rem",
                                                textDecoration:"none", fontSize:"0.78rem", fontWeight:600,
                                                textTransform:"uppercase", letterSpacing:"0.06em" }}>Register</a>
                                        </div>
                                    </div>
                                ) : isTenant ? (
                                    <div style={{ background:"#fff", border:"1px solid #e8e4dc", padding:"1.5rem" }}>
                                        <h3 style={{ fontSize:"0.78rem", fontWeight:700, textTransform:"uppercase",
                                            letterSpacing:"0.08em", color:"#888", marginBottom:"0.9rem" }}>
                                            Message Landlord
                                        </h3>
                                        <textarea value={msg} onChange={e => setMsg(e.target.value)}
                                            placeholder="Hi, I'm interested in this property…"
                                            style={{ width:"100%", minHeight:100, padding:"0.7rem 0.9rem",
                                                border:"1px solid #e0ddd8", borderRadius:2, fontSize:"0.88rem",
                                                resize:"vertical", boxSizing:"border-box", fontFamily:"inherit" }} />
                                        <button onClick={handleMessage} style={{
                                            marginTop:"0.7rem", background:"#111", color:"#fff",
                                            padding:"0.65rem 1.6rem", fontSize:"0.78rem",
                                            textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>
                                            Send Message
                                        </button>
                                        {msgSent && <p style={{ marginTop:"0.6rem", fontSize:"0.82rem",
                                            color: msgSent.startsWith("✅") ? "#2e7d32" : "#c0392b" }}>{msgSent}</p>}
                                    </div>
                                ) : user?.role === "marketplace" ? (
                                    <div style={{ background:"#fff", border:"1px solid #e8e4dc", padding:"2rem", textAlign:"center" }}>
                                        <p style={{ marginBottom:"1rem", fontSize:"0.88rem" }}>
                                            Register as a <strong>Tenant</strong> to message landlords.
                                        </p>
                                        <a href="/register" style={{ background:"#111", color:"#fff",
                                            padding:"0.65rem 1.6rem", textDecoration:"none", display:"inline-block",
                                            fontSize:"0.78rem", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                                            Register as Tenant →
                                        </a>
                                    </div>
                                ) : (
                                    <div style={{ background:"#fff", border:"1px solid #e8e4dc", padding:"1.5rem", color:"#888", fontSize:"0.88rem" }}>
                                        Only tenants can message landlords.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── REVIEWS TAB ── */}
                        {tab === "reviews" && (
                            <div>
                                {/* avg rating */}
                                {avgRating && (
                                    <div style={{ display:"flex", alignItems:"center", gap:"1rem",
                                        padding:"1.2rem 1.4rem", background:"#fff",
                                        border:"1px solid #e8e4dc", marginBottom:"1.2rem" }}>
                                        <div style={{ fontSize:"2.8rem", fontWeight:700, color:"#111", lineHeight:1 }}>{avgRating}</div>
                                        <div>
                                            <Stars n={avgRating} />
                                            <div style={{ fontSize:"0.76rem", color:"#aaa", marginTop:2 }}>
                                                Based on {reviews.length} review{reviews.length!==1?"s":""}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* review list */}
                                <div style={{ display:"flex", flexDirection:"column", gap:1, marginBottom:"1.5rem", background:"#e8e4dc" }}>
                                    {reviews.length === 0 ? (
                                        <div style={{ background:"#fff", padding:"2rem", textAlign:"center",
                                            color:"#aaa", fontSize:"0.85rem" }}>
                                            No reviews yet.
                                        </div>
                                    ) : reviews.map(r => (
                                        <div key={r._id} style={{ background:"#fff", padding:"1rem 1.2rem" }}>
                                            <div style={{ display:"flex", gap:"0.75rem", alignItems:"flex-start" }}>
                                                <Avatar name={r.reviewerInfo?.[0]?.name} size={36} />
                                                <div style={{ flex:1 }}>
                                                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                                        <span style={{ fontWeight:700, fontSize:"0.85rem" }}>
                                                            {r.reviewerInfo?.[0]?.name || "Anonymous"}
                                                        </span>
                                                        <span style={{ fontSize:"0.72rem", color:"#aaa" }}>
                                                            {new Date(r.createdAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
                                                        </span>
                                                    </div>
                                                    <Stars n={r.rating} />
                                                    {r.comment && <p style={{ fontSize:"0.84rem", color:"#555", marginTop:"0.35rem", lineHeight:1.6 }}>{r.comment}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* submit review */}
                                {user && (isTenant || isLandlord) && (
                                    <div style={{ background:"#fff", border:"1px solid #e8e4dc", padding:"1.4rem" }}>
                                        <h3 style={{ fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase",
                                            letterSpacing:"0.08em", color:"#888", marginBottom:"0.9rem" }}>
                                            {isTenant ? "Rate this Landlord" : "Rate a Tenant"}
                                        </h3>
                                        {reviewMsg && <p style={{ fontSize:"0.82rem", marginBottom:"0.6rem",
                                            color: reviewMsg.startsWith("✅") ? "#2e7d32" : "#c0392b" }}>{reviewMsg}</p>}
                                        <form onSubmit={handleReview} style={{ gap:"0.7rem" }}>
                                            {isLandlord && (
                                                <input placeholder="Enter Tenant ID" value={review.targetId}
                                                    onChange={e => setReview({ ...review, targetId:e.target.value })} required />
                                            )}
                                            <div style={{ display:"flex", gap:"0.3rem", marginBottom:"0.5rem" }}>
                                                {[1,2,3,4,5].map(n => (
                                                    <button key={n} type="button" onClick={() => setReview({...review, rating:n})} style={{
                                                        background:"none", border:"none", cursor:"pointer",
                                                        fontSize:"1.6rem", color: n<=review.rating ? "#c0392b" : "#e0ddd8",
                                                        padding:"0.2rem", textTransform:"none", letterSpacing:0,
                                                        transition:"color 0.1s" }}>★</button>
                                                ))}
                                            </div>
                                            <textarea placeholder="Share your experience…" value={review.comment}
                                                onChange={e => setReview({...review, comment:e.target.value})}
                                                style={{ marginBottom:"0.6rem" }} />
                                            <button type="submit" style={{
                                                background:"#111", color:"#fff", padding:"0.6rem 1.4rem",
                                                fontSize:"0.78rem", textTransform:"uppercase", letterSpacing:"0.08em",
                                                fontWeight:700 }}>
                                                Submit Review
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ────── RIGHT sticky panel ────── */}
                    <div style={{ position:"sticky", top:72 }}>
                        {/* Price card */}
                        <div style={{ background:"#fff", border:"1px solid #e8e4dc",
                            padding:"1.6rem", marginBottom:4 }}>
                            <div style={{ fontWeight:800, fontSize:"1.9rem", color:"#111",
                                letterSpacing:"-0.03em", lineHeight:1 }}>
                                ৳{property.monthlyRent?.toLocaleString()}
                                <span style={{ fontWeight:400, fontSize:"0.85rem", color:"#aaa", marginLeft:4 }}>/month</span>
                            </div>
                            {property.advanceDeposit && (
                                <div style={{ fontSize:"0.8rem", color:"#888", marginTop:4 }}>
                                    Deposit: ৳{property.advanceDeposit?.toLocaleString()}
                                </div>
                            )}

                            {/* specs mini-list */}
                            <div style={{ borderTop:"1px solid #f0ede8", marginTop:"1rem", paddingTop:"1rem",
                                display:"flex", flexDirection:"column", gap:"0.4rem" }}>
                                {[
                                    ["Type",   property.propertyType],
                                    ["Area",   property.area],
                                    ["Status", property.availability],
                                    property.distanceFromMainRoad ? ["Distance", property.distanceFromMainRoad] : null
                                ].filter(Boolean).map(([l,v]) => (
                                    <div key={l} style={{ display:"flex", justifyContent:"space-between",
                                        fontSize:"0.82rem" }}>
                                        <span style={{ color:"#aaa" }}>{l}</span>
                                        <span style={{ fontWeight:600, color: l==="Status" ? (v==="Available"?"#2e7d32":"#c0392b") : "#111" }}>{v}</span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA buttons */}
                            {isTenant && property.availability === "Available" && (
                                <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:"1.2rem" }}>
                                    <button onClick={() => setTab("contact")} style={{
                                        width:"100%", background:"#fff", color:"#111",
                                        border:"1px solid #111", padding:"0.7rem",
                                        fontSize:"0.78rem", textTransform:"uppercase",
                                        letterSpacing:"0.08em", fontWeight:700, cursor:"pointer" }}>
                                        Message Landlord
                                    </button>
                                    {/* Request to Rent — status pill or button */}
                                    {rentRequest ? (
                                        <div style={{
                                            textAlign:"center", fontSize:"0.78rem", fontWeight:600,
                                            padding:"0.5rem", border:`1px solid ${rentRequest.status==="Accepted"?"#c8e6c9":rentRequest.status==="Rejected"?"#f5c6cb":"#fce09b"}`,
                                            background: rentRequest.status==="Accepted"?"#f0f8f0":rentRequest.status==="Rejected"?"#fdf0f0":"#fffbf0",
                                            color: rentRequest.status==="Accepted"?"#2e7d32":rentRequest.status==="Rejected"?"#c0392b":"#8a6914",
                                            cursor: rentRequest.status==="Rejected" ? "pointer" : "default"
                                        }} onClick={() => rentRequest.status==="Rejected" && setShowRentModal(true)}>
                                            {rentRequest.status==="Accepted" ? "✅ Request Accepted" :
                                             rentRequest.status==="Rejected" ? "❌ Rejected — Send New Request" :
                                             "⏳ Request Pending"}
                                        </div>
                                    ) : (
                                        <button onClick={() => setShowRentModal(true)} style={{
                                            width:"100%", background:"#111", color:"#fff",
                                            border:"none", padding:"0.7rem",
                                            fontSize:"0.78rem", textTransform:"uppercase",
                                            letterSpacing:"0.08em", fontWeight:700, cursor:"pointer" }}>
                                            Request to Rent
                                        </button>
                                    )}
                                </div>
                            )}
                            <button onClick={() => navigate(-1)} style={{
                                marginTop:8, width:"100%", background:"none",
                                border:"1px solid #e8e4dc", color:"#888",
                                padding:"0.55rem", fontSize:"0.74rem",
                                textTransform:"uppercase", letterSpacing:"0.05em", cursor:"pointer" }}>
                                ← Back
                            </button>
                        </div>

                        {/* Landlord card */}
                        {landlord && (
                            <div style={{ background:"#fff", border:"1px solid #e8e4dc", padding:"1.2rem" }}>
                                <div style={{ fontSize:"0.68rem", color:"#aaa", fontWeight:700,
                                    textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"0.8rem" }}>
                                    Listed By
                                </div>
                                <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
                                    <Avatar name={landlord.name} size={40} />
                                    <div>
                                        <div style={{ fontWeight:700, color:"#111", fontSize:"0.9rem" }}>{landlord.name}</div>
                                        <div style={{ fontSize:"0.74rem", color:"#aaa" }}>{landlord.email}</div>
                                        {avgRating && (
                                            <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
                                                <Stars n={avgRating} />
                                                <span style={{ fontSize:"0.74rem", color:"#aaa" }}>{avgRating}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Rent Request Modal ── */}
            {showRentModal && isTenant && (
                <RentRequestModal
                    property={property}
                    rentRequest={rentRequest}
                    onClose={() => setShowRentModal(false)}
                    onSent={(req) => {
                        setRentRequest(req);
                        if (req) setShowRentModal(false);
                    }}
                />
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default PropertyDetail;
