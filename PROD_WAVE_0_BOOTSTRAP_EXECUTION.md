# Production Wave 0 — Bootstrap Execution Plan

**Document type:** Fresh-chat execution guide for **Wave 0** only (BM verify + reopen production track in status docs).  
**Master index:** [`PRODUCTION_REMAINING_EXECUTION.md`](PRODUCTION_REMAINING_EXECUTION.md)  
**Source of truth:** [`PROJECT_MASTER_PLAN.md`](PROJECT_MASTER_PLAN.md)  
**Live progress:** [`Current_Status.md`](Current_Status.md)  
**Slice 8 parent:** [`M6_SLICE_6_EXECUTION.md`](M6_SLICE_6_EXECUTION.md)  
**API catalog:** [`Completed_API_lists.md`](Completed_API_lists.md)  
**RBAC:** [`ROLES_AND_PERMISSIONS.md`](ROLES_AND_PERMISSIONS.md)

**Status of Wave 0:** **DONE** 2026-09-18 — **W0A–W0C** complete. Next = `Authorize M6 Batch BN`.  
**Prerequisite:** Production master file exists. BM code present in tree (schema/settings APIs/smoke).  
**Do not start:** BN+, AC+, P*, S*, or app feature work beyond BM **verify** + **docs** in this wave (Wave 0 closed — use Wave 1+).

---

## How to use

1. Fresh chat per batch (**W0A → W0B → W0C**).
2. Attach:
   - `PROJECT_MASTER_PLAN.md`
   - `Current_Status.md`
   - `ROLES_AND_PERMISSIONS.md`
   - `PRODUCTION_REMAINING_EXECUTION.md`
   - **`PROD_WAVE_0_BOOTSTRAP_EXECUTION.md`** (this file)
   - `Completed_API_lists.md`
   - `M6_SLICE_6_EXECUTION.md` (W0A + W0C)
   - For W0C also: `REMAINING_WORK_EXECUTION.md`
3. Authorize **one** batch: `Authorize Prod Batch W0A` (etc.).
4. Short report → agent **checks task boxes + status/changelog in this file** (and any other docs that batch requires) → you review YOU DO → new chat for next.

> **Hard rules:** W0A may run migrate + `smoke:m6bm` only. W0B–W0C are **docs**. Do not implement BN UI or AC here.

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

| Batch | Title | Depends | Code? | Status |
|-------|-------|---------|-------|--------|
| **W0A** | Verify BM (migrate + smoke) | — | Verify only | **DONE** 2026-09-18 |
| **W0B** | Reopen production board in `Current_Status.md` | W0A | Docs | **DONE** 2026-09-18 |
| **W0C** | Point master plan + freeze archive + Slice 8 header | W0B | Docs | **DONE** 2026-09-18 |

Order: **W0A → W0B → W0C**.

---

## Batch W0A — Verify BM

**Status:** **DONE** 2026-09-18 — `smoke:m6bm` **PASS** (18/18). Migration already applied; Zod + OWNER settings/help routes present; no BM code fixes needed.

**Goal:** Prove Slice 8 API foundation is green before BN. Do **not** rewrite BM features.

**Re-share screen:** none.

### Tasks

- [x] Confirm migration `packages/database/prisma/migrations/20260910100000_m6_batch_bm_settings` is applied (or apply via project migrate workflow)
- [x] Confirm Zod + routes exist: business profile, account, password, activity, help status (see `M6_SLICE_6_EXECUTION.md` Batch BM)
- [x] Run `npm run smoke:m6bm` (or workspace equivalent registered in `apps/server/package.json`) — **PASS**
- [x] If smoke FAIL: fix **only** BM regressions (schema/API/smoke). Do **not** start BN UI — *n/a (PASS)*
- [x] If smoke script / package script missing: register `smoke:m6bm` to `apps/server/scripts/m6bm-smoke.ts` and root/workspace scripts as needed, then PASS — *n/a (already registered on `@r2a/server`)*
- [x] Note result in chat report; no status-board rewrite yet (W0B)

