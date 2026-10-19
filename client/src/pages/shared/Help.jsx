import { Link } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { PageHeader } from "../../components/ui";
import Icon from "../../components/Icon";

const FAQS = [
    ["How do I find a rental property?", "Use the search box on the home page to look up an area or address, then narrow results by type, rent range and facilities. You can browse every listing without an account – you only need to sign up as a Tenant to contact landlords or request a home."],
    ["What account types are there?", "Tenant (search and rent homes, pay rent), Landlord (list properties, accept requests, send invoices) and Marketplace (buy and sell furniture and household items). Each type has its own tools. Use a different email if you need more than one."],
    ["How does renting work?", "1) Tenant sends a rental request from the property page. 2) The landlord accepts or rejects it. 3) After accepting, the landlord sends monthly invoices. 4) The tenant pays each invoice online and gets a receipt. Both sides can then leave a review."],
    ["How do payments work?", "Payments on this platform are simulated for demonstration. bKash, Nagad, Rocket, card and bank-transfer screens behave like a real gateway but no money moves, and no card or PIN details are stored or sent. Please use made-up numbers."],
    ["Can I sell items?", "Yes – with a Marketplace account use “Sell an item”, add photos, a price and a category. Buyers add items to a cart and check out; you can follow every sale under “My listings”."],
    ["How do messages work?", "Message a landlord from a property page or a seller from an item page. Conversations live in your Inbox, and the mail icon in the top bar shows how many messages are unread."],
    ["How do I report a problem?", "Use the Report button on any listing or inside a conversation and describe what's wrong. Our admins review every report and can remove content or block accounts."],
    ["I forgot my password – what now?", "Password reset by email isn't available yet. If you can still log in, change your password under Dashboard → Security. Otherwise contact support below and we'll help."],
];

const Help = () => {
    useDocumentTitle("Help & FAQ");
    return (
        <div className="container container-narrow page">
            <PageHeader title="Help & FAQ" subtitle="Quick answers to the most common questions." />

            <div className="card card-pad help-faq">
                {FAQS.map(([q, a]) => (
                    <details key={q}>
                        <summary>{q}</summary>
                        <p>{a}</p>
                    </details>
                ))}
            </div>

            <div className="card card-pad mt-3" id="contact">
                <h3 className="mb-1">Still need help?</h3>
                <p className="muted mb-2">Email us and we&apos;ll get back to you within one working day.</p>
                <div className="row-wrap">
                    <a className="btn btn-secondary" href="mailto:support@bariwala.com"><Icon name="mail" size={16} /> support@bariwala.com</a>
                    <Link className="btn btn-ghost" to="/">Back to rentals</Link>
                </div>
            </div>
        </div>
    );
};

export default Help;
