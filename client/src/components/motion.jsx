import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";

/* Shared animation building blocks (motion.dev). All of them respect the OS "reduce motion" setting
   through <MotionConfig reducedMotion="user"> in main.jsx. */

const EASE = [0.22, 1, 0.36, 1];

const staggerParent = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const staggerChild = {
    hidden: { opacity: 0, y: 18, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } },
};

/** Fades + lifts its children in when scrolled into view (once). */
export const Reveal = ({ children, delay = 0, y = 16, className, style, as = "div" }) => {
    const Tag = motion[as];
    return (
        <Tag
            className={className} style={style}
            initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -40px 0px" }}
            transition={{ duration: 0.55, delay, ease: EASE }}
        >
            {children}
        </Tag>
    );
};

/** Grid / list container whose <StaggerItem> children cascade in one after another. */
export const Stagger = ({ children, className, style, as = "div", ...rest }) => {
    const Tag = motion[as];
    return (
        <Tag className={className} style={style} variants={staggerParent} initial="hidden" animate="show" {...rest}>
            {children}
        </Tag>
    );
};

export const StaggerItem = ({ children, className, style, as = "div" }) => {
    const Tag = motion[as];
    return <Tag className={className} style={style} variants={staggerChild}>{children}</Tag>;
};

/** Counts up to `value` the first time it becomes visible. Non-numeric values render as-is. */
export const AnimatedNumber = ({ value, format = (n) => Math.round(n).toLocaleString("en-US") }) => {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });
    const reduce = useReducedMotion();
    const numeric = typeof value === "number" && Number.isFinite(value);
    const [shown, setShown] = useState(numeric && !reduce ? 0 : value);

    useEffect(() => {
        if (!numeric || !inView) return undefined;
        if (reduce) { setShown(value); return undefined; }
        const controls = animate(0, value, { duration: 0.9, ease: EASE, onUpdate: (v) => setShown(v) });
        return () => controls.stop();
    }, [value, inView, numeric, reduce]);

    return <span ref={ref}>{numeric ? format(shown) : value}</span>;
};

/** 3D tilt that follows the pointer – used for the hero showcase card. */
export const TiltCard = ({ children, className, max = 8 }) => {
    const x = useMotionValue(0.5);
    const y = useMotionValue(0.5);
    const rx = useSpring(useTransform(y, [0, 1], [max, -max]), { stiffness: 180, damping: 18 });
    const ry = useSpring(useTransform(x, [0, 1], [-max, max]), { stiffness: 180, damping: 18 });
    const glareX = useTransform(x, [0, 1], ["0%", "100%"]);

    const onMove = (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width);
        y.set((e.clientY - r.top) / r.height);
    };
    const reset = () => { x.set(0.5); y.set(0.5); };

    return (
        <motion.div
            className={className} onPointerMove={onMove} onPointerLeave={reset}
            style={{ rotateX: rx, rotateY: ry, transformPerspective: 900, "--glare-x": glareX }}
        >
            {children}
        </motion.div>
    );
};

/** Gentle endless bobbing for decorative elements. */
export const Float = ({ children, className, delay = 0, distance = 10, duration = 5 }) => (
    <motion.div
        className={className}
        animate={{ y: [0, -distance, 0] }}
        transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
        {children}
    </motion.div>
);

/** Grows from slightly smaller to full size (and fades up) as it scrolls into the middle of the screen. */
export const ScrollScale = ({ children, className, style, from = 0.86, as = "div", end = "center center", ...rest }) => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", end] });
    const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });
    const scale = useTransform(smooth, [0, 1], [from, 1]);
    const opacity = useTransform(smooth, [0, 0.6, 1], [0.35, 0.9, 1]);
    const y = useTransform(smooth, [0, 1], [40, 0]);
    const Tag = motion[as];
    return <Tag ref={ref} className={className} style={{ ...style, scale, opacity, y }} {...rest}>{children}</Tag>;
};
