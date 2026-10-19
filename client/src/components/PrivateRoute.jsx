import { Link, Navigate, useLocation } from "react-router-dom";
import { ROLE_HOME, ROLE_LABEL } from "../utils/constants";
import useDocumentTitle from "../hooks/useDocumentTitle";
import Icon from "./Icon";

const NoAccess = ({ user, allowed }) => {
    useDocumentTitle("No access");
    const names = allowed.map(r => ROLE_LABEL[r] || r).join(" / ");
    return (
        <div className="auth-wrap">
            <div className="card card-pad auth-card center">
                <div className="empty-icon"><Icon name="lock" size={28} /></div>
                <h1>This page isn&apos;t for your account</h1>
                <p className="muted mt-1 mb-2">
                    It&apos;s only available to <strong>{names}</strong> accounts, and you&apos;re logged in as a {ROLE_LABEL[user.role]?.toLowerCase()}.
                </p>
                <Link to={ROLE_HOME[user.role] || "/"} className="btn btn-primary">Go to my home</Link>
            </div>
        </div>
    );
};

/**
 * Wraps a page that needs a logged-in user (and optionally a specific role or list of roles).
 * Guests are sent to /login and returned here afterwards; wrong-role users see an explanation.
 */
const PrivateRoute = ({ children, user, role }) => {
    const location = useLocation();
    if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    const allowed = role ? (Array.isArray(role) ? role : [role]) : null;
    if (allowed && !allowed.includes(user.role)) return <NoAccess user={user} allowed={allowed} />;
    return children;
};

export default PrivateRoute;
