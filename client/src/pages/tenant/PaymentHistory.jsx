import { useEffect, useState } from "react";
import { paymentHistoryAPI, markAsPaidAPI } from "../../api/paymentAPI";
import { createReportAPI } from "../../api/reportAPI";

/* ─── Payment Method Config (SSLCommerz-style) ─── */
const PAYMENT_METHODS = [
    { id:"bKash",         label:"bKash",         icon:"📱", color:"#E2136E", bg:"#fdf0f6", desc:"Mobile Banking", acct:"017XXXXXXXX" },
    { id:"Nagad",         label:"Nagad",          icon:"📲", color:"#F6831F", bg:"#fff7f0", desc:"Mobile Banking", acct:"018XXXXXXXX" },
    { id:"Rocket",        label:"Rocket",         icon:"🚀", color:"#8B1AF5", bg:"#f8f0ff", desc:"Dutch-Bangla Mobile", acct:"019XXXXXXXX" },
    { id:"Card",          label:"Debit / Credit Card", icon:"💳", color:"#1a1a2e", bg:"#f0f2ff", desc:"Visa · MasterCard · AMEX", acct:null },
    { id:"Bank Transfer", label:"Bank Transfer",  icon:"🏦", color:"#1a6e3c", bg:"#f0faf4", desc:"Online Bank Transfer", acct:null },
];

const statusBadge = (s) => {
    const cls = s==="Paid"?"green":s==="Overdue"?"red":"yellow";
    return <span className={`badge ${cls}`}>{s}</span>;
};

