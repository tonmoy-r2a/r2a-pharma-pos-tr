# Production Wave 5 — Kill Stubs Execution Plan

**Document type:** Fresh-chat execution guide for **Wave 5** (replace all ACCEPTED POS stubs with real integrations).  
**Master index:** [`PRODUCTION_REMAINING_EXECUTION.md`](PRODUCTION_REMAINING_EXECUTION.md)  
**Source of truth:** [`PROJECT_MASTER_PLAN.md`](PROJECT_MASTER_PLAN.md)  
**Live progress:** [`Current_Status.md`](Current_Status.md)  
**API catalog:** [`Completed_API_lists.md`](Completed_API_lists.md)  
**RBAC:** [`ROLES_AND_PERMISSIONS.md`](ROLES_AND_PERMISSIONS.md)  
**Architecture lock (MFS):** [`Current_Status.md`](Current_Status.md) §12 #20 — backend confirms; desktop status only; no cashier Trx entry.

**Status of Wave 5:** **NOT STARTED** (gated on Wave 4 **P15** DONE).  
**Prerequisite:** Product notes complete; Owner/desktop production features otherwise live.  
**Do not start:** n8n (excluded) · bi-di · RLS · Manager web · M7 · storing raw card PAN/CVV in Express logs or Prisma.

---

## How to use

1. Fresh chat per batch **S1 → S5** (**fixed order** for pilot safety).
2. Attach: master + this file + status + master plan + RBAC + API catalog.
3. For desktop IPC batches also attach relevant desktop paths mentally: `apps/desktop`, `apps/desktop/src-tauri`.
4. `Authorize Prod Batch S<n>`.
5. Short report → YOU DO (hardware/sandbox) → next chat.

> **Hard rules:**
> - One batch per chat. **Order locked:** S1 → S2 → S3 → S4 → S5.
> - Adapter interfaces first; concrete vendor via `.env` / `.env.example` keys — never commit secrets.
> - Payments remain `CASH` \| `CARD` \| `MFS` only.
> - Offline: document each batch’s offline policy (PIN cache hashes OK per RBAC; MFS/Card require online unless you explicitly re-lock).
> - Remove stub modules / QA arm hooks only when replacement is green (or gate behind `VITE_USE_*_STUB=false` default false in production builds).

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

## Integration defaults (locked for this wave)

| Integration | Shape |
|-------------|--------|
| **S1 PIN** | `User.pinHash` + `pinUpdatedAt`; bcrypt/Argon2id; `POST /api/v1/auth/verify-pin`; Staff set/reset on Owner web |
| **S2 Print** | Tauri command `print_receipt`; ESC/POS from `ReceiptPrintModel`; Settings printer + paper width |
| **S3 MFS** | Intent + webhook + poll; adapters `bkash` \| `nagad` \| `rocket`; sandbox flag |
| **S4 Card** | Tauri terminal bridge; env-selected driver; auth meta on payment; void if ingest fails |
| **S5 OTP** | Express issue/verify + **direct SMS** adapter (not n8n); redeem token at ingest |

---

## Batch overview

| Batch | Title | Depends | Smoke |
|-------|-------|---------|-------|
| **S1** | Real Manager PIN | Wave 4 | `smoke:prod-s1` |
| **S2** | Real print IPC | S1 | `smoke:prod-s2` |
| **S3** | Real MFS | S2 | `smoke:prod-s3` |
| **S4** | Real card terminal | S3 | `smoke:prod-s4` |
| **S5** | Real loyalty OTP | S4 | `smoke:prod-s5` |

Order: **S1 → S2 → S3 → S4 → S5**.

---

## Batch S1 — Real Manager PIN

**Goal:** Replace any-4-digit FEFO PIN stub with server-verified Manager/Owner PIN.

**Today:** `acceptStubManagerPin`, stub authorizer list (`fefoOverrideAuth.ts`, `ManagerAuthorizationModal.tsx`).  
**Target:** [`ROLES_AND_PERMISSIONS.md`](ROLES_AND_PERMISSIONS.md) §9.

### Tasks

