import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ToastContext } from "../context/ToastContext";
import Icon from "./Icon";

const ICON = { success: "check-circle", error: "alert-circle", info: "info" };

const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const counter = useRef(0);

    const dismiss = useCallback((id) => setToasts(list => list.filter(t => t.id !== id)), []);

    const push = useCallback((type, message, duration) => {
        if (!message) return;
        const id = ++counter.current;
        // the countdown bar's CSS animation drives dismissal, so hovering a toast pauses it
        setToasts(list => [...list.filter(t => t.message !== message).slice(-3), { id, type, message, duration: duration ?? (type === "error" ? 6500 : 4000) }]);
    }, []);

    const api = useMemo(() => ({
        success: (m, d) => push("success", m, d),
        error:   (m, d) => push("error", m, d),
        info:    (m, d) => push("info", m, d),
    }), [push]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="toast-region" aria-live="polite" aria-atomic="false">
                <AnimatePresence initial={false}>
                {toasts.map(t => (
                    <motion.div
                        key={t.id} layout className={`toast toast-${t.type}`} role={t.type === "error" ? "alert" : "status"}
                        initial={{ opacity: 0, x: 40, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 60, scale: 0.95, transition: { duration: 0.2 } }}
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    >
                        <Icon name={ICON[t.type]} size={18} />
                        <div className="toast-body">{t.message}</div>
                        <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" type="button">
                            <Icon name="x" size={14} />
                        </button>
                        <span className="toast-bar" style={{ "--toast-d": `${t.duration}ms` }} onAnimationEnd={() => dismiss(t.id)} aria-hidden="true" />
                    </motion.div>
                ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
