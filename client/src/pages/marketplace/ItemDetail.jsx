import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { singleItemAPI } from "../../api/marketplaceAPI";
import { useCart } from "../../context/CartContext";
import { fmtDate, money } from "../../utils/format";
import useAsync from "../../hooks/useAsync";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Avatar, Button, ErrorState, PageHeader, PageLoader } from "../../components/ui";
import Icon from "../../components/Icon";
import LoginPromptModal from "../../components/LoginPromptModal";
import ImageGallery from "../../components/ImageGallery";
import ReportModal from "../../components/ReportModal";
import MessageComposer from "../../components/MessageComposer";

const ItemDetail = ({ user }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const cart = useCart();
    const { data: item, loading, error, reload } = useAsync(() => singleItemAPI(id).then(r => r.data.data[0] || null), [id]);
    const [modal, setModal] = useState(null); // gate | report-item | report-seller
    useDocumentTitle(item?.title || "Item");

    if (loading && !item) return <PageLoader label="Loading item…" />;
    if (error || !item) {
        return (
            <div className="container page">
                <ErrorState message={error || "This item may have been sold or removed."} onRetry={error ? reload : undefined} />
                <p className="center mt-2"><Link to="/marketplace/items" className="btn btn-primary">Back to the marketplace</Link></p>
            </div>
        );
    }

    const seller = item.sellerInfo?.[0];
    const isMarketplace = user?.role === "marketplace";
    const myId = String(user?._id || user?.id || "");
    const isOwner = !!seller && myId && String(seller._id) === myId;
    const inCart = cart.has(item._id);
    const gate = () => setModal("gate");

    const buyNow = () => {
        if (!isMarketplace) return gate();
        if (cart.add(item) || inCart) cart.open();
    };

    return (
        <div className="container page">
            <PageHeader
                breadcrumbs={[{ label: "Marketplace", to: "/marketplace/items" }, ...(item.category ? [{ label: item.category, to: `/marketplace/items?cat=${encodeURIComponent(item.category)}` }] : []), { label: item.title }]}
                title={item.title}
                subtitle={<span className="row-wrap" style={{ gap: "0.5rem" }}><span className={`badge ${item.condition === "New" ? "badge-success" : "badge-warning"}`}>{item.condition}</span>{item.category && <span className="badge">{item.category}</span>}<span className="muted small">Listed {fmtDate(item.createdAt)}</span></span>}
            />

            <div className="detail-layout">
                <div className="stack stack-lg">
                    <ImageGallery key={item._id} images={item.images || []} alt={item.title} aspect="4 / 3" placeholderIcon="package" />

                    <section className="card card-pad">
                        <h2 className="mb-1" style={{ fontSize: "1.1rem" }}>Description</h2>
                        {item.description
                            ? <p style={{ whiteSpace: "pre-wrap" }}>{item.description}</p>
                            : <p className="muted">The seller hasn&apos;t added a description. Send them a message to ask for details.</p>}
                    </section>

                    {!isOwner && !item.isSold && seller && (
                        <section className="card card-pad" id="contact" aria-labelledby="contact-h">
                            <h2 id="contact-h" className="mb-1" style={{ fontSize: "1.1rem" }}>Ask {seller.name.split(" ")[0]} a question</h2>
                            {isMarketplace ? (
                                <MessageComposer
                                    payload={{ itemId: item._id, receiverId: seller._id }}
                                    placeholder="Hi, is this still available? Could you share more photos?"
                                />
                            ) : (
                                <div className="row-wrap">
                                    <p className="muted grow">{user ? "Messaging sellers needs a Marketplace account." : "Log in with a Marketplace account to message the seller."}</p>
                                    <Button onClick={gate}>{user ? "Why can't I message?" : "Log in to message"}</Button>
                                </div>
                            )}
                        </section>
                    )}

                    {user && !isOwner && ["tenant", "landlord", "marketplace"].includes(user.role) && (
                        <div className="row-wrap">
                            <Button variant="ghost" size="sm" icon="flag" onClick={() => setModal("report-item")}>Report listing</Button>
                            {seller && <Button variant="ghost" size="sm" icon="flag" onClick={() => setModal("report-seller")}>Report seller</Button>}
                        </div>
                    )}
                </div>

                <aside className="sticky-panel stack stack-md" aria-label="Buy this item">
                    <div className="card card-pad">
                        <div className="price-big">{money(item.price)}</div>
                        <div className="mt-2">
                            <div className="kv"><span>Condition</span><span>{item.condition}</span></div>
                            {item.category && <div className="kv"><span>Category</span><span>{item.category}</span></div>}
                            <div className="kv"><span>Status</span><span>{item.isSold ? <span className="badge badge-danger">Sold</span> : <span className="badge badge-success badge-dot">Available</span>}</span></div>
                        </div>

                        <div className="stack stack-sm mt-2">
                            {item.isSold ? (
                                <Alert tone="warning">This item has been sold. <Link to="/marketplace/items">Browse similar items</Link></Alert>
                            ) : isOwner ? (<>
                                <Alert tone="info">This is your listing.</Alert>
                                <Link to="/marketplace/my-items" className="btn btn-primary btn-block"><Icon name="edit" size={16} /> Manage my listings</Link>
                            </>) : (<>
                                <Button size="lg" block icon="bag" onClick={buyNow}>Buy now</Button>
                                <Button variant="secondary" block icon={inCart ? "check" : "cart"} disabled={inCart && isMarketplace} onClick={() => (isMarketplace ? cart.add(item) : gate())}>
                                    {inCart && isMarketplace ? "In your cart" : "Add to cart"}
                                </Button>
                                {!isMarketplace && <p className="xs muted center">{user ? "A Marketplace account is needed to buy." : "Free account needed – takes a minute."}</p>}
                            </>)}
                            <Button variant="ghost" icon="arrow-left" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/marketplace/items"))}>Back to results</Button>
                        </div>
                    </div>

                    {seller && (
                        <div className="card card-pad">
                            <div className="eyebrow mb-1" style={{ color: "var(--muted)" }}>Sold by</div>
                            <div className="row"><Avatar name={seller.name} size={46} /><div><strong>{seller.name}</strong><div className="small muted">Member since {fmtDate(seller.createdAt, { month: "short", year: "numeric" })}</div></div></div>
                        </div>
                    )}
                    <p className="xs muted center"><Icon name="shield" size={12} /> Checkout is a simulation – no real payment is taken.</p>
                </aside>
            </div>

            {modal === "gate" && (
                <LoginPromptModal
                    onClose={() => setModal(null)} cta={user ? "register" : "login"}
                    title={user ? "Marketplace account required" : "Log in to continue"}
                    message={user
                        ? `You're logged in as a ${user.role}. Buying and messaging sellers need a Marketplace account – you can register a separate one with a different email.`
                        : "Create a free Marketplace account (or log in) to buy this item or message the seller."}
                />
            )}
            {modal === "report-item" && <ReportModal type="marketplace" entityId={item._id} subject={item.title} onClose={() => setModal(null)} />}
            {modal === "report-seller" && seller && <ReportModal type="user" entityId={seller._id} subject={seller.name} onClose={() => setModal(null)} />}
        </div>
    );
};

export default ItemDetail;
