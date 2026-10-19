import { useCallback, useRef, useState } from "react";
import { ConfirmContext } from "../context/ConfirmContext";
import Modal from "./Modal";

// Replaces window.confirm() with an on-brand dialog. Usage: see context/ConfirmContext.js
const ConfirmProvider = ({ children }) => {
    const [dialog, setDialog] = useState(null);
    const resolver = useRef(null);

    const confirm = useCallback((options = {}) => new Promise((resolve) => {
        resolver.current = resolve;
        setDialog(options);
    }), []);

    const close = (answer) => {
        resolver.current?.(answer);
        resolver.current = null;
        setDialog(null);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {dialog && (
                <Modal
                    size="sm" title={dialog.title || "Are you sure?"} onClose={() => close(false)}
                    footer={<>
                        <button className="btn btn-secondary" onClick={() => close(false)} type="button">
                            {dialog.cancelText || "Cancel"}
                        </button>
                        <button
                            className={`btn ${dialog.tone === "danger" ? "btn-danger" : "btn-primary"}`}
                            onClick={() => close(true)} type="button" data-autofocus
                        >
                            {dialog.confirmText || "Confirm"}
                        </button>
                    </>}
                >
                    {dialog.message && <p>{dialog.message}</p>}
                </Modal>
            )}
        </ConfirmContext.Provider>
    );
};

export default ConfirmProvider;
