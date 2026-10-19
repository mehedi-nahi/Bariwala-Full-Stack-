export const ROLE_LABEL = {
    landlord: "Landlord",
    tenant: "Tenant",
    marketplace: "Marketplace user",
    admin: "Admin",
};

// Where each role lands after logging in.
export const ROLE_HOME = {
    landlord: "/landlord/properties",
    tenant: "/",
    marketplace: "/marketplace/items",
    admin: "/profile",
};

export const INBOX_PATH = {
    landlord: "/landlord/inbox",
    tenant: "/tenant/inbox",
    marketplace: "/marketplace/inbox",
    admin: "/admin/inbox",
};

export const FACILITIES = ["Gas", "Water", "Lift", "WiFi", "Generator", "Parking", "Security", "CCTV", "AC", "Furnished"];
export const PROPERTY_TYPES = ["Flat", "Room", "Sublet"];

export const CATEGORIES = ["Furniture", "Electronics", "Appliances", "Books", "Clothing", "Sports", "Other"];
export const CONDITIONS = ["New", "Used"];

export const PAYMENT_METHODS = [
    { id: "bKash", label: "bKash", short: "bK", color: "#e2136e", desc: "Mobile banking", type: "mobile" },
    { id: "Nagad", label: "Nagad", short: "Ng", color: "#e8710a", desc: "Mobile banking", type: "mobile" },
    { id: "Rocket", label: "Rocket", short: "Rk", color: "#8b1af5", desc: "Dutch-Bangla mobile banking", type: "mobile" },
    { id: "Card", label: "Debit / Credit card", short: "💳", color: "#243b6b", desc: "Visa · Mastercard", type: "card" },
    { id: "Bank Transfer", label: "Bank transfer", short: "Bk", color: "#1b7a4a", desc: "Online bank transfer", type: "bank" },
];
