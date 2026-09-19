# Production Wave 3 — Parked Wire-ups Execution Plan

**Document type:** Fresh-chat execution guide for **Wave 3** (former PARKED Owner/desktop controls).  
**Master index:** [`PRODUCTION_REMAINING_EXECUTION.md`](PRODUCTION_REMAINING_EXECUTION.md)  
**Source of truth:** [`PROJECT_MASTER_PLAN.md`](PROJECT_MASTER_PLAN.md)  
**Live progress:** [`Current_Status.md`](Current_Status.md)  
**API catalog:** [`Completed_API_lists.md`](Completed_API_lists.md)  
**RBAC:** [`ROLES_AND_PERMISSIONS.md`](ROLES_AND_PERMISSIONS.md)

**Status of Wave 3:** **DONE** 2026-09-18 — **P1–P9 PASS**. Next = `Authorize Prod Batch P10` (Wave 4).  
**Prerequisite:** M0–M5 DONE; Settings BN–BQ live; Manifest AC–AD live.  
**Do not start:** Wave 4–6, bi-di, n8n, RLS, Manager web, M7, branch switcher-as-live, Help tickets-as-live.

---

## How to use

1. Fresh chat per batch **P1 → P9** (order below).
2. Attach: master + this file + `Current_Status.md` + `PROJECT_MASTER_PLAN.md` + `ROLES_AND_PERMISSIONS.md` + `Completed_API_lists.md`.
3. `Authorize Prod Batch P<n>`.
4. **UI batches:** agent asks re-share / invent once, then stops until you reply (`invent to match theme` is the production default).
5. Short report → YOU DO → next chat.

> **Hard rules:** One batch per chat. No invented KPIs. OWNER-only web. i18n en + bn-BD. Latin digits. No Baki. Print hardware = Wave 5 **S2** (P7 = CSV export only).

---

## Short-report format

```text
## Prod Batch <ID> report
Done: <1–3 bullets>
Smoke: PASS | FAIL | n/a — <name>
YOU DO: <numbered, or none>
Next: Authorize Prod Batch <next>
```

---

## Screen invent protocol

Same ask-stop as M6. Production default reply: **`invent to match theme`**.

```text
⏸ Batch <ID> needs the visual for: "<Screen name>".
Please re-share that screenshot (include scroll-bottom if split),
or reply exactly: use prior upload | invent to match theme.
Stopping until you reply — no UI code until then.
```

| Batch | Screen name |
|-------|-------------|
| P1 | Edit Customer |
| P2 | Edit Supplier |
| P5 | Inventory Report |
| P6 | Purchase Report |
| P8 | Desktop Stock Audit Count (POS chrome family) |
| P9 | Review All Issues |

P3 / P4 / P7 are wiring + filters / export — ask only if new full page is invented.

---

## Batch overview

| Batch | Title | Depends | Smoke |
|-------|-------|---------|-------|
| **P1** | Edit Customer | W1+W2 | `smoke:prod-p1` |
| **P2** | Edit Supplier | P1* | `smoke:prod-p2` |
| **P3** | View All POs by supplier | P2* | `smoke:prod-p3` |
| **P4** | View All Products by supplier | P3* | `smoke:prod-p4` |
| **P5** | Inventory Report | P4* | `smoke:prod-p5` |
| **P6** | Purchase Report | P5 | `smoke:prod-p6` |
| **P7** | CSV Export (loaded pages) | P6 | `smoke:prod-p7` |
| **P8** | Desktop stock-audit count UI | P7 | `smoke:prod-p8` |
| **P9** | Review All Issues | P8 | `smoke:prod-p9` |

\*Soft order — P1–P4 may be reordered if you authorize, but default is table order. **P5–P9 stay sequential.**

Order: **P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9**.

---

## Batch P1 — Edit Customer

**Goal:** Live Edit Customer from Customer Details (enable control + route + form).

**APIs:** existing `PATCH /api/v1/customers/:id` (OWNER/MANAGER; web = OWNER session) — additive body: DOB/gender/address + `ACTIVE`↔`INACTIVE`.

**Route lock:** `/customers/:id/edit` (not in-place editor).

### Tasks

- [x] Ask invent/re-share for **Edit Customer**; stop until reply
- [x] Enable Edit on Customer Details; route `/customers/:id/edit` (or in-place editor — pick one; document)
- [x] Form fields aligned with create/detail: name, phone, email, DOB, gender, address, status rules per RBAC (do not allow illegal status jumps)
- [x] Phone uniqueness / phone-check UX consistent with Add Customer
- [x] Unsaved-changes guard; success → detail; i18n en + bn-BD
- [x] More Actions may stay disabled unless already specified live
- [x] `smoke:prod-p1` + register package script
- [x] Update `Completed_API_lists.md` note if client surface is new (API already exists)

