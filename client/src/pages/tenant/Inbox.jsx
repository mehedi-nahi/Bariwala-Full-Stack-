import { useCallback, useEffect, useRef, useState } from "react";
import { inboxAPI, getConversationAPI, getItemConversationAPI, sendMessageAPI } from "../../api/messageAPI";
import { publicProfileAPI } from "../../api/userAPI";
import { createReportAPI } from "../../api/reportAPI";

/* ─── Avatar with colour-coded initials ─── */
const AVATAR_COLORS = ["#e94560","#1a1a2e","#2980b9","#27ae60","#8e44ad","#e67e22","#16a085","#c0392b"];
const Avatar = ({ name, size = 40, online=false }) => {
    const initials = name ? name.trim().split(/\s+/).map(w => w[0]).join("").slice(0,2).toUpperCase() : "?";
    const bg       = AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
    return (
        <div style={{position:"relative",flexShrink:0}}>
            <div style={{
                width: size, height: size, borderRadius: "50%", background: bg,
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: size * 0.32, flexShrink: 0, userSelect: "none"
            }}>{initials}</div>
            {online && <span style={{position:"absolute",bottom:1,right:1,width:9,height:9,
                background:"#27ae60",borderRadius:"50%",border:"2px solid #fff"}}/>}
        </div>
    );
};

/* ─── Time-ago helper ─── */
const timeAgo = (d) => {
    const s = (Date.now() - new Date(d)) / 1000;
    if (s < 60)    return "just now";
    if (s < 3600)  return `${Math.floor(s/60)}m`;
    if (s < 86400) return `${Math.floor(s/3600)}h`;
    return new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short" });
};