### Exit check

- [x] `smoke:m6bm` **PASS**
- [x] No BN/BO/BP UI routes forced live

### Agent prompt

```text
Implement ONLY Prod Batch W0A from PROD_WAVE_0_BOOTSTRAP_EXECUTION.md
(Verify BM migrate + smoke:m6bm). Fix BM-only if FAIL.
When done, paste the short Prod Batch W0A report.
```

**YOU DO:** none required if smoke PASS (optional: skim smoke output).

**Next:** `Authorize Prod Batch W0B`.

---

## Batch W0B — Reopen production board in Current_Status

**Status:** **DONE** 2026-09-18 — `Current_Status.md` §1 / §1b production board live; next gated = `Authorize Prod Batch W0C`.

**Goal:** Replace freeze-era “M6 paused / ACCEPTED STUB out of remaining work” with the **production track** board. Docs only.

**Re-share screen:** none.

### Tasks

- [x] Set `Current_Status.md` **Last updated** to **2026-09-18**
- [x] §1 **Next gated work** → Production track active. Next = `Authorize M6 Batch BN` after Wave 0 complete (or `Authorize Prod Batch W0C` if W0C still open). Do **not** say “M6 paused” or “accepted stubs out of remaining work”
- [x] §1 **Bottom line** → M0–M5 DONE. M6 IN PROGRESS (production track). Slices 1–7 DONE; BM verified; **BN–BQ + AC–AD** next via [`PRODUCTION_REMAINING_EXECUTION.md`](PRODUCTION_REMAINING_EXECUTION.md). Stubs scheduled for Wave 5 (not “accepted”)
- [x] §1 **Latest completed** — keep Slice 7 BH–BL DONE; note BM verified in Wave 0 when W0A done
- [x] Rewrite **§1b Remaining work board** to match production inventory:
  - **IN SCOPE — Wave 1:** BN–BQ
  - **IN SCOPE — Wave 2:** AC–AD
  - **IN SCOPE — Wave 3:** P1–P9 (list titles from master)
  - **IN SCOPE — Wave 4:** P10–P15
  - **IN SCOPE — Wave 5:** S1–S5 (WAS ACCEPTED STUB — now production)
  - **IN SCOPE — Wave 6:** X1–X3
  - **STILL DISABLED (honest):** branch switcher, Settings Branch/Roles/Preferences/Security/Audit&Data cards, Help tickets
  - **OUT OF SCOPE:** bi-di, n8n, RLS, Manager web, M7, Baki
  - Remove or replace **ACCEPTED STUB** section with **WAS ACCEPTED STUB → Wave 5** pointer
- [x] Milestone board M6 row: IN PROGRESS — production track; BM verified; BN–BQ + AC–AD open
- [x] §10 resume steps: attach `PRODUCTION_REMAINING_EXECUTION.md` + active wave file; next after W0 = `Authorize M6 Batch BN`
- [x] §11 Key documents map: add all production execution files (master + Waves 0/3/4/5/6)
- [x] Changelog row **2026-09-18**: Prod W0B production board
- [x] No app code

### Exit check

- [x] §1b lists Waves 1–6 inventory; no “accepted stubs out of remaining work”
- [x] §11 lists `PRODUCTION_REMAINING_EXECUTION.md` and child wave files

### Agent prompt

```text
Implement ONLY Prod Batch W0B from PROD_WAVE_0_BOOTSTRAP_EXECUTION.md
(Reopen production board in Current_Status.md). Docs only.
When done, paste the short Prod Batch W0B report.
```

**YOU DO:** Open §1 + §1b — confirm next is production track / BN, not “M6 paused”.

**Next:** `Authorize Prod Batch W0C`.

---

## Batch W0C — Master plan + freeze archive + Slice 8 header

