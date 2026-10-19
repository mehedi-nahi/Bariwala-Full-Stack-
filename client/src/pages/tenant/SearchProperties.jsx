import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { allPropertiesAPI } from "../../api/propertyAPI";
import { FACILITIES, PROPERTY_TYPES } from "../../utils/constants";
import { money, plural } from "../../utils/format";
import { getErrorMessage } from "../../utils/errors";
import { digitsOnly } from "../../utils/validate";
import useDebounce from "../../hooks/useDebounce";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Button, CardSkeletons, EmptyState, ErrorState } from "../../components/ui";
import Icon from "../../components/Icon";
import { motion } from "motion/react";
import { Float, ScrollScale, Stagger, StaggerItem, TiltCard } from "../../components/motion";
import LandingSections from "../../components/LandingSections";
import Select from "../../components/Select";

const heroText = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };
const heroLine = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };

const PER_PAGE = 12;
const SORTS = [["newest", "Newest first"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"]];

const PropertyCard = ({ p }) => (
    <Link to={`/property/${p._id}`} className="card card-hover prop-card" aria-label={`${p.propertyType} in ${p.area}, ${money(p.monthlyRent)} per month`}>
        <div className="prop-media">
            {p.images?.[0]
                ? <img src={p.images[0]} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                : <div className="ph"><Icon name="home" size={44} /></div>}
            <span className="tl badge badge-dark">{p.propertyType}</span>
            {p.images?.length > 1 && <span className="tr badge" style={{ background: "rgba(255,255,255,0.92)" }}><Icon name="image" size={12} /> {p.images.length}</span>}
        </div>
        <div className="prop-body">
            <div className="prop-title">{p.propertyType} in {p.area}</div>
            <div className="prop-meta"><Icon name="pin" size={14} /><span className="truncate">{p.address}</span></div>
            {p.facilities?.length > 0 && (
                <div className="tag-row">
                    {p.facilities.slice(0, 3).map(f => <span className="tag" key={f}>{f}</span>)}
                    {p.facilities.length > 3 && <span className="tag">+{p.facilities.length - 3}</span>}
                </div>
            )}
            <div className="prop-price">{money(p.monthlyRent)} <small>/ month</small></div>
        </div>
    </Link>
);

const SearchProperties = ({ user }) => {
    useDocumentTitle("Find a home to rent");
    const [params, setParams] = useSearchParams();
    const qs = params.toString();

    /* text / number inputs keep local state and commit to the URL after a short pause */
    const [qInput, setQInput] = useState(params.get("q") || "");
    const [minInput, setMinInput] = useState(params.get("min") || "");
    const [maxInput, setMaxInput] = useState(params.get("max") || "");
    const dq = useDebounce(qInput), dmin = useDebounce(minInput), dmax = useDebounce(maxInput);

    const type = params.get("type") || "";
    const sort = params.get("sort") || "newest";
    const facilities = (params.get("fac") || "").split(",").filter(Boolean);

    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [status, setStatus] = useState("loading"); // loading | ready | error
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [hideBanner, setHideBanner] = useState(false);
    const [catalogTotal, setCatalogTotal] = useState(null);
    const [featured, setFeatured] = useState(null);      // newest listing with a photo – shown in the hero
    const [popularAreas, setPopularAreas] = useState([]);

    // keep `update` referentially stable so the debounce effect below only reacts to real input changes
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
        if (q.get("type")) query.propertyType = q.get("type");
        if (q.get("min")) query.minRent = q.get("min");
        if (q.get("max")) query.maxRent = q.get("max");
        if (q.get("fac")) query.facilities = q.get("fac");
        return allPropertiesAPI(query).then(r => r.data.data[0] || {});
    }, [qs]);

    const load = useCallback(() => {
        let cancelled = false;
        setStatus("loading");
        setPage(1);
        fetchPage(1)
            .then(d => {
                if (cancelled) return;
                const count = d.totalCount?.[0]?.count || 0;
                setItems(d.properties || []);
                setTotal(count);
                setStatus("ready");
                if (!qs) {
                    setCatalogTotal(count);
                    const list = d.properties || [];
                    setFeatured(list.find(p => p.images?.length) || list[0] || null);
                    setPopularAreas([...new Set(list.map(p => p.area))].slice(0, 5));
                }
            })
            .catch(e => { if (!cancelled) { setError(getErrorMessage(e)); setStatus("error"); } });
        return () => { cancelled = true; };
    }, [fetchPage, qs]);

    useEffect(() => load(), [load]);

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const d = await fetchPage(page + 1);
            setItems(prev => {
                const seen = new Set(prev.map(i => i._id));
                return [...prev, ...(d.properties || []).filter(i => !seen.has(i._id))];
            });
            setPage(p => p + 1);
        } catch (e) {
            setError(getErrorMessage(e));
        } finally { setLoadingMore(false); }
    };

    const toggleFacility = (f) => update({ fac: (facilities.includes(f) ? facilities.filter(x => x !== f) : [...facilities, f]).join(",") });
    const clearAll = () => { setQInput(""); setMinInput(""); setMaxInput(""); setParams({}, { replace: true }); };

    const activeCount = [params.get("q"), type, params.get("min"), params.get("max")].filter(Boolean).length + facilities.length;
    const isMarketplaceUser = user?.role === "marketplace";

    return (
        <>
            <section className="hero" aria-labelledby="hero-title">
                <div className="hero-blobs" aria-hidden="true"><span /><span /><span /></div>
                <div className="container hero-grid">
                    <motion.div variants={heroText} initial="hidden" animate="show">
                        <motion.span variants={heroLine} className="eyebrow hero-eyebrow"><span className="live-dot" /> Rentals across Bangladesh</motion.span>
                        <motion.h1 variants={heroLine} id="hero-title" className="mt-1">Find your next <span className="text-gradient">home.</span></motion.h1>
                        <motion.p variants={heroLine}>Browse flats, rooms and sublets and talk directly to landlords – no agents, no hidden fees.</motion.p>
                        <motion.form variants={heroLine} className="search-bar" role="search" onSubmit={(e) => { e.preventDefault(); update({ q: qInput.trim() }); }}>
                            <div className="input-icon">
                                <Icon name="search" size={18} />
                                <input type="search" placeholder="Search by area or address, e.g. Mirpur" aria-label="Search by area or address"
                                    value={qInput} onChange={e => setQInput(e.target.value)} />
                                <kbd className="kbd-hint hide-mobile" title="Press / to search">/</kbd>
                            </div>
                            <Button type="submit" size="lg">Search</Button>
                        </motion.form>
                        {popularAreas.length > 0 && (
                            <motion.div variants={heroLine} className="hero-quick" aria-label="Popular areas">
                                <span>Popular:</span>
                                {popularAreas.map(a => (
                                    <button key={a} type="button" onClick={() => { setQInput(a); update({ q: a }); }}>{a}</button>
                                ))}
                            </motion.div>
                        )}
                        {catalogTotal !== null && (
                            <motion.div variants={heroLine} className="hero-stats">
                                <div><strong>{catalogTotal}</strong><span>{catalogTotal === 1 ? "home" : "homes"} available now</span></div>
                                <div><strong>3</strong><span>property types</span></div>
                                <div><strong>৳0</strong><span>agent fees</span></div>
                            </motion.div>
                        )}
                    </motion.div>

                    {featured && (
                        <motion.div className="hero-visual" initial={{ opacity: 0, scale: 0.92, rotate: 3 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}>
                            <TiltCard className="hero-tilt">
                            <Link to={`/property/${featured._id}`} className="hero-card">
                                <div className="hero-card-media">
                                    {featured.images?.[0] ? <img src={featured.images[0]} alt="" /> : <div className="ph"><Icon name="home" size={56} /></div>}
                                    <span className="badge badge-dark">Newest listing</span>
                                </div>
                                <div className="hero-card-body">
                                    <div>
                                        <strong>{featured.propertyType} in {featured.area}</strong>
                                        <span className="small muted row" style={{ gap: "0.3rem" }}><Icon name="pin" size={13} /><span className="truncate">{featured.address}</span></span>
                                    </div>
                                    <div className="hero-card-price">{money(featured.monthlyRent)}<small>/mo</small></div>
                                </div>
                            </Link>
                            </TiltCard>
                            <Float className="hero-pill hero-pill-a" delay={0.4}><span className="fi"><Icon name="chat" size={16} /></span>Message landlords directly</Float>
                            <Float className="hero-pill hero-pill-b" delay={1.2} distance={8}><span className="fi"><Icon name="card" size={16} /></span>Pay rent online, get receipts</Float>
                        </motion.div>
                    )}
                </div>
            </section>

            <div className="container page">
                {!user && !hideBanner && (
                    <div className="mb-2">
                        <Alert tone="info" icon="lock" onClose={() => setHideBanner(true)}>
                            <Link to="/login">Log in</Link> or <Link to="/register">create a free account</Link> to message landlords, send rental requests and save time on payments.
                        </Alert>
                    </div>
                )}
                {isMarketplaceUser && !hideBanner && (
                    <div className="mb-2">
                        <Alert tone="warning" onClose={() => setHideBanner(true)}>
                            You&apos;re logged in with a Marketplace account, so you can look around but not rent. <Link to="/register">Create a Tenant account</Link> to contact landlords.
                        </Alert>
                    </div>
                )}

                <div className="listing-layout">
                    <aside className={`card filters${showFilters ? " open" : ""}`} aria-label="Filters">
                        <div className="row-between mb-2">
                            <h2 style={{ fontSize: "1rem" }}>Filters</h2>
                            {activeCount > 0 && <button className="link-btn small" onClick={clearAll}>Clear all</button>}
                        </div>

                        <div className="filter-group">
                            <span className="filter-title" id="type-label">Property type</span>
                            <div className="row-wrap" role="group" aria-labelledby="type-label">
                                <button className="chip" aria-pressed={!type} onClick={() => update({ type: "" })}>All</button>
                                {PROPERTY_TYPES.map(t => <button key={t} className="chip" aria-pressed={type === t} onClick={() => update({ type: t })}>{t}</button>)}
                            </div>
                        </div>

                        <div className="filter-group">
                            <span className="filter-title">Monthly rent (৳)</span>
                            <div className="row">
                                <input inputMode="numeric" placeholder="Min" aria-label="Minimum rent" value={minInput} onChange={e => setMinInput(digitsOnly(e.target.value, 8))} />
                                <span className="muted">–</span>
                                <input inputMode="numeric" placeholder="Max" aria-label="Maximum rent" value={maxInput} onChange={e => setMaxInput(digitsOnly(e.target.value, 8))} />
                            </div>
                            {minInput && maxInput && Number(minInput) > Number(maxInput) && (
                                <p className="field-error mt-1">Minimum is higher than maximum.</p>
                            )}
                        </div>

                        <div className="filter-group">
                            <span className="filter-title" id="fac-label">Facilities</span>
                            <div className="row-wrap" role="group" aria-labelledby="fac-label">
                                {FACILITIES.map(f => <button key={f} className="chip" aria-pressed={facilities.includes(f)} onClick={() => toggleFacility(f)}>{f}</button>)}
                            </div>
                        </div>
                    </aside>

                    <section aria-live="polite">
                        <div className="results-bar">
                            <div className="row">
                                <Button variant="secondary" size="sm" icon="sliders" className="filter-toggle" onClick={() => setShowFilters(s => !s)} aria-expanded={showFilters}>
                                    Filters{activeCount > 0 ? ` (${activeCount})` : ""}
                                </Button>
                                <strong>{status === "loading" ? "Searching…" : `${plural(total, "home")} found`}</strong>
                            </div>
                            <label className="row small">
                                <span className="muted">Sort by</span>
                                <Select value={sort} onChange={e => update({ sort: e.target.value === "newest" ? "" : e.target.value })} size="sm" aria-label="Sort results">
                                    {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </Select>
                            </label>
                        </div>

                        {activeCount > 0 && (
                            <div className="active-filters">
                                {params.get("q") && <span className="chip chip-removable">“{params.get("q")}” <button aria-label="Remove search term" onClick={() => { setQInput(""); update({ q: "" }); }}><Icon name="x" size={12} /></button></span>}
                                {type && <span className="chip chip-removable">{type} <button aria-label="Remove type filter" onClick={() => update({ type: "" })}><Icon name="x" size={12} /></button></span>}
                                {params.get("min") && <span className="chip chip-removable">Min {money(params.get("min"))} <button aria-label="Remove minimum rent" onClick={() => { setMinInput(""); update({ min: "" }); }}><Icon name="x" size={12} /></button></span>}
                                {params.get("max") && <span className="chip chip-removable">Max {money(params.get("max"))} <button aria-label="Remove maximum rent" onClick={() => { setMaxInput(""); update({ max: "" }); }}><Icon name="x" size={12} /></button></span>}
                                {facilities.map(f => <span key={f} className="chip chip-removable">{f} <button aria-label={`Remove ${f}`} onClick={() => toggleFacility(f)}><Icon name="x" size={12} /></button></span>)}
                            </div>
                        )}

                        {status === "loading" && <CardSkeletons n={6} min={240} />}
                        {status === "error" && <ErrorState message={error} onRetry={load} />}
                        {status === "ready" && items.length === 0 && (
                            <EmptyState icon="search" title="No homes match your search"
                                action={activeCount > 0 ? <Button variant="secondary" onClick={clearAll}>Clear filters</Button> : null}>
                                {activeCount > 0 ? "Try a different area, widen the rent range or remove a filter." : "There are no listings yet. Check back soon!"}
                            </EmptyState>
                        )}
                        {status === "ready" && items.length > 0 && (
                            <>
                                <Stagger key={qs} className="auto-grid" style={{ "--min": "240px" }}>
                                    {items.map(p => <StaggerItem key={p._id}><ScrollScale from={0.9} end="start 70%" style={{ height: "100%" }}><PropertyCard p={p} /></ScrollScale></StaggerItem>)}
                                </Stagger>
                                <div className="center mt-3">
                                    <div className="progress" style={{ maxWidth: 320, margin: "0 auto 0.6rem" }} aria-hidden="true">
                                        <span style={{ width: `${Math.min(100, (items.length / total) * 100)}%` }} />
                                    </div>
                                    <p className="small muted mb-2">Showing {items.length} of {total}</p>
                                    {items.length < total && <Button variant="secondary" loading={loadingMore} onClick={loadMore}>Load more homes</Button>}
                                </div>
                            </>
                        )}
                    </section>
                </div>

                <LandingSections />

                {!user && (
                    <ScrollScale as="section" className="card card-pad mt-4" aria-labelledby="how-title">
                        <h2 id="how-title" className="mb-2">How Bariwala works</h2>
                        <div className="feature-strip">
                            {[
                                ["search", "Search", "Filter by area, rent and facilities to shortlist homes."],
                                ["chat", "Connect", "Message landlords and send a rental request in one click."],
                                ["card", "Pay & stay", "Receive invoices and pay rent online with a receipt."],
                            ].map(([icon, t, d]) => (
                                <div className="feature" key={t}>
                                    <div className="fi"><Icon name={icon} size={20} /></div>
                                    <div><strong>{t}</strong><p className="small muted">{d}</p></div>
                                </div>
                            ))}
                        </div>
                        <div className="row-wrap mt-3">
                            <Link to="/register" className="btn btn-primary">Create a free account</Link>
                            <span className="muted small">Own a property? Sign up as a landlord and list it for free.</span>
                        </div>
                    </ScrollScale>
                )}
            </div>
        </>
    );
};

export default SearchProperties;