### Exit check

- Edit saves via PATCH; smoke PASS; no invented purchase history

### Agent prompt

```text
Implement ONLY Prod Batch P1 from PROD_WAVE_3_PARKED_EXECUTION.md
(Edit Customer). STOP and ask for screen first.
When done, paste the short Prod Batch P1 report.
```

**YOU DO:** Edit a customer name/phone; confirm detail updates.

**Next:** `Authorize Prod Batch P2`.

**Status:** **DONE** 2026-09-18 — invent to match theme; `smoke:prod-p1` PASS.
---

## Batch P2 — Edit Supplier

**Goal:** Live Edit Supplier (mirror Add Supplier; enable from Supplier Details).

**APIs:** existing `PATCH /api/v1/owner/suppliers/:id`.

### Tasks

- [x] Ask invent/re-share for **Edit Supplier**; stop
- [x] Route `/suppliers/:id/edit` (or equivalent); wire from Details
- [x] All editable `supplier` fields from create schema; status ACTIVE/HOLD per product rules (DRAFT only if already draft)
- [x] Unsaved guard; i18n; `smoke:prod-p2`
- [x] Do **not** invent Save as Draft for supplier here (Wave 4 **P15**)

### Exit check

- PATCH persists; Details reflect changes; smoke PASS

### Agent prompt

```text
Implement ONLY Prod Batch P2 from PROD_WAVE_3_PARKED_EXECUTION.md
(Edit Supplier). STOP and ask for screen first.
When done, paste the short Prod Batch P2 report.
```

**YOU DO:** Edit supplier contact; confirm Details.

**Next:** `Authorize Prod Batch P3`.

**Status:** **DONE** 2026-09-18 — invent to match theme; `smoke:prod-p2` PASS.
---

## Batch P3 — View All POs by supplier

**Goal:** Supplier Details **View All POs** opens Purchasing list filtered by that supplier.

**APIs:** `GET /owner/purchase-orders` already supports `supplierId` in service — wire web client + list UI.

### Tasks

- [x] Extend `apps/web` purchase-orders client to send `supplierId`
- [x] Purchasing list reads query param / state; shows filter chip + clear
- [x] Enable **View All POs** on Supplier Details → `/purchasing?supplierId=…`
- [x] i18n; `smoke:prod-p3`
- [x] No new report page

### Exit check

- Deep-link shows only that supplier’s POs; smoke PASS

### Agent prompt

```text
Implement ONLY Prod Batch P3 from PROD_WAVE_3_PARKED_EXECUTION.md
(View All POs by supplier). One batch only.
When done, paste the short Prod Batch P3 report.
```

**YOU DO:** From Supplier Details → View All POs; confirm filter.

**Next:** `Authorize Prod Batch P4`.

**Status:** **DONE** 2026-09-18 — `smoke:prod-p3` PASS.
---

## Batch P4 — View All Products by supplier

**Goal:** Supplier Details **View All Products** opens Inventory filtered by supplier.

**APIs:** additive — extend owner inventory query with optional `supplierId` (products that have batches/PO lines tied to supplier — document rule in catalog).

### Tasks

- [x] Zod + service + route query `supplierId` on inventory list (tenant-scoped)
- [x] Web inventory list filter + deep-link `/inventory?supplierId=…`
- [x] Enable **View All Products** on Supplier Details
- [x] Honest empty state; i18n; `smoke:prod-p4`
- [x] Catalog note in `Completed_API_lists.md`

### Exit check

- Filter returns only supplier-linked products per documented rule; smoke PASS

### Agent prompt

```text
Implement ONLY Prod Batch P4 from PROD_WAVE_3_PARKED_EXECUTION.md
(View All Products by supplier). Includes additive API if needed.
When done, paste the short Prod Batch P4 report.
```

**YOU DO:** View All Products from a supplier with known SKUs.

**Next:** `Authorize Prod Batch P5`.

**Status:** **DONE** 2026-09-18 — additive `supplierId` on `GET /owner/inventory` (ACTIVE batches + PO lines); `smoke:prod-p4` PASS.
---

## Batch P5 — Inventory Report page

**Goal:** Live Inventory Report under Reports (enable dashboard CTA). Invent page; compose existing owner inventory/summary/expiry reads (add aggregate endpoint only if composition is insufficient — prefer compose first).

### Tasks

- [x] Ask invent/re-share for **Inventory Report**; stop
- [x] Route `/reports/inventory`; enable Reports dashboard **View Report** for Inventory card
- [x] KPIs + tables from live data only; single-store (branch filter disabled)
- [x] Export disabled until P7 (or stub button disabled with hint)
- [x] i18n; `smoke:prod-p5`
- [x] Catalog entry if new aggregate API added