**Status:** **DONE** 2026-09-18 — governance pointed at production track; Wave 0 closed; next = `Authorize M6 Batch BN`.

**Goal:** Point governance docs at the production track. Docs only.

**Re-share screen:** none.

### Tasks

- [x] [`PROJECT_MASTER_PLAN.md`](PROJECT_MASTER_PLAN.md) **§9 Suggested Next Command** → Production track; attach master + Wave file; next after W0 = `Authorize M6 Batch BN`; do not start bi-di / n8n / RLS / Manager web / M7 from master plan alone
- [x] Master plan M6 row: IN PROGRESS — production track 2026-09-18; BM verified; BN–BQ + AC–AD in scope
- [x] Master plan progress log row **2026-09-18**: Production Remaining Work execution files authored; Wave 0 bootstrap
- [x] [`M6_SLICE_6_EXECUTION.md`](M6_SLICE_6_EXECUTION.md) header: BM DONE (verified); **next = Authorize M6 Batch BN**; BN–BQ not deferred; production invent override noted (see master)
- [x] `M6_SLICE_6_EXECUTION.md` changelog row **2026-09-18**: reopened for production track
- [x] [`MILESTONE_6_EXECUTION.md`](MILESTONE_6_EXECUTION.md): Batch AC/AD status notes — may be authorized via production Wave 2 (still one-batch; still deferred until `Authorize M6 Batch AC`)
- [x] [`REMAINING_WORK_EXECUTION.md`](REMAINING_WORK_EXECUTION.md) header: add **SUPERSEDED for in-scope product** by `PRODUCTION_REMAINING_EXECUTION.md`; freeze A–D remain historical DONE; do not re-run freeze
- [x] This file: mark W0A–W0C checkboxes when done; header **Wave 0: DONE** with date
- [x] Master [`PRODUCTION_REMAINING_EXECUTION.md`](PRODUCTION_REMAINING_EXECUTION.md) status line: Wave 0 DONE; next BN
- [x] No app feature code

### Exit check

- [x] Master plan §9 points at production track / BN
- [x] Freeze file marked superseded for in-scope product
- [x] Slice 8 header says next = BN

### Agent prompt

```text
Implement ONLY Prod Batch W0C from PROD_WAVE_0_BOOTSTRAP_EXECUTION.md
(Master plan + freeze archive + Slice 8 header). Docs only.
When done, paste the short Prod Batch W0C report.
```

**YOU DO:** Confirm master plan §9 and `M6_SLICE_6_EXECUTION.md` header both say next = BN.

**Next after PASS:** `Authorize M6 Batch BN` (Wave 1 — use [`M6_SLICE_6_EXECUTION.md`](M6_SLICE_6_EXECUTION.md) + master).

---

## Fresh-chat template

```text
@PROJECT_MASTER_PLAN.md @Current_Status.md @ROLES_AND_PERMISSIONS.md
@PRODUCTION_REMAINING_EXECUTION.md @PROD_WAVE_0_BOOTSTRAP_EXECUTION.md
@Completed_API_lists.md @M6_SLICE_6_EXECUTION.md

Authorize Prod Batch W0A.
Implement ONLY that batch. One batch only.
When done, paste the short Prod Batch W0A report.
```

For **W0C**, also attach `@REMAINING_WORK_EXECUTION.md` `@MILESTONE_6_EXECUTION.md`.

---

## Change log

| Date | Change |
|------|--------|
| 2026-09-18 | **Wave 0 DONE (W0A–W0C).** Governance + freeze archive + Slice 8 header pointed at production track. Next = `Authorize M6 Batch BN`. |
| 2026-09-18 | **W0B DONE** — `Current_Status.md` production board. Next was W0C. |
| 2026-09-18 | **W0A DONE** — BM migrate confirmed; `smoke:m6bm` PASS (18/18). Next was W0B. |
| 2026-09-18 | Wave 0 bootstrap plan authored (W0A–W0C). Next was `Authorize Prod Batch W0A`. |