- [ ] Prisma: optional `pinHash`, `pinUpdatedAt` on `User`
- [ ] Zod + `POST /api/v1/auth/verify-pin` `{ userId, pin }` — caller must be cashier JWT; target must be MANAGER/OWNER same tenant; rate limit; audit
- [ ] Owner web Staff Details: set / reset / clear PIN (never show hash; confirm UX)
- [ ] Desktop: load authorizer roster from API (active managers/owners); verify PIN online; optional offline hash cache from catalog pull (hashes only)
- [ ] Replace stub accept path; remove stub authorizer names from production path
- [ ] Ingest continues to store `fefoOverride` + authorizer identity; reject override without prior verify token if you add binding (document)
- [ ] Seed: set known PIN for demo manager in `.env.example` docs only (not real prod PIN)
- [ ] i18n; `smoke:prod-s1`; update RBAC doc “Stub PIN” → **Live**
- [ ] Update status: retire PIN from ACCEPTED STUB language

### Exit check

- Wrong PIN fails; correct PIN stages FEFO override; smoke PASS

### Agent prompt

```text
Implement ONLY Prod Batch S1 from PROD_WAVE_5_STUBS_EXECUTION.md
(Real Manager PIN). One batch only.
When done, paste the short Prod Batch S1 report.
```

**YOU DO:** Set PIN on Staff; FEFO override with wrong then right PIN.

**Next:** `Authorize Prod Batch S2`.

---

## Batch S2 — Real receipt print IPC

**Goal:** Replace `runPrintStub` with Tauri print of ESC/POS bytes from `ReceiptPrintModel`.

**Today:** `printStub.ts`, Sale Completed auto-print, reprint from Transactions.  
**Capabilities:** extend `apps/desktop/src-tauri` commands + `capabilities/default.json`.

### Tasks

- [ ] ESC/POS serializer (TS or Rust) from `ReceiptPrintModel`; unit tests with sample model
- [ ] Tauri `print_receipt` (and optional `list_printers`); Windows USB/raw or system printer — document chosen path
- [ ] Swap `runPrintStub` internals to invoke IPC; **keep** phase state machine (printing / printed / failed / retry)
- [ ] Desktop Settings: printer selection + 58/80mm default (receipt preview toggle already exists)
- [ ] Owner web reprint stays on-screen preview (no browser silent print requirement)
- [ ] Enable Owner “Print” only where it means download/PDF **or** keep disabled with “print from POS” — **lock: POS is system of record for thermal**
- [ ] `.env.example` / README printer notes; `smoke:prod-s2` (mock backend in CI + manual YOU DO)
- [ ] Remove or gate `__r2aArmPrintFailOnce` for prod builds
- [ ] Localization: do **not** change receipt body language rules

### Exit check

- Sale Completed prints (or mock adapter PASS in CI) + retry path; smoke PASS

### Agent prompt

```text
Implement ONLY Prod Batch S2 from PROD_WAVE_5_STUBS_EXECUTION.md
(Real print IPC + ESC/POS). One batch only.
When done, paste the short Prod Batch S2 report.
```

**YOU DO:** Complete sale; confirm physical or spooler print; test retry.

**Next:** `Authorize Prod Batch S3`.

---

## Batch S3 — Real MFS (bKash / Nagad / Rocket)

**Goal:** Remove invented confirm (cashier mobile + optional Trx). Backend creates intent, talks to provider, webhook confirms; desktop shows waiting/success/fail only; ingest only after CONFIRMED.

### Tasks

- [ ] Prisma `MfsPaymentIntent` (or `PaymentIntent`): tenantId, storeId, saleDraft ref / amount, provider, status, providerTrxId, raw callback meta, expiresAt
- [ ] Zod + routes:
  - `POST /api/v1/payments/mfs/intents`
  - `GET /api/v1/payments/mfs/intents/:id`
  - `POST /api/v1/payments/mfs/webhooks/:provider` (signature verify)
- [ ] Adapter interface + `bkash` / `nagad` / `rocket` modules; sandbox via env
- [ ] Desktop `MfsPaymentModal`: provider select → create intent → poll/wait → success/fail; **delete** Trx manual entry UI
- [ ] Ingest only with server-verified trx / intent id; compensating cancel if sale fails after confirm (document)
- [ ] Owner web notes parser updated for new meta shape if needed
- [ ] `.env.example`: `MFS_*` keys; `smoke:prod-s3` with sandbox/mock adapter
- [ ] Update status §12 #20 → DONE (real MFS)
- [ ] i18n desktop; no domain translation of provider names beyond existing labels

### Exit check

- Sandbox/mock confirm → sale ingest MFS without cashier Trx field; smoke PASS

### Agent prompt

```text
Implement ONLY Prod Batch S3 from PROD_WAVE_5_STUBS_EXECUTION.md
(Real MFS intents + webhooks + status UI). One batch only.
When done, paste the short Prod Batch S3 report.
```

