# R2A Pharmacy POS — Completed API Lists

**Document type:** Cloud API reference for engineers joining or extending the project  
**Package:** `@r2a/server` (`apps/server`)  
**Base URL (dev):** `http://localhost:8787` (override with `PORT` / `BASE_URL`)  
**API prefix:** `/api/v1`  
**Last updated:** 2026-09-18
**Milestone coverage:** **M2 — Cloud API core** (Batches A–H) + **M3 desktop POS shell DONE** (§14–§18 / Slices 2–6) + **M4 one-way sync DONE** (**§19**) + **M5 MVP hardening DONE** (**§20**) + **M6 Owner Web Slice 1 A–O DONE** (**§21**) + Owner Web Missing Features **W1–W6 DONE** + **M6 Slice 2 P–AD DONE** (**§22; suppliers/PO/GRN/returns + dual receive; composed smoke:m6s2**) + **M6 Slice 3 AE–AM DONE** (**§23**) + **M6 Slice 4 Staff AN–AV DONE** (**§24**) + **M6 Slice 5 AW–BC DONE, BD Slice 5 exit DONE** (**§25**) + **M6 Slice 6 BE–BG DONE** (**§26**) + **M6 Slice 7 BH–BL DONE** (**§27**) + **M6 Slice 8 BM–BQ DONE** (**§28; Settings hub + Business/Account Profile + Help; composed smoke:m6s8**)

> **Source of truth for contracts:** Zod schemas in `@r2a/shared-types`.  
> **Live status:** [`Current_Status.md`](Current_Status.md).  
> **Execution history:** [`MILESTONE_2_EXECUTION.md`](MILESTONE_2_EXECUTION.md), [`MILESTONE_3_EXECUTION.md`](MILESTONE_3_EXECUTION.md).  
> **Desktop note (Slice 1 A–K):** Consumes existing M2 routes (auth, health, products, batches, FEFO). Cart is local UI state.  
> **Desktop note (Slice 2 M–T):** Still **no new cloud endpoints**. Adds Select Customer (`GET /customers`), zero-pay complete via `POST /sales/ingest` (loyalty → `discount`, CASH ৳0), and desktop-only stubs (manager FEFO PIN, loyalty OTP). See **§14**.  
> **Desktop note (Slice 3 V–Y):** Still **no new cloud endpoints**. Payment Select Method + Cash tender → `POST /sales/ingest` with `CASH` amount = due; shared Sale Completed + print **stub**. Card/MFS were gated in Slice 3 — **ungated in Slice 4** (§16).  
> **Desktop note (Slice 4 AA–AD):** Still **no new cloud endpoints**. Receipt Preview (dynamic lines); Card stub terminal → `CARD` ingest; MFS bKash/Nagad/Rocket + **invented** confirm/result → `MFS` ingest (+ provider meta in `notes`). See **§16**.  
> **Desktop note (Slice 5 AF–AL):** Still **no new cloud endpoints**. F4 substitutes (`GET /products/:id/substitutes`); Settings pharmacy header → Receipt Preview; Force Offline; Transactions list/detail/reprint from local log; Shift open/close local; Create Customer removed from POS; `POST /customers` **OWNER-only**. See **§17**.  
> **Desktop note (Slice 6 AM–AP + Prod P12):** Hold / Park Sale is soft (no stock reservation). **F6** Hold + **F7** Held list (toggle); resume rechecks live stock/expiry (strip/clamp); mid-payment Hold aborts card/MFS stubs and does **not** ingest. **Prod P12:** online store-scoped cloud holds via `/api/v1/held-sales` (max 3); offline local `heldSaleStore`; reconnect cloud-canonical + push local-only. Hard inventory lock on holds still out of scope. See **§18**.
> **M3 closed (2026-08-13):** Desktop POS shell complete. Later screens → Slice 7+. No new cloud routes in M3.  
> **M4 closed (2026-08-14):** One-way offline→cloud sync. New cloud route `POST /api/v1/sync/ingest` (reuses `ingestSale`). Desktop 15s worker + Sync Queue panel. See **§19**.  
> **M5 closed (2026-08-14):** **§20 — M5** — PATCH RBAC, desktop Receive stock (no new routes), Sync Queue 409 copy, paged catalog pull. Print / FEFO PIN stay stubs. See **§20**.  
> **M6 Batch D (2026-08-15, historical):** `POST /sales/ingest` and `/sync/ingest` persist `receiptNo`, `costPerBaseAtSale`, optional loyalty snapshots, FEFO flags, and `InventoryEvent` SALE. `POST /batches` writes RECEIVE. Its original absolute PATCH adjustment was superseded by W6 signed adjustments.
> **M6 Batch E (2026-08-15):** `GET /api/v1/sales` + `GET /api/v1/sales/:id` (`:id` = `Sale.id`). Any authenticated. Owner sees `costPerBaseAtSale` / `lineCogs` / `cogs` / `netProfit` (`sale.total − COGS`). Manager/Cashier omit those keys. Full §21 at Slice 1 exit.  
> **M6 Batch F (2026-08-16):** `GET /api/v1/owner/dashboard`, `GET /owner/inventory-summary`, `GET /owner/expiry`. **`restrictTo("OWNER")`** (Manager/Cashier 403). Net profit = `sum(sale.total) − sum(costPerBaseAtSale * quantityBase)`. Dashboard UI = Batch G. Full §21 at Slice 1 exit.
> **M6 Batch G (2026-08-16):** Owner web Dashboard consumes `GET /owner/dashboard`. Live KPIs (no mock ৳124,850). Recent row → `/sales/:id` (detail = Batch I).
> **M6 Batch H (2026-08-16):** Owner web Sales list consumes `GET /sales` + dashboard `salesKpis` / `paymentMix` / `topCashier` / `cashiers`. Net sales = gross − discounts (no returns). Date `to` on list is end-of-UTC-day when date-only. Detail layout = Batch I.  
> **M6 Batch I (2026-08-16):** Owner web Transaction Details consumes `GET /sales/:id`. FEFO OVERRIDE from `fefoOverride`. Loyalty grid from snapshots (hidden for walk-in). Reprint = on-screen preview from sale JSON (no Tauri). Amount Due ৳0. More Actions disabled. No void.  
> **M6 Batch J (2026-08-16):** `GET /api/v1/owner/inventory` OWNER-only paged list (tabs, search, cost/sell/margin). Owner web Inventory list live. Product Details = Batch K. Full §21 at Slice 1 exit.  
> **M6 Batch K (2026-08-16):** `GET /api/v1/owner/products/:id` OWNER-only product detail (lots, FEFO rank on sellable lots, units, recent InventoryEvents). Owner web Product Details live; W2 subsequently added Edit Product. Full §21 below.
> **M6 Batch M (2026-08-16):** Owner web Receive Stock uses existing `GET /owner/products/:id` context + `POST /batches`; new lots create `InventoryEvent` RECEIVE. PO/invoice and offline GRN are omitted. Batch N repair added optional supplier/return metadata. Full §21 below.
> **M6 Batch N (2026-08-18):** Owner web Expiry Management consumes `GET /owner/expiry`; live bucket/search/filter/select/CSV UI. Batch-level `supplierName` and `returnStatus` are persisted metadata. **M6 Batch AA** enables Prepare Supplier Return → `/suppliers/returns`.
> **M6 Batch Q (2026-08-18):** OWNER-only Supplier CRUD (no delete) and Purchase Order list/create/get/draft-update APIs are live. POs use `PO-YYMMDD-####`, server-calculated totals, and do not change inventory.
> **M6 Batch R (2026-08-18):** OWNER-only confirmed GRN and supplier-return APIs are live. GRNs create lots + RECEIVE events and advance PO quantities/status. Return dispatch writes idempotent signed ADJUST events; rejection does not restore stock. No Slice 2 web UI yet (GRN/return UI still later).
> **M6 Batch T (2026-08-18):** Owner web Purchasing list live on `GET /owner/purchase-orders` — KPI cards, PO table, search/status filter, pagination, Create PO → `/purchasing/new`. `smoke:m6t` PASS.
> **M6 Batch U (2026-08-18):** Owner web Create Purchase Order live — supplier dropdown from `GET /owner/suppliers?isActive=true`, product line search, Add Suggested Items, Save as Draft / Create (SENT) / Cancel, order-summary rail; `POST /owner/purchase-orders`; creating a PO has **no** inventory effect. Seed now ships **3 ACTIVE suppliers** (Beximco · Square · SMC). `smoke:m6u` PASS.
> **M6 Batch V (2026-08-19):** Owner web Purchase Order Details live on `GET /owner/purchase-orders/:poId` — header + status badge, KPI cards, receiving progress bar, line received/remaining, and GRN history for **this** PO. Export / Print / More Actions disabled. Receive Stock (enabled while remaining qty > 0 on a SENT / PARTIALLY_RECEIVED order) navigates to `/purchasing/:poId/receive`; the GRN form itself is Batch W. `smoke:m6v` PASS.
> **M6 Batch W (2026-08-19):** Owner web Receive Stock against PO live at `/purchasing/:poId/receive` — Receipt Details, Received Items table (`+ Add Batch` / `Lot #N` rows with Valid / Incomplete / Exceeds status), Receipt Summary, and Inventory Impact projection. Submits to the Batch R route `POST /owner/purchase-orders/:poId/receipts` (**no new cloud route**) and returns to PO Details. Inventory ad-hoc `POST /batches` Receive Stock untouched. `smoke:m6w` PASS.
> **M6 Batch X (2026-08-19):** Owner web Suppliers directory live at `/suppliers` — 4 KPI cards, Supplier Directory card (search, status filter, table, pagination), and a Supplier Attention rail. `GET /owner/suppliers` now additively returns `meta.kpis`, `meta.attention`, and per-item `stats` (response shape otherwise unchanged). No new cloud routes. `smoke:m6x` PASS.
> **M6 Batch AB (2026-08-19):** Owner web Create Return Manifest live at `/suppliers/returns/new` — reviews the Expiry Returns session draft, supplier policy, editable return qty; posts existing `POST /owner/return-manifests` (optional `supplierReference`); Save as Draft disabled; no stock movement; Manifest Details was Batch AC. `smoke:m6ab` PASS.
> **M6 Batch AC (2026-09-18):** Owner web Return Manifest Details live at `/suppliers/returns/:manifestId` — one page for Prepared/Dispatched/Accepted/Rejected/Completed; Record Dispatch / Supplier Decision / Complete Return modals; Dispatch posts existing `POST /owner/return-manifests/:id/dispatch` (stock leaves); Decision/Complete use existing Batch R routes (**no new cloud routes**). Export / Print / More Actions disabled. `smoke:m6ac` PASS.
> **M6 Slice 3 AE–AG (2026-08-20):** Customer Prisma + Zod landed (AE). Customer APIs are live (AF): role-aware `POST /customers` (Owner Active; Cashier/Manager Pending + extras stripped), Active-only `GET /customers`, `GET /customers/phone-check`, Owner `GET /owner/customers` + `/:id` + approve/reject, `GET /sales?customerId=`, ingest Active-only guard, 403 on `/owner/customers*` for non-owners. Batch AG enables the Owner web Customers nav as a live chrome route with placeholder shells (`/customers`, `/customers/new`, `/customers/:id`, `/customers/:id/review`); Staff/Help/Owner Profile remain disabled. Catalog **§23** at Batch AM.
> **Prod Batch P1 (2026-09-18):** Owner web Edit Customer live at `/customers/:id/edit`. Details Edit CTA enabled; More Actions still disabled. `PATCH /customers/:id` additively accepts `dateOfBirth` / `gender` / `address` / `status` (`ACTIVE`↔`INACTIVE` only; pending/rejected blocked). Phone-check ignores the same customer. `smoke:prod-p1` PASS.
> **Prod Batch P2 (2026-09-18):** Owner web Edit Supplier live at `/suppliers/:id/edit`. PATCH ACTIVE↔HOLD (+ DRAFT if already). `smoke:prod-p2` PASS.
> **Prod Batch P3 (2026-09-18):** Supplier Details **View All POs** deep-links to `/purchasing?supplierId=…`. Owner web PO list client sends `supplierId` to existing `GET /owner/purchase-orders` (already supported). Filter chip + clear. No new cloud route. `smoke:prod-p3` PASS.
> **Prod Batch P4 (2026-09-18):** Supplier Details **View All Products** deep-links to `/inventory?supplierId=…`. Additive optional `supplierId` on `GET /owner/inventory` — products linked via ACTIVE batches with that supplier and/or PO lines for that supplier (same rule as Supplier Details). Filter chip + clear + honest empty. `smoke:prod-p4` PASS.
> **Prod Batch P5 (2026-09-18):** Owner web Inventory Report live at `/reports/inventory`. Composes existing `GET /owner/inventory-summary`, `GET /owner/inventory` (low/out tabs), and `GET /owner/expiry` — **no new aggregate route**. Reports dashboard Inventory View Report + Status CTA enabled. Export disabled until P7. `smoke:prod-p5` PASS.
> **Prod Batch P6 (2026-09-18):** Owner web Purchase Report live at `/reports/purchasing` (route lock). Composes existing `GET /owner/purchase-orders` — **no new aggregate route**. Reports dashboard Purchase View Report + Purchasing Status CTA enabled. Export disabled until P7. `smoke:prod-p6` PASS.
> **Prod Batch P7 (2026-09-18):** Client-side CSV export live on Sales Report, Inventory Report, Purchase Report, Audit dashboard list, Audit detail lines, Shift detail summary, and Expiry Returns queue (`apps/web/src/lib/csvExport.ts`). No new cloud route / no server PDF / no thermal print IPC. Print buttons stay disabled with S2 hint. `smoke:prod-p7` PASS.
> **Prod Batch P8 (2026-09-18):** Desktop Settings → **Stock Audit** (OWNER/MANAGER only). Online `POST /audits/start` → `POST /audits/:id/lines` → `POST /audits/:id/submit`. No offline audit queue. Owner web `/audit` remains review surface. **No new cloud routes.** `smoke:prod-p8` PASS.
> **Prod Batch P15 (2026-09-18):** GRN Save as Draft — `GoodsReceiptDraft` + OWNER `GET/PUT/DELETE .../receipt-draft`; receive UI resume; Confirm clears draft. Supplier/Manifest drafts stay disabled with hints. See **§25.15**. `smoke:prod-p15` PASS. Wave 4 complete.
> **Prod Batch P14 (2026-09-18):** Owner Catalog Import live at `/inventory/import`. OWNER `POST /owner/catalog/import/dry-run` + `/commit` — CSV/XLSX parse, sku upsert + units; max 2 MiB / 2000 rows. No cost columns / no desktop Excel / no bi-di. See **§25.14**. `smoke:prod-p14` PASS.
> **Prod Batch P13 (2026-09-18):** Desktop Transactions → cloud uses existing `GET /sales` + `GET /sales/:id`. See **§25.13**.
> **M6 Batch AJ (2026-08-20):** Owner web Customer Details live at `/customers/:customerId`. `GET /owner/customers/:id` **additively** returns `profile.storeName`, `purchaseHistory.lastPurchaseAt`, `purchaseHistory.rows` (id/receiptNo/soldAt/total/storeName), and `loyaltyActivity.rows` (id/soldAt/loyaltyPrevious/loyaltyUsed/loyaltyEarned) — prior shape preserved (`smoke:m6af` valid). No new cloud routes; `/customers/:id/review` stays a placeholder until Batch AK. `smoke:m6aj` PASS.
> **M6 Batch AK (2026-08-20):** Owner web Customer Registration Review live at `/customers/:customerId/review` — reads live `GET /owner/customers/:id`; Approve posts existing `POST /owner/customers/:id/approve` (OWNER only, pending only; editable name/phone/email/DOB/gender/address corrections; phone duplicate check via existing `GET /customers/phone-check` ignoring the same customer), Reject posts existing `POST /owner/customers/:id/reject` (optional `rejectionNote` ≤1000). **No new cloud routes** — the live pending→approve→POS Active-search flow is covered by `smoke:m6af` (approve → ACTIVE, POS `GET /customers` Active-only, reject → REJECTED + hidden). `smoke:m6ak` PASS.
> **M6 Batch AZ (2026-08-22):** Owner web Staff page now has **Shift Management** → `/staff/shifts`, consuming existing `GET /api/v1/owner/shifts` from Batch AX. Live list includes KPI totals from shift-list meta, All/Open/Closed/Flagged tabs, search, cashier filter, pagination, and detail navigation. **No new cloud routes.** `smoke:m6az` PASS.
> **M6 Batch BA (2026-08-22):** Owner web Shift Details live at `/staff/shifts/:shiftId`, consuming existing `GET /api/v1/owner/shifts/:shiftId`. Shows top detail cards, cash summary, sales/payment summary, activity timeline, audit rail, and disabled Request Cash Count. View POS Activity filters `/sales` by cashier/date. **No new cloud routes.** `smoke:m6ba` PASS.
> **M6 Batch BB (2026-08-22):** Owner web Review Cash Variance modal live from flagged shift list/detail. Uses existing `POST /api/v1/owner/shifts/:shiftId/resolve`; resolved details show Variance Review card and updated timeline. Generate Shift Report remains disabled. **No new cloud routes.** `smoke:m6bb` PASS.
> **M6 Slice 6 BE–BG (2026-08-22):** OWNER-only `GET /api/v1/owner/reports/sales` live. Returns Sales Report aggregates with default last 30 days, `from`/`to`, optional tenant-scoped `storeId`, prior-period KPI trends, daily bars, CASH/CARD/MFS payment summary, best-selling category, highest sales day, top cashiers, top medicines, and recent transactions. Owner web Sales Report UI is live at `/reports/sales`; Reports Dashboard Sales View Report is enabled. `smoke:m6be`, `smoke:m6bf`, and composed `smoke:m6s6` PASS.
> **M6 Batch BH (2026-08-22):** StockAudit + FEFO foundation landed in Prisma and shared Zod only: `StockAudit`, `StockAuditLine`, `StockAuditActivityEvent`, `FefoViolationRecord`, audit/FEFO enums, and deterministic seed records. **No new API routes yet**; `/owner/audit*`, manager audit submit routes, and sale ingest FEFO hook are Batch BI.
> **M6 Batch BI (2026-08-22):** Audit + FEFO APIs live. Owner routes: `GET /owner/audit/dashboard`, `GET /owner/audits`, `GET /owner/audits/:id`, `POST /owner/audits/:id/review`, `POST /owner/fefo-violations/:id/correct`. Owner/Manager routes: `POST /audits/start`, `POST /audits/:id/lines`, `POST /audits/:id/submit`. Sale ingest creates OPEN `FefoViolationRecord` rows when a real non-FEFO override is submitted. No Owner web audit UI yet.
> **M6 Batch BJ (2026-08-22):** Owner web Audit & FEFO dashboard is live at `/audit`, consuming existing `GET /owner/audit/dashboard`, `GET /owner/audits`, and `GET /owner/expiry`. Audit nav is enabled. Generate Report and advanced filters remain disabled. View links route to `/audit/:auditId`; full Audit Detail is Batch BK. **No new cloud routes.** `smoke:m6bj` PASS.
> **M5 Batch A (2026-08-14):** `PATCH /customers/:id` and `PATCH /batches/:id` are **`OWNER`, `MANAGER`** (cashier `403`, including batch qty). No new routes.  
> **M5 Batch C (2026-08-14, historical; superseded by W6):** Desktop Settings → Receive stock originally used `POST /api/v1/batches` and absolute quantity PATCH. Current stock correction uses signed `/adjustments`.
> **M5 Batch E (2026-08-14):** Desktop `catalogPull` pages `GET /products` and `GET /batches` (`limit=100` + `offset` until `meta.total`, cap 50 pages / 5000 rows). Still **no** `costPerBase` in the local cache. No new cloud routes. No CSV.  
> **Owner Web Missing Features W1–W6 (2026-08-18):** Batch lifecycle/version/audit foundation, historical sale snapshots, Edit Product, Batch Management, correction/adjustment/void/retire APIs, ACTIVE-only FEFO/POS lists, and desktop signed/versioned/reasoned online adjustments. General `PATCH /batches/:id` no longer accepts `quantityOnHand`.
> **FEFO display (desktop):** Search cards prefer the earliest **sellable** (non-expired) lot. Cloud `GET …/fefo-batch` still returns the earliest **in-stock** lot by expiry (may be expired). See §8.5.  
> **Demo seed:** Napa `NAPA-500` ships with **4 lots** for Select Batch UX (`NP23091` FEFO · `NP24031` · `NP24052` · `NP23010` expired). Customer **Karim** ships with **120** loyalty points. **3 ACTIVE suppliers** (Beximco Distribution Ltd. · Square Distribution Ltd. · SMC Distribution) ship for the Create PO supplier dropdown. Re-run `npm run db:seed` after pull.

