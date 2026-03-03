import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { generateInvoiceAPI, paymentHistoryAPI } from "../../api/paymentAPI";
import { myTenantsAPI } from "../../api/messageAPI";
import { searchTenantsAPI } from "../../api/userAPI";
import { incomingRentalRequestsAPI } from "../../api/rentalRequestAPI";

const generateMonths = () => {
    const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        return `${names[d.getMonth()]} ${d.getFullYear()}`;
    });
};
const MONTH_OPTIONS = generateMonths();

const statusBadge = (s) => {
    const cls = s === "Paid" ? "green" : s === "Overdue" ? "red" : "yellow";
    return <span className={`badge ${cls}`}>{s}</span>;
};
/* ── Tenant Search Box ─────────────────────────────────────────── */
const TenantSearchBox = ({ knownTenants, onSelect }) => {
    const [query,        setQuery]        = useState("");
    const [results,      setResults]      = useState([]);
    const [searching,    setSearching]    = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debounceRef = useRef(null);
    const boxRef      = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setShowDropdown(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleInput = (e) => {
        const val = e.target.value;
        setQuery(val);
        setShowDropdown(true);
        clearTimeout(debounceRef.current);
        if (val.trim().length < 2) { setResults([]); return; }
        setSearching(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await searchTenantsAPI(val.trim());
                // merge with known tenants so both sources appear
                const fromSearch = res.data.data || [];
                const merged = [...knownTenants];
                fromSearch.forEach(u => {
                    if (!merged.find(m => String(m.tenantId) === String(u._id)))
                        merged.push({ tenantId: u._id, tenantName: u.name, tenantEmail: u.email, fromSearch: true });
                });
                setResults(merged.filter(t =>
                    t.tenantName?.toLowerCase().includes(val.toLowerCase()) ||
                    t.tenantEmail?.toLowerCase().includes(val.toLowerCase())
                ));
            } catch { setResults([]); }
            finally   { setSearching(false); }
        }, 350);
    };
    const pick = (t) => {
        setQuery(`${t.tenantName} (${t.tenantEmail})`);
        setShowDropdown(false);
        onSelect({ tenantId: String(t.tenantId), tenantName: t.tenantName, tenantEmail: t.tenantEmail });
    };

    // Show known tenants on focus even before typing
    const handleFocus = () => {
        setShowDropdown(true);
        if (!query && knownTenants.length > 0) setResults(knownTenants);
    };

    return (
        <div ref={boxRef} style={{ position:"relative" }}>
            <input value={query} onChange={handleInput} onFocus={handleFocus}
                placeholder="Type tenant name or email to search..." autoComplete="off" />
            {showDropdown && results.length > 0 && (
                <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff",
                    border:"1px solid #e0ddd8", zIndex:200,
                    boxShadow:"0 4px 16px rgba(0,0,0,0.1)", maxHeight:220, overflowY:"auto" }}>
                    {searching && <p style={{ padding:"0.6rem 1rem", color:"#aaa", fontSize:"0.85rem" }}>Searching...</p>}
                    {results.map((t, i) => (
                        <div key={i} onClick={() => pick(t)}
                             style={{ padding:"0.65rem 1rem", cursor:"pointer", borderBottom:"1px solid #f5f2ee",
                                display:"flex", flexDirection:"column", gap:2 }}
                             onMouseEnter={e => e.currentTarget.style.background="#fafaf8"}
                             onMouseLeave={e => e.currentTarget.style.background="#fff"}>
                            <span style={{ fontWeight:600, fontSize:"0.86rem" }}>{t.tenantName}</span>
                            <span style={{ fontSize:"0.76rem", color:"#888" }}>
                                {t.tenantEmail}
                                {t.fromRequest && <span style={{ marginLeft:6, background:"#f0f8f0", color:"#2e7d32", padding:"0.06rem 0.4rem", fontSize:"0.68rem", fontWeight:700 }}>Requested</span>}
                                {!t.fromSearch && !t.fromRequest && <span style={{ marginLeft:6, background:"#f5f2ee", color:"#888", padding:"0.06rem 0.4rem", fontSize:"0.68rem", fontWeight:700 }}>Messaged</span>}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {showDropdown && !searching && query.trim().length >= 2 && results.length === 0 && (
                <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff",
                    border:"1px solid #e0ddd8", zIndex:200, padding:"0.7rem 1rem" }}>
                    <span style={{ color:"#aaa", fontSize:"0.85rem" }}>No tenants found</span>
                </div>
            )}
        </div>
    );
};

