import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { profileAPI } from "./api/userAPI";

import Navbar      from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";

import Register  from "./pages/auth/Register";
import Login     from "./pages/auth/Login";
import Profile   from "./pages/shared/Profile";

import LandlordDashboard from "./pages/landlord/LandlordDashboard";
import MyProperties      from "./pages/landlord/MyProperties";
import AddProperty       from "./pages/landlord/AddProperty";
import EditProperty      from "./pages/landlord/EditProperty";
import LandlordInvoices  from "./pages/landlord/LandlordInvoices";

import TenantDashboard   from "./pages/tenant/TenantDashboard";
import SearchProperties  from "./pages/tenant/SearchProperties";
import PropertyDetail    from "./pages/tenant/PropertyDetail";
import Inbox             from "./pages/tenant/Inbox";
import PaymentHistory    from "./pages/tenant/PaymentHistory";

import MarketplaceDashboard from "./pages/marketplace/MarketplaceDashboard";
import AllItems             from "./pages/marketplace/AllItems";
import AddItem              from "./pages/marketplace/AddItem";
import MyItems              from "./pages/marketplace/MyItems";
import ItemDetail           from "./pages/marketplace/ItemDetail";

import AdminDashboard    from "./pages/admin/AdminDashboard";
import AdminUsers        from "./pages/admin/AdminUsers";
import AdminReports      from "./pages/admin/AdminReports";
import AdminTransactions from "./pages/admin/AdminTransactions";

const App = () => {
    const [user, setUser]       = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        profileAPI()
            .then(res => setUser(res.data.data[0]))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading...</p>;

    return (
        <BrowserRouter>
            <Navbar user={user} setUser={setUser} />
            <Routes>
                {/* Public */}
                <Route path="/"         element={<SearchProperties />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login"    element={<Login setUser={setUser} />} />
                <Route path="/property/:id"             element={<PropertyDetail user={user} />} />
                <Route path="/marketplace/items"       element={<AllItems />} />
                <Route path="/marketplace/item/:id"    element={<ItemDetail user={user} />} />

                {/* Shared — any logged in user */}
                <Route path="/profile" element={<PrivateRoute user={user}><Profile /></PrivateRoute>} />

                {/* Landlord */}
                <Route path="/landlord/dashboard"         element={<PrivateRoute user={user} role="landlord"><LandlordDashboard user={user} /></PrivateRoute>} />
                <Route path="/landlord/properties"        element={<PrivateRoute user={user} role="landlord"><MyProperties /></PrivateRoute>} />
                <Route path="/landlord/add-property"      element={<PrivateRoute user={user} role="landlord"><AddProperty /></PrivateRoute>} />
                <Route path="/landlord/edit-property/:id" element={<PrivateRoute user={user} role="landlord"><EditProperty /></PrivateRoute>} />
                <Route path="/landlord/invoices"          element={<PrivateRoute user={user} role="landlord"><LandlordInvoices user={user} /></PrivateRoute>} />
                <Route path="/landlord/inbox"             element={<PrivateRoute user={user} role="landlord"><Inbox user={user} /></PrivateRoute>} />

                {/* Tenant */}
                <Route path="/tenant/dashboard" element={<PrivateRoute user={user} role="tenant"><TenantDashboard user={user} /></PrivateRoute>} />
                <Route path="/tenant/search"    element={<PrivateRoute user={user} role="tenant"><SearchProperties /></PrivateRoute>} />
                <Route path="/tenant/inbox"     element={<PrivateRoute user={user} role="tenant"><Inbox user={user} /></PrivateRoute>} />
                <Route path="/tenant/payments"  element={<PrivateRoute user={user} role="tenant"><PaymentHistory /></PrivateRoute>} />

                {/* Marketplace */}
                <Route path="/marketplace/dashboard" element={<PrivateRoute user={user} role="marketplace"><MarketplaceDashboard user={user} /></PrivateRoute>} />
                <Route path="/marketplace/add-item"  element={<PrivateRoute user={user} role="marketplace"><AddItem /></PrivateRoute>} />
                <Route path="/marketplace/my-items"  element={<PrivateRoute user={user} role="marketplace"><MyItems /></PrivateRoute>} />

                {/* Admin */}
                <Route path="/admin/dashboard"    element={<PrivateRoute user={user} role="admin"><AdminDashboard user={user} /></PrivateRoute>} />
                <Route path="/admin/users"        element={<PrivateRoute user={user} role="admin"><AdminUsers /></PrivateRoute>} />
                <Route path="/admin/reports"      element={<PrivateRoute user={user} role="admin"><AdminReports /></PrivateRoute>} />
                <Route path="/admin/transactions" element={<PrivateRoute user={user} role="admin"><AdminTransactions /></PrivateRoute>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