---

## 1. How to read this document

| Symbol | Meaning |
|--------|---------|
| Public | No `Authorization` header |
| Bearer | Requires `Authorization: Bearer <accessToken>` |
| Tenant | After auth, `tenantId` comes **only from JWT** (body `tenantId` is ignored/stripped) |
| RBAC | Extra role checks via `restrictTo(...)` |

**Stack:** Express + TypeScript → `router → controller → service` → Prisma (`@r2a/database`) → Neon PostgreSQL.

**Run locally**

```bash
# Terminal 1 — ensure repo-root `.env` has DATABASE_URL + JWT_SECRET (see `.env.example`)
npm run dev -w @r2a/server

# Terminal 2 — optional exit smoke
npm run smoke:m2 -w @r2a/server
```

**Seeded demo login**

| Field | Value |
|-------|--------|
| Owner email | `owner@demo.local` |
| Manager email | `manager@demo.local` |
| Cashier email | `cashier@demo.local` |
| Password (all three) | `ChangeMe123!` |
| Tenant slug | `demo-pharmacy` |

---

## 2. Conventions that apply to every endpoint

### 2.1 Success envelope (locked)

```json
{
  "status": "success",
  "message": "Human-readable message",
  "data": {},
  "meta": {}
}
```

- `data` and `meta` are optional (omitted when unused).
- Do **not** expect `{ "success": true }` — that shape is not used.

### 2.2 Error envelope (locked)

```json
{
  "status": "fail",
  "message": "Why it failed",
  "stack": "(development only)"
}
```

| `status` | Typical HTTP | Meaning |
|----------|--------------|---------|
| `fail` | 4xx | Operational / client error (`AppError`) |
| `error` | 5xx | Unexpected server error |

Common status codes: `400` validation, `401` auth, `403` forbidden, `404` not found, `409` conflict (duplicate / insufficient stock).

### 2.3 Authentication

1. **Access token (JWT)** — short-lived (default `JWT_EXPIRES_IN=15m`).  
   Header: `Authorization: Bearer <accessToken>`
2. **Refresh token** — opaque string; only a SHA-256 hash is stored in `RefreshToken`.  
   Rotate on every `/auth/refresh`. Reusing a revoked refresh token revokes **all** sessions for that user.

**JWT claims (payload)** — must match `jwtClaimsSchema`:

| Claim | Type | Meaning |
|-------|------|---------|
| `sub` | string | User id |
| `role` | `SUPER_ADMIN` \| `OWNER` \| `MANAGER` \| `CASHIER` | RBAC role |
| `tenantId` | string | Tenant scope for all domain queries |
| `storeId` | string \| null | Assigned store (cashiers are store-scoped) |

Never put email or password in the JWT. Never trust `tenantId` from the request body.

### 2.4 Domain middleware chain

Protected domain routes run:

1. `protect` — verify Bearer JWT → `req.auth`
2. `tenantContext` — set `req.ctx = { userId, tenantId, storeId, role }` from JWT; strip body `tenantId`

### 2.5 Naming & units

- API DTOs: **camelCase** (Prisma-aligned).
- Quantities / batch prices: **base unit = PIECE**.
- Batch fields (locked names): `expiryDate`, `quantityOnHand`, `costPerBase`, `sellPerBase`.
- Payments: `CASH` \| `CARD` \| `MFS` only (**no Baki**).

### 2.6 Cashier margin rules

| Field | Cashier |
|-------|---------|
| `costPerBase` | **Omitted** from responses; cannot mutate |
| `sellPerBase` | **Allowed** (needed for checkout) |
| Derived margin/profit | Must not appear |

Owners / managers see `costPerBase` on batch payloads.

### 2.7 Not implemented (do not call)

| Path / feature | Why |
|----------------|-----|
| Sale delete / update | Sales are append-only |
| Super Admin platform routes | Role exists; no console API in M2 |
| Payment gateway charge APIs | Enum only; no Card/MFS processor integration yet |
| Manager FEFO override verify / audit | Desktop stub only (Slice 2) — see §15.3 |
| Loyalty OTP send / verify | Desktop stub only (Slice 2) — see §15.3 |
| Loyalty earn/redeem mutate on ingest | Not in M2 schema — mapped via `discount` + `notes` for now |

---

## 3. Quick route index

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | `/health` | Public | — |
| GET | `/api/v1/health` | Public | — |
| POST | `/api/v1/auth/register` | Public | — |
| POST | `/api/v1/auth/login` | Public | — |
| POST | `/api/v1/auth/refresh` | Public | — |
| POST | `/api/v1/auth/logout` | Public | — |
| GET | `/api/v1/tenant/context` | Bearer | Any authenticated |
| GET | `/api/v1/users/me` | Bearer | Any authenticated |
| POST | `/api/v1/users` | Bearer | `OWNER`, `MANAGER` |
| GET | `/api/v1/products` | Bearer | Any authenticated |
| POST | `/api/v1/products` | Bearer | `OWNER`, `MANAGER` |
| GET | `/api/v1/products/:id` | Bearer | Any authenticated |
| PATCH | `/api/v1/products/:id` | Bearer | `OWNER`, `MANAGER` |
| GET | `/api/v1/products/:productId/fefo-batch` | Bearer | Any authenticated |
| GET | `/api/v1/products/:productId/substitutes` | Bearer | Any authenticated |
| GET | `/api/v1/batches` | Bearer | Any authenticated |
| POST | `/api/v1/batches` | Bearer | `OWNER`, `MANAGER` |
| GET | `/api/v1/batches/:id` | Bearer | Any authenticated |
| PATCH | `/api/v1/batches/:id` | Bearer | `OWNER`, `MANAGER`; metadata/prices only, never quantity |
| POST | `/api/v1/batches/:id/corrections` | Bearer | `OWNER`, `MANAGER` |
| POST | `/api/v1/batches/:id/adjustments` | Bearer | `OWNER`, `MANAGER` |
| POST | `/api/v1/batches/:id/void` | Bearer | **`OWNER` only** |
| POST | `/api/v1/batches/:id/retire` | Bearer | **`OWNER` only** |
| GET | `/api/v1/customers` | Bearer | Any authenticated |
| POST | `/api/v1/customers` | Bearer | **`OWNER` only** (not Manager; not on desktop POS — Owner web later) |
| GET | `/api/v1/customers/:id` | Bearer | Any authenticated |
| PATCH | `/api/v1/customers/:id` | Bearer | `OWNER`, `MANAGER` (cashier `403`) |
| POST | `/api/v1/sales/ingest` | Bearer | Any authenticated. Optional `shiftId` links sale to open shift |
| GET | `/api/v1/sales` | Bearer | Any authenticated. Cost/COGS/netProfit **OWNER only** |
| GET | `/api/v1/sales/:id` | Bearer | Any authenticated. `:id` = `Sale.id`. Same redaction |
| POST | `/api/v1/shifts` | Bearer | `CASHIER`, `MANAGER` — open shift with float |
| POST | `/api/v1/shifts/active/close` | Bearer | `CASHIER`, `MANAGER` — close with counted cash |
| GET | `/api/v1/shifts/active` | Bearer | `CASHIER`, `MANAGER` — get active shift |
| GET | `/api/v1/owner/shifts` | Bearer | **`OWNER` only** — list shifts with filters |
| GET | `/api/v1/owner/shifts/:shiftId` | Bearer | **`OWNER` only** — shift detail + breakdown |
| POST | `/api/v1/owner/shifts/:shiftId/resolve` | Bearer | **`OWNER` only** — resolve flagged variance |
| POST | `/api/v1/owner/shifts/:shiftId/cash-count-request` | Bearer | **`OWNER` only** — Prod P10 request cash count |
| POST | `/api/v1/owner/shifts/:shiftId/cash-count-request/cancel` | Bearer | **`OWNER` only** — Prod P10 cancel cash-count request |
| POST | `/api/v1/terminals/heartbeat` | Bearer | `CASHIER`, `MANAGER`, `OWNER` — Prod P11 desktop presence |
| GET | `/api/v1/owner/terminals/presence` | Bearer | **`OWNER` only** — Prod P11 terminal presence list |
| GET | `/api/v1/owner/dashboard` | Bearer | **`OWNER` only** |
| GET | `/api/v1/owner/reports/sales` | Bearer | **`OWNER` only** — Sales Report aggregate API |
| GET | `/api/v1/owner/reports/product-movement` | Bearer | **`OWNER` only** — Product movement (demand bands; Enhance D2) |
| GET | `/api/v1/owner/reports/stock-priority` | Bearer | **`OWNER` only** — Sale-priority stock alarms P1–P4 (Enhance D3) |
| GET | `/api/v1/owner/audit/dashboard` | Bearer | **`OWNER` only** — Audit + FEFO dashboard data |
| GET | `/api/v1/owner/audits` | Bearer | **`OWNER` only** — Stock audit list |
| GET | `/api/v1/owner/audits/:auditId` | Bearer | **`OWNER` only** — Stock audit detail |
| POST | `/api/v1/owner/audits/:auditId/review` | Bearer | **`OWNER` only** — Review submitted/variance audit |
| POST | `/api/v1/owner/fefo-violations/:violationId/correct` | Bearer | **`OWNER` only** — Correct OPEN FEFO violation |
| POST | `/api/v1/audits/start` | Bearer | `OWNER`, `MANAGER` — start stock audit |
| POST | `/api/v1/audits/:auditId/lines` | Bearer | `OWNER`, `MANAGER` — replace counted audit lines |
| POST | `/api/v1/audits/:auditId/submit` | Bearer | `OWNER`, `MANAGER` — submit audit for owner review |
| GET | `/api/v1/owner/inventory-summary` | Bearer | **`OWNER` only** |
| GET | `/api/v1/owner/expiry` | Bearer | **`OWNER` only** |
| GET | `/api/v1/owner/inventory` | Bearer | **`OWNER` only** |
| POST | `/api/v1/owner/catalog/import/dry-run` | Bearer | **`OWNER` only** — Prod P14 CSV/XLSX dry-run |
| POST | `/api/v1/owner/catalog/import/commit` | Bearer | **`OWNER` only** — Prod P14 commit sku upserts |
| GET | `/api/v1/owner/products/:id` | Bearer | **`OWNER` only** |
| GET | `/api/v1/owner/batches/:id` | Bearer | **`OWNER` only** |
| GET, POST | `/api/v1/owner/suppliers` | Bearer | **`OWNER` only** |
| GET, PATCH | `/api/v1/owner/suppliers/:supplierId` | Bearer | **`OWNER` only**; no delete route |
| GET, POST | `/api/v1/owner/purchase-orders` | Bearer | **`OWNER` only** |
| GET, PATCH | `/api/v1/owner/purchase-orders/:poId` | Bearer | **`OWNER` only**; PATCH only while `DRAFT` |
| POST | `/api/v1/owner/purchase-orders/:poId/receipts` | Bearer | **`OWNER` only**; confirmed GRN |
| GET | `/api/v1/owner/purchase-orders/:poId/receipt-draft` | Bearer | **`OWNER` only** — Prod P15 GRN draft |
| PUT | `/api/v1/owner/purchase-orders/:poId/receipt-draft` | Bearer | **`OWNER` only** — Prod P15 save GRN draft |
| DELETE | `/api/v1/owner/purchase-orders/:poId/receipt-draft` | Bearer | **`OWNER` only** — Prod P15 discard GRN draft |
| GET | `/api/v1/owner/returns/queue` | Bearer | **`OWNER` only** |
| POST | `/api/v1/owner/return-manifests` | Bearer | **`OWNER` only** |
| GET | `/api/v1/owner/return-manifests/:manifestId` | Bearer | **`OWNER` only** |
| POST | `/api/v1/owner/return-manifests/:manifestId/dispatch` | Bearer | **`OWNER` only**; idempotent stock-out |
| POST | `/api/v1/owner/return-manifests/:manifestId/decision` | Bearer | **`OWNER` only** |
| POST | `/api/v1/owner/return-manifests/:manifestId/complete` | Bearer | **`OWNER` only** |
| POST | `/api/v1/sync/ingest` | Bearer | Any authenticated |

Cashier GET still omits `costPerBase`. Price-field `403` remains defense-in-depth on PATCH; the route itself is Owner/Manager only (M5 Batch A).

---

## 4. Health

### `GET /health` and `GET /api/v1/health`

**Auth:** Public  

**Success `200`**

```json
{
  "status": "success",
  "message": "OK",
  "data": {
    "ok": true,
    "service": "@r2a/server",
    "env": "development",
    "timestamp": "2026-08-09T08:00:00.000Z"
  }
}
```

No secrets are returned.

---

## 5. Auth (`/api/v1/auth`)

Shared safe user object (never includes `passwordHash`):

```json
{
  "id": "cuid...",
  "name": "Demo Owner",
  "email": "owner@demo.local",
  "role": "OWNER",
  "tenantId": "cuid...",
  "storeId": "cuid...",
  "isActive": true,
  "createdAt": "2026-08-08T00:00:00.000Z"
}
```

Token pair `data` shape (register / login / refresh):

```json
{
  "user": { "...safe user..." },
  "accessToken": "<jwt>",
  "refreshToken": "<opaque>",
  "expiresIn": "15m"
}
```

### 5.1 `POST /api/v1/auth/register`

Creates **Tenant + Store + OWNER** user in one transaction. No public cashier self-register.

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | Owner display name |
| `email` | string (email) | yes | Unique per tenant |
| `password` | string | yes | Min 8 chars |
| `tenantName` | string | yes | Pharmacy / org name |
| `tenantSlug` | string | yes | Lowercase kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) |
| `storeName` | string | no | Defaults to `"Main Store"` |

**Success `201`** — message `"Account created"` + token pair.  
**Errors:** `409` slug taken; `400` validation.

### 5.2 `POST /api/v1/auth/login`

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | string | yes | |
| `password` | string | yes | Min 8 |
| `tenantSlug` | string | no | Required when the same email exists in multiple tenants |

**Success `200`** — message `"Logged in"` + token pair.  
**Errors:** `401` invalid credentials; `400` if `tenantSlug` required; `403` inactive tenant.

### 5.3 `POST /api/v1/auth/refresh`

Rotates refresh token; issues new access + refresh.

**Body:** `{ "refreshToken": "<opaque>" }`  

**Success `200`** — message `"Token refreshed"` + token pair.  
**Errors:** `401` invalid/expired/reuse (reuse → all sessions revoked).

### 5.4 `POST /api/v1/auth/logout`

Revokes the presented refresh token (idempotent if already revoked/missing).

**Body:** `{ "refreshToken": "<opaque>" }`  

**Success `200`** — message `"Logged out"` (no `data` required).

---

## 6. Tenant context

### `GET /api/v1/tenant/context`

**Auth:** Bearer  

**Success `200`**

```json
{
  "status": "success",
  "message": "OK",
  "data": {
    "userId": "...",
    "tenantId": "...",
    "storeId": "...",
    "role": "OWNER",
    "tenantName": "Demo Pharmacy",
    "storeName": "Main Counter"
  }
}
```

`storeId` is JWT-canonical (display-only on Owner web; not a branch switch). `tenantName` / `storeName` are additive labels for chrome. Domain queries always filter by `tenantId` from here / JWT — never from body.

---

## 7. Users (`/api/v1/users`)

### 7.1 `GET /api/v1/users/me`

**Auth:** Bearer  

**Success `200`** — `data` = safe user (no password hash).

### 7.2 `POST /api/v1/users`

Create staff in the **JWT tenant** only.

**Auth:** Bearer  
**RBAC:** `OWNER` \| `MANAGER` only (`CASHIER` → `403`)

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | string | yes | Unique within tenant |
| `password` | string | yes | Min 8 |
| `name` | string | no | Defaults from email local-part |
| `role` | `CASHIER` \| `MANAGER` | yes | Cannot create `OWNER` / `SUPER_ADMIN` here |
| `storeId` | string | no | Must belong to tenant; cashiers with JWT store are store-scoped |

**Success `201`** — message `"Staff user created"` + safe user.  
**Errors:** `409` email exists; `400` bad `storeId`; `403` role denied.

Sending `tenantId` in the body has **no effect** (stripped).

---

## 8. Products (`/api/v1/products`)

### 8.1 `GET /api/v1/products` — search

**Auth:** Bearer  

**Query**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `q` | string | — | Matches name / genericName / sku / barcode (insensitive contains) |
| `barcode` | string | — | Exact |
| `sku` | string | — | Exact |
| `genericName` | string | — | Contains |
| `isActive` | bool | — | `true`/`false`/`1`/`0` |
| `limit` | int | 20 | Max 100 |
| `offset` | int | 0 | |

**Success `200`** — `data`: product array (includes `units`); `meta`: `{ total, limit, offset }`.

### 8.2 `POST /api/v1/products`

**Auth:** Bearer · **RBAC:** `OWNER` \| `MANAGER`

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | Medicine name |
| `genericName` | string | no | Active ingredient |
| `manufacturer` | string | no | Free-text manufacturer; not linked to the purchasing Supplier entity |
| `strength` | string | no | e.g. "500 mg" |
| `form` | string | no | e.g. "Tablet", "Capsule" |
| `sku` | string | no | Tenant-unique internal identifier |
| `barcode` | string | no | UPC / EAN barcode |
| `category` | string | no | e.g. "Analgesic" |
| `description` | string | no | Free text |
| `requiresPrescription` | boolean | no | `false` = OTC; `true` = Rx. Default `false` |
| `coldChain` | boolean | no | Requires cold-chain storage. Default `false` |
| `storageNotes` | string | no | e.g. "Store below 25°C" |
| `reorderLevel` | int ≥ 0 | no | Low-stock alert threshold (PIECE units) |
| `units` | array | yes (min 1) | Packaging hierarchy |

Each unit:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `unitType` | `BOX` \| `STRIP` \| `PIECE` | yes | |
| `factorToBase` | positive int | yes | e.g. PIECE=1, STRIP=10, BOX=100 |
| `label` | string | no | Display override |

**Success `201`**. **Errors:** `409` duplicate sku/barcode in tenant; `403` Cashier.

> **M6L lock:** `POST /products` creates a **catalog entry only** — zero initial stock, zero batches. Stock is added exclusively via `POST /api/v1/batches` (Batch M, desktop Receive stock). Do not add stock creation logic here.

### 8.3 `GET /api/v1/products/:id`

**Auth:** Bearer · **Success `200`** — product + units. Tenant-scoped.

### 8.4 `PATCH /api/v1/products/:id`

**Auth:** Bearer · **RBAC:** `OWNER` \| `MANAGER`

Partial update; all M6L fields are patchable. If `units` provided, existing unit rows are replaced.

### 8.5 `GET /api/v1/products/:productId/fefo-batch`

Picks the batch with nearest `expiryDate` where `quantityOnHand > 0` (tie-break: earliest expiry, then batch id). Scoped to JWT tenant + store (`?storeId=` allowed when JWT has no store — owners).

**Auth:** Bearer  

**Success `200`** — single batch object (cashier: no `costPerBase`).  
**Errors:** `404` product missing or no in-stock batch; `400` if store cannot be resolved.

**Important — cloud vs desktop POS**

| Layer | Which lot is “FEFO”? |
|-------|----------------------|
| **This API** + sales ingest FEFO-fill | Earliest **in-stock** by `expiryDate` — **can be expired** if that lot still has qty |
| **Desktop search card** (`productSearch.enrichProductWithBatches`) | Earliest **sellable** lot (`expiryDate ≥ today`, qty > 0). Product shows EXPIRED / blocked only when **no** sellable stock remains |
| **Desktop Select Batch modal** | Lists all in-stock lots; highlights sellable FEFO; expired rows visible but **not confirmable** |

With the demo Napa seed, this API may return `NP23010` (expired) because it is the earliest in-stock expiry. The desktop **ignores that for the search card** and shows `NP23091` (FEFO Recommended) instead. Call `GET /batches?productId=` for the full lot list the modal uses.

### 8.6 `GET /api/v1/products/:productId/substitutes`

