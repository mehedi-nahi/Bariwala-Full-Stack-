# 🏠 Bariwala — Property Rental & Marketplace Platform

> **Bariwala** (বাড়িওয়ালা — Bengali for "house owner / landlord") is a full-stack MERN-style web application that digitises the entire rental lifecycle in Bangladesh: property discovery, rental requests, invoice generation, simulated rent payment, inbox messaging, reviews, marketplace, and admin moderation.

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
9. [Environment Variables](#environment-variables)
10. [Known Issues & TODOs](#known-issues--todos)
11. [Interview Q&A — Key Concepts](#interview-qa--key-concepts)

---

## Tech Stack

| Layer       | Technology                                                  |
|-------------|-------------------------------------------------------------|
| Runtime     | Node.js (Express 5)                                         |
| Database    | MongoDB 7 via Mongoose 9                                    |
| Auth        | JWT (jsonwebtoken) + HTTP-only cookies                      |
| Security    | Helmet, express-rate-limit, express-mongo-sanitize, HPP     |
| File Upload | Multer (disk storage → `uploads/` folder)                   |
| Password    | bcryptjs (cost factor 10)                                   |
| Frontend    | React 19 + Vite 6                                           |
| HTTP Client | Axios (via shared `axiosInstance.js`)                       |
| Routing     | React Router DOM v7                                         |
| Dev tools   | Nodemon, ESLint                                             |

---

## Feature Overview

### 🏘️ Property Rental
- Public property search with filters (area, type, rent range, availability)
- Pagination using MongoDB `$facet` aggregation
- Tenant sends a **rental request** to landlord with optional message
- Landlord **accepts / rejects** requests from `MyProperties` panel
- Accepted tenants appear pre-filled on invoice form
- Landlord generates **monthly invoices** with due date, notes, and optional extension
- Tenant pays via simulated **payment gateway** (bKash, Nagad, Rocket, Card, Bank Transfer)
- Invoices auto-expire to **Overdue** status after `expiresAt` passes
- Full payment receipts with transaction reference numbers

### 💬 Messaging (Inbox)
- Bi-directional chat between tenant↔landlord (property context) and buyer↔seller (marketplace context)
- Inbox shows all threads with unread badge count
- Auto-marks messages as read on open
- 8-second polling for new messages (simulated real-time)
- Thread search by contact name

### 🛒 Marketplace
- Marketplace-role users can list second-hand / new items (furniture, appliances, etc.)
- Image upload (up to 5 images per listing)
- Cart sidebar with multi-item checkout
- Simulated marketplace payment gateway with shipping info form
- Buyer can message seller directly from item detail page

### ⭐ Reviews & Ratings
- Tenant → Landlord review (after viewing property detail)
- Landlord → Tenant review (from property detail, by providing tenant ID)
- Duplicate review prevention (unique: reviewer + reviewee + property + type)
- Average rating calculation displayed on landlord profile

### 🚩 Reporting
- Any user can report a property, marketplace item, or another user
- Reports queue in admin panel with Pending → Reviewed → Resolved workflow

### 🔧 Admin Panel
- View, block/unblock all users
- Paginated user, report, and transaction tables with filter controls
- Remove property listings and marketplace items from reports
- Block reported users directly from the reports panel

---

## User Roles

| Role          | Can Do                                                                                               |
|---------------|------------------------------------------------------------------------------------------------------|
| `tenant`      | Browse/search properties, send rental requests, pay invoices, message landlords, write reviews       |
| `landlord`    | List/manage properties, view rental requests, generate invoices, message tenants, write reviews      |
| `marketplace` | Post/manage items for sale, message buyers/sellers, use cart checkout                                |
| `admin`       | Full access to users, reports, transactions; block users; remove listings                            |

> **Note:** Admin accounts must be created directly in the database (not via the register endpoint).

---

## Project Structure

```
Bariwala/
├── index.js                  # Entry point — starts Express server
├── app.js                    # Express app config, middleware stack, global error handler
├── package.json              # Backend dependencies & scripts
├── .env.example              # Environment variable template
│
├── src/
│   ├── config/
│   │   └── db.js             # Mongoose connect with auto-reconnect
│   ├── routes/
│   │   └── api.js            # All routes (~40 endpoints) mounted at /api/v1
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
│   │   ├── authVerification.js   # JWT decode → sets req.headers.{email,_id,role}
│   │   ├── adminVerification.js  # role === "admin" guard
│   │   └── fileUploads.js        # Multer disk storage, 8 MB limit, image-only filter
│   └── utility/
│       └── tokenUtility.js       # EncodeToken / DecodeToken helpers
│
├── uploads/                  # Uploaded images (served at /api/v1/get-file/:filename)
├── demo_data/
│   └── seed.js               # Database seeder (run: npm run seed)
│
└── client/                   # React 19 + Vite frontend
    ├── vite.config.js        # Vite proxy: /api/v1 → localhost:3000
    ├── src/
    │   ├── App.jsx           # Root router, auth state, role-gated routes
    │   ├── main.jsx
    │   ├── api/              # Axios API layer (one file per domain)
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── Footer.jsx
    │   │   └── PrivateRoute.jsx
    │   └── pages/
    │       ├── auth/         # Login, Register
    │       ├── shared/       # Profile (role-adaptive dashboard)
    │       ├── tenant/       # SearchProperties, PropertyDetail, Inbox, PaymentHistory
    │       ├── landlord/     # MyProperties, AddProperty, EditProperty, LandlordInvoices
    │       ├── marketplace/  # AllItems, AddItem, MyItems, ItemDetail
    │       └── admin/        # AdminUsers, AdminReports, AdminTransactions
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
| `profileImg` | String  | ❌       | `""`       | Filename from uploads                      |
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
| `images`               | [String]   | ❌       | `[]`          | Filenames from uploads         |
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
| `invoiceNo`      | String   | ❌       | —         | Unique, e.g. `INV-2026-00001`                    |
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
| `images`      | [String] | ❌       | `[]`    | Filenames from uploads      |
| `isRemoved`   | Boolean  | ❌       | `false` | Soft delete flag            |

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
properties  ──1:N──▶  rentalrequests
properties  ──1:N──▶  payments
properties  ──1:N──▶  messages
properties  ──1:N──▶  reviews
marketplaces  ──1:N──▶  messages
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
| POST   | `/update-profile`          | 🔒   | Update name, phone, bio                  |
| POST   | `/file-upload`             | 🔒   | Upload single image                      |
| GET    | `/user-profile/:userId`    | —    | Public profile (safe fields only)        |
| GET    | `/search-tenants?q=`       | 🔒   | Search tenants by name/email             |

### Property

| Method | Path                          | Auth | Description                       |
|--------|-------------------------------|------|-----------------------------------|
| POST   | `/create-property`            | 🔒   | Landlord creates property listing |
| GET    | `/all-properties`             | —    | Public search with filters & pagination |
| GET    | `/single-property/:id`        | —    | Property detail with reviews      |
| POST   | `/update-property/:id`        | 🔒   | Update property (owner only)      |
| DELETE | `/delete-property/:id`        | 🔒   | Soft delete (owner only)          |
| POST   | `/change-availability/:id`    | 🔒   | Toggle Available/Rented (owner only) |
| GET    | `/my-properties`              | 🔒   | Landlord's own listings           |

### Rental Requests

| Method | Path                                    | Auth | Description                           |
|--------|-----------------------------------------|------|---------------------------------------|
| POST   | `/rental-request`                       | 🔒   | Tenant sends request to landlord      |
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
| GET    | `/conversation/:propertyId/:otherUserId`     | 🔒   | Fetch property thread messages    |
| GET    | `/item-conversation/:itemId/:otherUserId`    | 🔒   | Fetch marketplace item thread     |
| GET    | `/inbox`                                     | 🔒   | All inbox threads with unread count |
| GET    | `/my-tenants`                                | 🔒   | Landlord's messaged tenants list  |

### Marketplace

| Method | Path                  | Auth | Description                         |
|--------|-----------------------|------|-------------------------------------|
| POST   | `/create-item`        | 🔒   | Marketplace user posts item         |
| GET    | `/all-items`          | —    | Public listing with filters         |
| GET    | `/single-item/:id`    | —    | Item detail with seller info        |
| POST   | `/update-item/:id`    | 🔒   | Update item (owner only)            |
| DELETE | `/delete-item/:id`    | 🔒   | Soft delete item (owner only)       |
| GET    | `/my-items`           | 🔒   | Seller's own listings               |

### Reviews

| Method | Path                  | Auth | Description                          |
|--------|-----------------------|------|--------------------------------------|
| POST   | `/create-review`      | 🔒   | Submit a review (tenant↔landlord)    |
| GET    | `/reviews/:userId`    | —    | All reviews + avg rating for a user  |
| DELETE | `/delete-review/:id`  | 🔒   | Delete own review                    |

### Reports

| Method | Path              | Auth | Description                     |
|--------|-------------------|------|---------------------------------|
| POST   | `/create-report`  | 🔒   | Submit a report                 |
| GET    | `/my-reports`     | 🔒   | View own submitted reports      |

### Admin

| Method | Path                          | Auth       | Description                         |
|--------|-------------------------------|------------|-------------------------------------|
| GET    | `/admin/all-users`            | 🔒🛡️      | Paginated user list                 |
| POST   | `/admin/block-user/:id`       | 🔒🛡️      | Toggle block/unblock user           |
| DELETE | `/admin/remove-listing/:id`   | 🔒🛡️      | Soft delete a property              |
| DELETE | `/admin/remove-item/:id`      | 🔒🛡️      | Soft delete a marketplace item      |
| GET    | `/admin/all-reports`          | 🔒🛡️      | Paginated reports (filterable)      |
| POST   | `/admin/update-report/:id`    | 🔒🛡️      | Update report status                |
| GET    | `/admin/all-transactions`     | 🔒🛡️      | Paginated payment transactions      |

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
              status: "Pending"  (expiresAt = +7 days)
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
- MongoDB ≥ 6 running locally (or MongoDB Atlas URI)

### 1. Clone & Install

```bash
git clone <your-repo-url> Bariwala
cd Bariwala

# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Seed Demo Data (optional)

```bash
npm run seed
```

### 4. Run in Development

```bash
npm run dev
# Backend:  http://localhost:3000
# Frontend: http://localhost:5173  (proxied to backend)
```

### 5. Run in Production

```bash
cd client && npm run build && cd ..
npm start
```

---

## Environment Variables

| Variable       | Required | Example                          | Description                         |
|----------------|----------|----------------------------------|-------------------------------------|
| `PORT`         | ❌       | `3000`                           | Express server port                 |
| `NODE_ENV`     | ❌       | `development`                    | `production` enables secure cookies |
| `DB_URL`       | ✅       | `mongodb://127.0.0.1:27017/bariwala` | MongoDB connection string       |
| `JWT_SECRET`   | ✅       | `change_this_to_random_string`   | Secret key for JWT signing          |
| `JWT_EXPIRE`   | ✅       | `7d`                             | JWT expiry (e.g. `1d`, `7d`)        |
| `COOKIE_EXPIRE`| ✅       | `7`                              | Cookie max-age in **days**          |

---

## Known Issues & TODOs

### Backend
| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | `generateInvoiceNo` uses `countDocuments` which is not atomic — could create duplicate invoice numbers under heavy concurrent load. Should use an atomic counter collection or UUID. | Medium | Open |
| 2 | `nodemailer` installed but not used — remove from `package.json` or implement email notifications for invoice/request events | Low | Open |
| 3 | Review submission has no guard verifying the reviewer actually had a rental relationship with the reviewee (anyone can review anyone for any property) | Medium | Open |
| 4 | `myTenants` endpoint is based on messaging history — tenants who submitted a request without messaging won't appear. Solved partially by merging with rental requests on the frontend. | Low | Documented |
| 5 | No WebSocket / SSE — inbox polling is every 8 seconds. Upgrade to Socket.io for true real-time. | Low | Open |

### Frontend
| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Marketplace cart checkout is fully simulated — no backend order model, no persistence | Medium | Open |
| 2 | `FooterConditional` component is defined inside the `App` render function causing a new component type each render. Move it outside. | Low | Open |
| 3 | `Avatar`, `IC`/`SVGIcon` helper components are duplicated in 5+ files. Should be extracted to `client/src/components/`. | Low | Open |
| 4 | `PAYMENT_METHODS` array is duplicated in `PaymentHistory.jsx` and `AllItems.jsx`. Extract to a shared constants file. | Low | Open |
| 5 | `statusBadge` helper is duplicated in `LandlordInvoices.jsx` and `PaymentHistory.jsx`. | Low | Open |
| 6 | No 404 page — unknown routes redirect silently to `/`. | Low | Open |
| 7 | Landlord review on `PropertyDetail` requires manually entering a tenant ID — poor UX. Should load from accepted rental requests. | Medium | Open |

---

## Interview Q&A — Key Concepts

### Q: How does authentication work?

JWT is signed on login with `{ email, _id, role }` payload. It's stored as an **HTTP-only cookie** (prevents XSS access from JavaScript). The `authVerification` middleware decodes it on every protected request and attaches the decoded values to `req.headers`. A Bearer token header is also supported for Postman testing.

### Q: Why is `findByIdAndUpdate` used for block/unblock instead of `save()`?

The `userModel` has a `pre("save")` hook that re-hashes the password whenever the document is saved. Using `findByIdAndUpdate` **bypasses all pre/post hooks**, preventing the already-hashed password from being double-hashed.

### Q: What is the `$facet` aggregation stage used for?

`$facet` runs **multiple aggregation pipelines on the same input documents in a single pass**. In this project it's used to simultaneously compute `totalCount` (for pagination metadata) and the paginated `data` slice — avoiding two separate queries.

### Q: What is the soft-delete pattern used here?

Instead of deleting documents, an `isRemoved: true` flag is set. This preserves referential integrity (payments and messages still reference the property/item). All public-facing queries filter with `{ isRemoved: false }`.

### Q: How does the rental request guard work for invoice generation?

Before generating an invoice, `paymentController.generateInvoice` queries `rentalrequests` for a document matching `{ tenant, property, landlord, status: "Accepted" }`. If not found, the invoice is rejected with 403. This ensures only landlord-accepted tenants can receive invoices.

### Q: How does the inbox thread model work?

There is no separate "conversation" collection. Threads are derived at runtime in `messageController.inbox` by fetching all messages involving the user, then building a `Map` keyed by `"property:{id}:{otherId}"` or `"item:{id}:{otherId}"`. The last message and unread count are computed per thread, then enriched with user and context info.

### Q: How are Mongoose aggregation `$lookup` joins different from SQL JOINs?

`$lookup` is a left outer join performed in-memory on the MongoDB server. The result is embedded as an array field (e.g. `landlordInfo: [{...}]`). Unlike SQL JOINs, there's no native index-aware join optimisation by default — use `$lookup` with caution on large unindexed collections.

### Q: Why is express-mongo-sanitize applied manually in Express 5?

Express 5 made `req.query` a getter-only property (no direct assignment). `express-mongo-sanitize`'s default middleware tries to overwrite `req.query`, which throws a TypeError. The custom middleware in `app.js` sanitizes only `req.body` and `req.params`.

### Q: What security packages are used and why?

| Package | Purpose |
|---------|---------|
| `helmet` | Sets secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.) |
| `express-rate-limit` | Prevents brute-force attacks (500 req / 15 min per IP) |
| `express-mongo-sanitize` | Strips `$` and `.` from inputs to prevent NoSQL injection |
| `hpp` | Prevents HTTP Parameter Pollution (duplicate query params) |
| `bcryptjs` | Slow password hashing (cost 10) to resist brute-force |

### Q: What is the `autoExpirePending` helper?

It's called before returning `paymentHistory`. It runs `updateMany` to set `status: "Overdue"` on all payments where `status === "Pending"` AND `expiresAt <= now`. This is a simple "lazy expiry" pattern — no cron job needed for a small-scale app.

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `node index.js` | Start production server |
| `npm run dev` | Nodemon backend + Vite frontend | Development with hot reload |
| `npm run server` | `nodemon index.js` | Backend only |
| `npm run client` | `cd client && npm run dev` | Frontend only |
| `npm run seed` | `node demo_data/seed.js` | Populate demo data |

---

## License

ISC — See `package.json`

---

> Built with ❤️ for Bangladesh — Bariwala connects landlords, tenants, and marketplace users on a single platform.

