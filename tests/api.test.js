/**
 * API integration tests – boots the real Express app against a throw-away MongoDB and walks through the
 * main flows (auth, properties, rental requests, invoices, payments, reviews, messaging, marketplace,
 * reports, admin) plus the security rules that matter.
 *
 *   npm install --no-save mongodb-memory-server     (one-off, downloads a temporary MongoDB)
 *   npm test
 *
 * Or point TEST_DB_URL at any empty MongoDB database to run without mongodb-memory-server.
 * Never use a database that holds real data: the tests create users and records.
 */
const path = require("path");
const ROOT = path.join(__dirname, "..");

let MongoMemoryServer = null;
try { ({ MongoMemoryServer } = require("mongodb-memory-server")); } catch { /* optional */ }
if (!MongoMemoryServer && !process.env.TEST_DB_URL) {
    console.error("Install mongodb-memory-server (npm install --no-save mongodb-memory-server) or set TEST_DB_URL.");
    process.exit(2);
}

let passed = 0, failed = 0;
const failures = [];
const ok = (cond, name, extra) => {
    if (cond) { passed++; console.log("  ✓", name); }
    else { failed++; failures.push(name); console.log("  ✗", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};
const section = (t) => console.log("\n" + t);

(async () => {
    const mem = process.env.TEST_DB_URL ? null : await MongoMemoryServer.create();
    process.env.DB_URL = process.env.TEST_DB_URL || (mem.getUri() + "bariwala_test");
    process.env.JWT_SECRET = "test_secret";
    process.env.NODE_ENV = "test";
    const app = require(path.join(ROOT, "app.js"));
    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    const mongoose = require("mongoose");
    const User = require(path.join(ROOT, "src/models/userModel"));

    class Client {
        constructor(name) { this.name = name; this.cookie = ""; }
        async call(method, url, body, opts = {}) {
            const headers = { ...(opts.headers || {}) };
            if (this.cookie) headers.cookie = this.cookie;
            let payload;
            if (body instanceof FormData) payload = body;
            else if (body !== undefined) { headers["content-type"] = "application/json"; payload = JSON.stringify(body); }
            const res = await fetch(base + url, { method, headers, body: payload });
            const set = res.headers.get("set-cookie");
            if (set && set.startsWith("token=")) this.cookie = set.split(";")[0];
            let json = null;
            try { json = await res.json(); } catch { /* not json */ }
            return { status: res.status, body: json, headers: res.headers };
        }
        get(u, o) { return this.call("GET", u, undefined, o); }
        post(u, b, o) { return this.call("POST", u, b, o); }
        del(u) { return this.call("DELETE", u); }
    }

    const anon = new Client("anon"), guest = new Client("guest"), landlord = new Client("landlord"), tenant = new Client("tenant"),
        tenant2 = new Client("tenant2"), seller = new Client("seller"), buyer = new Client("buyer"), buyer2 = new Client("buyer2"), admin = new Client("admin");

    const reg = (c, name, email, role, extra = {}) => c.post("/register", { name, email, password: "Passw0rd!", role, phone: "01712345678", ...extra });

    /* ───────────────── auth ───────────────── */
    section("AUTH & VALIDATION");
    let r = await reg(guest, "L", "bad", "landlord");
    ok(r.status === 400, "short name rejected", r.body);
    r = await guest.post("/register", { name: "Lara Lord", email: "not-an-email", password: "Passw0rd!", role: "landlord" });
    ok(r.status === 400 && /email/i.test(r.body.message), "bad email rejected", r.body);
    r = await guest.post("/register", { name: "Lara Lord", email: "lara@x.com", password: "short", role: "landlord" });
    ok(r.status === 400 && /8 characters/.test(r.body.message), "short password rejected", r.body);
    r = await guest.post("/register", { name: "Lara Lord", email: "lara@x.com", password: "Passw0rd!", role: "admin" });
    ok(r.status === 400, "cannot self-register as admin", r.body);
    r = await guest.post("/register", { name: "Lara Lord", email: "lara@x.com", password: "Passw0rd!", role: "landlord", phone: "123" });
    ok(r.status === 400 && /11 digits/.test(r.body.message), "bad phone rejected", r.body);

    r = await reg(guest, "Lara Landlord", "Lara@X.com", "landlord");
    ok(r.status === 201, "landlord registered", r.body);
    r = await reg(guest, "Lara Again", "lara@x.com", "tenant");
    ok(r.status === 409, "duplicate email → 409 (case-insensitive)", r.body);
    ok((await reg(guest, "Tom Tenant", "tom@x.com", "tenant")).status === 201, "tenant registered");
    ok((await reg(guest, "Tina Tenant", "tina@x.com", "tenant")).status === 201, "tenant2 registered");
    ok((await reg(guest, "Sam Seller", "sam@x.com", "marketplace")).status === 201, "seller registered");
    ok((await reg(guest, "Bob Buyer", "bob@x.com", "marketplace")).status === 201, "buyer registered");
    ok((await reg(guest, "Bea Buyer", "bea@x.com", "marketplace")).status === 201, "buyer2 registered");
    await User.create({ name: "Root Admin", email: "admin@x.com", password: "Passw0rd!", role: "admin" });

    r = await guest.post("/login", { email: "nobody@x.com", password: "whatever1" });
    const msgUnknown = r.body.message; ok(r.status === 401, "unknown user → 401");
    r = await guest.post("/login", { email: "lara@x.com", password: "wrongpass1" });
    ok(r.status === 401 && r.body.message === msgUnknown, "wrong password gives identical message (no user enumeration)", r.body);
    r = await guest.post("/login", { email: "lara@x.com" });
    ok(r.status === 400, "login without password → 400");

    for (const [c, email] of [[landlord, "lara@x.com"], [tenant, "tom@x.com"], [tenant2, "tina@x.com"], [seller, "sam@x.com"], [buyer, "bob@x.com"], [buyer2, "bea@x.com"], [admin, "admin@x.com"]]) {
        r = await c.post("/login", { email, password: "Passw0rd!" });
        ok(r.status === 200 && c.cookie, `${c.name} logged in`, r.body);
    }
    const cookieHdr = (await landlord.post("/login", { email: "lara@x.com", password: "Passw0rd!" })).headers.get("set-cookie");
    ok(/HttpOnly/i.test(cookieHdr) && /SameSite=Lax/i.test(cookieHdr), "session cookie is HttpOnly + SameSite=Lax", cookieHdr);

    r = await landlord.get("/profile");
    const landlordId = r.body.data[0]._id;
    ok(r.status === 200 && !r.body.data[0].password, "profile returned without password hash");
    ok((await anon.get("/profile")).status === 401, "profile requires auth");
    r = await anon.get("/logout"); ok(r.status === 200, "logout works without a valid session (clears a stale cookie)");
    r = await anon.get("/session"); ok(r.status === 200 && r.body.data === null, "/session answers 200 + null for guests (no console 401s)", r.body);
    r = await landlord.get("/session"); ok(r.status === 200 && r.body.data?.role === "landlord" && !r.body.data.password, "/session returns the logged-in user without password");
    const tenantId = (await tenant.get("/profile")).body.data[0]._id;
    const tenant2Id = (await tenant2.get("/profile")).body.data[0]._id;
    const sellerId = (await seller.get("/profile")).body.data[0]._id;
    const buyerId = (await buyer.get("/profile")).body.data[0]._id;

    r = await tenant.post("/update-profile", { name: "Tom T", phone: "01898765432", bio: "Hello" });
    ok(r.status === 200 && r.body.data.name === "Tom T", "update profile", r.body);
    r = await tenant.post("/update-profile", { phone: "12" });
    ok(r.status === 400, "invalid phone on update rejected");
    r = await tenant.post("/update-profile", { bio: "x".repeat(201) });
    ok(r.status === 400, "bio > 200 rejected");
    r = await tenant.post("/change-password", { currentPassword: "nope", newPassword: "Another1234" });
    ok(r.status === 400, "change password: wrong current rejected", r.body);
    r = await tenant.post("/change-password", { currentPassword: "Passw0rd!", newPassword: "Another1234" });
    ok(r.status === 200, "change password ok", r.body);
    r = await guest.post("/login", { email: "tom@x.com", password: "Another1234" });
    ok(r.status === 200, "can log in with the new password");

    /* ───────────────── properties ───────────────── */
    section("PROPERTIES");
    const mkProp = (over = {}) => {
        const fd = new FormData();
        const v = { propertyType: "Flat", monthlyRent: "15000", advanceDeposit: "30000", area: "Mirpur", address: "House 1, Road 2, Mirpur 10", distanceFromMainRoad: "100m",
            facilities: JSON.stringify(["Gas", "WiFi", "Lift"]), location: JSON.stringify({ lat: "23.8", lng: "90.4", mapLink: "https://maps.google.com/x" }), availability: "Available", ...over };
        Object.entries(v).forEach(([k, val]) => fd.append(k, val));
        return fd;
    };
    r = await tenant.post("/create-property", mkProp());
    ok(r.status === 403, "tenant cannot create a property");
    r = await landlord.post("/create-property", mkProp({ monthlyRent: "-5" }));
    ok(r.status === 400, "negative rent rejected", r.body);
    r = await landlord.post("/create-property", mkProp({ propertyType: "Castle" }));
    ok(r.status === 400, "bad property type rejected");
    r = await landlord.post("/create-property", mkProp({ area: " " }));
    ok(r.status === 400, "blank area rejected");
    r = await landlord.post("/create-property", mkProp());
    ok(r.status === 201, "landlord creates property", r.body);
    const propId = r.body.data._id;
    ok((await landlord.post("/create-property", mkProp({ area: "Dhanmondi", address: "Flat 9, Dhanmondi 27", monthlyRent: "25000", facilities: JSON.stringify(["Parking"]), propertyType: "Room" }))).status === 201, "second property created");
    const rentedFd = mkProp({ area: "Uttara", monthlyRent: "9000", availability: "Rented" });
    const rentedId = (await landlord.post("/create-property", rentedFd)).body.data._id;

    r = await guest.get("/all-properties");
    ok(r.status === 200 && r.body.data[0].totalCount[0].count === 2, "guest sees only Available properties (2)", r.body.data[0].totalCount);
    r = await guest.get("/all-properties", { headers: { role: "admin" } });
    ok(r.body.data[0].totalCount[0].count === 2, "spoofed `role: admin` header is ignored on public routes");
    r = await guest.get("/all-properties?q=dhan"); ok(r.body.data[0].properties.length === 1, "q matches area (case-insens, partial)");
    r = await guest.get("/all-properties?q=Road%202"); ok(r.body.data[0].properties.length === 1, "q matches address");
    r = await guest.get("/all-properties?facilities=Gas,WiFi"); ok(r.body.data[0].properties.length === 1, "facilities filter (all must match)");
    r = await guest.get("/all-properties?facilities=Gas,Parking"); ok(r.body.data[0].properties.length === 0, "facilities filter excludes partial matches");
    r = await guest.get("/all-properties?propertyType=Room"); ok(r.body.data[0].properties.length === 1, "type filter");
    r = await guest.get("/all-properties?minRent=20000"); ok(r.body.data[0].properties.length === 1, "min rent filter");
    r = await guest.get("/all-properties?sort=price-desc"); ok(r.body.data[0].properties[0].monthlyRent === 25000, "server-side sort price desc");
    r = await guest.get("/all-properties?sort=price-asc"); ok(r.body.data[0].properties[0].monthlyRent === 15000, "server-side sort price asc");
    r = await guest.get("/all-properties?perPage=1&pageNo=2"); ok(r.body.data[0].properties.length === 1 && r.body.data[0].totalCount[0].count === 2, "pagination");
    r = await guest.get("/all-properties?perPage=100000"); ok(r.status === 200, "perPage is clamped");
    r = await guest.get("/all-properties?q=" + encodeURIComponent("(a+)+$.*[")); ok(r.status === 200, "regex metacharacters in search don't crash", r.body);

    r = await guest.get(`/single-property/${propId}`);
    const li = r.body.data[0].landlordInfo[0];
    ok(r.status === 200 && li._id === landlordId && !li.password && !li.email && !li.phone, "single property hides landlord password/email/phone", li);
    ok((await guest.get(`/single-property/${rentedId}`)).status === 404, "rented property hidden from guests");
    ok((await landlord.get(`/single-property/${rentedId}`)).status === 200, "owner can still open their rented property");
    ok((await guest.get("/single-property/not-an-id")).status === 400, "invalid id → 400");

    // THE bug: updating with FormData where location arrives as a JSON string
    r = await landlord.post(`/update-property/${propId}`, mkProp({ monthlyRent: "16000", location: JSON.stringify({ lat: "23.9", lng: "90.5", mapLink: "https://maps.google.com/y" }) }));
    ok(r.status === 200 && r.body.data.monthlyRent === 16000 && r.body.data.location.lat === 23.9, "update-property works with JSON-string location (was a 500 before)", r.body);
    r = await tenant.post(`/update-property/${propId}`, mkProp());
    ok(r.status === 403, "other users cannot update a property");
    r = await landlord.post(`/change-availability/${propId}`, { availability: "Nonsense" });
    ok(r.status === 400, "invalid availability value rejected");
    r = await landlord.get("/my-properties"); ok(r.body.data.length === 3, "my-properties lists own properties");
    {
        const tmpId = (await landlord.post("/create-property", mkProp({ area: "Tejgaon", address: "Temp 1" }))).body.data._id;
        await tenant2.post("/rental-request", { propertyId: tmpId, message: "interested" });
        r = await landlord.del(`/delete-property/${tmpId}`); ok(r.status === 200, "landlord deletes a property");
        const st = (await tenant2.get(`/rental-request-status/${tmpId}`)).body.data;
        ok(st && st.status === "Rejected", "deleting a property closes its pending requests", st);
    }

    /* ───────────────── rental requests / invoices / payments ───────────────── */
    section("RENTAL REQUESTS, INVOICES, PAYMENTS");
    r = await landlord.post("/rental-request", { propertyId: propId });
    ok(r.status === 403, "landlord cannot send rental request");
    r = await tenant.post("/rental-request", { propertyId: rentedId });
    ok(r.status === 400, "cannot request an already-rented property");
    r = await tenant.post("/rental-request", { propertyId: propId, message: "x".repeat(501) });
    ok(r.status === 400, "request message > 500 rejected");
    r = await tenant.post("/rental-request", { propertyId: propId, message: "We are a family of 3" });
    ok(r.status === 201, "tenant sends request", r.body);
    const reqId = r.body.data._id;
    ok((await tenant.post("/rental-request", { propertyId: propId })).status === 400, "duplicate pending request rejected");
    r = await tenant.get(`/rental-request-status/${propId}`); ok(r.body.data.status === "Pending", "status = Pending");
    r = await tenant.get("/my-rental-requests"); ok(r.body.data.length === 1 && !r.body.data[0].landlordInfo[0].email, "my requests (landlord email hidden)");

    r = await tenant2.post("/rental-request", { propertyId: propId, message: "me too" });
    const req2Id = r.body.data._id;
    r = await tenant2.post(`/cancel-rental-request/${req2Id}`);
    ok(r.status === 200, "tenant can cancel own pending request", r.body);
    ok((await tenant.post(`/cancel-rental-request/${reqId}`)).status === 200, "cancel works");
    r = await tenant.post("/rental-request", { propertyId: propId, message: "Re-sending" });
    const reqId2 = r.body.data._id; ok(r.status === 201, "can request again after cancelling");

    ok((await tenant.post(`/respond-rental-request/${reqId2}`, { action: "accept" })).status === 403, "tenant cannot accept requests");
    r = await landlord.get("/incoming-rental-requests"); ok(r.body.data.filter(x => String(x.property) === propId).length === 1, "landlord sees incoming request");
    r = await landlord.post(`/respond-rental-request/${reqId2}`, { action: "accept" });
    ok(r.status === 200 && r.body.data.status === "Accepted", "landlord accepts", r.body);
    ok((await landlord.post(`/respond-rental-request/${reqId2}`, { action: "reject" })).status === 400, "cannot answer twice");
    ok((await tenant.post(`/cancel-rental-request/${reqId2}`)).status === 400, "cannot cancel an accepted request");

    // tenant can still open the property after it is marked rented (has a request)
    await landlord.post(`/change-availability/${propId}`, { availability: "Rented" });
    ok((await tenant.get(`/single-property/${propId}`)).status === 200, "tenant with a request can open rented property");
    ok((await tenant2.get(`/single-property/${propId}`)).status === 404, "other tenants cannot");
    await landlord.post(`/change-availability/${propId}`, { availability: "Available" });

    r = await tenant.post("/generate-invoice", { tenantId, propertyId: propId, forMonth: "March 2026" });
    ok(r.status === 403, "tenant cannot generate invoices");
    r = await landlord.post("/generate-invoice", { tenantId: tenant2Id, propertyId: propId, forMonth: "March 2026" });
    ok(r.status === 403, "cannot invoice a tenant who was not accepted");
    r = await landlord.post("/generate-invoice", { tenantId, propertyId: propId, forMonth: "March 2026", amount: "-1" });
    ok(r.status === 400, "negative amount rejected");
    r = await landlord.post("/generate-invoice", { tenantId, propertyId: propId, forMonth: "March 2026", dueDays: 45 });
    ok(r.status === 400, "dueDays > 30 rejected");
    r = await landlord.post("/generate-invoice", { tenantId, propertyId: propId, forMonth: "whenever" });
    ok(r.status === 400, "invoice month must be a real month name + year");
    r = await landlord.post("/generate-invoice", { tenantId, propertyId: propId, forMonth: "March 2026", dueDays: 14, note: "incl. water" });
    ok(r.status === 201, "invoice generated", r.body);
    const inv = r.body.data;
    ok(inv.amount === 16000, "defaults to the property's current rent");
    ok(new Date(inv.expiresAt).getTime() === new Date(inv.dueDate).getTime(), "expiry follows the due date (14 days, not a fixed 7)");
    ok((await landlord.post("/generate-invoice", { tenantId, propertyId: propId, forMonth: "March 2026" })).status === 400, "duplicate month rejected");

    r = await landlord.post(`/extend-invoice/${inv._id}`, { days: 9 }); ok(r.status === 400, "extension > 7 days rejected");
    r = await landlord.post(`/extend-invoice/${inv._id}`, { days: 3 }); ok(r.status === 200, "invoice extended once", r.body);
    ok((await landlord.post(`/extend-invoice/${inv._id}`, { days: 3 })).status === 400, "cannot extend twice");

    r = await tenant.get(`/single-invoice/${inv._id}`); ok(r.status === 200, "tenant can read own invoice");
    r = await landlord.get(`/single-invoice/${inv._id}`); ok(r.status === 200, "landlord can read own invoice");
    r = await tenant2.get(`/single-invoice/${inv._id}`); ok(r.status === 403, "OTHER USER cannot read someone's invoice (was open before)", r.body);
    r = await anon.get(`/single-invoice/${inv._id}`); ok(r.status === 401, "guest cannot read invoice");

    r = await tenant.post(`/pay/${inv._id}`, { paymentMethod: "Bitcoin" }); ok(r.status === 400, "invalid payment method rejected");
    r = await tenant2.post(`/pay/${inv._id}`, { paymentMethod: "bKash" }); ok(r.status === 403, "cannot pay someone else's invoice");
    r = await tenant.post(`/pay/${inv._id}`, { paymentMethod: "bKash" });
    ok(r.status === 200 && r.body.transactionRef?.startsWith("BK-"), "tenant pays invoice", r.body);
    ok((await tenant.post(`/pay/${inv._id}`, { paymentMethod: "bKash" })).status === 400, "cannot pay twice");
    r = await tenant.get("/payment-history"); ok(r.body.data.length === 1 && r.body.data[0].status === "Paid", "payment history shows Paid");

    // overdue handling
    const Payment = require(path.join(ROOT, "src/models/paymentModel"));
    await Payment.updateOne({ _id: inv._id }, { status: "Pending", paidAt: null });
    await Payment.updateOne({ _id: inv._id }, { expiresAt: new Date(Date.now() - 1000), dueDate: new Date(Date.now() - 1000) });
    r = await tenant.get("/payment-history"); ok(r.body.data[0].status === "Overdue", "past-due pending invoices flip to Overdue");
    r = await tenant.post(`/pay/${inv._id}`, { paymentMethod: "Card" }); ok(r.status === 200, "overdue invoice can still be paid");

    // two payments fired at the same moment: exactly one may succeed
    const inv2 = (await landlord.post("/generate-invoice", { tenantId, propertyId: propId, forMonth: "April 2026" })).body.data;
    const [p1, p2] = await Promise.all([
        tenant.post(`/pay/${inv2._id}`, { paymentMethod: "bKash" }),
        tenant.post(`/pay/${inv2._id}`, { paymentMethod: "Nagad" }),
    ]);
    ok([p1.status, p2.status].filter(x => x === 200).length === 1, "simultaneous payments: only one succeeds (no double charge)", [p1.status, p2.status]);

    // an overdue invoice can be extended and becomes pending again
    const inv3 = (await landlord.post("/generate-invoice", { tenantId, propertyId: propId, forMonth: "May 2026" })).body.data;
    await Payment.updateOne({ _id: inv3._id }, { status: "Overdue", dueDate: new Date(Date.now() - 86400000), expiresAt: new Date(Date.now() - 86400000) });
    r = await landlord.post(`/extend-invoice/${inv3._id}`, { days: 5 });
    ok(r.status === 200 && r.body.data.status === "Pending" && new Date(r.body.data.dueDate) > new Date(Date.now() + 4 * 86400000), "overdue invoice can be extended (counted from today, back to Pending)", r.body);

    /* ───────────────── reviews ───────────────── */
    section("REVIEWS");
    r = await tenant2.post("/create-review", { revieweeId: landlordId, propertyId: propId, reviewType: "tenant-to-landlord", rating: 5 });
    ok(r.status === 403, "cannot review without an accepted request");
    r = await tenant.post("/create-review", { revieweeId: landlordId, propertyId: propId, reviewType: "tenant-to-landlord", rating: 9 });
    ok(r.status === 400, "rating out of range rejected");
    r = await tenant.post("/create-review", { revieweeId: tenantId, propertyId: propId, reviewType: "tenant-to-landlord", rating: 5 });
    ok(r.status === 400, "cannot review yourself");
    r = await tenant.post("/create-review", { revieweeId: landlordId, propertyId: propId, reviewType: "tenant-to-landlord", rating: 4, comment: "Great" });
    ok(r.status === 201, "tenant reviews landlord", r.body);
    ok((await tenant.post("/create-review", { revieweeId: landlordId, propertyId: propId, reviewType: "tenant-to-landlord", rating: 5 })).status === 400, "duplicate review rejected");
    r = await landlord.post("/create-review", { revieweeId: tenantId, propertyId: propId, reviewType: "landlord-to-tenant", rating: 5 });
    ok(r.status === 201, "landlord reviews tenant", r.body);
    r = await guest.get(`/reviews/${landlordId}`); ok(r.body.totalReviews === 1 && r.body.avgRating === "4.0" && !r.body.data[0].reviewerInfo[0].email, "reviews listed, reviewer email hidden");

    /* ───────────────── messaging ───────────────── */
    section("MESSAGING");
    r = await tenant.post("/send-message", { receiverId: landlordId, propertyId: propId, message: "   " }); ok(r.status === 400, "empty message rejected");
    r = await tenant.post("/send-message", { receiverId: landlordId, propertyId: propId, message: "x".repeat(1001) }); ok(r.status === 400, "message > 1000 rejected");
    r = await tenant.post("/send-message", { receiverId: tenantId, message: "hi me" }); ok(r.status === 400, "cannot message yourself");
    r = await tenant.post("/send-message", { receiverId: tenant2Id, propertyId: propId, message: "hello" });
    ok(r.status === 403, "property chat must involve the property's landlord", r.body);
    r = await tenant.post("/send-message", { receiverId: landlordId, propertyId: propId, message: "Is it available?" }); ok(r.status === 201, "tenant → landlord", r.body);
    r = await tenant2.post("/send-message", { receiverId: landlordId, propertyId: propId, message: "And for me?" }); ok(r.status === 201, "tenant2 → landlord, same property");
    r = await landlord.get("/unread-count"); ok(r.body.count === 2, "unread count = 2", r.body);
    // reading Tom's conversation must NOT mark Tina's message as read (bug fixed)
    r = await landlord.get(`/conversation/${propId}/${tenantId}`); ok(r.body.data.length === 1 && !r.body.data[0].senderInfo[0].email, "conversation loaded, emails hidden");
    r = await landlord.get("/unread-count"); ok(r.body.count === 1, "opening one conversation only clears that tenant's unread messages", r.body);
    r = await landlord.post("/send-message", { receiverId: tenantId, propertyId: propId, message: "Yes, come on Friday" }); ok(r.status === 201, "landlord → tenant");
    r = await landlord.get("/inbox"); ok(r.body.data.length === 2 && r.body.data[0].contextType === "property", "inbox has 2 threads", r.body.data.map(t => t.contextType));
    ok(r.body.data.every(t => !t.otherUser.email), "inbox hides other users' email");

    r = await admin.post("/broadcast-message", { message: "Welcome to Bariwala!" }); ok(r.status === 200 && r.body.count >= 6, "admin broadcast", r.body);
    ok((await tenant.post("/broadcast-message", { message: "spam" })).status === 403, "non-admin cannot broadcast");
    r = await tenant.get("/inbox");
    const direct = r.body.data.find(t => t.contextType === "direct");
    ok(!!direct && direct.contextId === "", "broadcast shows as a direct thread (used to be a broken 'item' thread)", r.body.data);
    r = await tenant.get(`/direct-conversation/${direct.otherId}`); ok(r.status === 200 && r.body.data.length === 1, "direct conversation loads");
    r = await tenant.post("/send-message", { receiverId: direct.otherId, message: "Thanks!" }); ok(r.status === 201, "user can reply to an announcement");

    /* ───────────────── marketplace ───────────────── */
    section("MARKETPLACE");
    const mkItem = (over = {}) => {
        const fd = new FormData();
        Object.entries({ title: "Oak dining table", description: "Solid wood", price: "8000", condition: "Used", category: "Furniture", ...over }).forEach(([k, v]) => fd.append(k, v));
        return fd;
    };
    ok((await tenant.post("/create-item", mkItem())).status === 403, "only marketplace users can post items");
    ok((await seller.post("/create-item", mkItem({ price: "0" }))).status === 400, "zero price rejected");
    ok((await seller.post("/create-item", mkItem({ category: "Weapons" }))).status === 400, "unknown category rejected");
    ok((await seller.post("/create-item", mkItem({ title: "ab" }))).status === 400, "too-short title rejected");
    r = await seller.post("/create-item", mkItem()); ok(r.status === 201 && r.body.data.category === "Furniture", "item created with category", r.body);
    const itemId = r.body.data._id;
    const item2Id = (await seller.post("/create-item", mkItem({ title: "Samsung fridge", price: "30000", category: "Appliances", condition: "New" }))).body.data._id;
    const item3Id = (await seller.post("/create-item", mkItem({ title: "Old sofa", price: "5000", category: "Furniture" }))).body.data._id;

    r = await guest.get("/all-items?category=Furniture"); ok(r.body.data[0].items.length === 2, "category filter works (was ignored before)");
    r = await guest.get("/all-items?q=fridge"); ok(r.body.data[0].items.length === 1, "title search");
    r = await guest.get("/all-items?condition=New"); ok(r.body.data[0].items.length === 1, "condition filter");
    r = await guest.get("/all-items?sort=price-asc"); ok(r.body.data[0].items[0].price === 5000, "sort by price");
    r = await guest.get("/all-items?maxPrice=6000"); ok(r.body.data[0].items.length === 1, "price filter");
    ok(!r.body.data[0].items[0].sellerInfo[0].email, "item listing hides seller email");
    r = await guest.get(`/single-item/${itemId}`); ok(r.status === 200 && !r.body.data[0].sellerInfo[0].email && !r.body.data[0].buyerInfo, "single item: no seller email, no buyer info");
    ok((await guest.get("/single-item/000000000000000000000000")).status === 404, "missing item → 404");

    r = await seller.post(`/update-item/${itemId}`, { price: "-4" }); ok(r.status === 400, "update validates price");
    r = await buyer.post(`/update-item/${itemId}`, { title: "hijack" }); ok(r.status === 403, "cannot edit someone else's item");
    r = await seller.post(`/update-item/${itemId}`, { price: "7500", category: "Furniture" }); ok(r.status === 200 && r.body.data.price === 7500, "seller edits item");
    r = await buyer.post(`/mark-sold/${item3Id}`, {}); ok(r.status === 403, "SECURITY: strangers cannot mark an item as sold (was open before)");

    const info = { fullName: "Bob Buyer", phone: "01712345678", addressLine: "House 5, Road 3", city: "Dhaka", area: "Mirpur" };
    r = await buyer.post("/checkout", { itemIds: [], buyer: info }); ok(r.status === 400, "empty cart rejected");
    r = await buyer.post("/checkout", { itemIds: [itemId], buyer: { ...info, phone: "123" } }); ok(r.status === 400, "checkout validates phone");
    r = await tenant.post("/checkout", { itemIds: [itemId], buyer: info }); ok(r.status === 403, "only marketplace accounts can check out");
    r = await seller.post("/checkout", { itemIds: [itemId], buyer: info }); ok(r.status === 409 && r.body.failed[0].reason.includes("own"), "cannot buy your own item", r.body);
    r = await buyer.post("/checkout", { itemIds: [itemId, item2Id], buyer: info, txnRef: "MKT-TEST-1" });
    ok(r.status === 200 && r.body.purchased.length === 2 && r.body.total === 37500, "checkout buys 2 items", r.body);
    r = await buyer2.post("/checkout", { itemIds: [itemId, item3Id], buyer: { ...info, fullName: "Bea" } });
    ok(r.status === 200 && r.body.purchased.length === 1 && r.body.failed.length === 1 && r.body.failed[0]._id === itemId, "double purchase prevented; available item still bought", r.body);
    r = await buyer2.post("/checkout", { itemIds: [itemId], buyer: info }); ok(r.status === 409, "all-unavailable cart → 409");
    r = await guest.get("/all-items"); ok(r.body.data[0].items.length === 0, "sold items leave the shop");
    r = await guest.get(`/single-item/${itemId}`); ok(r.status === 200 && r.body.data[0].isSold === true, "sold item page still viewable (shows Sold)");
    r = await buyer.get("/my-orders"); ok(r.body.data.length === 2 && r.body.data[0].buyerInfo.txnRef, "buyer sees orders", r.body);
    r = await seller.get("/my-items"); const sold = r.body.data.filter(i => i.isSold);
    ok(sold.length === 3 && sold.find(i => i._id === itemId).buyerInfo.addressLine === "House 5, Road 3", "seller sees buyer delivery details on sold items", sold.map(s => s.buyerInfo));
    r = await seller.post(`/update-item/${itemId}`, { title: "edited after sale" }); ok(r.status === 400, "sold items cannot be edited");

    // manual mark-sold by owner
    const item4 = (await seller.post("/create-item", mkItem({ title: "Bookshelf", price: "2000" }))).body.data._id;
    r = await seller.post(`/mark-sold/${item4}`, {}); ok(r.status === 200, "owner can mark own item sold");
    ok((await seller.post(`/mark-sold/${item4}`, {})).status === 400, "cannot mark sold twice");

    /* ───────────────── reports & admin ───────────────── */
    section("REPORTS & ADMIN");
    r = await tenant.post("/create-report", { reportType: "property", reportedEntity: propId, reason: "short" }); ok(r.status === 400, "reason must be descriptive");
    r = await tenant.post("/create-report", { reportType: "property", reportedEntity: "000000000000000000000000", reason: "this does not exist at all" }); ok(r.status === 404, "reporting a missing entity → 404");
    r = await tenant.post("/create-report", { reportType: "user", reportedEntity: tenantId, reason: "reporting myself here" }); ok(r.status === 400, "cannot report yourself");
    r = await tenant.post("/create-report", { reportType: "property", reportedEntity: propId, reason: "Photos look fake to me" }); ok(r.status === 201, "report created", r.body);
    const reportId = r.body.data._id;
    ok((await tenant.post("/create-report", { reportType: "property", reportedEntity: propId, reason: "Reporting the same thing again" })).status === 400, "duplicate open report blocked");
    r = await tenant2.post("/create-report", { reportType: "user", reportedEntity: sellerId, reason: "Rude in chat, sent abuse" }); ok(r.status === 201, "user report created");
    const userReportId = r.body.data._id;

    ok((await tenant.get("/admin/all-reports")).status === 403, "non-admin blocked from admin API");
    ok((await anon.get("/admin/all-reports")).status === 401, "guest blocked from admin API");
    r = await admin.get("/admin/all-reports");
    const rep = r.body.data[0].reports.find(x => x._id === reportId);
    ok(r.status === 200 && rep.propertyTarget[0]._id === propId && r.body.data[0].pendingCount[0].count === 2, "admin sees reports with their target resolved", r.body.data[0].pendingCount);
    ok(!rep.reportedByInfo[0].password, "no password hashes in report data");
    r = await admin.post(`/admin/update-report/bad-id`, { status: "Resolved" }); ok(r.status === 400, "update-report validates id");
    r = await admin.post(`/admin/update-report/${reportId}`, { status: "Weird" }); ok(r.status === 400, "update-report validates status");
    r = await admin.post(`/admin/update-report/${reportId}`, { status: "Reviewed" }); ok(r.status === 200, "report marked reviewed");
    r = await admin.get("/admin/all-reports?status=Reviewed"); ok(r.body.data[0].reports.length === 1, "report status filter");

    r = await admin.get("/admin/all-users?q=tom"); ok(r.body.data[0].users.length === 1 && r.body.data[0].filteredCount[0].count === 1, "admin user search");
    r = await admin.get("/admin/all-users?role=marketplace"); ok(r.body.data[0].users.length === 3, "admin role filter");
    r = await admin.get("/admin/all-users"); ok(r.body.data[0].totalCount[0].count === 7 && r.body.data[0].users.every(u => !u.password), "admin users: totals + no password hashes");
    r = await admin.get("/admin/overview"); ok(r.status === 200 && r.body.data.users.length >= 4, "admin overview");
    r = await admin.get("/admin/all-transactions?status=Paid"); ok(r.body.data[0].transactions.length === 2 && r.body.data[0].revenue[0].total === 32000 && r.body.data[0].transactions.every(t => t.status === "Paid"), "admin transactions + revenue summary", r.body.data[0].revenue);

    const adminId = (await admin.get("/profile")).body.data[0]._id;
    ok((await admin.post(`/admin/block-user/${adminId}`)).status === 400, "admins cannot be blocked");
    r = await admin.post(`/admin/block-user/${sellerId}`); ok(r.status === 200 && r.body.data.isBlocked, "admin blocks a user");
    r = await seller.get("/profile"); ok(r.status === 403, "SECURITY: a blocked user's existing session stops working immediately", r.body);
    r = await guest.post("/login", { email: "sam@x.com", password: "Passw0rd!" }); ok(r.status === 403, "blocked user cannot log in");
    r = await admin.post(`/admin/block-user/${sellerId}`); ok(!r.body.data.isBlocked, "admin unblocks");
    r = await seller.get("/profile"); ok(r.status === 200, "unblocked user's session works again");

    r = await admin.del(`/admin/remove-listing/${propId}`); ok(r.status === 200, "admin removes listing");
    ok((await admin.del(`/admin/remove-listing/000000000000000000000000`)).status === 404, "removing a missing listing → 404");
    r = await guest.get("/all-properties"); ok(r.body.data[0].totalCount[0]?.count === 1, "removed listing disappears from search");

    /* ───────────────── misc ───────────────── */
    section("MISC");
    r = await tenant.get("/search-tenants?q=to"); ok(r.status === 403, "only landlords can search tenants");
    r = await landlord.get("/search-tenants?q=" + encodeURIComponent(".*")); ok(r.status === 200, "tenant search escapes regex");
    r = await guest.get("/nope"); ok(r.status === 404 && r.body?.success === false, "unknown API route → JSON 404", r.status);
    r = await anon.call("POST", "/login", undefined); ok(r.status === 400, "empty login body handled");
    const raw = await fetch(base + "/login", { method: "POST", headers: { "content-type": "application/json" }, body: "{bad json" });
    ok(raw.status === 400, "malformed JSON → 400 (not a stack trace)");

    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed) console.log("FAILED:\n - " + failures.join("\n - "));
    server.close();
    await mongoose.disconnect();
    if (mem) await mem.stop();
    process.exit(failed ? 1 : 0);
})().catch(e => { console.error("TEST CRASH", e); process.exit(2); });