Other active products in the same tenant with the **same `genericName`** (active ingredient). Empty/missing generic → `data: []` (not an error).

**Auth:** Bearer · Optional `?storeId=`

**Each item in `data`**

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Product id |
| `name` | string | |
| `genericName` | string \| null | |
| `sku` | string \| null | |
| `barcode` | string \| null | |
| `inStock` | boolean | Any qty > 0 at store |
| `availableQuantityBase` | number | Sum of in-stock batch qty (PIECE) |
| `nearestSellPerBase` | number \| null | POS sell price signal |
| `nearestExpiryDate` | string \| null | `YYYY-MM-DD` |
| `isExpired` | boolean | Nearest lot already past today (UTC date) |

Sorted: in-stock first, then name. **No `costPerBase`.**

---

## 9. Batches (`/api/v1/batches`)

All prices/qty are in **PIECE** base units.

### 9.1 `GET /api/v1/batches`

**Auth:** Bearer  

**Query:** `productId?`, `storeId?`, `limit` (default 50), `offset` (default 0).  

Cashiers without an explicit `storeId` query are limited to their JWT store when set.

**Success `200`** — `data` array of **ACTIVE** batches; `meta` pagination. Cashier responses omit `costPerBase`. RETIRED/VOIDED rows remain available through Owner product/batch management detail, not POS lists.

### 9.2 `POST /api/v1/batches`

**Auth:** Bearer · **RBAC:** `OWNER` \| `MANAGER`

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `productId` | string | yes | Must be in tenant |
| `storeId` | string | no | Defaults to JWT `storeId` |
| `batchNumber` | string | yes | Unique per tenant+store+product |
| `expiryDate` | date | yes | Coerced from ISO / date string |
| `quantityOnHand` | int ≥ 0 | yes | |
| `costPerBase` | number ≥ 0 | yes | |
| `sellPerBase` | number ≥ 0 | yes | |
| `supplierName` | string \| null | no | Batch-level display label; Supplier/PO linkage is handled by the Slice 2 purchasing flow |
| `returnStatus` | enum | no | `ELIGIBLE` \| `NOT_ELIGIBLE` \| `MANIFEST_PREPARED`; metadata only |

**Success `201`**.

### 9.3 `GET /api/v1/batches/:id`

**Auth:** Bearer · Tenant-scoped · Margin-redacted for cashiers.

### 9.4 `PATCH /api/v1/batches/:id`

**Auth:** Bearer · **`restrictTo("OWNER", "MANAGER")`**. Cashiers receive **`403`**.

Updatable: `batchNumber`, `expiryDate`, `costPerBase`, `sellPerBase`, `supplierName`, `returnStatus` (at least one required; strict body). `quantityOnHand` is rejected. New web correction flows use the audited corrections endpoint below.

If body includes `costPerBase` or `sellPerBase` and role is `CASHIER` → **`403`** `"Cashiers cannot mutate costPerBase or sellPerBase"` (defense-in-depth; cashiers no longer reach this handler).

### 9.5 `POST /api/v1/batches/:id/corrections`

**Auth:** Bearer · **RBAC:** `OWNER` | `MANAGER`. Body: `operationId`, `expectedVersion`, reason, and at least one of `batchNumber`, `expiryDate`, `costPerBase`, `sellPerBase`, `supplierName`, `returnStatus`. Idempotent by `operationId`; writes append-only `BatchRevision`; stale version and duplicate batch number return `409`.

### 9.6 `POST /api/v1/batches/:id/adjustments`

**Auth:** Bearer · **RBAC:** `OWNER` | `MANAGER`. Body: `eventId`, `expectedVersion`, non-zero signed `quantityChange`, `reasonCode`, optional `note`. Applies the delta atomically, rejects negative result/stale version with `409`, increments version, and writes one idempotent ADJUST `InventoryEvent` with `quantityAfter`.

Reason codes: `COUNT_CORRECTION`, `DAMAGE`, `BREAKAGE`, `RETURN`, `RECEIVE_CORRECTION`, `OTHER`.

### 9.7 `POST /api/v1/batches/:id/void`

**Auth:** Bearer · **RBAC:** **`OWNER` only**. Requires `operationId`, `expectedVersion`, reason. Only a batch with no SaleItem references can be voided. Atomically removes remaining stock, writes compensating ADJUST + VOID revision, and preserves the batch/RECEIVE history.

### 9.8 `POST /api/v1/batches/:id/retire`

**Auth:** Bearer · **RBAC:** **`OWNER` only**. Same versioned/reasoned lifecycle envelope. Removes remaining stock, writes compensating ADJUST + RETIRE revision, and preserves sales/history. RETIRED batches are unavailable to FEFO/POS.

### 9.9 `GET /api/v1/owner/batches/:id`

**Auth:** Bearer · **RBAC:** **`OWNER` only**. Returns product context, prices, quantity, status/version, sale-reference count, `canVoid`, recent adjustments, and correction/lifecycle revisions.

---

## 10. Customers (`/api/v1/customers`)

### 10.1 `GET /api/v1/customers`

**Auth:** Bearer (any authenticated).  

**Query:** `q?` (name/phone/email contains), `phone?`, `name?`, `limit` (20), `offset` (0).

**Returns:** `ACTIVE` customers only (POS F8). `PENDING_APPROVAL` / `INACTIVE` / `REJECTED` are excluded. **M6 AF.**

### 10.2 `POST /api/v1/customers`

**Auth:** Bearer · **`OWNER`** → `ACTIVE` + `OWNER_CREATED` (or `POS_REGISTRATION` if `source` sent). **`MANAGER` / `CASHIER`** → `PENDING_APPROVAL` + `POS_REGISTRATION`; **extras stripped to name + phone only**. **M6 AF.**

**Body:** `{ "name": string, "phone": string, "email"?: string, "dateOfBirth"?: date, "gender"?: "MALE"|"FEMALE"|"OTHER", "address"?: string, "storeId"?: string, "source"?: "OWNER_CREATED"|"POS_REGISTRATION" }`. Owner accepts all profile extras; Cashier/Manager accepts **only** `name` + `phone` (extras ignored). `storeId` defaults to the JWT store for Cashier/Manager.

**Success `201`** returns full customer object including `status`, `source`, profile, and audit fields. **Errors:** `409` duplicate phone in tenant (unique per non-rejected customer).

### 10.3 `GET /api/v1/customers/:id`

**Auth:** Bearer. Returns any customer status (incl. pending/inactive) for back-office lookup. POS search-only is Active-filtered via `GET /` (§10.1).

### 10.4 `GET /api/v1/customers/phone-check`

**Auth:** Bearer (any authenticated). **M6 AF.**

**Query:** `phone` (required). Checks whether the phone exists as a customer in the tenant (excluding rejected). Returns `{ exists: bool, customer?: { id, name, phone, status, source } }`. Used by Owner web Add Customer and POS Create (Batch AL).

### 10.4 `PATCH /api/v1/customers/:id`

**Auth:** Bearer · **`restrictTo("OWNER", "MANAGER")`** (M5 Batch A). Cashiers receive **`403`** (search-only at POS). Owner web Edit Customer UI is **live** (Prod Batch P1) at `/customers/:id/edit`.

Partial: `name?`, `phone?`, `email?` (nullable), `dateOfBirth?` (nullable), `gender?` (nullable), `address?` (nullable), `status?` (`ACTIVE` \| `INACTIVE` only).

**Status rules:** Only `ACTIVE` ↔ `INACTIVE`. Pending / rejected customers cannot be edited via this PATCH (use approve/reject). Illegal status jumps → `400`.

**Not updatable via this PATCH:** `loyaltyPoints`, `creditBalance`, `source`, pending→active (approve route), reject.

Response objects may include `loyaltyPoints` and `creditBalance`. Desktop Select Customer **must not** surface `creditBalance` as Baki (product lock: no Baki).

**Owner web client:** Details enables Edit → `/customers/:id/edit`; phone-check ignores the same customer; unsaved-changes guard; success returns to Details.

---

## 11. Sales (`/api/v1/sales`)

### `POST /api/v1/sales/ingest`

**Auth:** Bearer  
**Purpose:** Online authenticated sale creation (append-only). Offline / Force Offline / network-5xx completes use **`POST /api/v1/sync/ingest`** instead (§19). Do **not** merge the two paths.

#### Request body

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `eventId` | string | yes | Global unique idempotency key → `Sale.eventId` |
| `storeId` | string | yes | Must belong to JWT tenant (cashiers: match assigned store) |
| `customerId` | string | no | Must be in tenant and **ACTIVE** (else `400`/`404`). **M6 AF:** ingest rejects non-active customers |
| `soldAt` | date | no | Defaults to now |
| `subtotal` | number ≥ 0 | yes | Must equal sum of `lineTotal`s |
| `discount` | number ≥ 0 | no | Default `0`; `total` must equal `subtotal − discount` |
| `total` | number ≥ 0 | yes | Must equal sum of payment `amount`s |
| `notes` | string | no | Card/MFS meta still live here |
| `loyaltyUsed` | int ≥ 0 | no | **M6 D.** With `customerId`, snapshot + subtract from `Customer.loyaltyPoints`. Omit → snapshots 0, **no** point change |
| `loyaltyEarned` | int ≥ 0 | no | **M6 D.** With `customerId` and loyalty fields present, add to customer balance |
| `items` | array | yes | Min 1 |
| `payments` | array | yes | Min 1; methods `CASH`\|`CARD`\|`MFS` |

**Line item**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `productId` | string | yes | |
| `batchId` | string | **no** | Omit → server **FEFO**-fills for store+product |
| `unitType` | `BOX`\|`STRIP`\|`PIECE` | yes | Must exist on product units |
| `unitQty` | positive int | yes | Qty in that unit |
| `quantityBase` | positive int | yes | Must equal `unitQty × factorToBase` |
| `unitPrice` | number ≥ 0 | yes | Price per sold unit |
| `lineTotal` | number ≥ 0 | yes | Must equal `unitQty × unitPrice` (cent-rounded) |
| `fefoOverride` | boolean | no | **M6 D.** Default false when omitted |
| `fefoAuthorizedByName` | string | no | Persisted only when `fefoOverride` is true |

**Payment line:** `{ "method": "CASH"|"CARD"|"MFS", "amount": number, "reference"?: string }`

#### Server behavior (transaction)

1. If `eventId` already exists for tenant → return existing sale (**no** stock change, **no** second loyalty or `InventoryEvent`).
2. Validate store access, payment sum, math, product units.
3. Resolve each batch (explicit or FEFO); reject insufficient stock (`409`).
4. Create `Sale` + `SaleItem`s + `Payment`s; decrement each batch `quantityOnHand`.
5. **M6 D:** server generates `receiptNo` (`TXN-YYMMDD-HHmm`, suffix from `eventId` on collision). Never client-supplied.
6. **M6 D:** fill `costPerBaseAtSale` from the batch (never trust client cost). Cashiers omit this key on the ingest response.
7. **M6 D:** persist line `fefoOverride` / `fefoAuthorizedByName`.
8. **M6 D:** if `customerId` **and** loyalty fields present → snapshot `loyaltyPrevious`, apply used/earned, update `Customer.loyaltyPoints`. Omitted fields → snapshots 0, no point change.
9. Write `InventoryEvent` `SALE` per line (`quantityBaseChange` negative). `POST /batches` writes `RECEIVE`; signed `/batches/:id/adjustments` and lifecycle compensation write `ADJUST`.
10. No sale delete endpoint.

#### Responses

**Created `201`**

```json
{
  "status": "success",
  "message": "Sale ingested",
  "data": { "...sale with items + payments + nested batch..." },
  "meta": { "idempotent": false }
}
```

**Idempotent replay `200`**

```json
{
  "status": "success",
  "message": "Sale already ingested",
  "data": { "...same sale..." },
  "meta": { "idempotent": true }
}
```

Nested `items[].batch` is margin-safe for cashiers (`sellPerBase` ok; no `costPerBase`). **M6 D:** cashiers also omit `items[].costPerBaseAtSale`. Response includes `receiptNo` and loyalty snapshot ints.

#### Zero-pay (loyalty full cover) — M3 Slice 2

M2 already accepts `total: 0` and payment `amount: 0` (`nonnegative`). Desktop maps:

| POS concept | Ingest field |
|-------------|--------------|
| Cart merchandise subtotal | `subtotal` |
| Loyalty redeem (1 pt = ৳1) + any cart discount | `discount` so `total = subtotal − discount` |
| Amount due ৳0 | `total: 0` |
| Tender | `payments: [{ "method": "CASH", "amount": 0 }]` (min 1 payment required) |
| Loyalty / FEFO override audit (stub) | `notes` strings (`loyaltyRedeem:…`, `fefoOverride:…`) — **not** first-class fields yet |

~~Online required for Slice 2 zero-pay complete~~ → **M4** queues Cash / Card / MFS / zero-pay when Offline, Force Offline, or ingest is network/5xx (§19). Online happy path is still this route.

#### Example (FEFO — omit `batchId`)

```json
{
  "eventId": "pos-offline-or-online-uuid-001",
  "storeId": "<store-cuid>",
  "subtotal": 12,
  "discount": 0,
  "total": 12,
  "items": [
    {
      "productId": "<product-cuid>",
      "unitType": "PIECE",
      "unitQty": 10,
      "quantityBase": 10,
      "unitPrice": 1.2,
      "lineTotal": 12
    }
  ],
  "payments": [{ "method": "CASH", "amount": 12 }]
}
```

### `GET /api/v1/sales`

**Auth:** Bearer (any authenticated). No `restrictTo`.  
**Purpose:** Paged tenant sales list. **M6 E.** Owner web Sales table = **Batch H** (live). Desktop Transactions list = **Prod Batch P13** (online; store-scoped for cashier JWT).

**Query:** `q` (receiptNo / eventId / customer name|phone / cashier name), `paymentMethod` (`CASH`\|`CARD`\|`MFS`), `userId`, `customerId`, `from`, `to`, `limit` (default 25, max 100), `offset` (default 0). Date-only `to` (UTC midnight) is treated as **end of that UTC day**.

**Envelope:** `{ status, message, data: Sale[], meta: { total, limit, offset } }`.

Each row includes `id`, `receiptNo`, customer `{ id, name, phone }` (null = walk-in), cashier `{ id, name }`, items (product names + `fefoOverride`), payments, loyalty snapshots.

**Owner only** (omitted for Manager/Cashier, not null): `costPerBaseAtSale`, `lineCogs`, `lineMargin` on lines; `cogs`, `netProfit` on the sale (`netProfit` = `total − cogs`; discounts already in `total`).

Cashiers are store-scoped when JWT `storeId` is set.

### `GET /api/v1/sales/:id`

**Auth:** Same as list. **`:id` is Prisma `Sale.id`** (list returns both `id` and `receiptNo`; `receiptNo` as the path param is **404**).

Same payload shape and redaction as a list row. **404** if missing / other tenant. Owner web Transaction Details = **M6 I** (live). Desktop Transactions detail = **Prod Batch P13** (prefer cloud by id; local fallback).

### `GET /api/v1/owner/dashboard`

**Auth:** Bearer · **`restrictTo("OWNER")`** (Manager/Cashier **403**). **M6 F.** Dashboard widgets = Batch G (live). Sales Overview KPIs / payment mix / top cashier = Batch H (live).

**Query:** `from`, `to` (ISO dates; default last **7 UTC days** including today).

**Envelope:** `{ status, message, data }`.

`data` includes: `range`, `netProfitFormula`, `kpis` (today / yesterday / vsYesterday trend `up|down|steady` / period), `dailyBars`, `paymentMix` (`CASH`/`CARD`/`MFS` amounts in range), **`salesKpis`** (period `grossSales` = sum(`subtotal`), `netSales` = sum(`total`) = gross − discounts, `discountTotal`, `txnCount`, `avgSale`, `vsPrev` vs equal-length prior window), **`topCashier`** (`userId`, `name`, `sales`, `txnCount` or `null`), **`cashiers`** (filter options: active CASHIER/MANAGER/OWNER + anyone who sold in range), `inventoryHealth` (low / out / expiring30d / expiring90d / expired **product** counts), `fefoOverrides` (item counts today + last 7 days), `expiringStockValue` (on-hand cost of lots expiring in 0–90 days, qty > 0), `staff.activeCashiers` (live CASHIER count; `openShifts` / `cashVarianceToday` are `null` until cloud shift), `recentSales` (last 8 in range; `id` + `receiptNo`).

**Net profit:** `sum(sale.total) − sum(costPerBaseAtSale * quantityBase)` for the window (discounts already in `total`). Missing cost snapshots contribute 0 COGS.

**Low stock:** `reorderLevel != null` AND `0 < onHand ≤ reorderLevel`. **Out of stock:** active product, onHand = 0. **Expiry buckets:** qty > 0; 0–30 / 31–60 / 61–90 days; Expired = expiry < today UTC.

### `GET /api/v1/owner/inventory-summary`

**Auth:** Same OWNER-only. Snapshot for Inventory cards (Batch J).

`data.totals`: `productCount` (active), `onHandPieces`, `costValue` (`qty * costPerBase`). Counts: `lowStockCount`, `outOfStockCount`, `expiring30dCount`, `expiring90dCount`, `expiredCount` (product-level).

### `GET /api/v1/owner/inventory`

**Auth:** Same OWNER-only. **M6 J.** Inventory list UI = live.

**Query:** `q` (name / generic / SKU / barcode), `tab` = `all` \| `low` \| `out` \| `expiring30` \| `expiring90` \| `expired` (default `all`), optional `supplierId` (**Prod P4** — products linked via ACTIVE `Batch.supplierId` and/or purchase-order lines for that supplier; same rule as Supplier Details products), `limit` (max 100, default 25), `offset`.

**Envelope:** `{ status, message, data, meta }`. `meta.total` / `limit` / `offset` required.

`data.items[]`: `productId`, `name`, `genericName`, `manufacturer` (null if unset — never invented), `sku`, `barcode`, `coldChain`, `quantityOnHand`, `nearestExpiry`, `batchCount` (lots with qty > 0), `costPerBase`, `sellPerBase`, `marginPct` (`(sell − cost) / sell`), `status` (`healthy` \| `low` \| `out` \| `expiring` \| `expired`).

`data.tabs`: All / Low / Out are **product** counts; Expiring 30d / 90d / Expired are **in-stock batch** counts. `data.summary` / `data.attention` drive the Inventory cards + right rail.

**Low / out / expiry rules:** same as inventory-summary / dashboard. Cost columns are Owner-only because the route is Owner-only.

### `GET /api/v1/owner/expiry`

**Auth:** Same OWNER-only. **M6 F.** Expiry Management UI = Batch N.

**Query:** `bucket` = `0_30` \| `31_60` \| `61_90` \| `expired` (optional; omit = all four). Always returns `counts` for every bucket.

**Rows:** `productId`, `productName`, `genericName`, `batchId`, `batchNumber`, `expiryDate`, `quantityOnHand`, `costValue`, `fefoRank` (1 = earliest expiry among in-stock lots of that product), `supplierName`, and `returnStatus`. Supplier/return values are batch metadata only; no manifest workflow. Max 500 rows.

---

## 12. Typical cashier POS flow (using these APIs)

```text
1. POST /auth/login                          → accessToken + refreshToken
2. GET  /products?q=Napa                     → pick product (desktop enriches from batches)
3. GET  /batches?productId=:id               → Select Batch list (FEFO + expired rows)
4. GET  /products/:id/fefo-batch             → optional; desktop prefers sellable FEFO for search card
5. GET  /products/:id/substitutes            → alternate brands (same generic) — wired M3 Batch AG (F4)
6. GET  /customers?q=…                       → Select Customer (F8); Create form = later slice
7. POST /sales/ingest                        → online complete (zero-pay · Cash · Card/MFS)
7b. POST /sync/ingest                        → M4 worker flush of queued offline sales (same payload / eventId)
8. On 401: POST /auth/refresh                → new tokens; retry
9. On logout: POST /auth/logout              → revoke refresh
```

**Demo seed — Napa 500mg (`sku: NAPA-500`, Beximco)** after `npm run db:seed`:

| Batch No. | Expiry | Qty | Select Batch status |
|-----------|--------|-----|---------------------|
| `NP23091` | 2026-08-31 | 14 pcs | **FEFO Recommended** (search card front) |
| `NP24031` | 2026-10-31 | 124 pcs | Standard |
| `NP24052` | 2027-03-31 | 86 pcs | Standard |
| `NP23010` | 2024-05-31 | 12 pcs | Expired - Not Sellable (detail only) |

