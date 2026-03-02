import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { allItemsAPI, markAsSoldAPI } from "../../api/marketplaceAPI";

/* ══ CONSTANTS ══════════════════════════════════════════════════ */
const CATEGORIES = [
    { label:"All",         icon:"🏪", val:"" },
    { label:"Furniture",   icon:"🪑", val:"Furniture" },
    { label:"Electronics", icon:"📺", val:"Electronics" },
    { label:"Appliances",  icon:"🧹", val:"Appliances" },
    { label:"Books",       icon:"📚", val:"Books" },
    { label:"Clothing",    icon:"👔", val:"Clothing" },
    { label:"Sports",      icon:"⚽", val:"Sports" },
    { label:"Other",       icon:"📦", val:"Other" },
];

/* ══════════════════════════════════════════
   PAYMENT METHODS
══════════════════════════════════════════ */
const PAYMENT_METHODS = [
    { id:"bKash",  label:"bKash",  icon:"📱", color:"#E2136E", bg:"#fdf0f6", desc:"Mobile Banking" },
    { id:"Nagad",  label:"Nagad",  icon:"📲", color:"#F6831F", bg:"#fff7f0", desc:"Mobile Banking" },
    { id:"Rocket", label:"Rocket", icon:"🚀", color:"#8B1AF5", bg:"#f8f0ff", desc:"Dutch-Bangla Mobile" },
    { id:"Card",   label:"Debit / Credit Card", icon:"💳", color:"#1a1a2e", bg:"#f0f2ff", desc:"Visa · MasterCard" },
];

const GW_INP = {
    width:"100%", padding:"0.62rem 0.75rem", borderRadius:8,
    border:"1px solid #e0e0e0", fontSize:"0.85rem", boxSizing:"border-box",
    outline:"none", color:"#1a1a2e", background:"#fff",
};
const GWLabel = ({ text }) => (
    <label style={{fontSize:"0.75rem",fontWeight:700,color:"#888",textTransform:"uppercase",
        letterSpacing:"0.05em",display:"block",marginBottom:"0.3rem"}}>{text}</label>
);

