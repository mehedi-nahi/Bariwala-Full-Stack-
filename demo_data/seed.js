/**
 * Demo data seeder:  npm run seed            (only runs on an empty database)
 *                    npm run seed -- --reset (wipes Bariwala collections first)
 *
 * Creates one account per role plus sample properties, requests, invoices, messages,
 * marketplace items and reports, so every screen has something to show.
 * All demo accounts use the password:  Passw0rd!
 */
require("dotenv").config();
const mongoose = require("mongoose");

const User        = require("../src/models/userModel");
const Property    = require("../src/models/propertyModel");
const Marketplace = require("../src/models/marketplaceModel");
const Request     = require("../src/models/rentalRequestModel");
const Payment     = require("../src/models/paymentModel");
const Message     = require("../src/models/messageModel");
const Report      = require("../src/models/reportModel");
const Review      = require("../src/models/reviewModel");

const PASSWORD = "Passw0rd!";
const DAY = 24 * 60 * 60 * 1000;

// Simple generated cover images so the demo looks complete without any uploads.
const cover = (c1, c2, label) => "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='800' height='600' fill='url(#g)'/><text x='400' y='320' font-family='Arial' font-size='54' fill='white' text-anchor='middle' opacity='.85'>${label}</text></svg>`
);
const PALETTE = [["#c8402a", "#7a2417"], ["#243b6b", "#122044"], ["#2a7f62", "#14503c"], ["#b9702a", "#7a4412"], ["#7a4fa3", "#46276b"]];