### Exit check

- Dashboard → Inventory Report loads live data; smoke PASS

### Agent prompt

```text
Implement ONLY Prod Batch P5 from PROD_WAVE_3_PARKED_EXECUTION.md
(Inventory Report). STOP and ask for screen first.
When done, paste the short Prod Batch P5 report.
```

**YOU DO:** Open Inventory Report; spot-check KPIs vs Inventory list.

**Next:** `Authorize Prod Batch P6`.

**Status:** **DONE** 2026-09-18 — invent to match theme; compose summary + inventory + expiry (**no new API**); `smoke:prod-p5` PASS.
---

## Batch P6 — Purchase Report page

**Goal:** Live Purchase Report under Reports. Invent; compose PO/GRN owner reads; additive aggregate only if needed.

### Tasks

- [x] Ask invent/re-share for **Purchase Report**; stop
- [x] Route `/reports/purchasing` (or `/reports/purchases` — pick one; lock in nav)
- [x] Enable dashboard CTA; live KPIs/tables; single-store
- [x] Export disabled until P7; i18n; `smoke:prod-p6`
- [x] Catalog note if new API

### Exit check

- Live Purchase Report; smoke PASS

### Agent prompt

```text
Implement ONLY Prod Batch P6 from PROD_WAVE_3_PARKED_EXECUTION.md
(Purchase Report). STOP and ask for screen first.
When done, paste the short Prod Batch P6 report.
```

**YOU DO:** Open Purchase Report; spot-check vs Purchasing list.

**Next:** `Authorize Prod Batch P7`.

**Status:** **DONE** 2026-09-18 — invent to match theme; route lock `/reports/purchasing`; compose `GET /owner/purchase-orders` (**no new API**); `smoke:prod-p6` PASS.
---

## Batch P7 — CSV Export on loaded pages

**Goal:** Enable **Export** (CSV) where row data is already loaded — pattern: Expiry Management CSV. **Not** thermal print (Wave 5 S2). Owner web **Print** stays disabled or “use POS reprint” hint.

### Tasks

- [x] Enable CSV export on: Sales Report, Inventory Report, Purchase Report, Expiry Returns queue (if not already), Audit dashboard/detail (line export), Shift detail (variance/sales summary) — only where data is in memory
- [x] Filename + Latin digits; no domain transliteration
- [x] Keep **Print** disabled pending S2 (document hint)
- [x] Generate Report buttons that meant PDF: ship as CSV export or rename to Export CSV — **no** server PDF unless you later authorize
- [x] i18n; `smoke:prod-p7`

### Exit check

- At least Sales + Inventory + Audit CSV downloadable; Print still not claiming hardware; smoke PASS

### Agent prompt

```text
Implement ONLY Prod Batch P7 from PROD_WAVE_3_PARKED_EXECUTION.md
(CSV Export on loaded pages). No thermal printer IPC.
When done, paste the short Prod Batch P7 report.
```

**YOU DO:** Export CSV from Sales Report and Audit.

**Next:** `Authorize Prod Batch P8`.

**Status:** **DONE** 2026-09-18 — client CSV via `lib/csvExport.ts`; Print disabled with S2 hint; `smoke:prod-p7` PASS.
---

## Batch P8 — Desktop stock-audit count UI

**Goal:** Keyboard-first desktop UI for Manager/Owner to run stock count against live audit APIs (`POST /audits/start`, `/:id/lines`, `/:id/submit`). Online required.

### Tasks

- [x] Ask invent/re-share for **Desktop Stock Audit Count**; stop
- [x] Desktop feature module: start audit → count lines → submit
- [x] Arrow/Enter/Esc patterns; no Tab navigator; i18n desktop en + bn-BD
- [x] Call existing audit APIs; tenant/store from session; handle 401/403/409 honestly
- [x] Do not build offline audit queue
- [x] `smoke:prod-p8` (API-level and/or desktop harness as feasible)
- [x] Owner web Audit review remains source for approve/reject (already BK)

### Exit check

- Start → count → submit creates reviewable audit on Owner web; smoke PASS

### Agent prompt

```text
Implement ONLY Prod Batch P8 from PROD_WAVE_3_PARKED_EXECUTION.md
(Desktop stock-audit count UI). STOP and ask for screen first.
When done, paste the short Prod Batch P8 report.
```

**YOU DO:** Run a count on desktop; confirm audit appears on `/audit`.

**Next:** `Authorize Prod Batch P9`.

**Status:** **DONE** 2026-09-18 — invent to match theme; Settings → Stock Audit (OWNER/MANAGER); online `POST /audits/start|lines|submit`; `smoke:prod-p8` PASS.
---

## Batch P9 — Review All Issues

