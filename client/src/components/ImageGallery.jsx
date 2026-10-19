import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Icon from "./Icon";

const variants = {
    enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0, scale: 1.02 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0, scale: 0.98 }),
};

/**
 * Photo gallery with animated slides, swipe / drag on touch screens, arrow-key navigation
 * (when focused) and an animated thumbnail strip.
 */
const ImageGallery = ({ images = [], alt = "Photo", aspect = "16 / 10", placeholderIcon = "home", badge }) => {
    const [[index, dir], setState] = useState([0, 0]);
    const n = images.length;
    const go = (d) => setState(([i]) => [(i + d + n) % n, d]);
    const jump = (to) => setState(([i]) => [to, to > i ? 1 : -1]);

    return (
        <div>
            <div
                className="gallery-main" style={{ aspectRatio: aspect }} tabIndex={n > 1 ? 0 : undefined}
                aria-roledescription="carousel" aria-label={`${alt} gallery`}
                onKeyDown={(e) => { if (n < 2) return; if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); }}
            >
                {n === 0 ? <div className="ph"><Icon name={placeholderIcon} size={72} /></div> : (
                    <AnimatePresence initial={false} custom={dir} mode="popLayout">
                        <motion.img
                            key={index} src={images[index]} alt={`${alt} – photo ${index + 1} of ${n}`}
                            custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
                            transition={{ x: { type: "spring", stiffness: 320, damping: 32 }, opacity: { duration: 0.2 } }}
                            drag={n > 1 ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.6}
                            onDragEnd={(_, info) => { if (info.offset.x < -60) go(1); else if (info.offset.x > 60) go(-1); }}
                            draggable={false}
                            style={{ position: "absolute", inset: 0, cursor: n > 1 ? "grab" : "default" }}
                        />
                    </AnimatePresence>
                )}
                {badge}
                {n > 1 && (<>
                    <button className="gallery-nav prev" onClick={() => go(-1)} aria-label="Previous photo"><Icon name="chevron-left" size={20} /></button>
                    <button className="gallery-nav next" onClick={() => go(1)} aria-label="Next photo"><Icon name="chevron-right" size={20} /></button>
                    <div className="gallery-dots" aria-hidden="true">
                        {images.map((_, k) => <span key={k} className={k === index ? "on" : ""} />)}
                    </div>
                    <span className="gallery-count">{index + 1} / {n}</span>
                </>)}
            </div>
            {n > 1 && (
                <div className="thumbs">
                    {images.map((src, k) => (
                        <motion.button
                            key={src + k} className="thumb" aria-current={k === index} aria-label={`Show photo ${k + 1}`}
                            onClick={() => jump(k)} whileHover={{ y: -3 }} whileTap={{ scale: 0.94 }}
                        >
                            <img src={src} alt="" loading="lazy" />
                        </motion.button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImageGallery;
