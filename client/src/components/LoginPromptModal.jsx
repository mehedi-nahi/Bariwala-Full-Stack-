import { Link } from "react-router-dom";
import Modal from "./Modal";
import Icon from "./Icon";

/**
 * Explains why an action is blocked (not logged in / wrong account type) and offers the way forward.
 *   title / message – override the default copy
 *   cta             – "login" (default) shows Log in + Sign up; "register" shows only Sign up
 */
const LoginPromptModal = ({ onClose, title, message, cta = "login" }) => (
    <Modal
        size="sm" onClose={onClose}
        hero={
            <div className="modal-hero">
                <Icon name="lock" size={26} />
                <h3 className="mt-1">{title || "Log in to continue"}</h3>
            </div>
        }
        footer={<button className="btn btn-ghost" onClick={onClose}>Keep browsing</button>}
    >
        <p>{message || "Create a free account or log in to use this feature."}</p>
        <div className="row mt-2" style={{ gap: "0.6rem" }}>
            {cta === "login" && <Link to="/login" onClick={onClose} className="btn btn-secondary grow">Log in</Link>}
            <Link to="/register" onClick={onClose} className="btn btn-primary grow">Sign up free</Link>
        </div>
    </Modal>
);

export default LoginPromptModal;
