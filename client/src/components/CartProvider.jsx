import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { CartContext } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { money } from "../utils/format";
import CheckoutModal from "./CheckoutModal";
import LoginPromptModal from "./LoginPromptModal";
import { Button } from "./ui";
import Icon from "./Icon";

const keyFor = (user) => (user?.role === "marketplace" ? `mktCart:${user._id || user.id}` : null);

const load = (key) => {
    if (!key) return [];
    try {
        const raw = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(raw) ? raw : [];
    } catch { return []; }
};

// Only what the cart needs – the full item is re-validated by the server at checkout.
const snapshot = (item) => ({
    _id: item._id, title: item.title, price: item.price, condition: item.condition,
    image: item.image || item.images?.[0] || "",
    sellerId: item.seller || item.sellerInfo?.[0]?._id || "",
    sellerName: item.sellerName || item.sellerInfo?.[0]?.name || "",
});

/**
 * Cart for marketplace accounts, available on every page (nav icon, product cards, item page).
 * Non-marketplace visitors who try to use it get an explanation instead of a silent failure.
 */
const CartProvider = ({ user, children }) => {
    const toast = useToast();
    const storageKey = keyFor(user);
    const [items, setItems] = useState(() => load(storageKey));
    const [loadedKey, setLoadedKey] = useState(storageKey);
    const [drawer, setDrawer] = useState(false);
    const [checkout, setCheckout] = useState(false);
    const [gate, setGate] = useState(false);

    /* switch carts when a different account logs in / out */
    if (storageKey !== loadedKey) {
        setLoadedKey(storageKey);
        setItems(load(storageKey));
    }

    useEffect(() => {
        if (!storageKey) return;
        try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch { /* storage full / blocked – cart still works for this session */ }
    }, [items, storageKey]);

    const canBuy = user?.role === "marketplace";

    const add = useCallback((item) => {
        if (!canBuy) { setGate(true); return false; }
        const sellerId = item.seller || item.sellerInfo?.[0]?._id || item.sellerId;
        if (sellerId && String(sellerId) === String(user._id || user.id)) { toast.info("You can't buy your own listing."); return false; }
        if (item.isSold) { toast.info("This item has already been sold."); return false; }
        if (items.some(i => i._id === item._id)) { toast.info("That item is already in your cart."); return true; }
        setItems(prev => [...prev, snapshot(item)]);
        toast.success("Added to your cart.");
        return true;
    }, [canBuy, items, toast, user]);

    const remove = useCallback((id) => setItems(prev => prev.filter(i => i._id !== id)), []);
    const clear = useCallback(() => setItems([]), []);
    const open = useCallback(() => { if (!canBuy) setGate(true); else setDrawer(true); }, [canBuy]);
    const close = useCallback(() => setDrawer(false), []);

    const value = useMemo(() => ({
        items, count: items.length, canBuy,
        total: items.reduce((s, i) => s + (Number(i.price) || 0), 0),
        has: (id) => items.some(i => i._id === id),
        add, remove, clear, open, close,
    }), [items, canBuy, add, remove, clear, open, close]);

    return (
        <CartContext.Provider value={value}>
            {children}

            {drawer && canBuy && (
                <motion.div className="drawer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setDrawer(false); }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <motion.aside className="drawer" role="dialog" aria-modal="true" aria-label="Shopping cart"
                        initial={{ x: "100%" }} animate={{ x: 0 }} transition={{ type: "spring", stiffness: 320, damping: 34 }}>
                        <div className="card-head">
                            <h3>Your cart ({items.length})</h3>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDrawer(false)} aria-label="Close cart"><Icon name="x" size={18} /></button>
                        </div>
                        <div className="drawer-body">
                            {items.length === 0 ? (
                                <div className="center muted" style={{ padding: "3rem 1rem" }}>
                                    <Icon name="cart" size={40} />
                                    <p className="mt-1">Your cart is empty.</p>
                                </div>
                            ) : items.map((i, idx) => (
                                <motion.div className="cart-line" key={i._id} layout
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * idx }}>
                                    {i.image ? <img src={i.image} alt="" /> : <span className="ph"><Icon name="package" size={22} /></span>}
                                    <div className="grow">
                                        <div className="strong truncate">{i.title}</div>
                                        <div className="small muted">{i.condition}{i.sellerName ? ` · ${i.sellerName}` : ""}</div>
                                        <div className="strong" style={{ color: "var(--brand)" }}>{money(i.price)}</div>
                                    </div>
                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(i._id)} aria-label={`Remove ${i.title}`}><Icon name="trash" size={16} /></button>
                                </motion.div>
                            ))}
                        </div>
                        {items.length > 0 && (
                            <div className="modal-foot" style={{ flexDirection: "column", alignItems: "stretch" }}>
                                <div className="row-between"><span className="muted">Total</span><strong style={{ fontSize: "1.2rem" }}>{money(value.total)}</strong></div>
                                <Button size="lg" block onClick={() => { setDrawer(false); setCheckout(true); }}>Checkout</Button>
                                <button className="link-btn small" style={{ alignSelf: "center" }} onClick={clear}>Clear cart</button>
                            </div>
                        )}
                    </motion.aside>
                </motion.div>
            )}

            {checkout && canBuy && (
                <CheckoutModal
                    items={items} total={value.total} user={user}
                    onClose={() => setCheckout(false)}
                    onPurchased={(purchasedIds, failedIds) => {
                        // purchased items leave the cart; unavailable ones are dropped too so the cart stays accurate
                        setItems(prev => prev.filter(i => !purchasedIds.includes(i._id) && !failedIds.includes(i._id)));
                        window.dispatchEvent(new CustomEvent("market:changed"));
                    }}
                />
            )}

            {gate && (
                <LoginPromptModal
                    onClose={() => setGate(false)}
                    cta={user ? "register" : "login"}
                    title={user ? "Marketplace account required" : "Log in to shop"}
                    message={user
                        ? `You're logged in as a ${user.role}. Buying, selling and messaging sellers need a Marketplace account – you can register a separate one with a different email.`
                        : "Create a free Marketplace account (or log in) to add items to your cart, check out and message sellers."}
                />
            )}
        </CartContext.Provider>
    );
};

export default CartProvider;
