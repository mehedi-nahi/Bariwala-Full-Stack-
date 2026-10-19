import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Icon from "./Icon";

/**
 * Password field with a reliable show / hide toggle.
 * Accepts every normal <input> prop (id, value, onChange, autoComplete, aria-*) – so it works inside <Field>.
 * The toggle keeps focus (and the caret) in the input, and is positioned without transforms,
 * so pressing it never shifts it out from under the pointer.
 */
const PasswordInput = ({ className = "", ...inputProps }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="pw-field">
            <input {...inputProps} type={visible ? "text" : "password"} className={className} />
            <button
                type="button" className="pw-toggle"
                onMouseDown={(e) => e.preventDefault()}     /* keep focus in the input */
                onClick={() => setVisible(v => !v)}
                aria-label={visible ? "Hide password" : "Show password"}
                aria-pressed={visible}
                aria-controls={inputProps.id}
                title={visible ? "Hide password" : "Show password"}
            >
                <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                        key={visible ? "off" : "on"} style={{ display: "inline-flex" }}
                        initial={{ opacity: 0, rotate: -45, scale: 0.6 }} animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 45, scale: 0.6 }} transition={{ duration: 0.15 }}
                    >
                        <Icon name={visible ? "eye-off" : "eye"} size={18} />
                    </motion.span>
                </AnimatePresence>
            </button>
        </div>
    );
};

export default PasswordInput;
