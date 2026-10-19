import { Link } from "react-router-dom";
import { motion } from "motion/react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Reveal, Stagger, StaggerItem } from "../../components/motion";
import Icon from "../../components/Icon";

const VALUES = [
    { icon: "shield", title: "Transparent", text: "Real prices, real photos and every payment backed by an invoice and a receipt." },
    { icon: "chat", title: "Direct", text: "Tenants talk to landlords and buyers to sellers – no agents in the middle, no hidden fees." },
    { icon: "heart", title: "Safe", text: "Reviews only come from real rentals, and every report is looked at by an admin." },
];

const AUDIENCES = [
    { icon: "key", title: "Tenants", text: "Search by area, rent and facilities, send a rental request, then pay rent online and keep every receipt.", to: "/", cta: "Find a home" },
    { icon: "building", title: "Landlords", text: "List a property in minutes, accept the right tenant, and send monthly invoices without chasing anyone.", to: "/register", cta: "List a property" },
    { icon: "bag", title: "Neighbours", text: "Moving in or out? Buy and sell furniture and household items with people nearby.", to: "/marketplace/items", cta: "Visit the marketplace" },
];

const STEPS = [
    ["search", "Find", "Filter homes by area, type, rent and facilities."],
    ["chat", "Talk", "Message the landlord and send a rental request."],
    ["check-circle", "Agree", "The landlord accepts and sends your first invoice."],
    ["card", "Pay", "Pay online, download a receipt, leave a review."],
];

const About = () => {
    useDocumentTitle("About us");
    return (
        <>
            <section className="hero about-hero">
                <div className="hero-blobs" aria-hidden="true"><span /><span /><span /></div>
                <div className="container container-narrow center">
                    <motion.span className="eyebrow" style={{ color: "#ff8c78" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>About Bariwala</motion.span>
                    <motion.h1 className="mt-1" style={{ maxWidth: "none" }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        Renting and moving, made simple.
                    </motion.h1>
                    <motion.p style={{ margin: "0.9rem auto 0" }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}>
                        “Bariwala” means landlord in Bangla. We built one place where tenants find homes, landlords manage their rentals,
                        and neighbours pass on the things they no longer need – with everything written down and in the open.
                    </motion.p>
                </div>
            </section>

            <div className="container page">
                <Reveal className="about-mission card card-pad">
                    <div className="fi-lg"><Icon name="target" size={26} /></div>
                    <div>
                        <h2>Our mission</h2>
                        <p className="muted mt-1">
                            Finding a home in a busy city shouldn’t mean endless phone calls, unclear deposits and handwritten receipts.
                            Bariwala replaces that with clear listings, direct messaging, simple requests and a payment trail both sides can trust.
                        </p>
                    </div>
                </Reveal>

                <h2 className="mt-4 mb-2">Who it’s for</h2>
                <Stagger className="grid grid-3">
                    {AUDIENCES.map(a => (
                        <StaggerItem key={a.title} className="card card-pad feature-card">
                            <div className="fi"><Icon name={a.icon} size={20} /></div>
                            <h3>{a.title}</h3>
                            <p className="small muted">{a.text}</p>
                            <Link to={a.to} className="blog-more">{a.cta} <Icon name="arrow-right" size={14} /></Link>
                        </StaggerItem>
                    ))}
                </Stagger>

                <h2 className="mt-4 mb-2">What we stand for</h2>
                <Stagger className="grid grid-3">
                    {VALUES.map(v => (
                        <StaggerItem key={v.title} className="card card-pad glass-tile">
                            <div className="fi"><Icon name={v.icon} size={20} /></div>
                            <h3>{v.title}</h3>
                            <p className="small muted">{v.text}</p>
                        </StaggerItem>
                    ))}
                </Stagger>

                <h2 className="mt-4 mb-2">How renting works</h2>
                <Stagger className="steps">
                    {STEPS.map(([icon, t, d], i) => (
                        <StaggerItem key={t} className="step-card">
                            <span className="step-num">{i + 1}</span>
                            <Icon name={icon} size={22} />
                            <strong>{t}</strong>
                            <span className="small muted">{d}</span>
                        </StaggerItem>
                    ))}
                </Stagger>

                <Reveal className="cta-band mt-4">
                    <div>
                        <h2 style={{ color: "#fff" }}>Ready when you are.</h2>
                        <p>Create a free account in under a minute – as a tenant, a landlord or a marketplace user.</p>
                    </div>
                    <div className="row-wrap">
                        <Link to="/register" className="btn btn-primary btn-lg">Create free account</Link>
                        <Link to="/blog" className="btn btn-glass btn-lg">Read the blog</Link>
                    </div>
                </Reveal>

                <p className="xs muted center mt-3">Bariwala is an academic project. Payments on the platform are simulated – no real money is transferred.</p>
            </div>
        </>
    );
};

export default About;
