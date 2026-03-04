import { Link } from "react-router-dom";
import { useState } from "react";

/* ── Inline SVG icons ── */
const IC = ({ d, size=16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
        <path d={d}/>
    </svg>
);

/* ══════════════════════════════════════
   FAQ DATA
══════════════════════════════════════ */
const FAQS = [
    {
        q: "How do I find a rental property on Bariwala?",
        a: "Use the search bar on the Home page to filter by area, rent range, and property type. You can browse all listings without an account, but you'll need to register as a Tenant to contact landlords or make payments."
    },
    {
        q: "What roles are available when I register?",
        a: "You can register as a Tenant (to search & rent properties), a Landlord (to list & manage properties), or a Marketplace User (to buy & sell furniture and used items). Each role has its own dedicated dashboard."
    },
    {
        q: "How does the rent payment simulation work?",
        a: "Landlords generate invoices for their tenants. Tenants can then pay through a simulated gateway supporting bKash, Nagad, Rocket, and Debit/Credit Card. All transactions are recorded in your payment history — no real money is transferred."
    },
    {
        q: "Can I sell furniture on Bariwala?",
        a: "Yes! Marketplace users can post used or new furniture and household items with photos, price, and condition. Buyers can browse listings, add items to cart, and complete a simulated checkout."
    },
    {
        q: "How does the messaging system work?",
        a: "Tenants can initiate a conversation with a landlord from any property listing. Landlords can reply from their Inbox. All chats are stored in the database and accessible from the Inbox page in your navbar."
    },
    {
        q: "How do I report a fake listing or bad behavior?",
        a: "On any property or marketplace listing detail page, you'll find a 'Report' button. You can also report a user directly from their profile in the Inbox conversation panel. All reports are reviewed by the Admin."
    },
];

/* ── FAQ Accordion Item ── */
const FAQItem = ({ q, a, isOpen, onToggle }) => (
    <div style={{borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
        <button onClick={onToggle} style={{
            width:"100%",background:"none",border:"none",
            padding:"1.15rem 0",display:"flex",alignItems:"center",
            justifyContent:"space-between",gap:"1rem",cursor:"pointer",textAlign:"left"
        }}>
            <span style={{fontWeight:600,fontSize:"0.92rem",color:isOpen?"#e94560":"#ddd",
                lineHeight:1.45,transition:"color 0.2s"}}>
                {q}
            </span>
            <span style={{
                width:26,height:26,borderRadius:"50%",flexShrink:0,
                background:isOpen?"#e94560":"rgba(255,255,255,0.07)",
                display:"flex",alignItems:"center",justifyContent:"center",
                transition:"all 0.2s",
                transform:isOpen?"rotate(45deg)":"rotate(0deg)"
            }}>
                <IC d="M12 4v16M4 12h16" size={13}/>
            </span>
        </button>
        <div style={{
            overflow:"hidden",
            maxHeight:isOpen?"220px":"0",
            transition:"max-height 0.35s ease",
        }}>
            <p style={{fontSize:"0.84rem",color:"#888",lineHeight:1.75,
                margin:"0 0 1.1rem",paddingRight:"2rem"}}>
                {a}
            </p>
        </div>
    </div>
);

/* ── FAQ Section ── */
const FAQSection = () => {
    const [open, setOpen] = useState(null);
    const toggle = i => setOpen(prev => prev === i ? null : i);

    return (
        <div style={{background:"#12121f",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
            <div style={{maxWidth:1100,margin:"0 auto",padding:"3.5rem 1.25rem"}}>

                {/* Section header */}
                <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",
                    flexWrap:"wrap",gap:"1rem",marginBottom:"2.5rem"}}>
                    <div>
                        <div style={{display:"inline-flex",alignItems:"center",gap:"0.45rem",
                            background:"rgba(233,69,96,0.12)",border:"1px solid rgba(233,69,96,0.25)",
                            borderRadius:20,padding:"0.25rem 0.85rem",marginBottom:"0.75rem"}}>
                            <IC d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={13}/>
                            <span style={{fontSize:"0.7rem",fontWeight:700,color:"#e94560",
                                textTransform:"uppercase",letterSpacing:"0.07em"}}>
                                FAQ
                            </span>
                        </div>
                        <h2 style={{margin:0,fontSize:"clamp(1.2rem,4vw,1.65rem)",fontWeight:800,color:"#fff",
                            letterSpacing:"-0.02em",lineHeight:1.2}}>
                            Frequently Asked{" "}
                            <span style={{background:"linear-gradient(90deg,#e94560,#ff7f8e)",
                                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                                Questions
                            </span>
                        </h2>
                    </div>
                    <p style={{maxWidth:300,fontSize:"0.84rem",color:"#666",lineHeight:1.7,margin:0}}>
                        Can't find your answer?{" "}
                        <span style={{color:"#e94560",fontWeight:600}}>support@bariwala.com</span>
                    </p>
                </div>

                {/* Responsive accordion — stacks on mobile */}
                <style>{`
                    .faq-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 3.5rem; }
                    @media(max-width:640px){ .faq-grid { grid-template-columns:1fr !important; } }
                `}</style>
                <div className="faq-grid">
                    <div>
                        {FAQS.slice(0,3).map((f,i)=>(
                            <FAQItem key={i} q={f.q} a={f.a}
                                isOpen={open===i} onToggle={()=>toggle(i)}/>
                        ))}
                    </div>
                    <div>
                        {FAQS.slice(3).map((f,i)=>(
                            <FAQItem key={i+3} q={f.q} a={f.a}
                                isOpen={open===i+3} onToggle={()=>toggle(i+3)}/>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


const COLS = [
    {
        title: "For Tenants",
        links: [
            { label:"Browse Properties", to:"/" },
            { label:"Search by Area",    to:"/" },
            { label:"Payment History",   to:"/tenant/payments" },
            { label:"Inbox",             to:"/tenant/inbox" },
        ],
    },
    {
        title: "For Landlords",
        links: [
            { label:"List a Property",  to:"/landlord/add-property" },
            { label:"My Properties",    to:"/landlord/properties" },
            { label:"Invoice Manager",  to:"/landlord/invoices" },
            { label:"Inbox",            to:"/landlord/inbox" },
        ],
    },
    {
        title: "Marketplace",
        links: [
            { label:"Browse Items",  to:"/marketplace/items" },
            { label:"Sell an Item",  to:"/marketplace/add-item" },
            { label:"My Listings",   to:"/marketplace/my-items" },
        ],
    },
    {
        title: "Company",
        links: [
            { label:"About Bariwala", to:"/" },
            { label:"Register",       to:"/register" },
            { label:"Login",          to:"/login" },
        ],
    },
];

const Footer = () => (
    <footer style={{background:"#1a1a2e",color:"#ccc",marginTop:"auto"}}>

        <style>{`
            .footer-top-grid {
                max-width:1100px; margin:0 auto; padding:3rem 1.25rem;
                display:grid; grid-template-columns:1.6fr repeat(4,1fr); gap:2.5rem;
            }
            .footer-payment-strip {
                max-width:1100px; margin:0 auto; padding:1rem 1.25rem;
                display:flex; align-items:center; justify-content:space-between;
                flex-wrap:wrap; gap:1rem;
            }
            .footer-bottom-bar {
                max-width:1100px; margin:0 auto; padding:1.1rem 1.25rem;
                display:flex; align-items:center; justify-content:space-between;
                flex-wrap:wrap; gap:0.75rem;
            }
            @media(max-width:900px){
                .footer-top-grid { grid-template-columns:1fr 1fr !important; }
            }
            @media(max-width:540px){
                .footer-top-grid { grid-template-columns:1fr !important; }
                .footer-payment-strip { flex-direction:column; align-items:flex-start; }
                .footer-bottom-bar { flex-direction:column; align-items:flex-start; }
            }
        `}</style>

        {/* ── FAQ ── */}
        <FAQSection />

        {/* ── Top strip ── */}
        <div style={{borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
            <div className="footer-top-grid">

                {/* Brand */}
                <div>
                    <Link to="/" style={{textDecoration:"none",display:"inline-flex",alignItems:"center",gap:"0.6rem",marginBottom:"1rem"}}>
                        <div style={{width:38,height:38,borderRadius:9,background:"linear-gradient(135deg,#e94560,#c0392b)",
                            display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 10px rgba(233,69,96,0.45)"}}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
                                <polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                        </div>
                        <div style={{lineHeight:1}}>
                            <span style={{fontWeight:800,fontSize:"1.2rem",letterSpacing:"-0.03em",
                                background:"linear-gradient(90deg,#e94560,#ff7f8e)",
                                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Bari</span>
                            <span style={{fontWeight:800,fontSize:"1.2rem",color:"#fff"}}>wala</span>
                            <div style={{fontSize:"0.52rem",color:"#666",letterSpacing:"0.12em",textTransform:"uppercase",marginTop:2}}>Rental Platform</div>
                        </div>
                    </Link>
                    <p style={{fontSize:"0.83rem",lineHeight:1.7,color:"#888",maxWidth:240}}>
                        Connecting landlords, tenants and local buyers in one trusted platform across Bangladesh.
                    </p>
                    <div style={{marginTop:"1.2rem",display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                        {[
                            {d:"M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", t:"support@bariwala.com"},
                            {d:"M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z", t:"+880 1700-000000"},
                            {d:"M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z", t:"Dhaka, Bangladesh"},
                        ].map(({d,t})=>(
                            <div key={t} style={{display:"flex",alignItems:"center",gap:"0.55rem",fontSize:"0.8rem",color:"#888"}}>
                                <IC d={d} size={14}/>{t}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Link columns */}
                {COLS.map(col=>(
                    <div key={col.title}>
                        <div style={{fontSize:"0.72rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#e94560",marginBottom:"1rem"}}>
                            {col.title}
                        </div>
                        <ul style={{listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:"0.55rem"}}>
                            {col.links.map(l=>(
                                <li key={l.label}>
                                    <Link to={l.to} style={{color:"#888",textDecoration:"none",fontSize:"0.83rem",transition:"color 0.15s",display:"inline-flex",alignItems:"center",gap:"0.35rem"}}
                                        onMouseEnter={e=>e.currentTarget.style.color="#fff"}
                                        onMouseLeave={e=>e.currentTarget.style.color="#888"}>
                                        <span style={{opacity:0.35,fontSize:"0.6rem"}}>›</span>{l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>

        {/* ── Payment methods strip ── */}
        <div style={{borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
            <div className="footer-payment-strip">
                <div style={{fontSize:"0.75rem",color:"#666",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>
                    Simulated Payment Methods
                </div>
                <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
                    {["bKash","Nagad","Rocket","DBBL","VISA","MasterCard"].map(pm=>(
                        <div key={pm} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",
                            borderRadius:6,padding:"0.3rem 0.75rem",fontSize:"0.72rem",fontWeight:700,color:"#aaa",
                            letterSpacing:"0.04em"}}>
                            {pm}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="footer-bottom-bar">
            <div style={{fontSize:"0.78rem",color:"#555"}}>
                © {new Date().getFullYear()} <span style={{color:"#e94560",fontWeight:700}}>Bariwala</span>. All rights reserved. · Built for academic purposes.
            </div>
            <div style={{display:"flex",gap:"1.2rem",flexWrap:"wrap"}}>
                {[{label:"Privacy",to:"/"},{label:"Terms",to:"/"},{label:"Contact",to:"/"}].map(l=>(
                    <Link key={l.label} to={l.to} style={{color:"#555",textDecoration:"none",fontSize:"0.78rem",transition:"color 0.15s"}}
                        onMouseEnter={e=>e.currentTarget.style.color="#e94560"}
                        onMouseLeave={e=>e.currentTarget.style.color="#555"}>
                        {l.label}
                    </Link>
                ))}
            </div>
        </div>
    </footer>
);

export default Footer;

