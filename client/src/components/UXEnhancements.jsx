import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Icon from "./Icon";

const SPOTLIGHT = ".card-hover, .quick-link, .stat, .blog-card, .glass-tile, .step-card, .feature-card, .method, .choice";

/**
 * App-wide interaction helpers (mounted once in App):
 *  • cursor spotlight – cards get a soft glow that follows the pointer (pure CSS vars, no re-renders)
 *  • "/" keyboard shortcut – jumps to the page's search box
 *  • back-to-top button – appears after scrolling down a long page
 */
const UXEnhancements = () => {
    const [showTop, setShowTop] = useState(false);

    useEffect(() => {
        let frame = 0;
        const onMove = (e) => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                const el = e.target instanceof Element ? e.target.closest(SPOTLIGHT) : null;
                if (!el) return;
                const r = el.getBoundingClientRect();
                el.style.setProperty("--mx", `${e.clientX - r.left}px`);
                el.style.setProperty("--my", `${e.clientY - r.top}px`);
            });
        };
        const onKey = (e) => {
            if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
            const t = e.target;
            if (t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
            const search = document.querySelector('main input[type="search"]');
            if (search) { e.preventDefault(); search.focus(); search.select?.(); }
        };
        const onScroll = () => setShowTop(window.scrollY > 700);

        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("keydown", onKey);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("scroll", onScroll);
        };
    }, []);

    return (
        <AnimatePresence>
            {showTop && (
                <motion.button
                    type="button" className="back-to-top" aria-label="Back to top" data-tooltip="Back to top"
                    initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.8 }}
                    whileHover={{ y: -3 }} whileTap={{ scale: 0.9 }}
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                    <Icon name="chevron-up" size={20} stroke={2.4} />
                </motion.button>
            )}
        </AnimatePresence>
    );
};

export default UXEnhancements;