/* ── Main Component ────────────────────────────────────────────── */
const LandlordInvoices = () => {
    const location = useLocation();

    const [invoices,   setInvoices]   = useState([]);
    const [tenants,    setTenants]    = useState([]);
    const [rentalReqs, setRentalReqs] = useState([]);
    const [form,       setForm]       = useState({ propertyId:"", tenantId:"", tenantLabel:"", amount:"", forMonth:"", note:"", dueDays:"7" });
    const [msg,     setMsg]     = useState("");
    const [msgType, setMsgType] = useState("success");
    const [loading, setLoading] = useState(false);
    const [receipt, setReceipt] = useState(null);

    const load = async () => {
        const [inv, ten, req] = await Promise.all([
            paymentHistoryAPI(), myTenantsAPI(), incomingRentalRequestsAPI()
        ]);
        setInvoices(inv.data.data || []);
        setTenants(ten.data.data || []);
        setRentalReqs(req.data.data || []);
    };

    useEffect(() => {
        load().then(() => {
            const prefill = location.state?.prefill;
            if (prefill) {
                setForm({
                    propertyId:  prefill.propertyId  || "",
                    tenantId:    prefill.tenantId    || "",
                    tenantLabel: prefill.tenantName && prefill.tenantEmail
                        ? `${prefill.tenantName} (${prefill.tenantEmail})` : "",
                    amount:  prefill.monthlyRent ? String(prefill.monthlyRent) : "",
                    forMonth:"", note:"", dueDays:"7"
                });
            }
        });
    }, []); // eslint-disable-line

    /* Unique properties: messaged tenants + accepted rental requests + prefill */
    const uniqueProperties = (() => {
        const acc = [];
        const add = (propertyId, label, monthlyRent) => {
            if (!acc.find(p => p.propertyId === String(propertyId)))
                acc.push({ propertyId: String(propertyId), label, monthlyRent });
        };
        tenants.forEach(t => add(t.propertyId, `${t.propertyType} — ${t.propertyArea}`, t.monthlyRent));
        rentalReqs.filter(r => r.status === "Accepted").forEach(r => {
            const prop = r.propertyInfo?.[0];
            if (prop) add(prop._id, `${prop.propertyType} — ${prop.area}`, prop.monthlyRent);
        });
        const p = location.state?.prefill;
        if (p?.propertyId && !acc.find(x => x.propertyId === p.propertyId))
            acc.push({ propertyId: p.propertyId, label: p.propertyLabel || p.propertyId, monthlyRent: p.monthlyRent });
        return acc;
    })();

    /* Tenants for selected property */
    const tenantsForProperty = (() => {
        const list = tenants
            .filter(t => String(t.propertyId) === form.propertyId)
            .map(t => ({ tenantId: t.tenantId, tenantName: t.tenantName, tenantEmail: t.tenantEmail }));
        rentalReqs
            .filter(r => r.status === "Accepted" && String(r.propertyInfo?.[0]?._id) === form.propertyId)
            .forEach(r => {
                const t = r.tenantInfo?.[0];
                if (t && !list.find(m => String(m.tenantId) === String(t._id)))
                    list.push({ tenantId: t._id, tenantName: t.name, tenantEmail: t.email, fromRequest: true });
            });
        const p = location.state?.prefill;
        if (p?.tenantId && form.propertyId === p.propertyId && !list.find(m => String(m.tenantId) === p.tenantId))
            list.push({ tenantId: p.tenantId, tenantName: p.tenantName, tenantEmail: p.tenantEmail, fromRequest: true });
        return list;
    })();

    // When property changes — reset tenant, pre-fill amount
    const handlePropertyChange = (e) => {
        const propId   = e.target.value;
        const propData = uniqueProperties.find(p => p.propertyId === propId);
        setForm(f => ({ ...f, propertyId: propId, tenantId:"", tenantLabel:"", amount: propData ? String(propData.monthlyRent) : "" }));
    };

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    // Called when a tenant is selected from the search/dropdown
    const handleTenantSelect = ({ tenantId, tenantName, tenantEmail }) => {
        setForm(f => ({ ...f, tenantId, tenantLabel: `${tenantName} (${tenantEmail})` }));
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setMsg("");
        if (!form.propertyId) { setMsg("Please select a property."); setMsgType("error"); return; }
        if (!form.tenantId)   { setMsg("Please select or search a tenant."); setMsgType("error"); return; }
        if (!form.forMonth)   { setMsg("Please select a month."); setMsgType("error"); return; }
        setLoading(true);
        try {
            const res = await generateInvoiceAPI({ propertyId: form.propertyId, tenantId: form.tenantId, amount: form.amount, forMonth: form.forMonth, note: form.note, dueDays: form.dueDays });
            setMsg(`✅ Invoice ${res.data.data.invoiceNo} sent to tenant! Due in ${form.dueDays} days.`);
            setMsgType("success");
            setForm({ propertyId:"", tenantId:"", tenantLabel:"", amount:"", forMonth:"", note:"", dueDays:"7" });
            load();
        } catch (err) {
            setMsg(err.response?.data?.message || "Failed to generate invoice");
            setMsgType("error");
        } finally { setLoading(false); }
    };

    const summary = {
        total:   invoices.length,
        paid:    invoices.filter(i => i.status === "Paid").length,
        pending: invoices.filter(i => i.status === "Pending").length,
        overdue: invoices.filter(i => i.status === "Overdue").length,
        revenue: invoices.filter(i => i.status === "Paid").reduce((s, i) => s + (i.amount||0), 0)
    };

    return (
        <div className="container">
            <h2 style={{ marginBottom:"1.5rem", letterSpacing:"-0.02em" }}>Invoice Management</h2>

            {/* ── Summary ── */}
            <div className="dashboard-stats" style={{ marginBottom:"2rem" }}>
                <div className="stat-card"><h3>{summary.total}</h3><p>Total</p></div>
                <div className="stat-card"><h3 style={{color:"#2e7d32"}}>{summary.paid}</h3><p>Paid</p></div>
                <div className="stat-card"><h3 style={{color:"#8a6914"}}>{summary.pending}</h3><p>Pending</p></div>
                <div className="stat-card"><h3 style={{color:"#c0392b"}}>{summary.overdue}</h3><p>Overdue</p></div>
                <div className="stat-card"><h3 style={{color:"#2e7d32",fontSize:"1.1rem"}}>৳{summary.revenue.toLocaleString()}</h3><p>Revenue</p></div>
            </div>

            {/* ── Generate Form ── */}
            <div className="message-box">
                <h3 style={{ marginBottom:"1.2rem" }}>Generate Rent Invoice</h3>

                {/* Prefill notice */}
                {location.state?.prefill && (
                    <div style={{ background:"#f0f8f0", border:"1px solid #c8e6c9", padding:"0.75rem 1rem",
                        marginBottom:"1.1rem", fontSize:"0.83rem", color:"#2e7d32", fontWeight:600,
                        display:"flex", flexWrap:"wrap", gap:"0.3rem", alignItems:"center" }}>
                        ✅ Pre-filled from rental request —&nbsp;
                        <strong>{location.state.prefill.tenantName}</strong> for&nbsp;
                        <strong>{location.state.prefill.propertyLabel}</strong>.
                        &nbsp;Select the month and confirm.
                    </div>
                )}

                {msg && <p className={msgType === "error" ? "error" : "success"} style={{ marginBottom:"1rem" }}>{msg}</p>}

                <form onSubmit={handleGenerate}>
                    <label>Step 1 — Select Property</label>
                    <select value={form.propertyId} onChange={handlePropertyChange} required>
                        <option value="">— Select a property —</option>
                        {uniqueProperties.map(p => (
                            <option key={p.propertyId} value={p.propertyId}>{p.label} (৳{p.monthlyRent}/mo)</option>
                        ))}
                    </select>

                    {form.propertyId && (
                        <>
                            <label style={{ marginTop:"0.5rem" }}>Step 2 — Select Tenant</label>
                            <p style={{ fontSize:"0.78rem", color:"#aaa", margin:"0.2rem 0 0.5rem" }}>
                                Search any tenant by name/email, or pick from known tenants below.
                            </p>
                            <TenantSearchBox knownTenants={tenantsForProperty} onSelect={handleTenantSelect} />

                            {tenantsForProperty.length > 0 && (
                                <div style={{ marginTop:"0.6rem", display:"flex", flexWrap:"wrap", gap:"0.4rem" }}>
                                    {tenantsForProperty.map(t => (
                                        <button key={String(t.tenantId)} type="button"
                                            onClick={() => handleTenantSelect({ tenantId: String(t.tenantId), tenantName: t.tenantName, tenantEmail: t.tenantEmail })}
                                            style={{
                                                background: String(t.tenantId) === form.tenantId ? "#111" : "#f5f2ee",
                                                color:      String(t.tenantId) === form.tenantId ? "#fff" : "#333",
                                                fontSize:"0.78rem", padding:"0.3rem 0.8rem",
                                                border: String(t.tenantId) === form.tenantId ? "1px solid #111" : "1px solid #e8e4dc",
                                                cursor:"pointer", textTransform:"none", letterSpacing:0,
                                                display:"inline-flex", alignItems:"center", gap:"0.3rem"
                                            }}>
                                            {t.tenantName}
                                            <span style={{ background: t.fromRequest ? "#f0f8f0" : "#f5f2ee",
                                                color: t.fromRequest ? "#2e7d32" : "#aaa",
                                                fontSize:"0.62rem", padding:"0.05rem 0.35rem", fontWeight:700 }}>
                                                {t.fromRequest ? "Requested" : "Messaged"}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {form.tenantId && (
                                <p style={{ fontSize:"0.8rem", color:"#2e7d32", marginTop:"0.4rem", fontWeight:600 }}>
                                    ✓ Selected: <strong>{form.tenantLabel}</strong>
                                </p>
                            )}
                        </>
                    )}

                    {form.tenantId && (
                        <>
                            <label style={{ marginTop:"0.5rem" }}>Step 3 — Invoice Details</label>
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.8rem" }}>
                                <div>
                                    <label style={{ fontSize:"0.75rem", color:"#888" }}>For Month *</label>
                                    <select name="forMonth" value={form.forMonth} onChange={handleChange} required>
                                        <option value="">— Select month —</option>
                                        {MONTH_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize:"0.75rem", color:"#888" }}>Amount (BDT) *</label>
                                    <input name="amount" type="number" min="1" value={form.amount} onChange={handleChange} required
                                        onKeyDown={e => { const ok=["Backspace","Delete","Tab","ArrowLeft","ArrowRight","Home","End"]; if (!ok.includes(e.key) && !/^[0-9]$/.test(e.key)) e.preventDefault(); }} />
                                </div>
                                <div>
                                    <label style={{ fontSize:"0.75rem", color:"#888" }}>Payment Due In (days)</label>
                                    <input name="dueDays" type="number" min="1" max="30" value={form.dueDays} onChange={handleChange} />
                                </div>
                                <div>
                                    <label style={{ fontSize:"0.75rem", color:"#888" }}>Note (optional)</label>
                                    <input name="note" placeholder="e.g. Includes utility charges" value={form.note} onChange={handleChange} />
                                </div>
                            </div>
                            {form.forMonth && (
                                <button type="submit" disabled={loading} style={{ marginTop:"0.9rem" }}>
                                    {loading ? "Generating…" : "Generate Invoice"}
                                </button>
                            )}
                        </>
                    )}
                </form>
            </div>

            {/* ── Invoice History ── */}
            <h3 style={{ marginTop:"2.5rem", marginBottom:"1rem", letterSpacing:"-0.01em" }}>Invoice History</h3>
            {invoices.length === 0 ? <p style={{ color:"#aaa", fontSize:"0.88rem" }}>No invoices yet.</p> : (
                <div style={{ overflowX:"auto" }}>
                    <table>
                        <thead>
                            <tr><th>Invoice No</th><th>Tenant</th><th>Property</th><th>Amount</th><th>Month</th><th>Due Date</th><th>Method</th><th>Status</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            {invoices.map(inv => (
                                <tr key={inv._id}>
                                    <td><strong>{inv.invoiceNo}</strong>{inv.note&&<><br/><small style={{color:"#aaa"}}>{inv.note}</small></>}</td>
                                    <td>{inv.tenantInfo?.[0]?.name}<br/><small style={{color:"#aaa"}}>{inv.tenantInfo?.[0]?.email}</small></td>
                                    <td>{inv.propertyInfo?.[0]?.propertyType} — {inv.propertyInfo?.[0]?.area}</td>
                                    <td><strong>৳{inv.amount?.toLocaleString()}</strong></td>
                                    <td>{inv.forMonth}</td>
                                    <td style={{color:inv.status==="Overdue"?"#c0392b":"inherit"}}>{inv.dueDate?new Date(inv.dueDate).toLocaleDateString("en-GB"):"—"}</td>
                                    <td>{inv.paymentMethod||"—"}</td>
                                    <td>{statusBadge(inv.status)}</td>
                                    <td>
                                        {inv.status==="Paid"
                                            ? <button style={{background:"#111",fontSize:"0.74rem",padding:"0.3rem 0.7rem"}} onClick={()=>setReceipt(inv)}>Receipt</button>
                                            : <span style={{fontSize:"0.78rem",color:"#aaa"}}>Awaiting</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Receipt Modal ── */}
            {receipt && (
                <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setReceipt(null)}>
                    <div style={{background:"#fff",padding:"2rem",maxWidth:460,width:"90%",border:"1px solid #e8e4dc",boxShadow:"0 20px 60px rgba(0,0,0,0.18)"}} onClick={e=>e.stopPropagation()}>
                        <div style={{textAlign:"center",marginBottom:"1rem"}}>
                            <div style={{fontSize:"2rem"}}>🧾</div>
                            <h3 style={{letterSpacing:"-0.02em"}}>Payment Receipt</h3>
                            <p style={{color:"#aaa",fontSize:"0.78rem"}}>Bariwala Rental Platform</p>
                        </div>
                        <hr style={{borderColor:"#f0ede8"}}/>
                        <table style={{boxShadow:"none",background:"transparent",marginTop:"0.8rem",border:"none"}}>
                            <tbody>
                                {[["Invoice No",receipt.invoiceNo],["Txn Ref",receipt.transactionRef],["Method",receipt.paymentMethod||"—"],["Tenant",receipt.tenantInfo?.[0]?.name],["Property",`${receipt.propertyInfo?.[0]?.propertyType} — ${receipt.propertyInfo?.[0]?.area}`],["For Month",receipt.forMonth],["Amount",`৳${receipt.amount?.toLocaleString()}`],receipt.note?["Note",receipt.note]:null,["Paid On",receipt.paidAt?new Date(receipt.paidAt).toLocaleString("en-GB"):"—"]].filter(Boolean).map(([l,v])=>(
                                    <tr key={l} style={{background:"transparent"}}>
                                        <td style={{border:"none",padding:"0.28rem 0.5rem",color:"#aaa",fontWeight:600,fontSize:"0.8rem",width:"40%"}}>{l}</td>
                                        <td style={{border:"none",padding:"0.28rem 0.5rem",fontSize:"0.82rem",color:"#111"}}>{v}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <hr style={{marginTop:"0.8rem",borderColor:"#f0ede8"}}/>
                        <p style={{textAlign:"center",color:"#2e7d32",fontWeight:700,marginTop:"0.8rem",fontSize:"0.85rem"}}>✅ Payment Verified</p>
                        <button style={{width:"100%",marginTop:"0.8rem",background:"#111"}} onClick={()=>setReceipt(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandlordInvoices;

