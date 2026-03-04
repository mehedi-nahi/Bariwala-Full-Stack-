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
| Routing     | React Router DOM v7                                         |
| Hosting     | Vercel (single repo, full-stack)                            |
| Dev tools   | Nodemon, ESLint, Concurrently                               |

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
- Image upload via Cloudinary (up to 5 images per listing)
- Cart sidebar with multi-item checkout
- Simulated marketplace payment gateway with shipping info form
- Buyer can message seller directly from item detail page
- All users (landlord & tenant) can browse the marketplace from the navbar

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
| `tenant`      | Browse/search properties & marketplace, send rental requests, pay invoices, message landlords, write reviews |
| `landlord`    | List/manage properties, view rental requests, generate invoices, message tenants, browse marketplace, write reviews |
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
│   │   ├── authVerification.js   # JWT decode → sets req.headers.{email,_id,role}
│   │   ├── adminVerification.js  # role === "admin" guard
│   │   └── fileUploads.js        # Multer + Cloudinary storage, 8 MB limit, image-only
│   └── utility/
│       └── tokenUtility.js       # EncodeToken / DecodeToken helpers
│
├── uploads/                  # (empty — images are stored on Cloudinary CDN)
├── demo_data/
│   └── seed.js               # Database seeder (run: npm run seed)
│
└── client/                   # React 19 + Vite frontend
    ├── vite.config.js        # Vite proxy: /api/v1 → localhost:3000
    └── src/
        ├── App.jsx           # Root router, auth state, role-gated routes
        ├── api/              # Axios API layer (one file per domain)
        ├── components/
        │   ├── Navbar.jsx
        │   ├── Footer.jsx
        │   └── PrivateRoute.jsx
        └── pages/
            ├── auth/         # Login, Register
            ├── shared/       # Profile (role-adaptive dashboard)
            ├── tenant/       # SearchProperties, PropertyDetail, Inbox, PaymentHistory
            ├── landlord/     # MyProperties, AddProperty, EditProperty, LandlordInvoices
            ├── marketplace/  # AllItems, AddItem, MyItems, ItemDetail
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
| `images`      | [String] | ❌       | `[]`    | Cloudinary URLs             |
| `isRemoved`   | Boolean  | ❌       | `false` | Soft delete flag            |
| `isSold`      | Boolean  | ❌       | `false` | Marked sold after checkout  |

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
| POST   | `/update-profile`          | 🔒   | Update name, phone, bio                  |
| POST   | `/file-upload`             | 🔒   | Upload single image → Cloudinary         |
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
| POST   | `/broadcast-message`                         | 🔒🛡️ | Admin broadcasts to all/role users |
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
| POST   | `/mark-sold/:id`      | 🔒   | Mark item as sold after checkout    |

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
| GET    | `/admin/all-users`              | 🔒🛡️      | Paginated user list                 |
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
| `PORT`                    | ❌       | `3000`                               | Express server port                 |
| `NODE_ENV`                | ❌       | `production`                         | Enables secure cookies in production|
| `DB_URL`                  | ✅       | `mongodb+srv://...`                  | MongoDB connection string           |
| `JWT_SECRET`              | ✅       | `change_this_to_random_string`       | Secret key for JWT signing          |
| `JWT_EXPIRE`              | ✅       | `7d`                                 | JWT expiry (e.g. `1d`, `7d`)        |
| `COOKIE_EXPIRE`           | ✅       | `7`                                  | Cookie max-age in **days**          |
| `CLOUDINARY_CLOUD_NAME`   | ✅       | `your_cloud_name`                    | Cloudinary account cloud name       |
| `CLOUDINARY_API_KEY`      | ✅       | `123456789012345`                    | Cloudinary API key                  |
| `CLOUDINARY_API_SECRET`   | ✅       | `abc123...`                          | Cloudinary API secret               |

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `node index.js` | Start production server |
| `npm run dev` | Nodemon + Vite concurrently | Development with hot reload |
| `npm run server` | `nodemon index.js` | Backend only |
| `npm run client` | `cd client && npm run dev` | Frontend only |
| `npm run seed` | `node demo_data/seed.js` | Populate demo data |
| `npm run build` | `cd client && npm install && npm run build` | Build frontend for production |


