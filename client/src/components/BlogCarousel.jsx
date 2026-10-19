import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import BlogCard from "./BlogCard";
import Icon from "./Icon";

/**
 * Swipeable, scroll-snapping carousel of blog cards.
 * Touch / trackpad swipe natively, arrow buttons, clickable dots, autoplay every 5 s that pauses on
 * hover / focus / when the tab is hidden, and the card nearest the centre is gently scaled up.
 */
const BlogCarousel = ({ posts, interval = 5000 }) => {
    const trackRef = useRef(null);
    const [index, setIndex] = useState(0);
    const [pages, setPages] = useState(1);
    const [paused, setPaused] = useState(false);

    const measure = useCallback(() => {
        const el = trackRef.current;
        if (!el) return;
        const card = el.querySelector(".carousel-slide");
        if (!card) return;
        const step = card.getBoundingClientRect().width + 20;
        const max = Math.max(0, Math.round((el.scrollWidth - el.clientWidth) / step));
        setPages(max + 1);
        setIndex(Math.min(max, Math.round(el.scrollLeft / step)));
        // scale the slide closest to the centre
        const mid = el.getBoundingClientRect().left + el.clientWidth / 2;
        el.querySelectorAll(".carousel-slide").forEach(s => {
            const r = s.getBoundingClientRect();
            const d = Math.min(1, Math.abs(r.left + r.width / 2 - mid) / el.clientWidth);
            s.style.setProperty("--focus", (1 - d).toFixed(3));
        });
    }, []);

    const goTo = useCallback((i) => {
        const el = trackRef.current;
        const card = el?.querySelector(".carousel-slide");
        if (!card) return;
        const step = card.getBoundingClientRect().width + 20;
        el.scrollTo({ left: i * step, behavior: "smooth" });
    }, []);

    useEffect(() => {
        measure();
        const el = trackRef.current;
        el?.addEventListener("scroll", measure, { passive: true });
        window.addEventListener("resize", measure);
        return () => { el?.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); };
    }, [measure]);

    useEffect(() => {
        if (paused || pages < 2) return undefined;
        const t = setInterval(() => { if (!document.hidden) goTo((index + 1) % pages); }, interval);
        return () => clearInterval(t);
    }, [paused, pages, index, goTo, interval]);

    return (
        <div
            className="carousel" aria-roledescription="carousel" aria-label="Blog articles"
            onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
        >
            <div className="carousel-track" ref={trackRef}>
                {posts.map((p, i) => (
                    <div className="carousel-slide" key={p.slug} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${posts.length}`}>
                        <BlogCard post={p} />
                    </div>
                ))}
            </div>
            {pages > 1 && (
                <div className="carousel-controls">
                    <motion.button type="button" className="carousel-btn" onClick={() => goTo(Math.max(0, index - 1))} disabled={index === 0}
                        aria-label="Previous articles" whileTap={{ scale: 0.9 }}><Icon name="chevron-left" size={18} /></motion.button>
                    <div className="carousel-dots" role="tablist" aria-label="Choose slide">
                        {Array.from({ length: pages }).map((_, i) => (
                            <button key={i} type="button" role="tab" aria-selected={i === index} aria-label={`Go to slide ${i + 1}`}
                                className={i === index ? "on" : ""} onClick={() => goTo(i)}>
                                {i === index && !paused && <span className="carousel-timer" style={{ animationDuration: `${interval}ms` }} />}
                            </button>
                        ))}
                    </div>
                    <motion.button type="button" className="carousel-btn" onClick={() => goTo(Math.min(pages - 1, index + 1))} disabled={index >= pages - 1}
                        aria-label="Next articles" whileTap={{ scale: 0.9 }}><Icon name="chevron-right" size={18} /></motion.button>
                </div>
            )}
        </div>
    );
};

export default BlogCarousel;
