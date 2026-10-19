import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Icon from "./Icon";

const textOf = (node) => {
    if (node === null || node === undefined || node === false) return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(textOf).join("");
    if (isValidElement(node)) return textOf(node.props.children);
    return "";
};

/** Reads <option> children (including mapped arrays) into { value, label, disabled }. */
const readOptions = (children) => {
    const out = [];
    Children.forEach(children, (child) => {
        if (!isValidElement(child)) return;
        if (child.type === "option") {
            const label = textOf(child.props.children);
            out.push({ value: String(child.props.value ?? label), label, disabled: !!child.props.disabled });
        } else if (child.props?.children) {
            out.push(...readOptions(child.props.children));
        }
    });
    return out;
};

/**
 * Drop-in replacement for <select>: same props (value, onChange(e) with e.target.value, disabled,
 * id, aria-*, <option> children) but with an animated, styled, fully keyboard-accessible listbox.
 *   ↑ ↓ Home End to move · Enter / Space to choose · Esc to close · type a letter to jump
 */
// eslint-disable-next-line no-unused-vars
const Select = ({ value, onChange, children, disabled, id, name, className = "", style, size, placeholder, required, ...aria }) => {
    const options = readOptions(children);
    const autoId = useId();
    const buttonId = id || `${autoId}-btn`;
    const listId = `${autoId}-list`;
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [dropUp, setDropUp] = useState(false);
    const wrapRef = useRef(null);
    const btnRef = useRef(null);
    const listRef = useRef(null);
    const typed = useRef({ text: "", at: 0 });

    const selectedIndex = options.findIndex(o => o.value === String(value ?? ""));
    const selected = options[selectedIndex];

    const choose = (opt) => {
        if (!opt || opt.disabled) return;
        setOpen(false);
        btnRef.current?.focus();
        if (opt.value !== String(value ?? "")) onChange?.({ target: { value: opt.value, name }, currentTarget: { value: opt.value, name } });
    };

    const openList = () => {
        if (disabled) return;
        setActive(selectedIndex >= 0 ? selectedIndex : options.findIndex(o => !o.disabled));
        setOpen(true);
        window.dispatchEvent(new CustomEvent("select:open", { detail: listId }));   // only one list open at a time
    };

    /* another Select opened → close this one */
    useEffect(() => {
        const onOther = (e) => { if (e.detail !== listId) setOpen(false); };
        window.addEventListener("select:open", onOther);
        return () => window.removeEventListener("select:open", onOther);
    }, [listId]);

    /* open upwards when there isn't room below */
    useLayoutEffect(() => {
        if (!open || !btnRef.current) return;
        const r = btnRef.current.getBoundingClientRect();
        const below = window.innerHeight - r.bottom;
        setDropUp(below < 280 && r.top > below);
    }, [open]);

    /* close on outside click */
    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    /* keep the highlighted option visible */
    useEffect(() => {
        if (!open || active < 0) return;
        listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }, [active, open]);

    const move = (from, step) => {
        if (!options.length) return from;
        let i = from;
        for (let k = 0; k < options.length; k++) {
            i = (i + step + options.length) % options.length;
            if (!options[i].disabled) return i;
        }
        return from;
    };

    const onKeyDown = (e) => {
        if (disabled) return;
        const k = e.key;
        if (!open) {
            if (["ArrowDown", "ArrowUp", "Enter", " "].includes(k)) { e.preventDefault(); openList(); }
            return;
        }
        if (k === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); return; }
        if (k === "Tab") { setOpen(false); return; }
        if (k === "ArrowDown") { e.preventDefault(); setActive(a => move(a, 1)); return; }
        if (k === "ArrowUp") { e.preventDefault(); setActive(a => move(a < 0 ? 0 : a, -1)); return; }
        if (k === "Home") { e.preventDefault(); setActive(move(-1, 1)); return; }
        if (k === "End") { e.preventDefault(); setActive(move(options.length, -1)); return; }
        if (k === "Enter" || k === " ") { e.preventDefault(); choose(options[active]); return; }
        if (k.length === 1 && /\S/.test(k)) {   // type-ahead
            const now = Date.now();
            typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : "") + k.toLowerCase(), at: now };
            const hit = options.findIndex(o => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text));
            if (hit >= 0) setActive(hit);
        }
    };

    return (
        <div
            ref={wrapRef}
            onBlur={(e) => { if (open && !wrapRef.current?.contains(e.relatedTarget)) setOpen(false); }}   /* close when focus moves away */
            className={`select${open ? " is-open" : ""}${disabled ? " is-disabled" : ""}${size ? ` select-${size}` : ""} ${className}`.trim()} style={style}>
            <button
                ref={btnRef} type="button" id={buttonId} className="select-trigger" disabled={disabled}
                role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
                aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
                {...aria}
                onClick={() => (open ? setOpen(false) : openList())} onKeyDown={onKeyDown}
            >
                <span className={`select-value${selected ? "" : " is-placeholder"}`}>{selected ? selected.label : (placeholder || "Select…")}</span>
                <motion.span className="select-chevron" animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                    <Icon name="chevron-down" size={16} />
                </motion.span>
            </button>
            {name && <input type="hidden" name={name} value={value ?? ""} />}

            <AnimatePresence>
                {open && (
                    <motion.ul
                        ref={listRef} id={listId} role="listbox" aria-labelledby={buttonId} tabIndex={-1}
                        className={`select-menu${dropUp ? " up" : ""}`}
                        initial={{ opacity: 0, y: dropUp ? 6 : -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: dropUp ? 4 : -4, scale: 0.98, transition: { duration: 0.12 } }}
                        transition={{ type: "spring", stiffness: 520, damping: 34 }}
                        style={{ transformOrigin: dropUp ? "bottom center" : "top center" }}
                    >
                        {options.map((o, i) => {
                            const isSel = i === selectedIndex;
                            return (
                                <li
                                    key={o.value + i} id={`${listId}-${i}`} data-index={i} role="option"
                                    aria-selected={isSel} aria-disabled={o.disabled || undefined}
                                    className={`select-option${i === active ? " is-active" : ""}${isSel ? " is-selected" : ""}${o.disabled ? " is-disabled" : ""}`}
                                    onMouseEnter={() => setActive(i)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => choose(o)}
                                >
                                    <span className="select-option-label">{o.label}</span>
                                    {isSel && (
                                        <motion.span className="select-check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 20 }}>
                                            <Icon name="check" size={15} stroke={2.6} />
                                        </motion.span>
                                    )}
                                </li>
                            );
                        })}
                        {options.length === 0 && <li className="select-empty">No options</li>}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Select;