/* ══════════════════════════════════════════
   CART SIDEBAR
══════════════════════════════════════════ */
const CartSidebar = ({ cart, onRemove, onCheckout, onClose }) => {
    const total = cart.reduce((s,i) => s + i.price, 0);
    return (
        <div style={{position:"fixed",inset:0,zIndex:1500,display:"flex",justifyContent:"flex-end"}} onClick={onClose}>
            <div style={{width:360,background:"#f5f6fa",boxShadow:"-4px 0 40px rgba(0,0,0,0.22)",
                display:"flex",flexDirection:"column",height:"100vh",overflowY:"auto"}}
                onClick={e=>e.stopPropagation()}>
                <div style={{padding:"1.2rem 1.3rem",borderBottom:"1px solid rgba(255,255,255,0.1)",
                    display:"flex",justifyContent:"space-between",alignItems:"center",
                    background:"linear-gradient(135deg,#1a1a2e 60%,#e94560)"}}>
                    <div style={{color:"#fff"}}>
                        <div style={{fontWeight:700,fontSize:"1rem"}}>🛒 My Cart</div>
                        <div style={{fontSize:"0.75rem",opacity:0.65}}>{cart.length} item{cart.length!==1?"s":""}</div>
                    </div>
                    <button onClick={onClose} style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",
                        color:"#fff",borderRadius:8,padding:"0.3rem 0.7rem",cursor:"pointer",fontSize:"0.9rem"}}>✕</button>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"0.8rem"}}>
                    {cart.length===0 ? (
                        <div style={{textAlign:"center",padding:"3rem 1rem",color:"#aaa"}}>
                            <div style={{fontSize:"2.5rem",marginBottom:"0.5rem"}}>🛒</div>
                            <p style={{fontWeight:600,color:"#888"}}>Your cart is empty</p>
                        </div>
                    ) : cart.map(item=>(
                        <div key={item._id} style={{display:"flex",gap:"0.75rem",padding:"0.75rem",
                            background:"#fff",border:"1px solid #eee",borderRadius:10,marginBottom:"0.5rem",
                            alignItems:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                            {item.images?.[0]
                                ? <img src={`/api/v1/get-file/${item.images[0]}`} alt=""
                                    style={{width:56,height:56,borderRadius:8,objectFit:"cover",flexShrink:0}}/>
                                : <div style={{width:56,height:56,borderRadius:8,background:"#f0f2ff",
                                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",flexShrink:0}}>📦</div>
                            }
                            <div style={{flex:1,minWidth:0}}>
                                <div style={{fontWeight:700,fontSize:"0.85rem",overflow:"hidden",textOverflow:"ellipsis",
                                    whiteSpace:"nowrap",color:"#1a1a2e"}}>{item.title}</div>
                                <div style={{fontSize:"0.72rem",color:"#aaa",marginTop:2}}>{item.condition}</div>
                                <div style={{fontWeight:700,color:"#e94560",fontSize:"0.88rem",marginTop:2}}>৳{item.price?.toLocaleString()}</div>
                            </div>
                            <button onClick={()=>onRemove(item._id)}
                                style={{background:"none",border:"none",color:"#ccc",cursor:"pointer",padding:"0.2rem 0.4rem",fontSize:"1rem",flexShrink:0}}>🗑</button>
                        </div>
                    ))}
                </div>
                {cart.length>0&&(
                    <div style={{padding:"1rem 1.2rem",borderTop:"1px solid #eee",background:"#fff"}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.4rem",fontSize:"0.83rem",color:"#aaa"}}>
                            <span>Subtotal</span><span style={{color:"#1a1a2e",fontWeight:600}}>৳{total.toLocaleString()}</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"1rem",fontWeight:800,fontSize:"1rem"}}>
                            <span style={{color:"#1a1a2e"}}>Total</span><span style={{color:"#e94560"}}>৳{total.toLocaleString()}</span>
                        </div>
                        <button onClick={onCheckout}
                            style={{width:"100%",background:"linear-gradient(90deg,#e94560,#c0392b)",color:"#fff",
                                border:"none",borderRadius:10,padding:"0.9rem",fontWeight:700,fontSize:"0.92rem",
                                cursor:"pointer",boxShadow:"0 4px 14px rgba(233,69,96,0.35)"}}>
                            Checkout →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ══ PAYMENT GATEWAY ════════════════════════════════════════════ */
const MarketplaceGateway = ({ cart, onClose, onSuccess }) => {
    const total   = cart.reduce((s,i)=>s+i.price, 0);
    const [txnRef]    = useState(()=>"MKT-"+Date.now()+"-"+Math.random().toString(36).slice(2,7).toUpperCase());
    const [step,      setStep]      = useState("info");
    const [method,    setMethod]    = useState(null);
    const [accountNo, setAccountNo] = useState("");
    const [pin,       setPin]       = useState("");
    const [otp,       setOtp]       = useState("");
    const [cardNum,   setCardNum]   = useState("");
    const [cardExp,   setCardExp]   = useState("");
    const [cardCvv,   setCardCvv]   = useState("");
    const [cardName,  setCardName]  = useState("");
    const [error,     setError]     = useState("");
    const [info,      setInfo]      = useState({fullName:"",phone:"",email:"",addressLine:"",city:"",area:""});
    const setI = (k,v) => setInfo(p=>({...p,[k]:v}));
    const isMobile = ["bKash","Nagad","Rocket"].includes(method?.id);
    const isCard   = method?.id==="Card";
    const STEPS    = ["Order Info","Payment","Confirm"];
    const stepIdx  = step==="info"?0:(step==="select"||step==="details"||step==="otp")?1:2;

    const handleInfoSubmit = e=>{
        e.preventDefault(); setError("");
        if(!/^01[3-9][0-9]{8}$/.test(info.phone)){setError("Enter a valid 11-digit phone number.");return;}
        setStep("select");
    };
    const handleDetails = e=>{
        e.preventDefault(); setError("");
        if(isMobile){
            if(!/^01[3-9][0-9]{8}$/.test(accountNo)){setError("Valid mobile number required.");return;}
            if(pin.length!==5){setError("PIN must be 5 digits.");return;}
            setStep("otp");
        } else if(isCard){
            if(cardNum.replace(/\s/g,"").length!==16){setError("Card number must be 16 digits.");return;}
            if(!/^\d{2}\/\d{2}$/.test(cardExp)){setError("Expiry must be MM/YY.");return;}
            if(cardCvv.length!==3){setError("CVV must be 3 digits.");return;}
            if(!cardName.trim()){setError("Enter cardholder name.");return;}
            setStep("processing");
            setTimeout(()=>{setStep("success");onSuccess(txnRef, info);},2200);
        }
    };
    const handleOtp = e=>{
        e.preventDefault();
        setStep("processing");
        setTimeout(()=>{setStep("success");onSuccess(txnRef, info);},2000);
    };

    return(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:2000,
            display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}
            onClick={step==="success"?onClose:undefined}>
            <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,
                maxHeight:"92vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}
                onClick={e=>e.stopPropagation()}>
                {/* Header */}
                <div style={{background:"linear-gradient(135deg,#1a1a2e 60%,#e94560)",padding:"1.2rem 1.5rem",
                    borderRadius:"14px 14px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:5}}>
                    <div>
                        <div style={{fontWeight:800,color:"#fff",fontSize:"1rem"}}>Bariwala Market</div>
                        <div style={{color:"rgba(255,255,255,0.55)",fontSize:"0.75rem"}}>Secure Checkout · Simulation</div>
                    </div>
                    {(step==="info"||step==="success")&&<button onClick={onClose} style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",borderRadius:8,padding:"0.3rem 0.7rem",cursor:"pointer"}}>✕</button>}
                </div>
                {/* Step bar */}
                {step!=="processing"&&step!=="success"&&(
                    <div style={{display:"flex",borderBottom:"1px solid #f0f0f0"}}>
                        {STEPS.map((s,i)=>(
                            <div key={s} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                                padding:"0.75rem 0",borderBottom:`2px solid ${i===stepIdx?"#e94560":"transparent"}`}}>
                                <div style={{width:22,height:22,borderRadius:"50%",marginBottom:"0.25rem",
                                    background:i<stepIdx?"#27ae60":i===stepIdx?"#e94560":"#eee",
                                    color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.7rem",fontWeight:700}}>
                                    {i<stepIdx?"✓":i+1}
                                </div>
                                <span style={{fontSize:"0.68rem",fontWeight:i===stepIdx?700:400,color:i===stepIdx?"#e94560":"#aaa"}}>{s}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div style={{padding:"1.2rem 1.5rem"}}>
                    {/* Order summary */}
                    {step!=="success"&&(
                        <div style={{background:"#f8f9fa",borderRadius:10,padding:"0.8rem 1rem",marginBottom:"1rem"}}>
                            <div style={{fontSize:"0.68rem",fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.4rem"}}>Order Summary</div>
                            {cart.map(i=>(
                                <div key={i._id} style={{display:"flex",justifyContent:"space-between",fontSize:"0.82rem",marginBottom:"0.15rem",color:"#444"}}>
                                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:240}}>{i.title}</span>
                                    <span style={{fontWeight:600,flexShrink:0,marginLeft:"0.5rem"}}>৳{i.price?.toLocaleString()}</span>
                                </div>
                            ))}
                            <div style={{borderTop:"1px solid #eee",marginTop:"0.5rem",paddingTop:"0.5rem",display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:"0.9rem"}}>
                                <span style={{color:"#555"}}>Total</span><span style={{color:"#e94560"}}>৳{total.toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                    {step==="info"&&(
                        <form onSubmit={handleInfoSubmit}>
                            {error&&<p style={{color:"#e74c3c",fontSize:"0.82rem",background:"#fdecea",padding:"0.45rem 0.7rem",borderRadius:7,marginBottom:"0.7rem"}}>{error}</p>}
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem",marginBottom:"0.6rem"}}>
                                <div><GWLabel text="Full Name *"/><input value={info.fullName} onChange={e=>setI("fullName",e.target.value)} placeholder="Your name" required style={GW_INP}/></div>
                                <div><GWLabel text="Phone *"/><input value={info.phone} onChange={e=>setI("phone",e.target.value.replace(/\D/g,"").slice(0,11))} placeholder="01XXXXXXXXX" type="tel" required style={GW_INP}/></div>
                            </div>
                            <div style={{marginBottom:"0.6rem"}}><GWLabel text="Email"/><input value={info.email} onChange={e=>setI("email",e.target.value)} placeholder="you@email.com" type="email" style={GW_INP}/></div>
                            <div style={{marginBottom:"0.6rem"}}><GWLabel text="Street Address *"/><input value={info.addressLine} onChange={e=>setI("addressLine",e.target.value)} placeholder="House, Road, Block" required style={GW_INP}/></div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem",marginBottom:"0.6rem"}}>
                                <div><GWLabel text="City *"/><input value={info.city} onChange={e=>setI("city",e.target.value)} placeholder="Dhaka" required style={GW_INP}/></div>
                                <div><GWLabel text="Area *"/><input value={info.area} onChange={e=>setI("area",e.target.value)} placeholder="Mirpur 10" required style={GW_INP}/></div>
                            </div>
                            <button type="submit" style={{width:"100%",background:"#e94560",color:"#fff",border:"none",borderRadius:9,padding:"0.85rem",fontWeight:700,cursor:"pointer",fontSize:"0.9rem",marginTop:"0.3rem"}}>Continue to Payment →</button>
                        </form>
                    )}
                    {step==="select"&&(
                        <>
                            <button onClick={()=>setStep("info")} style={{background:"none",border:"none",color:"#888",fontSize:"0.82rem",cursor:"pointer",padding:0,marginBottom:"0.8rem"}}>← Back</button>
                            <p style={{fontWeight:700,fontSize:"0.88rem",color:"#555",marginBottom:"0.75rem"}}>Choose Payment Method</p>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem"}}>
                                {PAYMENT_METHODS.map(m=>(
                                    <button key={m.id} onClick={()=>{setMethod(m);setStep("details");}}
                                        style={{background:m.bg,border:`2px solid ${m.color}30`,borderRadius:10,padding:"0.8rem",display:"flex",alignItems:"center",gap:"0.6rem",cursor:"pointer",textAlign:"left"}}>
                                        <span style={{fontSize:"1.5rem"}}>{m.icon}</span>
                                        <div>
                                            <div style={{fontWeight:700,color:m.color,fontSize:"0.82rem"}}>{m.label}</div>
                                            <div style={{fontSize:"0.68rem",color:"#999"}}>{m.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                    {step==="details"&&(
                        <>
                            <button onClick={()=>setStep("select")} style={{background:"none",border:"none",color:"#888",fontSize:"0.82rem",cursor:"pointer",padding:0,marginBottom:"0.8rem"}}>← Back</button>
                            {error&&<p style={{color:"#e74c3c",fontSize:"0.82rem",background:"#fdecea",padding:"0.45rem 0.7rem",borderRadius:7,marginBottom:"0.6rem"}}>{error}</p>}
                            <form onSubmit={handleDetails}>
                                {isMobile&&(<>
                                    <div style={{marginBottom:"0.7rem"}}><GWLabel text={`${method.label} Number`}/><input value={accountNo} onChange={e=>setAccountNo(e.target.value.replace(/\D/g,"").slice(0,11))} placeholder="01XXXXXXXXX" type="tel" required style={GW_INP}/></div>
                                    <div style={{marginBottom:"0.7rem"}}><GWLabel text="PIN (5 digits)"/><input value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,5))} placeholder="● ● ● ● ●" type="password" maxLength={5} required style={GW_INP}/></div>
                                </>)}
                                {isCard&&(<>
                                    <div style={{marginBottom:"0.7rem"}}><GWLabel text="Card Number"/><input value={cardNum} onChange={e=>setCardNum(e.target.value.replace(/\D/g,"").replace(/(.{4})/g,"$1 ").trim().slice(0,19))} placeholder="1234 5678 9012 3456" required style={GW_INP}/></div>
                                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem",marginBottom:"0.7rem"}}>
                                        <div><GWLabel text="Expiry MM/YY"/><input value={cardExp} onChange={e=>{let v=e.target.value.replace(/\D/g,"");if(v.length>=3)v=v.slice(0,2)+"/"+v.slice(2,4);setCardExp(v);}} placeholder="06/28" maxLength={5} required style={GW_INP}/></div>
                                        <div><GWLabel text="CVV"/><input value={cardCvv} onChange={e=>setCardCvv(e.target.value.replace(/\D/g,"").slice(0,3))} placeholder="123" type="password" maxLength={3} required style={GW_INP}/></div>
                                    </div>
                                    <div style={{marginBottom:"0.7rem"}}><GWLabel text="Cardholder Name"/><input value={cardName} onChange={e=>setCardName(e.target.value)} placeholder="As on card" required style={GW_INP}/></div>
                                </>)}
                                <button type="submit" style={{width:"100%",background:method.color,color:"#fff",border:"none",borderRadius:9,padding:"0.82rem",fontWeight:700,cursor:"pointer",fontSize:"0.88rem",marginTop:"0.3rem"}}>
                                    {isMobile?`Send OTP to ${accountNo||"..."}`:`Pay ৳${total.toLocaleString()}`}
                                </button>
                            </form>
                        </>
                    )}
                    {step==="otp"&&(
                        <>
                            <div style={{textAlign:"center",marginBottom:"1rem"}}>
                                <div style={{fontSize:"2.2rem",marginBottom:"0.3rem"}}>{method?.icon}</div>
                                <h4 style={{margin:"0 0 0.3rem",color:"#1a1a2e"}}>Enter OTP</h4>
                                <p style={{fontSize:"0.83rem",color:"#888",margin:0}}>Sent to <strong>{accountNo}</strong></p>
                            </div>
                            <div style={{background:"#fff8e1",border:"1px solid #f5c518",borderRadius:8,padding:"0.55rem 0.85rem",marginBottom:"0.9rem",fontSize:"0.78rem",color:"#856404"}}>
                                🧪 <strong>Demo:</strong> Enter any 6 digits to proceed.
                            </div>
                            <form onSubmit={handleOtp}>
                                <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}
                                    placeholder="● ● ● ● ● ●" maxLength={6}
                                    style={{...GW_INP,textAlign:"center",fontSize:"1.4rem",letterSpacing:8,marginBottom:"0.8rem"}} required/>
                                <button type="submit" style={{width:"100%",background:method?.color,color:"#fff",border:"none",borderRadius:9,padding:"0.82rem",fontWeight:700,cursor:"pointer"}}>Verify & Pay</button>
                            </form>
                        </>
                    )}
                    {step==="processing"&&(
                        <div style={{textAlign:"center",padding:"2.5rem 0"}}>
                            <div style={{margin:"0 auto 1rem",width:44,height:44,border:"4px solid #eee",borderTop:`4px solid ${method?.color||"#e94560"}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                            <h4 style={{color:"#1a1a2e",margin:"0 0 0.5rem"}}>Processing Payment…</h4>
                            <p style={{fontSize:"0.82rem",color:"#aaa"}}>Please wait.</p>
                        </div>
                    )}
                    {step==="success"&&(
                        <div style={{textAlign:"center",padding:"0.5rem 0"}}>
                            <div style={{width:64,height:64,borderRadius:"50%",background:"#f0faf4",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem"}}>
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                            </div>
                            <h3 style={{color:"#27ae60",margin:"0 0 0.3rem"}}>Order Confirmed!</h3>
                            <p style={{color:"#888",fontSize:"0.83rem",marginBottom:"1.2rem"}}>Your order is being processed.</p>
                            <div style={{background:"#f8f9fa",borderRadius:10,padding:"1rem",textAlign:"left",marginBottom:"1rem"}}>
                                {[["Txn Ref",txnRef],["Method",method?.label],["Amount","৳"+total.toLocaleString()],["Deliver To",`${info.fullName}, ${info.area}, ${info.city}`]].map(([k,v])=>(
                                    <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:"0.82rem",marginBottom:"0.28rem",gap:"0.5rem"}}>
                                        <span style={{color:"#888"}}>{k}</span>
                                        <span style={{fontWeight:600,color:k==="Amount"?"#27ae60":k==="Txn Ref"?"#2980b9":"#1a1a2e",fontFamily:k==="Txn Ref"?"monospace":"inherit",textAlign:"right"}}>{v}</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={onClose} style={{width:"100%",background:"#1a1a2e",color:"#fff",border:"none",borderRadius:9,padding:"0.8rem",fontWeight:700,cursor:"pointer"}}>Done</button>
                        </div>
                    )}
                </div>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
};

/* ══ PRODUCT CARD ════════════════════════════════════════════════ */
const ProductCard = ({ item, inCart, onAddCart }) => {
    const [hov, setHov] = useState(false);
    const img = item.images?.[0] ? `/api/v1/get-file/${item.images[0]}` : null;
    return (
        <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
            style={{background:"#fff",borderRadius:12,overflow:"hidden",cursor:"pointer",
                border:`1px solid ${hov?"#e94560":"#f0f0f0"}`,
                transform:hov?"translateY(-3px)":"translateY(0)",
                boxShadow:hov?"0 8px 24px rgba(233,69,96,0.13)":"0 2px 8px rgba(0,0,0,0.06)",
                transition:"all 0.18s"}}>
            <div style={{position:"relative",background:"#f5f6fa",aspectRatio:"1",overflow:"hidden"}}>
                {img
                    ? <img src={img} alt={item.title} style={{width:"100%",height:"100%",objectFit:"cover",
                        transform:hov?"scale(1.04)":"scale(1)",transition:"transform 0.4s"}}/>
                    : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"3rem",color:"#ddd"}}>📦</div>
                }
                <span style={{position:"absolute",top:8,left:8,background:item.condition==="New"?"#27ae60":"#e94560",
                    color:"#fff",fontSize:"0.62rem",fontWeight:700,padding:"0.18rem 0.52rem",borderRadius:20}}>
                    {item.condition}
                </span>
                <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(26,26,46,0.9)",
                    padding:"0.55rem 0.6rem",transform:hov?"translateY(0)":"translateY(100%)",transition:"transform 0.25s",display:"flex",gap:"0.4rem"}}>
                    <button onClick={e=>{e.stopPropagation();onAddCart(item);}} disabled={inCart}
                        style={{flex:1,background:inCart?"#27ae60":"#e94560",color:"#fff",border:"none",
                            padding:"0.42rem",fontWeight:700,fontSize:"0.74rem",cursor:inCart?"default":"pointer",borderRadius:6}}>
                        {inCart?"✓ Added":"+ Cart"}
                    </button>
                    <Link to={`/marketplace/item/${item._id}`}
                        style={{background:"rgba(255,255,255,0.12)",color:"#fff",border:"1px solid rgba(255,255,255,0.2)",
                            padding:"0.42rem 0.65rem",fontWeight:700,fontSize:"0.74rem",textDecoration:"none",borderRadius:6,display:"flex",alignItems:"center"}}>
                        View
                    </Link>
                </div>
            </div>
            <div style={{padding:"0.75rem 0.85rem 0.9rem"}}>
                <div style={{fontWeight:700,fontSize:"0.87rem",color:"#1a1a2e",marginBottom:"0.15rem",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</div>
                <div style={{fontSize:"0.72rem",color:"#aaa",marginBottom:"0.3rem"}}>{item.sellerInfo?.[0]?.name||"Marketplace"}</div>
                <div style={{fontWeight:800,fontSize:"0.95rem",color:"#e94560"}}>৳{item.price?.toLocaleString()}</div>
            </div>
        </div>
    );
};

/* ══ WEEKLY DEALS PANEL ═════════════════════════════════════════ */
const DealsPanel = ({ items, cart, onAddCart }) => {
    const deals = items.slice(0,5);
    if(!deals.length) return null;
    return (
        <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:"1px solid #f0f0f0"}}>
            <div style={{background:"linear-gradient(90deg,#1a1a2e,#2c3e50)",padding:"0.75rem 1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:"#fff",fontWeight:700,fontSize:"0.78rem",letterSpacing:"0.04em",textTransform:"uppercase"}}>🔥 Weekly Best Deals</span>
                <span style={{color:"#e94560",fontSize:"0.68rem",fontWeight:700}}>Save 50%</span>
            </div>
            {deals.map((item,i)=>{
                const img    = item.images?.[0] ? `/api/v1/get-file/${item.images[0]}` : null;
                const inCart = cart.some(c=>c._id===item._id);
                return(
                    <div key={item._id} style={{display:"flex",gap:"0.65rem",padding:"0.6rem 0.8rem",alignItems:"center",
                        borderBottom:i<deals.length-1?"1px solid #f5f5f5":"none",transition:"background 0.15s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#fafafa"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        {img
                            ? <img src={img} alt="" style={{width:44,height:44,borderRadius:7,objectFit:"cover",flexShrink:0,border:"1px solid #f0f0f0"}}/>
                            : <div style={{width:44,height:44,borderRadius:7,background:"#f0f2ff",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem"}}>📦</div>
                        }
                        <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:600,fontSize:"0.78rem",color:"#1a1a2e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</div>
                            <span style={{fontWeight:800,color:"#e94560",fontSize:"0.82rem"}}>৳{item.price?.toLocaleString()}</span>
                        </div>
                        <button onClick={()=>onAddCart(item)} disabled={inCart}
                            style={{background:inCart?"#f0faf4":"#fff0f2",color:inCart?"#27ae60":"#e94560",
                                border:`1px solid ${inCart?"#c3e6cb":"#f5c6cb"}`,
                                borderRadius:7,padding:"0.28rem 0.6rem",fontSize:"0.7rem",fontWeight:700,cursor:inCart?"default":"pointer",flexShrink:0}}>
                            {inCart?"✓":"+"}
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

/* ══ HERO BANNER ════════════════════════════════════════════════ */
const HeroBanner = ({ items, cart, onAddCart }) => {
    const [idx, setIdx] = useState(0);
    const featured = items.slice(0,5);
    useEffect(()=>{
        if(featured.length<2) return;
        const t = setInterval(()=>setIdx(i=>(i+1)%featured.length), 4500);
        return ()=>clearInterval(t);
    },[featured.length]);

    if(!featured.length) return(
        <div style={{background:"linear-gradient(135deg,#1a1a2e 60%,#16213e)",minHeight:340,
            display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.25)",fontSize:"0.9rem"}}>
            🏪 Loading marketplace…
        </div>
    );
    const item   = featured[idx];
    const img    = item.images?.[0] ? `/api/v1/get-file/${item.images[0]}` : null;
    const inCart = cart.some(c=>c._id===item._id);
    return(
        <div style={{position:"relative",background:"linear-gradient(135deg,#1a1a2e 55%,#16213e)",overflow:"hidden",minHeight:340}}>
            {img&&<img src={img} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.07,filter:"blur(4px)"}}/>}
            <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(26,26,46,0.97) 38%,rgba(233,69,96,0.14))"}}/>
            <div style={{position:"relative",zIndex:2,maxWidth:1200,margin:"0 auto",padding:"3rem 2rem",
                display:"grid",gridTemplateColumns:"1fr 1fr",gap:"2rem",alignItems:"center",boxSizing:"border-box",minHeight:340}}>
                <div>
                    <span style={{display:"inline-block",background:"#e94560",color:"#fff",fontSize:"0.63rem",fontWeight:700,
                        letterSpacing:"0.12em",textTransform:"uppercase",padding:"0.24rem 0.8rem",borderRadius:20,marginBottom:"0.9rem"}}>
                        {item.condition==="New"?"✨ New Arrival":"🔥 Featured Item"}
                    </span>
                    <h1 style={{fontSize:"clamp(1.5rem,2.8vw,2.4rem)",fontWeight:900,color:"#fff",lineHeight:1.1,
                        letterSpacing:"-0.02em",margin:"0 0 0.65rem",maxWidth:380}}>{item.title}</h1>
                    <p style={{color:"rgba(255,255,255,0.48)",fontSize:"0.84rem",marginBottom:"1.2rem",lineHeight:1.7,maxWidth:340}}>
                        {item.description||"Quality item available for purchase. Message the seller for details."}
                    </p>
                    <div style={{fontSize:"1.8rem",fontWeight:900,color:"#e94560",marginBottom:"1.2rem"}}>৳{item.price?.toLocaleString()}</div>
                    <div style={{display:"flex",gap:"0.65rem",flexWrap:"wrap"}}>
                        <button onClick={()=>onAddCart(item)} disabled={inCart}
                            style={{background:inCart?"rgba(39,174,96,0.85)":"#e94560",color:"#fff",border:"none",
                                padding:"0.72rem 1.5rem",fontWeight:700,fontSize:"0.85rem",cursor:inCart?"default":"pointer",
                                borderRadius:9,boxShadow:"0 4px 14px rgba(233,69,96,0.35)"}}>
                            {inCart?"✓ In Cart":"Add to Cart"}
                        </button>
                        <Link to={`/marketplace/item/${item._id}`}
                            style={{background:"rgba(255,255,255,0.07)",color:"#fff",border:"1px solid rgba(255,255,255,0.18)",
                                padding:"0.72rem 1.3rem",fontWeight:700,fontSize:"0.85rem",textDecoration:"none",borderRadius:9,display:"flex",alignItems:"center"}}>
                            View Details
                        </Link>
                    </div>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {img
                        ? <img src={img} alt={item.title} style={{width:"100%",maxWidth:300,maxHeight:280,objectFit:"contain",
                            borderRadius:12,filter:"drop-shadow(0 16px 48px rgba(233,69,96,0.22))",transition:"opacity 0.3s"}}/>
                        : <div style={{width:220,height:220,background:"rgba(255,255,255,0.04)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"5rem",color:"rgba(255,255,255,0.08)"}}>📦</div>
                    }
                </div>
            </div>
            {featured.length>1&&(
                <div style={{position:"relative",zIndex:2,display:"flex",justifyContent:"center",gap:"0.4rem",paddingBottom:"1.2rem"}}>
                    {featured.map((_,i)=>(
                        <button key={i} onClick={()=>setIdx(i)}
                            style={{width:i===idx?22:7,height:7,borderRadius:4,border:"none",padding:0,
                                background:i===idx?"#e94560":"rgba(255,255,255,0.2)",cursor:"pointer",transition:"all 0.25s"}}/>
                    ))}
                </div>
            )}
            {featured.length>1&&(<>
                <button onClick={()=>setIdx(i=>(i-1+featured.length)%featured.length)}
                    style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",zIndex:3,
                        background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.14)",
                        color:"#fff",width:36,height:36,borderRadius:"50%",cursor:"pointer",
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.05rem"}}>‹</button>
                <button onClick={()=>setIdx(i=>(i+1)%featured.length)}
                    style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",zIndex:3,
                        background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.14)",
                        color:"#fff",width:36,height:36,borderRadius:"50%",cursor:"pointer",
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.05rem"}}>›</button>
            </>)}
        </div>
    );
};

/* ══ PROMO BANNERS ══════════════════════════════════════════════ */
const PromoBanners = () => (
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.75rem",
        maxWidth:1200,margin:"1.4rem auto 0",padding:"0 1.5rem",boxSizing:"border-box"}}>
        {[
            {bg:"linear-gradient(135deg,#1a1a2e,#2c3e50)",tag:"UP TO 50% OFF",title:"Smart Deals",     sub:"Electronics & Gadgets",  emoji:"⌚"},
            {bg:"linear-gradient(135deg,#e94560,#c0392b)",tag:"EXCLUSIVE",    title:"Fashion Picks",   sub:"Clothing & Accessories", emoji:"👔"},
            {bg:"linear-gradient(135deg,#2980b9,#1a5276)",tag:"NEW ARRIVALS", title:"Home Essentials", sub:"Furniture & Appliances", emoji:"🛋️"},
        ].map((b,i)=>(
            <div key={i} style={{background:b.bg,borderRadius:12,padding:"1.1rem 1.2rem",display:"flex",
                justifyContent:"space-between",alignItems:"center",minHeight:84,cursor:"pointer",
                boxShadow:"0 2px 10px rgba(0,0,0,0.12)",transition:"transform 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
                <div>
                    <div style={{fontSize:"0.58rem",fontWeight:700,color:"rgba(255,255,255,0.55)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"0.18rem"}}>{b.tag}</div>
                    <div style={{fontWeight:800,color:"#fff",fontSize:"0.9rem",lineHeight:1.2}}>{b.title}</div>
                    <div style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.5)",marginTop:"0.18rem"}}>{b.sub}</div>
                </div>
                <span style={{fontSize:"2rem",opacity:0.85}}>{b.emoji}</span>
            </div>
        ))}
    </div>
);

/* ══ BRAND STRIP ════════════════════════════════════════════════ */
const BrandStrip = () => (
    <div style={{maxWidth:1200,margin:"1.6rem auto 0",padding:"0 1.5rem",boxSizing:"border-box"}}>
        <div style={{background:"#fff",borderRadius:12,padding:"0.9rem 1.4rem",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",border:"1px solid #f0f0f0"}}>
            <div style={{fontSize:"0.65rem",fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.65rem"}}>Top Brands Listed</div>
            <div style={{display:"flex",gap:"0.45rem",flexWrap:"wrap"}}>
                {["Apple","Samsung","Sony","LG","Asus","Dell","HP","Xiaomi","OnePlus","Huawei"].map(b=>(
                    <div key={b} style={{background:"#f5f6fa",borderRadius:8,padding:"0.38rem 0.9rem",
                        fontSize:"0.76rem",fontWeight:600,color:"#555",border:"1px solid #eee",cursor:"pointer",transition:"all 0.15s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="#1a1a2e";e.currentTarget.style.color="#fff";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="#f5f6fa";e.currentTarget.style.color="#555";}}>
                        {b}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

/* ══ MAIN PAGE ══════════════════════════════════════════════════ */
const PAGE_SIZE = 20;

const AllItems = () => {
    const [items,        setItems]        = useState([]);
    const [allItems,     setAllItems]     = useState([]);
    const [page,         setPage]         = useState(1);
    const [hasMore,      setHasMore]      = useState(true);
    const [condition,    setCondition]    = useState("");
    const [minPrice,     setMinPrice]     = useState("");
    const [maxPrice,     setMaxPrice]     = useState("");
    const [category,     setCategory]     = useState("");
    const [loading,      setLoading]      = useState(true);
    const [loadingMore,  setLoadingMore]  = useState(false);
    const [cart,         setCart]         = useState(() => {
        try { return JSON.parse(localStorage.getItem("mktCart") || "[]"); } catch { return []; }
    });
    const [showCart,     setShowCart]     = useState(false);
    const [showGateway,  setShowGateway]  = useState(false);
    const [orderSuccess, setOrderSuccess] = useState("");
    const productsRef    = useRef(null);
    const sentinelRef    = useRef(null); // bottom of grid — triggers load-more

    // ── Load page 1 (or on filter change) ──
    const loadFresh = async (params={}) => {
        setLoading(true);
        setPage(1);
        try {
            const res = await allItemsAPI({
                condition: params.condition ?? condition,
                minPrice:  params.minPrice  ?? minPrice,
                maxPrice:  params.maxPrice  ?? maxPrice,
                pageNo: 1, perPage: PAGE_SIZE,
            });
            const fetched = res.data.data[0]?.items || [];
            const total   = res.data.data[0]?.totalCount?.[0]?.count || 0;
            setItems(fetched);
            setAllItems(fetched);
            setHasMore(fetched.length < total);
        } finally { setLoading(false); }
    };

    // ── Load next page (infinite scroll) ──
    const loadMore = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        const nextPage = page + 1;
        try {
            const res = await allItemsAPI({
                condition, minPrice, maxPrice,
                pageNo: nextPage, perPage: PAGE_SIZE,
            });
            const fetched = res.data.data[0]?.items || [];
            const total   = res.data.data[0]?.totalCount?.[0]?.count || 0;
            setItems(prev => {
                const ids = new Set(prev.map(i => i._id));
                const merged = [...prev, ...fetched.filter(i => !ids.has(i._id))];
                setHasMore(merged.length < total);
                return merged;
            });
            setPage(nextPage);
        } finally { setLoadingMore(false); }
    };

    useEffect(() => { loadFresh(); }, []); // eslint-disable-line

    // ── Intersection Observer for infinite scroll ──
    useEffect(() => {
        if (!sentinelRef.current) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) loadMore(); },
            { threshold: 0.1 }
        );
        obs.observe(sentinelRef.current);
        return () => obs.disconnect();
    }); // re-attach on every render so loadMore closure stays fresh

    const applyCondition = val => { setCondition(val); loadFresh({ condition: val }); };
    const applyFilters   = ()  => { loadFresh({ condition, minPrice, maxPrice }); productsRef.current?.scrollIntoView({ behavior:"smooth" }); };
    const resetFilters   = ()  => { setCondition(""); setMinPrice(""); setMaxPrice(""); setCategory(""); loadFresh({ condition:"", minPrice:"", maxPrice:"" }); };

    const addToCart  = item => setCart(prev => {
        if (prev.find(c => c._id === item._id)) return prev;
        const next = [...prev, item];
        localStorage.setItem("mktCart", JSON.stringify(next));
        return next;
    });
    const removeCart = id => setCart(prev => {
        const next = prev.filter(c => c._id !== id);
        localStorage.setItem("mktCart", JSON.stringify(next));
        return next;
    });

    // Remove sold items from the grid immediately after payment
    const removeSoldItems = soldIds => {
        const idSet = new Set(soldIds);
        setItems(prev    => prev.filter(i    => !idSet.has(i._id)));
        setAllItems(prev => prev.filter(i    => !idSet.has(i._id)));
    };

    // Called by gateway on success
    const handlePaymentSuccess = async (ref, gatewayInfo) => {
        // Mark each cart item as sold in the DB (fire-and-forget per item)
        for (const item of cart) {
            try {
                await markAsSoldAPI(item._id, {
                    buyerName:  gatewayInfo?.fullName  || "",
                    buyerPhone: gatewayInfo?.phone     || "",
                    buyerArea:  gatewayInfo?.area      || "",
                    buyerCity:  gatewayInfo?.city      || "",
                    txnRef:     ref,
                });
            } catch { /* non-blocking */ }
        }
        removeSoldItems(cart.map(i => i._id));
        setCart([]);
        localStorage.removeItem("mktCart");
        setShowGateway(false);
        setOrderSuccess(`Order confirmed! Ref: ${ref}`);
        setTimeout(() => setOrderSuccess(""), 8000);
    };

    return(
        <div style={{background:"#f5f6fa",minHeight:"100vh"}}>
            <style>{`
                @keyframes spin    { to { transform: rotate(360deg); } }
                @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
            `}</style>

            {/* ══ TOP NAV BAR ══ */}
            <div style={{background:"#1a1a2e",borderBottom:"2px solid #e94560",padding:"0 2rem",
                display:"flex",justifyContent:"space-between",alignItems:"center",height:46,
                position:"sticky",top:0,zIndex:200,boxShadow:"0 2px 12px rgba(0,0,0,0.3)"}}>
                <div style={{display:"flex",gap:0,alignItems:"center",height:"100%"}}>
                    <span style={{fontSize:"0.72rem",fontWeight:800,color:"#e94560",letterSpacing:"0.12em",textTransform:"uppercase",marginRight:"1.5rem"}}>NexMart</span>
                    {CATEGORIES.slice(0,6).map(c=>(
                        <button key={c.val} onClick={()=>setCategory(c.val)}
                            style={{background:"none",border:"none",color:category===c.val?"#fff":"rgba(255,255,255,0.42)",
                                cursor:"pointer",fontSize:"0.78rem",fontWeight:600,padding:"0 0.8rem",height:"100%",
                                borderBottom:category===c.val?"2px solid #e94560":"2px solid transparent",
                                letterSpacing:"0.01em",transition:"color 0.15s",whiteSpace:"nowrap"}}>
                            {c.icon} {c.label}
                        </button>
                    ))}
                </div>
                <div style={{display:"flex",gap:"0.75rem",alignItems:"center",flexShrink:0}}>
                    <Link to="/" style={{color:"rgba(255,255,255,0.42)",fontSize:"0.77rem",textDecoration:"none"}}>🏠 Rentals</Link>
                    <Link to="/marketplace/add-item" style={{color:"rgba(255,255,255,0.42)",fontSize:"0.77rem",textDecoration:"none"}}>+ Sell</Link>
                    <button onClick={()=>setShowCart(true)}
                        style={{background:"#e94560",color:"#fff",border:"none",padding:"0.4rem 1rem",cursor:"pointer",
                            fontWeight:700,fontSize:"0.79rem",borderRadius:7,display:"flex",alignItems:"center",gap:"0.45rem"}}>
                        🛒 Cart
                        {cart.length>0&&<span style={{background:"#fff",color:"#e94560",borderRadius:"50%",width:17,height:17,
                            display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.58rem",fontWeight:800}}>{cart.length}</span>}
                    </button>
                </div>
            </div>

            {/* ORDER SUCCESS */}
            {orderSuccess&&<div style={{background:"#f0faf4",borderBottom:"1px solid #c3e6cb",padding:"0.65rem 2rem",color:"#1a6e3c",fontSize:"0.85rem",fontWeight:600}}>✅ {orderSuccess}</div>}

            {/* ══ HERO ══ */}
            <HeroBanner items={allItems} cart={cart} onAddCart={addToCart}/>

            {/* ══ PROMO BANNERS ══ */}
            <PromoBanners/>

            {/* ══ 3-COL LAYOUT ══ */}
            <div style={{maxWidth:1200,margin:"1.5rem auto 2rem",padding:"0 1.5rem",
                display:"grid",gridTemplateColumns:"196px 1fr 236px",gap:"1.1rem",
                alignItems:"flex-start",boxSizing:"border-box"}}>

                {/* FILTER SIDEBAR */}
                <div style={{background:"#fff",borderRadius:12,padding:"0.95rem",
                    boxShadow:"0 2px 10px rgba(0,0,0,0.06)",border:"1px solid #f0f0f0",position:"sticky",top:54}}>
                    <h3 style={{fontWeight:800,fontSize:"0.78rem",color:"#1a1a2e",margin:"0 0 0.9rem",
                        textTransform:"uppercase",letterSpacing:"0.07em",display:"flex",alignItems:"center",gap:"0.4rem"}}>
                        <span>🔍</span> Filter
                    </h3>
                    <div style={{marginBottom:"0.9rem"}}>
                        <div style={{fontSize:"0.62rem",fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.45rem"}}>Category</div>
                        {CATEGORIES.map(c=>(
                            <button key={c.val} onClick={()=>setCategory(c.val)}
                                style={{display:"flex",alignItems:"center",gap:"0.45rem",width:"100%",
                                    background:category===c.val?"#fff0f2":"none",border:"none",
                                    padding:"0.35rem 0.45rem",cursor:"pointer",borderRadius:6,fontSize:"0.79rem",fontWeight:600,
                                    color:category===c.val?"#e94560":"#555",textAlign:"left",transition:"all 0.13s"}}>
                                <span>{c.icon}</span>{c.label}
                            </button>
                        ))}
                    </div>
                    <div style={{borderTop:"1px solid #f5f5f5",paddingTop:"0.75rem",marginBottom:"0.9rem"}}>
                        <div style={{fontSize:"0.62rem",fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.45rem"}}>Condition</div>
                        {[["","All"],["New","New"],["Used","Used"]].map(([val,lbl])=>(
                            <label key={val} style={{display:"flex",alignItems:"center",gap:"0.45rem",padding:"0.28rem 0",cursor:"pointer",fontSize:"0.79rem",color:condition===val?"#e94560":"#555",fontWeight:600}}>
                                <input type="radio" name="cond" value={val} checked={condition===val} onChange={()=>setCondition(val)} style={{accentColor:"#e94560",width:"auto"}}/>
                                {lbl}
                            </label>
                        ))}
                    </div>
                    <div style={{borderTop:"1px solid #f5f5f5",paddingTop:"0.75rem",marginBottom:"0.9rem"}}>
                        <div style={{fontSize:"0.62rem",fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.45rem"}}>Price (৳)</div>
                        <input type="number" value={minPrice} onChange={e=>setMinPrice(e.target.value)} placeholder="Min"
                            style={{width:"100%",padding:"0.42rem 0.65rem",border:"1px solid #eee",borderRadius:7,fontSize:"0.81rem",background:"#fafafa",outline:"none",boxSizing:"border-box",marginBottom:"0.4rem",color:"#1a1a2e"}}/>
                        <input type="number" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="Max"
                            style={{width:"100%",padding:"0.42rem 0.65rem",border:"1px solid #eee",borderRadius:7,fontSize:"0.81rem",background:"#fafafa",outline:"none",boxSizing:"border-box",color:"#1a1a2e"}}/>
                    </div>
                    <button onClick={applyFilters}
                        style={{width:"100%",background:"linear-gradient(90deg,#e94560,#c0392b)",color:"#fff",border:"none",borderRadius:9,padding:"0.58rem",fontWeight:700,cursor:"pointer",fontSize:"0.8rem",boxShadow:"0 3px 10px rgba(233,69,96,0.28)",marginBottom:"0.4rem"}}>
                        Apply Filters
                    </button>
                    <button onClick={resetFilters} style={{width:"100%",background:"none",border:"none",color:"#bbb",cursor:"pointer",fontSize:"0.74rem",padding:"0.25rem"}}>Reset All</button>
                </div>

                {/* PRODUCTS GRID */}
                <div ref={productsRef}>
                    <div style={{display:"flex",gap:"0.4rem",marginBottom:"0.9rem",flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{fontSize:"0.7rem",color:"#aaa",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Show:</span>
                        {[["","All"],["New","New"],["Used","Used"]].map(([val,lbl])=>(
                            <button key={val} onClick={()=>applyCondition(val)}
                                style={{background:condition===val?"#1a1a2e":"#fff",color:condition===val?"#fff":"#666",
                                    border:`1px solid ${condition===val?"#1a1a2e":"#e0e0e0"}`,
                                    padding:"0.26rem 0.85rem",cursor:"pointer",fontSize:"0.76rem",fontWeight:700,borderRadius:20,transition:"all 0.15s"}}>
                                {lbl}
                            </button>
                        ))}
                        <span style={{marginLeft:"auto",fontSize:"0.76rem",color:"#aaa"}}>{items.length} product{items.length!==1?"s":""}</span>
                    </div>
                    {loading?(
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:"0.8rem"}}>
                            {Array.from({length:8}).map((_,i)=>(
                                <div key={i} style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                                    <div style={{aspectRatio:"1",background:"linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.2s infinite"}}/>
                                    <div style={{padding:"0.7rem"}}>
                                        {[80,55,40].map(w=><div key={w} style={{height:8,background:"#f0f0f0",borderRadius:5,marginBottom:6,width:w+"%"}}/>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ):items.length===0?(
                        <div style={{textAlign:"center",padding:"4rem 2rem",background:"#fff",borderRadius:12}}>
                            <div style={{fontSize:"2.5rem",marginBottom:"0.75rem"}}>📦</div>
                            <h3 style={{color:"#1a1a2e",margin:"0 0 0.4rem",fontWeight:700}}>No products found</h3>
                            <p style={{color:"#aaa",fontSize:"0.85rem"}}>Try changing the filters.</p>
                        </div>
                    ):(
                        <>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:"0.8rem"}}>
                                {items.map(item=>(
                                    <ProductCard key={item._id} item={item} inCart={cart.some(c=>c._id===item._id)} onAddCart={addToCart}/>
                                ))}
                            </div>
                            {/* Sentinel div — IntersectionObserver watches this */}
                            <div ref={sentinelRef} style={{height:1,marginTop:"1rem"}}/>
                            {loadingMore && (
                                <div style={{textAlign:"center",padding:"1.5rem",color:"#aaa",fontSize:"0.82rem",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.6rem"}}>
                                    <div style={{width:18,height:18,border:"2px solid #eee",borderTop:"2px solid #e94560",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
                                    Loading more…
                                </div>
                            )}
                            {!hasMore && items.length >= PAGE_SIZE && (
                                <div style={{textAlign:"center",padding:"1.2rem",color:"#bbb",fontSize:"0.78rem"}}>
                                    ✓ All {items.length} products loaded
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* RIGHT COLUMN */}
                <div style={{position:"sticky",top:54,display:"flex",flexDirection:"column",gap:"1rem"}}>
                    <DealsPanel items={allItems} cart={cart} onAddCart={addToCart}/>
                    <div style={{background:"linear-gradient(135deg,#1a1a2e,#2c3e50)",borderRadius:12,padding:"1.1rem",textAlign:"center",boxShadow:"0 2px 10px rgba(0,0,0,0.12)"}}>
                        <div style={{fontSize:"1.7rem",marginBottom:"0.45rem"}}>🏷️</div>
                        <h4 style={{color:"#fff",fontWeight:800,margin:"0 0 0.3rem",fontSize:"0.86rem"}}>Have something to sell?</h4>
                        <p style={{color:"rgba(255,255,255,0.45)",fontSize:"0.73rem",margin:"0 0 0.85rem",lineHeight:1.5}}>List your items and reach buyers instantly.</p>
                        <Link to="/marketplace/add-item" style={{display:"block",background:"#e94560",color:"#fff",textDecoration:"none",padding:"0.58rem",borderRadius:8,fontWeight:700,fontSize:"0.78rem",boxShadow:"0 3px 10px rgba(233,69,96,0.3)"}}>+ List an Item</Link>
                    </div>
                </div>
            </div>

            {/* ══ BRAND STRIP ══ */}
            <BrandStrip/>
            <div style={{height:"2rem"}}/>

            {/* ══ CART SIDEBAR ══ */}
            {showCart&&<CartSidebar cart={cart} onRemove={removeCart} onClose={()=>setShowCart(false)} onCheckout={()=>{setShowCart(false);setShowGateway(true);}}/>}

            {/* ══ PAYMENT GATEWAY ══ */}
            {showGateway&&<MarketplaceGateway cart={cart} onClose={()=>setShowGateway(false)} onSuccess={handlePaymentSuccess}/>}
        </div>
    );
};

export default AllItems;

