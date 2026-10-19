const numberFormat = (() => {
    try { return new Intl.NumberFormat("en-BD"); } catch { return new Intl.NumberFormat("en-US"); }
})();

export const money = (n) => "৳" + numberFormat.format(Number(n) || 0);

export const fmtDate = (d, opts = { day: "2-digit", month: "short", year: "numeric" }) =>
    d ? new Date(d).toLocaleDateString("en-GB", opts) : "—";

export const fmtDateTime = (d) =>
    d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export const timeAgo = (d) => {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
    return fmtDate(d, { day: "2-digit", month: "short" });
};

export const initials = (name) =>
    name ? name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

export const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

// Days between now and a date; negative when the date is in the past.
export const daysUntil = (d) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