Retired demo lot `NP-2408-A` is zeroed on re-seed (kept if referenced by `SaleItem`).

Owner catalog setup (before POS):

```text
POST /products → POST /batches → POST /users (cashier)
```

---

## 13. Where the code lives

| Concern | Path |
|---------|------|
| App mount | `apps/server/src/app.ts`, `src/routes/index.ts` |
| Auth | `apps/server/src/modules/auth/` |
| Users | `apps/server/src/modules/user/` |
| Products / FEFO / substitutes | `apps/server/src/modules/product/` |
| Batches | `apps/server/src/modules/batch/` |
| Suppliers / purchase orders | `apps/server/src/modules/purchasing/` |
| Customers | `apps/server/src/modules/customer/` |
| Sales ingest + list/detail | `apps/server/src/modules/sale/` |
| Sync ingest | `apps/server/src/modules/sync/` |
| Zod contracts | `packages/shared-types/src/` |
| Prisma schema | `packages/database/prisma/schema.prisma` |
| Exit smoke | `apps/server/scripts/m2-smoke.mjs` |
| Slice 2 exit smoke | `apps/desktop/scripts/smoke-m3u.ts` (`npm run smoke:m3u -w @r2a/desktop`) |
| Slice 3 exit smoke | `apps/desktop/scripts/smoke-m3z.ts` (`npm run smoke:m3z -w @r2a/desktop`) |
| Slice 4 exit smoke | `apps/desktop/scripts/smoke-m3ae.ts` (`npm run smoke:m3ae -w @r2a/desktop`) |
| M4 cloud ingest smoke | `apps/server/scripts/m4b-smoke.mjs` (`npm run smoke:m4b -w @r2a/server`) |
| M6 GET sales smoke | `apps/server/scripts/m6e-smoke.ts` (`npm run smoke:m6e -w @r2a/server`) |
| M4 desktop exit smoke | `apps/desktop/scripts/smoke-m4.ts` (`npm run smoke:m4 -w @r2a/desktop`; composes m4a/c/d/e + m3ap) |

---

## 14. M3 Slice 2 — desktop consumption & planned APIs (Batch U)

**No new Express routes** were added for Slice 2. Desktop (`@r2a/desktop`) reuses M2 and documents stubs / gaps below.

### 14.1 Cloud routes used by Slice 2

| Desktop capability | Route(s) | Notes |
|--------------------|----------|-------|
| Session / refresh | `POST /auth/login`, `POST /auth/refresh`, `GET /users/me` | Invented login UI; tokens in webview localStorage (MVP) |
| Connectivity badge | `GET /api/v1/health` | Online/offline flip |
| Catalog search / batches | `GET /products`, `GET /batches`, `GET /products/:id/fefo-batch` | Offline = SQLite cache |
| Select Customer (F8) | `GET /customers` | No Baki UI; Create **removed** (Owner web M6) |
| Zero-pay complete | `POST /sales/ingest` | Loyalty → `discount`; CASH ৳0; see §11 |

### 14.2 Desktop-only (no cloud)

| Feature | Behavior |
|---------|----------|
| Edit Sale Item / Change Batch / Active Cart | Local cart state |
| Manager FEFO Authorization | Stub: any **4-digit** PIN + local “Authorized By” list |
| Loyalty OTP verify | Stub: any **6-digit** OTP |
| Continue without redeeming | Opens **Payment - Select Method** (Slice 3 Batch V) |
| Loyalty calculator | `apps/desktop/src/lib/loyaltyCalc.ts` + `loyaltyRedeem.ts` — redeem 1:1 ৳, eligibility ≥50, cap `min(pts, floor(sale))`, earn `floor(net/100)` unless full cover → earn 0 |
| Sale Completed loyalty bal | Session display only (previous / earned / used / current) |
| Print receipt | See **§15** (print stub) + **§16** (Receipt Preview) |
| Chrome | Locked to **Search Results - Napa** |

### 14.3 Planned / TODO cloud endpoints (do not forget)

Recorded from Slice 2 locks — implement later (not in Batch U):

| Need | Suggested direction |
|------|---------------------|
| Real manager FEFO override | Verify MANAGER/OWNER PIN or password; role check; audit log; **FEFO override flag on sale line / ingest** |
| Real loyalty OTP | Send SMS/WhatsApp (n8n later); server-side verify; rate limit |
| Loyalty earn/redeem persistence | Authoritative mutation on sale ingest (or dedicated routes); extend `PATCH /customers` and/or ingest payload beyond `discount`/`notes` |
| ~~Offline completed sale → queue~~ | **Done in M4** (§19) — `outbound_sync_queue` + `POST /sync/ingest` |

~~Cash / Card / MFS tender~~ → Slice 3 Cash (§15) + Slice 4 Card/MFS (§16) done.

### 14.4 Slice 2 exit smoke

```bash
npm run smoke:m3u -w @r2a/desktop
```

Checks loyalty calculator units, static no-tender/Baki/M4 guards, and live zero-pay `POST /sales/ingest` (1 PIECE Napa, loyalty discount → total 0).

---

## 15. M3 Slice 3 — tender + print stub (Batch Z)

**No new Express routes** were added for Slice 3. Desktop reuses M2 `POST /sales/ingest` for Cash and keeps Card/MFS detail gated.

### 15.1 Cloud routes used by Slice 3

| Desktop capability | Route(s) | Notes |
|--------------------|----------|-------|
| Session / health / catalog | Same as §14.1 | Unchanged |
| Select Customer (F8) | `GET /customers` | Walk-in allowed on Payment (hide points row) |
| Loyalty zero-pay | `POST /sales/ingest` | Still CASH ৳0 + loyalty → `discount` (§11 / §14) |
| Cash tender complete | `POST /sales/ingest` | `payments: [{ method: "CASH", amount: due }]`; cash received / change go in `notes` only (`cash:recv=…;change=…`) — **not** payment amount |

### 15.2 Desktop-only (no cloud)

| Feature | Behavior |
|---------|----------|
| Payment - Select Method | Cash / Card / MFS cards; **single method** only; ←→ no Tab |
| Cash Payment | Exact Amount / change; Complete when received ≥ due |
| Card / MFS detail | ~~Gated~~ → **Slice 4** ungated (§16) |
| Shared Sale Completed | One shell for loyalty zero-pay + cash settlement variant |
| Print stub states | `idle → printing → printed` or `failed → retrying → …`; auto-start; footer **SYSTEM BUSY** / **READY** |
| Print QA fail | Dev: `window.__r2aArmPrintFailOnce()` then Reprint / Retry |
| Loyalty calculator | Reused (`loyaltyCalc`); earn **1 pt / ৳100** unchanged |
| Chrome | Static **Search Results - Napa** |

### 15.3 TODOs (Slice 3 exit — do not forget)

| Need | Notes |
|------|-------|
| Real Tauri **printer IPC** | Shared sample is **58mm** thermal; format ESC/POS from sale data — do not invent a full layout engine in UI. See `apps/desktop/src/lib/printStub.ts` + `apps/desktop/README.md`. **Still open** (Slice 4 Receipt Preview feeds same model). |
| ~~**Card** payment detail~~ | **Done in Slice 4** (§16) — stub terminal only |
| ~~**MFS** payment detail~~ | **Done in Slice 4** (§16) — providers + invented confirm |
| Loyalty earn/redeem persistence | Same gap as §14.3 — session display only today |
| ~~Offline cash/zero-pay → queue~~ | **Done in M4** (§19) |

### 15.4 Slice 3 exit smoke

```bash
npm run smoke:m3z -w @r2a/desktop
```

Checks earn lock, print stub helpers + IPC TODO, Payment/Cash/Sale Completed wiring, Card/MFS/Baki/M4 guards *(historical: Card/MFS were gated at Z)*, live walk-in cash ingest + zero-pay ingest.

**Manual UI path (Slice 3 era):** Continue without redeeming → Payment → Cash → change → Sale Completed → print states; Card/MFS were gated then. For Card/MFS + Receipt Preview see **§16**.

---

## 16. M3 Slice 4 — Card / MFS / Receipt Preview (Batch AE)

**No new Express routes** were added for Slice 4. Desktop reuses M2 `POST /sales/ingest` with `CARD` / `MFS` payment methods; provider / terminal meta go in `notes` only (schema has no payment-provider field).

### 16.1 Cloud routes used by Slice 4

| Desktop capability | Route(s) | Notes |
|--------------------|----------|-------|
| Session / health / catalog / customers | Same as §14.1 / §15.1 | Unchanged |
| Loyalty zero-pay | `POST /sales/ingest` | Still CASH ৳0 + loyalty → `discount` |
| Cash tender | `POST /sales/ingest` | `payments: [{ method: "CASH", amount: due }]`; recv/change in `notes` |
| Card tender complete | `POST /sales/ingest` | `payments: [{ method: "CARD", amount: due }]`; notes `card:status=Approved` |
| MFS tender complete | `POST /sales/ingest` | `payments: [{ method: "MFS", amount: due }]`; notes `mfs:provider=BKASH\|NAGAD\|ROCKET;payer=…;trx=…` (trx optional) |

**Single tender** still holds: one payment line per sale. Amount = amount due (not cash received).

### 16.2 Desktop-only (no cloud)

| Feature | Behavior |
|---------|----------|
| Receipt Preview | Inline beside Sale Completed; **80mm** default / **58mm** toggle; dynamic ITEM/QTY/RATE/AMT from completed sale; stub pharmacy header (`STUB_PHARMACY_HEADER`); `INV-…` + `TXN-…` |
| Print action | Stub states (Batch Y) run in parallel with preview; same `ReceiptPrintModel` for future IPC |
| Card Payment stub | Not Started → Processing → Approved (ingest) \| Declined \| Cancelling → Declined; Retry; sale stays active on decline |
| Card QA fail | Dev: `window.__r2aArmCardDeclineOnce()` then Start |
| MFS Provider Select | **bKash / Nagad / Rocket** only |
| MFS Confirm / Result | **Desktop-invented** (payer mobile + optional Trx ID → processing → success Sale Completed or fail/retry). Replace when Figma shared |
| MFS QA fail | Dev: `window.__r2aArmMfsFailOnce()` then Confirm |
| Sale Completed variants | Cash / Card (Approved) / MFS (+ provider) / loyalty zero-pay — shared shell |
| Loyalty calculator | Reused; walk-in hides points |
| Chrome | Static **Search Results - Napa** |

### 16.3 TODOs (Slice 4 exit — do not forget)

| Need | Notes |
|------|-------|
| Real Tauri **printer IPC** | Serialize `ReceiptPrintModel` (80/58) to ESC/POS / driver — see `printStub.ts` + `receiptModel.ts` |
| Real **card terminal** SDK / bridge | Replace `runCardTerminalStub` / cancel stub |
| Real **MFS** provider APIs / webhooks | Backend confirms real txn status → desktop shows result only; **no cashier manual Trx**. Replace invented confirm + `runMfsCollectStub`. First-class provider + Trx on Payment if schema extended |
| Settings → live pharmacy header | ~~Replace `STUB_PHARMACY_HEADER`~~ → **Done in Slice 5** (§17) |
| Replace invented MFS confirm/result | When user shares Figma |
| Loyalty earn/redeem persistence | Same gap as §14.3 |
| ~~Offline complete → queue~~ | **Done in M4** (§19) |

### 16.4 Slice 4 exit smoke

```bash
npm run smoke:m3ae -w @r2a/desktop
```

Checks earn lock, print + card + MFS stubs/TODOs, Receipt Preview 80/58 dynamic lines, Payment Card/MFS ungated wiring, no Baki/M4, live CASH + CARD + MFS + zero-pay ingest.

**Manual UI path:** Payment → Card (happy / decline / cancel); Payment → MFS provider → invent confirm → complete; Receipt Preview 80/58; Cash + loyalty paths unbroken; single tender; F2 New Sale.

---

## 17. M3 Slice 5 — F4 / Settings header / Force Offline / Transactions / Shift (Batch AL)

**No new Express routes** were added for Slice 5. Desktop consumes existing M2 routes and local invent surfaces. Create Customer is **gone from POS**; cloud create is **OWNER-only**.

### 17.1 Cloud routes used / tightened in Slice 5

| Desktop capability | Route(s) | Notes |
|--------------------|----------|-------|
| Session / health / catalog / customers search | Same as §14–§16 | Unchanged |
| Generic Substitutes [F4] | `GET /products/:productId/substitutes` | Online only; offline/empty invent states |
| Sale tenders (unchanged) | `POST /sales/ingest` | Cash / Card / MFS / loyalty zero-pay as before |
| Create customer | `POST /customers` | **`restrictTo("OWNER")` only** — not on desktop POS; Owner web later |

### 17.2 Desktop-only (no cloud)

| Feature | Behavior |
|---------|----------|
| F4 Generic Substitutes | Invent modal; focus rule: search row → cart line → else toast; Enter → Select Batch |
| Settings — Pharmacy / Receipt Header | localStorage `pharmacyHeaderStore` (tenant+store); Owner/Manager edit, Cashier view-only; Receipt Preview + print model resolve with stub fallback |
| Force Offline / Stay Offline | Sticky localStorage `forceOfflineStore`; badge menu + Settings Connectivity; probes ignored until Go Online |
| Transactions List | **Prod P13:** online `GET /api/v1/sales` (store-scoped) + merge local-only pending ingest; offline `transactionLogStore` (tenant+store) |
| Transactions Detail + Reprint | **Prod P13:** prefer `GET /sales/:id`; fallback local snapshot; Receipt Preview + print stub until S2 |
| Shift Open / Close | Local `shiftStore` (tenant+store); Counter Ready Active Shift reads it; **soft gate:** New Sale [F2] requires open shift (toast + opens Shift panel); connectivity badge unchanged; **no** cloud shift API (TODO when authorized) |
| Create Customer on POS | **Removed** (AF) |

### 17.3 TODOs (Slice 5 exit — do not forget)

| Need | Notes |
|------|-------|
| ~~Cloud sales **list** API~~ | **DONE Prod P13** — desktop uses existing M6 E `GET /sales` + `GET /sales/:id` |
| Cloud **shift** open/close API | Replace local `shiftStore` when authorized |
| Owner web Create Customer | `apps/web` — not desktop |
| Real Tauri **printer IPC** | Still open (§16.3) |
| Real **card** SDK / **MFS** APIs | Still open (§16.3); MFS = backend-confirmed status, no cashier Trx |
| ~~M4 sync flush worker~~ | **Done in M4** (§19) |
| Loyalty earn/redeem persistence | Same gap as §14.3 |

### 17.4 Slice 5 exit smoke

```bash
npm run smoke:m3al -w @r2a/desktop
```

Checks shift store helpers, Shift UI + Counter Ready wiring, Slice 5 DoD source checklist (F4, pharmacy header→receipt, Force Offline, Transactions list/detail/reprint, Create Customer absent, POST customers OWNER-only, catalog §17, no M4).

**Manual UI path:** Sidebar Shift → Open/Close → Counter Ready Active Shift updates; F4 on search/cart; Settings header → Receipt Preview; Force Offline sticky; Transactions list → detail → Reprint; Create Customer absent from Select Customer.

---

## 18. Hold / Park Sale (M3 Slice 6 AP + Prod P12 cloud)

**M3 Slice 6** shipped local soft holds. **Prod Batch P12** adds store-scoped cloud soft holds (still **no** stock reservation).

### 18.1 Cloud routes (Prod P12)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/api/v1/held-sales` | Bearer | `CASHIER`, `MANAGER`, `OWNER` | Create soft hold; optional client `id` for offline push; store max **3** |
| GET | `/api/v1/held-sales` | Bearer | same | List active `HELD` for JWT store (newest first) |
| GET | `/api/v1/held-sales/:heldSaleId` | Bearer | same | Get one active hold |
| POST | `/api/v1/held-sales/:heldSaleId/discard` | Bearer | same | Mark `DISCARDED` |
| POST | `/api/v1/held-sales/:heldSaleId/resume-ack` | Bearer | same | Mark `RESUMED` after desktop soft recheck + cart restore |

**Locks:** Soft hold only — does **not** change `quantityOnHand`. Max 3 **store-scoped** when online. Reconnect: cloud canonical; push local-only holds if not discarded. Mid-payment Hold still aborts card/MFS stubs and must **not** ingest.

Resume stock/expiry recheck (online) still uses existing `GET /batches?productId=` (unchanged). Sale tenders still `POST /sales/ingest` (unchanged).

### 18.2 Desktop

| Feature | Behavior |
|---------|----------|
| Online | Cloud CRUD via `cloudHeldSales`; local `heldSaleStore` mirrors cloud cache |
| Offline | Existing `heldSaleStore` localStorage; max 3 per terminal |
| Go Online | `reconcileHeldSalesOnOnline` — push local-only, then replace local with cloud list |
| Snapshot | Cart lines (incl. FEFO override meta) + customer + loyalty. **Does not** persist tender drafts |
| Hold [F6] | Same UX; mid-payment aborts card/MFS stubs |
| Held Sales list | F7; ↑/↓ · ←/→ Resume / Discard · Enter · Esc; **no Tab** |
| Resume | Soft recheck strip/clamp; resume-ack on cloud when online |

```bash
npm run smoke:prod-p12 -w @r2a/desktop
```

### 18.3 Still deferred

| Item | Notes |
|------|-------|
| Hard reservation / inventory lock on holds | Explicitly out of scope (soft hold only) |
| Auto-expiry sweeper for `expiresAt` | Optional field only; no sweeper in P12 |

### 18.4 Historical Slice 6 exit smoke

```bash
npm run smoke:m3ap -w @r2a/desktop
```

Checks held-sale store max-3 + soft recheck + F6/F7 abort wiring. Cloud hold routes are covered by `smoke:prod-p12`.

**Manual UI path (P12):** Online F6 on terminal A → F7 on terminal B (same store) shows the hold; Resume / Discard sync via cloud; Force Offline → local holds; Go Online reconciles (cloud canonical + push local-only).

---

## 19. M4 — One-way sync (Batch F)

One new Express route: **`POST /api/v1/sync/ingest`**. Desktop POS still uses `POST /sales/ingest` when online and not Force Offline. Offline / Force Offline / network-5xx completes enqueue locally; a 15s TypeScript worker flushes FIFO through this route. Reuses `ingestSale` (delta stock, `eventId` idempotency). **No** new cloud list API for the Sync Queue panel.

### 19.1 `POST /api/v1/sync/ingest`

**Auth:** Bearer (`protect` + `tenantContext`). JWT `tenantId` only — body `tenantId` is ignored.  
**Roles:** Any authenticated (`OWNER` / `MANAGER` / `CASHIER`). Cashiers still never receive `costPerBase` on nested batches.  
**Module:** `apps/server/src/modules/sync/` (`router → controller → service`). Mounted on `domainRouter` at `/sync`.  
**Does not** replace or change `POST /api/v1/sales/ingest`.

#### Request body (snake_case envelope)

Validate with `syncIngestBatchSchema`. Wrapper invalid (empty `events`, schema fail) → **400**. Per-event poison does **not** 400 the batch.