const run = async () => {
    if (!process.env.DB_URL) throw new Error("DB_URL is not set. Copy .env.example to .env first.");
    await mongoose.connect(process.env.DB_URL);

    const reset = process.argv.includes("--reset");
    const existing = await User.countDocuments();
    if (existing > 0 && !reset) {
        console.log(`The database already has ${existing} user(s) – nothing was changed.\nRe-run with  npm run seed -- --reset  to wipe and re-seed.`);
        return;
    }
    if (reset) {
        await Promise.all([User, Property, Marketplace, Request, Payment, Message, Report, Review].map(m => m.deleteMany({})));
        console.log("Existing data removed.");
    }

    const mk = (name, email, role, phone, bio = "") => User.create({ name, email, role, phone, bio, password: PASSWORD });
    const admin    = await mk("Root Admin",    "admin@demo.com",     "admin",       "01700000000");
    const landlord = await mk("Rafiq Hossain", "landlord@demo.com",  "landlord",    "01722222222", "Property owner in Dhaka for 10+ years.");
    const tenant   = await mk("Nadia Rahman",  "tenant@demo.com",    "tenant",      "01733333333");
    const tenant2  = await mk("Imran Khan",    "tenant2@demo.com",   "tenant",      "01711111111");
    const seller   = await mk("Sumaiya Akter", "seller@demo.com",    "marketplace", "01744444444");
    const buyer    = await mk("Tanvir Ahmed",  "buyer@demo.com",     "marketplace", "01755555555");

    const areas = [["Mirpur 10", "Flat", 18000], ["Dhanmondi", "Flat", 32000], ["Uttara Sector 7", "Room", 8500], ["Banani", "Flat", 45000],
        ["Mohammadpur", "Sublet", 12000], ["Bashundhara R/A", "Flat", 26000], ["Gulshan 2", "Flat", 60000], ["Farmgate", "Room", 7000]];
    const facilities = [["Gas", "Water", "Lift", "WiFi"], ["Gas", "Water", "Parking", "Security", "CCTV"], ["WiFi", "Water"], ["Lift", "Generator", "AC", "Furnished", "Parking"],
        ["Gas"], ["Gas", "Water", "Lift", "Generator"], ["Lift", "Security", "CCTV", "AC", "WiFi", "Parking", "Gas"], []];

    const props = [];
    for (let i = 0; i < areas.length; i++) {
        const [area, type, rent] = areas[i];
        props.push(await Property.create({
            landlord: landlord._id, propertyType: type, monthlyRent: rent, advanceDeposit: rent * 2, area,
            address: `House ${i + 3}, Road ${i + 1}, ${area}, Dhaka`, distanceFromMainRoad: `${(i + 1) * 50} meters`,
            facilities: facilities[i], availability: i === 7 ? "Rented" : "Available",
            images: i % 3 === 2 ? [] : [cover(...PALETTE[i % 5], `${type} · ${area}`), cover(...PALETTE[(i + 1) % 5], "Living room"), cover(...PALETTE[(i + 2) % 5], "Bedroom")],
            location: { lat: 23.8 + i / 100, lng: 90.4, mapLink: "https://maps.google.com/?q=Dhaka" },
        }));
    }

    await Request.create({ tenant: tenant._id,  landlord: landlord._id, property: props[0]._id, status: "Accepted", message: "We are a small family of three." });
    await Request.create({ tenant: tenant2._id, landlord: landlord._id, property: props[0]._id, status: "Pending",  message: "Interested in moving next month." });
    await Request.create({ tenant: tenant._id,  landlord: landlord._id, property: props[1]._id, status: "Rejected" });
    await Request.create({ tenant: tenant._id,  landlord: landlord._id, property: props[3]._id, status: "Pending",  message: "Is it pet friendly?" });

    const invoice = (n, month, status, extra = {}) => Payment.create({
        tenant: tenant._id, landlord: landlord._id, property: props[0]._id, amount: 18000, forMonth: month,
        invoiceNo: `INV-DEMO-${n}`, status, dueDate: new Date(Date.now() + 5 * DAY), expiresAt: new Date(Date.now() + 5 * DAY), ...extra,
    });
    await invoice(1, "July 2026",      "Paid",    { paidAt: new Date(Date.now() - 40 * DAY), transactionRef: "BK-DEMO-AB12CD", paymentMethod: "bKash", dueDate: new Date(Date.now() - 45 * DAY), expiresAt: new Date(Date.now() - 45 * DAY) });
    await invoice(2, "August 2026",    "Overdue", { dueDate: new Date(Date.now() - 3 * DAY), expiresAt: new Date(Date.now() - 3 * DAY), note: "Includes utility charges" });
    await invoice(3, "September 2026", "Pending");

    await Review.create({ reviewer: tenant._id, reviewee: landlord._id, property: props[0]._id, reviewType: "tenant-to-landlord", rating: 5, comment: "Very responsive and the flat is exactly as described." });

    await Message.create({ sender: tenant._id,   receiver: landlord._id, property: props[0]._id, message: "Hello! Is the lift working properly?" });
    await Message.create({ sender: landlord._id, receiver: tenant._id,   property: props[0]._id, message: "Yes, it was serviced last month. Happy to show you around on Friday." });
    await Message.create({ sender: admin._id,    receiver: tenant._id,   message: "Welcome to Bariwala! Reply here if you need any help." });

    const categories = ["Furniture", "Electronics", "Appliances", "Books", "Clothing", "Sports", "Other"];
    const titles = ["Oak dining table with 4 chairs", "Samsung 43\" smart TV", "Walton refrigerator 300L", "Engineering textbook set", "Winter jacket (L)",
        "Cricket bat & pads", "Bookshelf – 5 tier", "Single bed with mattress", "Microwave oven", "Study desk"];
    const items = [];
    for (let i = 0; i < titles.length; i++) {
        items.push(await Marketplace.create({
            seller: seller._id, title: titles[i], price: (i + 1) * 1500, condition: i % 3 ? "Used" : "New", category: categories[i % categories.length],
            description: i % 2 ? "Well maintained – selling because we are moving." : "",
            images: i === 4 ? [] : [cover(...PALETTE[i % 5], titles[i].slice(0, 22))],
        }));
    }
    await Marketplace.findByIdAndUpdate(items[9]._id, {
        isSold: true, isRemoved: true, soldAt: new Date(Date.now() - 2 * DAY), buyer: buyer._id,
        buyerInfo: { name: "Tanvir Ahmed", phone: "01755555555", addressLine: "House 4, Road 7", area: "Mirpur 10", city: "Dhaka", txnRef: "MKT-DEMO-1" },
    });

    await Report.create({ reportedBy: tenant._id,  reportType: "property", reportedEntity: props[1]._id, reason: "The photos look like they were taken from another listing." });
    await Report.create({ reportedBy: tenant2._id, reportType: "user",     reportedEntity: seller._id,   reason: "Sent me rude messages after I declined to buy." });

    console.log(`Seeded ${await User.countDocuments()} users, ${props.length} properties, ${items.length} marketplace items.\n`);
    console.log("Demo logins (password for all: " + PASSWORD + ")");
    console.log("  admin@demo.com      admin");
    console.log("  landlord@demo.com   landlord");
    console.log("  tenant@demo.com     tenant   (has an accepted request + invoices)");
    console.log("  tenant2@demo.com    tenant");
    console.log("  seller@demo.com     marketplace seller");
    console.log("  buyer@demo.com      marketplace buyer");
};

run()
    .catch(err => { console.error("Seeding failed:", err.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
