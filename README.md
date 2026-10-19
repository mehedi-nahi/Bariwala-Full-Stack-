# 🏠 Bariwala — Property Rental & Marketplace Platform

> **Bariwala** (বাড়িওয়ালা — Bengali for "house owner / landlord") is a full-stack MERN web application that digitises the entire rental lifecycle in Bangladesh: property discovery, rental requests, invoice generation, simulated rent payment, inbox messaging, reviews, marketplace, and admin moderation.

---

## 📋 Table of Contents

1. [Tech Stack](#tech-stack)
2. [Feature Overview](#feature-overview)
3. [User Roles](#user-roles)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Rental Workflow State Machine](#rental-workflow-state-machine)
8. [Local Setup](#local-setup)
9. [Vercel Deployment](#vercel-deployment)
10. [Environment Variables](#environment-variables)

---

## Tech Stack

| Layer       | Technology                                                  |
|-------------|-------------------------------------------------------------|
| Runtime     | Node.js (Express 5)                                         |
| Database    | MongoDB 7 via Mongoose 9                                    |
| Auth        | JWT (jsonwebtoken) + HTTP-only cookies                      |
| Security    | Helmet, express-rate-limit, express-mongo-sanitize, HPP     |
| File Upload | Multer + Cloudinary (multer-storage-cloudinary)             |
| Password    | bcryptjs (cost factor 10)                                   |
| Frontend    | React 19 + Vite 6                                           |
| HTTP Client | Axios (via shared `axiosInstance.js`)                       |
| Animation   | [Motion](https://motion.dev) (`motion/react`), respects “reduce motion” |
| Routing     | React Router DOM v7                                         |
| Hosting     | Vercel (single repo, full-stack)                            |
| Dev tools   | Nodemon, ESLint, Concurrently                               |

---

## Feature Overview

### 🏘️ Property Rental
- Public search by **area or address**, type, rent range and **facilities**; sorting happens on the server so it is correct across pages; filters live in the URL (shareable, survive reload / back button)
- Landlord tools: add / edit / delete listings, mark **Available ↔ Rented**, up to 5 photos with drag-and-drop, preview and validation
- Tenant sends a **rental request** (optional message) and can **cancel** it while pending; a new **My requests** page tracks every application
- Landlord **accepts / declines** requests inline on *My properties* (pending ones are expanded by default)
- Landlord creates **monthly invoices** only for accepted tenants (property → tenant → month), can **extend** a due date once (3–7 days) and sees *Pending / Overdue / Paid* tabs
- Tenant pays through a **simulated gateway** (bKash, Nagad, Rocket, card, bank transfer) with inline validation, a demo-mode banner and a printable receipt
- Invoices flip to **Overdue** automatically once the due date passes

### 💬 Messaging (Inbox)
- Tenant ↔ landlord (per property), buyer ↔ seller (per item) and admin announcements ("direct" threads you can reply to)
- Unread badge in the top bar (refreshes automatically), conversation search, day separators, Enter-to-send, mobile list → chat navigation
- Opening a conversation only marks *that* person's messages as read

### 🛒 Marketplace
- Categories, condition, price range, free-text search and sorting (all server-side)
- **Cart available on every page** (top-bar cart icon with live count, "Buy now", persisted per account)
- Safe **checkout**: the server claims each item atomically, so two buyers can never buy the same listing; unavailable items are reported back
- **My orders** page for buyers, delivery details (name, phone, address) for sellers on sold items, "mark as sold" for offline sales
- Role-aware prompts instead of silent failures when a guest / non-marketplace account tries to buy or message

### ⭐ Reviews & Ratings
- Tenants review the landlord, landlords review a tenant – chosen **by name** from a list (no more pasting IDs)
- Reviews require an accepted rental request between the two people, one review per pair per property

### 🚩 Reporting
- One consistent report dialog (quick-reason chips + required description) for listings, items and users
- Duplicate open reports are blocked; admins see *what* was reported (name + link), not just an ID

### 🔧 Admin Panel
- Dashboard with platform totals (users by role, blocked, pending reports, rent collected, overdue)
- Users: search, role / status filters, block / unblock with confirmation (blocked users lose access immediately)
- Reports: filter by status, resolve, remove content or block the user in one click
- Transactions: status filter and revenue summary; announcement broadcast to everyone or one role

### ✨ Experience
- One design system (tokens, components, dark nav, accessible focus states), fully responsive from 320 px phones to desktops
- Toast notifications for every action, on-brand confirmation dialogs (no `window.confirm`), skeleton loaders, empty / error states with retry
- Inline form validation, password-strength meter, show / hide password, change-password in the dashboard
- Keyboard accessible: skip link, focus-trapped dialogs, labelled controls, screen-reader live regions
- Pages are code-split and loaded on demand; session expiry is detected and explained
- Motion-powered animations: page transitions, staggered card reveals, spring buttons, count-up statistics, a 3D-tilt hero card with floating badges, a sliding active-tab pill in the navbar, animated dropdowns / mobile menu / cart drawer / toasts, and a reading-progress bar on articles
- Frosted-glass surfaces (navbar, dropdowns, dialogs, cart drawer, auth cards) with a solid fallback where `backdrop-filter` is unsupported
- Password fields with a show / hide toggle that keeps focus and caret position
- Content pages: **About us** (`/about`), **Blog** (`/blog`, `/blog/:slug`) with an About teaser and a swipeable, auto-playing blog carousel on the landing page
- Custom animated dropdowns (`components/Select.jsx`) replace native selects: check marks, keyboard support (↑ ↓ Home End Enter Esc, type-ahead), open upwards near the screen edge
- Buttons with click ripples, hover sweep and nudging arrows; cursor-following card spotlight; scroll-linked sections that grow into view
- Photo galleries with animated slides, swipe on touch screens and arrow-key navigation
- Notifications with a countdown bar (hover to pause); back-to-top button; press `/` to jump to search
- Dashboard: time-of-day greeting and a per-role “Getting started” checklist built from the user's real data

---

## User Roles

| Role          | Can Do                                                                                               |
|---------------|------------------------------------------------------------------------------------------------------|
| `tenant`      | Search homes, send / cancel rental requests, pay invoices & print receipts, message landlords, review landlords |
| `landlord`    | List / manage properties, accept or decline requests, create & extend invoices, message tenants, review tenants |
| `marketplace` | Sell items, buy through the cart & checkout, track orders, message buyers / sellers                  |
| `admin`       | Dashboard, user management, report moderation, all transactions, announcements                       |

> **Note:** Admin accounts cannot be self-registered. `npm run seed` creates `admin@demo.com`; in production insert an admin user directly in the database.

---

## Project Structure

```
Bariwala/
├── index.js                  # Entry point — starts Express server
├── app.js                    # Express app config, middleware stack, global error handler
├── package.json              # Backend dependencies & scripts
├── vercel.json               # Vercel deployment config
├── .env.example              # Environment variable template
│
├── src/
│   ├── config/
│   │   └── db.js             # Mongoose connect with auto-reconnect
│   ├── routes/
│   │   └── api.js            # All routes (~45 endpoints) mounted at /api/v1
│   ├── controllers/          # Business logic (one file per domain)
│   │   ├── userController.js
│   │   ├── propertyController.js
│   │   ├── rentalRequestController.js
│   │   ├── paymentController.js
│   │   ├── messageController.js
│   │   ├── reviewController.js
│   │   ├── reportController.js
│   │   ├── marketplaceController.js
│   │   └── adminController.js
│   ├── models/               # Mongoose schemas
│   │   ├── userModel.js
│   │   ├── propertyModel.js
│   │   ├── rentalRequestModel.js
│   │   ├── paymentModel.js
│   │   ├── messageModel.js
│   │   ├── reviewModel.js
│   │   ├── reportModel.js
│   │   └── marketplaceModel.js
│   ├── middlewares/
│   │   ├── authVerification.js   # JWT decode + live account check (blocked users are locked out at once)
│   │   ├── optionalAuth.js       # identifies the user on public routes without rejecting guests
│   │   ├── adminVerification.js  # role === "admin" guard
│   │   └── fileUploads.js        # Multer + Cloudinary storage, 8 MB limit, image-only
│   └── utility/
│       ├── tokenUtility.js       # EncodeToken / DecodeToken helpers
│       ├── errorUtility.js       # sendError(): clean 4xx/5xx responses, never leaks internals
│       └── validators.js         # isId, escapeRegex, clampInt, email / phone patterns
│
├── uploads/                  # (empty — images are stored on Cloudinary CDN)
├── demo_data/
│   └── seed.js               # Database seeder (run: npm run seed)
├── tests/
│   └── api.test.js           # API integration tests (npm test)
│
└── client/                   # React 19 + Vite frontend
    ├── vite.config.js        # Vite proxy: /api → localhost:8000
    └── src/
        ├── index.css         # Design system: tokens, buttons, forms, cards, modals, layout, responsive rules
        ├── App.jsx           # Providers, lazy-loaded routes, session restore / expiry handling
        ├── api/              # Axios API layer (one file per domain) + 401 handling
        ├── context/          # Toast, confirm-dialog and cart contexts
        ├── hooks/            # useAsync (loading / error state), useDebounce, useDocumentTitle
        ├── utils/            # format (money, dates), validate, errors, constants
        ├── components/       # Navbar, Footer, Modal, ui.jsx (Button, Field, Alert, EmptyState, …),
        │                     # ImagePicker, DemoPayment, CartProvider / CheckoutModal, ReportModal,
        │                     # MessageComposer, ReceiptModal, PrivateRoute, ErrorBoundary
        └── pages/
            ├── auth/         # Login, Register
            ├── shared/       # Profile (role-based dashboard + security), Help, NotFound
            ├── tenant/       # SearchProperties, PropertyDetail, MyRequests, PaymentHistory, Inbox
            ├── landlord/     # MyProperties, PropertyForm, AddProperty, EditProperty, LandlordInvoices
            ├── marketplace/  # AllItems, ItemDetail, AddItem, MyItems, MyOrders
            └── admin/        # AdminUsers, AdminReports, AdminTransactions
```

---

## Database Schema

### `users` Collection

| Field        | Type    | Required | Default    | Notes                                      |
|--------------|---------|----------|------------|--------------------------------------------|
| `_id`        | ObjectId| auto     | —          | Primary key                                |
| `name`       | String  | ✅       | —          | Trimmed                                    |
| `email`      | String  | ✅       | —          | Unique, lowercase, trimmed                 |
| `phone`      | String  | ❌       | —          | Exactly 11 digits if provided              |
| `password`   | String  | ✅       | —          | bcrypt hashed in pre-save hook             |
| `role`       | String  | ❌       | `"tenant"` | Enum: landlord / tenant / marketplace / admin |
| `profileImg` | String  | ❌       | `""`       | Cloudinary URL                             |
| `bio`        | String  | ❌       | `""`       | Max 200 characters                         |
| `isBlocked`  | Boolean | ❌       | `false`    | Admin can block/unblock                    |
| `createdAt`  | Date    | auto     | —          | Timestamps enabled                         |

---

### `properties` Collection

| Field                  | Type       | Required | Default       | Notes                          |
|------------------------|------------|----------|---------------|--------------------------------|
| `_id`                  | ObjectId   | auto     | —             |                                |
| `landlord`             | ObjectId   | ✅       | —             | Ref: `users`                   |
| `propertyType`         | String     | ✅       | —             | Enum: Flat / Room / Sublet     |
| `monthlyRent`          | Number     | ✅       | —             | BDT amount                     |
| `advanceDeposit`       | Number     | ❌       | `0`           |                                |
| `address`              | String     | ✅       | —             |                                |
| `area`                 | String     | ✅       | —             | Neighbourhood name             |
| `location.lat`         | Number     | ❌       | `0`           |                                |
| `location.lng`         | Number     | ❌       | `0`           |                                |
| `location.mapLink`     | String     | ❌       | `""`          |                                |
| `distanceFromMainRoad` | String     | ❌       | `""`          |                                |
| `facilities`           | [String]   | ❌       | `[]`          | e.g. ["Gas","WiFi","Lift"]     |
| `images`               | [String]   | ❌       | `[]`          | Cloudinary URLs                |
| `availability`         | String     | ❌       | `"Available"` | Enum: Available / Rented       |
| `isRemoved`            | Boolean    | ❌       | `false`       | Soft delete flag               |

---

### `rentalrequests` Collection

| Field      | Type     | Required | Default     | Notes                                         |
|------------|----------|----------|-------------|-----------------------------------------------|
| `_id`      | ObjectId | auto     | —           |                                               |
| `tenant`   | ObjectId | ✅       | —           | Ref: `users`                                  |
| `landlord` | ObjectId | ✅       | —           | Ref: `users`                                  |
| `property` | ObjectId | ✅       | —           | Ref: `properties`                             |
| `message`  | String   | ❌       | `""`        | Tenant's note to landlord                     |
| `status`   | String   | ❌       | `"Pending"` | Enum: Pending / Accepted / Rejected           |

**Indexes:** Unique compound index on `{ tenant, property }` — one active request per tenant per property.

---

### `payments` Collection (Invoices)

| Field            | Type     | Required | Default   | Notes                                            |
|------------------|----------|----------|-----------|--------------------------------------------------|
| `_id`            | ObjectId | auto     | —         |                                                  |
| `tenant`         | ObjectId | ✅       | —         | Ref: `users`                                     |
| `landlord`       | ObjectId | ✅       | —         | Ref: `users`                                     |
| `property`       | ObjectId | ✅       | —         | Ref: `properties`                                |
| `amount`         | Number   | ✅       | —         | BDT                                              |
| `invoiceNo`      | String   | ❌       | —         | Unique, e.g. `INV-2026-LX3A1-K7F`               |
| `forMonth`       | String   | ✅       | —         | e.g. `"March 2026"`                              |
| `note`           | String   | ❌       | `""`      | Landlord's note                                  |
| `status`         | String   | ❌       | `Pending` | Enum: Pending / Paid / Overdue                   |
| `dueDate`        | Date     | ❌       | `null`    | Landlord-set due date                            |
| `expiresAt`      | Date     | ❌       | `null`    | Auto-expire time (7 days from creation)          |
| `extendedDays`   | Number   | ❌       | `0`       | Days extended by landlord (one-time, 3–7 days)   |
| `paidAt`         | Date     | ❌       | `null`    | Set on payment                                   |
| `transactionRef` | String   | ❌       | `null`    | e.g. `BK-20260305-ABCD1`                         |
| `paymentMethod`  | String   | ❌       | `null`    | Enum: bKash / Nagad / Rocket / Card / Bank Transfer |

---

### `messages` Collection

| Field      | Type     | Required | Default | Notes                                  |
|------------|----------|----------|---------|----------------------------------------|
| `_id`      | ObjectId | auto     | —       |                                        |
| `property` | ObjectId | ❌       | `null`  | Ref: `properties` (rental thread)      |
| `item`     | ObjectId | ❌       | `null`  | Ref: `marketplaces` (marketplace thread)|
| `sender`   | ObjectId | ✅       | —       | Ref: `users`                           |
| `receiver` | ObjectId | ✅       | —       | Ref: `users`                           |
| `message`  | String   | ✅       | —       | Trimmed                                |
| `isRead`   | Boolean  | ❌       | `false` | Marked true when receiver opens thread |

> Either `property` or `item` must be set to identify the conversation context.

---

### `reviews` Collection

| Field        | Type     | Required | Notes                                          |
|--------------|----------|----------|------------------------------------------------|
| `_id`        | ObjectId | auto     |                                                |
| `reviewer`   | ObjectId | ✅       | Ref: `users` — who writes the review           |
| `reviewee`   | ObjectId | ✅       | Ref: `users` — who is being reviewed           |
| `property`   | ObjectId | ✅       | Ref: `properties`                              |
| `reviewType` | String   | ✅       | Enum: tenant-to-landlord / landlord-to-tenant  |
| `rating`     | Number   | ✅       | 1–5                                            |
| `comment`    | String   | ❌       | Optional                                       |

---

### `reports` Collection

| Field            | Type     | Required | Default     | Notes                                          |
|------------------|----------|----------|-------------|------------------------------------------------|
| `_id`            | ObjectId | auto     | —           |                                                |
| `reportedBy`     | ObjectId | ✅       | —           | Ref: `users`                                   |
| `reportType`     | String   | ✅       | —           | Enum: property / marketplace / user            |
| `reportedEntity` | ObjectId | ✅       | —           | ID of the property, item, or user being reported|
| `reason`         | String   | ✅       | —           |                                                |
| `status`         | String   | ❌       | `"Pending"` | Enum: Pending / Reviewed / Resolved            |

---

### `marketplaces` Collection

| Field         | Type     | Required | Default | Notes                       |
|---------------|----------|----------|---------|-----------------------------|
| `_id`         | ObjectId | auto     | —       |                             |
| `seller`      | ObjectId | ✅       | —       | Ref: `users`                |
| `title`       | String   | ✅       | —       |                             |
| `description` | String   | ❌       | `""`    |                             |
| `price`       | Number   | ✅       | —       | BDT                         |
| `condition`   | String   | ✅       | —       | Enum: New / Used            |
| `category`    | String   | ❌       | `Other` | Furniture, Electronics, Appliances, Books, Clothing, Sports, Other |
| `images`      | [String] | ❌       | `[]`    | Cloudinary URLs             |
| `isRemoved`   | Boolean  | ❌       | `false` | Soft delete flag            |
| `isSold`      | Boolean  | ❌       | `false` | Set at checkout (or by the seller) |
| `soldAt`      | Date     | ❌       | `null`  |                             |
| `buyer`       | ObjectId | ❌       | `null`  | Ref: `users` – who bought it |
| `buyerInfo`   | Object   | ❌       | —       | name, phone, addressLine, area, city, txnRef – shown to the seller for delivery |

---

### Entity Relationship Summary

```
users  ──1:N──▶  properties        (landlord → listings)
users  ──1:N──▶  rentalrequests    (as tenant)
users  ──1:N──▶  rentalrequests    (as landlord)
users  ──1:N──▶  payments          (as tenant)
users  ──1:N──▶  payments          (as landlord)
users  ──1:N──▶  messages          (as sender or receiver)
users  ──1:N──▶  reviews           (as reviewer or reviewee)
users  ──1:N──▶  reports           (as reportedBy)
users  ──1:N──▶  marketplaces      (as seller)
properties   ──1:N──▶  rentalrequests
properties   ──1:N──▶  payments
properties   ──1:N──▶  messages
properties   ──1:N──▶  reviews
marketplaces ──1:N──▶  messages
```

---

## API Reference

All routes are prefixed with `/api/v1`. 🔒 = requires auth cookie/token. 🛡️ = requires admin role.

### Auth / User

| Method | Path                       | Auth | Description                              |
|--------|----------------------------|------|------------------------------------------|
| POST   | `/register`                | —    | Register new user (landlord/tenant/marketplace) |
| POST   | `/login`                   | —    | Login → sets JWT cookie                  |
| GET    | `/logout`                  | 🔒   | Clear JWT cookie                         |
| GET    | `/profile`                 | 🔒   | Get own profile (no password)            |
| GET    | `/session`                 | —    | Current user or `null` (used on app start; never 401) |
| POST   | `/update-profile`          | 🔒   | Update name, phone, bio                  |
| POST   | `/change-password`         | 🔒   | Change password (needs the current one)  |
| POST   | `/file-upload`             | 🔒   | Upload single image → Cloudinary         |
| GET    | `/user-profile/:userId`    | —    | Public profile (safe fields only)        |
| GET    | `/search-tenants?q=`       | 🔒   | Search tenants by name/email             |

### Property

| Method | Path                          | Auth | Description                       |
|--------|-------------------------------|------|-----------------------------------|
| POST   | `/create-property`            | 🔒   | Landlord creates property listing |
| GET    | `/all-properties`             | —    | Public search: `q`, `propertyType`, `minRent`, `maxRent`, `facilities` (comma list), `sort` (`newest` / `price-asc` / `price-desc`), `pageNo`, `perPage` |
| GET    | `/single-property/:id`        | —    | Property detail with reviews      |
| POST   | `/update-property/:id`        | 🔒   | Update property (owner only)      |
| DELETE | `/delete-property/:id`        | 🔒   | Soft delete (owner only)          |
| POST   | `/change-availability/:id`    | 🔒   | Toggle Available/Rented (owner only) |
| GET    | `/my-properties`              | 🔒   | Landlord's own listings           |

### Rental Requests

| Method | Path                                    | Auth | Description                           |
|--------|-----------------------------------------|------|---------------------------------------|
| POST   | `/rental-request`                       | 🔒   | Tenant sends request to landlord      |
| POST   | `/cancel-rental-request/:requestId`     | 🔒   | Tenant withdraws a pending request    |
| GET    | `/my-rental-requests`                   | 🔒   | Tenant views their requests           |
| GET    | `/incoming-rental-requests`             | 🔒   | Landlord views incoming requests      |
| POST   | `/respond-rental-request/:requestId`    | 🔒   | Landlord accepts/rejects request      |
| GET    | `/rental-request-status/:propertyId`    | 🔒   | Check tenant's request status         |

### Payments / Invoices

| Method | Path                           | Auth | Description                              |
|--------|--------------------------------|------|------------------------------------------|
| POST   | `/generate-invoice`            | 🔒   | Landlord generates invoice for tenant    |
| POST   | `/pay/:invoiceId`              | 🔒   | Tenant marks invoice as paid             |
| POST   | `/extend-invoice/:invoiceId`   | 🔒   | Landlord extends due date by 3–7 days    |
| GET    | `/payment-history`             | 🔒   | Payment history (tenant or landlord view)|
| GET    | `/single-invoice/:invoiceId`   | 🔒   | Single invoice detail                    |

### Messaging

| Method | Path                                         | Auth | Description                       |
|--------|----------------------------------------------|------|-----------------------------------|
| POST   | `/send-message`                              | 🔒   | Send a message (property or item context) |
| POST   | `/broadcast-message`                         | 🔒🛡️ | Admin broadcasts to all/role users |
| GET    | `/conversation/:propertyId/:otherUserId`     | 🔒   | Fetch property thread messages    |
| GET    | `/item-conversation/:itemId/:otherUserId`    | 🔒   | Fetch marketplace item thread     |
| GET    | `/direct-conversation/:otherUserId`          | 🔒   | Messages that belong to no listing (announcements) |
| GET    | `/unread-count`                              | 🔒   | Number of unread messages (top-bar badge) |
| GET    | `/inbox`                                     | 🔒   | All inbox threads with unread count |
| GET    | `/my-tenants`                                | 🔒   | Landlord's messaged tenants list  |

### Marketplace

| Method | Path                  | Auth | Description                         |
|--------|-----------------------|------|-------------------------------------|
| POST   | `/create-item`        | 🔒   | Marketplace user posts item         |
| GET    | `/all-items`          | —    | Public listing: `q`, `category`, `condition`, `minPrice`, `maxPrice`, `sort`, paging |
| GET    | `/single-item/:id`    | —    | Item detail with seller info        |
| POST   | `/update-item/:id`    | 🔒   | Update item (owner only)            |
| DELETE | `/delete-item/:id`    | 🔒   | Soft delete item (owner only)       |
| GET    | `/my-items`           | 🔒   | Seller's own listings               |
| GET    | `/my-orders`          | 🔒   | Items the user has bought           |
| POST   | `/mark-sold/:id`      | 🔒   | Seller marks **their own** item as sold |
| POST   | `/checkout`           | 🔒   | Buy cart items atomically (`itemIds`, `buyer`, `txnRef`) |

### Reviews

| Method | Path               | Auth | Description                          |
|--------|--------------------|------|--------------------------------------|
| POST   | `/create-review`   | 🔒   | Submit a review (tenant↔landlord)    |
| GET    | `/reviews/:userId` | —    | All reviews + avg rating for a user  |

### Reports

| Method | Path              | Auth | Description                     |
|--------|-------------------|------|---------------------------------|
| POST   | `/create-report`  | 🔒   | Submit a report                 |
| GET    | `/my-reports`     | 🔒   | View own submitted reports      |

### Admin

| Method | Path                            | Auth       | Description                         |
|--------|---------------------------------|------------|-------------------------------------|
| GET    | `/admin/overview`               | 🔒🛡️      | Platform totals for the dashboard   |
| GET    | `/admin/all-users`              | 🔒🛡️      | Paginated users: `q`, `role`, `status` filters |
| POST   | `/admin/block-user/:id`         | 🔒🛡️      | Toggle block/unblock user           |
| DELETE | `/admin/remove-listing/:id`     | 🔒🛡️      | Soft delete a property              |
| DELETE | `/admin/remove-item/:id`        | 🔒🛡️      | Soft delete a marketplace item      |
| GET    | `/admin/all-reports`            | 🔒🛡️      | Paginated reports (filterable)      |
| POST   | `/admin/update-report/:id`      | 🔒🛡️      | Update report status                |
| GET    | `/admin/all-transactions`       | 🔒🛡️      | Paginated payment transactions      |
| GET    | `/admin/marketplace-items`      | 🔒🛡️      | All marketplace items (admin view)  |
| GET    | `/admin/marketplace-users`      | 🔒🛡️      | All marketplace users (admin view)  |

---

## Rental Workflow State Machine

```
[Property Listed]
       │
       ▼
[Tenant sends Rental Request]  ──────────────────▶  status: "Pending"
       │
       ▼
[Landlord responds]
       ├──▶  action: "reject"  ──▶  status: "Rejected"  (Tenant may re-request)
       │
       └──▶  action: "accept"  ──▶  status: "Accepted"
                    │
                    ▼
         [Landlord generates Invoice]
                    │
                    ▼
              status: "Pending"  (expiresAt = dueDate)
                    │
              ┌─────┴──────────────────────┐
              │                            │
              ▼                            ▼
    [Tenant pays invoice]         [expiresAt passes, no payment]
              │                            │
              ▼                            ▼
         status: "Paid"             status: "Overdue"
                                          │
                                 [Tenant can still pay]
                                          │
                                          ▼
                                     status: "Paid"
```

---

## Local Setup

### Prerequisites
- Node.js ≥ 18
- MongoDB ≥ 6 running locally or MongoDB Atlas URI

### 1. Clone & Install

```bash
git clone <your-repo-url> Bariwala
cd Bariwala
npm install
cd client && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Seed Demo Data

```bash
npm run seed              # only runs on an empty database
npm run seed -- --reset   # wipe and re-seed
```

Demo logins (password `Passw0rd!`): `admin@demo.com`, `landlord@demo.com`, `tenant@demo.com`, `tenant2@demo.com`, `seller@demo.com`, `buyer@demo.com`.

### Tests & lint

```bash
npm install --no-save mongodb-memory-server   # one-off: throw-away MongoDB used by the tests
npm test                                      # ~185 API checks (auth, rentals, payments, marketplace, admin, security)
cd client && npm run lint && npm run build
```

### 4. Run in Development

```bash
npm run dev
# Backend:  http://localhost:8000
# Frontend: http://localhost:5173  (proxies /api to the backend)
```

### 5. Run in Production

```bash
cd client && npm run build && cd ..
npm start
```

---

## Vercel Deployment

This project is hosted as a **single repository** on Vercel.

### Vercel Dashboard Settings

| Setting          | Value                        |
|------------------|------------------------------|
| Framework Preset | Other                        |
| Root Directory   | `.` (repo root)              |
| Build Command    | `npm run build`              |
| Output Directory | `client/dist`                |

### Required Environment Variables (set in Vercel Dashboard)

```
PORT
NODE_ENV=production
DB_URL
JWT_SECRET
JWT_EXPIRE
COOKIE_EXPIRE
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

---

## Environment Variables

| Variable                  | Required | Example                              | Description                         |
|---------------------------|----------|--------------------------------------|-------------------------------------|
| `PORT`                    | ❌       | `8000`                               | Express server port                 |
| `NODE_ENV`                | ❌       | `production`                         | Enables secure cookies in production|
| `DB_URL`                  | ✅       | `mongodb+srv://...`                  | MongoDB connection string           |
| `JWT_SECRET`              | ✅       | `change_this_to_random_string`       | Secret key for JWT signing          |
| `JWT_EXPIRE`              | ✅       | `7d`                                 | JWT expiry (e.g. `1d`, `7d`)        |
| `COOKIE_EXPIRE`           | ✅       | `7`                                  | Cookie max-age in **days**          |
| `CLOUDINARY_CLOUD_NAME`   | ✅       | `your_cloud_name`                    | Cloudinary account cloud name       |
| `CLOUDINARY_API_KEY`      | ✅       | `123456789012345`                    | Cloudinary API key                  |
| `CLOUDINARY_API_SECRET`   | ✅       | `abc123...`                          | Cloudinary API secret               |
| `CLIENT_ORIGIN`           | ❌       | `https://app.example.com`            | Only if the React app is hosted on a **different domain** (enables CORS + cross-site cookies). Leave empty for the normal single-domain deployment |

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `node index.js` | Start production server |
| `npm run dev` | Nodemon + Vite concurrently | Development with hot reload |
| `npm run server` | `nodemon index.js` | Backend only |
| `npm run client` | `cd client && npm run dev` | Frontend only |
| `npm run seed` | `node demo_data/seed.js` | Populate demo data (`-- --reset` to wipe first) |
| `npm test` | `node tests/api.test.js` | API integration tests (needs `mongodb-memory-server` or `TEST_DB_URL`) |
| `npm run build` | `cd client && npm install && npm run build` | Build frontend for production |


