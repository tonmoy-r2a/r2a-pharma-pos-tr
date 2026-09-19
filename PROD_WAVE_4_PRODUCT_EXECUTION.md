# Production Wave 4 — Product Notes Execution Plan

**Document type:** Fresh-chat execution guide for **Wave 4** (former “other deferred design notes” + drafts + cash count).  
**Master index:** [`PRODUCTION_REMAINING_EXECUTION.md`](PRODUCTION_REMAINING_EXECUTION.md)  
**Source of truth:** [`PROJECT_MASTER_PLAN.md`](PROJECT_MASTER_PLAN.md)  
**Live progress:** [`Current_Status.md`](Current_Status.md)  
**API catalog:** [`Completed_API_lists.md`](Completed_API_lists.md)  
**RBAC:** [`ROLES_AND_PERMISSIONS.md`](ROLES_AND_PERMISSIONS.md)

**Status of Wave 4:** **DONE** 2026-09-18 — **P10–P15 PASS**. Next = `Authorize Prod Batch S1` (Wave 5).
**Prerequisite:** Parked wire-ups P1–P9 live.  
**Do not start:** Wave 5 stubs, bi-di, n8n, RLS, Manager web, M7, hard stock reservation on holds, Baki.

---

## How to use

1. Fresh chat per batch **P10 → P15**.
2. Attach: master + this file + status + master plan + RBAC + API catalog.
3. `Authorize Prod Batch P1n`.
4. UI: ask-stop; production default `invent to match theme`.
5. Short report → YOU DO → next chat.

> **Hard rules:** One batch per chat. Soft holds only (no inventory lock). Presence is Owner web + desktop heartbeat — **no** Manager web. Catalog import is Owner web only. SMS/n8n not in this wave (OTP is Wave 5 S5).

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

## Batch overview

| Batch | Title | Depends | Smoke |
|-------|-------|---------|-------|
| **P10** | Request Cash Count | Wave 3 | `smoke:prod-p10` |
| **P11** | Terminal presence | P10 | `smoke:prod-p11` |
| **P12** | Cloud held sales | P11 | `smoke:prod-p12` |
| **P13** | Desktop Transactions → cloud | P12 | `smoke:prod-p13` |
| **P14** | CSV/Excel catalog import | P13 | `smoke:prod-p14` |
| **P15** | Save as Draft (GRN + policy) | P14 | `smoke:prod-p15` |

Order: **P10 → P11 → P12 → P13 → P14 → P15**.

---

## Batch P10 — Request Cash Count

**Goal:** Owner (web Shift Management / Shift Details) can **Request Cash Count**; cashier desktop surfaces the request; counted cash feeds existing close-shift / variance path (do not invent a second cash ledger).

### Tasks

- [x] Ask invent for Owner **Request Cash Count** modal/UX if new; stop
- [x] Prisma additive: cash-count request on active `Shift` (status/requestedAt/requestedBy) — exact fields documented in migration + Zod
- [x] OWNER APIs: create request on open shift; list/get; cancel optional
- [x] Desktop: poll or fetch active shift → badge/banner when count requested; enter counted cash (reuse close-shift counted cash UX where possible)
- [x] Enable previously disabled **Request Cash Count** buttons on Shift list/detail
- [x] i18n web + desktop; `smoke:prod-p10`
- [x] Catalog § new subsection; RBAC note OWNER requests; cashier responds on desktop
- [x] Do **not** require Manager web

### Exit check

- Request appears on desktop; completing count updates shift; smoke PASS — **PASS** 2026-09-18

### Agent prompt

```text
Implement ONLY Prod Batch P10 from PROD_WAVE_4_PRODUCT_EXECUTION.md
(Request Cash Count). STOP and ask for UI first if inventing modals.
When done, paste the short Prod Batch P10 report.
```

**YOU DO:** Request count on Owner web; complete on desktop; confirm shift detail.

**Next:** `Authorize Prod Batch P11`.

---

## Batch P11 — Terminal presence

**Goal:** Desktop heartbeats; Owner web shows terminal/cashier **online (green) / offline (red)** in real time (Dashboard and/or Staff — invent placement).

### Tasks

- [x] Prisma `TerminalPresence` (or equivalent): tenantId, storeId, terminalId, userId, lastSeenAt, userAgent optional
- [x] `POST /api/v1/terminals/heartbeat` (authenticated desktop); `GET /api/v1/owner/terminals/presence`
- [x] Desktop: interval heartbeat while session active; stop on logout; respect Force Offline (still heartbeat as offline intent or pause — **document choice**: recommend continue heartbeat with `forceOffline: true` flag so Owner sees “Forced Offline”)
- [x] Owner UI dots + last-seen; no invented terminals
- [x] i18n; `smoke:prod-p11`
- [x] Update `Current_Status.md` §12 note #10 → DONE when complete
- [x] No Manager web surface

