import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import Icon from "./Icon";
import { INBOX_PATH } from "../utils/constants";

const col = { hidden: { opacity: 0, y: 16 }, show: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }) };

const Column = ({ i, title, links }) => (
    <motion.div custom={i} variants={col} initial="hidden" whileInView="show" viewport={{ once: true, margin: "0px 0px -40px 0px" }}>
        <h4>{title}</h4>
        <ul>
            {links.filter(Boolean).map(([to, label]) => (
                <li key={label}><Link to={to} className="footer-link"><Icon name="chevron-right" size={12} /> {label}</Link></li>
            ))}
        </ul>
    </motion.div>
);

const Footer = ({ user }) => {
    const role = user?.role;
    const { pathname } = useLocation();
    // the About page ends with its own call to action, and the admin console doesn't need a sales pitch
    const showCta = pathname !== "/about" && role !== "admin";
    return (
        <footer className={`footer${showCta ? " has-cta" : ""}`}>
            {/* call-to-action band – changes with who is looking */}
            {showCta && <div className="footer-cta-wrap">
                <motion.div className="footer-cta" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                    <div className="footer-cta-glow" aria-hidden="true" />
                    <div>
                        <h3>{role === "landlord" ? "Have another home to rent out?" : role === "marketplace" ? "Got something to sell?" : "Your next home is a search away."}</h3>
                        <p>{role === "landlord" ? "List it in minutes and start receiving rental requests." : role === "marketplace" ? "Post it with a few photos and reach buyers nearby." : "Browse homes across the city, message landlords directly and pay rent online."}</p>
                    </div>
                    <div className="row-wrap">
                        {role === "landlord" ? <Link to="/landlord/add-property" className="btn btn-primary btn-lg">Add a property <Icon name="arrow-right" size={16} /></Link>
                            : role === "marketplace" ? <Link to="/marketplace/add-item" className="btn btn-primary btn-lg">Sell an item <Icon name="arrow-right" size={16} /></Link>
                                : <Link to="/" className="btn btn-primary btn-lg">Browse homes <Icon name="arrow-right" size={16} /></Link>}
                        {!user && <Link to="/register" className="btn btn-glass btn-lg">Create free account</Link>}
                    </div>
                </motion.div>
            </div>}

            <div className="footer-grid">
                <motion.div variants={col} custom={0} initial="hidden" whileInView="show" viewport={{ once: true }}>
                    <Link to="/" className="brand" style={{ marginBottom: "0.9rem" }}>
                        <span className="brand-mark"><Icon name="home" size={17} stroke={2.2} /></span>
                        <span>Bari<em>wala</em></span>
                    </Link>
                    <p>Find a home, manage your rentals and trade household items – landlords, tenants and neighbours on one platform.</p>
                    <ul className="footer-contact">
                        <li><span className="fc-icon"><Icon name="mail" size={15} /></span><a href="mailto:support@bariwala.com">support@bariwala.com</a></li>
                        <li><span className="fc-icon"><Icon name="pin" size={15} /></span>Dhaka, Bangladesh</li>
                        <li><span className="fc-icon"><Icon name="clock" size={15} /></span>Support replies within one working day</li>
                    </ul>
                </motion.div>
                <Column i={1} title="Rentals" links={[
                    ["/", "Browse homes"],
                    !user && ["/register", "List a property"],
                    role === "landlord" && ["/landlord/add-property", "List a property"],
                    role === "landlord" && ["/landlord/properties", "My properties"],
                    role === "tenant" && ["/tenant/requests", "My requests"],
                    role === "tenant" && ["/tenant/payments", "Pay rent"],
                    role === "landlord" && ["/landlord/invoices", "Invoices"],
                ]} />
                <Column i={2} title="Marketplace" links={[
                    ["/marketplace/items", "Browse items"],
                    !user && ["/register", "Sell an item"],
                    role === "marketplace" && ["/marketplace/add-item", "Sell an item"],
                    role === "marketplace" && ["/marketplace/my-items", "My listings"],
                    role === "marketplace" && ["/marketplace/orders", "My orders"],
                ]} />
                <Column i={3} title="Company" links={[["/about", "About us"], ["/blog", "Blog"], ["/help", "Help & FAQ"]]} />
                <Column i={4} title={user ? "Your account" : "Get started"} links={user
                    ? [["/profile", "Dashboard & profile"], [INBOX_PATH[role], "Inbox"], role === "admin" && ["/admin/reports", "Reports"]]
                    : [["/register", "Create an account"], ["/login", "Log in"]]} />
            </div>

            <div className="footer-trust">
                <div>
                    {[["shield", "Admin-moderated listings"], ["receipt", "Receipts for every payment"], ["chat", "Direct messaging, no agents"], ["lock", "Secure, private accounts"]].map(([icon, t]) => (
                        <span key={t}><Icon name={icon} size={16} /> {t}</span>
                    ))}
                </div>
            </div>

            <div className="footer-bottom">
                <div>
                    <span>© {new Date().getFullYear()} Bariwala · Built for academic purposes · Payments are simulated.</span>
                    <button type="button" className="footer-top-link" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                        Back to top <Icon name="chevron-up" size={14} />
                    </button>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
