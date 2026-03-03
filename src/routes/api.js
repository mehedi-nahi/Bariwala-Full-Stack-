const express = require("express");
let router = express.Router();

const authVerification  = require("../middlewares/authVerification");
const adminVerification = require("../middlewares/adminVerification");
const fileUploads       = require("../middlewares/fileUploads");

const userController           = require("../controllers/userController");
const propertyController       = require("../controllers/propertyController");
const messageController        = require("../controllers/messageController");
const paymentController        = require("../controllers/paymentController");
const marketplaceController    = require("../controllers/marketplaceController");
const reviewController         = require("../controllers/reviewController");
const reportController         = require("../controllers/reportController");
const adminController          = require("../controllers/adminController");
const rentalRequestController  = require("../controllers/rentalRequestController");

// ─────────────────────────────────────────────
//  AUTH / USER
// ─────────────────────────────────────────────
router.post("/register",                              userController.register);
router.post("/login",                                 userController.login);
router.get("/logout",          authVerification,      userController.logout);
router.get("/profile",         authVerification,      userController.profile);
router.post("/update-profile", authVerification,      userController.updateProfile);
router.post("/file-upload",    authVerification,      fileUploads.single("file"), userController.uploadFile);
// Public profile - safe, no confidential data
router.get("/user-profile/:userId",                   userController.publicProfile);
// Tenant search - used by landlord invoice form (authenticated)
router.get("/search-tenants",      authVerification,  userController.searchTenants);

// ─────────────────────────────────────────────
//  PROPERTY (Landlord)
// ─────────────────────────────────────────────
router.post("/create-property",          authVerification,  fileUploads.array("images", 5), propertyController.createProperty);
router.get("/all-properties",                                                                propertyController.allProperties);
router.get("/single-property/:id",                                                           propertyController.singleProperty);
router.post("/update-property/:id",      authVerification, fileUploads.array("images", 5),          propertyController.updateProperty);
router.delete("/delete-property/:id",    authVerification,                                   propertyController.deleteProperty);
router.post("/change-availability/:id",  authVerification,                                   propertyController.changeAvailability);
// landlord's own listings
router.get("/my-properties",             authVerification,    propertyController.myProperties);

// ─────────────────────────────────────────────
//  MESSAGING
// ─────────────────────────────────────────────
router.post("/send-message",              authVerification, messageController.sendMessage);
router.post("/broadcast-message",         authVerification, adminVerification, messageController.broadcastMessage);
router.get("/conversation/:propertyId/:otherUserId",  authVerification, messageController.getConversation);
router.get("/item-conversation/:itemId/:otherUserId", authVerification, messageController.getItemConversation);
router.get("/inbox",                      authVerification, messageController.inbox);
router.get("/my-tenants",                 authVerification, messageController.myTenants);

// ─────────────────────────────────────────────
//  RENT PAYMENT (Simulation)
// ─────────────────────────────────────────────
router.post("/generate-invoice",             authVerification, paymentController.generateInvoice);
router.post("/pay/:invoiceId",               authVerification, paymentController.markAsPaid);
router.post("/extend-invoice/:invoiceId",    authVerification, paymentController.extendInvoice);
router.get("/payment-history",               authVerification, paymentController.paymentHistory);
router.get("/single-invoice/:invoiceId",     authVerification, paymentController.singleInvoice);

// ─────────────────────────────────────────────
//  RENTAL REQUESTS (Tenant → Landlord)
// ─────────────────────────────────────────────
// Tenant sends a request to rent a property
router.post("/rental-request",                          authVerification, rentalRequestController.sendRequest);
// Landlord views incoming requests
router.get("/incoming-rental-requests",                 authVerification, rentalRequestController.incomingRequests);
// Landlord accepts or rejects a request
router.post("/respond-rental-request/:requestId",       authVerification, rentalRequestController.respondRequest);
// Check status for a specific property (tenant or landlord)
router.get("/rental-request-status/:propertyId",        authVerification, rentalRequestController.checkRequestStatus);

// ─────────────────────────────────────────────
//  MARKETPLACE
// ─────────────────────────────────────────────
router.post("/create-item",           authVerification, fileUploads.array("images", 5), marketplaceController.createItem);
router.get("/all-items",                                                                  marketplaceController.allItems);
router.get("/single-item/:id",                                                            marketplaceController.singleItem);
router.post("/update-item/:id",       authVerification,                                   marketplaceController.updateItem);
router.delete("/delete-item/:id",     authVerification,                                   marketplaceController.deleteItem);
// my own listings
router.get("/my-items",               authVerification,                                   marketplaceController.myItems);
// buyer marks item as sold after payment
router.post("/mark-sold/:id",         authVerification,                                   marketplaceController.markAsSold);

// ─────────────────────────────────────────────
//  REVIEW & RATING
// ─────────────────────────────────────────────
router.post("/create-review",          authVerification, reviewController.createReview);
router.get("/reviews/:userId",                           reviewController.userReviews);

// ─────────────────────────────────────────────
//  REPORTING
// ─────────────────────────────────────────────
router.post("/create-report",          authVerification, reportController.createReport);

// ─────────────────────────────────────────────
//  ADMIN PANEL
// ─────────────────────────────────────────────
router.get("/admin/all-users",         authVerification, adminVerification, adminController.allUsers);
router.post("/admin/block-user/:id",   authVerification, adminVerification, adminController.blockUser);
router.delete("/admin/remove-listing/:id", authVerification, adminVerification, adminController.removeListing);
router.delete("/admin/remove-item/:id",    authVerification, adminVerification, adminController.removeItem);
router.get("/admin/all-reports",       authVerification, adminVerification, adminController.allReports);
router.post("/admin/update-report/:id",authVerification, adminVerification, adminController.updateReport);
router.get("/admin/all-transactions",  authVerification, adminVerification, adminController.allTransactions);
router.get("/admin/marketplace-items", authVerification, adminVerification, adminController.allMarketplaceItems);
router.get("/admin/marketplace-users", authVerification, adminVerification, adminController.allMarketplaceUsers);

module.exports = router;