### Exit check

- Two sessions: online/offline visible on Owner web; smoke PASS — **PASS** 2026-09-18

### Agent prompt

```text
Implement ONLY Prod Batch P11 from PROD_WAVE_4_PRODUCT_EXECUTION.md
(Terminal presence heartbeat + Owner UI). One batch only.
When done, paste the short Prod Batch P11 report.
```

**YOU DO:** Login desktop; confirm green; quit/Force Offline; confirm state change.

**Next:** `Authorize Prod Batch P12`.

---

## Batch P12 — Cloud held sales

**Goal:** Soft holds sync to cloud when online; F6/F7 work cross-terminal for same store; offline falls back to local; **no** stock reservation; keep max-hold policy (today max 3 — keep unless you re-lock).

### Tasks

- [x] Prisma `HeldSale` (payload JSON + meta: tenantId, storeId, userId, terminalId, heldAt, expires optional)
- [x] APIs: create/list/get/discard/resume-ack (OWNER not required — cashier JWT); tenant+store scoped
- [x] Desktop: online → cloud CRUD; offline → existing `heldSaleStore`; reconcile on Go Online (document conflict rule: cloud wins vs local merge — **lock: cloud canonical when online; push local-only holds on reconnect if not discarded**)
- [x] Mid-payment Hold still aborts card/MFS in-flight (stubs until Wave 5; same safety)
- [x] i18n; `smoke:prod-p12`
- [x] Update status §12 9d; catalog §18 amendment
- [x] Do **not** hard-allocate batch qty

### Exit check

- Hold on terminal A visible on terminal B (same store) when online; smoke PASS — **PASS** 2026-09-18

### Agent prompt

```text
Implement ONLY Prod Batch P12 from PROD_WAVE_4_PRODUCT_EXECUTION.md
(Cloud held sales). Soft hold only. One batch only.
When done, paste the short Prod Batch P12 report.
```

**YOU DO:** F6 on one session; F7 on another (or second browser profile) online.

**Next:** `Authorize Prod Batch P13`.

---

## Batch P13 — Desktop Transactions → cloud

**Goal:** Desktop Transactions list/detail read store sales from cloud `GET /sales` (+ `GET /sales/:id`) when online; offline keep local `transactionLogStore` append/merge.

### Tasks

- [x] Desktop list: online fetch paged sales for store (cashier may see store sales or own sales — **lock: store-scoped** matching Owner list filters reduced for POS)
- [x] Detail: prefer cloud by id; fallback local
- [x] Offline: existing local log; on reconnect show cloud as source of truth for historical; keep local-only rows until flushed via ingest
- [x] Reprint still uses print path (stub until S2)
- [x] i18n; `smoke:prod-p13`
- [x] Update status §12 9b
- [x] Do not break Owner web Sales

### Exit check

- Online desktop shows cloud sale after ingest; offline local still works; smoke PASS — **PASS** 2026-09-18

### Agent prompt

```text
Implement ONLY Prod Batch P13 from PROD_WAVE_4_PRODUCT_EXECUTION.md
(Desktop Transactions → cloud). One batch only.
When done, paste the short Prod Batch P13 report.
```

**YOU DO:** Complete sale online; open desktop Transactions; confirm cloud row.

**Next:** `Authorize Prod Batch P14`.

---

## Batch P14 — CSV/Excel catalog import

**Goal:** Owner web bulk catalog onboarding: upload CSV/XLSX → dry-run → commit upserts (products + units). Tenant-scoped. No desktop Excel path in v1.

### Tasks

- [x] Ask invent for **Catalog Import** wizard; stop
- [x] Route under Inventory or Settings (document); nav entry
- [x] Server: parse upload, validate Zod rows, dry-run report (creates/updates/errors), commit transaction
- [x] Stable keys: sku (+ tenant); units via `factorToBase` rules; do not invent cost visibility for cashiers
- [x] Max file size + row cap documented; i18n; `smoke:prod-p14`
- [x] Catalog § + status §12 note #11 → DONE
- [x] No bi-di / no n8n

### Exit check

- Dry-run then commit imports demo CSV; products appear in Inventory; smoke PASS — **PASS** 2026-09-18

### Agent prompt