/* ─── Payment Gateway Modal ─── */
const PaymentGateway = ({ invoice, onClose, onSuccess }) => {
    const [step,        setStep]        = useState("select");   // select | details | processing | success
    const [method,      setMethod]      = useState(null);
    const [accountNo,   setAccountNo]   = useState("");
    const [otp,         setOtp]         = useState("");
    const [pin,         setPin]         = useState("");
    const [cardNum,     setCardNum]     = useState("");
    const [cardExp,     setCardExp]     = useState("");
    const [cardCvv,     setCardCvv]     = useState("");
    const [cardName,    setCardName]    = useState("");
    const [bankName,    setBankName]    = useState("");
    const [bankAcc,     setBankAcc]     = useState("");
    const [error,       setError]       = useState("");
    const [txnRef,      setTxnRef]      = useState("");

    const isMobile = ["bKash","Nagad","Rocket"].includes(method?.id);
    const isCard   = method?.id === "Card";
    const isBank   = method?.id === "Bank Transfer";

    /* ── Step 1: select method ── */
    const handleSelectMethod = (m) => {
        setMethod(m);
        setError("");
        setStep("details");
    };

    /* ── Step 2: submit details → go to OTP / card / bank ── */
    const handleDetails = (e) => {
        e.preventDefault();
        setError("");
        if (isMobile) {
            if (!/^01[3-9][0-9]{8}$/.test(accountNo)) {
                setError("Enter a valid 11-digit Bangladeshi mobile number."); return;
            }
            if (pin.length !== 5 || !/^\d{5}$/.test(pin)) {
                setError("PIN must be exactly 5 digits."); return;
            }
            // Simulation: skip real OTP generation, just show OTP entry screen
            setStep("otp");
        } else if (isCard) {
            if (cardNum.replace(/\s/g,"").length !== 16) { setError("Card number must be 16 digits."); return; }
            if (!/^\d{2}\/\d{2}$/.test(cardExp))          { setError("Expiry must be MM/YY."); return; }
            if (cardCvv.length !== 3)                      { setError("CVV must be 3 digits."); return; }
            if (!cardName.trim())                          { setError("Enter cardholder name."); return; }
            setStep("processing");
            setTimeout(() => completePayment(), 2200);
        } else if (isBank) {
            if (!bankName.trim()) { setError("Select or enter bank name."); return; }
            if (bankAcc.length < 8) { setError("Enter a valid account number."); return; }
            setStep("processing");
            setTimeout(() => completePayment(), 2800);
        }
    };

    /* ── Step 3: verify OTP — simulation: any input accepted ── */
    const handleOtp = async (e) => {
        e.preventDefault();
        setError("");
        // Simulation mode: OTP is not verified — any input proceeds
        setStep("processing");
        setTimeout(() => completePayment(), 2000);
    };

    /* ── Complete payment via API ── */
    const completePayment = async () => {
        try {
            const res = await markAsPaidAPI(invoice._id, method.id);
            setTxnRef(res.data.transactionRef);
            setStep("success");
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || "Payment failed. Please try again.");
            setStep("details");
        }
    };

    return (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}
             onClick={step==="success"||step==="select"?onClose:undefined}>
            <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 12px 48px rgba(0,0,0,0.25)"}}
                 onClick={e=>e.stopPropagation()}>

                {/* Header */}
                <div style={{background:"linear-gradient(135deg,#1a1a2e,#e94560)",padding:"1.2rem 1.5rem",borderRadius:"14px 14px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                        <p style={{color:"rgba(255,255,255,0.7)",fontSize:"0.78rem",margin:0}}>Bariwala Payment Gateway</p>
                        <h3 style={{color:"#fff",margin:0,fontSize:"1.05rem"}}>Pay ৳{invoice.amount?.toLocaleString()}</h3>
                        <p style={{color:"rgba(255,255,255,0.8)",fontSize:"0.8rem",margin:"0.2rem 0 0"}}>{invoice.invoiceNo} · {invoice.forMonth}</p>
                    </div>
                    {(step==="select"||step==="success")&&<button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",borderRadius:8,padding:"0.3rem 0.7rem",cursor:"pointer"}}>✕</button>}
                </div>

                <div style={{padding:"1.5rem"}}>

                    {/* ── STEP: select method ── */}
                    {step==="select" && (
                        <>
                            <p style={{fontSize:"0.88rem",color:"#666",marginBottom:"1rem"}}>Choose your payment method:</p>
                            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
                                {PAYMENT_METHODS.map(m => (
                                    <button key={m.id} onClick={()=>handleSelectMethod(m)}
                                        style={{display:"flex",alignItems:"center",gap:"1rem",padding:"0.85rem 1rem",background:m.bg,border:`2px solid ${m.color}22`,borderRadius:10,cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
                                        <span style={{fontSize:"1.6rem",minWidth:32,textAlign:"center"}}>{m.icon}</span>
                                        <div style={{flex:1}}>
                                            <div style={{fontWeight:700,color:m.color,fontSize:"0.92rem"}}>{m.label}</div>
                                            <div style={{fontSize:"0.75rem",color:"#999"}}>{m.desc}</div>
                                        </div>
                                        <span style={{color:m.color,fontSize:"0.8rem"}}>›</span>
                                    </button>
                                ))}
                            </div>
                            <p style={{fontSize:"0.75rem",color:"#bbb",textAlign:"center",marginTop:"1rem"}}>🔒 Secured by Bariwala Payment Gateway · Simulation only</p>
                        </>
                    )}

                    {/* ── STEP: details ── */}
                    {step==="details" && method && (
                        <>
                            <button onClick={()=>{setStep("select");setError("");}} style={{background:"none",border:"none",color:"#888",fontSize:"0.85rem",cursor:"pointer",padding:"0 0 0.8rem 0"}}>← Back</button>
                            <div style={{display:"flex",alignItems:"center",gap:"0.75rem",background:method.bg,borderRadius:10,padding:"0.8rem 1rem",marginBottom:"1.2rem"}}>
                                <span style={{fontSize:"1.8rem"}}>{method.icon}</span>
                                <div>
                                    <div style={{fontWeight:700,color:method.color}}>{method.label}</div>
                                    <div style={{fontSize:"0.75rem",color:"#999"}}>{method.desc}</div>
                                </div>
                            </div>

                            {error && <p className="error" style={{marginBottom:"0.8rem"}}>{error}</p>}

                            <form onSubmit={handleDetails}>
                                {isMobile && (
                                    <>
                                        <label style={{fontSize:"0.83rem",fontWeight:600,color:"#555"}}>{method.label} Account Number</label>
                                        <input value={accountNo} onChange={e=>setAccountNo(e.target.value.replace(/\D/g,"").slice(0,11))}
                                               placeholder={method.acct} type="tel" required />
                                        <label style={{fontSize:"0.83rem",fontWeight:600,color:"#555"}}>{method.label} PIN (5 digits)</label>
                                        <input value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,5))}
                                               placeholder="● ● ● ● ●" type="password" maxLength={5} required />
                                    </>
                                )}
                                {isCard && (
                                    <>
                                        <label style={{fontSize:"0.83rem",fontWeight:600,color:"#555"}}>Card Number</label>
                                        <input value={cardNum}
                                               onChange={e=>setCardNum(e.target.value.replace(/\D/g,"").replace(/(.{4})/g,"$1 ").trim().slice(0,19))}
                                               placeholder="1234 5678 9012 3456" required />
                                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem"}}>
                                            <div>
                                                <label style={{fontSize:"0.83rem",fontWeight:600,color:"#555"}}>Expiry (MM/YY)</label>
                                                <input value={cardExp}
                                                       onChange={e=>{let v=e.target.value.replace(/\D/g,"");if(v.length>=3)v=v.slice(0,2)+"/"+v.slice(2,4);setCardExp(v);}}
                                                       placeholder="06/28" maxLength={5} required />
                                            </div>
                                            <div>
                                                <label style={{fontSize:"0.83rem",fontWeight:600,color:"#555"}}>CVV</label>
                                                <input value={cardCvv} onChange={e=>setCardCvv(e.target.value.replace(/\D/g,"").slice(0,3))}
                                                       placeholder="123" maxLength={3} type="password" required />
                                            </div>
                                        </div>
                                        <label style={{fontSize:"0.83rem",fontWeight:600,color:"#555"}}>Cardholder Name</label>
                                        <input value={cardName} onChange={e=>setCardName(e.target.value)} placeholder="As on card" required />
                                    </>
                                )}
                                {isBank && (
                                    <>
                                        <label style={{fontSize:"0.83rem",fontWeight:600,color:"#555"}}>Bank Name</label>
                                        <select value={bankName} onChange={e=>setBankName(e.target.value)} required>
                                            <option value="">-- Select bank --</option>
                                            {["Dutch-Bangla Bank","BRAC Bank","Islami Bank","City Bank","Southeast Bank","Prime Bank","Sonali Bank","Eastern Bank"].map(b=><option key={b}>{b}</option>)}
                                        </select>
                                        <label style={{fontSize:"0.83rem",fontWeight:600,color:"#555"}}>Account Number</label>
                                        <input value={bankAcc} onChange={e=>setBankAcc(e.target.value.replace(/\D/g,""))} placeholder="Account number" required />
                                    </>
                                )}

                                <div style={{background:"#f8f9fa",borderRadius:8,padding:"0.8rem 1rem",margin:"1rem 0",fontSize:"0.83rem"}}>
                                    <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#888"}}>Invoice No</span><span>{invoice.invoiceNo}</span></div>
                                    <div style={{display:"flex",justifyContent:"space-between",marginTop:"0.3rem"}}><span style={{color:"#888"}}>For Month</span><span>{invoice.forMonth}</span></div>
                                    <div style={{display:"flex",justifyContent:"space-between",marginTop:"0.3rem",fontWeight:700}}><span>Total Amount</span><span style={{color:"#e94560"}}>৳{invoice.amount?.toLocaleString()}</span></div>
                                </div>

                                <button type="submit" style={{width:"100%",background:method.color}}>
                                    {isMobile?`Send OTP to ${accountNo||"..."}`:isCard?"Pay Now":"Confirm Transfer"}
                                </button>
                            </form>
                        </>
                    )}

                    {/* ── STEP: OTP (mobile methods) ── */}
                    {step==="otp" && (
                        <>
                            <div style={{textAlign:"center",marginBottom:"1.2rem"}}>
                                <div style={{fontSize:"2.5rem"}}>{method?.icon}</div>
                                <h4 style={{margin:"0.5rem 0 0.3rem"}}>Enter OTP</h4>
                                <p style={{fontSize:"0.83rem",color:"#888"}}>A 6-digit OTP was sent to <strong>{accountNo}</strong></p>
                            </div>
                            {/* Simulation notice */}
                            <div style={{background:"#fff8e1",border:"1px solid #f5c518",borderRadius:8,padding:"0.6rem 0.9rem",
                                marginBottom:"1rem",display:"flex",alignItems:"center",gap:"0.5rem",fontSize:"0.8rem",color:"#856404"}}>
                                <span style={{fontSize:"1rem"}}>🧪</span>
                                <span><strong>Demo Mode:</strong> This is a simulation — enter any 6 digits to proceed. No real OTP is sent.</span>
                            </div>
                            {error && <p className="error" style={{marginBottom:"0.8rem"}}>{error}</p>}
                            <form onSubmit={handleOtp}>
                                <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}
                                       placeholder="● ● ● ● ● ●" maxLength={6} style={{textAlign:"center",fontSize:"1.5rem",letterSpacing:8}} required />
                                <button type="submit" style={{width:"100%",marginTop:"0.5rem",background:method?.color}}>Verify & Pay</button>
                            </form>
                        </>
                    )}

                    {/* ── STEP: processing ── */}
                    {step==="processing" && (
                        <div style={{textAlign:"center",padding:"2rem 0"}}>
                            <div style={{fontSize:"2.5rem",marginBottom:"1rem"}}>⏳</div>
                            <h4>Processing Payment...</h4>
                            <p style={{color:"#888",fontSize:"0.85rem"}}>Please wait while we confirm your payment.</p>
                            <div style={{margin:"1.5rem auto",width:40,height:40,border:"4px solid #eee",borderTop:`4px solid ${method?.color||"#e94560"}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
                        </div>
                    )}

                    {/* ── STEP: success ── */}
                    {step==="success" && (
                        <div style={{textAlign:"center",padding:"1.5rem 0"}}>
                            <div style={{fontSize:"3rem",marginBottom:"0.5rem"}}>✅</div>
                            <h3 style={{color:"#27ae60"}}>Payment Successful!</h3>
                            <p style={{color:"#555",fontSize:"0.88rem",marginTop:"0.5rem"}}>Your rent for <strong>{invoice.forMonth}</strong> has been paid.</p>
                            <div style={{background:"#f0faf4",borderRadius:10,padding:"1rem",margin:"1rem 0",textAlign:"left"}}>
                                <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.83rem",marginBottom:"0.3rem"}}><span style={{color:"#888"}}>Invoice No</span><span>{invoice.invoiceNo}</span></div>
                                <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.83rem",marginBottom:"0.3rem"}}><span style={{color:"#888"}}>Transaction Ref</span><span style={{fontWeight:700}}>{txnRef}</span></div>
                                <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.83rem",marginBottom:"0.3rem"}}><span style={{color:"#888"}}>Method</span><span>{method?.label}</span></div>
                                <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.83rem",fontWeight:700}}><span>Amount Paid</span><span style={{color:"#27ae60"}}>৳{invoice.amount?.toLocaleString()}</span></div>
                            </div>
                            <button style={{width:"100%",background:"#27ae60"}} onClick={onClose}>Done</button>
                        </div>
                    )}
                </div>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
};

/* ══════════════════════════════════════════ */
/*   MAIN PaymentHistory COMPONENT           */
/* ══════════════════════════════════════════ */
const PaymentHistory = () => {
    const [payments,     setPayments]     = useState([]);
    const [activeInvoice,setActiveInvoice]= useState(null); // invoice for gateway
    const [receipt,      setReceipt]      = useState(null); // receipt modal
    const [msg,          setMsg]          = useState("");
    const [reportModal,  setReportModal]  = useState(null); // { landlordId, landlordName }
    const [reportReason, setReportReason] = useState("");
    const [reportMsg,    setReportMsg]    = useState("");

    const load = () => paymentHistoryAPI().then(r => setPayments(r.data.data || []));
    useEffect(() => { load(); }, []);

    const pending = payments.filter(p => p.status === "Pending");
    const overdue = payments.filter(p => p.status === "Overdue");
    const paid    = payments.filter(p => p.status === "Paid");

    const handlePaySuccess = () => { setMsg("✅ Payment confirmed!"); load(); };

    const handleReport = async (e) => {
        e.preventDefault();
        if (!reportReason.trim()) return;
        try {
            await createReportAPI({ reportType:"user", reportedEntity: reportModal.landlordId, reason: reportReason.trim() });
            setReportMsg("Report submitted. Our team will review it."); setReportReason("");
            setTimeout(() => { setReportModal(null); setReportMsg(""); }, 2500);
        } catch { setReportMsg("Failed to submit report."); }
    };

    return (
        <div className="container">
            <h2>My Payments</h2>

            {/* Summary */}
            <div className="dashboard-stats">
                <div className="stat-card"><h3 style={{color:"#27ae60"}}>৳{paid.reduce((s,p)=>s+(p.amount||0),0).toLocaleString()}</h3><p>Total Paid</p></div>
                <div className="stat-card"><h3 style={{color:"#f39c12"}}>{pending.length}</h3><p>Pending</p></div>
                <div className="stat-card"><h3 style={{color:"#e74c3c"}}>{overdue.length}</h3><p>Overdue</p></div>
                <div className="stat-card"><h3>{paid.length}</h3><p>Receipts</p></div>
            </div>

            {msg && <p className="success" style={{marginBottom:"1rem"}}>{msg}</p>}

            {overdue.length > 0 && (
                <div style={{background:"#fdecea",border:"1px solid #e74c3c",borderRadius:8,padding:"0.9rem 1rem",marginBottom:"1.5rem"}}>
                    <strong style={{color:"#c0392b"}}>⚠️ {overdue.length} overdue invoice{overdue.length>1?"s":""}!</strong>
                    <p style={{color:"#c0392b",fontSize:"0.85rem",margin:"0.2rem 0 0"}}>Please pay immediately to avoid issues with your landlord.</p>
                </div>
            )}

            {/* ── Unpaid ── */}
            {(pending.length > 0 || overdue.length > 0) && (
                <div className="message-box" style={{marginBottom:"2rem"}}>
                    <h3 style={{marginBottom:"1rem"}}>
                        Unpaid Invoices
                        <span className="badge red" style={{marginLeft:"0.7rem"}}>{pending.length+overdue.length}</span>
                    </h3>
                    <div style={{overflowX:"auto"}}>
                        <table>
                            <thead>
                                <tr><th>Invoice No</th><th>Property</th><th>Landlord</th><th>Month</th><th>Amount</th><th>Due</th><th>Status</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {[...overdue,...pending].map(p=>(
                                    <tr key={p._id}>
                                        <td><strong>{p.invoiceNo}</strong>{p.note&&<><br/><small style={{color:"#888"}}>{p.note}</small></>}</td>
                                        <td>{p.propertyInfo?.[0]?.propertyType} — {p.propertyInfo?.[0]?.area}<br/><small style={{color:"#888"}}>{p.propertyInfo?.[0]?.address}</small></td>
                                        <td>
                                            {p.landlordInfo?.[0]?.name}
                                            <br/>
                                            <small
                                                style={{color:"#e94560",cursor:"pointer",fontSize:"0.75rem"}}
                                                onClick={()=>setReportModal({landlordId:p.landlordInfo?.[0]?._id,landlordName:p.landlordInfo?.[0]?.name})}
                                            >🚩 Report</small>
                                        </td>
                                        <td>{p.forMonth}</td>
                                        <td><strong>৳{p.amount?.toLocaleString()}</strong></td>
                                        <td style={{color:p.status==="Overdue"?"#e74c3c":"inherit"}}>{p.dueDate?new Date(p.dueDate).toLocaleDateString("en-GB"):"—"}</td>
                                        <td>{statusBadge(p.status)}</td>
                                        <td>
                                            <button onClick={()=>setActiveInvoice(p)}
                                                style={{background:p.status==="Overdue"?"#e74c3c":"#e94560",fontSize:"0.82rem"}}>
                                                Pay Now
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Receipts ── */}
            <h3 style={{marginBottom:"1rem"}}>Payment Receipts</h3>
            {paid.length===0 ? <p style={{color:"#888"}}>No payments made yet.</p> : (
                <div style={{overflowX:"auto"}}>
                    <table>
                        <thead>
                            <tr><th>Invoice No</th><th>Property</th><th>Month</th><th>Amount</th><th>Method</th><th>Txn Ref</th><th>Paid On</th><th>Status</th><th></th></tr>
                        </thead>
                        <tbody>
                            {paid.map(p=>(
                                <tr key={p._id}>
                                    <td><strong>{p.invoiceNo}</strong></td>
                                    <td>{p.propertyInfo?.[0]?.propertyType} — {p.propertyInfo?.[0]?.area}</td>
                                    <td>{p.forMonth}</td>
                                    <td>৳{p.amount?.toLocaleString()}</td>
                                    <td><span style={{fontSize:"0.82rem",fontWeight:600}}>{p.paymentMethod||"—"}</span></td>
                                    <td><small style={{fontFamily:"monospace",color:"#2980b9"}}>{p.transactionRef||"—"}</small></td>
                                    <td>{p.paidAt?new Date(p.paidAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—"}</td>
                                    <td>{statusBadge(p.status)}</td>
                                    <td><button style={{background:"#2980b9",fontSize:"0.75rem"}} onClick={()=>setReceipt(p)}>Receipt</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Payment Gateway ── */}
            {activeInvoice && (
                <PaymentGateway
                    invoice={activeInvoice}
                    onClose={()=>setActiveInvoice(null)}
                    onSuccess={handlePaySuccess}
                />
            )}

            {/* ── Receipt Modal ── */}
            {receipt && (
                <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}} onClick={()=>setReceipt(null)}>
                    <div style={{background:"#fff",padding:"2rem",borderRadius:12,maxWidth:460,width:"100%",boxShadow:"0 8px 32px rgba(0,0,0,0.2)"}} onClick={e=>e.stopPropagation()}>
                        <div style={{textAlign:"center",marginBottom:"1rem"}}>
                            <div style={{fontSize:"2rem"}}>🧾</div>
                            <h3 style={{color:"#1a1a2e"}}>Payment Receipt</h3>
                            <p style={{color:"#aaa",fontSize:"0.78rem"}}>Bariwala Rental Platform</p>
                        </div>
                        <hr/>
                        <table style={{boxShadow:"none",background:"transparent",marginTop:"0.8rem"}}>
                            <tbody>
                                {[["Invoice No",receipt.invoiceNo],["Transaction Ref",receipt.transactionRef],["Payment Method",receipt.paymentMethod||"—"],["Landlord",receipt.landlordInfo?.[0]?.name],["Property",`${receipt.propertyInfo?.[0]?.propertyType} — ${receipt.propertyInfo?.[0]?.area}`],["Address",receipt.propertyInfo?.[0]?.address],["For Month",receipt.forMonth],["Amount Paid",`৳${receipt.amount?.toLocaleString()}`],receipt.note?["Note",receipt.note]:null,["Paid On",receipt.paidAt?new Date(receipt.paidAt).toLocaleString("en-GB"):"—"],["Status","✅ Paid & Verified"]].filter(Boolean).map(([l,v])=>(
                                    <tr key={l} style={{background:"transparent"}}>
                                        <td style={{border:"none",padding:"0.3rem 0.5rem",color:"#888",fontWeight:600,fontSize:"0.82rem",width:"40%"}}>{l}</td>
                                        <td style={{border:"none",padding:"0.3rem 0.5rem",fontSize:"0.82rem"}}>{v}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <hr style={{marginTop:"0.8rem"}}/>
                        <p style={{textAlign:"center",color:"#27ae60",fontWeight:700,marginTop:"0.8rem"}}>Payment Verified ✓</p>
                        <button style={{width:"100%",marginTop:"0.8rem",background:"#1a1a2e"}} onClick={()=>setReceipt(null)}>Close</button>
                    </div>
                </div>
            )}

            {/* ── Report Landlord Modal ── */}
            {reportModal && (
                <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}} onClick={()=>setReportModal(null)}>
                    <div style={{background:"#fff",padding:"1.8rem",borderRadius:12,maxWidth:420,width:"100%"}} onClick={e=>e.stopPropagation()}>
                        <h3 style={{marginBottom:"0.5rem"}}>🚩 Report Landlord</h3>
                        <p style={{fontSize:"0.85rem",color:"#888",marginBottom:"1rem"}}>Reporting <strong>{reportModal.landlordName}</strong></p>
                        {reportMsg && <p className={reportMsg.includes("Failed")?"error":"success"} style={{marginBottom:"0.8rem"}}>{reportMsg}</p>}
                        <form onSubmit={handleReport}>
                            <label style={{fontSize:"0.85rem",fontWeight:600,color:"#555"}}>Reason *</label>
                            <textarea value={reportReason} onChange={e=>setReportReason(e.target.value)} placeholder="Describe the issue..." style={{minHeight:90,resize:"vertical"}} required />
                            <div style={{display:"flex",gap:"0.6rem",marginTop:"0.5rem"}}>
                                <button type="submit" style={{background:"#e74c3c",flex:1}}>Submit Report</button>
                                <button type="button" onClick={()=>setReportModal(null)} style={{background:"#888",flex:1}}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentHistory;

