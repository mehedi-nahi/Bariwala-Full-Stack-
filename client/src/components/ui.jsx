import { cloneElement, isValidElement, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedNumber } from "./motion";
import { money } from "../utils/format";
import Icon from "./Icon";
import { initials } from "../utils/format";

/* ── Buttons ───────────────────────────────────────────── */
/**
 * Animated button: spring hover/press, a ripple from the exact click point, a light sweep on solid
 * variants (CSS), and arrow icons that nudge forward on hover. Icon-only buttons get a hover tooltip
 * from their aria-label.
 */
export const Button = ({ variant = "primary", size, loading, block, icon, iconRight, children, className = "", type = "button", disabled, onPointerDown, ...rest }) => {
    const [ripples, setRipples] = useState([]);
    const nextId = useRef(0);
    const inactive = disabled || loading;
    const iconOnly = !children && (icon || iconRight);

    const addRipple = (e) => {
        onPointerDown?.(e);
        if (inactive) return;
        const r = e.currentTarget.getBoundingClientRect();
        const size = Math.max(r.width, r.height) * 2.2;
        const id = ++nextId.current;
        setRipples(list => [...list, { id, x: e.clientX - r.left - size / 2, y: e.clientY - r.top - size / 2, size }]);
    };

    return (
        <motion.button
            type={type}
            className={`btn btn-${variant}${size ? ` btn-${size}` : ""}${block ? " btn-block" : ""}${iconOnly ? " btn-icon-only" : ""} ${className}`.trim()}
            disabled={inactive}
            aria-busy={loading || undefined}
            data-tooltip={iconOnly ? rest["aria-label"] : undefined}
            whileHover={inactive ? undefined : { y: -2 }}
            whileTap={inactive ? undefined : { scale: 0.95, y: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            onPointerDown={addRipple}
            {...rest}
        >
            <span className="btn-ripples" aria-hidden="true">
                <AnimatePresence>
                    {ripples.map(rp => (
                        <motion.span
                            key={rp.id} className="btn-ripple"
                            style={{ left: rp.x, top: rp.y, width: rp.size, height: rp.size }}
                            initial={{ scale: 0, opacity: 0.45 }} animate={{ scale: 1, opacity: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            onAnimationComplete={() => setRipples(list => list.filter(x => x.id !== rp.id))}
                        />
                    ))}
                </AnimatePresence>
            </span>
            {loading
                ? <span className="spinner" aria-hidden="true" />
                : icon ? <Icon name={icon} size={size === "sm" ? 14 : 16} className={icon.startsWith("arrow-right") || icon === "chevron-right" ? "btn-arrow" : undefined} /> : null}
            {children && <span className="btn-label">{children}</span>}
            {iconRight && !loading && <Icon name={iconRight} size={size === "sm" ? 14 : 16} className="btn-arrow" />}
        </motion.button>
    );
};

/* ── Loading states ────────────────────────────────────── */
export const Spinner = ({ large }) => (
    <span className={`spinner${large ? " spinner-lg" : ""}`} role="status" aria-label="Loading" />
);

export const PageLoader = ({ label = "Loading…" }) => (
    <div className="page-loader"><Spinner large /><span>{label}</span></div>
);

export const Skeleton = ({ h = 14, w = "100%", style }) => (
    <div className="skeleton" style={{ height: h, width: w, ...style }} aria-hidden="true" />
);

export const CardSkeletons = ({ n = 8, min = 230 }) => (
    <div className="auto-grid" style={{ "--min": `${min}px` }} aria-busy="true" aria-label="Loading results">
        {Array.from({ length: n }).map((_, i) => (
            <div key={i} className="card" style={{ overflow: "hidden" }}>
                <Skeleton h={0} style={{ aspectRatio: "4 / 3", height: "auto", borderRadius: 0 }} />
                <div className="stack stack-sm" style={{ padding: "0.9rem 1rem 1rem" }}>
                    <Skeleton h={14} w="70%" /><Skeleton h={11} w="50%" /><Skeleton h={18} w="35%" />
                </div>
            </div>
        ))}
    </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
    <div className="card card-pad stack stack-md" aria-busy="true" aria-label="Loading">
        {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} h={18} />)}
    </div>
);

/* ── Page furniture ────────────────────────────────────── */
export const PageHeader = ({ title, subtitle, actions, breadcrumbs }) => (
    <header className="page-header">
        {breadcrumbs?.length > 0 && (
            <nav className="breadcrumbs" aria-label="Breadcrumb">
                {breadcrumbs.map((b, i) => (
                    <span key={i} className="row" style={{ gap: "0.4rem" }}>
                        {i > 0 && <span className="sep" aria-hidden="true">/</span>}
                        {b.to ? <Link to={b.to}>{b.label}</Link> : <span aria-current="page">{b.label}</span>}
                    </span>
                ))}
            </nav>
        )}
        <div className="page-header-top">
            <div>
                <h1>{title}</h1>
                {subtitle && <p className="subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="page-actions">{actions}</div>}
        </div>
    </header>
);

export const EmptyState = ({ icon = "search", title, children, action }) => (
    <motion.div className="empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <motion.div className="empty-icon" initial={{ scale: 0.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}>
            <Icon name={icon} size={28} />
        </motion.div>
        <h3>{title}</h3>
        {children && <p>{children}</p>}
        {action}
    </motion.div>
);

export const ErrorState = ({ message, onRetry }) => (
    <div className="empty" role="alert">
        <div className="empty-icon" style={{ color: "var(--danger)" }}><Icon name="alert-circle" size={28} /></div>
        <h3>Couldn&apos;t load this page</h3>
        <p>{message || "Something went wrong. Please try again."}</p>
        {onRetry && <Button variant="secondary" icon="refresh" onClick={() => onRetry()}>Try again</Button>}
    </div>
);

export const Alert = ({ tone = "info", title, children, onClose, icon }) => {
    const defaults = { success: "check-circle", error: "alert-circle", warning: "alert", info: "info" };
    return (
        <motion.div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Icon name={icon || defaults[tone]} size={18} />
            <div className="grow">
                {title && <div className="alert-title">{title}</div>}
                {children && <div>{children}</div>}
            </div>
            {onClose && (
                <button type="button" onClick={onClose} aria-label="Dismiss" style={{ color: "inherit", opacity: 0.6 }}>
                    <Icon name="x" size={16} />
                </button>
            )}
        </motion.div>
    );
};

/* ── Data display ──────────────────────────────────────── */
const AVATAR_COLORS = ["#c8402a", "#243b6b", "#2a7f62", "#7a4fa3", "#b9702a", "#2b6f8f", "#8a3b5c"];
export const Avatar = ({ name, size = 40 }) => {
    const bg = AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
    return (
        <span className="avatar" style={{ width: size, height: size, background: bg, fontSize: size * 0.36 }} aria-hidden="true">
            {initials(name)}
        </span>
    );
};

const TONE = {
    Available: "success", Paid: "success", Accepted: "success", Resolved: "success", Active: "success", New: "success", Sold: "success",
    Pending: "warning", Reviewed: "info", Used: "warning",
    Overdue: "danger", Rejected: "danger", Blocked: "danger", Removed: "danger",
    Rented: "neutral",
};
export const StatusBadge = ({ status, label, dot = true }) => (
    <span className={`badge ${TONE[status] && TONE[status] !== "neutral" ? `badge-${TONE[status]}` : ""}${dot ? " badge-dot" : ""}`}>
        {label || status}
    </span>
);

export const Stars = ({ value = 0 }) => {
    const n = Math.round(Number(value) || 0);
    return (
        <span className="stars" role="img" aria-label={`${Number(value).toFixed(1)} out of 5 stars`}>
            {"★".repeat(n)}<span className="off">{"★".repeat(5 - n)}</span>
        </span>
    );
};

export const StarInput = ({ value, onChange, label = "Rating" }) => (
    <div className="star-input" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map(n => (
            <button
                key={n} type="button" className={n <= value ? "on" : ""} onClick={() => onChange(n)}
                role="radio" aria-checked={n === value} aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >★</button>
        ))}
    </div>
);

// Numbers – and "৳12,000" style amounts – count up the first time they appear.
const asAmount = (v) => (typeof v === "string" && /^৳[\d,]+$/.test(v) ? Number(v.replace(/[৳,]/g, "")) : null);
export const Stat = ({ icon, label, value, tone }) => (
    <motion.div className={`stat${tone ? ` tone-${tone}` : ""}`} whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
        <div className="stat-icon"><Icon name={icon} size={20} /></div>
        <div>
            <div className="stat-value">
                {asAmount(value) !== null ? <AnimatedNumber value={asAmount(value)} format={money} /> : <AnimatedNumber value={value} />}
            </div>
            <div className="stat-label">{label}</div>
        </div>
    </motion.div>
);

export const Pagination = ({ page, totalPages, onChange }) => {
    if (totalPages <= 1) return null;
    return (
        <nav className="pagination" aria-label="Pagination">
            <Button variant="secondary" size="sm" icon="chevron-left" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
            <span className="page-info">Page {page} of {totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
                Next <Icon name="chevron-right" size={14} />
            </Button>
        </nav>
    );
};

/* ── Forms ─────────────────────────────────────────────── */
// Associates label, hint and error with the control automatically.
// Pass `htmlFor` when the control is wrapped (e.g. inside .input-group) and give the inner input that id.
export const Field = ({ label, hint, error, required, optional, children, className = "", htmlFor }) => {
    const id = useId();
    const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;
    const control = !htmlFor && isValidElement(children)
        ? cloneElement(children, {
            id: children.props.id || id,
            "aria-invalid": error ? true : undefined,
            "aria-describedby": describedBy,
            required: children.props.required ?? required,
        })
        : children;
    return (
        <div className={`field${error ? " has-error" : ""} ${className}`.trim()}>
            {label && (
                <label className="field-label" htmlFor={htmlFor || (isValidElement(children) ? (children.props.id || id) : undefined)}>
                    {label}
                    {required && <span className="req" aria-hidden="true">*</span>}
                    {optional && <span className="opt">(optional)</span>}
                </label>
            )}
            {control}
            {hint && !error && <span className="field-hint" id={`${id}-hint`}>{hint}</span>}
            {error && <span className="field-error" id={`${id}-err`} role="alert">{error}</span>}
        </div>
    );
};