```json
{
  "events": [
    {
      "event_id": "<same as Sale.eventId / queue row id>",
      "entity_type": "sale",
      "action": "create",
      "payload": { "...camelCase SaleIngestInput..." },
      "created_at": "2026-08-14T08:00:00.000Z"
    }
  ]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `events` | array | yes | Min 1. Processed **in array order** |
| `events[].event_id` | string | yes | Idempotency key; mapped onto `payload.eventId` before `ingestSale` |
| `events[].entity_type` | enum | yes | M4 processes **`sale` only**. `stock_delta` / `product` / `customer` → that event `rejected` |
| `events[].action` | enum | yes | M4 processes **`create` only** |
| `events[].payload` | object | yes | camelCase `saleIngestSchema` (`eventId`, `storeId`, `items`, `payments`, …) — same DTO as §11 |
| `events[].created_at` | date | no | Queue timestamp; unused by cloud stock logic |

#### Per-event processing

| Case | `data.results[].status` |
|------|-------------------------|
| `sale` + `create` + valid payload + new `eventId` | `accepted` — `ingestSale` commits sale + decrements `quantityOnHand` (delta, never absolute overwrite) |
| Same `eventId` already in Postgres | `duplicate` — **no** second stock hit (`ingestSale` idempotent no-op) |
| Payload fails `saleIngestSchema` | `rejected` + `message` (Zod). Batch continues |
| `ingestSale` 4xx (`AppError`) | `rejected` + `message`. Batch continues |
| Unsupported `entity_type` / `action` | `rejected` (`unsupported entity_type/action: …`) |
| 5xx inside `ingestSale` | Propagates — not converted to `rejected` |

**HTTP 200** with the locked success envelope even when some events are `rejected` (partial success). Earlier accepted rows stay committed.

```json
{
  "status": "success",
  "message": "Sync ingest processed",
  "data": {
    "results": [
      { "eventId": "evt-1", "status": "accepted", "sale": { } },
      { "eventId": "evt-1-again", "status": "duplicate", "sale": { } },
      { "eventId": "evt-bad", "status": "rejected", "message": "unsupported entity_type/action: product/create" }
    ]
  }
}
```

`results[]` is camelCase (`eventId`, `status`, `message?`, `sale?`). Nested `sale` omits `costPerBase` for cashiers.

**No token → 401.**

### 19.2 Desktop complete-or-queue

Helper: `completeSaleOrQueue` in `apps/desktop/src/lib/saleIngest.ts`. Wired on Cash / Card / MFS / zero-pay in `App.tsx`. Uses connectivity `isOnline` + `forcedOffline` (not only `navigator.onLine`).

| When | Path |
|------|------|
| Online **and** not Force Offline | `POST /api/v1/sales/ingest` (unchanged happy path) |
| Offline, Force Offline, or ingest **network / 5xx / 408 / 429** | Enqueue then **same** Sale Completed + Receipt Preview |
| Online ingest **4xx** (validation, 404, 409 stock, 401) | **Do not** enqueue; stay on payment |

Enqueue rules:

- Queue row **`id` = `payload.eventId`**. Re-enqueue of the same id is idempotent (no duplicate row).
- `entity_type: "sale"`, `action: "create"`, payload = camelCase `SaleIngestInput`.
- Local catalog: `apply_cached_stock_delta(batchId, −quantityBase)` per line with `batchId`; clamp ≥ 0.
- Still append `transactionLogStore`. Optional queued toast (i18n). **No** distinct Queued Completed screen.
- Hold during card/MFS still aborts stubs and **must not** enqueue.

### 19.3 Local queue + 15s worker

Table `outbound_sync_queue` (SQLite / memory backend parity):

| Column | Notes |
|--------|-------|
| `id` | = sale `eventId` |
| `entity_type`, `action`, `payload`, `created_at` | Envelope; payload JSON TEXT |
| `synced` | 1 after `accepted` / `duplicate` |
| `attempt_count` | Transient retries |
| `last_error`, `last_attempt_at` | Last flush error / time |
| `dead` | 1 = dead-letter (not pending) |

`countUnsynced` = `synced = 0 AND dead = 0`.

Worker (`apps/desktop/src/lib/syncWorker.ts`) runs in the **webview** (not Rust HTTP — tokens are in localStorage):

| Lock | Behavior |
|------|----------|
| Interval | **15s**; also flush on start (if online), **Go Online**, and browser `online` |
| Pause | Force Offline **or** connectivity `mode !== "online"` |
| FIFO | Oldest `created_at`, then `id`. Up to **10** events per tick (`list_sync_pending`) |
| POST | `{ events: [...] }` snake_case envelope; `payload` already camelCase |
| `accepted` / `duplicate` | `mark_sync_synced` |
| Poison **4xx** (`rejected`) | `mark_sync_dead` immediately; continue FIFO |
| Transient **network / 5xx / timeout** | `mark_sync_attempt` on the **head** row only; **stop the tick** |
| Backoff | Skip head if `last_attempt_at` newer than `min(15s × 2^(attempt_count−1), 240s)` |
| Max transient | **8** then dead-letter |
| **401 / 403** | Token refresh once via `apiRequest`; if still failing: badge `syncError`, **do not** dead-letter, stop tick |
| After accepted/duplicate | Optional fire-and-forget `catalogPull` (not bi-di sync) |

Dev helpers (browser console): `__r2aFlushSyncNow()` · `__r2aMarkHeadSyncDead()`.

### 19.4 Sync Queue panel (desktop-only — no cloud list API)

Opened from the connectivity **badge** menu (**Sync queue**) and **Settings → Connectivity → Open sync queue**. Overlay panel (Shift / Held family). **No** new sidebar item.

| Piece | Behavior |
|-------|----------|
| Header | Sync queue · Pending n · Failed n (Latin digits) |
| Rows | Time · `TXN-` / `eventId` tail · ৳ from payload · Pending / Syncing / Failed |
| Sort | Failed first (`dead = 1`), then pending by `created_at` |
| Keys | ↑/↓ · Enter Retry on Failed (`retry_sync_event`) · Esc close · **no Tab** |
| Retry | Clears `dead` / `attempt_count` / `last_error`. Does **not** delete the sale |
| Empty | All synchronized |

i18n: `en.ts` + `bn-BD.ts`. Domain `eventId` / ৳ / `last_error` stay as data.

### 19.5 TODOs (M4 exit — do not forget)

| Need | Notes |
|------|-------|
| **409 conflict UX** | **DONE** in M5 (**§20 — M5**). Failed Sync Queue rows show i18n copy + raw `last_error`; Enter Retry. Still **no** void — do not invent void here |
| Bi-directional catalog/stock sync | **M6** |
| Cloud `GET /sales` / cloud shift | **GET /sales live (M6 E)**. Cloud shift still open (§17.3) |
| Hard reservation / cloud hold | Still open (§18.3) |
| Real printer IPC / card SDK / MFS APIs | Still open (§16.3); MFS = backend-confirmed status, no cashier Trx |
| Baki tender | Not a payment method |
| Slice 7+ POS screens | When shared — not invented ahead |

### 19.6 M4 exit smokes

```bash
# Cloud (server must be running)
npm run smoke:m2 -w @r2a/server
npm run smoke:m4b -w @r2a/server

# Desktop (Node; no live cloud required)
npm run smoke:m4 -w @r2a/desktop
```

`smoke:m4` composes `smoke:m4a` (queue IPC) · `smoke:m4c` (complete-or-queue) · `smoke:m4d` (15s worker) · `smoke:m4e` (Sync Queue panel) · `smoke:m3ap` (Hold guard: App still does not POST `/sync/ingest`; worker owns flush) + catalog §19 / status DONE checks.

**Manual reconnect path:** Force Offline → sell Napa Cash → Sale Completed → Sync queue Pending → Go Online → wait ≤15s (or `__r2aFlushSyncNow()`) → All synchronized / badge Synced. No second receipt popup. Online (not forced) Cash still uses `/sales/ingest`.

---

## 20. M5 — MVP hardening (Batch F)

**§20 — M5** closes Milestone 5. **No new cloud routes.** Desktop POS + existing M2/M4 APIs. Print stub and FEFO PIN stub stay. Owner web remains a stub (**M6**).

> **Current-contract amendment (W6, 2026-08-18):** M5 shipped the absolute PATCH workflow documented below. It is historical and superseded. Desktop now uses signed `POST /batches/:id/adjustments`; general PATCH cannot mutate quantity. Sale void remains forbidden; batch void/retire are separate audited lifecycle operations.

### 20.1 PATCH roles (Batch A)

| Method | Path | Roles after M5 |
|--------|------|----------------|
| `PATCH` | `/api/v1/customers/:id` | **`OWNER`, `MANAGER`** — cashier `403` (search-only at POS) |
| `PATCH` | `/api/v1/batches/:id` | **`OWNER`, `MANAGER`** — cashier `403` (including qty). Receiving is the qty path |
| `POST` | `/api/v1/customers` | **`OWNER` only** (unchanged; not on desktop POS) |
| `POST` | `/api/v1/batches` | **`OWNER`, `MANAGER`** (unchanged) |

Cashier GET still omits `costPerBase`. Price-field `403` remains defense-in-depth. `smoke:m2` includes cashier PATCH 403s.

### 20.2 Receive stock (desktop-only — Batches B–C)

**No new cloud routes.** Owner/Manager **Settings → Receive stock** (cashier: section omitted, not a locked row). Online only — Force Offline / `mode !== "online"` → toast; **no** GRN queue.

| Mode | Call |
|------|------|
| Add lot | `POST /api/v1/batches` (`productId`, `batchNumber`, `expiryDate`, `quantityOnHand` PIECE, `costPerBase`, `sellPerBase`) |
| Adjust qty | `PATCH /api/v1/batches/:id` `{ quantityOnHand }` (absolute on-hand) |

Success → i18n toast + `catalogPull`. Cost fields visible here (Owner + Manager). No new sidebar item. No CSV. Supplier-return bucket = **M6**.

### 20.3 409 Sync Queue copy (Batch D)

Failed `outbound_sync_queue` rows (`dead = 1`): i18n `syncQueue.conflictReason` when `last_error` looks like insufficient stock / `409` / conflict, **plus** raw `last_error` as data. Enter still **Retry** (`retry_sync_event`). **No** void / delete sale. Online ingest **4xx/409** still stays on payment (does not enqueue). Stage with `__r2aMarkHeadSyncDead()` (defaults to `409 Insufficient stock`).

### 20.4 Paged catalog pull (Batch E)

Desktop `catalogPull` pages `GET /products` (`isActive=true`) and `GET /batches` with `limit=100` + `offset` until `meta.total`. Hard cap **50** pages (5000 rows) per resource; i18n toast if truncated; still replace cache with what was fetched. `replaceCatalogCache` once at the end. **Never** cache `costPerBase` (`mapBatch` drops it). No CSV. Not bi-directional sync (**M6**).

### 20.5 Stubs still out (not M5)

Print stub (`TODO(real printer IPC)`), FEFO PIN stub (any 4-digit + local Authorized By; **no** `pinHash`), real card SDK, real MFS APIs, loyalty persist, cloud `GET /sales`, cloud shift, Owner web, sale void, on-account tender, Slice 7+, CSV onboarding, hard holds.

### 20.6 M5 exit smokes

```bash
# Cloud (server must be running)
npm run smoke:m2 -w @r2a/server
npm run smoke:m4b -w @r2a/server

