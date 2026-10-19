import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import Icon from "./Icon";

let openModals = 0;
const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: Esc closes, focus is trapped and restored, page scroll is locked.
 *   <Modal title="…" onClose={…} footer={<>…buttons…</>}>…</Modal>
 * `dismissible={false}` blocks Esc / backdrop / ✕ (used while a payment is processing).
 */
const Modal = ({ title, onClose, children, footer, size = "md", dismissible = true, hero, hideHead }) => {
    const panelRef = useRef(null);
    const closeRef = useRef(onClose);
    const dismissRef = useRef(dismissible);
    const titleId = useId();

    useEffect(() => { closeRef.current = onClose; dismissRef.current = dismissible; });

    useEffect(() => {
        const previouslyFocused = document.activeElement;
        openModals += 1;
        document.body.classList.add("no-scroll");

        const onKey = (e) => {
            if (e.key === "Escape" && dismissRef.current) { e.stopPropagation(); closeRef.current?.(); return; }
            if (e.key !== "Tab" || !panelRef.current) return;
            const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter(n => n.offsetParent !== null);
            if (!nodes.length) { e.preventDefault(); return; }
            const first = nodes[0], last = nodes[nodes.length - 1];
            // focus somehow sits outside the dialog (e.g. before the initial focus ran) – pull it back in
            if (!panelRef.current.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
            else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        document.addEventListener("keydown", onKey);

        const t = setTimeout(() => {
            const target = panelRef.current?.querySelector("[data-autofocus]") ||
                panelRef.current?.querySelector("input:not([type=hidden]), textarea, select") ||
                panelRef.current?.querySelector(".modal-body button, .modal-foot button, .modal-foot a");
            (target || panelRef.current)?.focus();
        }, 30);

        return () => {
            clearTimeout(t);
            document.removeEventListener("keydown", onKey);
            openModals -= 1;
            if (openModals <= 0) { openModals = 0; document.body.classList.remove("no-scroll"); }
            if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus?.();
        };
    }, []);

    return createPortal(
        <motion.div
            className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && dismissible) onClose?.(); }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
        >
            <motion.div
                ref={panelRef} className={`modal modal-${size}`} role="dialog" aria-modal="true"
                aria-labelledby={title ? titleId : undefined} tabIndex={-1}
                initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
                {hero}
                {!hideHead && !hero && (
                    <div className="modal-head">
                        <h3 id={titleId}>{title}</h3>
                        {dismissible && (
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close dialog" type="button">
                                <Icon name="x" size={18} />
                            </button>
                        )}
                    </div>
                )}
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-foot">{footer}</div>}
            </motion.div>
        </motion.div>,
        document.body
    );
};

export default Modal;
