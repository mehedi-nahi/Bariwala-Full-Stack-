import { Link } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import Icon from "../../components/Icon";

const NotFound = () => {
    useDocumentTitle("Page not found");
    return (
        <div className="auth-wrap">
            <div className="card card-pad auth-card center">
                <div className="empty-icon"><Icon name="search" size={28} /></div>
                <h1>Page not found</h1>
                <p className="muted mt-1 mb-2">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
                <div className="row" style={{ justifyContent: "center" }}>
                    <Link to="/" className="btn btn-primary">Browse rentals</Link>
                    <Link to="/marketplace/items" className="btn btn-secondary">Marketplace</Link>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
