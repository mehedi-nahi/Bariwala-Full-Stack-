import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children, user, role }) => {
    if (!user) return <Navigate to="/login" />;
    if (role && user.role !== role) return <Navigate to="/" />;
    return children;
};

export default PrivateRoute;