**YOU DO:** Sandbox MFS sale end-to-end; confirm no Trx input.

**Next:** `Authorize Prod Batch S4`.

---

## Batch S4 — Real card terminal

**Goal:** Replace `cardPaymentStub` timers with Tauri terminal adapter.

### Tasks

- [ ] Define `TerminalBridge` interface: `authorize`, `cancel`, `void`
- [ ] First driver behind env (`CARD_TERMINAL_DRIVER=mock|vendorX`); mock driver for CI
- [ ] Wire `CardPaymentModal` to bridge; map approved/declined/cancel
- [ ] Persist auth code / RRN / last4 (if allowed by PCI policy — **never store PAN/CVV**) on payment notes or additive Payment fields
- [ ] On ingest failure after approve: attempt `void`; surface failure if void fails
- [ ] Offline policy: **lock — card requires online** (disable card tender when Offline / Force Offline) unless you re-authorize offline deferred capture
- [ ] Capabilities/IPC permissions; `.env.example`; `smoke:prod-s4`
- [ ] Remove stub arm decline hook from prod path
- [ ] i18n

### Exit check

- Mock approve → ingest CARD; mock decline stays on modal; smoke PASS

### Agent prompt

```text
Implement ONLY Prod Batch S4 from PROD_WAVE_5_STUBS_EXECUTION.md
(Real card terminal adapter). One batch only.
When done, paste the short Prod Batch S4 report.
```

**YOU DO:** Mock/vendor approve and decline paths; confirm Sale Completed only on approve+ingest.

**Next:** `Authorize Prod Batch S5`.

---

## Batch S5 — Real loyalty OTP

**Goal:** Replace any-6-digit OTP with SMS OTP issue/verify; redeem token consumed at ingest.

**Today:** `loyaltyRedeem.ts`, `VerifyLoyaltyOtpModal.tsx` accept any 6 digits.

### Tasks

- [ ] Prisma OTP challenge + redeem token (hashed), expiry, attempt count
- [ ] `POST /api/v1/loyalty/otp/request` `{ customerId, purpose: REDEEM, … }`
- [ ] `POST /api/v1/loyalty/otp/verify` → short-lived `redeemToken`
- [ ] SMS adapter interface + one provider via env (`SMS_*`); **not** n8n
- [ ] Desktop: request → wait → verify → attach token to redeem/ingest; resend cooldown real
- [ ] Ingest validates token server-side before applying loyaltyUsed
- [ ] Rate limit / lockout; i18n; `smoke:prod-s5` (mock SMS sink)
- [ ] `.env.example`; RBAC + status: OTP stub retired
- [ ] Continue without OTP path (if product allows) remains explicit UX — do not silently skip verify when points redeem requires OTP

### Exit check

- Mock SMS code required; wrong code fails; redeem+ingest PASS; smoke PASS

### Agent prompt

```text
Implement ONLY Prod Batch S5 from PROD_WAVE_5_STUBS_EXECUTION.md
(Real loyalty OTP + SMS adapter). One batch only. No n8n.
When done, paste the short Prod Batch S5 report.
```

**YOU DO:** Redeem with mock OTP; confirm points; try wrong OTP.

**Next after PASS:** `Authorize Prod Batch X1` (Wave 6 — [`PROD_WAVE_6_EXIT_EXECUTION.md`](PROD_WAVE_6_EXIT_EXECUTION.md)).

---

## Stub retirement checklist (complete by end of S5)

| Former stub | Module(s) | Retired when |
|-------------|-----------|--------------|
| Print | `printStub.ts` | S2 |
| Card | `cardPaymentStub.ts` | S4 |
| MFS invent | `mfsPaymentStub.ts` + confirm form | S3 |
| Manager PIN | `acceptStubManagerPin` | S1 |
| Loyalty OTP | `acceptStubLoyaltyOtp` | S5 |

---

## Fresh-chat template

```text
@PROJECT_MASTER_PLAN.md @Current_Status.md @ROLES_AND_PERMISSIONS.md
@PRODUCTION_REMAINING_EXECUTION.md @PROD_WAVE_5_STUBS_EXECUTION.md
@Completed_API_lists.md

Authorize Prod Batch S1.
Implement ONLY that batch. One batch only.
When done, paste the short Prod Batch S1 report.
```

---

## Change log

| Date | Change |
|------|--------|
| 2026-09-18 | Wave 5 kill-stubs plan authored (S1–S5). Order locked PIN→Print→MFS→Card→OTP. |
