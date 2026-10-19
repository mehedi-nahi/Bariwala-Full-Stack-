import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { sessionAPI } from "./api/userAPI";
import { useToast } from "./context/ToastContext";
import { ROLE_HOME } from "./utils/constants";

import ErrorBoundary from "./components/ErrorBoundary";
import ToastProvider from "./components/ToastProvider";
import ConfirmProvider from "./components/ConfirmProvider";
import CartProvider from "./components/CartProvider";
import ScrollToTop from "./components/ScrollToTop";
import UXEnhancements from "./components/UXEnhancements";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import PrivateRoute from "./components/PrivateRoute";
import { PageLoader } from "./components/ui";

/* Pages are loaded on demand so the first visit downloads far less JavaScript. */
const Login             = lazy(() => import("./pages/auth/Login"));
const Register          = lazy(() => import("./pages/auth/Register"));
const Profile           = lazy(() => import("./pages/shared/Profile"));
const Help              = lazy(() => import("./pages/shared/Help"));
const About             = lazy(() => import("./pages/shared/About"));
const Blog              = lazy(() => import("./pages/shared/Blog"));
const BlogPost          = lazy(() => import("./pages/shared/BlogPost"));
const NotFound          = lazy(() => import("./pages/shared/NotFound"));
const SearchProperties  = lazy(() => import("./pages/tenant/SearchProperties"));
const PropertyDetail    = lazy(() => import("./pages/tenant/PropertyDetail"));
const Inbox             = lazy(() => import("./pages/tenant/Inbox"));
const PaymentHistory    = lazy(() => import("./pages/tenant/PaymentHistory"));
const MyRequests        = lazy(() => import("./pages/tenant/MyRequests"));
const MyProperties      = lazy(() => import("./pages/landlord/MyProperties"));
const AddProperty       = lazy(() => import("./pages/landlord/AddProperty"));
const EditProperty      = lazy(() => import("./pages/landlord/EditProperty"));
const LandlordInvoices  = lazy(() => import("./pages/landlord/LandlordInvoices"));
const AllItems          = lazy(() => import("./pages/marketplace/AllItems"));
const ItemDetail        = lazy(() => import("./pages/marketplace/ItemDetail"));
const AddItem           = lazy(() => import("./pages/marketplace/AddItem"));
const MyItems           = lazy(() => import("./pages/marketplace/MyItems"));
const MyOrders          = lazy(() => import("./pages/marketplace/MyOrders"));
const AdminUsers        = lazy(() => import("./pages/admin/AdminUsers"));
const AdminReports      = lazy(() => import("./pages/admin/AdminReports"));
const AdminTransactions = lazy(() => import("./pages/admin/AdminTransactions"));

const Shell = () => {
    const [user, setUser] = useState(null);
    const [checking, setChecking] = useState(true);
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const userRef = useRef(null);

    useEffect(() => { userRef.current = user; }, [user]);

    /* restore the session on first load */
    useEffect(() => {
        sessionAPI()
            .then(res => {
                const u = res.data.data;
                setUser(u ? { ...u, id: u._id } : null);
            })
            .catch(() => setUser(null))
            .finally(() => setChecking(false));
    }, []);

    /* any API call that comes back 401 while logged in means the session ended */
    useEffect(() => {
        const onExpired = () => {
            if (!userRef.current) return;
            setUser(null);
            toast.info("Your session has expired. Please log in again.");
            navigate("/login", { replace: true, state: { from: window.location.pathname + window.location.search } });
        };
        window.addEventListener("auth:expired", onExpired);
        return () => window.removeEventListener("auth:expired", onExpired);
    }, [navigate, toast]);

    if (checking) return <PageLoader label="Starting Bariwala…" />;

    const chatPage = location.pathname.includes("/inbox");
    const guard = (role, element) => <PrivateRoute user={user} role={role}>{element}</PrivateRoute>;
    const landing = user ? (ROLE_HOME[user.role] || "/") : null;

    return (
        <CartProvider user={user}>
            <a href="#main" className="skip-link">Skip to content</a>
            <ScrollToTop />
            <UXEnhancements />
            <Navbar user={user} setUser={setUser} />
            <main id="main" className="app-main">
                <Suspense fallback={<PageLoader />}>
                    {/* every page fades/lifts in on navigation (entrance only, so navigation never waits) */}
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                    <Routes>
                        {/* Public */}
                        <Route path="/"                     element={<SearchProperties user={user} />} />
                        <Route path="/login"                element={user ? <Navigate to={landing} replace /> : <Login setUser={setUser} />} />
                        <Route path="/register"             element={user ? <Navigate to={landing} replace /> : <Register />} />
                        <Route path="/help"                 element={<Help />} />
                        <Route path="/about"                element={<About />} />
                        <Route path="/blog"                 element={<Blog />} />
                        <Route path="/blog/:slug"           element={<BlogPost />} />
                        <Route path="/property/:id"         element={<PropertyDetail user={user} />} />
                        <Route path="/marketplace/items"    element={<AllItems user={user} />} />
                        <Route path="/marketplace/item/:id" element={<ItemDetail user={user} />} />

                        {/* Any logged-in user */}
                        <Route path="/profile" element={guard(null, <Profile user={user} setUser={setUser} />)} />

                        {/* Landlord */}
                        <Route path="/landlord/properties"        element={guard("landlord", <MyProperties />)} />
                        <Route path="/landlord/add-property"      element={guard("landlord", <AddProperty />)} />
                        <Route path="/landlord/edit-property/:id" element={guard("landlord", <EditProperty />)} />
                        <Route path="/landlord/invoices"          element={guard("landlord", <LandlordInvoices />)} />
                        <Route path="/landlord/inbox"             element={guard("landlord", <Inbox user={user} />)} />

                        {/* Tenant */}
                        <Route path="/tenant/search"   element={<Navigate to="/" replace />} />
                        <Route path="/tenant/requests" element={guard("tenant", <MyRequests />)} />
                        <Route path="/tenant/payments" element={guard("tenant", <PaymentHistory />)} />
                        <Route path="/tenant/inbox"    element={guard("tenant", <Inbox user={user} />)} />

                        {/* Marketplace */}
                        <Route path="/marketplace/add-item" element={guard("marketplace", <AddItem />)} />
                        <Route path="/marketplace/my-items" element={guard("marketplace", <MyItems />)} />
                        <Route path="/marketplace/orders"   element={guard("marketplace", <MyOrders />)} />
                        <Route path="/marketplace/inbox"    element={guard("marketplace", <Inbox user={user} />)} />

                        {/* Admin */}
                        <Route path="/admin/users"        element={guard("admin", <AdminUsers />)} />
                        <Route path="/admin/reports"      element={guard("admin", <AdminReports />)} />
                        <Route path="/admin/transactions" element={guard("admin", <AdminTransactions />)} />
                        <Route path="/admin/inbox"        element={guard("admin", <Inbox user={user} />)} />

                        <Route path="*" element={<NotFound />} />
                    </Routes>
                    </motion.div>
                </Suspense>
            </main>
            {!chatPage && <Footer user={user} />}
        </CartProvider>
    );
};

const App = () => (
    <ErrorBoundary>
        <ToastProvider>
            <ConfirmProvider>
                <BrowserRouter>
                    <Shell />
                </BrowserRouter>
            </ConfirmProvider>
        </ToastProvider>
    </ErrorBoundary>
);

export default App;
