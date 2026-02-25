/**
 * Bariwala – Demo Data Seed Script
 * Run:  node demo_data/seed.js
 *
 * Inserts demo users, properties, marketplace items, payments,
 * messages, reviews, and reports into MongoDB.
 * Existing collections are CLEARED before seeding.
 */

const mongoose = require("mongoose");
require("dotenv").config();

// ── Models ────────────────────────────────────────────────────────────────────
const User        = require("../src/models/userModel");
const Property    = require("../src/models/propertyModel");
const Payment     = require("../src/models/paymentModel");
const Message     = require("../src/models/messageModel");
const Marketplace = require("../src/models/marketplaceModel");
const Review      = require("../src/models/reviewModel");
const Report      = require("../src/models/reportModel");

// ── Helpers ───────────────────────────────────────────────────────────────────

async function seed() {
    await mongoose.connect(process.env.DB_URL, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000
    });
    console.log("✅  Connected to MongoDB");

    // ── Clear collections ──────────────────────────────────────────────────
    await Promise.all([
        User.deleteMany({}),
        Property.deleteMany({}),
        Payment.deleteMany({}),
        Message.deleteMany({}),
        Marketplace.deleteMany({}),
        Review.deleteMany({}),
        Report.deleteMany({})
    ]);
    console.log("🗑   Cleared all collections");

    // ── Users ──────────────────────────────────────────────────────────────
    const plainPass = "Password@123";

    await User.create({
        name: "Admin Karim",
        email: "admin@bariwala.com",
        phone: "01711000001",
        password: plainPass,
        role: "admin"
    });

    const landlord1 = await User.create({
        name: "Rahim Landlord",
        email: "rahim@bariwala.com",
        phone: "01711000002",
        password: plainPass,
        role: "landlord"
    });

    const landlord2 = await User.create({
        name: "Farida Begum",
        email: "farida@bariwala.com",
        phone: "01711000003",
        password: plainPass,
        role: "landlord"
    });

    const tenant1 = await User.create({
        name: "Sumon Tenant",
        email: "sumon@bariwala.com",
        phone: "01711000004",
        password: plainPass,
        role: "tenant"
    });

    const tenant2 = await User.create({
        name: "Mitu Akter",
        email: "mitu@bariwala.com",
        phone: "01711000005",
        password: plainPass,
        role: "tenant"
    });

    const marketplaceUser = await User.create({
        name: "Bazlur Seller",
        email: "bazlur@bariwala.com",
        phone: "01711000006",
        password: plainPass,
        role: "marketplace"
    });

    console.log("👤  Users created");

    // ── Properties ─────────────────────────────────────────────────────────
    const property1 = await Property.create({
        landlord: landlord1._id,
        propertyType: "Flat",
        monthlyRent: 18000,
        advanceDeposit: 36000,
        address: "House 12, Road 5, Dhanmondi, Dhaka",
        area: "Dhanmondi",
        location: { lat: 23.7461, lng: 90.3742, mapLink: "https://maps.google.com/?q=23.7461,90.3742" },
        distanceFromMainRoad: "200m",
        facilities: ["Gas", "Water", "Lift", "WiFi", "Parking"],
        images: [],
        availability: "Available"
    });

    const property2 = await Property.create({
        landlord: landlord1._id,
        propertyType: "Room",
        monthlyRent: 7000,
        advanceDeposit: 14000,
        address: "Flat B2, Mirpur 10, Dhaka",
        area: "Mirpur",
        location: { lat: 23.8041, lng: 90.3665 },
        distanceFromMainRoad: "100m",
        facilities: ["Water", "WiFi"],
        images: [],
        availability: "Rented"
    });

    const property3 = await Property.create({
        landlord: landlord2._id,
        propertyType: "Sublet",
        monthlyRent: 5500,
        advanceDeposit: 11000,
        address: "Block C, Sector 7, Uttara, Dhaka",
        area: "Uttara",
        location: { lat: 23.8759, lng: 90.3795 },
        distanceFromMainRoad: "50m",
        facilities: ["Gas", "Water", "Security"],
        images: [],
        availability: "Available"
    });

    const property4 = await Property.create({
        landlord: landlord2._id,
        propertyType: "Flat",
        monthlyRent: 25000,
        advanceDeposit: 50000,
        address: "Road 11, Gulshan 2, Dhaka",
        area: "Gulshan",
        location: { lat: 23.7925, lng: 90.4078 },
        distanceFromMainRoad: "300m",
        facilities: ["Gas", "Water", "Lift", "WiFi", "Parking", "Generator"],
        images: [],
        availability: "Available"
    });

    console.log("🏠  Properties created");

    // ── Payments ───────────────────────────────────────────────────────────
    await Payment.create({
        tenant: tenant1._id,
        landlord: landlord1._id,
        property: property2._id,
        amount: 7000,
        invoiceNo: "INV-2026-0001",
        forMonth: "January 2026",
        status: "Paid",
        paidAt: new Date("2026-01-05")
    });

    await Payment.create({
        tenant: tenant1._id,
        landlord: landlord1._id,
        property: property2._id,
        amount: 7000,
        invoiceNo: "INV-2026-0002",
        forMonth: "February 2026",
        status: "Paid",
        paidAt: new Date("2026-02-04")
    });

    await Payment.create({
        tenant: tenant1._id,
        landlord: landlord1._id,
        property: property2._id,
        amount: 7000,
        invoiceNo: "INV-2026-0003",
        forMonth: "March 2026",
        status: "Pending",
        paidAt: null
    });

    await Payment.create({
        tenant: tenant2._id,
        landlord: landlord2._id,
        property: property3._id,
        amount: 5500,
        invoiceNo: "INV-2026-0004",
        forMonth: "February 2026",
        status: "Paid",
        paidAt: new Date("2026-02-03")
    });

    console.log("💳  Payments created");

    // ── Marketplace Items ──────────────────────────────────────────────────
    const item1 = await Marketplace.create({
        seller: marketplaceUser._id,
        title: "Walton Refrigerator 250L",
        description: "2 year old, works perfectly. Moving out so selling.",
        price: 22000,
        condition: "Used",
        images: []
    });

    const item2 = await Marketplace.create({
        seller: marketplaceUser._id,
        title: "Single Bed with Mattress",
        description: "Solid wood frame, barely used. Good for bachelor room.",
        price: 8500,
        condition: "Used",
        images: []
    });

    console.log("🛒  Marketplace items created");

    // ── Messages ───────────────────────────────────────────────────────────
    await Message.create({
        property: property1._id,
        sender: tenant2._id,
        receiver: landlord1._id,
        message: "Assalamu Alaikum, is the Dhanmondi flat still available?",
        isRead: true
    });

    await Message.create({
        property: property1._id,
        sender: landlord1._id,
        receiver: tenant2._id,
        message: "Wa alaikum assalam, yes it is still available. When would you like to visit?",
        isRead: true
    });

    await Message.create({
        property: property1._id,
        sender: tenant2._id,
        receiver: landlord1._id,
        message: "Can we visit this Friday morning?",
        isRead: false
    });

    await Message.create({
        property: property3._id,
        sender: tenant1._id,
        receiver: landlord2._id,
        message: "Hello, I am interested in the Uttara sublet. Is the rent negotiable?",
        isRead: false
    });

    await Message.create({
        item: item1._id,
        sender: tenant2._id,
        receiver: marketplaceUser._id,
        message: "Hi, is the refrigerator still for sale? What is the final price?",
        isRead: false
    });

    await Message.create({
        item: item2._id,
        sender: tenant2._id,
        receiver: landlord1._id,
        message: "Is the AC available? Can you lower the price a bit?",
        isRead: false
    });

    console.log("💬  Messages created");

    // ── Reviews ────────────────────────────────────────────────────────────
    await Review.create({
        reviewer: tenant1._id,
        reviewee: landlord1._id,
        property: property2._id,
        reviewType: "tenant-to-landlord",
        rating: 4,
        comment: "Good landlord, responds quickly. Flat maintenance could be better."
    });

    await Review.create({
        reviewer: landlord1._id,
        reviewee: tenant1._id,
        property: property2._id,
        reviewType: "landlord-to-tenant",
        rating: 5,
        comment: "Excellent tenant. Always pays rent on time. Highly recommended."
    });

    await Review.create({
        reviewer: tenant2._id,
        reviewee: landlord2._id,
        property: property3._id,
        reviewType: "tenant-to-landlord",
        rating: 3,
        comment: "Decent place, but landlord takes time to fix issues."
    });

    console.log("⭐  Reviews created");

    // ── Reports ────────────────────────────────────────────────────────────
    await Report.create({
        reportedBy: tenant1._id,
        reportType: "property",
        reportedEntity: property4._id,
        reason: "Property images are misleading and do not match the actual flat.",
        status: "Pending"
    });

    await Report.create({
        reportedBy: tenant2._id,
        reportType: "marketplace",
        reportedEntity: item2._id,
        reason: "Item description says new but photos show visible damage.",
        status: "Reviewed"
    });

    await Report.create({
        reportedBy: landlord2._id,
        reportType: "user",
        reportedEntity: tenant1._id,
        reason: "User sent spam messages multiple times.",
        status: "Resolved"
    });

    console.log("🚩  Reports created");

    // ── Summary ────────────────────────────────────────────────────────────
    console.log("\n═══════════════════════════════════════════════════");
    console.log("✅  SEED COMPLETE – Demo data inserted successfully");
    console.log("═══════════════════════════════════════════════════");
    console.log("\n📧  Login credentials (all users share the same password):");
    console.log("   Password     : Password@123");
    console.log("   Admin        : admin@bariwala.com");
    console.log("   Landlord 1   : rahim@bariwala.com");
    console.log("   Landlord 2   : farida@bariwala.com");
    console.log("   Tenant 1     : sumon@bariwala.com");
    console.log("   Tenant 2     : mitu@bariwala.com");
    console.log("   Marketplace  : bazlur@bariwala.com\n");

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => {
    console.error("❌  Seed failed:", err.message);
    process.exit(1);
});
