import { Link } from "react-router-dom";
import { POSTS } from "../content/blog";
import { Reveal, ScrollScale, Stagger, StaggerItem } from "./motion";
import BlogCarousel from "./BlogCarousel";
import Icon from "./Icon";

const PILLARS = [
    { icon: "shield", title: "Transparent by default", text: "Clear prices, real photos, and an invoice + receipt for every rent payment." },
    { icon: "chat", title: "Direct, no agents", text: "Message landlords and sellers yourself – no middlemen, no hidden fees." },
    { icon: "heart", title: "Built on trust", text: "Reviews come only from real rentals and every report is checked by an admin." },
];

/** "About us" teaser + latest blog posts, shown under the listings on the landing page. */
const LandingSections = () => (
    <>
        <ScrollScale as="section" className="landing-about mt-4" aria-labelledby="about-h">
            <Reveal className="landing-about-text">
                <span className="eyebrow">About us</span>
                <h2 id="about-h" className="mt-1">One place for renting, moving and everything in between.</h2>
                <p className="muted mt-1">
                    “Bariwala” means landlord in Bangla. We bring tenants, landlords and neighbours together on one platform –
                    find a home, agree terms, pay rent with a receipt, and pass on the furniture you no longer need.
                </p>
                <div className="row-wrap mt-2">
                    <Link to="/about" className="btn btn-primary">Learn more about us</Link>
                    <Link to="/help" className="btn btn-secondary">How it works</Link>
                </div>
            </Reveal>
            <Stagger className="landing-pillars">
                {PILLARS.map(p => (
                    <StaggerItem key={p.title} className="pillar glass-tile">
                        <div className="fi"><Icon name={p.icon} size={20} /></div>
                        <div><strong>{p.title}</strong><p className="small muted">{p.text}</p></div>
                    </StaggerItem>
                ))}
            </Stagger>
        </ScrollScale>

        <ScrollScale as="section" className="mt-4" from={0.9}>
            <div className="row-between mb-2">
                <div>
                    <span className="eyebrow">From the blog</span>
                    <h2 id="blog-h" className="mt-1">Guides for renters, landlords &amp; movers</h2>
                </div>
                <Link to="/blog" className="btn btn-secondary">All articles <Icon name="arrow-right" size={16} /></Link>
            </div>
            <BlogCarousel posts={POSTS} />
        </ScrollScale>
    </>
);

export default LandingSections;