**Goal:** Enable Suppliers **Review All Issues** — invent aggregator page from existing `GET /owner/suppliers` attention payload (Overdue / Open PO / Expiry Return / On Hold). Links into live pages only.

### Tasks

- [x] Ask invent/re-share for **Review All Issues**; stop
- [x] Route e.g. `/suppliers/issues`; enable CTA on Suppliers directory
- [x] List all attention items with deep-links (no invented issues)
- [x] i18n; `smoke:prod-p9`
- [x] No new ticketing system

### Exit check

- Page lists live attention rows; navigation works; smoke PASS

### Agent prompt

```text
Implement ONLY Prod Batch P9 from PROD_WAVE_3_PARKED_EXECUTION.md
(Review All Issues). STOP and ask for screen first.
When done, paste the short Prod Batch P9 report.
```

**YOU DO:** Open Review All Issues; follow one link.

**Next after PASS:** `Authorize Prod Batch P10` (Wave 4 — [`PROD_WAVE_4_PRODUCT_EXECUTION.md`](PROD_WAVE_4_PRODUCT_EXECUTION.md)).

**Status:** **DONE** 2026-09-18 — invent to match theme; `/suppliers/issues` from `GET /owner/suppliers` attention; `smoke:prod-p9` PASS. **Wave 3 complete.**
---

## Still disabled after Wave 3 (by design)

| Item | Why |
|------|-----|
| Branch switcher | M7 / OUT OF SCOPE |
| Settings Branch/Roles/… cards | Honest disabled in BN; M7 / later |
| Help tickets | No ticketing backend |
| Request Cash Count | Wave 4 **P10** |
| Save as Draft (GRN/etc.) | Wave 4 **P15** |
| Thermal Print buttons | Wave 5 **S2** |
| Real PIN / MFS / Card / OTP | Wave 5 |

---

## Fresh-chat template

```text
@PROJECT_MASTER_PLAN.md @Current_Status.md @ROLES_AND_PERMISSIONS.md
@PRODUCTION_REMAINING_EXECUTION.md @PROD_WAVE_3_PARKED_EXECUTION.md
@Completed_API_lists.md

Authorize Prod Batch P1.
Implement ONLY that batch. One batch only.
When done, paste the short Prod Batch P1 report.
```

---

## Change log

| Date | Change |
|------|--------|
| 2026-09-18 | **Prod Batch P9 / Wave 3 DONE.** Review All Issues `/suppliers/issues` (compose suppliers attention); invent to match theme; `smoke:prod-p9` PASS. Next = `Authorize Prod Batch P10`. |
| 2026-09-18 | **Prod Batch P8 DONE.** Desktop Settings → Stock Audit (OWNER/MANAGER); online start/lines/submit; invent to match theme; `smoke:prod-p8` PASS. Next was `Authorize Prod Batch P9`. |
| 2026-09-18 | **Prod Batch P7 DONE.** CSV export on Sales/Inventory/Purchase reports, Audit dashboard+detail lines, Shift detail summary, Expiry Returns; Print stays disabled (Wave 5 S2); `smoke:prod-p7` PASS. Next was `Authorize Prod Batch P8`. |
| 2026-09-18 | **Prod Batch P6 DONE.** Purchase Report `/reports/purchasing` (compose only); invent to match theme; `smoke:prod-p6` PASS. Next was `Authorize Prod Batch P7`. |
| 2026-09-18 | **Prod Batch P5 DONE.** Inventory Report `/reports/inventory` (compose only); invent to match theme; `smoke:prod-p5` PASS. Next was `Authorize Prod Batch P6`. |
| 2026-09-18 | **Prod Batch P4 DONE.** View All Products → `/inventory?supplierId=…`; additive inventory `supplierId` (ACTIVE batches + PO lines); `smoke:prod-p4` PASS. Next was `Authorize Prod Batch P5`. |
| 2026-09-18 | **Prod Batch P3 DONE.** View All POs → `/purchasing?supplierId=…`; client sends `supplierId`; filter chip + clear; `smoke:prod-p3` PASS. Next was `Authorize Prod Batch P4`. |
| 2026-09-18 | **Prod Batch P2 DONE.** Edit Supplier at `/suppliers/:id/edit`; PATCH ACTIVE↔HOLD (+ DRAFT if already); `smoke:prod-p2` PASS. Next was `Authorize Prod Batch P3`. |
| 2026-09-18 | **Prod Batch P1 DONE.** Edit Customer at `/customers/:id/edit`; PATCH additive DOB/gender/address + ACTIVE↔INACTIVE; `smoke:prod-p1` PASS. Next = `Authorize Prod Batch P2`. |
| 2026-09-18 | Wave 3 parked wire-ups plan authored (P1–P9). Gated on Wave 1+2. |
