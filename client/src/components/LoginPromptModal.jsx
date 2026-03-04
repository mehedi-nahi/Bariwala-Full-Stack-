import { Link } from "react-router-dom";

/**
 * LoginPromptModal
 * Shows a pop-up card prompting the user to log in (or explaining access restrictions).
 *
 * Props:
 *  onClose    – fn to close the modal
 *  message    – custom body message (optional)
 *  title      – custom title (optional)
 */
const LoginPromptModal = ({ onClose, title, message }) => (
    <div
        onClick={onClose}
        style={{
            position:"fixed", inset:0, background:"rgba(0,0,0,0.55)",
            zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center",
            padding:"1rem",
        }}
    >
        <div
            onClick={e => e.stopPropagation()}
            style={{
                background:"#fff", maxWidth:400, width:"100%",
                borderRadius:16, overflow:"hidden",
                boxShadow:"0 24px 64px rgba(0,0,0,0.22)",
                animation:"popIn 0.22s cubic-bezier(.34,1.56,.64,1)",
            }}
        >
            {/* Header */}
            <div style={{
                background:"linear-gradient(135deg,#1a1a2e 60%,#e94560)",
                padding:"1.4rem 1.5rem 1.2rem",
                position:"relative",
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position:"absolute", top:"0.9rem", right:"1rem",
                        background:"none", border:"none", color:"rgba(255,255,255,0.5)",
                        fontSize:"1.2rem", cursor:"pointer", lineHeight:1,
                        padding:0, textTransform:"none", letterSpacing:0,
                    }}
                >✕</button>
                <div style={{fontSize:"2rem", marginBottom:"0.4rem"}}>🔐</div>
                <h3 style={{
                    color:"#fff", fontWeight:800, fontSize:"1.05rem",
                    margin:0, letterSpacing:"-0.01em",
                }}>
                    {title || "Login Required"}
                </h3>
            </div>

            {/* Body */}
            <div style={{ padding:"1.4rem 1.5rem" }}>
                <p style={{
                    color:"#555", fontSize:"0.88rem", lineHeight:1.65, marginBottom:"1.3rem",
                }}>
                    {message || "You need to be logged in to enjoy this feature. Create a free account or log in to continue."}
                </p>

                <div style={{ display:"flex", gap:"0.75rem" }}>
                    <Link
                        to="/login"
                        onClick={onClose}
                        style={{
                            flex:1, background:"#1a1a2e", color:"#fff",
                            textDecoration:"none", padding:"0.7rem",
                            borderRadius:9, fontWeight:700, fontSize:"0.85rem",
                            textAlign:"center", transition:"background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background="#111"}
                        onMouseLeave={e => e.currentTarget.style.background="#1a1a2e"}
                    >
                        Login
                    </Link>
                    <Link
                        to="/register"
                        onClick={onClose}
                        style={{
                            flex:1, background:"#e94560", color:"#fff",
                            textDecoration:"none", padding:"0.7rem",
                            borderRadius:9, fontWeight:700, fontSize:"0.85rem",
                            textAlign:"center", transition:"background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background="#c0392b"}
                        onMouseLeave={e => e.currentTarget.style.background="#e94560"}
                    >
                        Register Free
                    </Link>
                </div>

                <button
                    onClick={onClose}
                    style={{
                        marginTop:"0.9rem", width:"100%", background:"none",
                        border:"none", color:"#bbb", cursor:"pointer",
                        fontSize:"0.78rem", padding:"0.3rem",
                        textTransform:"none", letterSpacing:0,
                    }}
                >
                    Continue browsing as guest
                </button>
            </div>
        </div>

        <style>{`
            @keyframes popIn {
                from { opacity:0; transform:scale(0.88) translateY(12px); }
                to   { opacity:1; transform:scale(1)    translateY(0); }
            }
        `}</style>
    </div>
);

export default LoginPromptModal;