# Desktop (Node; composes m5a–m5e + smoke:m4 + §20 / DONE / runbook)
npm run smoke:m5 -w @r2a/desktop
```

Dev runbook: [`docs/DEV_RUNBOOK.md`](docs/DEV_RUNBOOK.md).

**Manual pilot path:** Owner Receive stock → cashier sells Napa Cash online → cashier has no Receive stock → Force Offline sale + Sync queue (409 copy if staged). Print / FEFO PIN remain stubs.

---

## 21. M6 — Owner Web Slice 1 (Batch O)

Slice 1 is **DONE**. The overall M6 milestone remains **IN PROGRESS** because purchasing, Manager web, bi-directional sync, n8n, and PostgreSQL RLS are later authorized slices.

### 21.1 Owner web surface

`apps/web` is OWNER-only. Manager and Cashier sessions are rejected by the web client after authenticated user resolution.

| Screen | Web route | Live API |
|--------|-----------|----------|
| Dashboard | `/` | `GET /api/v1/owner/dashboard` |
| Sales | `/sales` | `GET /api/v1/sales` + dashboard summary fields |
| Transaction Details | `/sales/:id` | `GET /api/v1/sales/:id` |
| Inventory | `/inventory` | `GET /api/v1/owner/inventory` |
| Expiry Management | `/inventory/expiry` | `GET /api/v1/owner/expiry` |
| Add Product | `/inventory/new` | `POST /api/v1/products` |
| Product Details | `/inventory/:productId` | `GET /api/v1/owner/products/:id` |
| Edit Product | `/inventory/:productId/edit` | `PATCH /api/v1/products/:id` |
| Receive Stock | `/inventory/:productId/receive` | `POST /api/v1/batches` |
| Manage Batch | `/inventory/:productId/batches/:batchId` | `GET /api/v1/owner/batches/:id` + audited batch operations |

All Owner web interface copy uses `en` / `bn-BD` translation keys. Runtime product, customer, batch, receipt, SKU, barcode, phone, and transaction values are not translated.

### 21.2 Sales ingest extensions

`POST /sales/ingest` and offline `POST /sync/ingest` share the same ingest service:

- Server generates tenant-unique `receiptNo`; clients cannot supply it.
- Server snapshots batch cost into `SaleItem.costPerBaseAtSale`; client cost is never trusted.
- Optional `loyaltyUsed` / `loyaltyEarned` update the selected customer's balance once and persist sale snapshots.
- Optional line `fefoOverride` / `fefoAuthorizedByName` persist the override audit signal.
- Idempotent `eventId` replay never repeats stock, loyalty, sale, or InventoryEvent mutations.
- Historical product/generic/batch/expiry values remain on `SaleItem` after later catalog edits.

### 21.3 Owner read APIs and redaction

| Method | Path | Access / contract |
|--------|------|-------------------|
| `GET` | `/api/v1/sales` | Any authenticated; tenant/store scoped; pagination `meta.total` |
| `GET` | `/api/v1/sales/:id` | Any authenticated; `:id` is `Sale.id` |
| `GET` | `/api/v1/owner/dashboard` | OWNER only; sales/profit/trend/payment/cashier/inventory KPIs |
| `GET` | `/api/v1/owner/inventory-summary` | OWNER only; product/on-hand/value and risk counts |
| `GET` | `/api/v1/owner/inventory` | OWNER only; paged inventory rows with cost/sell/margin; optional `supplierId` (Prod P4) |
| `GET` | `/api/v1/owner/products/:id` | OWNER only; product, units, lots, FEFO ranks, recent ledger |
| `GET` | `/api/v1/owner/batches/:id` | OWNER only; batch status/version, references, revisions, adjustments |
| `GET` | `/api/v1/owner/expiry` | OWNER only; expiry buckets, supplier/return metadata, max 500 rows |

Only OWNER responses expose `costPerBaseAtSale`, line COGS/margin, sale COGS, and net profit. Manager/Cashier sales reads omit those keys. Cashier catalog/batch responses still omit `costPerBase`.

### 21.4 Product and batch extras

Product create/update supports `manufacturer`, `strength`, `form`, `category`, `requiresPrescription`, `coldChain`, `storageNotes`, `reorderLevel`, `isActive`, and Piece/Strip/Box `ProductUnit` hierarchy. Creating a product does not create stock.

Batch create/update/correction supports optional `supplierName` and `returnStatus`. These are batch metadata only:

- `ELIGIBLE`
- `NOT_ELIGIBLE`
- `MANIFEST_PREPARED`

`MANIFEST_PREPARED` does not create a manifest, reserve stock, or dispatch a return. Prepare Supplier Return remains disabled in Slice 1.

### 21.5 Inventory ledger and lifecycle

`InventoryEvent` is append-only and tenant/store scoped:

| Type | Writer | Delta |
|------|--------|-------|
| `RECEIVE` | `POST /batches` | Positive received PIECE quantity |
| `ADJUST` | Signed `/batches/:id/adjustments` or lifecycle compensation | Signed PIECE delta with resulting quantity |
| `SALE` | Sale/sync ingest | Negative sold PIECE quantity |

General `PATCH /batches/:id` never changes quantity. Signed adjustments require reason, `expectedVersion`, and idempotent `eventId`. Corrections require reason, version, and `operationId`. Batch void/retire is OWNER-only and preserves batch, revision, event, and sale history. Sales remain append-only with no void/update/delete route.

### 21.6 Expiry Management

`GET /owner/expiry` returns counts for `0_30`, `31_60`, `61_90`, and `expired`, plus rows with product/batch identity, quantity, cost value, FEFO rank, supplier label, and return status. The web screen provides medicine/batch/supplier search, bucket and metadata filters, row selection, and client-side CSV export of selected or filtered rows.

### 21.7 Slice 1 verification

```bash
# API must already be running on BASE_URL (default http://localhost:8787)
npm run smoke:m6s1
```

The composed smoke runs durable M6 A–N web guards, live M6 D–L server checks, and `smoke:m2`. Batch O result: **PASS** on 2026-08-18.

### 21.8 Later M6 backlog

Not part of Slice 1: Purchasing/Supplier/PO UI, Manager web, customer/staff/report/settings screens, real supplier-return manifests, bi-directional sync, n8n, PostgreSQL RLS, cloud shifts, real FEFO PIN, printer IPC, card SDK, MFS APIs, multi-branch, and Super Admin console. Supplier/PO APIs began in Slice 2 Batch Q (§22).

---

## 22. M6 — Slice 2 APIs (DONE)

Slice 2 **P–AD** is **complete** (2026-09-18). Overall M6 remains **IN PROGRESS** (production track Waves 3+; Manager web / n8n / RLS / bi-di still out of scope). Supplier, PO, GRN, and return-manifest cloud APIs are live (**OWNER-only**). Owner web has live Purchasing, Create PO, PO Details, Receive against PO, Suppliers, Add Supplier, Supplier Details, Expiry Returns, Create Return Manifest, and Manifest Details (Dispatch / Decision / Complete). Manager and Cashier receive `403` on `/owner/*` purchasing routes and cannot use Owner web.

### 22.0 Dual receive (locked)

| Path | When | Implementation |
|------|------|----------------|
| Inventory → Receive Stock | Ad-hoc / opening stock / no PO | Existing `POST /api/v1/batches` (Slice 1 / desktop Settings Receive) |
| Purchasing → Receive against PO | Goods vs a purchase order | `POST /api/v1/owner/purchase-orders/:poId/receipts` creates confirmed GRN + linked Batch rows + RECEIVE events; updates PO remaining qty |

Same lot table. No offline GRN. Desktop Settings Receive stays ad-hoc only.

### 22.1 Suppliers

All routes are tenant-scoped from the JWT and protected by `restrictTo("OWNER")`. Manager and Cashier receive `403`.

| Method | Path | Contract |
|--------|------|----------|
| `GET` | `/api/v1/owner/suppliers` | Query `q`, `status`, `isActive`, `limit`, `offset`; returns `meta.total`, `meta.kpis` (active/on-hold suppliers, open POs, purchases MTD + prev MTD, avg delivery days), `meta.attention` (overdue orders, open orders, eligible return queue, on-hold suppliers), and per-item `stats` (active products, last purchase, open orders, purchases MTD) — **M6 Batch X** additive |
| `POST` | `/api/v1/owner/suppliers` | Creates `ACTIVE`, `HOLD`, or `DRAFT` supplier with purchasing/return-policy fields |
| `GET` | `/api/v1/owner/suppliers/:supplierId` | Tenant supplier detail and relation counts |
| `PATCH` | `/api/v1/owner/suppliers/:supplierId` | Partial update, including `HOLD`/active state |

There is no supplier delete route. Name and non-null registration number are tenant-unique; conflicts return `409`. Owner web Add Supplier / Supplier Details / **Edit Supplier** (`/suppliers/:id/edit`, Prod P2) consume these routes.

### 22.2 Purchase orders

| Method | Path | Contract |
|--------|------|----------|
| `GET` | `/api/v1/owner/purchase-orders` | Query `q`, `status`, `supplierId`, `limit`, `offset`; returns `meta.total` and header `kpis`. Owner web Purchasing list sends `supplierId` when deep-linked from Supplier Details (Prod P3). |
| `POST` | `/api/v1/owner/purchase-orders` | Creates `SENT` by default; explicit `DRAFT` is Save as Draft |
| `GET` | `/api/v1/owner/purchase-orders/:poId` | Supplier/store/creator, product lines, quantities, costs, and receipt collection |
| `PATCH` | `/api/v1/owner/purchase-orders/:poId` | Replaces/updates draft fields and lines; non-draft PO returns `409` |

PO numbers are server-generated as `PO-YYMMDD-####` and unique per tenant. Each product may appear once. Quantities are PIECE base units; line cost is `costPerBase`. The server calculates `estimatedSubtotal`, `estimatedTax`, and `estimatedTotal`. Creating or updating a PO has no batch, stock, or `InventoryEvent` effect.

### 22.3 Confirmed goods receipts

`POST /api/v1/owner/purchase-orders/:poId/receipts` confirms a GRN against a `SENT` or `PARTIALLY_RECEIVED` PO.

**Body:** optional `supplierInvoiceRef`, optional `deliveryNote`, optional `receivedAt`, and `lines` (min 1). Each line requires `purchaseOrderLineId`, matching `productId`, positive PIECE `qty`, `batchNumber`, `expiryDate`, `costPerBase`, and `sellPerBase`.

The transaction:

- Rejects a line not belonging to the PO and rejects aggregate over-receipt with `409`.
- Generates tenant-unique `GRN-YYMM-####`.
- Creates one linked Batch per receipt line with Supplier id/name; return-enabled suppliers produce `ELIGIBLE` lots, otherwise `NOT_ELIGIBLE`.
- Writes a positive `InventoryEvent` RECEIVE with reason `PURCHASE_ORDER_RECEIPT`.
- Increments `PurchaseOrderLine.qtyReceived` and moves the PO to `PARTIALLY_RECEIVED` or `RECEIVED`.

Success `201` returns `data: { receipt, purchaseOrder }`. There is no draft GRN or offline GRN queue. Inventory's existing ad-hoc `POST /batches` receive path remains separate (see **§22.0 Dual receive**).

### 22.4 Supplier return queue and manifests

| Method | Path | Contract |
|--------|------|----------|
| `GET` | `/api/v1/owner/returns/queue` | Supplier-linked ACTIVE lots with stock; query `q`, `supplierId`, `returnStatus`, `limit`, `offset`; `meta.total` plus additive `kpis` (eligibleBatches, eligibleCostValue, manifestsPrepared, needsReview) and `suppliers` filter options |
| `POST` | `/api/v1/owner/return-manifests` | Prepare one-supplier/one-store manifest from unique `ELIGIBLE` batches; optional `notes` / `supplierReference`; snapshots cost and sets batches to `MANIFEST_PREPARED` without moving stock |
| `GET` | `/api/v1/owner/return-manifests/:manifestId` | Supplier/store/actor details, lines, product and current batch state |
| `POST` | `/api/v1/owner/return-manifests/:manifestId/dispatch` | PREPARED only; requires `operationId`; atomically decrements each batch and writes ADJUST events with `SUPPLIER_RETURN_DISPATCH` |
| `POST` | `/api/v1/owner/return-manifests/:manifestId/decision` | DISPATCHED only; decision `ACCEPTED` or `REJECTED`; optional supplier reference/notes |
| `POST` | `/api/v1/owner/return-manifests/:manifestId/complete` | ACCEPTED only; closes as COMPLETED with no further stock movement |

Manifest numbers are server-generated as `SRM-YYMMDD-####`. Dispatch derives a unique event id per line from the operation id; replaying the same operation returns `meta.idempotent: true` even after later lifecycle transitions and never deducts stock twice. A rejected return is terminal and does not auto-restore stock.

**Owner web:** Expiry Returns queue → Create Return Manifest → Manifest Details with Dispatch / Decision / Complete modals (Batches AA–AC). Preparing a manifest does not move stock; dispatch does.

### 22.5 Owner web routes (Slice 2)

| Screen | Route | Batch |
|--------|-------|-------|
| Purchasing | `/purchasing` | T |
| Create Purchase Order | `/purchasing/new` | U |
| Purchase Order Details | `/purchasing/:poId` | V |
| Receive against PO | `/purchasing/:poId/receive` | W |
| Suppliers | `/suppliers` | X |
| Add Supplier | `/suppliers/new` | Y |
| Supplier Details | `/suppliers/:supplierId` | Z |
| Expiry Returns | `/suppliers/returns` | AA |
| Create Return Manifest | `/suppliers/returns/new` | AB |
| Manifest Details | `/suppliers/returns/:manifestId` | AC |

Export / Print / More Actions, Review Reorder Suggestions, and View All Receipts stay disabled/parked unless a later production batch unlocks them. Edit Supplier is live (Prod P2). **View All POs** is live (Prod P3): Supplier Details → `/purchasing?supplierId=…`. **View All Products** is live (Prod P4): Supplier Details → `/inventory?supplierId=…` (additive inventory `supplierId` query).

### 22.6 Slice 2 exit verification (Batch AD)

```bash
npm run smoke:m6s2 -w @r2a/web
```

Runs, in order: `smoke:m6q` → `smoke:m6r` (server Supplier/PO/GRN/return APIs) → `smoke:m6s` → `smoke:m6t` … `smoke:m6ac` (Owner web Slice 2 UI) → `smoke:m6s1` (Slice 1 composed regression). Batch S/U source guards were lightly refreshed so later-slice nav and shared `purchaseOrders` receipts helpers do not false-fail the historical Batch S/U assertions.

**Slice 2 scope delivered:** P (Prisma/Zod) · Q (Supplier + PO APIs) · R (GRN + return lifecycle APIs) · S (Purchasing/Suppliers nav) · T–W (Purchasing UI + dual receive) · X–Z (Suppliers UI) · AA–AC (Expiry Returns + Create Manifest + Manifest Details) · AD (catalog §22 + composed smoke). Manager web remains later / out of this track.

Batch AD result: `smoke:m6s2` **PASS** on 2026-09-18.

---

## 23. M6 — Slice 3 Customer APIs (Batch AF)

Role-aware customer create, owner directory, review/approve, phone-check, sale-customer filter, and ingest Active guard. No web screens.

All routes are tenant-scoped from the JWT. `POST /customers` is role-aware (not Owner-only); `/owner/customers*` are **`OWNER` only** — Manager and Cashier receive `403`.

| Method | Path | Contract |
|--------|------|----------|
| `POST` | `/api/v1/customers` | OWNER → `ACTIVE` + `OWNER_CREATED` (or `POS_REGISTRATION` if `source` sent); MANAGER/CASHIER → `PENDING_APPROVAL` + `POS_REGISTRATION`, extras stripped to name+phone only. `409` on duplicate phone |
| `GET` | `/api/v1/customers` | `ACTIVE` only (POS F8). Query `q`, `phone`, `name`, `limit`, `offset` |
| `GET` | `/api/v1/customers/phone-check?phone=` | Any authenticated. Returns `{ exists, customer? { id, name, phone, status, source } }` excluding rejected |
| `GET` | `/api/v1/owner/customers` | **OWNER only.** Tabs by `status` (All/Pending/Active/Inactive; Rejected always hidden). Filters `q`, `status`, `source`, `sort` (`name`\|`createdAt`\|`loyaltyPoints`). `meta.total` + `meta.kpis` (registered, pending, active-90d, loyaltyPointsIssued = sum of current `loyaltyPoints` on Active). Honest zeros |
| `GET` | `/api/v1/owner/customers/:customerId` | **OWNER only.** `data.profile` (name, phone, email, DOB, gender, address, status, source, storeId, loyaltyPoints, dates), `data.audit` (createdBy/approvedBy/rejectedBy users + timestamps + rejectionNote), `data.purchaseHistory` (saleCount, totalSpent), `data.loyaltyActivity` (pointsUsed, pointsEarned from sale snapshots) |
| `POST` | `/api/v1/owner/customers/:customerId/approve` | **OWNER only.** Pending only (else `404`). Optional profile patch → `ACTIVE` + `approvedAt` + `approvedByUserId` |
| `POST` | `/api/v1/owner/customers/:customerId/reject` | **OWNER only.** Pending only (else `404`). Optional `rejectionNote` → `REJECTED` + `rejectedAt` + `rejectedByUserId` (hidden from directory) |
| `GET` | `/api/v1/sales?customerId=` | Additive filter on `GET /sales` (any authenticated, role-scoped redaction as usual) |

**Ingest guard:** `POST /sales/ingest` and `POST /sync/ingest` — if `customerId` is supplied the customer must be `ACTIVE` (else `400` / `404`).

**Unchanged auth:** `PATCH /customers/:id` remains Owner+Manager only (cashier `403`). **Prod P1:** PATCH body additively accepts `dateOfBirth` / `gender` / `address` / `status` (`ACTIVE`↔`INACTIVE` only); Owner web Edit Customer live at `/customers/:id/edit`. Cashiers cannot create/edit customers; Manager create goes to Pending.

### 23.1 Status matrix

| Actor | `POST /customers` | `GET /customers` | `GET /owner/customers*` | Ingest with customerId |
|-------|--------------------|--------------------|--------------------------|------------------------|
| OWNER | Active immediately | Active only | 200 (full) | Active-only check |
| MANAGER | Pending + POS_REGISTRATION | Active only | **403** | Active-only check |
| CASHIER | Pending + POS_REGISTRATION | Active only | **403** | Active-only check |

---

## 24. M6 — Slice 4 Staff (Batch AV)

Owner-only back-office staff management. All routes are prefixed with `/api/v1/owner` and restricted to `OWNER` role; Cashiers and Managers receive `403`. Owner web Staff screens are live: list, add, active/inactive details, edit, deactivate, and reactivate.

| Method | Path | Contract |
|--------|------|----------|
| `GET` | `/api/v1/owner/users` | Lists users (excluding SUPER_ADMIN). Supports filters `q` (search name/email/phone), `role` (OWNER/MANAGER/CASHIER), `isActive` (true/false/all), pagination `limit`/`offset`. Returns list item fields plus `username` (derived email local-part) and `storeName`. Returns aggregate `kpis` (total, active, inactive, cashiers) for the tenant. |
| `GET` | `/api/v1/owner/users/:id` | Returns safe user profile (including `username` and `storeName`) + array of `activities` (StaffActivityEvents) sorted newest first (with actor name and role). |
| `POST` | `/api/v1/owner/users` | Create staff with role `CASHIER` or `MANAGER`. Store is validated. Server-generates temp password (min 8 chars); returns once in `{ user, temporaryPassword }`. Logs `CREATED` activity. `409` on email already registered. |
| `PATCH` | `/api/v1/owner/users/:id` | Edit profile/role/store. Block self edit (`400`). Role cannot be set to `OWNER` / `SUPER_ADMIN`. Logs specific activities for role / branch changes, and a general profile update for name/phone/email/note updates. |
| `POST` | `/api/v1/owner/users/:id/deactivate` | Set `isActive = false`, revokes target's refresh tokens. Blocks self deactivation. Logs `DEACTIVATED` activity with optional reason. |
| `POST` | `/api/v1/owner/users/:id/reactivate` | Set `isActive = true`. Logs `REACTIVATED` activity. |

**Login lastLoginAt update:** On successful login, cloud updates `lastLoginAt` database timestamp for the logging user.

### 24.1 Owner web Staff routes

| Screen | Web route | Live API |
|--------|-----------|----------|
| Staff Directory | `/staff` | `GET /api/v1/owner/users` |
| Add Staff | `/staff/new` | `POST /api/v1/owner/users` |
| Staff Details | `/staff/:userId` | `GET /api/v1/owner/users/:id` |
| Edit Staff | `/staff/:userId/edit` | `PATCH /api/v1/owner/users/:id` |
| Deactivate Staff modal | `/staff/:userId` More Actions | `POST /api/v1/owner/users/:id/deactivate` |
| Reactivate Staff modal | `/staff/:userId` More Actions | `POST /api/v1/owner/users/:id/reactivate` |

Staff usernames are derived from email local-part and are read-only. Created staff can only be `MANAGER` or `CASHIER`; the server returns a one-time temporary password. Owner self edit/deactivate/reactivate actions are hidden in web and blocked on the server. Deactivation revokes existing refresh tokens; subsequent login is blocked while inactive.

### 24.2 Slice 4 verification

```bash
# API must already be running for the live server smoke
npm run smoke:m6ao -w @r2a/server

# Source-level web guard for Staff nav/list/add/details/edit/AU modals
npm run smoke:m6av -w @r2a/web
```

Batch AV result: `smoke:m6av` **PASS** on 2026-08-21.

---

## 25. M6 Slice 5 Batch AX — Shift APIs + ingest shiftId + dashboard KPIs

**Goal:** Live shift open/close/active + owner list/detail/resolve-variance. Ingest attaches `shiftId`. Dashboard shift KPIs live.

**Source modules:** `apps/server/src/modules/shift/` (service, controller, router), `apps/server/src/modules/sale/sale.service.ts`, `apps/server/src/modules/owner/owner.service.ts`

### 25.1 Shift module — cashier routes

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/api/v1/shifts` | Bearer | `CASHIER`, `MANAGER` | Open shift — required `openingFloat` |
| POST | `/api/v1/shifts/active/close` | Bearer | `CASHIER`, `MANAGER` | Close shift — required `countedCash` |
| GET | `/api/v1/shifts/active` | Bearer | `CASHIER`, `MANAGER` | Get active shift for current user+store |

**Business rules:**
- One open shift per cashier per store — duplicate open → `409`
- Shift number: `YYYYMMDD-NNN` per store per day (auto-generated)
- `POST /shifts/active/close` computes variance = `countedCash − (openingFloat + cashSales)`
  - variance = 0 → `CLOSED`
  - variance ≠ 0 → `FLAGGED` (requires owner review)
- Every open/close creates a `ShiftActivityEvent` audit row

### 25.2 Shift module — owner routes

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/v1/owner/shifts` | Bearer | **`OWNER`** | List shifts (filters: `status`, `userId`, `q`, `from`, `to`, `limit`, `offset`) |
| GET | `/api/v1/owner/shifts/:shiftId` | Bearer | **`OWNER`** | Shift detail + payment breakdown + activity timeline |
| POST | `/api/v1/owner/shifts/:shiftId/resolve` | Bearer | **`OWNER`** | Resolve flagged shift — `varianceDecision` (`ACCEPTED_DIFFERENCE` / `COUNT_CORRECTED` / `OTHER`) + optional note |
| POST | `/api/v1/owner/shifts/:shiftId/cash-count-request` | Bearer | **`OWNER`** | **Prod P10** — request cash count on **OPEN** shift (`note?`); sets `cashCountStatus=REQUESTED` |
| POST | `/api/v1/owner/shifts/:shiftId/cash-count-request/cancel` | Bearer | **`OWNER`** | **Prod P10** — cancel pending request (`REQUESTED` → `CANCELLED`) |

**Business rules:**
- Owner can view all shifts across users/stores
- Resolve transitions `FLAGGED` → `CLOSED` and records review metadata
- Activity timeline via `ShiftActivityEvent` rows
- **Prod P10:** Owner requests cash count on OPEN shifts only; cashier desktop polls `GET /shifts/active` and surfaces a banner; completing counted cash via `POST /shifts/active/close` marks request `COMPLETED` (no second cash ledger)
- Additive Shift fields: `cashCountStatus` (`NONE`\|`REQUESTED`\|`CANCELLED`\|`COMPLETED`), `cashCountRequestedAt`, `cashCountRequestedByUserId`, `cashCountNote`, `cashCountCancelledAt`, `cashCountCompletedAt`
- Activity types added: `CASH_COUNT_REQUESTED`, `CASH_COUNT_CANCELLED`
### 25.3 Sale ingest — shiftId

`saleIngestSchema` now accepts optional `shiftId`. When present, server validates the shift is OPEN for the cashier+store and links the sale. Omitted `shiftId` is accepted for backward compatibility.

### 25.4 Dashboard — staff block

`GET /owner/dashboard` `staff` block now returns live values instead of `null`:
- `openShifts`: count of `OPEN` shifts for the store
- `cashVarianceToday`: sum of variance from shifts closed/flagged today

### 25.5 Verification

```bash
npm run smoke:m6ax -w @r2a/server
```

Batch AX result: `smoke:m6ax` **19/19 PASS** on 2026-08-22.

### 25.10 Request Cash Count (Prod Batch P10)

**Goal:** Owner requests cash count on an OPEN shift; cashier desktop surfaces the request; counted cash still goes through existing close-shift / variance path (no second ledger).

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/api/v1/owner/shifts/:shiftId/cash-count-request` | Bearer | **`OWNER`** | Body `{ note? }` — set `cashCountStatus=REQUESTED` |
| POST | `/api/v1/owner/shifts/:shiftId/cash-count-request/cancel` | Bearer | **`OWNER`** | Cancel pending → `CANCELLED` |
| GET | `/api/v1/shifts/active` | Bearer | `CASHIER`, `MANAGER` | Returns cash-count fields for desktop poll |

**UI:** Owner Shift Management + Shift Details enable Request Cash Count. Desktop Counter Ready + Shift panel banner; cashier enters counted cash via Close Shift. Close with pending request → `COMPLETED`.

```bash
npm run smoke:prod-p10 -w @r2a/web
```

### 25.11 Terminal presence (Prod Batch P11)

**Goal:** Desktop heartbeats; Owner Dashboard shows live Online / Offline / Forced Offline dots. No Manager web. No invented terminals.

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/api/v1/terminals/heartbeat` | Bearer | `CASHIER`, `MANAGER`, `OWNER` | Body `{ terminalId, forceOffline?, userAgent? }` — upsert `TerminalPresence` |
| GET | `/api/v1/owner/terminals/presence` | Bearer | **`OWNER`** | List reported terminals + computed `status` |

**Locks:**
- Heartbeat continues under Force Offline with `forceOffline: true` (Owner sees Forced Offline, not silent drop).
- Stale threshold: `TERMINAL_PRESENCE_STALE_MS` = 45s (desktop interval ~20s).
- Owner Dashboard **Terminals** card polls presence; empty when none reported.

```bash
npm run smoke:prod-p11 -w @r2a/web
```

### 25.12 Cloud held sales (Prod Batch P12)

**Goal:** Soft holds sync to cloud when online; F6/F7 shared across terminals in the same store; offline falls back to local; **no** stock reservation; max 3 store-scoped.

See **§18** for full route table + desktop reconcile lock (cloud canonical; push local-only on Go Online).

```bash
npm run smoke:prod-p12 -w @r2a/desktop
```

### 25.13 Desktop Transactions → cloud (Prod Batch P13)

**Goal:** Desktop Transactions list/detail read store sales from existing **M6 E** `GET /api/v1/sales` (+ `GET /sales/:id`) when online; offline keep local `transactionLogStore`; merge local-only rows until ingest flush. **No new Express routes.** Owner web Sales (H) / Detail (I) unchanged.

| Desktop | Behavior |
|---------|----------|
| Online list | `GET /api/v1/sales?limit=100` (cashier store-scoped via JWT) + merge local-only |
| Online detail | Prefer `GET /api/v1/sales/:id`; fallback list/local snapshot |
| Offline | Local `transactionLogStore` only |
| Reprint | Print stub until Wave 5 S2 |

```bash
npm run smoke:prod-p13 -w @r2a/desktop
```

### 25.14 Catalog CSV/XLSX import (Prod Batch P14)

**Goal:** Owner web bulk catalog onboarding. Route: `/inventory/import` (Inventory CTA **Import Catalog**).

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/v1/owner/catalog/import/dry-run` | Bearer · **OWNER** | Body `{ fileName, contentBase64 }` — parse CSV/XLSX; report create/update/error per row |
| POST | `/api/v1/owner/catalog/import/commit` | Bearer · **OWNER** | Body `{ rows[] }` — transactional upsert by **sku** + replace units |

**Caps:** max file **2 MiB**; max **2000** data rows. Stable key = `sku` (tenant-scoped). Units: always PIECE×1; optional `stripFactor` / `boxFactor` (BOX must be divisible by STRIP). **No** cost/sell columns. No desktop Excel path. No bi-di / n8n.

```bash
npm run smoke:prod-p14 -w @r2a/web
```

### 25.15 GRN Save as Draft (Prod Batch P15)

**Goal:** Incomplete Receive-against-PO form can be saved and resumed. Confirm still posts existing Batch R `POST .../receipts` (stock). Supplier Add + Return Manifest **Save as Draft** stay disabled with honest hints.

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/v1/owner/purchase-orders/:poId/receipt-draft` | Bearer · **OWNER** | Returns draft or `null` |
| PUT | `/api/v1/owner/purchase-orders/:poId/receipt-draft` | Bearer · **OWNER** | Upsert JSON payload (invoice/delivery/date + line lots) — **no stock** |
| DELETE | `/api/v1/owner/purchase-orders/:poId/receipt-draft` | Bearer · **OWNER** | Discard draft |

**Model:** `GoodsReceiptDraft` (one per PO). Confirm receipt deletes the draft. PO must be `SENT` or `PARTIALLY_RECEIVED`.

```bash
npm run smoke:prod-p15 -w @r2a/web
```

### 25.6 Desktop cloud shift (Batch AY)

Desktop `shiftStore.ts` rewritten to use cloud API:
- `POST /api/v1/shifts` (open, requires `openingFloat`) — caches `ActiveShift` with `shiftId`/`shiftNo`/`openingFloat`
- `POST /api/v1/shifts/active/close` (close, requires `countedCash`) — clears cache, returns variance
- `GET /api/v1/shifts/active` — rehydrates cache on login/reconnect

`ShiftPanel.tsx`:
- Opening float input (required, ৳) on open; counted cash input on close
- Displays shift number, opening float, opened-by, duration
- Online required checks with explicit i18n messages
- ConfirmDialog for both open and close

`saleIngest.ts`: `shiftId` added to `SaleIngestBuildArgs` and included in `SaleIngestInput` payload.

`App.tsx`: All 4 sale ingest call sites (CASH, CARD, MFS, zero-pay) pass `shiftId` from cached shift.

`CounterReadyScreen.tsx`: Displays shift number next to open-since time.

16 new i18n keys in `en.ts` + `bn-BD.ts`.

Batch AY result: `smoke:m6ay` **PASS** on 2026-08-22.

### 25.7 Owner web shift pages (Batches AZ–BB)

Owner web Staff page includes **Shift Management** → `/staff/shifts`.

`/staff/shifts` consumes `GET /api/v1/owner/shifts` and renders:
- KPI totals from live shift-list meta counts
- All / Open / Closed / Flagged tabs
- Search, cashier filter, pagination
- Row navigation to `/staff/shifts/:shiftId`
- Flagged row Review opens the Review Cash Variance modal

`/staff/shifts/:shiftId` consumes `GET /api/v1/owner/shifts/:shiftId` and renders:
- Header + status badge + top detail cards (cashier, shift time, opening float, status)
- Cash Summary (`openingFloat`, `cashSales`, expected cash, counted cash, variance)
- Sales & Payment Summary (`txnCount`, Cash/Card/MFS, total sales)
- Shift Activity timeline from `ShiftActivityEvent`
- Audit Information rail
- View POS Activity → `/sales?userId=...&from=...&to=...`
- Request Cash Count **live** (Prod P10) — Owner modal → `POST /owner/shifts/:shiftId/cash-count-request`; desktop banner + close-shift counted cash
- Flagged details can open Review Cash Variance
- Resolved variance details show Variance Review card (`varianceDecision`, note, adjustment reference, review date)
- Generate Shift Report disabled

Verification:

```bash
npm run smoke:m6az -w @r2a/web
npm run smoke:m6ba -w @r2a/web
npm run smoke:m6bb -w @r2a/web
```

Batch AZ result: `smoke:m6az` **PASS** on 2026-08-22.  
Batch BA result: `smoke:m6ba` **PASS** on 2026-08-22.  
Batch BB result: `smoke:m6bb` **PASS** on 2026-08-22.

### 25.8 Reports Dashboard (Batch BC)

**Goal:** Reports sidebar live; Reports Dashboard at `/reports` composes **existing** OWNER-only APIs (no new cloud route). Sales/Inventory/Purchase **report detail pages** stay disabled.

**Web routes:**

| Screen | Route | Notes |
|--------|-------|-------|
| Reports Dashboard | `/reports` | Aggregates live OWNER APIs below |

**Composed data sources (all existing OWNER-only routes):**

- `GET /api/v1/owner/dashboard?from&to` — `last7` sales KPIs, daily bars, inventory health, payment mix
- `GET /api/v1/owner/inventory-summary` — cost value, low/out/expiring counts → inventory value KPI
- `GET /api/v1/owner/purchase-orders` — list/aggregate → purchase value KPI
- `GET /api/v1/owner/shifts` — meta KPIs (open/flagged counts) → active staff + shift context

**Dashboard widgets (live-only):**

- KPI cards: Total Sales (last 7d net), Purchase Value (MTD), Inventory Value, Active Staff
- Sales chart (7-day bars from dashboard `dailyBars`)
- Inventory summary, Purchasing summary, Staff Activity summary cards
- **Staff Activity** + **Shift Report** cards → link to `/staff/shifts`
- **Sales / Inventory / Purchase → View Report** actions are **disabled** (detail pages not shared/authorized)

**RBAC / UI rules:**

- Owner web only; Manager/Cashier rejected at login.
- No mock/seed KPIs — every value comes from a live Prisma query.
- Audit & FEFO / Settings / Help / Owner Profile remain disabled.

Verification:

```bash
npm run smoke:m6bc -w @r2a/web
```

Batch BC result: `smoke:m6bc` **PASS** on 2026-08-22.

### 25.9 Slice 5 exit (Batch BD)

**Goal:** Catalog this §25, composed Slice 5 smoke, and synchronize status/master-plan/RBAC. M6 remains **IN PROGRESS** (Slice 2 AC–AD deferred; later slices gated).

**Composed smoke:**

```bash
npm run smoke:m6s5 -w @r2a/web
```

Runs, in order: `smoke:m6ax` (server shift APIs) → `smoke:m6ay` (desktop cloud shift) → `smoke:m6az` / `smoke:m6ba` / `smoke:m6bb` / `smoke:m6bc` (owner web shift + reports) → `smoke:m6s1` / `smoke:m6s3` / `smoke:m6av` (prior M6 slices, no regression).

**Slice 5 scope delivered:** AW (Prisma/seed) · AX (shift APIs + ingest `shiftId` + dashboard staff KPIs) · AY (desktop cloud shift float/count) · AZ (Staff → Shift Management list) · BA (Shift Details) · BB (Review Cash Variance + resolved) · BC (Reports nav + Reports Dashboard). AC–AD (Slice 2 Manifest Details) still **deferred**.

Batch BD result: `smoke:m6s5` PASS on 2026-08-22.

---

## 26. M6 Slice 6 — Sales Report

**Goal:** OWNER-only Sales Report API and Owner web Sales Report page from Reports Dashboard. Inventory and Purchase report details remain disabled.

### 26.1 Sales Report API (Batch BE)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/v1/owner/reports/sales` | Bearer | **`OWNER`** | Sales report aggregate for the selected range/store |

**Query:**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `from` | ISO/date string | last 30 days | Inclusive range start |
| `to` | ISO/date string | today | Inclusive range end |
| `storeId` | string | JWT store/current tenant store | Optional, tenant-scoped; single-store UI shows current branch only |

**Response blocks:**

- `range` with current and prior-period dates.
- KPI cards: total sales, transaction count, average order value, and items sold.
- `dailyBars` for range sales chart.
- Payment summary for `CASH`, `CARD`, and `MFS` (UI label: Mobile Payment).
- Insight widgets: best-selling category and highest sales day.
- Top cashiers by sales in range.
- Top selling medicines by units and sales value.
- Recent sales transactions with invoice, date, customer, item count, payment method, total, and cashier.

**Rules:**

- OWNER-only; Manager/Cashier receive `403`.
- All data is tenant-scoped from JWT context.
- Trends compare against an equal-length prior period only when computable.
- No Baki/on-account tender; payments remain `CASH` / `CARD` / `MFS`.

Verification:

```bash
npm run smoke:m6be -w @r2a/server
```

Batch BE result: `smoke:m6be` **PASS** on 2026-08-22.

### 26.2 Owner web Sales Report (Batch BF)

**Route:** `/reports/sales`.

**Navigation:** Reports Dashboard `/reports` → Sales card **View Report** → `/reports/sales`.

**Prod P5 additive (2026-09-18):** Inventory Report UI live at `/reports/inventory` — composes existing `GET /owner/inventory-summary`, `GET /owner/inventory` (low/out), and `GET /owner/expiry` (**no new aggregate route**). Reports Dashboard Inventory **View Report** + Status CTA enabled. CSV export enabled in Prod P7.

**Prod P6 additive (2026-09-18):** Purchase Report UI live at `/reports/purchasing` (route lock; not `/reports/purchases`) — composes existing `GET /owner/purchase-orders` (**no new aggregate route**). Reports Dashboard Purchase **View Report** + Purchasing Status CTA enabled. CSV export enabled in Prod P7.

**Prod P7 additive (2026-09-18):** Client CSV export (no new API) on Sales / Inventory / Purchase reports, Audit dashboard + detail lines, Shift detail summary, Expiry Returns. Thermal **Print** remains disabled pending Wave 5 S2. `smoke:prod-p7` PASS.

### 26.3 Exit verification (Batch BF)

- Full-scroll Sales Report page: KPI row, sales chart, payment summary, insight widgets, top selling medicines, and Recent Sales Transactions.
- Date preset control supports Last 30 Days and Last 7 Days.
- Branch display is locked to the current store; no multi-branch switcher yet.
- Recent transaction invoice rows navigate to `/sales/:id`.
- View All Staff Performance navigates to `/staff/shifts`.
- Export Report is disabled with a hint.
- Inventory report View Report enabled later (Prod P5); Purchase report View Report enabled later (Prod P6).
- All user-facing text uses `apps/web` i18n (`en` and `bn-BD`).

Verification:

```bash
npm run smoke:m6bf -w @r2a/web
```

Batch BF result: `smoke:m6bf` **PASS** on 2026-08-22.

### 26.4 Slice 6 exit (Batch BG)

**Composed smoke:**

```bash
npm run smoke:m6s6 -w @r2a/web
```

Runs, in order: `smoke:m6be` (server Sales Report API) → `smoke:m6bf` (web Sales Report UI) → `smoke:m6s5` (prior Slice 5 composed regression).

**Slice 6 scope delivered:** BE (Sales Report API + shared Zod) · BF (Sales Report UI + Reports Dashboard View Report enablement) · BG (catalog §26 + composed smoke + status sync). Slice 2 AC–AD remain **deferred**; Slice 7 Audit & FEFO is not started.

Batch BG result: `smoke:m6s6` PASS on 2026-08-22.

---

## 26A. Enhance D2 — Product Movement Report

**Track:** Owner Dashboard Intelligence ([`ENHANCE_DASHBOARD_INTELLIGENCE_EXECUTION.md`](ENHANCE_DASHBOARD_INTELLIGENCE_EXECUTION.md)) — **DONE** (D1–D4).

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/v1/owner/reports/product-movement` | Bearer | **`OWNER`** | Per-product demand / movement bands from live `SaleItem` aggregation |

**Query:** `preset=last30|last90|last180` (default `last90` when no `from`/`to`), optional `from`/`to`, `storeId`, `band=all|high_demand|steady|low_sell|no_sales`, `q`, `limit` (default 50, max 200), `offset`.

**Bands (definitions):** Rank sellers (`unitsSold > 0`) by units DESC → top **20%** `high_demand`, middle **60%** `steady`, bottom **20%** `low_sell`; `no_sales` = zero units with on-hand &gt; 0. Omit zero-sold + zero-on-hand. KPIs + pagination over filtered set. No Baki/credit fields.

**Owner web:** `/reports/product-movement` (+ Reports hub card; Dashboard “Demand & slow movers” CTA).

**Smoke:** `npm run smoke:enhance-d2 -w @r2a/server` (API) · `npm run smoke:enhance-d2 -w @r2a/web` (static UI). Track exit: `npm run smoke:enhance-dash-intel`.

## 26B. Enhance D3 — Stock Priority Alarms

**Track:** Owner Dashboard Intelligence ([`ENHANCE_DASHBOARD_INTELLIGENCE_EXECUTION.md`](ENHANCE_DASHBOARD_INTELLIGENCE_EXECUTION.md)) — **DONE** (D1–D4).

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/v1/owner/reports/stock-priority` | Bearer | **`OWNER`** | Sale-priority stock alarms (P1–P4) derived from shared product-movement aggregation |

**Query:** `preset=last30|last90|last180` (default `last90`), optional `from`/`to`, `storeId`, `limit` (default 25, max 100).

**Priorities (definitions):** `P1_restock_now` (high_demand + out) → `P2_restock_soon` (high_demand + low / cover &lt; 7) → `P3_watch_cover` (high_demand + cover &lt; 14, not already P1/P2) → `P4_review_slow` (low_sell/no_sales + onHand &gt; 0). Sorted P1→P4 then `avgDailyUnits` DESC. One priority per product (highest wins). No Baki/credit fields.

**Owner web:** Dashboard **Stock priority** panel (top 8; 90/180 preset; P1→`/inventory?tab=out`, P2→`/inventory?tab=low`, row→product, footer→product-movement).

**Smoke:** `npm run smoke:enhance-d3 -w @r2a/server` (API) · `npm run smoke:enhance-d3 -w @r2a/web` (static UI). Track exit: `npm run smoke:enhance-dash-intel`.

## 27. M6 Slice 7 — Audit & FEFO (StockAudit + FEFO Violations)

### 27.1 StockAudit & FEFO Violations Schema + Seed (Batch BH)

- Prisma models: `StockAudit`, `StockAuditLine`, `StockAuditActivityEvent`, `FefoViolationRecord`.
- Enums: `StockAuditStatus` (`IN_PROGRESS` | `UNDER_REVIEW` | `COMPLETED` | `VARIANCE_FOUND`), `StockAuditLineStatus` (`MATCHES` | `DISCREPANCY`), `FefoViolationStatus` (`OPEN` | `CORRECTED` | `DISMISSED`), `StockAuditActivityType` (`CREATED` | `COUNT_STARTED` | `VARIANCE_DETECTED` | `REVIEWED` | `FEFO_CORRECTED` | `COMPLETED`).
- Shared Zod schemas in `@r2a/shared-types` (`audit.ts`).
- Deterministic seed for stock audits (`IN_PROGRESS`, `COMPLETED`, `VARIANCE_FOUND`) and FEFO violations (`OPEN`, `CORRECTED`).

### 27.2 Audit & FEFO APIs + Ingest Hook (Batch BI)

Owner-only routes:

| Method | Path | Roles | Purpose |
|--------|------|-------|---------|
| GET | `/api/v1/owner/audit/dashboard` | **`OWNER`** | Audit KPIs, recent audits, and audit activity |
| GET | `/api/v1/owner/audits` | **`OWNER`** | Paged audit list with `q`, `status`, `from`, `to`, `limit`, `offset` |
| GET | `/api/v1/owner/audits/:auditId` | **`OWNER`** | Audit detail with lines, activity, and linked FEFO violations |
| POST | `/api/v1/owner/audits/:auditId/review` | **`OWNER`** | Review `UNDER_REVIEW` or `VARIANCE_FOUND` audit with `decision: COMPLETE | KEEP_VARIANCE` |
| POST | `/api/v1/owner/fefo-violations/:violationId/correct` | **`OWNER`** | Mark an OPEN FEFO violation corrected with `correctionNote` |

Owner/Manager routes:

| Method | Path | Roles | Purpose |
|--------|------|-------|---------|
| POST | `/api/v1/audits/start` | **`OWNER`**, **`MANAGER`** | Start an `IN_PROGRESS` stock audit for a store/location |
| POST | `/api/v1/audits/:auditId/lines` | **`OWNER`**, **`MANAGER`** | Replace counted batch lines and snapshot system qty/cost |
| POST | `/api/v1/audits/:auditId/submit` | **`OWNER`**, **`MANAGER`** | Submit audit; variance becomes `VARIANCE_FOUND`, otherwise `UNDER_REVIEW` |

**Prod P8 additive (2026-09-18):** Desktop Settings → Stock Audit UI (OWNER/MANAGER) calls the three routes above online-only. No offline queue. Owner web `/audit` remains the review surface.

Sale ingest hook:

- `POST /api/v1/sales/ingest` creates an OPEN `FefoViolationRecord` when a sale line has `fefoOverride: true` and the chosen batch is not the current FEFO batch.
- Idempotent sale replay returns the existing sale and does not duplicate FEFO violation records.
- Cashiers cannot access owner audit routes or start/submit stock audits.

Verification:

```bash
npm run smoke:m6bi -w @r2a/server
```

Batch BI result: `smoke:m6bi` **PASS** on 2026-08-22.

### 27.3 Owner Web Audit & FEFO Dashboard (Batch BJ)

**Route:** `/audit`

**Navigation:** Sidebar `Audit & FEFO` (`/audit`) live in Owner web.

**Page behavior:**
- KPI cards: Total Audits, Under Review, Discrepancies, Open FEFO Alerts.
- Expiry Monitoring card with quick link to Expiry Management.
- FEFO Compliance Overview card with compliance rate and breakdown.
- Recent Stock Audits list with search, status filters, and View links to `/audit/:auditId`.
- Activity Log with recent audit actions.
- Generate Report button disabled with tooltip hint.
- Full localization in `en` and `bn-BD`.

Verification:

```bash
npm run smoke:m6bj -w @r2a/web
```

Batch BJ result: `smoke:m6bj` **PASS** on 2026-08-22.

### 27.4 Owner Web Audit Detail + Review Modal + Apply FEFO (Batch BK)

**Route:** `/audit/:auditId`

**Page behavior:**
- Header with audit number, location, status badge, audit timestamps, and Review Audit CTA (for `UNDER_REVIEW` or `VARIANCE_FOUND` audits).
- Summary KPI cards: Items Checked, Discrepancies, Variance Amount (৳).
- Audited stock lines table with medicine name, batch number, system qty, counted qty, difference, and variance amount.
- FEFO Violation card for linked violations with "Apply FEFO Correction" modal action.
- Activity timeline showing audit lifecycle events with timestamps and actors.
- Notes card displaying audit notes.
- Review Audit modal: choose decision (`COMPLETE` | `KEEP_VARIANCE`) and optional review notes, posting to `POST /api/v1/owner/audits/:auditId/review`.
- Apply FEFO Correction modal: enter correction notes, posting to `POST /api/v1/owner/fefo-violations/:violationId/correct`.
- Generate Report action remains disabled with hint.
- Full localization in `en` and `bn-BD`.

Verification:

```bash
npm run smoke:m6bk -w @r2a/web
```

Batch BK result: `smoke:m6bk` **PASS** on 2026-08-22.

### 27.5 Slice 7 Exit (Batch BL)

**Composed smoke:**

```bash
npm run smoke:m6s7 -w @r2a/web
```

Runs, in order: `smoke:m6bi` (server Audit + FEFO APIs) → `smoke:m6bj` (web Audit Dashboard) → `smoke:m6bk` (web Audit Detail + Modals) → `smoke:m6s6` (prior Slice 6 composed regression).

**Slice 7 scope delivered:** BH (Prisma + Zod + seed) · BI (Audit + FEFO APIs + ingest hook) · BJ (Audit & FEFO dashboard UI) · BK (Audit Detail UI + Review Audit modal + Apply FEFO correction) · BL (catalog §27 + composed smoke:m6s7 + RBAC + status sync). Slice 2 AC–AD remain **deferred**; Slice 8 Settings is not started.

Batch BL result: `smoke:m6s7` **PASS** on 2026-09-10.

## 28. M6 Slice 8 — Settings + Help + Owner Profile

### 28.1 Business profile schema + settings APIs (Batch BM)

- Prisma: Tenant/Store business profile fields (`legalName`, licenses, VAT, contact, address, website, `currency` BDT default, `timezone`, `openingHours`) + `ConfigurationActivityEvent` / `ConfigurationActivityType`.
- Shared Zod in `@r2a/shared-types` (`settings.ts`).
- OWNER-only routes:

| Method | Path | Roles | Purpose |
|--------|------|-------|---------|
| GET / PATCH | `/api/v1/owner/settings/business` | **`OWNER`** | Read/update pharmacy + primary store profile; returns configuration timeline |
| GET / PATCH | `/api/v1/owner/settings/account` | **`OWNER`** | Read/update owner name/phone; recent account activity |
| POST | `/api/v1/owner/settings/account/change-password` | **`OWNER`** | Change password (current + new ≥ 8 chars); records `PASSWORD_CHANGED` |
| GET | `/api/v1/owner/settings/activity` | **`OWNER`** | Paged configuration activity |
| GET | `/api/v1/owner/help/status` | **`OWNER`** | System health + support contact for Help page |

Manager/Cashier receive **403** on all of the above.

Verification:

```bash
npm run smoke:m6bm -w @r2a/server
```

Batch BM result: `smoke:m6bm` **PASS** (18/18; re-verified Prod W0A 2026-09-18).

### 28.2 Settings hub + Business Profile (Batch BN)

**Routes:** `/settings` · `/settings/business`

**Navigation:** Sidebar Settings live.

**Page behavior:**
- Settings hub with 6 cards; only **Business Profile** clickable.
- Disabled cards (Branch, Roles, Preferences, Security, Audit & Data) keep i18n hints.
- Business Profile form: pharmacy + primary store fields; currency BDT read-only; Save via `PATCH /owner/settings/business`; configuration timeline from API.
- Full localization in `en` and `bn-BD`.

Verification:

```bash
npm run smoke:m6bn -w @r2a/web
```

Batch BN result: `smoke:m6bn` **PASS** on 2026-09-18.

### 28.3 Account Profile + footer Owner Profile (Batch BO)

**Route:** `/settings/account`

**Navigation:** Footer **Owner Profile** live → `/settings/account`.

**Page behavior:**
- Personal info edit (name/phone); email/role read-only.
- Change password flow via `POST /owner/settings/account/change-password`.
- 2FA / sessions / notification toggles disabled with hints.
- Recent activity from account API.
- Full localization in `en` and `bn-BD`.

Verification:

```bash
npm run smoke:m6bo -w @r2a/web
```

Batch BO result: `smoke:m6bo` **PASS** on 2026-09-18.

### 28.4 Help & Support + footer Help (Batch BP)

**Route:** `/help`

**Navigation:** Footer **Help** live → `/help`.

**Page behavior:**
- Help Center / Contact Support / System Status cards.
- Contact + System Status consume live `GET /owner/help/status`.
- FAQ accordion (static i18n).
- Recent Tickets empty/disabled; Create Ticket disabled with hint.
- Full localization in `en` and `bn-BD`.

Verification:

```bash
npm run smoke:m6bp -w @r2a/web
```

Batch BP result: `smoke:m6bp` **PASS** on 2026-09-18.

### 28.5 Slice 8 Exit (Batch BQ)

**Composed smoke:**

```bash
npm run smoke:m6s8 -w @r2a/web
```

Runs, in order: `smoke:m6bm` (server settings/help APIs) → `smoke:m6bn` (Settings hub + Business Profile) → `smoke:m6bo` (Account Profile) → `smoke:m6bp` (Help) → `smoke:m6s7` (prior Slice 7 composed regression).

**Slice 8 scope delivered:** BM (schema + APIs) · BN (Settings hub + Business Profile) · BO (Account Profile + footer Owner Profile) · BP (Help & Support + footer Help) · BQ (catalog §28 + composed smoke:m6s8 + RBAC + status sync). Slice 2 P–AD **DONE** (Prod Wave 2). Branch/Roles/Preferences/Security/Audit&Data hub cards and Help tickets remain intentionally disabled.

Batch BQ result: `smoke:m6s8` **PASS** on 2026-09-18.

---

## 29. Change log

| Date | Change |
|------|--------|
| 2026-09-18 | **M6 Batch AD / Slice 2 EXIT DONE:** §22 finalized (suppliers, POs, GRNs, return manifests, dual-receive note, Owner web routes); composed `smoke:m6s2` (m6q→m6r→m6s→m6t…m6ac→m6s1) registered and PASS; Slice 2 complete; Manager web still later / out of production track. |
| 2026-09-18 | **M6 Batch BQ / Slice 8 EXIT DONE:** §28 Settings + Help catalog added; composed `smoke:m6s8` (m6bm→m6bn→m6bo→m6bp→m6s7) registered and PASS; Slice 8 complete; Slice 2 AC–AD were Prod Wave 2. |
| 2026-08-09 | Initial API catalog after M2 Batches A–H completion |
| 2026-08-11 | Confirmed: M3 Batch K (Active Cart) adds **no** new cloud routes; sale ingest still payment-slice only |
| 2026-08-11 | Documented cloud vs desktop FEFO (sellable preferred on search); Napa 4-lot demo seed; POS flow uses `GET /batches?productId=` for Select Batch |
| 2026-08-11 | **M3 Batch U (Slice 2 exit):** §14 desktop consumption + stubs + planned routes; zero-pay ingest notes; customer PATCH loyalty gap; Karim 120 pts seed note |
| 2026-08-11 | **M3 Batch Z (Slice 3 exit):** §15 Cash tender + print stub; Card/MFS gated; 58mm printer IPC TODO; `smoke:m3z` |
| 2026-08-12 | **M3 Batch AE (Slice 4 exit):** §16 Receipt Preview + Card stub + MFS invent + CARD/MFS ingest notes; `smoke:m3ae` |
| 2026-08-12 | MFS real-API intent: backend confirms txn → desktop shows status; no cashier manual Trx |
| 2026-08-12 | **M3 Batch AL (Slice 5 exit):** §17 F4 + pharmacy header + Force Offline + Transactions + Shift; POST customers OWNER-only; `smoke:m3al` |
| 2026-08-13 | Shift soft gate documented: New Sale [F2] requires open shift; connectivity badge independent |
| 2026-08-13 | **M3 Batch AP (Slice 6 exit):** §18 Hold / Park Sale (max 3 soft holds, F6 Hold, F7 Held list, resume recheck, payment abort); no new cloud routes; `smoke:m3ap` |
| 2026-08-13 | **M3 FULL EXIT:** desktop POS shell closed; no new cloud routes; later screens → Slice 7+; M4 flush not started |
| 2026-08-14 | **M4 Batch F (M4 exit):** §19 `POST /api/v1/sync/ingest` + desktop queue/worker/Sync Queue panel; `smoke:m4`; M4 DONE |
| 2026-08-14 | **M5 Batch F (M5 exit):** §20 PATCH RBAC + desktop Receive stock + 409 copy + paged catalog pull; `docs/DEV_RUNBOOK.md`; `smoke:m5`; user pilot walkthrough **PASS**; M5 DONE |
| 2026-08-16 | **M6 Batch F:** `GET /owner/dashboard` + `/owner/inventory-summary` + `/owner/expiry` OWNER-only; net profit = `sale.total − COGS`; `smoke:m6f`; Dashboard UI still Batch G |
| 2026-08-16 | **M6 Batch G:** Owner web Dashboard live on `GET /owner/dashboard`; `inventoryHealth.expiring90d`; `smoke:m6g` |
| 2026-08-16 | **M6 Batch H:** Owner web Sales list live on `GET /sales`; dashboard `salesKpis` / `topCashier` / `cashiers`; date-only `to` = end of UTC day; `smoke:m6h` |
| 2026-08-16 | **M6 Batch I:** Owner web Transaction Details live on `GET /sales/:id`; FEFO OVERRIDE; reprint preview; `smoke:m6i` |
| 2026-08-16 | **M6 Batch J:** `GET /owner/inventory` OWNER-only paged list + live Inventory UI; `smoke:m6j`; Product Details still Batch K |
| 2026-08-16 | **M6 Batch K:** `GET /owner/products/:id` OWNER-only product detail + live Product Details UI; FEFO rank; InventoryEvent; `smoke:m6k`; Add Product still Batch L |
| 2026-08-16 | **M6 Batch L:** Extended `POST /products` + `PATCH /products/:id` — added `manufacturer`, `strength`, `form`, `category`, `requiresPrescription`, `coldChain`, `storageNotes`, `reorderLevel`; live Add Product form in `apps/web` with Piece→Strip→Box unit hierarchy, Rx / cold chain toggles, 0 initial stock notice, and auto-redirect to Product Details on create; `smoke:m6l` 7/7 server + 4/4 web; no batch creation in Add Product form |
| 2026-08-16 | **M6 Batch M:** Owner web Receive Stock live on existing `POST /batches`; product context, packaging math, cost/retail/margin, stock impact; RECEIVE event from Batch D; Supplier/PO/invoice + offline GRN omitted; `smoke:m6m` |
| 2026-08-18 | **Owner Web Missing Features W1–W6 DONE:** data-integrity migration + sale snapshots; Edit Product; audited/versioned/idempotent batch correction and signed adjustment; void/retire; localized Batch Management UI; desktop migrated off absolute PATCH; `smoke:web-w1` through `smoke:web-w6` |
| 2026-08-18 | **M6 Batch N:** live localized Expiry Management; supplier/return metadata; filters, selection, CSV; return workflow disabled; `smoke:m6n` |
| 2026-08-18 | **M6 Batch O / Slice 1 DONE:** §21 catalog + composed `smoke:m6s1` PASS; overall M6 remains IN PROGRESS |
| 2026-08-18 | **M6 Batch Q:** §22 OWNER-only Supplier + PO APIs; draft lock, server totals/numbers, no inventory effect; `smoke:m6q` 18/18 PASS; no GRN/return routes or web UI |
| 2026-08-18 | **M6 Batch R:** §22 OWNER-only confirmed GRN + return queue/manifest lifecycle APIs; over-receive protection; RECEIVE ledger; idempotent dispatch ADJUST events; `smoke:m6r` 17/17 PASS; no web UI |
| 2026-08-18 | **M6 Batch T:** §22 live Purchasing list (KPI cards, PO table, search/status, pagination, CTAs); Create PO → `/purchasing/new`; `smoke:m6t` PASS |
| 2026-08-18 | **M6 Batch U:** §22 live Create Purchase Order (ACTIVE-supplier dropdown, product line search, Add Suggested Items, Save as Draft / Create SENT / Cancel, order-summary rail; no inventory effect); seed ships 3 ACTIVE suppliers (Beximco · Square · SMC); `smoke:m6u` PASS |
| 2026-08-19 | **M6 Batch AA:** live Owner Expiry Returns queue (`GET /owner/returns/queue`); additive queue `kpis` + `suppliers` in meta; Inventory Prepare Supplier Return enabled; Create Manifest page still Batch AB; `smoke:m6aa` PASS |
| 2026-08-19 | **M6 Batch AB:** live Create Return Manifest at `/suppliers/returns/new` (session draft from queue, supplier policy, editable return qty); `POST /owner/return-manifests` with optional `supplierReference`; Save as Draft disabled; no dispatch/stock-out; `smoke:m6ab` PASS |
| 2026-09-18 | **M6 Batch AC:** live Manifest Details at `/suppliers/returns/:manifestId` + Dispatch / Decision / Complete modals; uses existing return-manifest lifecycle routes (**no new cloud routes**); `smoke:m6ac` PASS; next = Batch AD exit |
| 2026-08-19 | **M6 Slice 2 AC–AD deferred. Slice 3 planned:** Customers + POS pending-approval registration; `POST /customers` stays Owner-only until AF; catalog §23 at AM |
| 2026-08-19 | **M6 Batch AE:** Customer Prisma status/source/profile + partial unique phone + Zod stubs; POST still OWNER-only; no new routes; catalog §23 still at AM |
| 2026-08-20 | **M6 Batch AF:** §23 — role-aware `POST /customers` (Owner Active, Cashier/Manager Pending + extras stripped), Active-only `GET /customers`, `GET /customers/phone-check`, Owner `GET /owner/customers` + `/:id` + approve/reject (KPIs, audit, purchase history, loyalty activity), `GET /sales?customerId=` additive filter, ingest Active-only customer guard, Cashier/Manager 403 on `/owner/customers*`; `PATCH /customers/:id` unchanged; `smoke:m6af` |
| 2026-08-21 | **M6 Batch AM completed:** Slice 3 exit; updated Completed API lists, created composed Slice 3 smoke runner script `smoke:m6s3`; updated status docs |
| 2026-08-21 | **M6 Batch AO completed:** §24 — Owner staff APIs (list, KPIs, detail, create w/ temp password, patch, deactivate, reactivate, block self actions, and lastLoginAt successful login update); `smoke:m6ao` PASS |
| 2026-08-21 | **M6 Batch AV / Slice 4 Staff DONE:** §24 updated with Staff web routes and verification; `smoke:m6av` PASS; M6 remains IN PROGRESS with deferred AC–AD and later slices gated |
| 2026-08-22 | **M6 Batch AX / Slice 5 Shift APIs DONE:** §25 — shift open/close/active (cashier), owner list/detail/resolve-variance; `saleIngestSchema` accepts optional `shiftId`; `GET /owner/dashboard` staff block live `openShifts`/`cashVarianceToday`; `smoke:m6ax` 19/19 PASS |
| 2026-08-22 | **M6 Batch AY / Slice 5 Desktop cloud shift DONE:** §25.6 — desktop `shiftStore.ts` rewritten with cloud API calls (open/close/active), `ActiveShift` includes `shiftId`/`shiftNo`/`openingFloat`, `fetchAndCache` rehydrates on login; `ShiftPanel.tsx` — opening float input, counted cash input, shift number display, online required; `saleIngest.ts` — `shiftId` in `SaleIngestBuildArgs` and payload; `App.tsx` — all 4 ingest call sites pass `shiftId`; `CounterReadyScreen` — shift number display; 16 i18n keys; `smoke:m6ay` PASS |
| 2026-08-22 | **M6 Batch BA / Slice 5 Shift Details DONE:** §25.7 — Owner web `/staff/shifts/:shiftId` live with OG content layout, cash/payment summaries, activity timeline, audit rail, View POS Activity filtered `/sales`, Request Cash Count disabled; `smoke:m6ba` PASS |
| 2026-08-22 | **M6 Batch BB / Slice 5 Review Cash Variance DONE:** §25.7 — Owner web Review Cash Variance modal opens from flagged shift list/detail, posts existing `POST /owner/shifts/:shiftId/resolve`, resolved details show Variance Review card + timeline, Generate Shift Report disabled; `smoke:m6bb` PASS |
| 2026-08-22 | **M6 Batch BC / Slice 5 Reports Dashboard DONE:** §25.8 — Reports sidebar live at `/reports`; page composes existing OWNER-only `GET /owner/dashboard` (last7), `GET /owner/inventory-summary`, `GET /owner/purchase-orders`, `GET /owner/shifts`; KPIs/sales chart/inventory/purchasing/staff-activity cards live; Staff Activity + Shift Report link to `/staff/shifts`; Sales/Inventory/Purchase View Report disabled; full `reports.*` i18n; `smoke:m6bc` PASS |
| 2026-08-22 | **M6 Batch BD / Slice 5 EXIT DONE:** §25.9 — catalog §25 (shift routes, ingest `shiftId`, reports dashboard), composed `smoke:m6s5` (m6ax→m6ay→m6az/m6ba/m6bb/m6bc→m6s1/m6s3/m6av), status/master-plan/RBAC synchronized; M6 remains IN PROGRESS (Slice 2 AC–AD deferred) |
| 2026-08-22 | **M6 Batch BE / Slice 6 Sales Report API DONE:** OWNER-only `GET /owner/reports/sales`; shared Zod response; default last 30 days, range filters, optional tenant-scoped `storeId`, prior-period trends, daily bars, payment summary, top category/cashiers/medicines, recent transactions; `smoke:m6be` PASS. |
| 2026-08-22 | **M6 Batch BG / Slice 6 EXIT DONE:** §26 Sales Report catalog added; composed `smoke:m6s6` (m6be→m6bf→m6s5) registered and PASS; M6 remains IN PROGRESS with Slice 2 AC–AD deferred and Slice 7 gated. |
| 2026-08-22 | **M6 Batch BH / Slice 7 Schema & Seed DONE:** StockAudit + FEFO violation models/enums/Zod and deterministic seed applied. |
| 2026-08-22 | **M6 Batch BI / Slice 7 APIs DONE:** Audit + FEFO APIs live; owner dashboard/list/detail/review/correct, owner/manager audit start/lines/submit, and sale ingest FEFO violation hook; `smoke:m6bi` PASS. |
| 2026-09-10 | **M6 Batch BK / Slice 7 Audit Detail & Modals DONE:** Owner web Audit Detail live at `/audit/:auditId` with KPIs, line items, linked FEFO card, timeline, notes, Review Audit modal, and Apply FEFO Correction modal; `smoke:m6bk` PASS. |
| 2026-09-18 | **Prod Batch P1:** Owner web Edit Customer live at `/customers/:id/edit` — enables Details Edit CTA; `PATCH /customers/:id` additively accepts DOB/gender/address + `ACTIVE`↔`INACTIVE` status (pending/rejected blocked); phone-check ignores same customer; `smoke:prod-p1` PASS |
| 2026-09-18 | **Prod Batch P2:** Owner web Edit Supplier live at `/suppliers/:id/edit`; PATCH ACTIVE↔HOLD (+ DRAFT if already); `smoke:prod-p2` PASS |
| 2026-09-18 | **Prod Batch P3:** Supplier Details View All POs → `/purchasing?supplierId=…`; web PO list client sends `supplierId` to existing `GET /owner/purchase-orders`; filter chip + clear; `smoke:prod-p3` PASS |
| 2026-09-18 | **Prod Batch P4:** Supplier Details View All Products → `/inventory?supplierId=…`; additive optional `supplierId` on `GET /owner/inventory` (ACTIVE batches + PO lines); filter chip + clear; `smoke:prod-p4` PASS |
| 2026-09-18 | **Prod Batch P5:** Owner web Inventory Report `/reports/inventory` — composes inventory-summary + inventory (low/out) + expiry; no new aggregate API; dashboard Inventory CTAs enabled; export parked until P7; `smoke:prod-p5` PASS |
| 2026-09-18 | **Prod Batch P6:** Owner web Purchase Report `/reports/purchasing` — composes `GET /owner/purchase-orders`; no new aggregate API; dashboard Purchase CTAs enabled; export parked until P7; `smoke:prod-p6` PASS |
| 2026-09-18 | **Prod Batch P7:** Client CSV export on Sales/Inventory/Purchase reports, Audit list+lines, Shift detail, Expiry Returns (`lib/csvExport.ts`); no new API / no PDF / Print stays disabled (S2); `smoke:prod-p7` PASS |
| 2026-09-18 | **Prod Batch P8:** Desktop Settings → Stock Audit (OWNER/MANAGER); online `POST /audits/start|lines|submit`; no offline queue; Owner web review unchanged; `smoke:prod-p8` PASS |
| 2026-09-18 | **Prod Batch P9:** Owner web Review All Issues `/suppliers/issues` — composes `GET /owner/suppliers` attention; CTA enabled; no new API; `smoke:prod-p9` PASS; Wave 3 complete |
| 2026-09-18 | **Prod Batch P10:** Request Cash Count — Shift `cashCount*` fields; OWNER `POST .../cash-count-request` (+ cancel); Owner web modal; desktop poll/banner; close completes request; `smoke:prod-p10` PASS |
| 2026-09-18 | **Prod Batch P15 / Wave 4 DONE:** GRN Save as Draft — `GoodsReceiptDraft` + OWNER receipt-draft GET/PUT/DELETE; receive resume; Confirm clears draft; Supplier/Manifest drafts disabled with hints; §25.15; `smoke:prod-p15` PASS |
| 2026-09-18 | **Prod Batch P14:** Owner Catalog Import `/inventory/import` — `POST /owner/catalog/import/dry-run` + `/commit`; CSV/XLSX parse; sku upsert + units; max 2 MiB / 2000 rows; §25.14; `smoke:prod-p14` PASS |
| 2026-09-18 | **Prod Batch P13:** Desktop Transactions → cloud — reuses `GET /api/v1/sales` + `GET /sales/:id`; online store-scoped list/detail + local-only merge; offline local log; Owner web Sales unchanged; `smoke:prod-p13` PASS |
| 2026-09-18 | **Prod Batch P12:** Cloud soft held sales — `HeldSale` + `/api/v1/held-sales` create/list/get/discard/resume-ack; desktop online cloud / offline local + Go Online reconcile; max 3 store-scoped; no stock reservation; §18 amended; `smoke:prod-p12` PASS |
| 2026-09-18 | **Prod Batch P11:** Terminal presence — `TerminalPresence`; `POST /terminals/heartbeat` + `GET /owner/terminals/presence`; Dashboard Terminals card; Force Offline continues heartbeat with flag; `smoke:prod-p11` PASS |
| 2026-09-19 | **Enhance Batch D4 / track exit:** Catalog §26A/§26B finalized (band + priority definitions); composed `smoke:enhance-dash-intel` (d1→d2→d3) PASS; Enhance Dashboard Intelligence track **DONE**. Production next unchanged = `Authorize Prod Batch S1`. |
| 2026-09-18 | **Enhance Batch D3:** OWNER-only `GET /owner/reports/stock-priority` + shared Zod; Dashboard Stock priority panel (P1–P4); catalog §26B stub; `smoke:enhance-d3` (server + web) PASS. |
| 2026-09-18 | **Enhance Batch D2:** OWNER-only `GET /owner/reports/product-movement` + shared Zod; `/reports/product-movement` UI (30/90/180, bands, search, CSV); catalog §26A stub; `smoke:enhance-d2` (server + web) PASS. |
| 2026-09-10 | **M6 Batch BL / Slice 7 EXIT DONE:** §27 Audit & FEFO catalog added; composed `smoke:m6s7` (m6bi→m6bj→m6bk→m6s6) registered and PASS; Slice 7 complete; Slice 8 Settings gated. |
