import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { allItemsAPI } from "../../api/marketplaceAPI";
import { useCart } from "../../context/CartContext";
import { CATEGORIES, CONDITIONS } from "../../utils/constants";
import { money, plural } from "../../utils/format";
import { getErrorMessage } from "../../utils/errors";
import { digitsOnly } from "../../utils/validate";
import useDebounce from "../../hooks/useDebounce";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Button, CardSkeletons, EmptyState, ErrorState } from "../../components/ui";
import Icon from "../../components/Icon";
import LoginPromptModal from "../../components/LoginPromptModal";
import { motion } from "motion/react";
import { Float, Stagger, StaggerItem, TiltCard } from "../../components/motion";
import Select from "../../components/Select";

const heroText = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };
const heroLine = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };

const PER_PAGE = 12;
const SORTS = [["newest", "Newest first"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"]];

const ProductCard = ({ item, user, cart, onNeedAccount }) => {
    const seller = item.sellerInfo?.[0];
    const mine = user && seller && String(seller._id) === String(user._id || user.id);
    const inCart = cart.has(item._id);
    return (
        <article className="card card-hover prop-card">
            <Link to={`/marketplace/item/${item._id}`} style={{ color: "inherit", display: "block" }} aria-label={`${item.title}, ${money(item.price)}`}>
                <div className="prop-media" style={{ aspectRatio: "1 / 1" }}>
                    {item.images?.[0]
                        ? <img src={item.images[0]} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        : <div className="ph"><Icon name="package" size={44} /></div>}
                    <span className={`tl badge ${item.condition === "New" ? "badge-success" : "badge-warning"}`} style={{ background: "rgba(255,255,255,.95)" }}>{item.condition}</span>
                </div>
                <div className="prop-body" style={{ paddingBottom: "0.4rem" }}>
                    <div className="prop-title truncate">{item.title}</div>
                    <div className="prop-meta"><Icon name="user" size={13} /><span className="truncate">{seller?.name || "Seller"}</span></div>
                </div>
            </Link>
            <div className="row-between" style={{ padding: "0 1rem 1rem", flexWrap: "nowrap" }}>
                <span className="strong" style={{ fontSize: "1.1rem" }}>{money(item.price)}</span>
                {mine ? <span className="badge badge-brand">Your listing</span> : (
                    <Button size="sm" variant={inCart ? "secondary" : "primary"} icon={inCart ? "check" : "cart"}
                        onClick={() => (user?.role === "marketplace" ? cart.add(item) : onNeedAccount())} disabled={inCart}>
                        {inCart ? "In cart" : "Add"}
                    </Button>
                )}
            </div>
        </article>
    );
};

const AllItems = ({ user }) => {
    useDocumentTitle("Marketplace");
    const cart = useCart();
    const [params, setParams] = useSearchParams();
    const qs = params.toString();

    const [qInput, setQInput] = useState(params.get("q") || "");
    const [minInput, setMinInput] = useState(params.get("min") || "");
    const [maxInput, setMaxInput] = useState(params.get("max") || "");
    const dq = useDebounce(qInput), dmin = useDebounce(minInput), dmax = useDebounce(maxInput);

    const category = params.get("cat") || "";
    const condition = params.get("cond") || "";
    const sort = params.get("sort") || "newest";

    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [status, setStatus] = useState("loading");
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [gate, setGate] = useState(false);
    const [featured, setFeatured] = useState(null);   // newest item with a photo, shown in the hero

    const setParamsRef = useRef(setParams);
    useEffect(() => { setParamsRef.current = setParams; });
    const update = useCallback((changes) => {
        setParamsRef.current(prev => {
            const next = new URLSearchParams(prev);
            Object.entries(changes).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k); });
            return next;
        }, { replace: true });
    }, []);
    useEffect(() => { update({ q: dq.trim(), min: dmin, max: dmax }); }, [dq, dmin, dmax, update]);

    const fetchPage = useCallback((pageNo) => {
        const q = new URLSearchParams(qs);
        const query = { pageNo, perPage: PER_PAGE, sort: q.get("sort") || "newest" };
        if (q.get("q")) query.q = q.get("q");
        if (q.get("cat")) query.category = q.get("cat");
        if (q.get("cond")) query.condition = q.get("cond");
        if (q.get("min")) query.minPrice = q.get("min");
        if (q.get("max")) query.maxPrice = q.get("max");
        return allItemsAPI(query).then(r => r.data.data[0] || {});
    }, [qs]);

    const load = useCallback(() => {
        let cancelled = false;
        setStatus("loading"); setPage(1);
        fetchPage(1)
            .then(d => {
                if (cancelled) return;
                setItems(d.items || []); setTotal(d.totalCount?.[0]?.count || 0); setStatus("ready");
                if (!qs) setFeatured((d.items || []).find(i => i.images?.length) || null);
            })
            .catch(e => { if (!cancelled) { setError(getErrorMessage(e)); setStatus("error"); } });
        return () => { cancelled = true; };
    }, [fetchPage, qs]);

    useEffect(() => load(), [load]);
    /* a purchase elsewhere (cart checkout) removes items from the shop – refresh */
    useEffect(() => {
        const refresh = () => load();
        window.addEventListener("market:changed", refresh);
        return () => window.removeEventListener("market:changed", refresh);
    }, [load]);

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const d = await fetchPage(page + 1);
            setItems(prev => { const seen = new Set(prev.map(i => i._id)); return [...prev, ...(d.items || []).filter(i => !seen.has(i._id))]; });
            setPage(p => p + 1);
        } catch (e) { setError(getErrorMessage(e)); }
        finally { setLoadingMore(false); }
    };

    const clearAll = () => { setQInput(""); setMinInput(""); setMaxInput(""); setParams({}, { replace: true }); };
    const activeCount = [params.get("q"), category, condition, params.get("min"), params.get("max")].filter(Boolean).length;

    return (
        <>
            <section className="hero" aria-labelledby="mk-title">
                <div className="hero-blobs" aria-hidden="true"><span /><span /><span /></div>
                <div className="container hero-grid">
                    <motion.div variants={heroText} initial="hidden" animate="show">
                        <motion.span variants={heroLine} className="eyebrow hero-eyebrow"><span className="live-dot" /> Marketplace</motion.span>
                        <motion.h1 variants={heroLine} id="mk-title" className="mt-1" style={{ maxWidth: "20ch" }}>Furniture &amp; household items from your <span className="text-gradient">neighbours.</span></motion.h1>
                        <motion.p variants={heroLine}>Buy and sell second-hand and new items locally – message sellers, check out in a minute.</motion.p>
                        <motion.form variants={heroLine} className="search-bar" role="search" onSubmit={(e) => { e.preventDefault(); update({ q: qInput.trim() }); }}>
                            <div className="input-icon">
                                <Icon name="search" size={18} />
                                <input type="search" placeholder="Search items, e.g. sofa, fridge, bed" aria-label="Search items" value={qInput} onChange={e => setQInput(e.target.value)} />
                                <kbd className="kbd-hint hide-mobile" title="Press / to search">/</kbd>
                            </div>
                            <Button type="submit" size="lg">Search</Button>
                        </motion.form>
                    </motion.div>
                    {featured && (
                        <motion.div className="hero-visual" initial={{ opacity: 0, scale: 0.92, rotate: -3 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}>
                            <TiltCard className="hero-tilt">
                            <Link to={`/marketplace/item/${featured._id}`} className="hero-card">
                                <div className="hero-card-media">
                                    <img src={featured.images[0]} alt="" />
                                    <span className="badge badge-dark">Just listed</span>
                                </div>
                                <div className="hero-card-body">
                                    <div>
                                        <strong className="truncate">{featured.title}</strong>
                                        <span className="small muted">{featured.condition} · {featured.sellerInfo?.[0]?.name || "Seller"}</span>
                                    </div>
                                    <div className="hero-card-price">{money(featured.price)}</div>
                                </div>
                            </Link>
                            </TiltCard>
                            <Float className="hero-pill hero-pill-a" delay={0.4}><span className="fi"><Icon name="cart" size={16} /></span>Cart &amp; quick checkout</Float>
                            <Float className="hero-pill hero-pill-b" delay={1.2} distance={8}><span className="fi"><Icon name="chat" size={16} /></span>Chat with sellers</Float>
                        </motion.div>
                    )}
                </div>
            </section>

            <div className="container page">
                <div className="cat-bar mb-3" role="group" aria-label="Categories">
                    <button className="chip" aria-pressed={!category} onClick={() => update({ cat: "" })}>All</button>
                    {CATEGORIES.map(c => <button key={c} className="chip" aria-pressed={category === c} onClick={() => update({ cat: c })}>{c}</button>)}
                </div>

                <div className="listing-layout">
                    <aside className={`card filters${showFilters ? " open" : ""}`} aria-label="Filters">
                        <div className="row-between mb-2">
                            <h2 style={{ fontSize: "1rem" }}>Filters</h2>
                            {activeCount > 0 && <button className="link-btn small" onClick={clearAll}>Clear all</button>}
                        </div>
                        <div className="filter-group">
                            <span className="filter-title" id="cond-label">Condition</span>
                            <div className="row-wrap" role="group" aria-labelledby="cond-label">
                                <button className="chip" aria-pressed={!condition} onClick={() => update({ cond: "" })}>Any</button>
                                {CONDITIONS.map(c => <button key={c} className="chip" aria-pressed={condition === c} onClick={() => update({ cond: c })}>{c}</button>)}
                            </div>
                        </div>
                        <div className="filter-group">
                            <span className="filter-title">Price (৳)</span>
                            <div className="row">
                                <input inputMode="numeric" placeholder="Min" aria-label="Minimum price" value={minInput} onChange={e => setMinInput(digitsOnly(e.target.value, 8))} />
                                <span className="muted">–</span>
                                <input inputMode="numeric" placeholder="Max" aria-label="Maximum price" value={maxInput} onChange={e => setMaxInput(digitsOnly(e.target.value, 8))} />
                            </div>
                        </div>
                        <div className="filter-group">
                            <div className="card-pad" style={{ background: "var(--brand-soft)", borderRadius: 10, padding: "0.9rem" }}>
                                <strong>Have something to sell?</strong>
                                <p className="small muted mb-1">List it in a minute and reach local buyers.</p>
                                {user?.role === "marketplace"
                                    ? <Link to="/marketplace/add-item" className="btn btn-primary btn-sm btn-block">Sell an item</Link>
                                    : <Button size="sm" block onClick={() => setGate(true)}>Sell an item</Button>}
                            </div>
                        </div>
                    </aside>

                    <section aria-live="polite">
                        <div className="results-bar">
                            <div className="row">
                                <Button variant="secondary" size="sm" icon="sliders" className="filter-toggle" onClick={() => setShowFilters(s => !s)} aria-expanded={showFilters}>
                                    Filters{activeCount ? ` (${activeCount})` : ""}
                                </Button>
                                <strong>{status === "loading" ? "Loading…" : `${plural(total, "item")} for sale`}</strong>
                            </div>
                            <label className="row small">
                                <span className="muted">Sort by</span>
                                <Select value={sort} onChange={e => update({ sort: e.target.value === "newest" ? "" : e.target.value })} size="sm" aria-label="Sort items">
                                    {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </Select>
                            </label>
                        </div>

                        {status === "loading" && <CardSkeletons n={6} min={200} />}
                        {status === "error" && <ErrorState message={error} onRetry={load} />}
                        {status === "ready" && items.length === 0 && (
                            <EmptyState icon="package" title="No items found" action={activeCount ? <Button variant="secondary" onClick={clearAll}>Clear filters</Button> : null}>
                                {activeCount ? "Try a different search or remove a filter." : "Nothing is listed right now – be the first to sell something!"}
                            </EmptyState>
                        )}
                        {status === "ready" && items.length > 0 && (<>
                            <Stagger key={qs} className="auto-grid" style={{ "--min": "200px" }}>
                                {items.map(i => <StaggerItem key={i._id}><ProductCard item={i} user={user} cart={cart} onNeedAccount={() => setGate(true)} /></StaggerItem>)}
                            </Stagger>
                            <div className="center mt-3">
                                <p className="small muted mb-2">Showing {items.length} of {total}</p>
                                {items.length < total && <Button variant="secondary" loading={loadingMore} onClick={loadMore}>Load more items</Button>}
                            </div>
                        </>)}
                    </section>
                </div>
            </div>

            {gate && (
                <LoginPromptModal
                    onClose={() => setGate(false)} cta={user ? "register" : "login"}
                    title={user ? "Marketplace account required" : "Log in to shop or sell"}
                    message={user
                        ? `You're logged in as a ${user.role}. Buying, selling and messaging sellers need a Marketplace account – register a separate one with a different email.`
                        : "Create a free Marketplace account (or log in) to buy, sell and message sellers."}
                />
            )}
        </>
    );
};

export default AllItems;