/* ─── SVG icon ─── */
const IC = ({d,size=16,stroke="#aaa"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
        <path d={d}/>
    </svg>
);

const roleColor = r => r==="landlord"?"#e94560":r==="tenant"?"#2980b9":r==="marketplace"?"#27ae60":"#888";
const roleLabel = r => r ? r.charAt(0).toUpperCase()+r.slice(1) : "";

/* ════════════════════════════════════════════════ */
/*   MAIN INBOX COMPONENT                          */
/* ════════════════════════════════════════════════ */
const Inbox = ({ user }) => {
    const [threads,      setThreads]      = useState([]);
    const [selected,     setSelected]     = useState(null);
    const [messages,     setMessages]     = useState([]);
    const [reply,        setReply]        = useState("");
    const [sending,      setSending]      = useState(false);
    const [loadingInbox, setLoadingInbox] = useState(true);
    const [loadingMsgs,  setLoadingMsgs]  = useState(false);
    const [otherProfile, setOtherProfile] = useState(null);
    const [showReport,   setShowReport]   = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reportMsg,    setReportMsg]    = useState("");
    const [search,       setSearch]       = useState("");
    const msgEndRef = useRef(null);
    const pollRef   = useRef(null);
    const inputRef  = useRef(null);
    const myId      = String(user?.id || user?._id || "");

    /* ── Load / refresh inbox ── */
    const loadInbox = useCallback(async (silent = false) => {
        if (!silent) setLoadingInbox(true);
        try {
            const r = await inboxAPI();
            setThreads(r.data.data || []);
        } catch { /* ignore */ } finally {
            if (!silent) setLoadingInbox(false);
        }
    }, []);

    useEffect(() => { loadInbox(); }, [loadInbox]);

    /* ── Load messages for a thread ── */
    const loadMessages = useCallback(async (thread, silent = false) => {
        if (!thread) return;
        if (!silent) setLoadingMsgs(true);
        try {
            const r = thread.contextType === "property"
                ? await getConversationAPI(thread.contextId, thread.otherId)
                : await getItemConversationAPI(thread.contextId, thread.otherId);
            setMessages(r.data.data || []);
        } catch { /* ignore */ } finally {
            if (!silent) setLoadingMsgs(false);
        }
    }, []);

    /* ── Poll for new messages every 8 s while a thread is open ── */
    useEffect(() => {
        if (!selected) { clearInterval(pollRef.current); return; }
        clearInterval(pollRef.current);
        pollRef.current = setInterval(() => {
            loadMessages(selected, true);
            loadInbox(true);
        }, 8000);
        return () => clearInterval(pollRef.current);
    }, [selected, loadMessages, loadInbox]);

    /* ── Scroll to bottom when messages change ── */
    useEffect(() => {
        msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    /* ── Open a thread ── */
    const openThread = async t => {
        setSelected(t);
        setMobileView("chat");
        setMessages([]);
        setOtherProfile(null);
        setShowReport(false);
        setReportMsg("");
        await loadMessages(t);
        await loadInbox(true);
        inputRef.current?.focus();
        publicProfileAPI(t.otherId).then(r=>setOtherProfile(r.data.data)).catch(()=>{});
    };

    /* ── Send a message ── */
    const handleSend = async () => {
        if (!reply.trim() || !selected || sending) return;
        setSending(true);
        try {
            const payload = selected.contextType === "property"
                ? { propertyId:selected.contextId, receiverId:selected.otherId, message:reply.trim() }
                : { itemId:selected.contextId,     receiverId:selected.otherId, message:reply.trim() };
            await sendMessageAPI(payload);
            setReply("");
            await loadMessages(selected, true);
            await loadInbox(true);
        } catch { /* ignore */ }
        finally { setSending(false); }
    };

    /* ── Report a user ── */
    const handleReport = async e => {
        e.preventDefault();
        if (!reportReason.trim()) return;
        try {
            await createReportAPI({ reportType:"user", reportedEntity:selected.otherId, reason:reportReason.trim() });
            setReportMsg("✅ Report submitted successfully.");
            setReportReason("");
        } catch { setReportMsg("❌ Failed to submit report."); }
    };

    const totalUnread = threads.reduce((s,t)=>s+(t.unreadCount||0),0);
    const filtered = search.trim()
        ? threads.filter(t=>t.otherUser?.name?.toLowerCase().includes(search.toLowerCase()))
        : threads;
    const canReport = otherProfile && otherProfile.role !== user?.role;

    const [mobileView, setMobileView] = useState("list"); // "list" | "chat"

    return (
        <div style={{display:"flex",height:"calc(100vh - 62px)",overflow:"hidden",background:"#f0f2f5",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
            <style>{`
                @media(max-width:640px){
                    .inbox-sidebar{ width:100%!important; min-width:0!important; display:flex!important; flex-direction:column; }
                    .inbox-sidebar.mobile-hidden{ display:none!important; }
                    .inbox-chat{ display:flex!important; flex-direction:column; width:100%; }
                    .inbox-chat.mobile-hidden{ display:none!important; }
                    .inbox-back-btn{ display:block!important; }
                }
            `}</style>

            {/* ══ COL 1: SIDEBAR ══ */}
            <div className={`inbox-sidebar${selected && mobileView==="chat" ? " mobile-hidden" : ""}`}
                style={{width:300,minWidth:260,background:"#fff",borderRight:"1px solid #e8eaed",
                display:"flex",flexDirection:"column",overflow:"hidden"}}>

                {/* Sidebar header */}
                <div style={{padding:"1rem 1rem 0.75rem",borderBottom:"1px solid #f0f0f0",background:"#fff"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.75rem"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                            <IC d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" size={18} stroke="#1a1a2e"/>
                            <h3 style={{margin:0,fontSize:"0.97rem",fontWeight:700,color:"#1a1a2e"}}>Inbox</h3>
                        </div>
                        {totalUnread>0 && (
                            <span style={{background:"#e94560",color:"#fff",borderRadius:10,fontSize:"0.68rem",
                                fontWeight:700,padding:"0.15rem 0.55rem",minWidth:20,textAlign:"center"}}>
                                {totalUnread}
                            </span>
                        )}
                    </div>
                    {/* Search */}
                    <div style={{position:"relative"}}>
                        <div style={{position:"absolute",left:"0.65rem",top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}>
                            <IC d="M21 21l-4.35-4.35m0 0A7 7 0 103.65 3.65a7 7 0 0012.99 13z" size={14} stroke="#bbb"/>
                        </div>
                        <input value={search} onChange={e=>setSearch(e.target.value)}
                            placeholder="Search conversations..."
                            style={{width:"100%",boxSizing:"border-box",padding:"0.48rem 2rem 0.48rem 2.1rem",
                                borderRadius:8,border:"1px solid #e8eaed",background:"#f5f6fa",
                                fontSize:"0.83rem",outline:"none",color:"#333"}}/>
                        {search && (
                            <button onClick={()=>setSearch("")}
                                style={{position:"absolute",right:"0.5rem",top:"50%",transform:"translateY(-50%)",
                                    background:"none",border:"none",color:"#bbb",cursor:"pointer",padding:0,fontSize:"0.8rem"}}>✕</button>
                        )}
                    </div>
                </div>

                {/* Thread list */}
                <div style={{flex:1,overflowY:"auto"}}>
                    {loadingInbox && (
                        <div style={{padding:"2rem",textAlign:"center",color:"#bbb",fontSize:"0.85rem"}}>Loading...</div>
                    )}
                    {!loadingInbox && filtered.length===0 && (
                        <div style={{padding:"2rem",textAlign:"center",color:"#bbb",fontSize:"0.85rem"}}>
                            {search ? `No results for "${search}"` : "No conversations yet."}
                        </div>
                    )}
                    {filtered.map((t,i)=>{
                        const isActive  = selected?.contextId===t.contextId && selected?.otherId===t.otherId;
                        const hasUnread = (t.unreadCount||0)>0;
                        const ctxLabel  = t.contextType==="property"
                            ? `${t.contextInfo?.propertyType||"Property"} · ${t.contextInfo?.area||""}`
                            : (t.contextInfo?.title||"Item");
                        return (
                            <div key={i} onClick={()=>openThread(t)}
                                style={{padding:"0.78rem 1rem",display:"flex",gap:"0.75rem",alignItems:"center",
                                    cursor:"pointer",borderBottom:"1px solid #f5f5f5",transition:"background 0.12s",
                                    background:isActive?"#fff0f2":hasUnread?"#fafbff":"#fff"}}
                                onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background="#f9f9f9";}}
                                onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background=hasUnread?"#fafbff":"#fff";}}>
                                <Avatar name={t.otherUser?.name} size={44}/>
                                <div style={{flex:1,minWidth:0}}>
                                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.15rem"}}>
                                        <span style={{fontWeight:hasUnread?700:600,fontSize:"0.88rem",
                                            color:isActive?"#e94560":"#1a1a2e",
                                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:140}}>
                                            {t.otherUser?.name||"User"}
                                        </span>
                                        <span style={{fontSize:"0.68rem",color:"#bbb",flexShrink:0}}>{timeAgo(t.lastDate)}</span>
                                    </div>
                                    <div style={{fontSize:"0.73rem",color:"#999",marginBottom:"0.15rem",
                                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                        {ctxLabel}
                                    </div>
                                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                        <span style={{fontSize:"0.75rem",color:"#aaa",overflow:"hidden",
                                            textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:170,
                                            fontWeight:hasUnread?600:400}}>
                                            {t.lastMessage}
                                        </span>
                                        {hasUnread && (
                                            <span style={{background:"#e94560",color:"#fff",borderRadius:10,
                                                fontSize:"0.62rem",fontWeight:700,padding:"0.1rem 0.42rem",
                                                minWidth:18,textAlign:"center",flexShrink:0}}>
                                                {t.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ══ COL 2: CHAT ══ */}
            <div className={`inbox-chat${mobileView==="list" ? " mobile-hidden" : ""}`}
                style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#f5f6fa"}}>
                {!selected ? (
                    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                        justifyContent:"center",gap:"0.75rem",color:"#ccc"}}>
                        <div style={{width:72,height:72,borderRadius:"50%",background:"#fff",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                            <IC d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" size={32} stroke="#ddd"/>
                        </div>
                        <p style={{fontSize:"0.95rem",fontWeight:600,color:"#bbb",margin:0}}>Select a conversation</p>
                        <p style={{fontSize:"0.8rem",color:"#ccc",margin:0}}>Choose from the list to start chatting</p>
                    </div>
                ) : (
                    <>
                        {/* Chat header */}
                        <div style={{padding:"0.8rem 1rem",background:"#fff",borderBottom:"1px solid #e8eaed",
                            display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,
                            boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                            <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                                {/* Back button — mobile only */}
                                <button onClick={()=>setMobileView("list")} className="inbox-back-btn"
                                    style={{background:"none",border:"none",cursor:"pointer",padding:"0.25rem 0.4rem 0.25rem 0",
                                        color:"#888",fontSize:"1.1rem",lineHeight:1,display:"none",textTransform:"none",letterSpacing:0}}>
                                    ‹
                                </button>
                                <Avatar name={selected.otherUser?.name} size={40} online/>
                                <div>
                                    <div style={{fontWeight:700,fontSize:"0.95rem",color:"#1a1a2e",lineHeight:1.2}}>
                                        {selected.otherUser?.name}
                                    </div>
                                    <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginTop:"0.15rem",flexWrap:"wrap"}}>
                                        <span style={{background:roleColor(selected.otherUser?.role),color:"#fff",
                                            fontSize:"0.65rem",fontWeight:700,padding:"0.1rem 0.5rem",borderRadius:10}}>
                                            {roleLabel(selected.otherUser?.role)}
                                        </span>
                                        <span style={{fontSize:"0.75rem",color:"#aaa"}}>
                                            {selected.contextType==="property"
                                                ? `${selected.contextInfo?.propertyType} · ${selected.contextInfo?.area}`
                                                : selected.contextInfo?.title}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {/* Channel badge */}
                            <span style={{background:"#f0f2f5",color:"#888",fontSize:"0.72rem",fontWeight:600,
                                padding:"0.25rem 0.7rem",borderRadius:6,border:"1px solid #e8eaed",flexShrink:0}}>
                                {selected.contextType==="property" ? "🏠 Rental Chat" : "🛒 Marketplace Chat"}
                            </span>
                        </div>

                        {/* Messages */}
                        <div style={{flex:1,overflowY:"auto",padding:"1.2rem 1.4rem 0.5rem",
                            display:"flex",flexDirection:"column",gap:"0.4rem"}}>
                            {loadingMsgs && (
                                <p style={{textAlign:"center",color:"#ccc",fontSize:"0.85rem"}}>Loading messages...</p>
                            )}
                            {!loadingMsgs && messages.length===0 && (
                                <div style={{textAlign:"center",marginTop:"3rem",color:"#ccc"}}>
                                    <IC d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" size={36} stroke="#ddd"/>
                                    <p style={{marginTop:"0.75rem",fontSize:"0.88rem",fontWeight:600}}>No messages yet</p>
                                    <p style={{fontSize:"0.78rem",margin:0}}>Say hello to start the conversation 👋</p>
                                </div>
                            )}
                            {messages.map((m,idx)=>{
                                const isMine = String(m.sender)===myId;
                                const prev   = messages[idx-1];
                                const next   = messages[idx+1];
                                const showAvatar = !isMine && (!next || String(next.sender)!==String(m.sender));
                                const showSender = !isMine && (!prev || String(prev.sender)!==String(m.sender));
                                return (
                                    <div key={m._id} style={{display:"flex",flexDirection:"column",
                                        alignItems:isMine?"flex-end":"flex-start",gap:"0.05rem"}}>
                                        {showSender && (
                                            <span style={{fontSize:"0.7rem",color:"#bbb",marginBottom:"0.1rem",paddingLeft:isMine?0:48}}>
                                                {m.senderInfo?.[0]?.name||selected.otherUser?.name}
                                            </span>
                                        )}
                                        <div style={{display:"flex",alignItems:"flex-end",gap:"0.45rem",
                                            flexDirection:isMine?"row-reverse":"row"}}>
                                            {!isMine && (
                                                <div style={{width:32,flexShrink:0}}>
                                                    {showAvatar && <Avatar name={selected.otherUser?.name} size={32}/>}
                                                </div>
                                            )}
                                            <div style={{
                                                maxWidth:"62%",padding:"0.55rem 0.9rem",
                                                borderRadius:isMine?"16px 16px 4px 16px":"16px 16px 16px 4px",
                                                fontSize:"0.88rem",lineHeight:1.5,wordBreak:"break-word",
                                                background:isMine?"#e94560":"#fff",
                                                color:isMine?"#fff":"#333",
                                                boxShadow:isMine?"0 2px 8px rgba(233,69,96,0.2)":"0 1px 4px rgba(0,0,0,0.07)"}}>
                                                {m.message}
                                                <div style={{fontSize:"0.64rem",opacity:0.65,marginTop:"0.25rem",
                                                    textAlign:isMine?"right":"left"}}>
                                                    {timeAgo(m.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={msgEndRef}/>
                        </div>

                        {/* Reply bar */}
                        <div style={{padding:"0.8rem 1.2rem",background:"#fff",borderTop:"1px solid #e8eaed",
                            display:"flex",gap:"0.6rem",alignItems:"flex-end",flexShrink:0}}>
                            <textarea ref={inputRef} value={reply}
                                onChange={e=>setReply(e.target.value)}
                                placeholder={`Message ${selected.otherUser?.name||""}…`}
                                rows={1}
                                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
                                disabled={sending}
                                style={{flex:1,padding:"0.6rem 0.9rem",borderRadius:22,border:"1px solid #e0e0e0",
                                    fontSize:"0.9rem",outline:"none",resize:"none",lineHeight:1.4,
                                    background:"#f9fafb",overflowY:"hidden",fontFamily:"inherit"}}/>
                            <button onClick={handleSend} disabled={!reply.trim()||sending}
                                style={{background:(!reply.trim()||sending)?"#e0e0e0":"#e94560",
                                    color:(!reply.trim()||sending)?"#aaa":"#fff",border:"none",
                                    borderRadius:22,padding:"0.6rem 1.3rem",cursor:(!reply.trim()||sending)?"not-allowed":"pointer",
                                    fontSize:"0.88rem",fontWeight:700,flexShrink:0,transition:"all 0.15s",
                                    display:"flex",alignItems:"center",gap:"0.35rem"}}>
                                {sending ? "…" : <>Send <IC d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" size={14} stroke="#fff"/></>}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* ══ COL 3: DETAILS PANEL ══ */}
            {selected && (
                <div style={{width:260,minWidth:240,background:"#fff",borderLeft:"1px solid #e8eaed",
                    display:"flex",flexDirection:"column",overflowY:"auto"}}>

                    {/* Profile card */}
                    <div style={{padding:"1.5rem 1.2rem 1rem",borderBottom:"1px solid #f0f0f0",textAlign:"center"}}>
                        <div style={{display:"flex",justifyContent:"center",marginBottom:"0.75rem"}}>
                            <Avatar name={selected.otherUser?.name} size={64} online/>
                        </div>
                        <div style={{fontWeight:700,fontSize:"1rem",color:"#1a1a2e",marginBottom:"0.25rem"}}>
                            {selected.otherUser?.name}
                        </div>
                        <span style={{display:"inline-block",background:roleColor(selected.otherUser?.role),
                            color:"#fff",fontSize:"0.7rem",fontWeight:700,padding:"0.2rem 0.75rem",
                            borderRadius:20,marginBottom:"0.5rem"}}>
                            {roleLabel(selected.otherUser?.role)}
                        </span>
                        {otherProfile?.bio && (
                            <p style={{fontSize:"0.78rem",color:"#888",lineHeight:1.5,margin:"0.5rem 0 0"}}>
                                {otherProfile.bio}
                            </p>
                        )}
                    </div>

                    {/* User details */}
                    <div style={{padding:"0.9rem 1.2rem",borderBottom:"1px solid #f0f0f0"}}>
                        <p style={{fontSize:"0.7rem",fontWeight:700,color:"#aaa",textTransform:"uppercase",
                            letterSpacing:"0.06em",margin:"0 0 0.7rem"}}>Details</p>
                        {[
                            {icon:"M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
                             label:"Email", value:otherProfile?.email||"—"},
                            {icon:"M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498A1 1 0 0121 17.48V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
                             label:"Phone", value:otherProfile?.phone||"—"},
                            {icon:"M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
                             label:"Member since", value:otherProfile?.memberSince ? new Date(otherProfile.memberSince).toLocaleDateString("en-GB",{month:"short",year:"numeric"}) : "—"},
                        ].map(row=>(
                            <div key={row.label} style={{display:"flex",alignItems:"flex-start",gap:"0.6rem",
                                padding:"0.5rem 0",borderBottom:"1px solid #f9f9f9"}}>
                                <div style={{marginTop:1,flexShrink:0}}>
                                    <IC d={row.icon} size={14} stroke="#e94560"/>
                                </div>
                                <div style={{minWidth:0}}>
                                    <div style={{fontSize:"0.68rem",color:"#aaa",fontWeight:600,
                                        textTransform:"uppercase",letterSpacing:"0.04em"}}>{row.label}</div>
                                    <div style={{fontSize:"0.8rem",color:"#333",wordBreak:"break-all"}}>{row.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Context (property / item) */}
                    <div style={{padding:"0.9rem 1.2rem",borderBottom:"1px solid #f0f0f0"}}>
                        <p style={{fontSize:"0.7rem",fontWeight:700,color:"#aaa",textTransform:"uppercase",
                            letterSpacing:"0.06em",margin:"0 0 0.7rem"}}>
                            {selected.contextType==="property" ? "Property" : "Item"}
                        </p>
                        {selected.contextType==="property" ? (
                            <>
                                {[
                                    {l:"Type",    v:selected.contextInfo?.propertyType},
                                    {l:"Area",    v:selected.contextInfo?.area},
                                    {l:"Rent",    v:selected.contextInfo?.monthlyRent ? `৳${selected.contextInfo.monthlyRent.toLocaleString()}/mo` : "—"},
                                    {l:"Status",  v:selected.contextInfo?.availability},
                                ].map(r=>(
                                    <div key={r.l} style={{display:"flex",justifyContent:"space-between",
                                        padding:"0.38rem 0",borderBottom:"1px solid #f9f9f9",fontSize:"0.8rem"}}>
                                        <span style={{color:"#aaa",fontWeight:600}}>{r.l}</span>
                                        <span style={{color:"#333",fontWeight:r.l==="Rent"?700:400}}>{r.v||"—"}</span>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <>
                                {[
                                    {l:"Title",     v:selected.contextInfo?.title},
                                    {l:"Price",     v:selected.contextInfo?.price ? `৳${selected.contextInfo.price.toLocaleString()}` : "—"},
                                    {l:"Condition", v:selected.contextInfo?.condition},
                                ].map(r=>(
                                    <div key={r.l} style={{display:"flex",justifyContent:"space-between",
                                        padding:"0.38rem 0",borderBottom:"1px solid #f9f9f9",fontSize:"0.8rem"}}>
                                        <span style={{color:"#aaa",fontWeight:600}}>{r.l}</span>
                                        <span style={{color:"#333"}}>{r.v||"—"}</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>

                    {/* Report section */}
                    {canReport && (
                        <div style={{padding:"0.9rem 1.2rem",marginTop:"auto"}}>
                            {!showReport && !reportMsg && (
                                <button onClick={()=>setShowReport(true)}
                                    style={{width:"100%",background:"none",border:"1px solid #e74c3c",
                                        color:"#e74c3c",borderRadius:8,padding:"0.45rem",fontSize:"0.8rem",
                                        cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",
                                        justifyContent:"center",gap:"0.4rem"}}>
                                    <IC d="M3 21l9-18 9 18H3zm9-3v-4m0 5v1" size={13} stroke="#e74c3c"/>
                                    Report this user
                                </button>
                            )}
                            {showReport && !reportMsg && (
                                <div>
                                    <p style={{fontWeight:700,fontSize:"0.82rem",color:"#e74c3c",marginBottom:"0.5rem"}}>
                                        🚩 Report User
                                    </p>
                                    <form onSubmit={handleReport}>
                                        <textarea value={reportReason} onChange={e=>setReportReason(e.target.value)}
                                            placeholder="Describe the issue…"
                                            style={{width:"100%",padding:"0.5rem",borderRadius:7,border:"1px solid #e0e0e0",
                                                fontSize:"0.8rem",minHeight:75,resize:"vertical",
                                                boxSizing:"border-box",fontFamily:"inherit",outline:"none"}}
                                            required/>
                                        <div style={{display:"flex",gap:"0.4rem",marginTop:"0.5rem"}}>
                                            <button type="submit"
                                                style={{background:"#e74c3c",color:"#fff",border:"none",flex:1,
                                                    borderRadius:7,padding:"0.42rem",fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>
                                                Submit
                                            </button>
                                            <button type="button" onClick={()=>setShowReport(false)}
                                                style={{background:"#f5f5f5",color:"#888",border:"none",flex:1,
                                                    borderRadius:7,padding:"0.42rem",fontSize:"0.78rem",cursor:"pointer"}}>
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                            {reportMsg && (
                                <p style={{fontSize:"0.82rem",fontWeight:600,
                                    color:reportMsg.startsWith("✅")?"#27ae60":"#e74c3c",textAlign:"center"}}>
                                    {reportMsg}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Inbox;
