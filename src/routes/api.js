const express = require("express");
let router = express.Router();

const authVerification  = require("../middlewares/authVerification");
const adminVerification = require("../middlewares/adminVerification");
const fileUploads       = require("../middlewares/fileUploads");

const userController        = require("../controllers/userController");
const propertyController    = require("../controllers/propertyController");
const messageController     = require("../controllers/messageController");
const paymentController     = require("../controllers/paymentController");
const marketplaceController = require("../controllers/marketplaceController");
const reviewController      = require("../controllers/reviewController");
const reportController      = require("../controllers/reportController");
const adminController       = require("../controllers/adminController");

// ─────────────────────────────────────────────
//  AUTH / USER
// ─────────────────────────────────────────────
router.post("/register",                              userController.register);
router.post("/login",                                 userController.login);
router.get("/logout",          authVerification,      userController.logout);
router.get("/profile",         authVerification,      userController.profile);
router.post("/update-profile", authVerification,      userController.updateProfile);
router.post("/file-upload",    authVerification,      fileUploads.single("file"), userController.uploadFile);

// ─────────────────────────────────────────────
//  PROPERTY (Landlord)
// ─────────────────────────────────────────────
router.post("/create-property",          authVerification,  fileUploads.array("images", 5), propertyController.createProperty);
router.get("/all-properties",                                                                propertyController.allProperties);
router.get("/single-property/:id",                                                           propertyController.singleProperty);
router.post("/update-property/:id",      authVerification,                                   propertyController.updateProperty);
router.delete("/delete-property/:id",    authVerification,                                   propertyController.deleteProperty);
router.post("/change-availability/:id",  authVerification,                                   propertyController.changeAvailability);
// landlord's own listings
router.get("/my-properties",             authVerification,                                   propertyController.myProperties);

// ─────────────────────────────────────────────
//  MESSAGING
// ─────────────────────────────────────────────
router.post("/send-message",              authVerification, messageController.sendMessage);
// get full conversation for a property between logged-in user & the other party
router.get("/conversation/:propertyId/:otherUserId", authVerification, messageController.getConversation);
// all inbox threads for logged-in user
router.get("/inbox",                      authVerification, messageController.inbox);

// ─────────────────────────────────────────────
//  RENT PAYMENT (Simulation)
// ─────────────────────────────────────────────
router.post("/generate-invoice",        authVerification, paymentController.generateInvoice);
router.post("/pay/:invoiceId",          authVerification, paymentController.markAsPaid);
router.get("/payment-history",          authVerification, paymentController.paymentHistory);
router.get("/single-invoice/:invoiceId", authVerification, paymentController.singleInvoice);

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

// ─────────────────────────────────────────────
//  REVIEW & RATING
// ─────────────────────────────────────────────
router.post("/create-review",          authVerification, reviewController.createReview);
router.get("/reviews/:userId",                           reviewController.userReviews);
router.delete("/delete-review/:id",    authVerification, reviewController.deleteReview);

// ─────────────────────────────────────────────
//  REPORTING
// ─────────────────────────────────────────────
router.post("/create-report",          authVerification, reportController.createReport);
router.get("/my-reports",              authVerification, reportController.myReports);

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

module.exports = router;