```text
Implement ONLY Prod Batch P14 from PROD_WAVE_4_PRODUCT_EXECUTION.md
(CSV/Excel catalog import). STOP and ask for wizard UI first.
When done, paste the short Prod Batch P14 report.
```

**YOU DO:** Import a small CSV; verify SKUs on Inventory.

**Next:** `Authorize Prod Batch P15`.

---

## Batch P15 — Save as Draft (GRN + policy lock)

**Goal:** Production policy for drafts:

| Surface | Policy |
|---------|--------|
| Purchase Order | **Already live** DRAFT — leave |
| GRN / Receive against PO | **Enable** Save as Draft + resume incomplete receipt |
| Add Supplier | **Keep disabled** — suppliers always ACTIVE on create (document hint) |
| Return Manifest | **Keep disabled** — no DRAFT status in lifecycle unless schema already supports; do not invent REJECTED-path drafts |

### Tasks

- [x] GRN draft: persist partial receipt payload (DB table or PO-linked draft JSON) + resume on `/purchasing/:poId/receive`
- [x] Enable Save as Draft on Receive against PO; Confirm still posts Batch R receipt
- [x] Supplier + Manifest: ensure disabled controls have honest i18n hints (not silent)
- [x] i18n; `smoke:prod-p15`
- [x] Catalog note for draft receipt API

### Exit check

- Save GRN draft → leave → resume → confirm posts stock; smoke PASS — **PASS** 2026-09-18

### Agent prompt

```text
Implement ONLY Prod Batch P15 from PROD_WAVE_4_PRODUCT_EXECUTION.md
(Save as Draft GRN + policy). One batch only.
When done, paste the short Prod Batch P15 report.
```

**YOU DO:** Save incomplete GRN draft; resume; confirm receipt.

**Next after PASS:** `Authorize Prod Batch S1` (Wave 5 — [`PROD_WAVE_5_STUBS_EXECUTION.md`](PROD_WAVE_5_STUBS_EXECUTION.md)).

---

## Fresh-chat template

```text
@PROJECT_MASTER_PLAN.md @Current_Status.md @ROLES_AND_PERMISSIONS.md
@PRODUCTION_REMAINING_EXECUTION.md @PROD_WAVE_4_PRODUCT_EXECUTION.md
@Completed_API_lists.md

Authorize Prod Batch P10.
Implement ONLY that batch. One batch only.
When done, paste the short Prod Batch P10 report.
```

---

## Change log

| Date | Change |
|------|--------|
| 2026-09-18 | **Prod Batch P15 / Wave 4 DONE.** GRN Save as Draft — `GoodsReceiptDraft` + OWNER receipt-draft GET/PUT/DELETE; receive UI resume; Confirm clears draft + posts Batch R; Supplier/Manifest drafts stay disabled with hints; `smoke:prod-p15` PASS. Next = `Authorize Prod Batch S1`. |
| 2026-09-18 | **Prod Batch P14 DONE.** Owner web Catalog Import `/inventory/import` — CSV/XLSX dry-run + commit upsert by sku (+ units); max 2 MiB / 2000 rows; OWNER APIs; `smoke:prod-p14` PASS. Next = `Authorize Prod Batch P15`. |
| 2026-09-18 | **Prod Batch P13 DONE.** Desktop Transactions → cloud `GET /sales` (+ `/:id`); online store-scoped list/detail + local-only merge; offline local log; Owner web Sales unchanged; `smoke:prod-p13` PASS. Next = `Authorize Prod Batch P14`. |
| 2026-09-18 | **Prod Batch P12 DONE.** Cloud soft held sales — `HeldSale` + `/held-sales` APIs; desktop online/offline + Go Online reconcile (cloud canonical); max 3 store-scoped; no stock reservation; `smoke:prod-p12` PASS. Next = `Authorize Prod Batch P13`. |
| 2026-09-18 | **Prod Batch P11 DONE.** Terminal presence — `TerminalPresence` + heartbeat/presence APIs; desktop continues heartbeat with `forceOffline: true` under Force Offline; Dashboard Terminals card; `smoke:prod-p11` PASS. Next was `Authorize Prod Batch P12`. |
| 2026-09-18 | **Prod Batch P10 DONE.** Request Cash Count — Shift `cashCount*` + OWNER request/cancel APIs; Owner web modal (invent to match theme); desktop poll/banner → close-shift counted cash; `smoke:prod-p10` PASS. Next = `Authorize Prod Batch P11`. |
| 2026-09-18 | Wave 4 product notes plan authored (P10–P15). Gated on Wave 3. |
